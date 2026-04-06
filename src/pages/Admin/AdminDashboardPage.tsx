import { useEffect, useState } from "react";
import { fetchCategories } from "../../api/categories";
import { fetchMenuItems } from "../../api/menuItems";
import { fetchRoles } from "../../api/roles";
import { fetchActiveOrders, fetchHistoryOrders } from "../../api/orders";

function AdminDashboardPage() {
  const [stats, setStats] = useState({
    activeOrders: 0,
    completedOrders: 0,
    categories: 0,
    menuItems: 0,
    roles: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [activeOrders, completedOrders, categories, menuItems, roles] =
          await Promise.all([
            fetchActiveOrders(),
            fetchHistoryOrders(),
            fetchCategories(),
            fetchMenuItems(),
            fetchRoles(),
          ]);

        setStats({
          activeOrders: activeOrders.length,
          completedOrders: completedOrders.length,
          categories: categories.length,
          menuItems: menuItems.length,
          roles: roles.length,
        });
      } catch (error) {
        console.error(error);
      }
    };

    load();
  }, []);

  return (
    <div>
      <h1 style={styles.title}>Главная панель</h1>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.label}>Активные заказы</div>
          <div style={styles.value}>{stats.activeOrders}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Завершённые заказы</div>
          <div style={styles.value}>{stats.completedOrders}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Категории</div>
          <div style={styles.value}>{stats.categories}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Позиции меню</div>
          <div style={styles.value}>{stats.menuItems}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Роли пользователей</div>
          <div style={styles.value}>{stats.roles}</div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { marginTop: 0, fontSize: "28px", fontWeight: 800 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "18px",
    border: "1px solid #eaeaea",
  },
  label: { color: "#666", marginBottom: "8px" },
  value: { fontSize: "28px", fontWeight: 800 },
};

export default AdminDashboardPage;