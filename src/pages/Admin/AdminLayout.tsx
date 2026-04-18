import { NavLink, Outlet } from "react-router-dom";
import "./AdminLayout.scss";

function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2>TacoGo</h2>

        <nav>
          <NavLink to="/admin" end>
            Админ панель
          </NavLink>

          <NavLink to="/admin/categories">
            Категории
          </NavLink>

          <NavLink to="/admin/menu-items">
            Меню
          </NavLink>

          <NavLink to="/admin/access-requests">
            Заявки
          </NavLink>

          <NavLink to="/admin/create-staff">
            Создать сотрудника
          </NavLink>

          <NavLink to="/admin/users">
            Пользователи
          </NavLink>

          <hr />

          <NavLink to="/cashier">Касса</NavLink>
          <NavLink to="/kitchen">Кухня</NavLink>
          <NavLink to="/monitor">Зал / Монитор</NavLink>
          <NavLink to="/assembly">Сборка</NavLink>
          <NavLink to="/history">История</NavLink>
        </nav>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;