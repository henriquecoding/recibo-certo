// Envio de SMS transacionais via Twilio
// Usado pelo sistema de alertas para notificações críticas (IVA 95%, SS vence em 7 dias)

export async function enviarSMS(to: string, body: string): Promise<{ erro?: string }> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return { erro: "Twilio não configurado." };

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    },
  );
  return res.ok ? {} : { erro: "Falha no envio de SMS." };
}
