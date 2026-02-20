const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

console.log("URL 연결확인:",process.env.SUPABASE_URL);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 로그인 상태 체크 (주문하기 기능 반영완료)
const authenticateUser = async (req, res, next) => {

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '로그인이 필요합니다.'})

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: '유효하지 않은 토큰입니다.'});

    req.user = user;
    next();
}


app.get('/api/products', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*');

        if (error) {
            console.error("DB 에러:", error.message);
            return res.status(400).json({error: error.message});  
        }

        res.json(data);

    } catch (err) {
        console.error("서버 오류:", err);
        res.status(500).json({error:"서버 내부 오류 발생"});
    }
});

app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(404).json({ error: "상품을 찾을 수 없습니다."});
    }
});


app.get('/api/orders', authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

            if (error) throw error;
            res.json({ success: true, orders: data });
        } catch (error) {
                console.error("서버 에러:", error);
                res.status(500).json({ success: false, message: error.message });
        }
});

app.post('/api/payments/confirm', authenticateUser, async (req, res) => {
        const { paymentKey, orderId, amount, cartItems, address } = req.body;
        const user = req.user; // authenticateUser가 넣어준 정보

    try {

        const secretKey = 'test_sk_kYG57Eba3GbRZOEYg2g58pWDOxmA';
        const response = await axios.post(
            'https://api.tosspayments.com/v1/payments/confirm',
            { paymentKey, orderId, amount },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.status === 200) {
            const { error: orderError } = await supabaseAdmin
                .from('orders')
                .insert([{ 
                    user_id: user.id, 
                    user_email: user.email, 
                    items: cartItems,
                    total_price: amount, 
                    address: address,
                    status: 'completed'
            }]);       
            if (orderError) throw orderError;
            res.json({success: true, message: "결제 승인 및 주문 저장 성공" });
        }
    } catch (error) {
        console.error("❌ 결제/주문 통합 처리 실패:", error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: error.response?.data?.message || "결제는 성공했으나 주문 저장 중 오류가 발생했습니다."
        });
    }
});

app.listen(PORT, () => {
    if (process.env.NODE_ENV === 'production') {
        console.log(`🚀 배포 환경에서 서버가 포트 ${PORT}로 가동 중입니다.`);
    } else {
        console.log(`🏠 로컬 서버: http://localhost:${PORT}`);
    }
});
