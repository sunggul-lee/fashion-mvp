import React, { useState } from 'react';
import { supabase } from './supabaseClient';


function Login() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

        if (error) alert(error.message);
        else alert('이메일로 로그인 링크가 전송되었습니다. 편지함을 확인해주세요!');
        setLoading(false);
    };

    return (
        <div style={{ padding: '50px', textAlign: 'center'}}>
            <h2>로그인 / 회원가입</h2>
            <p>비밀번호 없이 이메일로 간편하게 로그인하세요.</p>
            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style = {{ padding: '10px', width: '250px', marginRight: '10px'}}
                    required
                />
                <button type="submit" disabled={loading} style={{ padding: '10px 20px' }}>
                    {loading ? '전송 중...' : '매직링크 보내기'}
                </button>
            </form>
        </div>
    );

}

export default Login;