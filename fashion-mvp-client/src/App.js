import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import ProductList from './ProductList'
import ProductDetail from './ProductDetail'
import Cart from './Cart';
import { mergeCart } from './cartService';
import Login from './Login';
import Order from './Order';


// 로그인시 장바구니 병합 트리거 기능 (NULL => session)
function App() {
  const [session, setSession] = useState(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) mergeCart(session.user.id, supabase);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) mergeCart(session.user.id, supabase);
    });

  return () => authListener.subscription.unsubscribe();
}, []);

  
  const handleLogout = () => supabase.auth.signOut();


  return (
    <Router>
      <nav style={{ padding: '20px', borderBottom: '1px solid #ddd', display: 'flex', gap: '20px'}}>
        <Link to="/">홈</Link>
        <Link to="/cart">장바구니</Link>
        {session ? (
          <button onClick={handleLogout}>로그아웃 ({session.user.email})</button>
        ) : (
          <Link to="/login">로그인</Link>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/product/:id" element={<ProductDetail session={session} />} />
        <Route path="/cart" element={<Cart session={session} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/order" element={<Order session={session} />} />
      </Routes>
    </Router>
      
  );
}

export default App;
