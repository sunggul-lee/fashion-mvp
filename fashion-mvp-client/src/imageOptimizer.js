import imageCompression from 'browser-image-compression';
import { supabase } from './supabaseClient';

export const optimizeAndUpload = async (file, bucket = 'products') => {
    const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        fileType: 'image/webp' // Webp 포맷 강제
    };

    try {
        // 이미지 압축 및 Webp 변환
        const compressedBlob = await imageCompression(file, options);

        // 파일명 생성 (타임스탬프 + 랜덤값)
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
        const filePath = bucket === 'banners' ? `main/${fileName}` : `items/${fileName}`;

        // Supabase Storage 업로드
        const { data, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, compressedBlob);

        if (uploadError) throw uploadError;

        // 공개 URL 생성
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error("이미지 최적화/업로드 실패:", error);
        throw error;
    }
}