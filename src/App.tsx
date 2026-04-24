import { Navigate, Route, Routes } from 'react-router-dom'

import HomeRedirect from './components/HomeRedirect'
import Layout from './components/Layout'
import RoleRoute from './components/RoleRoute'

import LoginPage from './pages/LoginPage'
import PendingApprovalPage from './pages/PendingApprovalPage'
import RegisterPage from './pages/RegisterPage'

import AssemblyMonitor from './pages/AssemblyMonitor/AssemblyMonitor'
import CashierMonitor from './pages/CashierMonitor/CashierMonitor'
import ClientMonitor from './pages/ClientMonitor/ClientMonitor'
import HallMonitor from './pages/HallMonitor/HallMonitor'
import HistoryPage from './pages/History/HistoryPage'
import KitchenMonitor from './pages/KitchenMonitor/KitchenMonitor'

import AdminAccessRequestsPage from './pages/Admin/AdminAccessRequestsPage'
import AdminCreateStaffPage from './pages/Admin/AdminCreateStaffPage'
import AdminLayout from './pages/Admin/AdminLayout'
import AdminOrdersPage from './pages/Admin/AdminOrdersPage'
import AdminUsersPage from './pages/Admin/AdminUsersPage'
import CategoriesPage from './pages/Admin/CategoriesPage'
import DailyStatsPage from './pages/Admin/DailyStatsPage'
import MenuItemsPage from './pages/Admin/MenuItemsPage'
import MonthlyStatsPage from './pages/Admin/MonthlyStatsPage'
import OrderHistoryPage from './pages/Admin/OrderHistoryPage'
import TechCardsPage from './pages/Admin/TechCardsPage'
import WeeklyStatsPage from './pages/Admin/WeeklyStatsPage'
import AdminCashMonitor from './pages/AdminCashMonitor/AdminCashMonitor'

function App() {
  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route path='/register' element={<RegisterPage />} />
      <Route path='/pending-approval' element={<PendingApprovalPage />} />

      <Route path='/' element={<Layout />}>
        <Route index element={<HomeRedirect />} />
        <Route path='client' element={<ClientMonitor />} />

        <Route
          path='cashier'
          element={
            <RoleRoute allowedRoles={['cashier']}>
              <CashierMonitor />
            </RoleRoute>
          }
        />

        <Route
          path='kitchen'
          element={
            <RoleRoute allowedRoles={['kitchen']}>
              <KitchenMonitor />
            </RoleRoute>
          }
        />

        <Route
          path='monitor'
          element={
            <RoleRoute allowedRoles={['hall']}>
              <HallMonitor />
            </RoleRoute>
          }
        />

        <Route
          path='assembly'
          element={
            <RoleRoute allowedRoles={['assembly']}>
              <AssemblyMonitor />
            </RoleRoute>
          }
        />

        <Route
          path='history'
          element={
            <RoleRoute allowedRoles={['history']}>
              <HistoryPage />
            </RoleRoute>
          }
        />

        <Route
          path='admin'
          element={
            <RoleRoute allowedRoles={['admin']}>
              <AdminLayout />
            </RoleRoute>
          }
        >
          <Route index element={<AdminOrdersPage />} />
          <Route path='daily' element={<DailyStatsPage />} />
          <Route path='weekly' element={<WeeklyStatsPage />} />
          <Route path='monthly' element={<MonthlyStatsPage />} />
          <Route path='order-history' element={<OrderHistoryPage />} />
          <Route path='categories' element={<CategoriesPage />} />
          <Route path='menu-items' element={<MenuItemsPage />} />
          <Route path='tech-cards' element={<TechCardsPage />} />
          <Route path='access-requests' element={<AdminAccessRequestsPage />} />
          <Route path='create-staff' element={<AdminCreateStaffPage />} />
          <Route path='users' element={<AdminUsersPage />} />
          <Route path='cash-monitor' element={<AdminCashMonitor />} />
        </Route>

        <Route path='*' element={<Navigate to='/' replace />} />
      </Route>
    </Routes>
  )
}

export default App