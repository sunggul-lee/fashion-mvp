import axios from 'axios';

const BACKEND_API_URL = process.env.REACT_APP_BACKEND_API_URL;

export const toggleWishlist = async (product, user) => {
    // 로그인 상태
    if (user && user.id) {
        try {
            const res = await axios.post(`${BACKEND_API_URL}/api/wishlist/toggle`, {
                productId: product.id,
                userId: user.id
            });
            return { action: res.data.action, type: 'db' };
        } catch (err) {
            console.error("DB 찜하기 실패", err);
            throw err;
        }

    }
    // 비로그인 상태 (LocalStorage)
    else {
        const localWish = JSON.parse(localStorage.getItem('wishlist') || '[]');
        const index = localWish.findIndex(item => item.id === product.id);

        let updated;
        let action;

        if (index > -1) {
            updated = localWish.filter(item => item.id !== product.id);
            action = 'removed';
        } else {
            updated = [...localWish, product];
            action= 'added';
        }
        localStorage.setItem('wishlist', JSON.stringify(updated));
        return { action, type: 'local' };
    }
};

export const mergeWishlist = async (userId) => {
    if (!userId) return;

    const localWish = JSON.parse(localStorage.getItem('wishlist') || '[]');
    if (localWish.length === 0) return;

    try {
        const localIds = localWish.map(item => item.id);
        await axios.post(`${BACKEND_API_URL}/api/wishlist/merge`, {
            userId,
            localProductIds: localIds
        });
        localStorage.removeItem('wishlist');
        return true;
    } catch (err) {
        console.error("마이그레이션 실패", err);
        return false;
    }
};