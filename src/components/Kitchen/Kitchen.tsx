/** @format */
import { useSelector, useDispatch } from "react-redux";
import { IState, IOrder } from "../../Redux/actionTypes/types";
import { actionTypeKeys } from "../../Redux/actionTypes/actionTypes";

const Kitchen = () => {
  const orders = useSelector((state: IState) => state.orders);
  const dispatch = useDispatch();

  const changeStatus = (id: string, status: string) => {
    dispatch({ type: actionTypeKeys.UPDATE_ORDER_STATUS, payload: { id, status } });
  };

  return (
    <div className="kitchen-panel" style={{ padding: '20px', background: '#f4f4f4' }}>
      <h1>Ашкана (Заказдар тизмеси)</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {orders.map((order: IOrder) => (
          <div key={order.id} style={{ background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3>Заказ: #{order.id} <span style={{ color: 'orange' }}>[{order.status}]</span></h3>
            <p>Убактысы: {order.createdAt}</p>
            <hr />
            {order.items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.title}</span>
                <b>x{item.quantity}</b>
              </div>
            ))}
            <div style={{ marginTop: '15px' }}>
              <button onClick={() => changeStatus(order.id, 'cooking')} style={{ background: '#84cdee', border: 'none', padding: '10px', marginRight: '10px' }}>Даярдоого алуу</button>
              <button onClick={() => changeStatus(order.id, 'ready')} style={{ background: '#4caf50', border: 'none', padding: '10px', color: 'white' }}>Даяр болду</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Kitchen;
