import { useEffect, useMemo, useState } from "react";
import { fetchCategories } from "../../api/categories";
import {
  createMenuItem,
  deleteMenuItem,
  fetchMenuItems,
  updateMenuItem,
} from "../../api/menuItems";
import { supabase } from "../../lib/supabase";
import { ICategoryRow, IMenuItemRow } from "../../types/menu";

function MenuItemsPage() {
  const [categories, setCategories] = useState<ICategoryRow[]>([]);
  const [items, setItems] = useState<IMenuItemRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    category: "",
    title: "",
    img: "",
    measure: "",
    price: "",
    description: "",
    is_active: true,
  });

  const load = async () => {
    try {
      setLoading(true);

      const [categoriesData, itemsData] = await Promise.all([
        fetchCategories(),
        fetchMenuItems(),
      ]);

      setCategories(categoriesData);
      setItems(itemsData);
    } catch (error) {
      console.error(error);
      alert("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const categoryMap = useMemo(() => {
    return categories.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [categories]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      category: "",
      title: "",
      img: "",
      measure: "",
      price: "",
      description: "",
      is_active: true,
    });
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);

      if (!file.type.startsWith("image/")) {
        alert("Выберите изображение");
        return;
      }

      const ext = file.name.split(".").pop() || "png";
      const fileName = `menu-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const filePath = `menu-items/${fileName}`;

      const { error } = await supabase.storage
        .from("menu-images")
        .upload(filePath, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from("menu-images")
        .getPublicUrl(filePath);

      setForm((prev) => ({
        ...prev,
        img: data.publicUrl,
      }));
    } catch (error: any) {
      console.error("UPLOAD ERROR:", error);
      alert(error?.message || "Ошибка загрузки изображения");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.category || !form.title.trim() || !form.price) {
      alert("Заполните категорию, название и цену");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        category: form.category,
        title: form.title.trim(),
        img: form.img.trim(),
        measure: form.measure.trim(),
        price: Number(form.price),
        description: form.description.trim(),
        is_active: form.is_active,
      };

      if (editingId) {
        await updateMenuItem(editingId, payload);
      } else {
        await createMenuItem(payload);
      }

      resetForm();
      await load();
    } catch (error: any) {
      console.error("HANDLE SUBMIT ERROR:", error);
      console.error("HANDLE SUBMIT ERROR JSON:", JSON.stringify(error, null, 2));
      alert(
        error?.message ||
          error?.error_description ||
          error?.details ||
          (editingId ? "Ошибка обновления" : "Ошибка создания")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: IMenuItemRow) => {
    setEditingId(item.id);
    setForm({
      category: item.category || "",
      title: item.title || "",
      img: item.img || "",
      measure: item.measure || "",
      price: String(item.price || ""),
      description: item.description || "",
      is_active: item.is_active ?? true,
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Удалить позицию?")) return;

    try {
      await deleteMenuItem(id);
      await load();
    } catch (error) {
      console.error(error);
      alert("Ошибка удаления");
    }
  };

  return (
    <div>
      <h1 style={styles.title}>Меню</h1>

      <div style={styles.formGrid}>
        <select
          style={styles.input}
          value={form.category}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, category: e.target.value }))
          }
        >
          <option value="">Выберите категорию</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          style={styles.input}
          placeholder="Название"
          value={form.title}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, title: e.target.value }))
          }
        />

        <input
          style={styles.input}
          placeholder="Ед. измерения"
          value={form.measure}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, measure: e.target.value }))
          }
        />

        <input
          style={styles.input}
          type="number"
          placeholder="Цена"
          value={form.price}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, price: e.target.value }))
          }
        />

        <textarea
          style={styles.textarea}
          placeholder="Описание"
          value={form.description}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, description: e.target.value }))
          }
        />

        <div style={styles.uploadBlock}>
          <input type="file" accept="image/*" onChange={handleImageUpload} />

          {uploadingImage && <div>Загрузка...</div>}

          <input
            style={styles.input}
            placeholder="URL изображения"
            value={form.img}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, img: e.target.value }))
            }
          />

          {form.img && <img src={form.img} alt="" style={styles.previewImage} />}
        </div>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, is_active: e.target.checked }))
            }
          />
          Активно
        </label>

        <div style={styles.actionRow}>
          <button
            onClick={handleSubmit}
            style={styles.button}
            disabled={saving || uploadingImage}
          >
            {saving ? "Сохранение..." : editingId ? "Обновить" : "Создать"}
          </button>

          {editingId && (
            <button onClick={resetForm} style={styles.cancelButton}>
              Отмена
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={styles.emptyBox}>Загрузка...</div>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <div key={item.id} style={styles.card}>
              {item.img ? (
                <img src={item.img} alt={item.title} style={styles.image} />
              ) : (
                <div style={styles.imagePlaceholder}>Нет изображения</div>
              )}

              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>{item.title}</div>
                <div style={styles.meta}>
                  Категория: {categoryMap[item.category] || "-"}
                </div>
                <div style={styles.meta}>
                  Ед. изм.: {item.measure || "-"}
                </div>
                <div style={styles.meta}>Цена: {item.price} ₸</div>
                <div style={styles.meta}>
                  Статус: {item.is_active ? "Активно" : "Неактивно"}
                </div>
                <div style={styles.desc}>{item.description || "-"}</div>

                <div style={styles.itemActions}>
                  <button
                    style={styles.editButton}
                    onClick={() => handleEdit(item)}
                  >
                    Редактировать
                  </button>
                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDelete(item.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    marginTop: 0,
    fontSize: "28px",
    fontWeight: 800,
  },
  formGrid: {
    display: "grid",
    gap: "12px",
    background: "#fff",
    border: "1px solid #eaeaea",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "20px",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #ccc",
  },
  textarea: {
    minHeight: "100px",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    resize: "vertical",
    fontFamily: "inherit",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  actionRow: {
    display: "flex",
    gap: "10px",
  },
  button: {
    width: "fit-content",
    border: "none",
    background: "#111",
    color: "#fff",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
  cancelButton: {
    width: "fit-content",
    border: "1px solid #ccc",
    background: "#fff",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "#fff",
    border: "1px solid #eaeaea",
    borderRadius: "18px",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "190px",
    objectFit: "cover",
    display: "block",
  },
  previewImage: {
    width: "160px",
    height: "160px",
    objectFit: "cover",
    borderRadius: "12px",
    border: "1px solid #ddd",
    marginTop: "8px",
  },
  imagePlaceholder: {
    width: "100%",
    height: "190px",
    display: "grid",
    placeItems: "center",
    background: "#efefef",
    color: "#777",
  },
  cardBody: {
    padding: "16px",
  },
  cardTitle: {
    fontSize: "20px",
    fontWeight: 700,
    marginBottom: "10px",
  },
  meta: {
    color: "#555",
    marginBottom: "6px",
  },
  desc: {
    color: "#666",
    marginTop: "8px",
    marginBottom: "12px",
  },
  itemActions: {
    display: "flex",
    gap: "10px",
  },
  editButton: {
    border: "1px solid #ccc",
    background: "#fff",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
  },
  deleteButton: {
    border: "none",
    background: "#d92d20",
    color: "#fff",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
  },
  uploadBlock: {
    display: "grid",
    gap: "8px",
  },
  emptyBox: {
    padding: "24px",
    textAlign: "center",
    color: "#666",
    background: "#fff",
    border: "1px solid #eaeaea",
    borderRadius: "14px",
  },
};

export default MenuItemsPage;