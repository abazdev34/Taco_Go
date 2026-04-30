import { useEffect, useMemo, useState } from "react";
import {
  createTechCard,
  deleteTechCard,
  fetchTechCards,
  updateTechCard,
} from "../../api/techCards";
import { fetchMenuItems } from "../../api/menuItems";
import { deleteInventoryBalanceByNameUnit } from "../../api/inventory";
import { formatPrice } from "../../utils/currency";
import "./TechCardsPage.scss";

type Unit = "шт" | "кг" | "л";

type Ingredient = {
  id: string;
  name: string;
  unit: Unit;
  quantity: string;
  unitPrice: string;
  pieceWeight: string;
  cost: number;
};

const makeIngredient = (): Ingredient => ({
  id: crypto.randomUUID(),
  name: "",
  unit: "кг",
  quantity: "",
  unitPrice: "",
  pieceWeight: "",
  cost: 0,
});

const getIngredientKey = (item: any) =>
  `${String(item?.name || "")
    .trim()
    .toLowerCase()}__${String(item?.unit || "").trim()}`;

const isIngredientUsedInCards = (ingredient: any, cards: any[]) => {
  const key = getIngredientKey(ingredient);

  return cards.some((card) =>
    (card.ingredients || []).some(
      (item: any) => getIngredientKey(item) === key
    )
  );
};

