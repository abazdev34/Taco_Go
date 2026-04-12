import { useEffect, useMemo, useState } from "react";
import {
  createTechCard,
  deleteTechCard,
  fetchTechCards,
  updateTechCard,
} from "../../api/techCards";
import { fetchMenuItems } from "../../api/menuItems";
import {
  ICreateTechCardPayload,
  IMenuItemRow,
  ITechCardIngredientRow,
  ITechCardRow,
  TUnitType,
} from "../../types/menu";

interface IIngredientFormRow {
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

const createEmptyIngredient = (): IIngredientFormRow => ({
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
  const [menuItems, setMenuItems] = useState<IMenuItemRow[]>([]);
  const [cards, setCards] = useState<ITechCardRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [menuItemId, setMenuItemId] = useState("");
  const [ingredients, setIngredients] = useState<IIngredientFormRow[]>([]);
  const [calculated, setCalculated] = useState(false);

  const [totalCost, setTotalCost] = useState(0);
  const [totalPercent, setTotalPercent] = useState(0);
  const [totalSellingPrice, setTotalSellingPrice] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

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
    setMenuItemId("");
    setIngredients([]);
    setCalculated(false);
    setTotalCost(0);
    setTotalPercent(0);
    setTotalSellingPrice(0);
    setTotalProfit(0);
  };

  const handleAddIngredient = () => {
    setIngredients((prev) => [...prev, createEmptyIngredient()]);
    setCalculated(false);
  };

  const handleRemoveIngredient = (localId: string) => {
    setIngredients((prev) => prev.filter((item) => item.local_id !== localId));
    setCalculated(false);
  };

  const handleIngredientChange = (
    localId: string,
    field: keyof IIngredientFormRow,
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((item) => {
        if (item.local_id !== localId) return item;

        const updated = {
          ...item,
          [field]: value,
        } as IIngredientFormRow;

        const quantity = Number(updated.quantity) || 0;
        const unitPrice = Number(updated.unit_price) || 0;
        const percent = Number(updated.percent) || 0;

        const cost = quantity * unitPrice;

        let sellingPrice = cost;
        if (percent > 0 && percent < 100) {
          sellingPrice = cost / (1 - percent / 100);
        }

        const profit = sellingPrice - cost;

        updated.cost = Number(cost.toFixed(2));
        updated.selling_price = Number(sellingPrice.toFixed(2));
        updated.profit = Number(profit.toFixed(2));

        return updated;
      })
    );

    setCalculated(false);
  };

  const handleCalculate = () => {
    const totalCostValue = ingredients.reduce(
      (sum, item) => sum + (item.cost || 0),
      0
    );

    const totalPercentValue =
      ingredients.length > 0
        ? ingredients.reduce((sum, item) => sum + (Number(item.percent) || 0), 0) /
          ingredients.length
        : 0;

    const totalSellingPriceValue = ingredients.reduce(
      (sum, item) => sum + (item.selling_price || 0),
      0
    );

    const totalProfitValue = ingredients.reduce(
      (sum, item) => sum + (item.profit || 0),
      0
    );

    setTotalCost(Number(totalCostValue.toFixed(2)));
    setTotalPercent(Number(totalPercentValue.toFixed(2)));
    setTotalSellingPrice(Number(totalSellingPriceValue.toFixed(2)));
    setTotalProfit(Number(totalProfitValue.toFixed(2)));
    setCalculated(true);
  };

  const buildPayload = (): ICreateTechCardPayload => {
    return {
      menu_item_id: menuItemId,
      total_cost: totalCost,
      total_percent: totalPercent,
      total_selling_price: totalSellingPrice,
      total_profit: totalProfit,
      ingredients: ingredients.map((item) => ({
        name: item.name.trim(),
        unit: item.unit,
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        percent: Number(item.percent) || 0,
        cost: item.cost,
        selling_price: item.selling_price,
        profit: item.profit,
      })),
    };
  };

