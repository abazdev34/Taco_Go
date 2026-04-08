import { supabase } from "./supabase";

const MENU_IMAGES_BUCKET = "menu-images";
const CATEGORY_IMAGES_BUCKET = "category-images";

const createFileName = (file: File) => {
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
};

export const uploadMenuImage = async (file: File): Promise<string> => {
  const filePath = `menu-items/${createFileName(file)}`;

  const { error: uploadError } = await supabase.storage
    .from(MENU_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(MENU_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("Failed to get menu image public url");
  }

  return data.publicUrl;
};

export const uploadCategoryImage = async (file: File): Promise<string> => {
  const filePath = `categories/${createFileName(file)}`;

  const { error: uploadError } = await supabase.storage
    .from(CATEGORY_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(CATEGORY_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("Failed to get category image public url");
  }

  return data.publicUrl;
};