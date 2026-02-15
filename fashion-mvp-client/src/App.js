import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import ProductList from './ProductList'
import ProductDetail from './ProductDetail'
import Cart from './Cart';
import { mergeCart } from './cartService';
import Login from './Login';
import Order from './Order';
import MyPage from './MyPage';


function App() {
  const [session, setSession] = useState(undefined);
  const [cartCount, setCartCount] = useState(0);
  
  const updateCartCount = useCallback(async () => {
    if (session) {
      const { data } = await supabase
        .from('cart')
        .select('quantity')
        .eq('user_id', session.user.id);

      const total = data?.reduce((acc, item) => acc + (item.quantity || 1), 0);
      setCartCount(total);
    } else {
      const localCart = JSON.parse(localStorage.getItem('cart')) || [];
      const total = localCart.reduce((acc, item) => acc + (item.quantity || 0), 0);
      setCartCount(total);
    }
  }, [session]);


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        mergeCart(session.user.id, supabase);
        updateCartCount(session);
    } else {
      updateCartCount(null);
    }
  });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_IN' && session) {
        console.log("로그인 감지: 장바구니 병합 시작");
        await mergeCart(session.user.id, supabase);
        await updateCartCount(session);
      } else if (session) {
        updateCartCount(session);
      } else {
        setCartCount(0);
        updateCartCount(null);
      }
        
    });

  return () => authListener.subscription.unsubscribe();
}, [updateCartCount]);

  
  const handleLogout = () => supabase.auth.signOut();


  return (
    <Router>
      <nav style={{ padding: '20px', borderBottom: '1px solid #ddd', display: 'flex', gap: '20px', alignItems: 'center'}}>
        <Link to="/" style={{ textDecoration: 'none', color: 'black' }}>홈</Link>
        <Link to="/cart" style={{ position: 'relative', textDecoration: 'none', color: 'black' }}>
        장바구니{cartCount > 0 && (
          <span style={{
              position: 'absolute', top: '-12px', right: '-15px',
              backgroundColor: 'red', color: 'white', borderRadius: '50%',
              padding: '2px 6px', fontSize: '11px', fontWeight: 'bold'
            }}>
              {cartCount}
            </span>
        )}
        </Link>

        {session ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>{session.user.email}</span>
            <button onClick={handleLogout} style={{ cursor: 'pointer' }}>로그아웃 ({session.user.email})</button>
          </div>        
        ) : (
          <Link to="/login" style={{ textDecoration: 'none', color: '#007bff' }}>로그인</Link>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/product/:id" element={<ProductDetail session={session} onCartUpdate={updateCartCount} />} />
        <Route path="/cart" element={<Cart session={session} onCartUpdate={updateCartCount} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/order" element={<Order session={session} />} />
        <Route path="/mypage" element={<MyPage session={session} />} />
      </Routes>
    </Router>
      
  );
}

export default App;
