import { useState } from 'react';
import axios from 'axios';
import { optimizeAndUpload } from '../utils/imageOptimizer';
import { supabase } from './supabaseClient';

function AdminBannersForm({ session }) {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        link_url: '',
        priority: 0
    });

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return alert("배너 이미지를 선택해주세요.");

        setLoading(true);
        try {
            const imageUrl = await optimizeAndUpload(file, 'banners');

            const token = session.access_token;
            await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/admin/banners`, {
                ...formData,
                image_url: imageUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("배너가 성공적으로 등록되었습니다!");

            setFile(null);
            setPreviewUrl('')
            setFormData({ title: '', subtitle: '', link_url: '', priority: 0 });
        } catch (error) {
            console.error("배너 등록 실패:", error);
            alert("등록 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div style={containerStyle}>
            <h3>메인 배너 신규 등록</h3>
            <form onSubmit={handleSubmit} style={formStyle}>
                {/* 이미지 업로드 구역 */}
                <div style={uploadBoxStyle}>
                    {previewUrl ? (
                        <img src={previewUrl} alt="미리보기" style={imagePreviewStyle} />
                    ) : (
                        <div style={emptyPreviewStyle}>이미지를 선택하세요 (권장: 1920x600)</div>
                    )}
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginTop: '10px' }} />
                </div>

                {/* 정보 입력 구역 */}
                <input
                    type="text" placeholder="메인 타이틀" value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})} style={inputStyle}
                />
                <input
                    type="text" placeholder="서브 타이틀" value={formData.subtitle}
                    onChange={(e) => setFormData({...formData, subtitle: e.target.value})} style={inputStyle}
                />
                <input
                    type="text" placeholder="클릭 시 이동할 URL (예: /product/123" value={formData.link_url}
                    onChange={(e) => setFormData({...formData, link_url: e.target.value})} style={inputStyle}
                />
                <input
                    type="number" placeholder="우선순위 (낮을수록 먼저 노출)" value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})} style={inputStyle}
                />

                <button type="submit" disabled={loading} style={submitButtonStyle}>
                    {loading ? "업로드 중..." : "배너 등록하기"}
                </button>
            </form>
        </div>
    );
}

const containerStyle = {
    maxWidth: '600px',
    margin: '20px auto',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff'
};

const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px' };

const uploadBoxStyle = {
    border: '2px dashed #ccc',
    padding: '20px',
    textAlign: 'center',
    borderRadius: '4px'
};

const imagePreviewStyle = {width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px' };

const emptyPreviewStyle = {height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', backgroundColor: '#f9f9f9' };

const inputStyle = { padding: '10px', border: '1px solid #ddd', borderRadius: '4px' };

const submitButtonStyle = {
    padding: '12px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
};

export default AdminBannersForm;