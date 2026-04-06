import { NavLink, Outlet } from "react-router-dom";

const menuItems = [
  { label: "Главная панель", to: "/admin" },
  { label: "Заказы", to: "/admin/orders" },
  { label: "Сборка кухни", to: "/admin/kitchen-assembly" },
  { label: "Категории", to: "/admin/categories" },
  { label: "Меню", to: "/admin/menu-items" },
  { label: "Техкарты", to: "/admin/tech-cards" },
  { label: "Роли пользователей", to: "/admin/roles" },
];

function AdminLayout() {
  return (
    <div style={styles.wrapper}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>АДМИН ПАНЕЛЬ</div>

        <div style={styles.menu}>
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              style={({ isActive }) => ({
                ...styles.menuLink,
                ...(isActive ? styles.menuLinkActive : {}),
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </aside>

      <section style={styles.content}>
        <Outlet />
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    minHeight: "calc(100vh - 100px)",
    gap: "20px",
  },
  sidebar: {
    background: "#111",
    color: "#fff",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  logo: {
    fontSize: "22px",
    fontWeight: 800,
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  menuLink: {
    color: "#ddd",
    textDecoration: "none",
    padding: "12px 14px",
    borderRadius: "12px",
    fontWeight: 600,
  },
  menuLinkActive: {
    background: "#fff",
    color: "#111",
  },
  content: {
    background: "#f8f8f8",
    borderRadius: "18px",
    padding: "20px",
  },
};

export default AdminLayout;