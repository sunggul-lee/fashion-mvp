import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Wishlist({ session }) {
    const [wishProducts, setWishProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWishlistData = async () => {
            setLoading(true);
            if (session?.user) {
                try {
                    const res = await axios.get(`${process.env.REACT_APP_BACKEND_API_URL}/api/wishlist`, {
                        params: { userId: session.user.id }
                    });
                    setWishProducts(res.data.products);
                } catch (e) {
                    console.error("DB 찜 목록 로드 실패");
                }
            } else {
                const local = JSON.parse(localStorage.getItem('wishlist') || '[]');
                setWishProducts(local);
            }
            setLoading(false);
        };

        fetchWishlistData();
    }, [session]);

    const handleRemove = async (productId) => {
        if (session?.user) {
            await axios.post(`${process.env.REACT_APP_BACKEND_API_URL}/api/wishlist/toggle`, {
                productId,
                userId: session.user.id
            });
        } else {
            const updated = wishProducts.filter(p => p.id !== productId);
            localStorage.setItem('wishlist', JSON.stringify(updated));
        }
        setWishProducts(prev => prev.filter(p => p.id !== productId));
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>불러오는 중...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
                ❤️ 나의 찜 목록 ({wishProducts.length})
            </h2>

            {wishProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 0', color: '#888' }}>
                    <p>찜한 상품이 없습니다.</p>
                    <Link to="/" style={{ color: '#333', textDecoration: 'underline' }}>쇼핑하러 가기</Link>
                </div>    
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '20px'
                }}>
                    {wishProducts.map(product => (
                        <div key={product.id} style={{ border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                            {/* 삭제 버튼 */}
                            <button
                                onClick={() => handleRemove(product.id)}
                                style={{
                                    position: 'absolute', top: '10px', right: '10px', zIndex: 5,
                                    background: 'white', border: '1px solid #ddd', borderRadius: '50%',
                                    width: '30px', height: '30px', cursor: 'pointer'
                                }}
                            >
                                ✕
                            </button>

                            <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit'}}>
                                <img src={product.image_url} alt={product.name} style={{ widht: '100%', height: '250px', objectiveFit: 'cover'  }} />
                                <div style={{ padding: '15px' }}>
                                    <h4 style={{ margin: '0 0 10px 0' }}>{product.name}</h4>
                                    <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{product.price?.toLocaleString()}원</p>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Wishlist;