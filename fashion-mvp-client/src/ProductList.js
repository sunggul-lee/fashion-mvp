import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toggleWishlist } from './wishlistService';
import MainBanner from './MainBanner';


function ProductList({ session }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState([]); // 찜한 상품 ID만 관리 (속도 최적화)

  const [popularKeywords, setPopularKeywords] = useState([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const fetchPopularKeywords = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_API_URL}/api/popular-keywords`);
        if (res.data && Array.isArray(res.data)) {
          setPopularKeywords(res.data);
        } else {
          setPopularKeywords([]);
        }
      } catch (e) {
        console.error("인기 검색어 로드 실패", e);
        setPopularKeywords([]);
      }
    };
    fetchPopularKeywords();
  }, []);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (session?.user) {
        try {
          const res = await axios.get(`${process.env.REACT_APP_BACKEND_API_URL}/api/wishlist`, {
            params: { userId: session.user.id }
          });
          setWishlistIds(res.data.products.map(p => p.id));
        } catch (e) { console.error("DB 찜 로드 실패"); }
      } else {
        const local = JSON.parse(localStorage.getItem('wishlist') || '[]');
        setWishlistIds(local.map(p => p.id));
      }
    };
    fetchWishlist();
  }, [session]);


  const handleWishClick = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const result = await toggleWishlist(product, session?.user);

      if (result.action === 'added') {
        setWishlistIds(prev => [...prev, product.id]);
      } else {
        setWishlistIds(prev => prev.filter(id => id !== product.id));
      }
    } catch (err) {
      alert("찜하기 처리에 실패했습니다.");
    }
  };


  const [totalPages, setTotalPages] = useState(1);
  
  // 필터 상태 통합 관리
  const [filters, setFilters] = useState({
    keyword: '',
    category: '전체',
    sort: 'latest',
    page: 1
  });


  useEffect(() => {
    const getFilteredProducts = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_API_URL}/api/products`, {
          params: filters // 쿼리 스트링 전달
        });
        console.log("API 응답:", res.data); //페이지네이션 디버그용

        setProducts(res.data.products || []);
        setTotalPages(res.data.totalPages || 1);

        // 검색어가 있고, 첫 페이지일 때만 백엔드에 검색 로그 전송 (데이터 클렌징 포함)
        if (filters.keyword.trim().length >= 2 && filters.page === 1) {
          axios.post(`${process.env.REACT_APP_BACKEND_API_URL}/api/search-log`, {
            keyword: filters.keyword.trim()
          }).catch(() => {}); // 로그 기록 실패 무음처리
        }

      } catch (err) {
          console.error("제품 로드 실패", err);
          setProducts([]);
      }
      setLoading(false);
    };

    // 디바운싱 (Debouncing) : 타이핑 끝나고 0.3초 후에 검색 실행
      const delayDebounceFn = setTimeout(() => {
        getFilteredProducts();
      } , 300);

      return () => clearTimeout(delayDebounceFn);
    }, [filters]); // filter 객체가 변할 때마다 실행
    
    const handleFilterChange = (e) => {
      const { name, value } = e.target;
      setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const handlePopularClick = (word) => {
      setFilters(prev => ({ ...prev, keyword: word, page: 1 }));
    }

    const handlePageChange = (newPage) => {
      setFilters(prev => ({ ...prev, page: newPage }));
      window.scrollTo(0, 0); // 페이지 이동 시 상단으로 스크롤
    };


  console.log("현재 인기검색어 상태:", popularKeywords); // 디버깅
  return (
    <div className="product-list-container">
      <MainBanner />
      <div style={{ padding: '20px'}}>
          <h2>신상품 목록</h2>
          {/* --- 필터 컨트롤러 영역 추가 --- */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
              name="keyword"
              type="text"
              placeholder="상품명 검색..."
              value={filters.keyword}
              onChange={handleFilterChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', flex: 1, minWidth: '200px' }}
            />

            <select name="category" value={filters.category} onChange={handleFilterChange} style={selectStyle}>
              <option value="전체">전체</option>
              <option value="Top">상의</option>
              <option value="Bottom">하의</option>
              <option value="Outer">아우터</option>
              <option value="Accessory">액세서리</option>
            </select>

            <select name="sort" value={filters.sort} onChange={handleFilterChange} style={selectStyle}>
              <option value="latest">최신순</option>
              <option value="price_asc">가격 낮은순</option>
              <option value="price_desc">가격 높은순</option>
            </select>
          </div>

          {/* --- 인기 검색어 순위 리스트 레이아웃 --- */}
          {isFocused && Array.isArray(popularKeywords) && popularKeywords.length > 0 && (
            <div style={{
              position: 'absolute',
              zIndex: 100,
              width: '100%',
              maxWidth: '500px',
              backgroundColor: 'fff',
              padding: '15px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '1px solid #eee',
              marginTop: '5px'
            }}>
              <h4 style={{ 
                fontSize: '14px', 
                color: '#222', 
                marginBottom: '15px', 
                borderBottm: '1px solid #f0f0f0', 
                paddingBottom: '8px', 
                fontWeight: 'bold' }}>🔥 실시간 인기 검색어</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}>
                {popularKeywords.slice(0, 10).map((word, index) => (
                  <div
                    key={index}
                    onMouseDown={() => handlePopularClick(word)}
                    style={{
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontWeight: 'bold', color: '#ff4757', width: '20px' }}>{index + 1}.</span>
                    <span style={{ color: '#333' }}>{word}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- 상품 리스트 영역 --- */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>상품을 불러오는 중...</div>
          ) : (
            <>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px'
              }}>
                {products.length > 0 ? products.map((product) => (
                  <div key={product.id} style={{ position: 'relative' }}>

                    {/* --- 찜하기(하트) 버튼 추가 --- */}
                    <button
                      onClick={(e) => handleWishClick(e, product)}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        zIndex: 10,
                        background: 'rgba(255, 255, 255, 0.8)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      {wishlistIds.includes(product.id) ? '❤️' : '🤍'}
                    </button>

                  <Link
                      to={`/product/${product.id}`}
                      key={product.id}
                      style={{ textDecoration: 'none', color: 'inherit'}}
                  >
                      <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px'}}>
                        <img 
                            src={product.image_url} 
                            alt={product.name}
                            style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <div style={{ marginTop: '10px' }}>
                            <span style={{ fontSize: '12px', color: '#888' }}>{product.category}</span>
                            <h3 style={{ fontSize: '16px', margin: '5px 0', height: '40px', overflow: 'hidden' }}>{product.name}</h3>

                            {/* --- [추가] 평점 및 리뷰 수 UI --- */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                              <span style={{ color: '#ffc107', fontSize: '14px' }}>★</span>
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                                {product.avgRating || "0.0"}
                              </span>
                              <span style={{ fontSize: '13px', color: '#888' }}>
                                ({product.reviewCount?.toLocaleString() || 0})
                              </span>
                            </div>
                            <p style={{ fontWeight: 'bold', color: '#333' }}>{product.price?.toLocaleString()}원</p>
                        </div>
                      </div>
                  </Link>
                </div>
              )) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: '#888' }}>
                    검색 결과와 일치하는 상품이 없습니다.
                </div>
              )}
            </div>

                {/* --- 페이지네이션 UI 구현 (이전/다음 버튼 포함) --- */}
                {products.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px', gap: '5px' }}>

                    {/* [이전] 버튼: 1페이지면 클릭 안 되게 처리 */}
                    <button
                      onClick={() => handlePageChange(filters.page - 1)}
                      disabled={filters.page === 1}
                      style={{
                        ...paginationButtonStyle,
                        cursor: filters.page === 1 ? 'not-allowed' : 'pointer',
                        opacity: filters.page === 1 ? 0.5 : 1,
                        backgroundColor: '#eee'
                      }}
                    >
                      &lt; 이전
                    </button>
      
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        style={{
                          ...paginationButtonStyle,
                          backgroundColor: filters.page === pageNum? '#333' : '#fff',
                          color: filters.page === pageNum ? '#fff' : '#333',
                          fontWeight: filters.page === pageNum ? 'bold' : 'normal'
                        }}
                      >
                        {pageNum}
                      </button>
                    ))}

                    {/* [다음] 버튼: 마지막 페이지면 클릭 안 되게 처리 */}
                    <button
                      onClick={() => handlePageChange(filters.page +1)}
                      disabled={filters.page === totalPages}
                      style={{
                        ...paginationButtonStyle,
                        cursor: filters.page === totalPages ? 'not-allowed' : 'pointer',
                        opacity: filters.page === totalPages ? 0.5 : 1,
                        backgroundColor: '#eee'
                      }}
                    >
                      다음 &gt;
                    </button>
                </div>
                )}
            </>
          )}
        </div>
     </div>
  );
}

const selectStyle = {
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #ddd',
  cursor: 'pointer'
};

const paginationButtonStyle = {
  padding:'8px 14px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s ease'
};

const popularTagStyle = {
  backgroundColor: '#f1f3f5',
  border: 'none',
  borderRadius: '15px',
  padding: '4px 12px',
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'background-color 0.2s'
};

export default ProductList;