import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./AdminLayout.scss";

const menuItems = [
  { to: "/admin", icon: "📊", label: "Главная", end: true },
  { to: "/admin/daily", icon: "📅", label: "Дневная статистика" },
  { to: "/admin/weekly", icon: "🗓️", label: "Недельная статистика" },
  { to: "/admin/monthly", icon: "🗂️", label: "Месячная статистика" },
  { to: "/admin/order-history", icon: "🕘", label: "История заказов" },
  { to: "/admin/categories", icon: "📂", label: "Категории" },
  { to: "/admin/menu-items", icon: "🍔", label: "Меню" },
  { to: "/admin/tech-cards", icon: "🧾", label: "Тех карты" },
  { to: "/admin/users", icon: "👥", label: "Пользователи" },
  { to: "/admin/create-staff", icon: "👤", label: "Создать сотрудника" },
  { to: "/admin/cash-monitor", icon: "💰", label: "Кассовый контроль" },
];

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 7h16M4 12h16M4 17h16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 6l12 12M18 6 6 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

function AdminNav({ onClick }: { onClick?: () => void }) {
  return (
    <nav className="admin-sidebar__nav">
      {menuItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} onClick={onClick}>
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const closeSidebar = () => setMobileSidebarOpen(false);

  return (
    <div className="admin-layout">
      <button
        type="button"
        className="admin-mobile-toggle"
        onClick={() => setMobileSidebarOpen(true)}
      >
        <MenuIcon />
        <span>Меню</span>
      </button>

      <aside className="admin-sidebar admin-sidebar--desktop">
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__badge">Панель управления</span>
          <h2>🌯 TacoGo</h2>
        </div>

        <AdminNav />
      </aside>

      {mobileSidebarOpen && (
        <div className="admin-mobile-sidebar">
          <div
            className="admin-mobile-sidebar__overlay"
            onClick={closeSidebar}
          />

          <aside className="admin-sidebar admin-sidebar--mobile">
            <div className="admin-sidebar__top">
              <div className="admin-sidebar__brand">
                <span className="admin-sidebar__badge">
                  Панель управления
                </span>
                <h2>🌯 TacoGo</h2>
              </div>

              <button
                type="button"
                className="admin-mobile-close"
                onClick={closeSidebar}
              >
                <CloseIcon />
              </button>
            </div>

            <AdminNav onClick={closeSidebar} />
          </aside>
        </div>
      )}

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;