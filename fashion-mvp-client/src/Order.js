import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { loadTossPayments } from '@tosspayments/payment-sdk';

function Order({ session }) {
    const [address, setAddress] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const navigate = useNavigate();
    const location = useLocation(); // 장바구니에서 보낸 데이터 받기 위함

    // cart.js에서 navigate 디버깅 (state)
    console.log("전달받은 데이터:", location.state);

    // 장바구니에서 넘어온 쿠폰 및 최종 금액 정보 추출
    const selectedCoupon = location.state?.selectedCoupon || null;
    const finalPrice = location.state?.finalPrice || 0;

    useEffect (() => {
        const loadOrderItems = async () => {
            if (!session) {
                setCartItems(JSON.parse(localStorage.getItem('cart')) || []);
            } else {
                const { data, error } = await supabase
                    .from('cart')
                    .select(`quantity, products(*)`)
                    .eq('user_id', session.user.id);

                if (!error && data) {
                    const formatted = data.map(item => ({
                        ...item.products, quantity: item.quantity
                    }));
                    setCartItems(formatted);
                }
            }
        };
        loadOrderItems();
    }, [session]);

    // 기존 원금 계산
    const totalPrice = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleOrder = async (e) => {
        e.preventDefault(); 
        if (!session) return alert("로그인이 필요합니다.")
            
    try {
        // 결제 승인 시 필요한 쿠폰 ID를 보관하기 위해 pending_order에 추가
        const pendingOrder = { 
            items: cartItems, 
            address: address,
            userCouponId: selectedCoupon ? selectedCoupon.user_coupon_id : null
        };
        localStorage.setItem('pending_order', JSON.stringify(pendingOrder));

        const orderId = `order_${Math.random().toString(36).slice(2, 9)}`;

        const clientKey = 'test_ck_Z1aOwX7K8mOJWyYnxkvjVyQxzvNP'; // 테스트 키
        const tossPayments = await loadTossPayments(clientKey);

        await tossPayments.requestPayment('카드', {
            // totalPrice가 아닌 할인 적용된 finalPrice를 결제 금액으로 전송
            amount: selectedCoupon ? finalPrice: totalPrice,
            orderId: orderId,
            orderName: cartItems.length > 1
                ? `${cartItems[0].name} 외 ${cartItems.length - 1}건`
                : `${cartItems[0].name}`,
            successUrl: `${window.location.origin}/success`,
            failUrl: `${window.location.origin}/fail`,
            customerEmail: session.user.email
        });
 
    } catch (err) {
        const status = err.response?.status;
        const msg = status === 401 ? "인증이 만료되었습니다." : "주문 처리 중 오류가 발생했습니다.";
        alert(msg);

        if (status === 401) navigate('/login');
        console.error("주문 에러:", err);
        }
    };


    return (
        <div style={{ padding: '20px'}}>
            <h2>주문서 작성</h2>
            <div style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '20px' }}>
                {cartItems.map(item => (
                    <p key={item.id}>{item.name} x {item.quantity}</p>
                ))}
                <hr />
                {/* 할인 내역 표시 UI */}
                <p>상품 총 금액: {totalPrice.toLocaleString()}원</p>
                {selectedCoupon && (
                    <p style={{ color: 'red' }}>쿠폰 할인: -{(totalPrice - finalPrice).toLocaleString()}원 ({selectedCoupon.name})</p>
                )}
                <h3>최종 결제 금액: {(selectedCoupon ? finalPrice : totalPrice).toLocaleString()}원</h3>
            </div>

            <form onSubmit={handleOrder}>
                <input
                    type="text"
                    placeholder="배송지 주소를 입력하세요"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '300px', padding: '10px', marginBottom: '10px' }}
                    required
                />
                <br />
                <button type="submit" style={{ padding: '10px 20px', background: '#000', color: '#fff'}}>
                    { (selectedCoupon ? finalPrice : totalPrice).toLocaleString() }원 결제하기
                </button>
            </form>
        </div>
    );
}

export default Order;