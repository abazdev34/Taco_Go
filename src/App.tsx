import { Routes, Route, Link, Outlet } from "react-router-dom";

import ClientMonitor from "./pages/ClientMonitor/ClientMonitor";
import CashierMonitor from "./pages/CashierMonitor/CashierMonitor";
import KitchenMonitor from "./pages/KitchenMonitor/KitchenMonitor";
import HallMonitor from "./pages/HallMonitor/HallMonitor";
import HistoryMonitor from "./pages/HistoryMonitor/HistoryMonitor";

import AdminLayout from "./pages/Admin/AdminLayout";
import AdminDashboardPage from "./pages/Admin/AdminDashboardPage";
import AdminOrdersPage from "./pages/Admin/AdminOrdersPage";
import KitchenAssemblyPage from "./pages/Admin/KitchenAssemblyPage";
import CategoriesPage from "./pages/Admin/CategoriesPage";
import MenuItemsPage from "./pages/Admin/MenuItemsPage";
import TechCardsPage from "./pages/Admin/TechCardsPage";
import RolesPage from "./pages/Admin/RolesPage";

function Layout() {
  return (
    <div>
      <nav style={styles.nav}>
        <Link style={styles.link} to="/">Client</Link>
        <Link style={styles.link} to="/cashier">Cashier</Link>
        <Link style={styles.link} to="/kitchen">Kitchen</Link>
        <Link style={styles.link} to="/monitor">Hall</Link>
        <Link style={styles.link} to="/history">History</Link>
        <Link style={styles.link} to="/admin">Admin</Link>
      </nav>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ClientMonitor />} />
        <Route path="cashier" element={<CashierMonitor />} />
        <Route path="kitchen" element={<KitchenMonitor />} />
        <Route path="monitor" element={<HallMonitor />} />
        <Route path="history" element={<HistoryMonitor />} />

        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="kitchen-assembly" element={<KitchenAssemblyPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="menu-items" element={<MenuItemsPage />} />
          <Route path="tech-cards" element={<TechCardsPage />} />
          <Route path="roles" element={<RolesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

const styles = {
  nav: {
    display: "flex",
    gap: "15px",
    padding: "15px 20px",
    background: "#222",
    flexWrap: "wrap" as const,
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    fontWeight: "bold",
  },
  main: {
    padding: "20px",
  },
};

export default App;