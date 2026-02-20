import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Success ({ session }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const confirmed = useRef(false);

    useEffect(() => {
        if (session === undefined) return;

        const token = session?.access_token || session?.session?.access_token;
        if (!token) {
            console.error("인증 토큰을 찾을 수 없습니다.");
            return;
        }

        if (confirmed.current || !searchParams.get('paymentKey')) return;
        confirmed.current = true;

        const confirmPayment = async () => {
            const pendingData = JSON.parse(localStorage.getItem('pending_order'));

            try {

                const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/payments/confirm`, {
                    paymentKey: searchParams.get('paymentKey'),
                    orderId: searchParams.get('orderId'),
                    amount: searchParams.get('amount'),
                    cartItems: pendingData?.items || [],
                    address: pendingData?.address || ""
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (res.data.success) {
                    localStorage.removeItem('cart');
                    localStorage.removeItem('pending_order');
                    
                    alert("결제가 완료되었습니다!");
                    navigate('/', { replace: true });
                }
            } catch (err) {
                if (err.response?.data?.code === 'ALREADY_PROCESSED_PAYMENT') {
                    localStorage.removeItem('pending_order')
                    return navigate('/', { replace: true });
                }
                console.error("결제 승인오류:", err)
                alert("결제 승인 중 오류가 발생했습니다.");
                navigate('/order', { replace: true });
            }
        };

        confirmPayment();
    }, [searchParams, session, navigate]);

    if (session === undefined) return <div style={{ padding: '50px', textAlign: 'center'}}>인증 확인 중...</div>

    return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2>결제 승인 중...</h2>
            <p>잠시만 기다려주세요.</p>
        </div>
    );
}

export default Success;