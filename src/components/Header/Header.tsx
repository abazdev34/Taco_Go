/** @format */
import React from "react";
import { NavLink } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { IState } from "../../Redux/actionTypes/types";
import { actionTypeKeys } from "../../Redux/actionTypes/actionTypes";
import { IoCartOutline, IoFastFood } from "react-icons/io5"; // Используем проверенную иконку

const Header: React.FC = () => {
  const cart = useSelector((state: IState) => state.cart);
  const dispatch = useDispatch();

  const toggleCart = () => dispatch({ type: actionTypeKeys.TOGGLE_CART });

  const logoAnimation = `
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    .logo-container:hover .burrito-icon {
      animation: bounce 0.5s infinite;
    }
  `;

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 50px',
      background: '#ffffff',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
    }}>
      <style>{logoAnimation}</style>

      {/* ЛОГОТИП */}
      <NavLink to="/" className="logo-container" style={{ 
        textDecoration: 'none', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px'
      }}>
        <div className="burrito-icon" style={{
          background: 'linear-gradient(135deg, #ff4d00, #ff8c00)',
          width: '45px',
          height: '45px',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          fontSize: '28px',
          boxShadow: '0 5px 15px rgba(255, 77, 0, 0.3)'
        }}>
          <IoFastFood />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '0.9' }}>
          <span style={{ fontSize: '22px', fontWeight: '900', color: '#2c3e50', textTransform: 'uppercase' }}>
            БУРИТ<span style={{ color: '#ff4d00' }}>ТОС</span>
          </span>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#bdc3c7', letterSpacing: '2px' }}>
            BURRITOS
          </span>
        </div>
      </NavLink>

      {/* НАВИГАЦИЯ */}
      <nav style={{ display: 'flex', gap: '10px' }}>
        <NavLink to="/" style={({isActive}) => ({ textDecoration: 'none', color: isActive ? '#ff4d00' : '#2c3e50', fontWeight: '700', padding: '10px' })}>Меню / Menu</NavLink>
        <NavLink to="/kitchen" style={({isActive}) => ({ textDecoration: 'none', color: isActive ? '#ff4d00' : '#2c3e50', fontWeight: '700', padding: '10px' })}>Кухня / Kitchen</NavLink>
        <NavLink to="/history" style={({isActive}) => ({ textDecoration: 'none', color: isActive ? '#ff4d00' : '#2c3e50', fontWeight: '700', padding: '10px' })}>История / History</NavLink>
      </nav>

      {/* КОРЗИНА */}
      <div onClick={toggleCart} style={{ position: 'relative', cursor: 'pointer', background: '#f4f7f6', padding: '10px', borderRadius: '12px' }}>
        <IoCartOutline size={28} color="#2c3e50" />
        {cart.length > 0 && (
          <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ff4d00', color: 'white', fontSize: '12px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
            {cart.reduce((acc, item) => acc + item.quantity, 0)}
          </span>
        )}
      </div>
    </header>
  );
};

export default Header;
