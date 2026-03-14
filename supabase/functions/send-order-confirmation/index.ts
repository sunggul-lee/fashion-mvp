import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {

  try {
    const payload = await req.json();

    const debugInfo = JSON.stringify(payload, null, 2);
    console.log("Full Payload:", debugInfo);

    const record = payload.record || payload;
    const orderId = record?.id || record?.order_id || "ID 없음";

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: record?.user_email || 'gamblee1987@gmail.com',
        subject: `[디버깅] 주문 데이터 확인`,
        html: `
          <h1>데이터 수신 분석</h1>
          <p><strong>추출된 ID:</strong> ${orderId}</p>
          <hr />
          <p><strong>수신된 전체 JSON 데이터:</strong></p>
          <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${debugInfo}</pre>
        `,
        // subject: `[주문완료] ${record.id} 주문이 접수되었습니다.`,
        // html: `<h1>주문해주셔서 감사합니다!</h1><p>총 결제 금액: ${record.total_price}원</p>`,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  } 
})