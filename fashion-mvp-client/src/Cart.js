import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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


    
    return (
        <div style={{ padding: '20px' }}>
            <h2>내 장바구니</h2>
            {cartItems.length === 0 ? (
                <p>장바구니가 비어있습니다.</p>
            ) : (
                <div>
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
                    <div style={{ marginTop: '30px', textAlign: 'right'}}>
                        <h3>총 결제 금액: {totalPrice.toLocaleString()}원</h3>
                        <button 
                            onClick={() => navigate('/order')}
                            style={{ padding: '10px 30px', background: 'black', color: 'white'}}
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