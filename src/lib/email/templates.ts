const BRAND = "#1D9E75";
const BRAND_DARK = "#0F6E56";
const INK = "#1C1917";
const MUTED = "#78716C";
const BG = "#FAFAF9";

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="7" fill="${BRAND}"/><g transform="translate(6,6) scale(0.8333)"><path d="M3 17l6-6 4 4 7-8" stroke="white" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g></svg>`;
const LOGO_BASE64 = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;

function layout(conteudo: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;border:1px solid #E7E5E4;overflow:hidden;">

<!-- Header com logo -->
<tr><td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #F5F5F4;">
  <img src="${LOGO_BASE64}" width="32" height="32" alt="" style="display:inline-block;vertical-align:middle;margin-right:10px;" />
  <span style="display:inline-block;vertical-align:middle;font-size:18px;font-weight:700;color:${INK};">Recibo<span style="color:${BRAND};">Certo</span></span>
</td></tr>

<!-- Conteúdo -->
<tr><td style="padding:32px;">
${conteudo}
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 32px;border-top:1px solid #F5F5F4;text-align:center;">
  <p style="margin:0;font-size:12px;color:#A8A29E;">ReciboCerto — Copiloto financeiro para trabalhadores independentes</p>
  <p style="margin:8px 0 0;font-size:11px;color:#D6D3D1;">recibocerto.pt</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function botao(texto: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 0;">
<tr><td style="background:${BRAND};border-radius:12px;">
  <a href="${url}" target="_blank" style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;">
    ${texto}
  </a>
</td></tr>
</table>`;
}

export function emailBoasVindasWaitlist(email: string): { subject: string; html: string } {
  return {
    subject: "Bem-vindo ao ReciboCerto — estás na lista",
    html: layout(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Estás na lista!</h2>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:${MUTED};">
        Obrigado por te inscreveres, <strong style="color:${INK};">${email}</strong>.
        Vais ser dos primeiros a experimentar o ReciboCerto Pro quando estiver pronto.
      </p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:${MUTED};">
        Enquanto isso, a calculadora, o simulador de IRS e o comparador já estão a funcionar — grátis e sem registo.
      </p>
      ${botao("Experimentar agora", "https://recibocerto.pt/dashboard")}
    `),
  };
}

export function emailAlertaPrazo(prazos: { titulo: string; descricao: string; data: string; diasAte: number }[]): { subject: string; html: string } {
  const primeiro = prazos[0];
  const subject = prazos.length === 1
    ? `${primeiro.titulo} — ${primeiro.diasAte} dias`
    : `${prazos.length} prazos fiscais nos próximos dias`;

  const listaPrazos = prazos.map((p) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #F5F5F4;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${INK};">${p.titulo}</p>
        <p style="margin:0;font-size:13px;color:${MUTED};">${p.descricao}</p>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #F5F5F4;text-align:right;white-space:nowrap;">
        <span style="display:inline-block;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;color:${p.diasAte <= 3 ? "#DC2626" : p.diasAte <= 7 ? "#D97706" : BRAND_DARK};background:${p.diasAte <= 3 ? "#FEF2F2" : p.diasAte <= 7 ? "#FFFBEB" : "#E1F5EE"};">
          ${p.diasAte === 0 ? "Hoje" : p.diasAte === 1 ? "Amanhã" : `${p.diasAte} dias`}
        </span>
      </td>
    </tr>
  `).join("");

  return {
    subject,
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${INK};">Prazos fiscais a aproximar-se</h2>
      <p style="margin:0 0 20px;font-size:14px;color:${MUTED};">Não te esqueças destas obrigações:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E7E5E4;border-radius:12px;overflow:hidden;">
        ${listaPrazos}
      </table>
      ${botao("Ver calendário completo", "https://recibocerto.pt/dashboard/prazos")}
      <p style="margin:20px 0 0;font-size:12px;color:#A8A29E;text-align:center;">
        Recebes este email porque tens o plano Pro do ReciboCerto.
      </p>
    `),
  };
}

export function emailSubscricaoAtivada(intervalo: "monthly" | "annual"): { subject: string; html: string } {
  const periodo = intervalo === "annual" ? "anual (47,99 €/ano)" : "mensal (5,99 €/mês)";

  return {
    subject: "ReciboCerto Pro ativado!",
    html: layout(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">O teu Pro está ativo!</h2>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:${MUTED};">
        A tua subscrição <strong style="color:${INK};">${periodo}</strong> foi ativada com sucesso. Agora tens acesso a:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        ${["Alertas de prazos por email", "Histórico na nuvem", "Exportação CSV e PDF", "Mealheiro fiscal automático", "Cenários do simulador guardados"].map((f) => `
        <tr>
          <td style="padding:4px 0;vertical-align:top;">
            <span style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%;background:#E1F5EE;color:${BRAND};font-size:12px;font-weight:700;">&#10003;</span>
          </td>
          <td style="padding:4px 0 4px 10px;font-size:14px;color:${MUTED};">${f}</td>
        </tr>`).join("")}
      </table>
      ${botao("Ir para o painel", "https://recibocerto.pt/dashboard")}
    `),
  };
}

export function emailSubscricaoCancelada(): { subject: string; html: string } {
  return {
    subject: "Subscrição Pro cancelada — vamos sentir a tua falta",
    html: layout(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Subscrição cancelada</h2>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:${MUTED};">
        A tua subscrição Pro foi cancelada. O acesso às funcionalidades Pro mantém-se até ao fim do período atual.
      </p>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:${MUTED};">
        A calculadora, o simulador de IRS e o comparador continuam grátis para sempre.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:${MUTED};">
        Se mudares de ideias, podes reativar a qualquer momento.
      </p>
      ${botao("Reativar o Pro", "https://recibocerto.pt/dashboard/upgrade")}
    `),
  };
}
