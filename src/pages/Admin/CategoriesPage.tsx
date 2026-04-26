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

  if (value.startsWith("http")) {
    return value;
  }

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
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Удалить эту категорию?");
    if (!confirmed) return;

    setDeletingId(id);
    setErrorMessage("");

    try {
      await deleteCategory(id);

      if (editingId === id) {
        resetForm();
      }

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
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>{title}</h2>

        <div style={styles.list}>
          {items.length === 0 ? (
            <div style={styles.emptyBox}>{emptyText}</div>
          ) : (
            items.map((item) => (
              <div key={item.id} style={styles.item}>
                <div style={styles.itemLeft}>
                  <div style={styles.badges}>
                    <span style={styles.badge}>{getTypeLabel(item.type)}</span>
                    <span style={styles.sortBadge}>
                      Сортировка: {item.sort_order ?? 0}
                    </span>
                  </div>

                  <div style={styles.itemTitle}>{item.name}</div>

                  <ImagePreview
                    src={item.image}
                    alt={item.name}
                    style={styles.imagePreview}
                  />
                </div>

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
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Категории</h1>

      <div style={styles.formCard}>
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
            placeholder="Введите название категории"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Сүрөт жүктөө</label>
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

          {imagePreview && (
            <ImagePreview
              src={imagePreview}
              alt="preview"
              style={styles.bigImagePreview}
            />
          )}
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
              : "Сохранить"}
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
  page: { padding: "20px" },
  title: {
    marginTop: 0,
    marginBottom: "20px",
    fontSize: "28px",
    fontWeight: 800,
    color: "#111",
  },
  section: { marginTop: "24px" },
  sectionTitle: {
    margin: "0 0 12px 0",
    fontSize: "22px",
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
  field: { display: "grid", gap: "8px" },
  label: { fontSize: "14px", fontWeight: 600, color: "#333" },
  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    fontSize: "15px",
    outline: "none",
  },
  bigImagePreview: {
    width: "160px",
    height: "120px",
    objectFit: "cover",
    borderRadius: "14px",
    border: "1px solid #ddd",
  },
  noImage: {
    background: "#f3f4f6",
    color: "#9ca3af",
    display: "grid",
    placeItems: "center",
    fontSize: "12px",
    fontWeight: 700,
  },
  buttonRow: { display: "flex", gap: "10px", flexWrap: "wrap" },
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
  list: { display: "grid", gap: "12px" },
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
  itemLeft: { display: "grid", gap: "8px", flex: 1 },
  badges: { display: "flex", gap: "8px", flexWrap: "wrap" },
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
  itemTitle: { fontSize: "18px", fontWeight: 700, color: "#111" },
  imagePreview: {
    width: "72px",
    height: "72px",
    objectFit: "cover",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    marginTop: "4px",
  },
  actions: { display: "flex", gap: "8px", flexWrap: "wrap" },
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

export default CategoriesPage;