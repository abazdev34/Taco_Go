import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "../../api/categories";
import { supabase } from "../../lib/supabase";
import { ICategoryRow, TCategoryType } from "../../types/menu";

const BUCKET = "category-images";

function normalizeImageUrl(value?: string | null) {
  if (!value) return "";
  if (value.startsWith("http") || value.startsWith("blob:")) return value;

  const cleanPath = value.replace(/^\/+/, "");
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(cleanPath);
  return data.publicUrl;
}

function ImagePreview({
  src,
  alt,
  style,
}: {
  src?: string | null;
  alt: string;
  style: CSSProperties;
}) {
  const url = normalizeImageUrl(src);

  if (!url) {
    return <div style={{ ...style, ...styles.noImage }}>Нет фото</div>;
  }

  return (
    <img
      src={url}
      alt={alt}
      style={style}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

function CategoriesPage() {
  const [categories, setCategories] = useState<ICategoryRow[]>([]);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [type, setType] = useState<TCategoryType>("kitchen");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const data = await fetchCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("CATEGORY LOAD ERROR:", error);
      setErrorMessage("Не удалось загрузить категории");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setSortOrder("0");
    setType("kitchen");
    setImage("");
    setImageFile(null);
    setEditingId(null);
    setErrorMessage("");
  };

  const uploadImage = async () => {
    if (!imageFile) return image || null;

    const ext = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const filePath = `categories/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: imageFile.type || "image/jpeg",
      });

    if (error) {
      throw new Error(error.message || "Не удалось загрузить изображение");
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const numericSortOrder = Number(sortOrder || 0);

    if (!trimmedName) {
      setErrorMessage("Введите название категории");
      return;
    }

    if (Number.isNaN(numericSortOrder) || numericSortOrder < 0) {
      setErrorMessage("Введите корректный порядок сортировки");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const uploadedImageUrl = await uploadImage();

      const payload = {
        name: trimmedName,
        sort_order: numericSortOrder,
        type,
        image: uploadedImageUrl,
      };

      if (editingId) {
        await updateCategory(editingId, payload);
      } else {
        await createCategory(payload);
      }

      resetForm();
      await load();
    } catch (error: any) {
      console.error("CATEGORY SAVE ERROR:", error);
      setErrorMessage(error?.message || "Не удалось сохранить категорию");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: ICategoryRow) => {
    setEditingId(item.id);
    setName(item.name || "");
    setSortOrder(String(item.sort_order ?? 0));
    setType((item.type as TCategoryType) ?? "kitchen");
    setImage(normalizeImageUrl(item.image));
    setImageFile(null);
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Удалить эту категорию?");
    if (!confirmed) return;

    setDeletingId(id);
    setErrorMessage("");

    try {
      await deleteCategory(id);

      if (editingId === id) resetForm();

      await load();
    } catch (error: any) {
      console.error("CATEGORY DELETE ERROR:", error);
      setErrorMessage(error?.message || "Не удалось удалить категорию");
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeLabel = (value?: string | null) => {
    return value === "assembly" ? "Сборка" : "Кухня";
  };

  const sortedCategories = useMemo(() => {
    return [...categories].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
  }, [categories]);

  const kitchenCategories = sortedCategories.filter(
    (item) => !item.type || item.type === "kitchen"
  );

  const assemblyCategories = sortedCategories.filter(
    (item) => item.type === "assembly"
  );

  const imagePreview = imageFile
    ? URL.createObjectURL(imageFile)
    : normalizeImageUrl(image);

  const renderSection = (
    title: string,
    items: ICategoryRow[],
    emptyText: string
  ) => {
    return (
      <section style={styles.section}>
        <div style={styles.sectionHead}>
          <div>
            <h2 style={styles.sectionTitle}>{title}</h2>
            <p style={styles.sectionSubtitle}>{items.length} категорий</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div style={styles.emptyBox}>{emptyText}</div>
        ) : (
          <div style={styles.cardGrid}>
            {items.map((item) => (
              <article key={item.id} style={styles.categoryCard}>
                <div style={styles.cardImageWrap}>
                  <ImagePreview
                    src={item.image}
                    alt={item.name}
                    style={styles.cardImage}
                  />

                  <span style={styles.typeBadge}>{getTypeLabel(item.type)}</span>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.badges}>
                    <span style={styles.sortBadge}>
                      Сортировка: {item.sort_order ?? 0}
                    </span>
                  </div>

                  <h3 style={styles.cardTitle}>{item.name}</h3>

                  <p style={styles.cardDescription}>
                    Раздел: {getTypeLabel(item.type)}
                  </p>

                  <div style={styles.actions}>
                    <button
                      type="button"
                      style={styles.editButton}
                      onClick={() => handleEdit(item)}
                      disabled={saving || deletingId === item.id}
                    >
                      Изменить
                    </button>

                    <button
                      type="button"
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
        <span style={styles.headerBadge}>Админ панель</span>
        <h1 style={styles.title}>Категории</h1>
        <p style={styles.subtitle}>
          Создавайте категории кухни и сборки. Карточки отображаются как в меню.
        </p>
      </div>

      <div style={styles.formCard}>
        <div style={styles.formHead}>
          <div>
            <h2 style={styles.formTitle}>
              {editingId ? "Редактирование категории" : "Новая категория"}
            </h2>
            <p style={styles.formSubtitle}>
              Заполните название, раздел, фото и порядок сортировки.
            </p>
          </div>
        </div>

        <div style={styles.formGrid}>
          <div style={styles.field}>
            <label style={styles.label}>Раздел</label>
            <select
              style={styles.input}
              value={type}
              onChange={(e) => setType(e.target.value as TCategoryType)}
              disabled={saving}
            >
              <option value="kitchen">Кухня</option>
              <option value="assembly">Сборка</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Название категории</label>
            <input
              style={styles.input}
              placeholder="Например: Буррито"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          <div style={styles.field}>
            <label style={styles.label}>Фото категории</label>
            <input
              style={styles.input}
              type="file"
              accept="image/*"
              disabled={saving}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImageFile(file);
              }}
            />
          </div>
        </div>

        {imagePreview && (
          <div style={styles.previewBox}>
            <ImagePreview
              src={imagePreview}
              alt="preview"
              style={styles.bigImagePreview}
            />
            <div>
              <strong style={styles.previewTitle}>Превью изображения</strong>
              <p style={styles.previewText}>
                Это фото будет показываться в категории.
              </p>
            </div>
          </div>
        )}

        {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}

        <div style={styles.buttonRow}>
          <button
            type="button"
            style={styles.button}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving
              ? "Сохранение..."
              : editingId
              ? "Сохранить изменения"
              : "Сохранить категорию"}
          </button>

          {editingId && (
            <button
              type="button"
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
          {renderSection(
            "Кухня",
            kitchenCategories,
            "Категории кухни пока не добавлены"
          )}
          {renderSection(
            "Сборка",
            assemblyCategories,
            "Категории сборки пока не добавлены"
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
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
    color: "#f5d58f",
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
    fontWeight: 700,
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
    fontWeight: 700,
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
  previewBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "12px",
    borderRadius: "18px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
  },
  bigImagePreview: {
    width: "120px",
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
  categoryCard: {
    minHeight: "360px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "26px",
    overflow: "hidden",
    boxShadow: "0 16px 38px rgba(15, 23, 42, 0.08)",
    display: "flex",
    flexDirection: "column",
  },
  cardImageWrap: {
    position: "relative",
    height: "190px",
    background: "linear-gradient(135deg, #111827, #334155)",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  noImage: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, #111827, #334155)",
    color: "#f5d58f",
    display: "grid",
    placeItems: "center",
    fontSize: "14px",
    fontWeight: 900,
  },
  typeBadge: {
    position: "absolute",
    top: "12px",
    left: "12px",
    padding: "7px 11px",
    borderRadius: "999px",
    background: "rgba(17, 24, 39, 0.84)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 900,
    backdropFilter: "blur(8px)",
  },
  cardBody: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    flex: 1,
  },
  badges: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  sortBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: "12px",
    fontWeight: 900,
  },
  cardTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "22px",
    fontWeight: 950,
    lineHeight: 1.15,
  },
  cardDescription: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 800,
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "auto",
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

export default CategoriesPage;