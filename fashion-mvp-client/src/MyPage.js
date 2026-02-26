import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MyPage({ session }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();


    // 주문 내역 가져오기
    const fetchOrders = useCallback (async () => {
            if (!session?.access_token) return;
            setLoading(true);
            try {
                const token = session.access_token;
                const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/orders`,{
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data.success) {
                    setOrders(res.data.orders);
                }
            } catch (error) {
                console.error("주문 내역 로드 실패:", error.message);
            } finally {
                setLoading(false);
            }
        }, [session?.access_token]);


    useEffect(() => {

        if (session === undefined) return; // 세션 로딩 중 대기
        if (session === null) {
            alert("로그인이 필요합니다.");
            navigate('/login');
            return;
        }
        fetchOrders();
    }, [session, navigate, fetchOrders]);


    // 주문 취소 핸들러
    const handleCancelOrder = async (orderId) => {
        if (!window.confirm("주문을 취소하고 환불하시겠습니까?")) return;

        try {
            const token = session.access_token;
            const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/payments/cancel`,
                { orderId, cancelReason: "고객 직접 취소" },
                { headers: { Authorization: `Bearer ${token}` }}
            );

            if (res.data.success) {
                alert("취소 및 환불 처리가 완료되었습니다.");
                fetchOrders(); //목록 새로고침
            }
        } catch (error) {
            alert(error.response?.data?.message || "취소 처리 중 오류가 발생했습니다.");
        }
    };


    // 주문 상태 텍스트 및 유형 매핑
    const getStatusInfo = (status) => {
        switch (status) {
            case 'completed': return { text: '결제완료', color:'#28a745' };
            case 'cancelled': return { text: '취소완료', color:'#dc3545' };
            case 'shipping': return { text: '배송중', color:'#007bff'};
            default: return { text: status || '주문처리중', color: '#6c757d'};
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>주문 내역을 불러오고 있습니다...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>마이페이지</h2>
            <h3>나의 주문 내역 ({orders.length})</h3>

            {orders.length === 0 ? <p>최근 주문 내역이 없습니다.</p> : (
                orders.map((order) => {
                    const statusInfo = getStatusInfo(order.status) // 매핑 함수 호출
                    return (
                        <div key={order.id} style={orderCardStyle}>
                            <div style={orderHeaderStyle}>
                                <span>
                                    주문일시: {new Date(order.created_at).toLocaleDateString()} (주문번호 {order.id.slice(0, 8)})
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <span style={{ ...statusBadgeStyle, background: statusInfo.color }}>
                                        {statusInfo.text}
                                    </span>
                                    {order.status === 'completed' && (
                                        <button
                                            onClick={() => handleCancelOrder(order.id)}
                                            style={cancelButtonStyle}
                                        >주문취소</button>
                                    )}
                                </div>
                            </div>
                            <div style={{ padding: '15px' }}>
                                    {order.items?.map((item, index) => (
                                        <div key={index} style={{ marginBottom: '5px' }}>
                                            {item.name} x {item.quantity}개 ({(item.price * item.quantity).toLocaleString()}원)
                                        </div>
                                    ))}
                                    <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '15px 0' }} />
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ color: '#666', marginRight: '10px' }}>최종 금액</span>
                                        <strong style={{ fontSize: '1.2rem', color: '#333' }}>
                                            {order?.total_price?.toLocaleString()}원
                                        </strong>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

// 간단한 인라인 스타일
const orderCardStyle = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginBottom: '20px',
    overflow: 'hidden'
};

const orderHeaderStyle = {
    background: '#f8f9fa',
    padding: '10px 15px',
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid #ddd'
};

const statusBadgeStyle = {
    background: '#000',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: 'bold'
};

const cancelButtonStyle = {
    background: '#fff', 
    border: '1px solid #ff4d4f', 
    color: '#ff4d4f',
    padding: '5px 10px', 
    borderRadius: '4px', 
    cursor: 'pointer'
};

export default MyPage;