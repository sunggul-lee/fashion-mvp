const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

console.log("URL 연결확인:",process.env.SUPABASE_URL);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// 로그인 상태 체크 (나중에 주문하기 기능 사용)
const authenticateUser = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '로그인이 필요합니다.'})

    const { data: { user }, error } = await supabase.auth.getUser(token);
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

app.post('/api/orders', async (req, res) => {
    const { user_email, items, total_price, address } = req.body;

    try {
        const { data, error } = await supabase
            .from('orders')
            .insert([
                { user_email, items, total_price, address }
            ]);

        if (error) throw error;
        res.json({ success: true, message: "주문이 완료되었습니다!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
