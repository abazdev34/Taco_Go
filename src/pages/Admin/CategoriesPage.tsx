import { useEffect, useState } from "react";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "../../api/categories";
import { ICategoryRow } from "../../types/menu";

function CategoriesPage() {
  const [categories, setCategories] = useState<ICategoryRow[]>([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setName("");
    setImage("");
    setSortOrder("0");
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: name.trim(),
          image: image.trim(),
          sort_order: Number(sortOrder || 0),
        });
      } else {
        await createCategory({
          name: name.trim(),
          image: image.trim(),
          sort_order: Number(sortOrder || 0),
        });
      }

      resetForm();
      load();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (item: ICategoryRow) => {
    setEditingId(item.id);
    setName(item.name || "");
    setImage(item.image || "");
    setSortOrder(String(item.sort_order ?? 0));
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      load();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1 style={styles.title}>Categories</h1>

      <div style={styles.formCard}>
        <input
          style={styles.input}
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="Image URL"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="Sort order"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
        <button style={styles.button} onClick={handleSubmit}>
          {editingId ? "Update" : "Create"}
        </button>
        {editingId && (
          <button style={styles.cancelButton} onClick={resetForm}>
            Cancel
          </button>
        )}
      </div>

      <div style={styles.list}>
        {categories.map((item) => (
          <div key={item.id} style={styles.item}>
            <div>
              <div style={styles.itemTitle}>{item.name}</div>
              <div style={styles.meta}>sort: {item.sort_order ?? 0}</div>
            </div>

            <div style={styles.actions}>
              <button
                style={styles.editButton}
                onClick={() => handleEdit(item)}
              >
                Edit
              </button>
              <button
                style={styles.deleteButton}
                onClick={() => handleDelete(item.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { marginTop: 0, fontSize: "28px", fontWeight: 800 },
  formCard: {
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
    color: "#111",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    background: "#fff",
    border: "1px solid #eaeaea",
    borderRadius: "14px",
    padding: "16px",
  },
  itemTitle: {
    fontSize: "18px",
    fontWeight: 700,
  },
  meta: {
    color: "#666",
    marginTop: "4px",
  },
  actions: {
    display: "flex",
    gap: "8px",
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
};

export default CategoriesPage;