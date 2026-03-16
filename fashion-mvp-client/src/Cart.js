import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from './supabaseClient';


function Cart({ session, onCartUpdate }) {
    const [cartItems, setCartItems] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const loadCart = async () => {
            if (session) {
                console.log("현재 유저 ID:", session.user.id);
                const { data, error } = await supabase
                    .from('cart')
                    .select(`quantity, products(*)`)
                    .eq('user_id', session.user.id);
                
                if (error) {
                    console.error('장바구니 로드 실패:", error.message');
                    return;
                }

                console.log("DB 원본 데이터:", data);

                const formatted = data?.filter(cartItem => {
                    if (!cartItem.products) console.warn("상품 정보가 없는 장바구니 아이템 발견:", cartItem);
                    return cartItem.products;
                }).map(cartItem => ({
                     ...cartItem.products, quantity: cartItem.quantity 
                })) || [];

                console.log("가공된 데이터:", formatted);
                setCartItems(formatted); 
            } else {
                const localData = JSON.parse(localStorage.getItem('cart')) || [];
                setCartItems(localData);
            }
        };
        loadCart();
    }, [session]);

    
    const updateQuantity = async (id, amount) => {
        const item = cartItems.find(i => i.id === id);
        if (!item) return;
        
        const newQuantity = Math.max(1, item.quantity + amount);
        const updatedCart = cartItems.map(i => i.id === id ? { ...i, quantity: newQuantity} : i);
        
        if (session) {
            await supabase
                .from('cart')
                .update({ quantity: newQuantity })
                .eq('user_id', session.user.id)
                .eq('product_id', id);
        } else {
            localStorage.setItem('cart', JSON.stringify(updatedCart));
        }  
        setCartItems(updatedCart);
        onCartUpdate?.();
    };

    
    const removeItem = async (id) => {
        const updatedCart = cartItems.filter(i => i.id !== id);
        if (session) {
            await supabase
                .from('cart')
                .delete()
                .eq('user_id', session.user.id)
                .eq('product_id', id);
        } else {
            localStorage.setItem('cart', JSON.stringify(updatedCart));
        }
        setCartItems(updatedCart);
        onCartUpdate?.();      
    };

    const totalPrice = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);


    // 장바구니 쿠폰 적용 기능
    const [availableCoupons, setAvailableCoupons] = useState([]);
    const [selectedCoupon, setSelectedCoupon] = useState(null);

    const fetchUserCoupons = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/coupons/available`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            setAvailableCoupons(res.data.coupons);
        } catch (err) {
            console.error("쿠폰 로드 실패:", err);
        }
    };

    useEffect(() => {
        if (session) fetchUserCoupons();
    }, [session]);


    const calculateDiscount = () => {
        if (!selectedCoupon) return 0;

        if (totalPrice < selectedCoupon.min_order_amount) {
            alert(`이 쿠폰은 ${selectedCoupon.min_order_amount.toLocaleString()}원 이상 구매 시 사용 가능합니다.`);
            setSelectedCoupon(null);
            return 0;
        }

        if (selectedCoupon.type === 'percentage') {
            return Math.floor(totalPrice * (selectedCoupon.value / 100));
        } else {
            return selectedCoupon.value;
        }
    };

    const discountPrice = calculateDiscount();
    
    return (
        <div style={{ padding: '20px' }}>
            <h2>내 장바구니</h2>
            {cartItems.length === 0 ? (
                <p>장바구니가 비어있습니다.</p>
            ) : (
                <div>
                    {/* 1. 상품 리스트 영역 */}
                    {cartItems.map(item => (
                        <div key={item.id} style={{ display : 'flex', borderBottom: '1px solid #ddd', padding: '10px 0', alignItems: 'center'}}>
                            <img src={item.image_url} width="80" alt={item.name} />
                            <div style={{ marginLeft: '20px', flex: 1}}>
                                <h4>{item.name}</h4>
                                <p>{item.price?.toLocaleString()}원</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                                <span>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                                <button onClick={() => removeItem(item.id)} style={{ marginLeft: '20px', color: 'red'}}>삭제</button>
                            </div>
                        </div>
                    ))}

                    {/* 2. 쿠폰 선택 영역 (주문 버튼 위쪽) */}
                    <div style={{ marginTop: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '10px' }}>🎁 쿠폰 할인</h4>

                        {availableCoupons && availableCoupons.length > 0 ? (
                            <div>
                                <select
                                    value={selectedCoupon?.id || ""}
                                    onChange={(e) => {
                                        const coupon = availableCoupons.find(c => c.id === e.target.value);
                                        setSelectedCoupon(coupon || null);
                                    }}
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                                >
                                    <option value="">적용 가능한 쿠폰을 선택하세요</option>
                                    {availableCoupons.map(coupon => (
                                        <option key={coupon.id} value={coupon.id}>
                                            {coupon.name} - {coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value.toLocaleString()}원`} 할인
                                        </option>
                                    ))}
                                </select>
                                {selectedCoupon && (
                                    <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#666' }}>
                                        * 최소 주문 금액: {selectedCoupon.min_order_amount?.toLocaleString()}원
                                    </p>
                                )}
                            </div>
                        ) : (

                            <div style={{
                                padding: '10px',
                                textAlign: 'center',
                                border: '1px dashed #ccc',
                                borderRadius: '4px',
                                color: '#888',
                                fontSize: '0.9rem'
                            }}>
                                현재 사용 가능한 쿠폰이 없습니다.
                            </div>
                        )}
                    </div>

                    {/* 3. 결제 요약 영역 */}
                    <div style={{ marginTop: '30px', textAlign: 'right', borderTop: '2px solid #000', paddingTop: '20px' }}>
                        <div style={{ marginBottom: '10px', color: '#666' }}>
                            <span> 상품 총 금액: </span>
                            <span>{totalPrice.toLocaleString()}원</span>
                        </div>

                        {selectedCoupon && (
                            <div style={{ marginBottom: '10px', color: '#ff4d4f' }}>
                                <span>쿠폰 할인: </span>
                                <span>-{discountPrice.toLocaleString()}원</span>
                            </div>
                         )}

                         <h3 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>
                            최종 결제 금액: {(totalPrice - discountPrice).toLocaleString()}원
                         </h3>

                        <button 
                            onClick={() => navigate('/order', { state: { selectedCoupon: selectedCoupon, finalPrice: totalPrice - discountPrice } })}
                            style={{ 
                                padding: '10px 30px', 
                                background: 'black', 
                                color: 'white',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                border: 'none',
                                cursor: 'pointer',
                                width: '100%'
                            }}
                        >
                            주문하기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Cart;