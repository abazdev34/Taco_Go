/** @format */
import React from "react";
import { useSelector } from "react-redux";
import { IState } from "../../Redux/actionTypes/types";

const History: React.FC = () => {
  // Redux-тон тарых массивин алабыз
  const history = useSelector((state: IState) => (state as any).history || []);

  return (
    <div style={{ padding: '40px 20px', background: '#f4f7f6', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '40px' }}>📜 ЗАКАЗДАРДЫН ТАРЫХЫ (ТАБЛИЦА)</h1>
      
      <div style={{ maxWidth: '1100px', margin: '0 auto', background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        {history.length === 0 ? (
          <h3 style={{ textAlign: 'center', color: '#95a5a6', padding: '50px' }}>Азырынча тарых бош...</h3>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#2ecc71', color: 'white' }}>
                <th style={{ padding: '15px', borderTopLeftRadius: '10px' }}>№ Заказ</th>
                <th style={{ padding: '15px' }}>Дата / Убакыт</th>
                <th style={{ padding: '15px' }}>Тамактардын тизмеси</th>
                <th style={{ padding: '15px' }}>Жалпы сумма</th>
                <th style={{ padding: '15px', borderTopRightRadius: '10px' }}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {history.map((order: any, index: number) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #eee', background: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#34495e' }}>#{order.id}</td>
                  <td style={{ padding: '15px', fontSize: '13px', color: '#7f8c8d' }}>
                    <div>Башталды: {order.createdAt}</div>
                    <div style={{ color: '#27ae60', marginTop: '4px' }}>Аяктады: {order.completedAt}</div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    {order.readyItems?.map((item: any) => (
                      <div key={item.id} style={{ fontSize: '14px', marginBottom: '3px' }}>
                        • {item.title} <b style={{ color: '#2c3e50' }}>x{item.quantity}</b>
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#2c3e50' }}>
                    {order.totalSum} сом
                  </td>
                  <td style={{ padding: '15px' }}>
                    <span style={{ background: '#dff0d8', color: '#3c763d', padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                      АТКАРЫЛДЫ
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Жалпы статистика (милдеттүү эмес) */}
      {history.length > 0 && (
        <div style={{ maxWidth: '1100px', margin: '20px auto', textAlign: 'right', padding: '10px' }}>
          <h3 style={{ color: '#2c3e50' }}>
            Жалпы киреше: {history.reduce((acc: number, curr: any) => acc + curr.totalSum, 0)} сом
          </h3>
        </div>
      )}
    </div>
  );
};

export default History;
