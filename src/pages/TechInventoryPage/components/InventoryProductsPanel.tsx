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

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryNameDraft, setCategoryNameDraft] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "Продукты",
    unit: "шт",
    price: "",
  });

  const activeProducts = useMemo(
    () => products.filter((item) => item.is_active !== false),
    [products]
  );

  const categories = useMemo(() => {
    return Array.from(
      new Set(activeProducts.map((item) => item.category || "Без категории"))
    ).sort((a, b) => String(a).localeCompare(String(b), "ru"));
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    const text = search.trim().toLowerCase();

    return activeProducts
      .filter((item) => {
        const productCategory = item.category || "Без категории";

        const bySearch =
          !text ||
          item.name.toLowerCase().includes(text) ||
          String(productCategory).toLowerCase().includes(text) ||
          item.unit.toLowerCase().includes(text);

        const byCategory =
          !categoryFilter || productCategory === categoryFilter;

        return bySearch && byCategory;
      })
      .sort((a, b) => {
        const cat = String(a.category || "Без категории").localeCompare(
          String(b.category || "Без категории"),
          "ru"
        );

        if (cat !== 0) return cat;

        return a.name.localeCompare(b.name, "ru");
      });
  }, [activeProducts, search, categoryFilter]);

  const groupedProducts = useMemo(() => {
    const map = new Map<string, TInventoryProduct[]>();

    filteredProducts.forEach((product) => {
      const category = product.category || "Без категории";
      const list = map.get(category) || [];
      list.push(product);
      map.set(category, list);
    });

    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "ru")
    );
  }, [filteredProducts]);

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

  const startEditCategory = (category: string) => {
    setEditingCategory(category);
    setCategoryNameDraft(category === "Без категории" ? "" : category);
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setCategoryNameDraft("");
  };

  const saveCategoryName = async (oldCategory: string) => {
    const nextCategory = categoryNameDraft.trim();

    if (!nextCategory) {
      alert("Введите название категории");
      return;
    }

    const categoryProducts = activeProducts.filter(
      (product) => (product.category || "Без категории") === oldCategory
    );

    if (!categoryProducts.length) return;

    try {
      setSaving(true);

      await Promise.all(
        categoryProducts.map((product) =>
          updateInventoryProduct(product.id, {
            name: product.name,
            category: nextCategory,
            unit: product.unit,
            price: Number(product.price || 0),
          })
        )
      );

      if (categoryFilter === oldCategory) {
        setCategoryFilter(nextCategory);
      }

      cancelEditCategory();
      await onSaved();
      alert("Категория изменена");
    } catch (error: any) {
      alert(error?.message || "Не удалось изменить категорию");
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (category: string) => {
    const categoryProducts = activeProducts.filter(
      (product) => (product.category || "Без категории") === category
    );

    if (!categoryProducts.length) return;

    if (
      !confirm(
        `Удалить категорию "${category}" и все товары внутри? Количество: ${categoryProducts.length}`
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      await Promise.all(
        categoryProducts.map((product) => deleteInventoryProduct(product.id))
      );

      if (categoryFilter === category) {
        setCategoryFilter("");
      }

      if (editingCategory === category) {
        cancelEditCategory();
      }

      await onSaved();
      alert("Категория удалена");
    } catch (error: any) {
      alert(error?.message || "Не удалось удалить категорию");
    } finally {
      setSaving(false);
    }
  };

  const removeAllProducts = async () => {
    if (!activeProducts.length) return;

    if (
      !confirm(
        `Удалить ВСЕ товары? Количество: ${activeProducts.length}. Это действие нельзя отменить.`
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      await Promise.all(
        activeProducts.map((product) => deleteInventoryProduct(product.id))
      );

      resetForm();
      cancelEditCategory();
      setSearch("");
      setCategoryFilter("");

      await onSaved();
      alert("Все товары удалены");
    } catch (error: any) {
      alert(error?.message || "Не удалось удалить все товары");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="products-card">
      <div className="products-head">
        <div>
          <h2>Товары</h2>
          <p>Категорияларга бөлүп, өзгөртүп жана өчүрө аласыз.</p>
        </div>

        <div className="products-row-actions">
          <strong>Всего: {filteredProducts.length}</strong>

          <button
            type="button"
            className="danger"
            disabled={saving || !activeProducts.length}
            onClick={removeAllProducts}
          >
            Удалить все
          </button>
        </div>
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

      <div className="products-category-list">
        {groupedProducts.map(([category, categoryProducts]) => (
          <section className="products-category-card" key={category}>
            <div className="products-category-head">
              {editingCategory === category ? (
                <div className="products-category-edit">
                  <input
                    value={categoryNameDraft}
                    disabled={saving}
                    placeholder="Название категории"
                    onChange={(e) => setCategoryNameDraft(e.target.value)}
                  />

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveCategoryName(category)}
                  >
                    Сохранить
                  </button>

                  <button
                    type="button"
                    className="secondary"
                    disabled={saving}
                    onClick={cancelEditCategory}
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h3>{category}</h3>
                    <p>Товаров: {categoryProducts.length}</p>
                  </div>

                  <div className="products-row-actions">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => startEditCategory(category)}
                    >
                      Изм. категорию
                    </button>

                    <button
                      type="button"
                      className="danger"
                      disabled={saving}
                      onClick={() => removeCategory(category)}
                    >
                      Удал. категорию
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="products-table-wrap">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>Ед.</th>
                    <th>Цена</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {categoryProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                      </td>

                      <td>{product.unit}</td>

                      <td>
                        {Number(product.price || 0).toLocaleString("ru-RU")}
                      </td>

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
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {!filteredProducts.length && (
          <div className="products-table-wrap">
            <table className="products-table">
              <tbody>
                <tr>
                  <td>Товары не найдены</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryProductsPanel;