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
import Success from './success';
import Fail from './fail';


function App() {
  const [session, setSession] = useState(undefined);
  const [cartCount, setCartCount] = useState(0);
  
  const updateCartCount = useCallback(async () => {
    if (session === undefined) return;

    if (session) {
      const { data, error } = await supabase
        .from('cart')
        .select('quantity')
        .eq('user_id', session.user.id);

      if (!error) {
        const total = data?.reduce((acc, item) => acc + (item.quantity || 1), 0);
        setCartCount(total);
      }
      
    } else {
      const localCart = JSON.parse(localStorage.getItem('cart')) || [];
      const total = localCart.reduce((acc, item) => acc + (item.quantity || 0), 0);
      setCartCount(total);
    }
  }, [session]);

  const resetCartCount = () => {
    setCartCount(0);
  }


  useEffect(() => {
    updateCartCount();
  }, [session, updateCartCount]);

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (isMounted) {
          const session = data?.session;
          setSession(session || null);
          if (session) {
            await mergeCart(session.user.id, supabase);
          }
        }
      } catch (err) {
        if (!err.message.include('aborted')) console.error("Session Init Error:" , err);
      }
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

        setSession(session);

        if (_event === 'SIGNED_IN' && session) {
          await mergeCart(session.user.id, supabase);
        }
    });

  return () => {
    isMounted = false;
    authListener.subscription.unsubscribe();
  };
}, []);

  
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

        {session && (
          <Link to="/mypage" style={{ textDecoration: 'none', color: 'black' }}>
            주문내역
          </Link>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
          {session ? (
            <>
              <span style={{ fontSize: '12px', color: '#666' }}>{session.user.email}</span>
              <button onClick={handleLogout} style={{ cursor: 'pointer', padding: '5px 10px' }}>로그아웃</button>
            </>
          ) : (
            <Link to="/login" style={{ textDecoration: 'none', color: '#007bff' }}>로그인</Link>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/product/:id" element={<ProductDetail session={session} onCartUpdate={updateCartCount} />} />
        <Route path="/cart" element={<Cart session={session} onCartUpdate={updateCartCount} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/order" element={<Order session={session} />} />
        <Route path="/mypage" element={<MyPage session={session} />} />
        <Route path="/success" element={<Success session={session} onCartReset={resetCartCount} />} />
        <Route path="/fail" element={<Fail session={session} />} />
      </Routes>
    </Router>
      
  );
}

export default App;
