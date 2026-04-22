import { NavLink, Outlet } from 'react-router-dom'
import './AdminLayout.scss'

function AdminLayout() {
  return (
    <div className='admin-layout'>
      <aside className='admin-sidebar'>
        <div className='admin-sidebar__brand'>
          <span className='admin-sidebar__badge'>Admin Panel</span>
          <h2>🌯 TacoGo</h2>
        </div>

        <nav className='admin-sidebar__nav'>
          <NavLink to='/admin' end>
            <span>📊</span>
            <span>Админ панель</span>
          </NavLink>

          <NavLink to='/admin/categories'>
            <span>📂</span>
            <span>Категории</span>
          </NavLink>

          <NavLink to='/admin/menu-items'>
            <span>🍔</span>
            <span>Меню</span>
          </NavLink>

          <NavLink to='/admin/access-requests'>
            <span>📩</span>
            <span>Заявки</span>
          </NavLink>

          <NavLink to='/admin/create-staff'>
            <span>👤</span>
            <span>Создать сотрудника</span>
          </NavLink>

          <NavLink to='/admin/users'>
            <span>👥</span>
            <span>Пользователи</span>
          </NavLink>

          {/* 🆕 КАССА КОНТРОЛЬ */}
          <NavLink to='/admin/cash-monitor'>
            <span>💰</span>
            <span>Кассовый контроль</span>
          </NavLink>

          <div className='admin-sidebar__divider' />

          <NavLink to='/cashier'>
            <span>💳</span>
            <span>Касса</span>
          </NavLink>

          <NavLink to='/kitchen'>
            <span>👨‍🍳</span>
            <span>Кухня</span>
          </NavLink>

          <NavLink to='/monitor'>
            <span>📺</span>
            <span>Зал / Монитор</span>
          </NavLink>

          <NavLink to='/assembly'>
            <span>📦</span>
            <span>Сборка</span>
          </NavLink>

          <NavLink to='/history'>
            <span>🕘</span>
            <span>История</span>
          </NavLink>
        </nav>
      </aside>

      <main className='admin-content'>
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout