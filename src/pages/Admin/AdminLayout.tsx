import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import './AdminLayout.scss'

const MenuIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M4 7h16M4 12h16M4 17h16'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M6 6l12 12M18 6 6 18'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    />
  </svg>
)

function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const closeSidebar = () => setMobileSidebarOpen(false)

  return (
    <div className='admin-layout'>
      <button
        type='button'
        className='admin-mobile-toggle'
        onClick={() => setMobileSidebarOpen(true)}
      >
        <MenuIcon />
        <span>Меню</span>
      </button>

      <aside className='admin-sidebar admin-sidebar--desktop'>
        <div className='admin-sidebar__brand'>
          <span className='admin-sidebar__badge'>Панель управления</span>
          <h2>🌯 TacoGo</h2>
        </div>

        <nav className='admin-sidebar__nav'>
          <NavLink to='/admin' end>
            <span>📊</span>
            <span>Главная</span>
          </NavLink>

          <NavLink to='/admin/daily'>
            <span>📅</span>
            <span>Дневная статистика</span>
          </NavLink>

          <NavLink to='/admin/weekly'>
            <span>🗓️</span>
            <span>Недельная статистика</span>
          </NavLink>

          <NavLink to='/admin/monthly'>
            <span>🗂️</span>
            <span>Месячная статистика</span>
          </NavLink>

          <NavLink to='/admin/order-history'>
            <span>🕘</span>
            <span>История заказов</span>
          </NavLink>

          <NavLink to='/admin/categories'>
            <span>📂</span>
            <span>Категории</span>
          </NavLink>

          <NavLink to='/admin/menu-items'>
            <span>🍔</span>
            <span>Меню</span>
          </NavLink>

          <NavLink to='/admin/tech-cards'>
            <span>🧾</span>
            <span>Тех карты</span>
          </NavLink>

          

          <NavLink to='/admin/users'>
            <span>👥</span>
            <span>Пользователи</span>
          </NavLink>

          <NavLink to='/admin/create-staff'>
            <span>👤</span>
            <span>Создать сотрудника</span>
          </NavLink>

          <NavLink to='/admin/cash-monitor'>
            <span>💰</span>
            <span>Кассовый контроль</span>
          </NavLink>
        </nav>
      </aside>

      {mobileSidebarOpen && (
        <div className='admin-mobile-sidebar'>
          <div
            className='admin-mobile-sidebar__overlay'
            onClick={closeSidebar}
          />

          <aside className='admin-sidebar admin-sidebar--mobile'>
            <div className='admin-sidebar__top'>
              <div className='admin-sidebar__brand'>
                <span className='admin-sidebar__badge'>Панель управления</span>
                <h2>🌯 TacoGo</h2>
              </div>

              <button
                type='button'
                className='admin-mobile-close'
                onClick={closeSidebar}
              >
                <CloseIcon />
              </button>
            </div>

            <nav className='admin-sidebar__nav'>
              <NavLink to='/admin' end onClick={closeSidebar}>
                <span>📊</span>
                <span>Главная</span>
              </NavLink>

              <NavLink to='/admin/daily' onClick={closeSidebar}>
                <span>📅</span>
                <span>Дневная статистика</span>
              </NavLink>

              <NavLink to='/admin/weekly' onClick={closeSidebar}>
                <span>🗓️</span>
                <span>Недельная статистика</span>
              </NavLink>

              <NavLink to='/admin/monthly' onClick={closeSidebar}>
                <span>🗂️</span>
                <span>Месячная статистика</span>
              </NavLink>

              <NavLink to='/admin/order-history' onClick={closeSidebar}>
                <span>🕘</span>
                <span>История заказов</span>
              </NavLink>

              <NavLink to='/admin/categories' onClick={closeSidebar}>
                <span>📂</span>
                <span>Категории</span>
              </NavLink>

              <NavLink to='/admin/menu-items' onClick={closeSidebar}>
                <span>🍔</span>
                <span>Меню</span>
              </NavLink>

              <NavLink to='/admin/tech-cards' onClick={closeSidebar}>
                <span>🧾</span>
                <span>Тех карты</span>
              </NavLink>

             
            

              <NavLink to='/admin/users' onClick={closeSidebar}>
                <span>👥</span>
                <span>Пользователи</span>
              </NavLink>

              <NavLink to='/admin/create-staff' onClick={closeSidebar}>
                <span>👤</span>
                <span>Создать сотрудника</span>
              </NavLink>


              <NavLink to='/admin/cash-monitor' onClick={closeSidebar}>
                <span>💰</span>
                <span>Кассовый контроль</span>
              </NavLink>
            </nav>
          </aside>
        </div>
      )}

      <main className='admin-content'>
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout