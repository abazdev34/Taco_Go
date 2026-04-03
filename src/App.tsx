import { Routes, Route, Link, Outlet } from "react-router-dom";

import ClientMonitor from "./pages/ClientMonitor/ClientMonitor";
import CashierMonitor from "./pages/CashierMonitor/CashierMonitor";
import KitchenMonitor from "./pages/KitchenMonitor/KitchenMonitor";
import HallMonitor from "./pages/HallMonitor/HallMonitor";
import HistoryMonitor from "./pages/HistoryMonitor/HistoryMonitor";

function Layout() {
  return (
    <div>
      <nav style={styles.nav}>
        <Link style={styles.link} to="/">Client</Link>
        <Link style={styles.link} to="/cashier">Cashier</Link>
        <Link style={styles.link} to="/kitchen">Kitchen</Link>
        <Link style={styles.link} to="/monitor">Hall</Link>
        <Link style={styles.link} to="/history">History</Link>
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