  const handleSubmit = async () => {
    if (!menuItemId) {
      alert("Тамак атын тандаңыз");
      return;
    }

    if (ingredients.length === 0) {
      alert("Ингредиент кошуңуз");
      return;
    }

    const hasInvalidIngredient = ingredients.some(
      (item) =>
        !item.name.trim() ||
        item.quantity === "" ||
        item.unit_price === "" ||
        Number(item.quantity) <= 0 ||
        Number(item.unit_price) < 0 ||
        Number(item.percent) < 0 ||
        Number(item.percent) >= 100
    );

    if (hasInvalidIngredient) {
      alert("Талааларды туура толтуруңуз. Процент 0 менен 99.99 арасында болсун");
      return;
    }

    if (!calculated) {
      alert("Адегенде Рассчитать баскычын басыңыз");
      return;
    }

    try {
      const payload = buildPayload();

      if (editingId) {
        await updateTechCard(editingId, payload);
      } else {
        await createTechCard(payload);
      }

      resetForm();
      await load();
    } catch (error) {
      console.error(error);
      alert("Сактоодо ката чыкты");
    }
  };

  const handleEdit = (card: ITechCardRow) => {
    setEditingId(card.id);
    setMenuItemId(card.menu_item_id);
    setTotalCost(Number(card.total_cost || 0));
    setTotalPercent(Number(card.total_percent || 0));
    setTotalSellingPrice(Number(card.total_selling_price || 0));
    setTotalProfit(Number(card.total_profit || 0));
    setCalculated(true);

    const mappedIngredients: IIngredientFormRow[] = (
      card.ingredients || []
    ).map((item: ITechCardIngredientRow) => ({
      local_id: item.id,
      name: item.name,
      unit: item.unit,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
      percent: String(item.percent),
      cost: Number(item.cost || 0),
      selling_price: Number(item.selling_price || 0),
      profit: Number(item.profit || 0),
    }));

    setIngredients(mappedIngredients);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTechCard(id);
      await load();
    } catch (error) {
      console.error(error);
      alert("Өчүрүүдө ката чыкты");
    }
  };

  return (
    <div>
      <h1 style={styles.title}>Tech Cards</h1>

      <div style={styles.form}>
        <select
          style={styles.input}
          value={menuItemId}
          onChange={(e) => {
            setMenuItemId(e.target.value);
            setCalculated(false);
          }}
        >
          <option value="">Тамак атын тандаңыз</option>
          {menuItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>

        <div style={styles.actionRow}>
          <button style={styles.button} onClick={handleAddIngredient}>
            Добавить
          </button>

          {(ingredients.length > 0 || editingId) && (
            <button style={styles.cancelButton} onClick={resetForm}>
              Очистить
            </button>
          )}
        </div>

        {ingredients.map((item, index) => (
          <div key={item.local_id} style={styles.ingredientCard}>
            <div style={styles.ingredientHeader}>
              <div style={styles.ingredientTitle}>Ингредиент {index + 1}</div>

              <button
                style={styles.deleteSmallButton}
                onClick={() => handleRemoveIngredient(item.local_id)}
              >
                Удалить
              </button>
            </div>

            <input
              style={styles.input}
              placeholder="Ингредиент аты"
              value={item.name}
              onChange={(e) =>
                handleIngredientChange(item.local_id, "name", e.target.value)
              }
            />

            <div style={styles.grid3}>
              <select
                style={styles.input}
                value={item.unit}
                onChange={(e) =>
                  handleIngredientChange(
                    item.local_id,
                    "unit",
                    e.target.value as TUnitType
                  )
                }
              >
                <option value="шт">шт</option>
                <option value="кг">кг</option>
                <option value="л">л</option>
              </select>

              <input
                style={styles.input}
                type="number"
                placeholder="Канча кошулат"
                value={item.quantity}
                onChange={(e) =>
                  handleIngredientChange(
                    item.local_id,
                    "quantity",
                    e.target.value
                  )
                }
              />

              <input
                style={styles.input}
                type="number"
                placeholder={`1 ${item.unit} баасы`}
                value={item.unit_price}
                onChange={(e) =>
                  handleIngredientChange(
                    item.local_id,
                    "unit_price",
                    e.target.value
                  )
                }
              />
            </div>

            <div style={styles.grid4}>
              <input
                style={styles.input}
                type="number"
                placeholder="Процент"
                value={item.percent}
                onChange={(e) =>
                  handleIngredientChange(
                    item.local_id,
                    "percent",
                    e.target.value
                  )
                }
              />

              <input
                style={styles.readonlyInput}
                readOnly
                value={item.cost}
                placeholder="Себестоимость"
              />

              <input
                style={styles.readonlyInput}
                readOnly
                value={item.selling_price}
                placeholder="Сатуу баасы"
              />

              <input
                style={styles.readonlyInput}
                readOnly
                value={item.profit}
                placeholder="Пайда"
              />
            </div>
          </div>
        ))}

        {ingredients.length > 0 && (
          <div style={styles.actionRow}>
            <button style={styles.calculateButton} onClick={handleCalculate}>
              Рассчитать
            </button>

            {calculated && (
              <button style={styles.saveButton} onClick={handleSubmit}>
                Сохранить
              </button>
            )}
          </div>
        )}

        {calculated && (
          <div style={styles.resultBox}>
            <div>
              <strong>Жалпы себестоимость:</strong> {totalCost.toFixed(2)}
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>Орточо процент:</strong> {totalPercent.toFixed(2)}%
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>Жалпы сатуу баасы:</strong> {totalSellingPrice.toFixed(2)}
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>Жалпы пайда:</strong> {totalProfit.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      <div style={styles.list}>
        {cards.map((card) => (
          <div key={card.id} style={styles.card}>
            <div style={styles.cardTitle}>
              {itemMap[card.menu_item_id] || "-"}
            </div>

            <div style={styles.cardSummary}>
              <div>
                <strong>Жалпы себестоимость:</strong>{" "}
                {Number(card.total_cost || 0).toFixed(2)}
              </div>
              <div style={{ marginTop: 6 }}>
                <strong>Орточо процент:</strong>{" "}
                {Number(card.total_percent || 0).toFixed(2)}%
              </div>
              <div style={{ marginTop: 6 }}>
                <strong>Жалпы сатуу баасы:</strong>{" "}
                {Number(card.total_selling_price || 0).toFixed(2)}
              </div>
              <div style={{ marginTop: 6 }}>
                <strong>Жалпы пайда:</strong>{" "}
                {Number(card.total_profit || 0).toFixed(2)}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              {(card.ingredients || []).length === 0 ? (
                <div>-</div>
              ) : (
                card.ingredients?.map((ingredient) => (
                  <div key={ingredient.id} style={styles.previewRow}>
                    <div>
                      <strong>{ingredient.name}</strong>
                    </div>
                    <div style={styles.previewText}>
                      {ingredient.quantity} {ingredient.unit} ×{" "}
                      {ingredient.unit_price}
                    </div>
                    <div style={styles.previewText}>
                      Себестоимость: {ingredient.cost}
                    </div>
                    <div style={styles.previewText}>
                      Процент: {ingredient.percent}%
                    </div>
                    <div style={styles.previewText}>
                      Сатуу баасы: {ingredient.selling_price}
                    </div>
                    <div style={styles.previewText}>
                      Пайда: {ingredient.profit}
                    </div>
                  </div>
                ))
              )}
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
  title: {
    marginTop: 0,
    fontSize: "28px",
    fontWeight: 800,
  },
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
    width: "100%",
    boxSizing: "border-box",
  },
  readonlyInput: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    background: "#f5f5f5",
    width: "100%",
    boxSizing: "border-box",
  },
  actionRow: {
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
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
  calculateButton: {
    width: "fit-content",
    border: "none",
    background: "#0d6efd",
    color: "#fff",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
  saveButton: {
    width: "fit-content",
    border: "none",
    background: "#198754",
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
  ingredientCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "14px",
    background: "#fafafa",
    display: "grid",
    gap: "12px",
  },
  ingredientHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  ingredientTitle: {
    fontSize: "16px",
    fontWeight: 700,
  },
  deleteSmallButton: {
    border: "none",
    background: "#d92d20",
    color: "#fff",
    borderRadius: "8px",
    padding: "8px 12px",
    cursor: "pointer",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
  },
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
  },
  resultBox: {
    padding: "14px",
    borderRadius: "12px",
    background: "#f5f7fb",
    border: "1px solid #dbe4f0",
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
  cardSummary: {
    padding: "12px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  previewRow: {
    borderTop: "1px solid #f0f0f0",
    paddingTop: "10px",
    marginTop: "10px",
  },
  previewText: {
    fontSize: "14px",
    color: "#555",
    marginTop: "4px",
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