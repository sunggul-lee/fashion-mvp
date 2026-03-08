import { useEffect, useState } from 'react';
import axios from 'axios';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

function MainBanner() {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const res = axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/banners/`);
                if ((await res).data.success) {
                    setBanners((await res).data.banners);
                }
            } catch (error) {
                console.error("배너 로드 실패:", error);
            } finally {
                setLoading(false);
            }
            fetchBanners();
        }
    }, []);

    if (loading) return <div style={{ height: '500px', background: '#f0f0f0' }} />;
    if (banners.length === 0) return null;

    return (
        <div className="main-banner-container" style={containerStyle}>
            <Swiper
                modules={[Navigation, Pagination, Autoplay, EffectFade]}
                spaceBetween={0}
                slidesPerView={1}
                navigation
                pagination={{ clickable: true }}
                autoplay={{ delay: 5000, disableOnInteraction: false }}
                loop={banners.length > 1}
                effect="fade"
                style={{ height: '100%' }}
            >
                {banners.map((banner) => (
                    <SwiperSlide key={banner.id}>
                        <div
                            style={{
                                ...slideItemStyle,
                                backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.3)), url('${banner.image_url}')`                            
                            }}

                            onClick={() => banner.link_url && (window.location.href = banner.link_url)}
                        >
                            <div style={contentBoxStyle}>
                                <h2 style={titleStyle}>{banner.title}</h2>
                                <p style={subtitleStyle}>{banner.subtitle}</p>
                                {banner.link_url && (
                                    <button style={moreButtonStyle}>자세히 보기</button>
                                )}
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    )
}


const containerStyle = {
    width: '100%',
    height: '600px',
    position: 'relative',
    overflow: 'hidden'
};

const slideItemStyle = {
    width: '100%',
    height: '100%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: '#fff',
    textAlign: 'center'
};

const contentBoxStyle = {
    maxWidth: '800px',
    padding: '0 20px',
    animation: 'fadeInUp 1s ease-out'
};

const titleStyle = {
    fontSize: '3rem',
    marginBottom: '15px',
    fontWeight: 'bold',
    textShado: '0 2px 4px rgba(0,0,0,0.5)'
};

const subtitleStyle = {
    fontSize: '1.5rem',
    marginBottom: '30px',
    opacity: 0.9,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
};

const moreButtonStyle = {
    padding: '12px 30px',
    background: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: '30px',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
};


export default MainBanner;