import { useSearchParams, useNavigate } from 'react-router-dom';


function Fail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const errorCode = searchParams.get('code');
    const errorMessage = searchParams.get('message')

    return(
        <div style={{
            padding: '50px 20px',
            textAlign: 'center',
            maxWidth: '500px',
            margin: '0 auto'
        }}>
            <div style={{ fontSize: '50px', marginBottom: '20px' }}>⚠️</div>
            <h2 style={{ color: '#ff4d4f' }}>결제에 실패했습니다</h2>

            <div style={{
                background: '#f5f5f5',
                padding: '20px',
                borderRadius: '8px',
                margin: '20px 0',
                textAlign: 'left'
            }}>
                <p><strong>에러 코드:</strong> {errorCode}</p>
                <p><strong>사유:</strong> {errorMessage || "알 수 없는 오류가 발생했습니다."}</p>
        </div>

        <p style={{ color: '#666', marginBottom: '30px' }}>
            한도 초과, 카드 정보 오류 등 사유를 확인하신 후 다시 시도해주세요.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
                onClick={() => navigate('/order')}
                style={{
                    padding: '12px 24px',
                    background: '#000',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            > 다시 결제하기 </button>
            <button
                onClick={() => navigate('/')}
                style={{
                    padding: '12px 24px',
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            > 홈으로 이동 </button>
        </div>
    </div>
    );
}

export default Fail;