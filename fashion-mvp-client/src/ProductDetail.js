import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from './supabaseClient';

function ProductDetail({ session, onCartUpdate }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_BACKEND_API_URL}/api/products/${id}`, { withCredentials: true})
            .then(res => {
                console.log("상세페이지 데이터:", res.data);
                setProduct(res.data);
            })
            .catch(err => console.error("상세 정보 로드 실패:", err));
    }, [id]);

    if (!product) return <div style={{ padding: '20px' }}>로딩 중...</div>;

    const reviewCount = product.review ? product.review.length : 0;
    const avgRating = reviewCount > 0
        ? (product.review.reduce((acc, cur) => acc + cur.rating, 0) / reviewCount).toFixed(1)
        : "0.0";


    const handleAddToCart = async (product, amount) => { // quantity => amount 변수명 수정 (함수 내 충돌오류)
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
        onCartUpdate?.();
    };


    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto'}}>
            <button onClick={() => navigate(-1)}>뒤로가기</button>

            <div style={{ display: 'flex', marginTop: '20px', gap: '40px', flexWrap: 'wrap'}}>
                <img
                    src={product.image_url}
                    alt={product.name}
                    style={{ width: '100%', maxWidth: '400px', borderRadius: '10px', objectFit: 'cover'}}
                />
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <span style={{ color: '#888', fontSize: '14px' }}>{product.category}</span>
                    <h2 style={{ margin: '10px 0' }}>{product.name}</h2>

                    {/* --- [추가] 상단 요약 평점 UI --- */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                        <span style={{ color: '#ffc107', fontSize: '20px' }}>★</span>
                        <strong style={{ fontSize: '18px' }}>{avgRating}</strong>
                        <span style={{ color: '#888' }}>({reviewCount}개의 후기)</span>
                    </div>

                    <p style={{ fontSize: '24px', color:'#ff4d4f' }}>
                        {product.price?.toLocaleString()}원
                    </p>
                    <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px' }}>
                        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>수량 선택</label>
                        <input 
                            type="number" 
                            min="1" 
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            style={{ width: '60px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                    </div>

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

            {/* --- [추가] 하단 상세 설명 및 리뷰 섹션 --- */}
            <div style={{ marginTop: '50px', borderTop: '2px solid #eee', paddingTop: '30px'}}>
                <h3 style={{ marginBottom: '20px' }}>상품 상세 설명</h3>
                <p style={{ color: '#666', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {product.description || "상품 상세 설명이 없습니다."}
                </p>

                <h3 style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                    사용자 리뷰 <span>({reviewCount})</span>
                </h3>

                {reviewCount > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {product.review.map((review, idx) => (
                            <div key={idx} style={{ padding: '20px', border: '1px solid #eee', borderRadius: '10px' }}>
                                <div style={{ marginBottom :'10px', display: 'flex', justifyContent: 'space-between'}}>
                                    <span style={{ color: '#ffc107' }}>
                                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                    </span>
                                    <span style={{ color: '#888', fontSize: '12px' }}>
                                        {new Date(review.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p style={{ margin: 0, color: '#333', fontSize: '15px', lineHeight: '1.5' }}>
                                    {review.content}
                                </p>
                                <div style={{ marginTop: '10px', fontSize: '13px', color: '#999' }}>
                                    작성자: {review.user_id?.slice(0, 4)}***
                                </div>
                        </div>
                        ))}
                    </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#888', background: '#fcfcfc' }}>
                            아직 작성된 리뷰가 없습니다. 첫 번째 리뷰를 남겨보세요!
                        </div>
                )}
            </div>
        </div>
    );
}

export default ProductDetail;