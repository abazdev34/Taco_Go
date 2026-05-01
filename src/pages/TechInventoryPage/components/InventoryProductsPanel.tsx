import { useMemo, useState } from "react";
import {
  createInventoryProduct,
  deleteInventoryProduct,
  TInventoryProduct,
  updateInventoryProduct,
} from "../../../api/inventory";

type Props = {
  products: TInventoryProduct[];
  saving: boolean;
  setSaving: (value: boolean) => void;
  onSaved: () => Promise<void>;
};

const UNITS = ["шт", "кг", "л", "уп", "кор", "пачка"] as const;

const toNumber = (value: unknown) => {
  const normalized = String(value ?? "").replace(",", ".").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};

function InventoryProductsPanel({
  products,
  saving,
  setSaving,
  onSaved,
}: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "Продукты",
    unit: "шт",
    price: "",
  });

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((item) => item.category).filter(Boolean))
    ).sort((a, b) => String(a).localeCompare(String(b), "ru"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const text = search.trim().toLowerCase();

    return products
      .filter((item) => item.is_active !== false)
      .filter((item) => {
        const bySearch =
          !text ||
          item.name.toLowerCase().includes(text) ||
          String(item.category || "").toLowerCase().includes(text) ||
          item.unit.toLowerCase().includes(text);

        const byCategory =
          !categoryFilter || item.category === categoryFilter;

        return bySearch && byCategory;
      })
      .sort((a, b) => {
        const cat = String(a.category || "").localeCompare(
          String(b.category || ""),
          "ru"
        );

        if (cat !== 0) return cat;

        return a.name.localeCompare(b.name, "ru");
      });
  }, [products, search, categoryFilter]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      category: "Продукты",
      unit: "шт",
      price: "",
    });
  };

  const editProduct = (product: TInventoryProduct) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category || "Продукты",
      unit: product.unit || "шт",
      price: String(product.price || ""),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveProduct = async () => {
    const name = form.name.trim();
    const category = form.category.trim();

    if (!name) {
      alert("Введите название товара");
      return;
    }

    if (!form.unit) {
      alert("Выберите единицу измерения");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,
        category: category || null,
        unit: form.unit,
        price: toNumber(form.price),
      };

      if (editingId) {
        await updateInventoryProduct(editingId, payload);
        alert("Товар изменён");
      } else {
        await createInventoryProduct(payload);
        alert("Товар добавлен");
      }

      resetForm();
      await onSaved();
    } catch (error: any) {
      alert(error?.message || "Не удалось сохранить товар");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (product: TInventoryProduct) => {
    if (!confirm(`Удалить товар "${product.name}"?`)) return;

    try {
      setSaving(true);

      await deleteInventoryProduct(product.id);

      if (editingId === product.id) {
        resetForm();
      }

      await onSaved();
      alert("Товар удалён");
    } catch (error: any) {
      alert(error?.message || "Не удалось удалить товар");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="products-card">
      <div className="products-head">
        <div>
          <h2>Товары</h2>
          <p>Добавляйте, изменяйте и удаляйте товары склада.</p>
        </div>

        <strong>Всего: {filteredProducts.length}</strong>
      </div>

      <div className="products-form">
        <label>
          <span>Название товара</span>
          <input
            value={form.name}
            disabled={saving}
            placeholder="Например: Сыр Моцарелла"
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </label>

        <label>
          <span>Категория</span>
          <input
            value={form.category}
            disabled={saving}
            placeholder="Например: Продукты"
            onChange={(e) =>
              setForm((prev) => ({ ...prev, category: e.target.value }))
            }
          />
        </label>

        <label>
          <span>Ед. изм.</span>
          <select
            value={form.unit}
            disabled={saving}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, unit: e.target.value }))
            }
          >
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Цена</span>
          <input
            value={form.price}
            disabled={saving}
            inputMode="decimal"
            placeholder="0"
            onChange={(e) =>
              setForm((prev) => ({ ...prev, price: e.target.value }))
            }
          />
        </label>

        <div className="products-form-actions">
          <button type="button" onClick={saveProduct} disabled={saving}>
            {saving ? "Сохранение..." : editingId ? "Сохранить" : "Добавить"}
          </button>

          {editingId && (
            <button
              type="button"
              className="secondary"
              onClick={resetForm}
              disabled={saving}
            >
              Отмена
            </button>
          )}
        </div>
      </div>

      <div className="products-filters">
        <input
          value={search}
          placeholder="Поиск по названию, категории или ед. изм..."
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Все категории</option>

          {categories.map((item) => (
            <option key={String(item)} value={String(item)}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="products-table-wrap">
        <table className="products-table">
          <thead>
            <tr>
              <th>Категория</th>
              <th>Товар</th>
              <th>Ед.</th>
              <th>Цена</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td>{product.category || "—"}</td>

                <td>
                  <strong>{product.name}</strong>
                </td>

                <td>{product.unit}</td>

                <td>{Number(product.price || 0).toLocaleString("ru-RU")}</td>

                <td>
                  <div className="products-row-actions">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => editProduct(product)}
                    >
                      Изм.
                    </button>

                    <button
                      type="button"
                      className="danger"
                      disabled={saving}
                      onClick={() => removeProduct(product)}
                    >
                      Удал.
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!filteredProducts.length && (
              <tr>
                <td colSpan={5}>Товары не найдены</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InventoryProductsPanel;