import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MyPage({ session}) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewForm, setReviewForm] = useState(false);
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


    // 리뷰 제출 핸들러
    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!reviewForm.content.trim()) return alert("리뷰 내용을 입력해주세요.")
        
        try {
            const token = session.access_token;
            await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/reviews`, {
                orderId: reviewForm.orderId,
                productId: reviewForm.productId,
                rating: reviewForm.rating,
                content: reviewForm.content,
                userId: session.user.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("리뷰가 등록되었습니다!");
            setReviewForm({ orderId: null, productId: null, rating: 5, content: '' });
            fetchOrders();
        } catch (error) {
            alert(error.response?.data?.error || "리뷰 등록 중 오류가 발생했습니다.");
        }
    };


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

            {orders.length === 0 ? ( <p>최근 주문 내역이 없습니다.</p> ) : (
                orders.map((order) => {
                    const statusInfo = getStatusInfo(order.status); // 매핑 함수 호출
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
                                        <div key={index} style={{ marginBottom: '15px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{item.name} x {item.quantity}개 ({(item.price * item.quantity).toLocaleString()}원)</span>
 
                                            {order.status === 'completed' && (
                                                <button
                                                    onClick={() => setReviewForm({ ...reviewForm, orderId: order.id, 
                                                    productId: item.product_id })}
                                                    style={reviewOpenButtonStyle}
                                                >
                                                    리뷰 쓰기
                                                </button>
                                            )}
                                            </div>

                                    {reviewForm.orderId === order.id && reviewForm.productId === item.product_id && (
                                        <div style={reviewFormContainerStyle}>
                                            <div style={{ marginBottom: '10px' }}>
                                            {[1, 2, 3, 4, 5].map(num => (
                                                <span
                                                    key={num}
                                                    onClick={() => setReviewForm({...reviewForm, rating: num})}
                                                    style={{ cursor: 'pointer', fontSize: '1.5rem', color: num <= reviewForm.rating? '#ffc107' : '#ddd', marginRight: '5px' }}
                                                >★</span>
                                            ))}
                                            <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: '#666' }}>{reviewForm.rating}점</span>
                                            </div>
                                        <textarea
                                            style={{
                                                ...reviewTextStyle,
                                                color: '#333',
                                                background: '#fff',
                                                width: '100%',
                                                minHeight: '100px',
                                                padding: '10px',
                                                fontSize: '14px',
                                                border: '1px solid #ccc'
                                            }}
                                            placeholder="상품은 어떠셨나요? 솔직한 후기를 남겨주세요."
                                            value={reviewForm.content}
                                            onChange={(e) => setReviewForm({...reviewForm, content: e.target.value})}
                                        />
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                            <button onClick={handleReviewSubmit} style={submitButtonStyle}>등록하기</button>
                                            <button onClick={() => setReviewForm({ orderId: null, productId: null, rating: 5, content: '' })} style={closeButtonStyle}>취소</button>
                                        </div>
                                    </div>
                                    )}
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

const reviewOpenButtonStyle = {
    background: '#333',
    color: '#fff',
    border: 'none',
    padding: '5px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem'
};

const reviewFormContainerStyle = {
    marginTop: '15px',
    padding: '15px',
    background: '#f9f9f9',
    border: '1px solid #eee',
    borderRadius: '8px',
};

const reviewTextStyle = {
    width: '100%',
    minHeight: '80px',
    color: '#fff',
    border: '1px solid #ddd',
    padding: '10px',
    borderRadius: '4px',
    boxSizing: 'border-box'
};

const submitButtonStyle = {
    background: '#28a745',
    color: '#fff',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '4px',
    cursor: 'pointer'
};

const closeButtonStyle = {
    background: '#6c757d',
    color: '#fff',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '4px',
    cursor: 'pointer'
};


export default MyPage;