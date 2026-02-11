// 1. 장바구니 불러오기
export const fetchCart = async (userId, supabase) => {
        const { data, error } = await supabase
            .from('cart')
            .select(`
                quantity,
                products ( id, name, price, image_url)
                `)
            .eq('user_id', userId);

        return data;
};

// 2. 장바구니 담기
export const addToCart = async (userId, productId, quantity, supabase) => {
        // if (!session) return alert("로그인이 필요합니다!");

        const { data: existingItem } = await supabase
            .from('cart')
            .select('*')
            .eq('user_id', userId)
            .eq('product_id', productId)
            .single();
        
        if (existingItem) {
            await supabase
                .from('cart')
                .update({ quantity: existingItem.quantity + quantity })
                .eq('id', existingItem.id);
        } else {
            await supabase
                .from('cart')
                .insert([{ user_id: userId, product_id: productId, quantity }]);               
    }
};

// 3. 비로그인 장바구니 병합
export const mergeCart = async (userId, supabase) => {
        const localCart = JSON.parse(localStorage.getItem('cart')) || [];
        if (localCart.length === 0 ) return;

        for (const item of localCart) {
            const { data: existingItem } = await supabase
                .from('cart')
                .select('*')
                .eq('user_id', userId)
                .eq('product_id', item.id)
                .single();
            
            if (existingItem) {
                await supabase
                    .from('cart')
                    .update({ quantity: existingItem.quantity + item.quantity })
                    .eq('id', existingItem.id);
            }   else {
                await supabase
                    .from('cart')
                    .insert([{ user_id: userId, product_id: item.id, quantity: item.quantity }]);
        }
    }

    localStorage.removeItem('cart');
};