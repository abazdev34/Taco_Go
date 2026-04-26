import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMenuItems } from "../../api/menuItems";
import { createOrder, updateCashierOrder } from "../../api/orders";
import { useCart } from "../../context/CartContext";
import { TOrderPlace, TPaymentMethod } from "../../types/order";
import { formatPrice } from "../../utils/currency";
import { buildOrderComment } from "../../utils/orderHelpers";
import "./ClientMonitor.scss";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=700&q=70";

function ClientMonitor() {
  const navigate = useNavigate();

  const {
    cart,
    cartOpen,
    setCartOpen,
    addToCart,
    removeFromCart,
    clearCart,
    totalItems,
    totalSum,
  } = useCart();

  const categoryRef = useRef<HTMLDivElement | null>(null);

  const [menu, setMenu] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [orderMode, setOrderMode] = useState<TOrderPlace>("hall");
  const [comment, setComment] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState("001");

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedQty, setSelectedQty] = useState(1);

  const paymentMethod: TPaymentMethod = "online";

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await fetchMenuItems(true);

        if (!mounted) return;

        const prepared = Array.isArray(data)
          ? data
              .filter((item) => item?.is_active !== false)
              .sort((a, b) => {
                const catA = a?.categories?.sort_order ?? 0;
                const catB = b?.categories?.sort_order ?? 0;

                if (catA !== catB) return catA - catB;

                return (a?.sort_order ?? 0) - (b?.sort_order ?? 0);
              })
          : [];

        setMenu(prepared);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Не удалось загрузить меню");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, any>();

    for (const item of menu) {
      const cat = item.categories;
      if (!cat?.id) continue;

      if (!map.has(cat.id)) {
        map.set(cat.id, {
          id: cat.id,
          name: cat.name,
          image: cat.image || cat.image_url || null,
          sort: cat.sort_order || 0,
        });
      }
    }

    return [
      { id: "all", name: "Все", image: null, sort: -1 },
      ...Array.from(map.values()).sort((a, b) => a.sort - b.sort),
    ];
  }, [menu]);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return menu;
    return menu.filter((item) => item.categories?.id === activeCategory);
  }, [menu, activeCategory]);

  const getItemImage = useCallback((item: any) => {
    return item?.image_url || item?.image || DEFAULT_IMAGE;
  }, []);

  const scrollCategories = useCallback((direction: "left" | "right") => {
    categoryRef.current?.scrollBy({
      left: direction === "left" ? -280 : 280,
      behavior: "smooth",
    });
  }, []);

  const openItemModal = useCallback((item: any) => {
    setSelectedItem(item);
    setSelectedQty(1);
  }, []);

  const closeItemModal = useCallback(() => {
    setSelectedItem(null);
    setSelectedQty(1);
  }, []);

  const addSelectedToCart = useCallback(() => {
    if (!selectedItem) return;

    addToCart({
      ...selectedItem,
      quantity: selectedQty,
    });

    closeItemModal();
  }, [selectedItem, selectedQty, addToCart, closeItemModal]);

  const handleCreateOrder = async () => {
    if (!cart.length || submitting) return;

    try {
      setSubmitting(true);

      const hasKitchen = cart.some(
        (item: any) => item.categories?.type !== "assembly"
      );
      const hasAssembly = cart.some(
        (item: any) => item.categories?.type === "assembly"
      );

      const nextStatus = hasKitchen ? "new" : "preparing";
      const nextCashierStatus = hasKitchen ? "new" : "assembly";
      const nextKitchenStatus = hasKitchen ? "new" : "skipped";
      const nextAssemblyStatus = hasAssembly
        ? hasKitchen
          ? "waiting"
          : "new"
        : "skipped";

      const savedOrder = await createOrder({
        items: cart,
        total: totalSum,
        comment: buildOrderComment({
          orderPlace: orderMode,
          paymentMethod,
          comment,
        }),
        source: "client",
        status: nextStatus as any,
        customer_name: "Гость",
        table_number: null,
        order_place: orderMode,
        payment_method: paymentMethod,
        assembly_progress: [],
      });

      await updateCashierOrder(savedOrder.id, {
        status: nextStatus as any,
        cashier_status: nextCashierStatus as any,
        payment_method: paymentMethod,
        paid_amount: totalSum,
        change_amount: 0,
        paid_at: new Date().toISOString(),
        kitchen_status: nextKitchenStatus as any,
        assembly_status: nextAssemblyStatus as any,
        assembly_progress: [],
      });

      setLastOrderNumber(
        String(savedOrder.daily_order_number || 0).padStart(3, "0")
      );
      clearCart();
      setComment("");
      setOrderMode("hall");
      setCartOpen(false);
      setSuccessOpen(true);
    } catch (e: any) {
      console.error("CLIENT ORDER ERROR:", e);
      alert(e?.message || "Не удалось оформить заказ");
    } finally {
      setSubmitting(false);
    }
  };

  if (successOpen) {
    return (
      <div className="client-success-page">
        <div className="client-success-card">
          <div className="client-success-check">✓</div>
          <h1>Заказ принят!</h1>
          <p>Ваш номер заказа</p>
          <strong>{lastOrderNumber}</strong>
          <span>Ожидайте, заказ уже передан в работу</span>
          <button type="button" onClick={() => setSuccessOpen(false)}>
            Новый заказ
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="client-loading">
        <div className="client-loading__bar" />
        <p>Загрузка меню...</p>
      </div>
    );
  }

  if (error) return <div className="client-empty">{error}</div>;

  return (
    <div className="client-page">
      <button
        type="button"
        className="client-home-btn"
        onClick={() => navigate("/")}
      >
        🏠
      </button>

      <section className="client-category-section">
        <button
          type="button"
          className="client-category-arrow client-category-arrow--left"
          onClick={() => scrollCategories("left")}
        >
          ‹
        </button>

        <div ref={categoryRef} className="client-categories-slider">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={activeCategory === cat.id ? "active" : ""}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className="client-category-img">
                {cat.image ? <img src={cat.image} alt={cat.name} /> : "🌯"}
              </span>
              <span className="client-category-name">{cat.name}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="client-category-arrow client-category-arrow--right"
          onClick={() => scrollCategories("right")}
        >
          ›
        </button>
      </section>

      <main className="client-menu-grid">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="client-card"
            onClick={() => openItemModal(item)}
          >
            <div className="client-card__image">
              <img
                src={getItemImage(item)}
                alt={item.title}
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="client-card__body">
              <h3>{item.title}</h3>
              <p>{item.description || "Сочное блюдо из нашего меню"}</p>

              <div className="client-card__bottom">
                <strong>{formatPrice(Number(item.price || 0))}</strong>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openItemModal(item);
                  }}
                >
                  Добавить
                </button>
              </div>
            </div>
          </article>
        ))}
      </main>

      {totalItems > 0 && (
        <button
          type="button"
          className="client-cart-badge"
          onClick={() => setCartOpen(true)}
        >
          <span>Корзина</span>
          <b>{totalItems}</b>
          <strong>{formatPrice(totalSum)}</strong>
        </button>
      )}

      {selectedItem && (
        <div className="client-item-modal">
          <div className="client-item-modal__overlay" onClick={closeItemModal} />

          <div className="client-item-modal__card">
            <button
              type="button"
              className="client-item-modal__close"
              onClick={closeItemModal}
            >
              ✕
            </button>

            <div className="client-item-modal__image">
              <img src={getItemImage(selectedItem)} alt={selectedItem.title} />
            </div>

            <div className="client-item-modal__content">
              <h2>{selectedItem.title}</h2>
              <p>{selectedItem.description || "Сочное блюдо из нашего меню"}</p>

              <div className="client-item-modal__price">
                {formatPrice(Number(selectedItem.price || 0))}
              </div>

              <div className="client-item-modal__qty">
                <button
                  type="button"
                  onClick={() => setSelectedQty((prev) => Math.max(1, prev - 1))}
                >
                  −
                </button>
                <b>{selectedQty}</b>
                <button
                  type="button"
                  onClick={() => setSelectedQty((prev) => prev + 1)}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="client-item-modal__add"
                onClick={addSelectedToCart}
              >
                Добавить •{" "}
                {formatPrice(Number(selectedItem.price || 0) * selectedQty)}
              </button>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="client-cart-drawer">
          <div
            className="client-cart-drawer__overlay"
            onClick={() => setCartOpen(false)}
          />

          <aside className="client-cart-drawer__panel">
            <div className="client-cart-drawer__head">
              <div>
                <h2>Корзина</h2>
                <span>
                  {totalItems} шт. • {formatPrice(totalSum)}
                </span>
              </div>

              <button type="button" onClick={() => setCartOpen(false)}>
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="client-cart-empty">
                <strong>Корзина пустая</strong>
                <span>Добавьте блюда из меню</span>
              </div>
            ) : (
              <div className="client-cart-list">
                {cart.map((item: any) => (
                  <div key={item.id} className="client-cart-item">
                    <img
                      className="client-cart-item__image"
                      src={getItemImage(item)}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                    />

                    <div className="client-cart-item__content">
                      <strong>{item.title}</strong>
                      <span>{formatPrice(Number(item.price || 0))}</span>

                      <div className="client-cart-qty">
                        <button type="button" onClick={() => removeFromCart(item)}>
                          −
                        </button>
                        <b>{item.quantity || 1}</b>
                        <button type="button" onClick={() => addToCart(item)}>
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="client-settings-group">
              <div className="client-group-title">Формат заказа</div>

              <div className="client-segments">
                <button
                  type="button"
                  className={orderMode === "hall" ? "active" : ""}
                  onClick={() => setOrderMode("hall")}
                >
                  Здесь
                </button>

                <button
                  type="button"
                  className={orderMode === "takeaway" ? "active" : ""}
                  onClick={() => setOrderMode("takeaway")}
                >
                  С собой
                </button>
              </div>
            </div>

            <div className="client-comment-box">
              <div className="client-group-title">Комментарий</div>
              <textarea
                className="client-comment"
                placeholder="Напишите пожелания к заказу"
                value={comment}
                onChange={(e) => setComment(e.currentTarget.value)}
                rows={3}
              />
            </div>

            <div className="client-cart-total">
              <span>Итого</span>
              <strong>{formatPrice(totalSum)}</strong>
            </div>

            <button
              type="button"
              className="client-order-btn"
              disabled={!cart.length || submitting}
              onClick={handleCreateOrder}
            >
              {submitting ? "Оформление..." : "Оформить заказ"}
            </button>

            <button
              type="button"
              className="client-clear-btn"
              onClick={clearCart}
              disabled={!cart.length || submitting}
            >
              Очистить корзину
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

export default ClientMonitor;