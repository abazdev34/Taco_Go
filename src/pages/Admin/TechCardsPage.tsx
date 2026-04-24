import { useEffect, useMemo, useState } from "react";
import {
  createTechCard,
  deleteTechCard,
  fetchTechCards,
  updateTechCard,
} from "../../api/techCards";
import { fetchMenuItems } from "../../api/menuItems";

type TUnitType = "шт" | "кг" | "л";

interface IIngredientForm {
  local_id: string;
  name: string;
  unit: TUnitType;
  quantity: string;
  unit_price: string;
  percent: string;

  cost: number;
  selling_price: number;
  profit: number;
}

const emptyIngredient = (): IIngredientForm => ({
  local_id: `${Date.now()}-${Math.random()}`,
  name: "",
  unit: "шт",
  quantity: "",
  unit_price: "",
  percent: "",
  cost: 0,
  selling_price: 0,
  profit: 0,
});

function TechCardsPage() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);

  const [menuItemId, setMenuItemId] = useState("");
  const [ingredients, setIngredients] = useState<IIngredientForm[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  /* ================= LOAD ================= */

  const load = async () => {
    try {
      const [menu, cards] = await Promise.all([
        fetchMenuItems(),
        fetchTechCards(),
      ]);
      setMenuItems(menu);
      setCards(cards);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ================= INGREDIENT ================= */

  const addIngredient = () => {
    setIngredients((prev) => [...prev, emptyIngredient()]);
  };

  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.local_id !== id));
  };

  const updateIngredient = (
    id: string,
    field: keyof IIngredientForm,
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((item) => {
        if (item.local_id !== id) return item;

        const updated = { ...item, [field]: value };

        const q = Number(updated.quantity) || 0;
        const p = Number(updated.unit_price) || 0;
        const percent = Number(updated.percent) || 0;

        const cost = q * p;

        let selling = cost;
        if (percent > 0 && percent < 100) {
          selling = cost / (1 - percent / 100);
        }

        const profit = selling - cost;

        updated.cost = +cost.toFixed(2);
        updated.selling_price = +selling.toFixed(2);
        updated.profit = +profit.toFixed(2);

        return updated;
      })
    );
  };

  /* ================= CALC ================= */

  const totals = useMemo(() => {
    const total_cost = ingredients.reduce((s, i) => s + i.cost, 0);
    const total_selling = ingredients.reduce((s, i) => s + i.selling_price, 0);
    const total_profit = ingredients.reduce((s, i) => s + i.profit, 0);

    const total_percent =
      ingredients.length > 0
        ? ingredients.reduce((s, i) => s + Number(i.percent || 0), 0) /
          ingredients.length
        : 0;

    return {
      total_cost,
      total_percent,
      total_selling,
      total_profit,
    };
  }, [ingredients]);

  /* ================= SAVE ================= */

  const handleSave = async () => {
    try {
      if (!menuItemId) {
        alert("Тамак танда");
        return;
      }

      if (!ingredients.length) {
        alert("Ингредиент жок");
        return;
      }

      const payload = {
        menu_item_id: menuItemId,
        total_cost: totals.total_cost,
        total_percent: totals.total_percent,
        total_selling_price: totals.total_selling,
        total_profit: totals.total_profit,
        ingredients: ingredients.map((i) => ({
          name: i.name,
          unit: i.unit,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          percent: Number(i.percent),
          cost: i.cost,
          selling_price: i.selling_price,
          profit: i.profit,
        })),
      };

      setLoading(true);

      if (editingId) {
        await updateTechCard(editingId, payload);
      } else {
        await createTechCard(payload);
      }

      setMenuItemId("");
      setIngredients([]);
      setEditingId(null);

      await load();
    } catch (e: any) {
      console.error("SAVE ERROR:", e);
      alert(e?.message || "Ошибка при сохранении");
    } finally {
      setLoading(false);
    }
  };

  /* ================= EDIT ================= */

  const handleEdit = (card: any) => {
    setEditingId(card.id);
    setMenuItemId(card.menu_item_id);

    const mapped = (card.ingredients || []).map((i: any) => ({
      local_id: i.id,
      name: i.name,
      unit: i.unit,
      quantity: String(i.quantity),
      unit_price: String(i.unit_price),
      percent: String(i.percent),
      cost: i.cost,
      selling_price: i.selling_price,
      profit: i.profit,
    }));

    setIngredients(mapped);
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id: string) => {
    await deleteTechCard(id);
    load();
  };

  /* ================= UI ================= */

  return (
    <div style={{ padding: 20 }}>
      <h1>Tech Cards</h1>

      <select
        value={menuItemId}
        onChange={(e) => setMenuItemId(e.target.value)}
      >
        <option value="">Выбери блюдо</option>
        {menuItems.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>

      <button onClick={addIngredient}>+ ингредиент</button>

      {ingredients.map((i) => (
        <div key={i.local_id}>
          <input
            placeholder="name"
            value={i.name}
            onChange={(e) =>
              updateIngredient(i.local_id, "name", e.target.value)
            }
          />
          <input
            placeholder="qty"
            value={i.quantity}
            onChange={(e) =>
              updateIngredient(i.local_id, "quantity", e.target.value)
            }
          />
          <input
            placeholder="price"
            value={i.unit_price}
            onChange={(e) =>
              updateIngredient(i.local_id, "unit_price", e.target.value)
            }
          />
          <input
            placeholder="%"
            value={i.percent}
            onChange={(e) =>
              updateIngredient(i.local_id, "percent", e.target.value)
            }
          />

          <span>cost: {i.cost}</span>
          <span>sell: {i.selling_price}</span>
          <span>profit: {i.profit}</span>

          <button onClick={() => removeIngredient(i.local_id)}>x</button>
        </div>
      ))}

      <button onClick={handleSave} disabled={loading}>
        {loading ? "Сохраняю..." : "Сохранить"}
      </button>

      <hr />

      {cards.map((c) => (
        <div key={c.id}>
          <b>{c.menu_item_id}</b>
          <button onClick={() => handleEdit(c)}>edit</button>
          <button onClick={() => handleDelete(c.id)}>delete</button>
        </div>
      ))}
    </div>
  );
}

export default TechCardsPage;