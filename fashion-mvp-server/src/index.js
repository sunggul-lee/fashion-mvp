const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { count } = require('yargs');
const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 3600 }); // 1시간 캐시

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
    const { keyword, category, sort, page = 1 } = req.query;
    const limit = 12; // 한 페이지에 보여줄 개수
    const offset = (page - 1) * limit;

    try {
        let query = supabaseAdmin.from('products').select(`*, review( rating )`, { count: 'exact' });

        // 카테고리 필터 (전체가 아닐 때만)
        if (category && category !== '전체') {
            query = query.eq('category', category);
        }

        // 검색어 필터 (상품명에 키워드 포함 여부, 대소문자 무시)
        if (keyword) {
            query = query.ilike('name', `%${keyword}%`);
        }

        // 정렬 로직
        if (sort === 'price_asc') {
            query = query.order('price', { ascending: true });
        } else if (sort === 'price_desc') {
            query = query.order('price', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false }); // 기본값 최신순
        }

        query = query.range(offset, offset + limit -1);

        const { data, error, count } = await query;
        if (error) throw error;

        const productWithStats = data.map(product => {
            console.log(data[0]);

            const reviewCount = product.review ? product.review.length : 0;
            const totalRating = product.review ? product.review.reduce((sum, r) => sum + r.rating, 0) : 0;
            const avgRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(1) : "0.0";

            return {
                ...product,
                avgRating: parseFloat(avgRating),
                reviewCount: reviewCount,
                reviews: undefined // 데이터 전송 최적화를 위해 원본 리뷰 배열은 제거
            };
        });

        res.json({
            products: productWithStats,
            totalCount: count,
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit)
        });

        } catch (err) {
            console.error("검색/페이지네이션 에러:", err);
            res.status(500).json({ error: "데이터를 불러오는 중 오류가 발생했습니다." });
        }
});

app.get('/api/popular-keywords', async (req, res) => {

    // const cacheKey = "popular_keywords";
    // const cachedData = myCache.get(cacheKey);
    // if (cachedData) return res.json(cachedData);

    try {
        const { data, error } = await supabaseAdmin
            .from('search_logs')
            .select('keyword')
            .limit(500)
            //.gte('created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString());
        
        if (error) throw error;

        // 키워드별 개수 카운트
        console.log("DB에서 가져온 원본 데이터 개수:", data?.length);

        if (!data || data.length === 0) {
            return res.status(200).json([]);
        }

        const counts = data.reduce((acc, { keyword }) => {
            acc[keyword] = (acc[keyword] || 0) + 1;
            return acc;
        }, {});

        const sortedKeywords = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([keyword]) => keyword);

        console.log("최종 정렬된 키워드:", sortedKeywords)

       // myCache.set(cacheKey, popular)
        res.status(200).json(sortedKeywords);
   
    } catch (err) {
        console.error("인기 검색어 API 내부 오류:", err);
        res.status(500).json({ error: "인기 검색어 로드 실패" });
    }
});

app.post('/api/search-log', async (req, res) => {
    const { keyword } = req.body;

    if (!keyword || !keyword.trim()) {
        return res.status(400).json({ message: "키워드가 없습니다." });
    }

    try {
        const { error } = await supabaseAdmin
            .from('search_logs')
            .insert([{ keyword: keyword.trim() }]);

        if (error) throw error;

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("로그 저장 실패:", error);
        res.status(500).json({ message: "서버 오류" });
    }
});


app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabaseAdmin
            .from('products')
            .select('*, review(*)')
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
        const { data: rawOrders, error } = await supabaseAdmin
            .from('orders')
            .select(`
                *,
                review (
                    product_id,
                    order_id
                )
            `)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

            if (error) {
                console.error("Supabase 조회 에러:", error);
                throw error;
            }

            if (!rawOrders) return res.json({ success: true, orders: []});

            const processedOrders = rawOrders.map(order => ({
                ...order,
                items: order.items.map(item => ({
                    ...item,
                    isReviewed: order.review?.some(r => String(r.product_id) === String(item.id)) || false
                }))
            }));

            res.json({ success: true, orders: processedOrders });
        } catch (error) {
                console.error("서버 에러:", error);
                res.status(500).json({ success: false, message: error.message });
        }
});


app.get('/api/wishlist', async (req, res) => {
    const { userId } = req.query;

    try {
        const { data, error } = await supabaseAdmin
            .from('wishlist')
            .select(`
                product_id,
                products(
                    id,
                    name,
                    price,
                    image_url,
                    category
                )
            `)
            .eq('user_id', userId);

        if (error) throw error;

        const formatted = data.map(item => item.products);
        res.json({ products: formatted });
        } catch (err) {
            res.status(500).json({ error: "찜 목록 조회 실패" });
        }
});


