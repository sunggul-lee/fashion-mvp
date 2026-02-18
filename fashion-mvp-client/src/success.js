import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from './supabaseClient';

function Success ({ session }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const confirmPayment = async ()=> {
            const paymentKey = searchParams.get('paymentKey');
            const orderId = searchParams.get('orderId');
            const amount = searchParams.get('amount');

            try {
                const res = await axios.post(`${process.env.REACT_APP_BAKCEND_URL}/api/payments/confirm`, {
                    paymentKey, orderId, amount
                });
            
                if (res.data.success) {
                    if (session?.user?.id) {
                        await supabase.from('cart').delete().eq('user_id', session.user.id);
                        localStorage.removeItem('cart');
                    }                
                    alert("결제가 완료되었습니다!");
                    navigate('/');
                }
            } catch (err) {
                console.error("결제 승인 실패:", err);
                alert("결제 승인 중 오류가 발생했습니다.");
                navigate('/order');
            }
        };

        confirmPayment();
    }, [searchParams, session, navigate]);

    return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2>결제 승인 중...</h2>
            <p>잠시만 기다려주세요.</p>
        </div>
    );
}

export default Success;