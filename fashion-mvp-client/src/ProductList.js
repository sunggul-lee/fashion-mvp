import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 필터 상태 통합 관리
  const [filters, setFilters] = useState({
    keyword: '',
    category: '전체',
    sort: 'latest'
  });

  useEffect(() => {
    const getFilteredProducts = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_API_URL}/api/products/search`, {
          params: filters // 쿼리 스트링 전달
        });
        setProducts(res.data);
      } catch (err) {
          console.error("제품 로드 실패", err);
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
      setFilters(prev => ({ ...prev, [name]: value }));
    };


  return (
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
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', flex: '1', minWidth: '200px' }}
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

        {/* --- 상품 리스트 영역 --- */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>상품을 불러오는 중...</div>
        ) : (
           <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px'
            }}>
              {products.length > 0 ? products.map((product) => (
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
                          <p style={{ fontWeight: 'bold', color: '#333' }}>{product.price?.toLocaleString()}원</p>
                      </div>
                    </div>
                  </Link>
                )) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: '#888' }}>
                    검색 결과와 일치하는 상품이 없습니다.
                  </div>
                )}
              </div>
        )}
      </div>
  );
}

const selectStyle = {
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #ddd',
  cursor: 'pointer'
};

export default ProductList;