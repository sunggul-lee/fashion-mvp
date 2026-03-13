import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const { record } = await req.json() // Webhook에서 보낸 주문 데이터

  console.log("수신된 주문 데이터:", record);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: record.user_email,
      subject: `[주문완료] ${record.id} 주문이 접수되었습니다.`,
      html: `<h1>주문해주셔서 감사합니다!</h1><p>총 결제 금액: ${record.total_price}원</p>`,
    }),
  })

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
})