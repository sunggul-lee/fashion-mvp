import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

function MyPage({ session }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authChecking, setAuthChecking] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {

        if (session === undefined) return; // 세션 로딩 중 대기

        setAuthChecking(false); // 세션 확인 완료

        if (session === null) {
            alert("로그인이 필요합니다.");
            navigate('/login');
            return;
        }
        

        const fetchOrders = async () => {
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false }); //최신순 정렬
                
                if (error) throw error;
                setOrders(data || []);
            } catch (error) {
                console.error("주문 내역 로드 실패:", error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [session, navigate]);

    if (authChecking) return <div style={{ padding: '20px' }}>인증 확인 중...</div>;
    if (loading) return <div style={{ padding: '20px' }}>로딩 중...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>마이페이지</h2>
            <h3>나의 주문 내역 ({orders.length})</h3>

            {orders.length === 0 ? (
                <p>최근 주문 내역이 없습니다.</p>
            ) : (
                orders.map((order) => (
                    <div key={order.id} style={orderCardStyle}>
                        <div style={orderHeaderStyle}>
                            <span>주문일시: {new Date(order.created_at).toLocaleDateString()}</span>
                            <span style={statusBadgeStyle}>결제완료</span>
                        </div>
                            <div style={{ padding: '15px' }}>
                                {order.items?.map((item, index) => (
                                    <div key={index} style={{ marginBottom: '5px' }}>
                                        {item.name} x {item.quantity}개 ({(item.price * item.quantity).toLocaleString()}원)
                                    </div>
                                ))}
                                <hr style={{ border: '0.5px solid #eee' }} />
                                <strong style={{ fontSize: '1.2rem' }}>
                                    총 결제 금액: {order?.total_price.toLocaleString()}원
                                </strong>
                            </div>
                        </div>
                ))
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
    borderRadius: '4px',
    fontSize: '0.8rem'
};

export default MyPage;