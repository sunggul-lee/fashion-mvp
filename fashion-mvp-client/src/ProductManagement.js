import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function ProductManagement({ session }) {
        const [products, setProducts] = useState([]);
        const [newItem, setNewItem] = useState({
            name: '',
            price: '',
            stock: '',
            image_url: ''
        });

        useEffect(() => {
            fetchProducts();
        }, []);

        // 1. 상품 리스트 불러오기
        const fetchProducts = async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error) setProducts(data);
        };

        // 2. 새 상품 등록 기능
        const handleCreateProduct = async (e) => {
            e.preventDefault();
            if (!newItem.name || !newItem.price) return alert("이름과 가격은 필수입니다.");

            const { error } = await supabase
                .from('products')
                .insert([{
                    name: newItem.name,
                    price: parseInt(newItem.price),
                    stock: parseInt(newItem.stock) || 0,
                    image_url: newItem.image_url
                }]);

            if (error) {
                alert("등록 실패: " + error.message);
            } else {
                alert("상품이 등록되었습니다.");
                setNewItem({ name: '', price: '', stock: '', image_url: '' });
                fetchProducts();
            }
        }

        // 3. 재고 수량 수정 가능
        const handleUpdateStock = async (id, newStock) => {
            if (newStock < 0) return;

            const { error } = await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', id);

            if (error) {
                alert("수정 실패: " + error.message);
            } else {
                fetchProducts();
            }
        }

        // 4. 상품 삭제 기능
        const handleDelete = async (id) => {
            if (!window.confirm("정말 삭제하시겠습니까?")) return;
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (!error) fetchProducts();
        }

        return (
            <div style={{ marginTop: '20px' }}>
                {/* --- 새 상품 등록 폼 --- */}
                <section style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '40px' }}>
                    <h2>✨ 새 상품 등록</h2>
                    <form onSubmit={handleCreateProduct} style={{ display: 'grid', gap: '10px' }}>
                        <input
                            type="text" placeholder="상품명"
                            value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}
                           style={inputStyle} required
                        />
                        <input
                            type="number" placeholder="가격 (원)"
                            value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})}
                           style={inputStyle} required
                        />
                        <input
                            type="number" placeholder="초기 재고"
                            value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})}
                           style={inputStyle} required
                        />
                       <input
                            type="text" placeholder="이미지 URL"
                            value={newItem.image_url} onChange={e => setNewItem({...newItem, image_url: e.target.value})}
                           style={inputStyle} required
                        />
                        <button type="submit" style={{ ...buttonStyle, background: '#28a745' }}>상품 등록하기</button>
                   </form>
                </section>

                                {/* --- 상품 리스트 및 재고 수정 --- */}
                <section>
                    <h2>📦 상품 리스트 및 재고 수정</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                                    <th style={tableHeaderStyle}>상품</th>
                                    <th style={tableHeaderStyle}>가격</th>
                                    <th style={tableHeaderStyle}>재고</th>
                                    <th style={tableHeaderStyle}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key= {product.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={tableCellStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center'}}>
                                            <img src={product.image_url} alt="" style={{ width: '40px', height: '40px', marginRight: '10px', objectFit: 'cover'}} />
                                            {product.name}
                                        </div>
                                    </td>
                                    <td style={tableCellStyle}>{product.price?.toLocaleString()}원</td>
                                    <td style={tableCellStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px'}}>
                                            <button onClick={() => handleUpdateStock(product.id, (product.stock || 0) -1)} style={stockBtnStyle}>-</button>
                                            <span style={{ fontWeight: 'bold', width: '30px', textAlign: 'center' }}>{product.stock || 0}</span>
                                            <button onClick={() => handleUpdateStock(product.id, (product.stock || 0) +1)} style={stockBtnStyle}>+</button>
                                        </div>
                                    </td>
                                    <td style={tableCellStyle}>
                                        <button onClick={() => handleDelete(product.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>삭제</button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}

// 간단한 스타일링 객체
const inputStyle = { padding: '10px', border: '1px solid #ddd', borderRadius: '4px' };
const buttonStyle = { padding: '12px', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const tableHeaderStyle = { padding: '12px', color: '#666' };
const tableCellStyle = { padding: '12px' };
const stockBtnStyle = { width: '25px', height: '25px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc' };


export default ProductManagement;