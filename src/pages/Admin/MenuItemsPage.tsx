import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { fetchCategories } from "../../api/categories";
import {
  createMenuItem,
  deleteMenuItem,
  fetchMenuItems,
  updateMenuItem,
} from "../../api/menuItems";
import { ICategoryRow, IMenuItemRow } from "../../types/menu";

function MenuItemsPage() {
  const [items, setItems] = useState<IMenuItemRow[]>([]);
  const [categories, setCategories] = useState<ICategoryRow[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [weightG, setWeightG] = useState("0");
  const [sortOrder, setSortOrder] = useState("0");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImage, setCurrentImage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [categoriesData, itemsData] = await Promise.all([
        fetchCategories(),
        fetchMenuItems(),
      ]);

      setCategories(categoriesData);
      setItems(itemsData);

      setCategoryId((prev) => {
        if (prev && categoriesData.some((item) => item.id === prev)) {
          return prev;
        }

        return categoriesData[0]?.id ?? "";
      });
    } catch (error) {
      console.error("MENU ITEMS LOAD ERROR:", error);
      setErrorMessage("Не удалось загрузить меню");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedCategory = useMemo(() => {
    return categories.find((item) => item.id === categoryId) ?? null;
  }, [categories, categoryId]);

  const selectedSectionLabel =
    selectedCategory?.type === "assembly" ? "Сборка" : "Кухня";

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("0");
    setWeightG("0");
    setSortOrder("0");
    setImageFile(null);
    setCurrentImage("");
    setEditingId(null);
    setErrorMessage("");
    setCategoryId(categories[0]?.id ?? "");
  };

  const uploadImageIfNeeded = async () => {
    if (!imageFile) {
      return currentImage || null;
    }

    const fileExt = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;

    const filePath = `menu-items/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("menu-images")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("menu-images").getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const numericPrice = Number(price || 0);
    const numericWeight = Number(weightG || 0);
    const numericSortOrder = Number(sortOrder || 0);

    if (!categoryId) {
      setErrorMessage("Выберите категорию");
      return;
    }

    if (!trimmedTitle) {
      setErrorMessage("Введите название товара");
      return;
    }

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setErrorMessage("Введите корректную цену");
      return;
    }

    if (Number.isNaN(numericWeight) || numericWeight < 0) {
      setErrorMessage("Введите корректный вес");
      return;
    }

    if (Number.isNaN(numericSortOrder) || numericSortOrder < 0) {
      setErrorMessage("Введите корректный порядок сортировки");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const imageUrl = await uploadImageIfNeeded();

      const payload = {
        category: categoryId,
        title: trimmedTitle,
        description: trimmedDescription || null,
        image: imageUrl,
        price: numericPrice,
        weight_g: numericWeight,
        sort_order: numericSortOrder,
      };

      if (editingId) {
        await updateMenuItem(editingId, payload);
      } else {
        await createMenuItem(payload);
      }

      resetForm();
      await load();
    } catch (error: any) {
      console.error("MENU ITEM SAVE ERROR:", error);
      setErrorMessage(error?.message || "Не удалось сохранить товар");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: IMenuItemRow) => {
    setEditingId(item.id);
    setCategoryId(item.category);
    setTitle(item.title || "");
    setDescription(item.description || "");
    setPrice(String(item.price ?? 0));
    setWeightG(String(item.weight_g ?? 0));
    setSortOrder(String(item.sort_order ?? 0));
    setCurrentImage(item.image || "");
    setImageFile(null);
    setErrorMessage("");
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Удалить этот товар?");
    if (!confirmed) return;

    setDeletingId(id);
    setErrorMessage("");

    try {
      await deleteMenuItem(id);

      if (editingId === id) {
        resetForm();
      }

      await load();
    } catch (error: any) {
      console.error("MENU ITEM DELETE ERROR:", error);
      setErrorMessage(error?.message || "Не удалось удалить товар");
    } finally {
      setDeletingId(null);
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
  }, [items]);

  const kitchenItems = sortedItems.filter((item) => {
    const type = item.categories?.type ?? "kitchen";
    return type === "kitchen";
  });

  const assemblyItems = sortedItems.filter((item) => {
    const type = item.categories?.type ?? "kitchen";
    return type === "assembly";
  });

  const getSectionLabel = (value?: string | null) => {
    return value === "assembly" ? "Сборка" : "Кухня";
  };

  const renderSection = (
    sectionTitle: string,
    list: IMenuItemRow[],
    emptyText: string
  ) => {
    return (
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>{sectionTitle}</h2>

        <div style={styles.list}>
          {list.length === 0 ? (
            <div style={styles.emptyBox}>{emptyText}</div>
          ) : (
            list.map((item) => (
              <div key={item.id} style={styles.item}>
                <div style={styles.itemLeft}>
                  <div style={styles.badges}>
                    <span style={styles.badge}>
                      {getSectionLabel(item.categories?.type)}
                    </span>

                    <span style={styles.categoryBadge}>
                      {item.categories?.name ?? "Без категории"}
                    </span>

                    <span style={styles.sortBadge}>
                      Сортировка: {item.sort_order ?? 0}
                    </span>
                  </div>

                  <div style={styles.itemTitle}>{item.title}</div>

                  {item.description && (
                    <div style={styles.itemDescription}>{item.description}</div>
                  )}

                  <div style={styles.metaRow}>
                    <span>Цена: {item.price} ₽</span>
                    <span>Вес: {item.weight_g} г</span>
                  </div>

                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      style={styles.imagePreview}
                    />
                  )}
                </div>

                <div style={styles.actions}>
                  <button
                    style={styles.editButton}
                    onClick={() => handleEdit(item)}
                    disabled={saving || deletingId === item.id}
                  >
                    Изменить
                  </button>

                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDelete(item.id)}
                    disabled={saving || deletingId === item.id}
                  >
                    {deletingId === item.id ? "Удаление..." : "Удалить"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Меню</h1>

      <div style={styles.formCard}>
        <div style={styles.field}>
          <label style={styles.label}>Категория</label>
          <select
            style={styles.input}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={saving}
          >
            {categories.length === 0 ? (
              <option value="">Сначала добавьте категорию</option>
            ) : (
              categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({getSectionLabel(category.type)})
                </option>
              ))
            )}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Раздел</label>
          <input
            style={styles.input}
            value={selectedSectionLabel}
            disabled
            readOnly
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Название товара</label>
          <input
            style={styles.input}
            placeholder="Введите название товара"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Файл изображения</label>
          <input
            style={styles.input}
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            disabled={saving}
          />
        </div>

        {currentImage && (
          <div style={styles.previewBox}>
            <img src={currentImage} alt="preview" style={styles.largePreview} />
          </div>
        )}

        <div style={styles.field}>
          <label style={styles.label}>Описание</label>
          <textarea
            style={styles.textarea}
            placeholder="Введите описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
        </div>

        <div style={styles.doubleRow}>
          <div style={styles.field}>
            <label style={styles.label}>Цена (₽)</label>
            <input
              style={styles.input}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={saving}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Вес (г)</label>
            <input
              style={styles.input}
              type="number"
              value={weightG}
              onChange={(e) => setWeightG(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Порядок сортировки</label>
          <input
            style={styles.input}
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            disabled={saving}
          />
        </div>

        {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}

        <div style={styles.buttonRow}>
          <button style={styles.button} onClick={handleSubmit} disabled={saving}>
            {saving
              ? "Сохранение..."
              : editingId
              ? "Сохранить изменения"
              : "Сохранить"}
          </button>

          {editingId && (
            <button
              style={styles.cancelButton}
              onClick={resetForm}
              disabled={saving}
            >
              Отмена
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={styles.emptyBox}>Загрузка...</div>
      ) : (
        <>
          {renderSection("Кухня", kitchenItems, "Товары кухни пока не добавлены")}
          {renderSection(
            "Сборка",
            assemblyItems,
            "Товары сборки пока не добавлены"
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "20px",
  },
  title: {
    marginTop: 0,
    marginBottom: "20px",
    fontSize: "28px",
    fontWeight: 800,
    color: "#111",
  },
  formCard: {
    display: "grid",
    gap: "14px",
    background: "#fff",
    border: "1px solid #eaeaea",
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "24px",
  },
  field: {
    display: "grid",
    gap: "8px",
  },
  doubleRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  label: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#333",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    fontSize: "15px",
    outline: "none",
  },
  textarea: {
    minHeight: "100px",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    fontSize: "15px",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  previewBox: {
    padding: "4px 0 0",
  },
  largePreview: {
    width: "120px",
    height: "120px",
    objectFit: "cover",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  button: {
    width: "fit-content",
    border: "none",
    background: "#111",
    color: "#fff",
    borderRadius: "10px",
    padding: "12px 18px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
  },
  cancelButton: {
    width: "fit-content",
    border: "1px solid #ccc",
    background: "#fff",
    color: "#111",
    borderRadius: "10px",
    padding: "12px 18px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
  },
  section: {
    marginTop: "24px",
  },
  sectionTitle: {
    margin: "0 0 12px 0",
    fontSize: "22px",
    fontWeight: 800,
    color: "#111",
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  emptyBox: {
    background: "#fff",
    border: "1px solid #eaeaea",
    borderRadius: "14px",
    padding: "16px",
    color: "#666",
  },
  errorBox: {
    background: "#fef3f2",
    border: "1px solid #fecdca",
    color: "#b42318",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "14px",
    fontWeight: 600,
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    background: "#fff",
    border: "1px solid #eaeaea",
    borderRadius: "14px",
    padding: "16px",
  },
  itemLeft: {
    display: "grid",
    gap: "8px",
    flex: 1,
  },
  badges: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#f2f4f7",
    color: "#344054",
    fontSize: "12px",
    fontWeight: 700,
  },
  categoryBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#ecfdf3",
    color: "#027a48",
    fontSize: "12px",
    fontWeight: 700,
  },
  sortBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#eef4ff",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 700,
  },
  itemTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#111",
  },
  itemDescription: {
    fontSize: "14px",
    color: "#475467",
    lineHeight: 1.5,
  },
  metaRow: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    fontSize: "14px",
    fontWeight: 600,
    color: "#111",
  },
  imagePreview: {
    width: "72px",
    height: "72px",
    objectFit: "cover",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    marginTop: "4px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  editButton: {
    border: "1px solid #ccc",
    background: "#fff",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
  },
  deleteButton: {
    border: "none",
    background: "#d92d20",
    color: "#fff",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
  },
};

export default MenuItemsPage;