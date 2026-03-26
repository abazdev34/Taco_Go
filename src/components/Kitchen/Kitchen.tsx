/** @format */
import React from "react";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
import { IState, IOrder } from "../../Redux/actionTypes/types";
import { actionTypeKeys } from "../../Redux/actionTypes/actionTypes";

const Kitchen: React.FC = () => {
  const dispatch = useDispatch();
  const orders = useSelector((state: IState) => state.orders, shallowEqual);

  const handleMoveToReady = (orderId: string, item: any) => {
    dispatch({ type: "MOVE_TO_READY", payload: { orderId, item } });
  };

  const closeOrder = (id: string) => {
    dispatch({ type: actionTypeKeys.UPDATE_ORDER_STATUS, payload: { id, status: 'ready' } });
  };

  return (
    <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>👨‍🍳 АШКАНА БАШКАРУУ</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
        {orders.map((order: any) => (
          <div key={order.id} style={{ background: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 6px 15px rgba(0,0,0,0.1)' }}>
            
            {/* ШАПКА ЗАКАЗА */}
            <div style={{ background: '#2c3e50', color: 'white', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h2 style={{ margin: 0 }}>Заказ #{order.id} <span style={{fontSize: '14px', fontWeight: 'normal', marginLeft: '15px'}}>⏰ {order.createdAt}</span></h2>
               {order.items.length === 0 && (
                 <button onClick={() => closeOrder(order.id)} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                   ЗАКАЗДЫ ЖАБУУ ✅
                 </button>
               )}
            </div>

            <div style={{ display: 'flex', minHeight: '150px' }}>
              
              {/* ЛЕВАЯ КОЛОНКА: НУЖНО ПРИГОТОВИТЬ */}
              <div style={{ flex: 1, padding: '20px', borderRight: '2px dashed #eee' }}>
                <h4 style={{ color: '#e74c3c', marginTop: 0 }}>🔥 ДАЯРДОО КЕРЕК:</h4>
                {order.items.length === 0 ? <p style={{color: '#95a5a6'}}>Баары даяр!</p> : 
                  order.items.map((item: any) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#fff5f5', borderRadius: '8px', marginBottom: '10px', border: '1px solid #fab1a0' }}>
                      <span style={{ fontSize: '18px' }}>{item.title} <b style={{ color: '#d63031', fontSize: '22px' }}>x{item.quantity}</b></span>
                      <button 
                        onClick={() => handleMoveToReady(order.id, item)}
                        style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Даяр →
                      </button>
                    </div>
                  ))
                }
              </div>

              {/* ПРАВАЯ КОЛОНКА: ГОТОВО */}
              <div style={{ flex: 1, padding: '20px', background: '#f9fff9' }}>
                <h4 style={{ color: '#27ae60', marginTop: 0 }}>✅ ДАЯР БОЛДУ:</h4>
                {!order.readyItems || order.readyItems.length === 0 ? <p style={{color: '#bdc3c7'}}>Азырынча бош...</p> : 
                  order.readyItems.map((item: any) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f0fff4', borderRadius: '8px', marginBottom: '10px', border: '1px solid #b2f2bb' }}>
                      <span style={{ fontSize: '18px', color: '#2d3436' }}>{item.title}</span>
                      <b style={{ color: '#27ae60', fontSize: '22px' }}>x{item.quantity}</b>
                    </div>
                  ))
                }
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Kitchen;
