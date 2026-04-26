import { supabase } from '../lib/supabase'
import { IMenuItemPayload } from '../types/menu'

const MENU_ITEM_SELECT = `
  id,
  title,
  price,
  category,
  description,
  image,
  is_active,
  sort_order
`

const CATEGORY_SELECT = `
  id,
  name,
  image,
  sort_order,
  type
`

let menuCache: any[] | null = null
let lastFetchTime = 0
const CACHE_TIME = 1000 * 60 * 2

function normalizeMenuItem(item: any) {
  return {
    ...item,
    image_url: item.image || null,
    photo: item.image || null,
  }
}

function cleanPayload(payload: IMenuItemPayload) {
  const safePayload: Record<string, any> = {
    ...payload,

    // 🔥 МААНИЛҮҮ FIX
    title: payload.title || '',
    description: payload.description || '', // ❗ NULL болбойт
    price: Number(payload.price || 0),

    image: (payload as any).image || (payload as any).image_url || '',
    is_active: payload.is_active ?? true,
    sort_order: Number(payload.sort_order || 0),
  }

  delete safePayload.image_url
  delete safePayload.photo
  delete safePayload.categories
  delete safePayload.created_at

  return safePayload
}

export async function fetchMenuItems(force = false) {
  const now = Date.now()

  if (!force && menuCache && now - lastFetchTime < CACHE_TIME) {
    return menuCache
  }

  const [
    { data: items, error: itemsError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from('menu_items')
      .select(MENU_ITEM_SELECT)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    supabase
      .from('categories')
      .select(CATEGORY_SELECT)
      .order('sort_order', { ascending: true }),
  ])

  if (itemsError) {
    if (menuCache) return menuCache
    throw new Error(itemsError.message)
  }

  if (categoriesError) {
    if (menuCache) return menuCache
    throw new Error(categoriesError.message)
  }

  const categoriesMap = new Map(
    (categories || []).map(category => [category.id, category])
  )

  const result = (items || []).map(item => ({
    ...normalizeMenuItem(item),
    categories: categoriesMap.get(item.category) || null,
  }))

  menuCache = result
  lastFetchTime = now

  return result
}

export async function createMenuItem(payload: IMenuItemPayload) {
  const clean = cleanPayload(payload)

  const { data, error } = await supabase
    .from('menu_items')
    .insert([clean])
    .select(MENU_ITEM_SELECT)
    .single()

  if (error) throw new Error(error.message)

  menuCache = null
  return normalizeMenuItem(data)
}

export async function updateMenuItem(id: string, payload: IMenuItemPayload) {
  const clean = cleanPayload(payload)

  const { data, error } = await supabase
    .from('menu_items')
    .update(clean)
    .eq('id', id)
    .select(MENU_ITEM_SELECT)
    .single()

  if (error) throw new Error(error.message)

  menuCache = null
  return normalizeMenuItem(data)
}

export async function deleteMenuItem(id: string) {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  menuCache = null
  return true
}