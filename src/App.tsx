import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import RoleRoute from "./components/RoleRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";

import ClientMonitor from "./pages/ClientMonitor/ClientMonitor";
import CashierMonitor from "./pages/CashierMonitor/CashierMonitor";
import KitchenMonitor from "./pages/KitchenMonitor/KitchenMonitor";
import HallMonitor from "./pages/HallMonitor/HallMonitor";
import AssemblyMonitor from "./pages/AssemblyMonitor/AssemblyMonitor";
import HistoryPage from "./pages/History/HistoryPage";

import AdminLayout from "./pages/Admin/AdminLayout";
import AdminOrdersPage from "./pages/Admin/AdminOrdersPage";
import CategoriesPage from "./pages/Admin/CategoriesPage";
import MenuItemsPage from "./pages/Admin/MenuItemsPage";
import AdminAccessRequestsPage from "./pages/Admin/AdminAccessRequestsPage";
import AdminCreateStaffPage from "./pages/Admin/AdminCreateStaffPage";
import AdminUsersPage from "./pages/Admin/AdminUsersPage";

function HomeRedirect() {
  return <Navigate to="/client" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />

      <Route path="/" element={<Layout />}>
        <Route index element={<HomeRedirect />} />
        <Route path="client" element={<ClientMonitor />} />

        <Route
          path="cashier"
          element={
            <RoleRoute allowedRoles={["cashier", "admin"]}>
              <CashierMonitor />
            </RoleRoute>
          }
        />

        <Route
          path="kitchen"
          element={
            <RoleRoute allowedRoles={["kitchen", "admin"]}>
              <KitchenMonitor />
            </RoleRoute>
          }
        />

        <Route
          path="monitor"
          element={
            <RoleRoute allowedRoles={["hall", "admin"]}>
              <HallMonitor />
            </RoleRoute>
          }
        />

        <Route
          path="assembly"
          element={
            <RoleRoute allowedRoles={["assembly", "admin"]}>
              <AssemblyMonitor />
            </RoleRoute>
          }
        />

        <Route
          path="history"
          element={
            <RoleRoute allowedRoles={["history", "admin"]}>
              <HistoryPage />
            </RoleRoute>
          }
        />

        <Route
          path="admin"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </RoleRoute>
          }
        >
          <Route index element={<AdminOrdersPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="menu-items" element={<MenuItemsPage />} />
          <Route path="access-requests" element={<AdminAccessRequestsPage />} />
          <Route path="create-staff" element={<AdminCreateStaffPage />} />
          <Route path="users" element={<AdminUsersPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;