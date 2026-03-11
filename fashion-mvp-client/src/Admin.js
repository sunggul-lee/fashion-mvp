import { useState } from 'react';
import ProductManagement from './ProductManagement';
import OrderManagement from './OrderManagement';
import AdminBannersForm from './AdminBannersForm';

function Admin({ session }) {
        const [activeTab, setActiveTab] = useState('products');
        
        return (
            <div style= {{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
                <h1>관리자 대시보드</h1>
                <p style={{ color: '#666' }}>관리자: {session?.user?.email}</p>

                {/* 네베게이션 탭 */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '2px solid #eee' }}>
                    <button
                        onClick={() => setActiveTab('products')}
                        style={tabStyle(activeTab === 'products')}
                    >📦 상품 관리</button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        style={tabStyle(activeTab === 'orders')}
                    >🛒 주문 관리</button>
                    <button
                        onClick={() => setActiveTab('banners')}
                        style={tabStyle(activeTab === 'banners')}
                    >🖼️ 배너 관리</button>

                </div>

                {/* 탭 내용 */}
                <main>
                        {activeTab === 'products' && <ProductManagement />}
                        {activeTab === 'orders' && <OrderManagement />}
                        {activeTab === 'banners' && (
                            <div style={{ border: '5px solid red', padding: '20px' }}>
                                <h2>여기가 배너 탭입니다!</h2>
                                <AdminBannersForm session={session} />
                            </div>
                        )}
                </main>
            </div>
        );
}

// 간단한 스타일링 객체
const tabStyle = (isActive) => {
    return {
        padding: '10px 20px',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        borderBottom: isActive ? '3px solid #000' : '3px solid transparent',
        fontWeight: isActive ? 'bold' : 'normal',
        fontSize: '16px',
        transition: 'all 0.2s ease'
    };
};

export default Admin;