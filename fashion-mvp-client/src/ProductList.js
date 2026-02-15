import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function ProductList() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_BACKEND_API_URL}/api/products`)
      .then((res) => {
        setProducts(res.data);
      })
      .catch(err => {
        console.error("데이터 로드 실패:", err);
      });
  }, []);

  return (
    <div style={{ padding: '20px'}}>
        <h2>신상품 목록</h2>
        <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px'
            }}>
                {products.map((product) => (
                    <Link
                        to={`/product/${product.id}`}
                        key={product.id}
                        style={{ textDecoration: 'none', color: 'inherit'}}
                    >


                        <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px'}}>
                            <img 
                                src={product.image_url} 
                                alt={product.name}
                                style={{ width: '100%', height: '200px', objectFit: 'cover'}}
                            />
                            <h3 style={{ fontSize: '16px', margin: '10px 0'}}>{product.name}</h3>
                            <p style={{ fontWeight: 'bold'}}>{product.price?.toLocaleString()}원</p>
                        </div>
                    </Link>
                ))}
        </div>
      </div>
      
  );
}

export default ProductList;