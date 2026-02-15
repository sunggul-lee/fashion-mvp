import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from './supabaseClient';

function ProductDetail({ session, onCartUpdate }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);

    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_BACKEND_API_URL}/api/products/${id}`)
            .then(res => setProduct(res.data))
            .catch(err => console.error("상세 정보 로드 실패:", err));
    }, [id]);

    // 로그인 여부에 따라 장바구니 저장 위치를 자동으로 결정
    const handleAddToCart = async (product, amount) => {
        if (session) {
            const { data: existing } = await supabase
                .from('cart')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('product_id', product.id)
                .single();
            
            if (existing) {
                await supabase.from('cart').update({ quantity: existing.quantity + amount }).eq('id', existing.id);
            } else {
                await supabase.from('cart').insert([{ user_id: session.user.id, product_id: product.id, quantity: amount }]);
            }
            alert("DB 장바구니에 저장되었습니다.")
        } else {
            const localCart = JSON.parse(localStorage.getItem('cart')) || [];
            const index = localCart.findIndex(item => item.id === product.id);

            if (index > -1) {
                localCart[index].quantity += amount;
            } else {
                localCart.push({ ...product, quantity: amount });
            }
            localStorage.setItem('cart', JSON.stringify(localCart));
            alert("로그인 전이라 로컬 장바구니에 임시 저장되었습니다.")
        }

        if (onCartUpdate) {
            onCartUpdate();
        }
    };


    if (!product) return <div style={{ padding: '20px' }}>로딩 중...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto'}}>
            <button onClick={() => navigate(-1)}>뒤로가기</button>

            <div style={{ display: 'flex', marginTop: '20px', gap: '40px', flexWrap: 'wrap'}}>
                <img
                    src={product.image_url}
                    alt={product.name}
                    style={{ width: '100%', maxWidth: '400px', borderRadius: '10px', objectFit: 'cover'}}
                />
                <div>
                    <h2>{product.name}</h2>
                    <p style={{ fontSize: '24px', color:'#ff4d4f' }}>
                        {product.price?.toLocaleString()}원
                    </p>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ marginRight: '10px' }}>수량:</label>
                        <input 
                            type="number" 
                            min="1" 
                            value={quantity} 
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            style={{ width: '50px', padding: '5px' }}
                        />
                    </div>
                    <p style={{ color: '#666', lineHeight: '1.6'}}>
                        {product.description || "상품 상세 설명이 없습니다."}
                    </p>
                    <button 
                        onClick={() => handleAddToCart(product, quantity)}
                        style={{
                            padding: '15px 30px',
                            background: '#000',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer'
                    }}>
                        장바구니 담기
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProductDetail;