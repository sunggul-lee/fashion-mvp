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