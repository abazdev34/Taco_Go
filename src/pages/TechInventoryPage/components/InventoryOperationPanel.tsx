import { useMemo, useState } from "react";
import { createInventoryOperations } from "../../../api/inventory";
import { OperationType } from "../TechInventoryPage";

type ProductOption = {
  name: string;
  unit: string;
};

type Props = {
  type: OperationType;
  products: ProductOption[];
  saving: boolean;
  setSaving: (value: boolean) => void;
  onSaved: () => Promise<void>;
};

function InventoryOperationPanel({
  type,
  products,
  saving,
  setSaving,
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return products;

    return products.filter((product) =>
      product.name.toLowerCase().includes(value)
    );
  }, [products, search]);

  const chosen = products.filter((product) => {
    const key = `${product.name}-${product.unit}`;
    return selected[key];
  });

  const save = async () => {
    const payload = chosen
      .map((product) => {
        const key = `${product.name}-${product.unit}`;

        return {
          name: product.name,
          unit: product.unit,
          quantity: Number(qty[key] || 0),
          type,
        };
      })
      .filter((item) => item.quantity > 0);

    if (!payload.length) {
      alert("Выберите товар и укажите количество");
      return;
    }

    try {
      setSaving(true);

      await createInventoryOperations(payload);

      setSelected({});
      setQty({});
      setSearch("");

      await onSaved();

      alert(type === "received" ? "Приход сохранён" : "Списание сохранено");
    } catch (e: any) {
      alert(e?.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inventory-card">
      <div className="inventory-card-head">
        <div>
          <h2>{type === "received" ? "Приход товаров" : "Списание товаров"}</h2>
          <p>
            Отметьте нужные товары галочкой, затем укажите количество и нажмите
            “Сохранить”.
          </p>
        </div>
      </div>

      <input
        className="inventory-search"
        placeholder="Поиск товара..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="inventory-select-list">
        {filteredProducts.length === 0 ? (
          <div className="inventory-empty">Товар не найден</div>
        ) : (
          filteredProducts.map((product) => {
            const key = `${product.name}-${product.unit}`;

            return (
              <label key={key} className="inventory-check-row">
                <input
                  type="checkbox"
                  checked={!!selected[key]}
                  onChange={(e) =>
                    setSelected((prev) => ({
                      ...prev,
                      [key]: e.target.checked,
                    }))
                  }
                />

                <span>{product.name}</span>
                <em>{product.unit}</em>
              </label>
            );
          })
        )}
      </div>

      {chosen.length > 0 && (
        <div className="inventory-fact-list">
          {chosen.map((product) => {
            const key = `${product.name}-${product.unit}`;

            return (
              <label key={key}>
                <span>{product.name}</span>

                <input
                  type="number"
                  step="0.001"
                  placeholder={`0 ${product.unit}`}
                  value={qty[key] || ""}
                  onChange={(e) =>
                    setQty((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                />
              </label>
            );
          })}
        </div>
      )}

      <div className="inventory-card-actions">
        <button
          type="button"
          className="save"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

export default InventoryOperationPanel;