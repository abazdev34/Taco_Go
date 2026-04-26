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

    window.scrollTo({ top: 0, behavior: "smooth" });
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
      <section style={styles.section}>
        <div style={styles.sectionHead}>
          <div>
            <h2 style={styles.sectionTitle}>{sectionTitle}</h2>
            <p style={styles.sectionSubtitle}>
              {list.length} товаров в разделе
            </p>
          </div>
        </div>

        {list.length === 0 ? (
          <div style={styles.emptyBox}>{emptyText}</div>
        ) : (
          <div style={styles.cardGrid}>
            {list.map((item) => (
              <article key={item.id} style={styles.foodCard}>
                <div style={styles.foodImageWrap}>
                  {item.image ? (
                    <img src={item.image} alt={item.title} style={styles.foodImage} />
                  ) : (
                    <div style={styles.noImage}>Нет фото</div>
                  )}

                  <span style={styles.sectionBadge}>
                    {getSectionLabel(item.categories?.type)}
                  </span>
                </div>

                <div style={styles.foodBody}>
                  <div style={styles.foodBadges}>
                    <span style={styles.categoryBadge}>
                      {item.categories?.name ?? "Без категории"}
                    </span>

                    <span style={styles.sortBadge}>№ {item.sort_order ?? 0}</span>
                  </div>

                  <h3 style={styles.foodTitle}>{item.title}</h3>

                  <p style={styles.foodDescription}>
                    {item.description || "Описание не добавлено"}
                  </p>

                  <div style={styles.foodMeta}>
                    <div>
                      <span>Цена</span>
                      <strong>{item.price} ₽</strong>
                    </div>

                    <div>
                      <span>Вес</span>
                      <strong>{item.weight_g} г</strong>
                    </div>
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
              </article>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <span style={styles.headerBadge}>Админ панель</span>
          <h1 style={styles.title}>Меню</h1>
          <p style={styles.subtitle}>
            Добавляйте блюда, напитки, сборочные позиции и управляйте сортировкой.
          </p>
        </div>
      </div>

      <div style={styles.formCard}>
        <div style={styles.formHead}>
          <div>
            <h2 style={styles.formTitle}>
              {editingId ? "Редактирование товара" : "Новый товар"}
            </h2>
            <p style={styles.formSubtitle}>
              Заполните данные товара и сохраните изменения.
            </p>
          </div>
        </div>

        <div style={styles.formGrid}>
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
            <input style={styles.input} value={selectedSectionLabel} disabled readOnly />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Название товара</label>
            <input
              style={styles.input}
              placeholder="Например: Буррито с курицей"
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
        </div>

        {currentImage && (
          <div style={styles.previewBox}>
            <img src={currentImage} alt="preview" style={styles.largePreview} />
            <div>
              <strong style={styles.previewTitle}>Текущее изображение</strong>
              <p style={styles.previewText}>
                При выборе нового файла изображение будет заменено.
              </p>
            </div>
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

        <div style={styles.tripleRow}>
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
        </div>

        {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}

        <div style={styles.buttonRow}>
          <button style={styles.button} onClick={handleSubmit} disabled={saving}>
            {saving
              ? "Сохранение..."
              : editingId
              ? "Сохранить изменения"
              : "Сохранить товар"}
          </button>

          {editingId && (
            <button style={styles.cancelButton} onClick={resetForm} disabled={saving}>
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
          {renderSection("Сборка", assemblyItems, "Товары сборки пока не добавлены")}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    background: "#f8fafc",
    color: "#111827",
  },
  header: {
    marginBottom: "22px",
  },
  headerBadge: {
    display: "inline-flex",
    padding: "7px 12px",
    borderRadius: "999px",
    background: "#111827",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 900,
    marginBottom: "10px",
  },
  title: {
    margin: 0,
    fontSize: "34px",
    fontWeight: 950,
    color: "#111827",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "15px",
  },
  formCard: {
    display: "grid",
    gap: "16px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "26px",
    padding: "22px",
    marginBottom: "28px",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
  },
  formHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
  },
  formTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 950,
  },
  formSubtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  field: {
    display: "grid",
    gap: "8px",
  },
  tripleRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 900,
    color: "#475569",
  },
  input: {
    height: "46px",
    padding: "0 14px",
    borderRadius: "14px",
    border: "1px solid #dbe3ee",
    fontSize: "15px",
    outline: "none",
    background: "#fff",
    color: "#111827",
    fontWeight: 700,
  },
  textarea: {
    minHeight: "110px",
    padding: "14px",
    borderRadius: "16px",
    border: "1px solid #dbe3ee",
    fontSize: "15px",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    fontWeight: 700,
  },
  previewBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "12px",
    borderRadius: "18px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
  },
  largePreview: {
    width: "96px",
    height: "96px",
    objectFit: "cover",
    borderRadius: "18px",
    border: "1px solid #e5e7eb",
  },
  previewTitle: {
    display: "block",
    color: "#111827",
    fontSize: "15px",
    fontWeight: 900,
  },
  previewText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  button: {
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: "14px",
    padding: "13px 20px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: "14px",
    boxShadow: "0 12px 24px rgba(22, 163, 74, 0.22)",
  },
  cancelButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#111827",
    borderRadius: "14px",
    padding: "13px 20px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: "14px",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: "14px",
    padding: "13px 14px",
    fontSize: "14px",
    fontWeight: 800,
  },
  section: {
    marginTop: "30px",
  },
  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-end",
    marginBottom: "16px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "26px",
    fontWeight: 950,
    color: "#111827",
  },
  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 700,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "18px",
  },
  foodCard: {
    minHeight: "420px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "26px",
    overflow: "hidden",
    boxShadow: "0 16px 38px rgba(15, 23, 42, 0.08)",
    display: "flex",
    flexDirection: "column",
  },
  foodImageWrap: {
    position: "relative",
    height: "190px",
    background: "linear-gradient(135deg, #111827, #334155)",
  },
  foodImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  noImage: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontWeight: 900,
    fontSize: "15px",
  },
  sectionBadge: {
    position: "absolute",
    top: "12px",
    left: "12px",
    padding: "7px 11px",
    borderRadius: "999px",
    background: "rgba(17, 24, 39, 0.82)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 900,
    backdropFilter: "blur(8px)",
  },
  foodBody: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    flex: 1,
  },
  foodBadges: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
  },
  categoryBadge: {
    padding: "6px 9px",
    borderRadius: "999px",
    background: "#ecfdf5",
    color: "#047857",
    fontSize: "11px",
    fontWeight: 900,
  },
  sortBadge: {
    padding: "6px 9px",
    borderRadius: "999px",
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: "11px",
    fontWeight: 900,
  },
  foodTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "20px",
    fontWeight: 950,
    lineHeight: 1.15,
  },
  foodDescription: {
    margin: 0,
    minHeight: "42px",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.45,
  },
  foodMeta: {
    marginTop: "auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  foodMeta: {
    marginTop: "auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "4px",
  },
  editButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#111827",
    borderRadius: "13px",
    padding: "11px 12px",
    cursor: "pointer",
    fontWeight: 900,
  },
  deleteButton: {
    border: "none",
    background: "#dc2626",
    color: "#fff",
    borderRadius: "13px",
    padding: "11px 12px",
    cursor: "pointer",
    fontWeight: 900,
  },
  emptyBox: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "20px",
    color: "#64748b",
    fontWeight: 800,
  },
};

export default MenuItemsPage;