function TechCardsPage() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openedCardId, setOpenedCardId] = useState<string | null>(null);

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    makeIngredient(),
  ]);

  const [showPercentInput, setShowPercentInput] = useState(false);
  const [percent, setPercent] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [menu, techCards] = await Promise.all([
      fetchMenuItems(true),
      fetchTechCards(),
    ]);

    setMenuItems(menu || []);
    setCards(techCards || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const cleanupUnusedIngredients = async (
    removedIngredients: any[],
    activeCards: any[]
  ) => {
    const uniqueIngredients = removedIngredients.filter(
      (item, index, arr) =>
        item?.name &&
        item?.unit &&
        arr.findIndex(
          (other) => getIngredientKey(other) === getIngredientKey(item)
        ) === index
    );

    await Promise.all(
      uniqueIngredients.map(async (item) => {
        if (isIngredientUsedInCards(item, activeCards)) return;
        await deleteInventoryBalanceByNameUnit(item.name, item.unit);
      })
    );
  };

  const isValidIngredient = (item: Ingredient) => {
    return (
      item.name.trim() &&
      Number(item.quantity) > 0 &&
      Number(item.unitPrice) > 0
    );
  };

  const totalCost = useMemo(() => {
    return ingredients.reduce((sum, item) => sum + item.cost, 0);
  }, [ingredients]);

  const totalWeight = useMemo(() => {
    return ingredients.reduce((sum, item) => {
      const quantity = Number(item.quantity || 0);

      if (item.unit === "кг") return sum + quantity;

      if (item.unit === "шт") {
        return sum + quantity * Number(item.pieceWeight || 0);
      }

      return sum;
    }, 0);
  }, [ingredients]);

  const totalLiters = useMemo(() => {
    return ingredients.reduce((sum, item) => {
      if (item.unit !== "л") return sum;
      return sum + Number(item.quantity || 0);
    }, 0);
  }, [ingredients]);

  const totalPieces = useMemo(() => {
    return ingredients.reduce((sum, item) => {
      if (item.unit !== "шт") return sum;
      return sum + Number(item.quantity || 0);
    }, 0);
  }, [ingredients]);

  const percentNumber = Number(percent || 0);

  const sellingPrice = useMemo(() => {
    if (percentNumber <= 0) return 0;
    return (totalCost * 100) / percentNumber;
  }, [totalCost, percentNumber]);

  const profit = sellingPrice - totalCost;

  const getWeightText = () => {
    const parts: string[] = [];

    if (totalWeight > 0) parts.push(`${totalWeight.toFixed(3)} кг`);
    if (totalLiters > 0) parts.push(`${totalLiters.toFixed(3)} л`);
    if (totalPieces > 0) parts.push(`${totalPieces} шт`);

    return parts.length ? parts.join(" + ") : "0";
  };

  const getCardWeightText = (card: any) => {
    const parts: string[] = [];

    if (Number(card.total_weight || 0) > 0) {
      parts.push(`${Number(card.total_weight || 0).toFixed(3)} кг`);
    }

    if (Number(card.total_liters || 0) > 0) {
      parts.push(`${Number(card.total_liters || 0).toFixed(3)} л`);
    }

    if (Number(card.total_pieces || 0) > 0) {
      parts.push(`${Number(card.total_pieces || 0)} шт`);
    }

    return parts.length ? parts.join(" + ") : "0";
  };

  const fillFormFromCard = (food: any, card: any) => {
    setSelectedFood(food);
    setEditingId(card.id);
    setPercent(String(card.total_percent || ""));
    setShowPercentInput(true);

    setIngredients(
      (card.ingredients || []).length
        ? (card.ingredients || []).map((item: any) => ({
            id: crypto.randomUUID(),
            name: item.name || "",
            unit: item.unit || "кг",
            quantity: String(item.quantity ?? ""),
            unitPrice: String(item.unit_price ?? ""),
            pieceWeight: String(item.piece_weight ?? ""),
            cost: Number(item.cost || 0),
          }))
        : [makeIngredient()]
    );
  };

  const openFood = (food: any) => {
    const oldCard = cards.find((card) => card.menu_item_id === food.id);

    if (oldCard) {
      setOpenedCardId((prev) => (prev === oldCard.id ? null : oldCard.id));
      return;
    }

    setSelectedFood(food);
    setModalOpen(true);
    setEditingId(null);
    setShowPercentInput(false);
    setPercent("");
    setIngredients([makeIngredient()]);
  };

  const openEditModal = (food: any, card: any) => {
    fillFormFromCard(food, card);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedFood(null);
    setEditingId(null);
    setIngredients([makeIngredient()]);
    setShowPercentInput(false);
    setPercent("");
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, makeIngredient()]);
  };

  const removeIngredient = (id: string) => {
    setIngredients((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.length ? next : [makeIngredient()];
    });
  };

  const updateIngredient = (
    id: string,
    field: keyof Ingredient,
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated: Ingredient = {
          ...item,
          [field]: value,
        };

        if (field === "unit" && value !== "шт") {
          updated.pieceWeight = "";
        }

        const quantity = Number(updated.quantity || 0);
        const unitPrice = Number(updated.unitPrice || 0);

        updated.cost = +(quantity * unitPrice).toFixed(2);

        return updated;
      })
    );
  };

  const handleFirstSave = () => {
    if (!selectedFood) return;

    const valid = ingredients.some(isValidIngredient);

    if (!valid) {
      alert("Заполните хотя бы один ингредиент");
      return;
    }

    setShowPercentInput(true);
  };

  const handleConfirm = async () => {
    if (!selectedFood) return;

    const validIngredients = ingredients.filter(isValidIngredient);

    if (!validIngredients.length) {
      alert("Заполните ингредиенты");
      return;
    }

    if (percentNumber <= 0) {
      alert("Введите процент больше 0");
      return;
    }

    try {
      setLoading(true);

      const payloadIngredients = validIngredients.map((item) => ({
        name: item.name.trim(),
        unit: item.unit,
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unitPrice || 0),
        piece_weight: item.unit === "шт" ? Number(item.pieceWeight || 0) : 0,
        cost: item.cost,
      }));

      const oldCard = editingId
        ? cards.find((card) => card.id === editingId)
        : null;

      const oldIngredients = oldCard?.ingredients || [];

      const removedIngredients = oldIngredients.filter(
        (oldItem: any) =>
          !payloadIngredients.some(
            (newItem: any) =>
              getIngredientKey(newItem) === getIngredientKey(oldItem)
          )
      );

      const payload = {
        menu_item_id: selectedFood.id,
        total_cost: +totalCost.toFixed(2),
        total_percent: percentNumber,
        total_selling_price: +sellingPrice.toFixed(2),
        total_profit: +profit.toFixed(2),
        total_weight: +totalWeight.toFixed(3),
        total_liters: +totalLiters.toFixed(3),
        total_pieces: totalPieces,
        ingredients: payloadIngredients,
      };

      if (editingId) {
        await updateTechCard(editingId, payload);

        const activeCardsAfterUpdate = cards.map((card) =>
          card.id === editingId
            ? { ...card, ingredients: payloadIngredients }
            : card
        );

        await cleanupUnusedIngredients(
          removedIngredients,
          activeCardsAfterUpdate
        );
      } else {
        await createTechCard(payload);
      }

      await load();

      setOpenedCardId(null);
      closeModal();
    } catch (error: any) {
      alert(error?.message || "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить техкарту?")) return;

    try {
      setLoading(true);

      const deletingCard = cards.find((card) => card.id === id);
      const deletingIngredients = deletingCard?.ingredients || [];
      const activeCardsAfterDelete = cards.filter((card) => card.id !== id);

      await deleteTechCard(id);

      await cleanupUnusedIngredients(
        deletingIngredients,
        activeCardsAfterDelete
      );

      if (openedCardId === id) {
        setOpenedCardId(null);
      }

      await load();
    } catch (error: any) {
      alert(error?.message || "Не удалось удалить техкарту");
    } finally {
      setLoading(false);
    }
  };

  const openedCard = cards.find((card) => card.id === openedCardId);
  const openedFood = openedCard
    ? menuItems.find((item) => item.id === openedCard.menu_item_id)
    : null;

  return (
    <div className="tech-page">
      <div className="tech-header">
        <div>
          <h1>Техкарты</h1>
          <p>
            Выберите блюдо. Если техкарта готова, нажмите на блюдо, чтобы
            открыть или скрыть таблицу.
          </p>
        </div>
      </div>

      <section className="tech-food-section">
        <h2>Блюда</h2>

        <div className="tech-food-list">
          {menuItems.map((food) => {
            const card = cards.find((item) => item.menu_item_id === food.id);
            const isOpen = openedCardId === card?.id;

            return (
              <button
                key={food.id}
                type="button"
                className={`tech-food-btn ${isOpen ? "active" : ""}`}
                onClick={() => openFood(food)}
              >
                <span>{food.title}</span>

                <b className={card ? "ready" : "not-ready"}>
                  {card ? (isOpen ? "Открыто" : "Готово") : "Не готово"}
                </b>
              </button>
            );
          })}
        </div>
      </section>

      {openedCard && (
        <section className="tech-table-section">
          <div className="tech-section-head">
            <div>
              <h2>{openedFood?.title || "Техкарта"}</h2>
              <p>Подробная таблица ингредиентов и расчёта</p>
            </div>

            <button
              type="button"
              className="tech-close-table"
              onClick={() => setOpenedCardId(null)}
            >
              Скрыть
            </button>
          </div>

          <div className="tech-summary-grid">
            <div>
              <span>Себестоимость</span>
              <strong>{formatPrice(Number(openedCard.total_cost || 0))}</strong>
            </div>

            <div>
              <span>Общий вес</span>
              <strong>{getCardWeightText(openedCard)}</strong>
            </div>

            <div>
              <span>Процент</span>
              <strong>{Number(openedCard.total_percent || 0)}%</strong>
            </div>

            <div>
              <span>Продажная цена</span>
              <strong>
                {formatPrice(Number(openedCard.total_selling_price || 0))}
              </strong>
            </div>

            <div>
              <span>Прибыль</span>
              <strong className="profit">
                {formatPrice(Number(openedCard.total_profit || 0))}
              </strong>
            </div>
          </div>

          <div className="tech-table-wrap">
            <table className="tech-table">
              <thead>
                <tr>
                  <th>Ингредиент</th>
                  <th>Количество</th>
                  <th>Вес</th>
                  <th>Цена за 1 ед.</th>
                  <th>Себестоимость</th>
                </tr>
              </thead>

              <tbody>
                {(openedCard.ingredients || []).map(
                  (item: any, index: number) => (
                    <tr key={`${openedCard.id}-${index}`}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>

                      <td>
                        {item.quantity} {item.unit}
                      </td>

                      <td>
                        {item.unit === "шт"
                          ? item.piece_weight
                            ? `${(
                                Number(item.quantity || 0) *
                                Number(item.piece_weight || 0)
                              ).toFixed(3)} кг`
                            : "—"
                          : item.unit === "кг"
                          ? `${item.quantity} кг`
                          : item.unit === "л"
                          ? `${item.quantity} л`
                          : "—"}
                      </td>

                      <td>{formatPrice(Number(item.unit_price || 0))}</td>

                      <td>
                        <strong>{formatPrice(Number(item.cost || 0))}</strong>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="tech-table-actions tech-bottom-actions">
            <button
              type="button"
              onClick={() => openEditModal(openedFood, openedCard)}
            >
              Изменить
            </button>

            <button
              type="button"
              className="danger"
              onClick={() => handleDelete(openedCard.id)}
              disabled={loading}
            >
              {loading ? "Удаляется..." : "Удалить"}
            </button>
          </div>
        </section>
      )}

      {modalOpen && selectedFood && (
        <div className="tech-modal">
          <div className="tech-modal-overlay" onClick={closeModal} />

          <div className="tech-modal-card">
            <div className="tech-modal-head">
              <div>
                <h2>{selectedFood.title}</h2>
                <p>Ингредиенты и расчёт по общему проценту</p>
              </div>

              <button type="button" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="tech-form">
              {ingredients.map((item, index) => (
                <div
                  key={item.id}
                  className={`tech-ing-row ${
                    item.unit === "шт" ? "has-piece-weight" : ""
                  }`}
                >
                  <div className="tech-index">{index + 1}</div>

                  <label>
                    <span>Название ингредиента</span>
                    <input
                      placeholder="Например: кола"
                      value={item.name}
                      onChange={(e) =>
                        updateIngredient(item.id, "name", e.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>Ед.</span>
                    <select
                      value={item.unit}
                      onChange={(e) =>
                        updateIngredient(
                          item.id,
                          "unit",
                          e.target.value as Unit
                        )
                      }
                    >
                      <option value="шт">шт</option>
                      <option value="кг">кг</option>
                      <option value="л">л</option>
                    </select>
                  </label>

                  <label>
                    <span>Количество</span>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateIngredient(item.id, "quantity", e.target.value)
                      }
                    />
                  </label>

                  {item.unit === "шт" && (
                    <label>
                      <span>Вес 1 шт, кг (необязательно)</span>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Например: 0.085"
                        value={item.pieceWeight}
                        onChange={(e) =>
                          updateIngredient(
                            item.id,
                            "pieceWeight",
                            e.target.value
                          )
                        }
                      />
                    </label>
                  )}

                  <label>
                    <span>Цена за 1 {item.unit}</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="65"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateIngredient(item.id, "unitPrice", e.target.value)
                      }
                    />
                  </label>

                  <div className="tech-cost">
                    <span>Себестоимость</span>
                    <strong>{formatPrice(item.cost)}</strong>
                  </div>

                  <button
                    type="button"
                    className="tech-remove"
                    onClick={() => removeIngredient(item.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="tech-add-ing"
                onClick={addIngredient}
              >
                + Добавить ингредиент
              </button>
            </div>

            <div className="tech-calc-table-wrap">
              <table className="tech-calc-table">
                <thead>
                  <tr>
                    <th>Ингредиент</th>
                    <th>Количество</th>
                    <th>Вес</th>
                    <th>Цена за 1 ед.</th>
                    <th>Себестоимость</th>
                  </tr>
                </thead>

                <tbody>
                  {ingredients
                    .filter(
                      (item) =>
                        item.name.trim() ||
                        Number(item.quantity) > 0 ||
                        Number(item.unitPrice) > 0
                    )
                    .map((item) => (
                      <tr key={item.id}>
                        <td>{item.name || "—"}</td>

                        <td>
                          {item.quantity || "0"} {item.unit}
                        </td>

                        <td>
                          {item.unit === "шт"
                            ? item.pieceWeight
                              ? `${(
                                  Number(item.quantity || 0) *
                                  Number(item.pieceWeight || 0)
                                ).toFixed(3)} кг`
                              : "—"
                            : item.unit === "кг"
                            ? `${item.quantity || "0"} кг`
                            : item.unit === "л"
                            ? `${item.quantity || "0"} л`
                            : "—"}
                        </td>

                        <td>{formatPrice(Number(item.unitPrice || 0))}</td>

                        <td>
                          <strong>{formatPrice(item.cost)}</strong>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="tech-result-box">
              <div>
                <span>Общая себестоимость</span>
                <strong>{formatPrice(totalCost)}</strong>
              </div>

              <div>
                <span>Общий вес блюда</span>
                <strong>{getWeightText()}</strong>
              </div>

              {!showPercentInput ? (
                <button type="button" onClick={handleFirstSave}>
                  Сохранить
                </button>
              ) : (
                <>
                  <label className="tech-percent-field">
                    <span>Какой процент составляет себестоимость?</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Например: 65"
                      value={percent}
                      onChange={(e) => setPercent(e.target.value)}
                    />
                  </label>

                  <div>
                    <span>
                      Если себестоимость составляет {percentNumber || 0}%,
                      продажная цена
                    </span>
                    <strong>{formatPrice(sellingPrice)}</strong>
                  </div>

                  <div>
                    <span>Прибыль</span>
                    <strong>{formatPrice(profit)}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={loading}
                  >
                    {loading ? "Сохраняется..." : "Подтвердить"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TechCardsPage;