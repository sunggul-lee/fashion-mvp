import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
/*import { loadTossPayments } from '@tosspayments/payment-sdk';*/

function Order({ session }) {
    const [address, setAddress] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const navigate = useNavigate();

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

    const totalPrice = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleOrder = async (e) => {
        e.preventDefault();
        if (!session) return alert("로그인이 필요합니다.")
    
    try {
        const response = await axios.post(`${process.env.REACT_APP_BACKEND_API_URL}/api/orders`, {
            user_id: session.user.id,
            user_email: session.user.email,
            items: cartItems,
            total_price: totalPrice,
            address: address
        }, { withCredentials: true });

        if (response.data.success) {
            const { error: clearError } = await supabase
                .from('cart')
                .delete()
                .eq('user_id', session.user.id);
            
            if (clearError) {
                console.error("DB 카트 비우기 실패:", clearError.message);
            }

            localStorage.removeItem('cart');
            alert("주문 성공!");
            navigate('/');
        } else {
            alert("주문 실패: " + response.data.message);
        }
    } catch (err) {
        console.error("주문 에러:", err);
        alert("주문 처리 중 오류가 발생했습니다.");
    }

    /*const handlePayment = async () => {
        const clientKey = 'test_ck_D54pQBlueR947LkvJl38WzYpK4rn'; // 테스트 키
        const tossPayments = await loadTossPayments(clientKey);

        try {
            await tossPayments.requestPayment('카드', {
                amount: totalPrice,
                orderId: `order_${Math.random().toString(36).slice(2, 11)}`,
                orderName: `${cartItems[0].name} 외 ${cartItems.length - 1}건`,
                successUrl: `${window.location.origin}/success`,
                failUrl: `${window.location.origin}/fail`,
            });
        } catch (err) {
            console.error("결제창 호출 에러:", err);
        }
    };*/


};

    return (
        <div style={{ padding: '20px'}}>
            <h2>주문서 작성</h2>
            <div style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '20px' }}>
                {cartItems.map(item => (
                    <p key={item.id}>{item.name} x {item.quantity}</p>
                ))}
                <hr />
                <h3>총 결제 금액: {totalPrice.toLocaleString()}원</h3>
            </div>

            <form onSubmit={handleOrder}>
                <input
                    type="text"
                    placeholer="배송지 주소를 입력하세요"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '300px', padding: '10px', marginBottom: '10px' }}
                    required
                />
                <br />
                <button type="submit" style={{ padding: '10px 20px', background: '#000', color: '#fff'}}>
                    결제하기
                </button>
            </form>
        </div>
    );
}

export default Order;