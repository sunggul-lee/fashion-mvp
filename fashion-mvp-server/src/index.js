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

const secretKey = 'test_sk_kYG57Eba3GbRZOEYg2g58pWDOxmA';

// 로그인 상태 체크 (주문하기 기능 반영완료)
const authenticateUser = async (req, res, next) => {

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '로그인이 필요합니다.'})

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: '유효하지 않은 토큰입니다.'});

    req.user = user;
    next();
}

// --- 사용자 전용 API ---
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
        // [검증] 결제 승인 전, 실제 재고가 충분한지 먼저 확인
        for (const item of cartItems) {
            const { data: product, error: findError } = await supabaseAdmin
                .from('products')
                .select('stock, name')
                .eq('id', item.id)
                .single();

            if (findError || !product){
                return res.status(400).json({
                    success: false,
                    message: `[상품 ID: ${item.id}] 존재하지 않는 상품입니다.`
                })
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `[${product.name}] 재고가 부족합니다.`
                });
            }
        }

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
            // [재고 차감] 각 상품의 재고를 구매 수량만큼 줄임
            for (const item of cartItems) {
                const { error: rpcError } = await supabaseAdmin.rpc('decrement_stock', {
                    product_id: item.id,
                    quantity_to_subtract: item.quantity
                });

            if (rpcError) console.log(`❌ ${item.id} 차감 실패:`, rpcError.message);
            }
        }


            const { error: orderError } = await supabaseAdmin
                .from('orders')
                .insert([{ 
                    user_id: user.id, 
                    user_email: user.email, 
                    items: cartItems,
                    total_price: amount, 
                    address: address,
                    payment_key: paymentKey,
                    status: 'completed'
            }]);       
            if (orderError) {
                console.error("❌ 주문 테이블 저장 실패:", orderError);
                throw orderError;
            }

            const { error: cartError } = await supabaseAdmin
                .from('cart')
                .delete()
                .eq('user_id', user.id);

            if (cartError) console.log("장바구니 비우기 실패:", cartError.message);
            res.json({success: true, message: "결제 완료 및 장바구니 비우기 성공" });

        } catch (error) {
        console.error("❌ 결제/주문 통합 처리 실패:", error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: error.response?.data?.message || "결제는 성공했으나 주문 저장 중 오류가 발생했습니다."
        });
    }
});

app.post('/api/payments/cancel', authenticateUser, async (req, res) => {
    const { orderId, cancelReason } = req.body;

    try {
        // 주문 정보와 payment_key 조회
        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) return res.status(404).json({ message: "주문 건을 찾을 수 없습니다." });
        if (order.status === 'cancelled') return res.status(400).json({ message: "이미 취소된 주문입니다." })

        // 토스 결제 취소 API 호출
        const response = await axios.post(
            `https://api.tosspayments.com/v1/payments/${order.payment_key}/cancel`,
            { cancelReason: cancelReason || "고객 변심" },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.status === 200) {
            // 재고 복구 (increment_stock 함수 필요)
            if (order.item && Array.isArray(order.item)) {
                for (const item of order.items) { 
                    await supabaseAdmin.rpc('increment_stock', {
                        product_id: item.id,
                        quantity_to_add: item.quantity
                    });
                }
            }
    

            // 주문 상태 변경
            const { error: updateError } = await supabaseAdmin
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('id', orderId);
            
            if (updateError) throw updateError;

            res.json({ success: true, message: "환불 및 재고 복구가 완료되었습니다." });
        }
    } catch (error) {
        console.error("환불 처리 중 오류:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: error.response?.data?.message || "환불 처리 중 오류가 발생했습니다."
        });
    }
});


// --- 관리자 전용 API ---
app.get('/api/admin/orders', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/orders/update', async (req, res) => {
    const { id, status } =req.body;

    try {
        const { data, error } = await supabaseAdmin
            .from('order')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    if (process.env.NODE_ENV === 'production') {
        console.log(`🚀 배포 환경에서 서버가 포트 ${PORT}로 가동 중입니다.`);
    } else {
        console.log(`🏠 로컬 서버: http://localhost:${PORT}`);
    }
});
