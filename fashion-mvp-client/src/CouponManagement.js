import { useState, useEffect } from 'react';
import axios from 'axios';

function CouponManagement({ session }) {
    const [coupons, setCoupons] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [newCoupon, setNewCoupon] = useState({
        name: '',
        type: 'fixed',
        value: 0,
        target_category: '',
        min_order_amount: 0,
        expires_at: ''
    });

    // 쿠폰 목록 가져오기
    const fetchCoupons = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/coupons`, {
                headers: {Authorization: `Bearer ${session.access_token}` }
            });
            setCoupons(res.data.coupons);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchCoupons()}, []);

    // 쿠폰 생성 제출
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/admin/coupons`, newCoupon, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            alert("쿠폰이 발행되었습니다.");
            setIsFormOpen(false);
            setNewCoupon({
                name: '',
                type: 'fixed',
                value: 0,
                target_category: '',
                min_order_amount: 0,
                expires_at: ''
            });
            fetchCoupons();
        } catch (err) { 
            console.error(err);
            alert("발행 실패: " + (err.response?.data?.error || "알 수 없는 오류")); }
    };

    // 쿠폰 삭제
    const handleDelete = async (id) => {
        if(!window.confirm("쿠폰을 삭제하시겠습니까?")) return;
        try {
            await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/admin/coupons/${id}`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            fetchCoupons();
        } catch (err) { alert("삭제 실패"); }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>🎟️ 쿠폰 관리 시스템</h2>
                <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    style={{ padding: '10px 15px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {isFormOpen ? "닫기" : "신규 쿠폰 생성"}
                </button>
            </div>

            {/* [Create Form] 쿠폰 생성 폼 */}
            {isFormOpen && (
                <form onSubmit={handleSubmit} style={formStyle}>
                    <input type="text" placeholder="쿠폰명" value={newCoupon.name} onChange={e => setNewCoupon({...newCoupon, name: e.target.value})} required style={inputStyle}/>
                    <select value={newCoupon.type} onChange={e => setNewCoupon({...newCoupon, type: e.target.value})} style={inputStyle}>
                        <option value="fixed">금액 할인(원)</option>
                        <option value="percentage">비율 할인(%)</option>
                    </select>
                    <input type="number" placeholder="할인 수치" value={newCoupon.value} onChange={e => setNewCoupon({...newCoupon, value: Number(e.target.value)})} required style={inputStyle}/>
                    <input type="text" placeholder="적용 카테고리 (비어있으면 전체)" value={newCoupon.target_category} onChange={e => setNewCoupon({...newCoupon, target_category: e.target.value})} style={inputStyle}/>
                    <label>만료일: </label>
                    <input type="date" value={newCoupon.expires_at} onChange={e => setNewCoupon({...newCoupon, expires_at: e.target.value})} required style={inputStyle}/>
                    <button type="submit" style={{ padding: '10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px' }}>쿠폰 발행</button>
                </form>
            )}

            {/* [List] 쿠폰 목록 테이블 */}
            <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                        <th style={thStyle}>쿠폰명</th>
                        <th style={thStyle}> 할인</th>
                        <th style={thStyle}> 카테고리</th>
                        <th style={thStyle}> 만료일</th>
                        <th style={thStyle}> 관리</th>
                    </tr>
                </thead>
                <tbody>
                    {coupons.map(coupon => (
                        <tr key={coupon.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={tdStyle}>{coupon.name}</td>
                            <td style={tdStyle}>{coupon.value}{coupon.type === 'percentage' ? '%' : '원'}</td>
                            <td style={tdStyle}>{coupon.target_category || '전체'}</td>
                            <td style={tdStyle}>{coupon.expires_at}</td>
                            <td style={tdStyle}>
                                <button onClick={() => handleDelete(coupon.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>삭제</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '20px',
    background: '#f9f9f9',
    borderRadius: '8px',
    marginTop: '20px'
};

const inputStyle = {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ddd'
};

const thStyle = {
    padding: '12px',
    textAlign: 'left'
};

const tdStyle = {
    padding: '12px'
}


export default CouponManagement;