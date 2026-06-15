const BRAND = "#1D9E75";
const BRAND_DARK = "#0F6E56";
const INK = "#1C1917";
const MUTED = "#78716C";
const BG = "#FAFAF9";

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
  <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
    <td style="width:32px;height:32px;background:${BRAND};border-radius:7px;text-align:center;vertical-align:middle;font-size:18px;line-height:32px;color:#FFFFFF;">&#10003;</td>
    <td style="padding-left:10px;font-size:18px;font-weight:700;color:${INK};vertical-align:middle;">Recibo<span style="color:${BRAND};">Certo</span></td>
  </tr></table>
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
    subject: "Bem-vindo ao ReciboCerto",
    html: layout(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Bem-vindo ao ReciboCerto!</h2>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:${MUTED};">
        Obrigado por te registares, <strong style="color:${INK};">${email}</strong>.
        O teu copiloto financeiro para recibos verdes está pronto a usar.
      </p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:${MUTED};">
        A calculadora, o simulador de IRS e o comparador de regimes estão disponíveis — grátis e sem registo.
        Queres alertas de prazos e histórico na nuvem? O plano Pro já está disponível.
      </p>
      ${botao("Começar a usar", "https://recibocerto.pt/dashboard")}
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

export type NivelGuardiao = "aviso" | "preparacao" | "critico" | "ultrapassado";

interface GuardiaoInput {
  faturado: number;
  limite: number;
  restante: number;
  percentagem: number;
  nivel: NivelGuardiao;
}

const GUARDIAO_META: Record<NivelGuardiao, { label: string; cor: string; bgCor: string }> = {
  aviso:        { label: "Aviso (80%)",        cor: "#D97706", bgCor: "#FFFBEB" },
  preparacao:   { label: "Preparacao (90%)",   cor: "#EA580C", bgCor: "#FFF7ED" },
  critico:      { label: "Critico (95%)",      cor: "#DC2626", bgCor: "#FEF2F2" },
  ultrapassado: { label: "Limite ultrapassado", cor: "#991B1B", bgCor: "#FEF2F2" },
};

export function emailGuardiaoFiscal(input: GuardiaoInput): { subject: string; html: string } {
  const { faturado, limite, restante, percentagem, nivel } = input;
  const pct = Math.round(percentagem * 100);
  const meta = GUARDIAO_META[nivel];
  const fmtEur = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

  const mensagem = nivel === "ultrapassado"
    ? "Ultrapassaste o limite de isencao de IVA. Altera o regime no Portal das Financas para evitar coimas."
    : nivel === "critico"
    ? `Atingiste ${pct}% do limite. Prepara a alteracao de regime de IVA este mes.`
    : nivel === "preparacao"
    ? `Atingiste ${pct}% do limite. A isencao termina no mes seguinte a ultrapassagem — prepara-te.`
    : `Ja faturaste ${pct}% do limite de isencao. Monitoriza de perto.`;

  return {
    subject: nivel === "ultrapassado"
      ? "Limite de isencao de IVA ultrapassado"
      : `Guardiao Fiscal: ${pct}% do limite de IVA`,
    html: layout(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Guardiao Fiscal — ${meta.label}</h2>
      <div style="margin:0 0 20px;padding:16px;border-radius:12px;background:${meta.bgCor};border:1px solid ${meta.cor}20;">
        <p style="margin:0;font-size:14px;font-weight:600;color:${meta.cor};">${mensagem}</p>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr>
          <td style="padding:8px 0;font-size:13px;color:${MUTED};">Faturado este ano</td>
          <td style="padding:8px 0;text-align:right;font-size:14px;font-weight:600;color:${INK};">${fmtEur(faturado)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:${MUTED};border-top:1px solid #F5F5F4;">Limite de isencao</td>
          <td style="padding:8px 0;text-align:right;font-size:14px;font-weight:600;color:${INK};border-top:1px solid #F5F5F4;">${fmtEur(limite)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:${MUTED};border-top:1px solid #F5F5F4;">${nivel === "ultrapassado" ? "Excedido em" : "Faltam"}</td>
          <td style="padding:8px 0;text-align:right;font-size:14px;font-weight:700;color:${meta.cor};border-top:1px solid #F5F5F4;">${fmtEur(restante)}</td>
        </tr>
      </table>
      ${botao("Ver detalhes no painel", "https://recibocerto.pt/dashboard")}
      <p style="margin:20px 0 0;font-size:12px;color:#A8A29E;text-align:center;">
        Recebes este email porque tens alertas ativos no ReciboCerto Pro.
      </p>
    `),
  };
}

export function emailAlertaIVA(faturado: number, limite: number, nivel: "aviso" | "critico"): { subject: string; html: string } {
  const pct = Math.round((faturado / limite) * 100);
  const subject = nivel === "critico"
    ? `Alerta: atingiste ${pct}% do limite de isencao de IVA`
    : `Aviso: ja faturaste ${pct}% do limite de IVA`;

  const cor = nivel === "critico" ? "#DC2626" : "#D97706";
  const bgCor = nivel === "critico" ? "#FEF2F2" : "#FFFBEB";

  return {
    subject,
    html: layout(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Alerta de IVA — ${pct}%</h2>
      <div style="margin:0 0 20px;padding:16px;border-radius:12px;background:${bgCor};border:1px solid ${cor}20;">
        <p style="margin:0;font-size:14px;font-weight:600;color:${cor};">
          ${nivel === "critico"
            ? `Atingiste ${pct}% do limite de isencao. Prepara a alteracao de regime no Portal das Financas.`
            : `Ja faturaste ${pct}% do limite. Monitoriza de perto a tua faturacao.`}
        </p>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr>
          <td style="padding:8px 0;font-size:13px;color:${MUTED};">Faturado este ano</td>
          <td style="padding:8px 0;text-align:right;font-size:14px;font-weight:600;color:${INK};">${faturado.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:${MUTED};border-top:1px solid #F5F5F4;">Limite de isencao</td>
          <td style="padding:8px 0;text-align:right;font-size:14px;font-weight:600;color:${INK};border-top:1px solid #F5F5F4;">${limite.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</td>
        </tr>
      </table>
      ${botao("Ver detalhes no painel", "https://recibocerto.pt/dashboard")}
      <p style="margin:20px 0 0;font-size:12px;color:#A8A29E;text-align:center;">
        Recebes este email porque tens alertas ativos no ReciboCerto.
      </p>
    `),
  };
}

export function emailAlertaSS(trimestre: string, valor: number, prazo: string): { subject: string; html: string } {
  return {
    subject: `Seguranca Social: ${valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })} a reservar — ${trimestre}`,
    html: layout(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Contribuicao de Seguranca Social</h2>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${MUTED};">
        Com base nos teus recibos do <strong style="color:${INK};">${trimestre}</strong>, estimamos que deves reservar:
      </p>
      <div style="margin:0 0 20px;padding:20px;border-radius:12px;background:#F5F5F4;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:${MUTED};">Valor estimado</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:${INK};">${valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</p>
        <p style="margin:8px 0 0;font-size:12px;color:${MUTED};">Prazo: ${prazo}</p>
      </div>
      ${botao("Ver calculo detalhado", "https://recibocerto.pt/dashboard")}
      <p style="margin:20px 0 0;font-size:11px;color:#A8A29E;text-align:center;">
        Valor estimativo — confirma na Seguranca Social Direta.
      </p>
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
