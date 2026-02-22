import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function OrderManagement() {
        const [orders, setOrders] = useState([]);
        
        useEffect(() => {
            fetchOrders();
        }, []);

        const fetchOrders = async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error) setOrders(data);
        };

        const handleUpdateOrderStatus = async (id, status) => {
            const { error } = await supabase
                .from('orders')
                .update({ status })
                .eq('id', id);
                
            if (error) {
                alert("상태 업데이트 실패: " + error.message);
            } else {
                fetchOrders();
            }
        };

        // 스타일 가이드
        const thStyle = { padding: '15px 10px', fontSize: '14px', color: '#555' };
        const tdStyle = { padding: '15px 10px', verticalAlign: 'top'};
        const selectStyle = (status) => ({
        padding: '5px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        backgroundColor: status === 'shipping' ? '#e7f3ff' : status === 'delivered' ? '#f0fff4' : '#fff'
        });

        return (
           <div style={{ marginTop: '20px'}}>
                <h2>🛒 전체 주문 현황 ({orders.length}건)</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                            <th style={thStyle}>주문일시 / 주문정보</th>
                            <th style={thStyle}>주문자 정보</th>
                            <th style={thStyle}>주문 상품</th>
                            <th style={thStyle}>결제 금액</th>
                            <th style={thStyle}>배송지</th>
                            <th style={thStyle}>상태 변경</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id} style={{ borderBottom: '1px solid #eee'}}>
                                <td style={tdStyle}>
                                    <div style={{ fontSize: '12px', color: '#888' }}>{new Date(order.created_at).toLocaleString()}</div>
                                    <div style={{ fontSize: 'bold' }}>{order.id.slice(0, 8)}...</div>
                                </td>
                                <td style={tdStyle}>{order.user_email}</td>
                                <td style={tdStyle}>
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} style={{ fontSize: '14px' }}>
                                            {item.name} x {item.quantity}
                                        </div>
                                    ))}
                                </td>
                                <td style={tdStyle}>{order.total_price?.toLocaleString()}원</td>
                                <td style={tdStyle}>{order.address}</td>
                                <td style={tdStyle}>
                                    <select
                                        value={order.status}
                                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                        style={selectStyle(order.status)}
                                    >
                                        <option value="completed">결제완료</option>
                                        <option value="pending">배송준비</option>
                                        <option value="shipping">배송중</option>
                                        <option value="delivered">배송완료</option>
                                        <option value="canceled">주문취소</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

export default OrderManagement;