app.post('/api/wishlist/toggle', async (req, res) => {
    const { productId, userId } = req.body;

    if (!userId) {
        return res.status(401).json({ error: "로그인이 필요합니다." });
    }

    try {
        const { data: existing } = await supabaseAdmin
            .from('wishlist')
            .select('*')
            .eq('user_id', userId)
            .eq('product_id', productId)
            .maybeSingle();

        if (existing) {
            await supabaseAdmin.from('wishlist').delete().eq('id', existing.id);
            return res.json({ action: 'removed' });
        } else {
            await supabaseAdmin.from('wishlist').insert([{ user_id: userId, product_id: productId }]);
            return res.json({ action: 'added' });
        }
    } catch (err) {
        res.status(500).json({ error: "찜하기 처리 중 오류 발생" });
    }
});


app.post('/api/wishlist/merge', async (req, res) => {
    const { userId, localProductIds } = req.body;

    if (!userId || !localProductIds || localProductIds.length === 0) {
        return res.status(400).json({ message: "데이터가 없습니다." });
    }

    try {
        const insertData = localProductIds.map(id => ({
            user_id: userId,
            product_id: id
        }));

        const { error } = await supabaseAdmin
            .from('wishlist')
            .upsert(insertData, { onConflict: 'user_id, product_id' });

        if (error) throw error;
        res.json({ message: "동기화 완료" });
    } catch (err) {
        console.error("동기화 오류:", err);
        res.status(500).json({ error: "동기화 중 오류 발생" });
    }
});


app.post ('/api/reviews', async (req, res) => {
    const { productId, userId, rating, content, orderId } = req.body;

    try {
        // 해당 유저가 이 상품을 구매한 내역(order)이 있는지 확인
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('id, items')
            .eq('id', orderId)
            .eq('user_id', userId)
            .single();

        if (orderError || !order) {
            console.error("주문 조회 실패:", orderError); //디버깅용
            return res.status(403).json({ error: "주문 내역을 찾을 수 없습니다." });
        }

        console.log("주문데이터:", order) // 디버깅용

        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

        const hasProduct = items?.some(item => 
            String(item.product_id) === String(productId) || 
            String(item.id) === String(productId)
        );

        if (!hasProduct) {
            return res.status(403).json({ error: "해당 주문에 상품이 포함되어 있지 않습니다."});
        }

        // 이미 리뷰를 작성했는지 확인 (중복 작성 방지)
        const { data: existingReview } = await supabaseAdmin
            .from('review')
            .select('id')
            .eq('user_id', userId)
            .eq('product_id', productId)
            .maybeSingle();

            if (existingReview) {
                return res.status(400).json({ error: "이미 리뷰를 작성한 상품입니다." });
            }

            // 리뷰 등록
            const { error: insertError } = await supabaseAdmin
                .from('review')
                .insert([{
                    product_id: productId, 
                    user_id: userId, 
                    rating: Number(rating), 
                    content,
                    order_id: orderId
                }]);

            if (insertError) throw insertError;

            res.json({ message: "리뷰가 등록되었습니다." });
    } catch (err) {
        console.error("서버 내부 오류:", err);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
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
            console.log("재고 복구 시작: ", order.items)

            if (order.items && Array.isArray(order.items)) {
                for (const item of order.items) { 
                    console.log("RPC 전달 데이터 확인:", {
                        id: item.id,
                        qty: item.quantity
                    });
                    const { error: rpcError } = await supabaseAdmin.rpc('increment_stock', {
                        product_id: item.id,
                        quantity_to_add: item.quantity
                    });

                    if (rpcError) {
                        console.error("재고 복구 실패: ", rpcError);
                    }
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



app.get('/api/banners', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('main_banners')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: true });

        if (error) throw error;
        res.json({ success: true, banners: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// --- 관리자 전용 API ---
app.post('/api/admin/coupons', async (req, res) => {
    const { name, type, value, targetUserId, category } = req.body;

    try {
        const { data: master, error: mError } = await supabaseAdmin
            .from('coupon_master')
            .insert([{ name, type, value, target_user_id: targetUserId, target_product_category: category }])
            .select().single();

        if (mError) throw mError;

        if (targetUserId) {
            await supabaseAdmin
                .from('user_coupons')
                .insert([{ user_id: targetUserId, coupon_id: master.id }]);
        }

        res.status(200).json({ message: "쿠폰 발급 완료" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/api/admin/banners', authenticateUser, async (req, res) => {
    try {
        const { image_url, title, subtitle, link_url, priority } = req.body;
        const { data, error } = await supabaseAdmin
            .from('main_banners')
            .insert([{ image_url, title, subtitle, link_url, priority }]);

            if (error) throw error;
            res.json({ success: true, message: "배너가 등록되었습니다." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


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