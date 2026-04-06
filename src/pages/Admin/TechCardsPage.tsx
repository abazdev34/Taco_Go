import { useEffect, useMemo, useState } from "react";
import {
  createTechCard,
  deleteTechCard,
  fetchTechCards,
  updateTechCard,
} from "../../api/techCards";
import { fetchMenuItems } from "../../api/menuItems";
import { IMenuItemRow, ITechCardRow } from "../../types/menu";

function TechCardsPage() {
  const [menuItems, setMenuItems] = useState<IMenuItemRow[]>([]);
  const [cards, setCards] = useState<ITechCardRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    menu_item_id: "",
    ingredients: "",
    cooking_steps: "",
    notes: "",
  });

  const load = async () => {
    try {
      const [itemsData, cardsData] = await Promise.all([
        fetchMenuItems(),
        fetchTechCards(),
      ]);
      setMenuItems(itemsData);
      setCards(cardsData);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const itemMap = useMemo(() => {
    return menuItems.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.title;
      return acc;
    }, {});
  }, [menuItems]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      menu_item_id: "",
      ingredients: "",
      cooking_steps: "",
      notes: "",
    });
  };

  const handleSubmit = async () => {
    if (!form.menu_item_id) return;

    try {
      if (editingId) {
        await updateTechCard(editingId, form);
      } else {
        await createTechCard(form);
      }
      resetForm();
      load();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (card: ITechCardRow) => {
    setEditingId(card.id);
    setForm({
      menu_item_id: card.menu_item_id,
      ingredients: card.ingredients || "",
      cooking_steps: card.cooking_steps || "",
      notes: card.notes || "",
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTechCard(id);
      load();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1 style={styles.title}>Tech Cards</h1>

      <div style={styles.form}>
        <select
          style={styles.input}
          value={form.menu_item_id}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, menu_item_id: e.target.value }))
          }
        >
          <option value="">Menu item танда</option>
          {menuItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>

        <textarea
          style={styles.textarea}
          placeholder="Ingredients"
          value={form.ingredients}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, ingredients: e.target.value }))
          }
        />

        <textarea
          style={styles.textarea}
          placeholder="Cooking steps"
          value={form.cooking_steps}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, cooking_steps: e.target.value }))
          }
        />

        <textarea
          style={styles.textarea}
          placeholder="Notes"
          value={form.notes}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, notes: e.target.value }))
          }
        />

        <div style={styles.actionRow}>
          <button style={styles.button} onClick={handleSubmit}>
            {editingId ? "Update" : "Create"}
          </button>
          {editingId && (
            <button style={styles.cancelButton} onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div style={styles.list}>
        {cards.map((card) => (
          <div key={card.id} style={styles.card}>
            <div style={styles.cardTitle}>
              {itemMap[card.menu_item_id] || "-"}
            </div>
            <div>
              <strong>Ingredients:</strong> {card.ingredients || "-"}
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>Cooking:</strong> {card.cooking_steps || "-"}
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>Notes:</strong> {card.notes || "-"}
            </div>

            <div style={styles.itemActions}>
              <button
                style={styles.editButton}
                onClick={() => handleEdit(card)}
              >
                Edit
              </button>
              <button
                style={styles.deleteButton}
                onClick={() => handleDelete(card.id)}
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
  form: {
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
    gap: "16px",
  },
  card: {
    background: "#fff",
    border: "1px solid #eaeaea",
    borderRadius: "16px",
    padding: "16px",
  },
  cardTitle: {
    fontSize: "20px",
    fontWeight: 700,
    marginBottom: "10px",
  },
  itemActions: {
    display: "flex",
    gap: "10px",
    marginTop: "14px",
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

export default TechCardsPage;