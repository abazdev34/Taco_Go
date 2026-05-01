import { useMemo, useState } from "react";
import { createInventoryOperations } from "../../../api/inventory";
import { OperationType } from "../TechInventoryPage";

type ProductOption = {
  id?: string;
  name: string;
  unit: string;
  category?: string | null;
  price?: number;
};

type AddedProduct = {
  id: string;
  name: string;
  unit: string;
  quantity: string;
  price: string;
  search: string;
  selected: ProductOption | null;
  opened: boolean;
};

type Props = {
  type: OperationType;
  products: ProductOption[];
  saving: boolean;
  setSaving: (value: boolean) => void;
  onSaved: () => Promise<void>;
};

const toNumber = (value: unknown) => {
  const normalized = String(value ?? "").replace(",", ".").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};

const normalizeText = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const makeId = () => `${Date.now()}-${Math.random()}`;

const createEmptyRow = (): AddedProduct => ({
  id: makeId(),
  name: "",
  unit: "",
  quantity: "",
  price: "",
  search: "",
  selected: null,
  opened: false,
});

function InventoryOperationPanel({
  type,
  products,
  saving,
  setSaving,
  onSaved,
}: Props) {
  const [date, setDate] = useState("");
  const [destination, setDestination] = useState("");
  const [comment, setComment] = useState("");
  const [rows, setRows] = useState<AddedProduct[]>([createEmptyRow()]);

  const isReceived = type === "received";
  const title = isReceived ? "Приход товаров" : "Списание товаров";
  const successText = isReceived ? "Приход сохранён" : "Списание сохранено";

  const code = useMemo(() => {
    return Math.random().toString(36).slice(2, 5).toUpperCase() + "-DG8-JQK";
  }, []);

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    setRows((prev) =>
      prev.length === 1
        ? [createEmptyRow()]
        : prev.filter((row) => row.id !== id)
    );
  };

  const updateRow = (id: string, patch: Partial<AddedProduct>) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const selectProduct = (rowId: string, product: ProductOption) => {
    updateRow(rowId, {
      name: product.name,
      unit: product.unit,
      search: product.name,
      selected: product,
      price: product.price ? String(product.price) : "",
      opened: false,
    });
  };

  const moveRow = (id: string, direction: "up" | "down") => {
    setRows((prev) => {
      const index = prev.findIndex((row) => row.id === id);
      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;

      const copy = [...prev];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  };

  const save = async () => {
    const payload = rows
      .filter((row) => row.selected)
      .map((row) => ({
        product_id: row.selected?.id || null,
        name: row.name,
        unit: row.unit,
        quantity: toNumber(row.quantity),
        price: isReceived ? toNumber(row.price) : 0,
        type,
      }))
      .filter((item) => item.quantity > 0);

    if (!payload.length) {
      alert("Добавьте товар и укажите количество");
      return;
    }

    if (isReceived && payload.some((item) => item.price <= 0)) {
      alert("Укажите цену для прихода");
      return;
    }

    try {
      setSaving(true);

      await createInventoryOperations(payload);

      setDate("");
      setDestination("");
      setComment("");
      setRows([createEmptyRow()]);

      await onSaved();

      alert(successText);
    } catch (e: any) {
      alert(e?.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="move-card">
      <div className="move-card-header">
        <h2>{title}</h2>

        <div className="move-code">
          <span>Код:</span>
          <strong>{code}</strong>
        </div>
      </div>

      <div className="move-form-table">
        <div className="move-form-row">
          <div className="move-form-label">Дата</div>
          <div className="move-form-control">
            <input
              type="date"
              value={date}
              disabled={saving}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="move-form-row">
          <div className="move-form-label">Точка назначения</div>
          <div className="move-form-control">
            <select
              value={destination}
              disabled={saving}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">Выберите точку назначения</option>
              <option value="Склад">Склад</option>
              <option value="Кухня">Кухня</option>
              <option value="Бар">Бар</option>
              <option value="Зал">Зал</option>
            </select>
          </div>
        </div>

        <div className="move-form-row comment">
          <div className="move-form-label">Комментарий</div>
          <div className="move-form-control">
            <textarea
              value={comment}
              disabled={saving}
              placeholder="Введите комментарий"
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
      </div>

      <h3 className="move-section-title">Содержит (шт. / кг. / л.)</h3>

      <div className="move-items">
        {rows.map((row, index) => {
          const searchValue = normalizeText(row.search);

          const filteredProducts =
            searchValue.length === 0
              ? products.slice(0, 30)
              : products
                  .filter((product) =>
                    normalizeText(product.name).includes(searchValue)
                  )
                  .slice(0, 30);

          return (
            <div
              className={isReceived ? "move-item-row received" : "move-item-row"}
              key={row.id}
            >
              <div className="move-item-index">{index + 1}</div>

              <div className="move-product-cell">
                <input
                  type="text"
                  value={row.search}
                  disabled={saving}
                  placeholder="Выберите товар"
                  onFocus={() => updateRow(row.id, { opened: true })}
                  onChange={(e) =>
                    updateRow(row.id, {
                      search: e.target.value,
                      selected: null,
                      name: "",
                      unit: "",
                      price: "",
                      opened: true,
                    })
                  }
                />

                <button
                  type="button"
                  className="move-select-arrow"
                  disabled={saving}
                  onClick={() => updateRow(row.id, { opened: !row.opened })}
                >
                  {row.opened ? "⌃" : "⌄"}
                </button>

                {row.opened && (
                  <div className="move-product-dropdown">
                    {filteredProducts.length === 0 ? (
                      <div className="move-product-empty">Товар не найден</div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={`${product.id || product.name}-${product.unit}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectProduct(row.id, product)}
                        >
                          <span>{product.name}</span>
                          <em>{product.unit}</em>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <input
                className="move-quantity"
                type="text"
                inputMode="decimal"
                value={row.quantity}
                disabled={saving}
                placeholder="Количество"
                onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
              />

              {isReceived && (
                <input
                  className="move-price"
                  type="text"
                  inputMode="decimal"
                  value={row.price}
                  disabled={saving}
                  placeholder="Цена"
                  onChange={(e) => updateRow(row.id, { price: e.target.value })}
                />
              )}

              <input
                className="move-unit"
                type="text"
                value={row.unit}
                disabled
                placeholder="Ед. изм."
              />

              <div className="move-row-actions">
                <button
                  type="button"
                  disabled={saving || index === 0}
                  onClick={() => moveRow(row.id, "up")}
                >
                  ↑
                </button>

                <button
                  type="button"
                  disabled={saving || index === rows.length - 1}
                  onClick={() => moveRow(row.id, "down")}
                >
                  ↓
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => removeRow(row.id)}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="move-actions">
        <button
          type="button"
          className="move-add-btn"
          disabled={saving}
          onClick={addRow}
        >
          Добавить
        </button>

        <button
          type="button"
          className="move-save-btn"
          disabled={saving}
          onClick={save}
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

export default InventoryOperationPanel;