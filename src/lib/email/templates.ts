import { precoPlusFormatado } from "@/lib/entitlements";
import { ORIGEM_CANONICA } from "@/lib/origem";
import { EMAIL_APOIO } from "@/lib/contacto";

// ═══════════════════════════════════════════════════════════════════════
//  OS MOLDES DE EMAIL DO PRODUTO
//  ---------------------------------------------------------------------
//  ⚠️ A COR AQUI É A COR DA MARCA. Foi `#1D9E75` durante meses depois de
//  o site já ter passado para `#177E5E` — os emails ficaram para trás na
//  migração de agosto de 2026 e ninguém deu por isso, porque ninguém
//  compara um email com o site lado a lado. O verde antigo dava 3,39:1
//  contra branco: falhava AA nos botões e nos destaques.
//
//  Se a marca mudar outra vez, muda aqui E em `tailwind.config.ts`.
// ═══════════════════════════════════════════════════════════════════════

const BRAND = "#177E5E";
const BRAND_DARK = "#0F6E56";
const BRAND_MINT = "#9FE1CB";
export const INK = "#1C1917";
export const MUTED = "#78716C";
const BG = "#FAFAF9";

/** Os links dos emails apontam SEMPRE para produção — nunca para a
 *  origem de onde o servidor por acaso os enviou. Um alerta enviado a
 *  partir de uma pré-visualização com links para essa pré-visualização
 *  seria um email que deixa de funcionar quando o deploy expira. */
const SITE = ORIGEM_CANONICA;

/** Escapa texto interpolado em HTML de email (evita injeção de markup). */
function esc(s: string): string {
  return (s || "").replace(
    /[&<>"]/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] || ch)
  );
}

/** Onde a pessoa vai gerir ou desligar os avisos. */
export const URL_GERIR_AVISOS = `${SITE}/dashboard/conta`;

// ── Modo escuro ────────────────────────────────────────────────────────
//  Um email de fundo branco fixo, aberto num cliente em modo escuro, é um
//  retângulo a arder no meio do escuro. O site tem modo escuro cuidado; os
//  emails não tinham nenhum.
//
//  As regras têm de levar `!important` porque os estilos em linha — que
//  são obrigatórios em email — ganham a qualquer folha de estilos. E as
//  classes existem só para isto: são o único gancho que uma media query
//  tem num documento todo estilizado em linha.
const ESTILO_ESCURO = `
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media (prefers-color-scheme: dark) {
      .rc-fundo  { background: #141413 !important; }
      .rc-cartao { background: #1D1D1A !important; border-color: #33322D !important; }
      .rc-titulo, .rc-forte { color: #EDEAE0 !important; }
      .rc-texto  { color: #B5AE9F !important; }
      .rc-rodape { color: #8B8577 !important; }
      .rc-linha  { border-color: #33322D !important; }
      .rc-marca  { color: ${BRAND_MINT} !important; }
      .rc-caixa  { background: #232320 !important; }
    }`;

/** O molde de todos os emails da marca.
 *
 *  Exportado porque os moldes de autenticação da Supabase — que vivem no
 *  painel dela, não aqui — são gerados a partir DESTE layout (ver
 *  `auth-supabase.ts`). Escritos à mão lá, ficariam dois desenhos de
 *  email em circulação, e o da Supabase seria o PRIMEIRO que uma pessoa
 *  recebe da marca. */
export function layout(conteudo: string, rodapeExtra = ""): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>${ESTILO_ESCURO}</style>
</head>
<body class="rc-fundo" style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="rc-fundo" style="background:${BG};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="rc-cartao" style="max-width:520px;background:#FFFFFF;border-radius:16px;border:1px solid #E7E5E4;overflow:hidden;">

<!-- Cabeçalho: a marca a sério.
     A marca é uma imagem (PNG, porque metade dos clientes de email
     bloqueia SVG) e o nome é TEXTO — assim segue o modo escuro sozinho,
     e continua a ler-se quando as imagens vêm bloqueadas, que é o estado
     em que muita gente lê o primeiro email de um remetente novo. -->
<tr><td class="rc-linha" style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #F5F5F4;">
  <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
    <td style="vertical-align:middle;">
      <img src="${SITE}/marca/icone-256.png" width="32" height="32" alt=""
           style="display:block;width:32px;height:32px;border:0;">
    </td>
    <td class="rc-titulo" style="padding-left:10px;font-size:18px;font-weight:700;color:${INK};vertical-align:middle;">Recibo <span class="rc-marca" style="color:${BRAND};">Certo</span></td>
  </tr></table>
</td></tr>

<!-- Conteúdo -->
<tr><td style="padding:32px;">
${conteudo}
</td></tr>

<!-- Rodapé -->
<tr><td class="rc-linha" style="padding:24px 32px;border-top:1px solid #F5F5F4;text-align:center;">
  <p class="rc-rodape" style="margin:0;font-size:12px;color:#A8A29E;">Recibo Certo — Copiloto financeiro para trabalhadores independentes</p>
  <p class="rc-rodape" style="margin:8px 0 0;font-size:11px;color:#D6D3D1;">
    <a href="${SITE}" style="color:#A8A29E;text-decoration:none;">recibocerto.pt</a>
    &nbsp;·&nbsp;
    <a href="mailto:${EMAIL_APOIO}" style="color:#A8A29E;text-decoration:none;">${EMAIL_APOIO}</a>
  </p>${rodapeExtra}
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/** O rodapé dos avisos que se subscrevem: diz porque chegou E como parar.
 *
 *  A versão anterior dizia só a primeira metade — «recebes este email
 *  porque tens alertas ativos» — e deixava a pessoa a adivinhar onde os
 *  desligava. Uma explicação sem saída é um beco. */
function rodapeAvisos(motivo: string): string {
  return `
  <p class="rc-rodape" style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#A8A29E;">
    ${motivo} <a href="${URL_GERIR_AVISOS}" class="rc-rodape" style="color:#A8A29E;">Gerir ou desligar os avisos</a>.
  </p>`;
}

export function botao(texto: string, url: string): string {
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
    subject: "Bem-vindo ao Recibo Certo",
    html: layout(`
      <h2 class="rc-titulo" style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Bem-vindo ao Recibo Certo!</h2>
      <p class="rc-texto" style="margin:0 0 12px;font-size:14px;line-height:1.7;color:${MUTED};">
        Obrigado por te registares, <strong class="rc-forte" style="color:${INK};">${esc(email)}</strong>.
        O teu copiloto financeiro para recibos verdes está pronto a usar.
      </p>
      <p class="rc-texto" style="margin:0 0 8px;font-size:14px;line-height:1.7;color:${MUTED};">
        A calculadora, o simulador de IRS e o comparador de regimes estão disponíveis — grátis e sem registo.
        Queres o teu histórico na nuvem e cenários guardados? O plano Plus já está disponível.
      </p>
      ${botao("Começar a usar", `${SITE}/dashboard`)}
    `),
  };
}
export function emailSubscricaoAtivada(intervalo: "monthly" | "annual"): { subject: string; html: string } {
  // O preço vem de `PLUS`. Escrito à mão, este email já anunciou 5,99 €
  // enquanto a página de planos dizia 1,99 €.
  const periodo =
    intervalo === "annual" ? "anual" : `mensal (${precoPlusFormatado()}/mês)`;

  return {
    subject: "Recibo Certo Plus ativado!",
    html: layout(`
      <h2 class="rc-titulo" style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">O teu Plus está ativo!</h2>
      <p class="rc-texto" style="margin:0 0 12px;font-size:14px;line-height:1.7;color:${MUTED};">
        A tua subscrição <strong class="rc-forte" style="color:${INK};">${periodo}</strong> foi ativada com sucesso. Agora tens acesso a:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        ${["Histórico na nuvem", "Exportação CSV e PDF", "Mealheiro fiscal automático", "Cenários do simulador guardados", "Auditoria do recibo de vencimento"].map((f) => `
        <tr>
          <td style="padding:4px 0;vertical-align:top;">
            <span style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%;background:#E1F5EE;color:${BRAND};font-size:12px;font-weight:700;">&#10003;</span>
          </td>
          <td class="rc-texto" style="padding:4px 0 4px 10px;font-size:14px;color:${MUTED};">${f}</td>
        </tr>`).join("")}
      </table>
      ${botao("Ir para o painel", `${SITE}/dashboard`)}
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
  preparacao:   { label: "Preparação (90%)",   cor: "#EA580C", bgCor: "#FFF7ED" },
  critico:      { label: "Crítico (95%)",      cor: "#DC2626", bgCor: "#FEF2F2" },
  ultrapassado: { label: "Limite ultrapassado", cor: "#991B1B", bgCor: "#FEF2F2" },
};

export function emailGuardiaoFiscal(input: GuardiaoInput): { subject: string; html: string } {
  const { faturado, limite, restante, percentagem, nivel } = input;
  const pct = Math.round(percentagem * 100);
  const meta = GUARDIAO_META[nivel];
  const fmtEur = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

  const mensagem = nivel === "ultrapassado"
    ? "Ultrapassaste o limite de isenção de IVA. Altera o regime no Portal das Finanças para evitar coimas."
    : nivel === "critico"
    ? `Atingiste ${pct}% do limite. Prepara a alteração de regime de IVA este mês.`
    : nivel === "preparacao"
    ? `Atingiste ${pct}% do limite. A isenção termina no mês seguinte a ultrapassagem — prepara-te.`
    : `Ja faturaste ${pct}% do limite de isenção. Monitoriza de perto.`;

  return {
    subject: nivel === "ultrapassado"
      ? "Limite de isenção de IVA ultrapassado"
      : `Guardião Fiscal: ${pct}% do limite de IVA`,
    html: layout(`
      <h2 class="rc-titulo" style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Guardião Fiscal — ${meta.label}</h2>
      <div style="margin:0 0 20px;padding:16px;border-radius:12px;background:${meta.bgCor};border:1px solid ${meta.cor}20;">
        <p style="margin:0;font-size:14px;font-weight:600;color:${meta.cor};">${mensagem}</p>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr>
          <td class="rc-texto" style="padding:8px 0;font-size:13px;color:${MUTED};">Faturado este ano</td>
          <td class="rc-forte" style="padding:8px 0;text-align:right;font-size:14px;font-weight:600;color:${INK};">${fmtEur(faturado)}</td>
        </tr>
        <tr>
          <td class="rc-texto rc-linha" style="padding:8px 0;font-size:13px;color:${MUTED};border-top:1px solid #F5F5F4;">Limite de isenção</td>
          <td class="rc-forte rc-linha" style="padding:8px 0;text-align:right;font-size:14px;font-weight:600;color:${INK};border-top:1px solid #F5F5F4;">${fmtEur(limite)}</td>
        </tr>
        <tr>
          <td class="rc-texto rc-linha" style="padding:8px 0;font-size:13px;color:${MUTED};border-top:1px solid #F5F5F4;">${nivel === "ultrapassado" ? "Excedido em" : "Faltam"}</td>
          <td class="rc-linha" style="padding:8px 0;text-align:right;font-size:14px;font-weight:700;color:${meta.cor};border-top:1px solid #F5F5F4;">${fmtEur(restante)}</td>
        </tr>
      </table>
      ${botao("Ver detalhes no painel", `${SITE}/dashboard`)}
    `, rodapeAvisos("Recebes isto porque tens alertas ativos no Recibo Certo Plus.")),
  };
}

export function emailAlertaIVA(faturado: number, limite: number, nivel: "aviso" | "critico"): { subject: string; html: string } {
  const pct = Math.round((faturado / limite) * 100);
  const subject = nivel === "critico"
    ? `Alerta: atingiste ${pct}% do limite de isenção de IVA`
    : `Aviso: ja faturaste ${pct}% do limite de IVA`;

  const cor = nivel === "critico" ? "#DC2626" : "#D97706";
  const bgCor = nivel === "critico" ? "#FEF2F2" : "#FFFBEB";

  return {
    subject,
    html: layout(`
      <h2 class="rc-titulo" style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Alerta de IVA — ${pct}%</h2>
      <div style="margin:0 0 20px;padding:16px;border-radius:12px;background:${bgCor};border:1px solid ${cor}20;">
        <p style="margin:0;font-size:14px;font-weight:600;color:${cor};">
          ${nivel === "critico"
            ? `Atingiste ${pct}% do limite de isenção. Prepara a alteração de regime no Portal das Finanças.`
            : `Ja faturaste ${pct}% do limite. Monitoriza de perto a tua faturação.`}
        </p>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr>
          <td class="rc-texto" style="padding:8px 0;font-size:13px;color:${MUTED};">Faturado este ano</td>
          <td class="rc-forte" style="padding:8px 0;text-align:right;font-size:14px;font-weight:600;color:${INK};">${faturado.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</td>
        </tr>
        <tr>
          <td class="rc-texto rc-linha" style="padding:8px 0;font-size:13px;color:${MUTED};border-top:1px solid #F5F5F4;">Limite de isenção</td>
          <td class="rc-forte rc-linha" style="padding:8px 0;text-align:right;font-size:14px;font-weight:600;color:${INK};border-top:1px solid #F5F5F4;">${limite.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</td>
        </tr>
      </table>
      ${botao("Ver detalhes no painel", `${SITE}/dashboard`)}
    `, rodapeAvisos("Recebes isto porque tens alertas ativos no Recibo Certo.")),
  };
}

export function emailAlertaSS(trimestre: string, valor: number, prazo: string): { subject: string; html: string } {
  return {
    subject: `Segurança Social: ${valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })} a reservar — ${trimestre}`,
    html: layout(`
      <h2 class="rc-titulo" style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Contribuição de Segurança Social</h2>
      <p class="rc-texto" style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${MUTED};">
        Com base nos teus recibos do <strong class="rc-forte" style="color:${INK};">${trimestre}</strong>, estimamos que deves reservar:
      </p>
      <div class="rc-linha" style="margin:0 0 20px;padding:20px;border-radius:12px;background:#F5F5F4;text-align:center;">
        <p class="rc-texto" style="margin:0 0 4px;font-size:12px;color:${MUTED};">Valor estimado</p>
        <p class="rc-forte" style="margin:0;font-size:28px;font-weight:700;color:${INK};">${valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</p>
        <p class="rc-texto" style="margin:8px 0 0;font-size:12px;color:${MUTED};">Prazo: ${prazo}</p>
      </div>
      ${botao("Ver cálculo detalhado", `${SITE}/dashboard`)}
      <p class="rc-rodape" style="margin:20px 0 0;font-size:11px;color:#A8A29E;text-align:center;">
        Valor estimativo — confirma na Segurança Social Direta.
      </p>
    `, rodapeAvisos("Recebes isto porque tens alertas de prazos ativos no Recibo Certo.")),
  };
}

export function emailSubscricaoCancelada(): { subject: string; html: string } {
  return {
    subject: "Subscrição Plus cancelada — vamos sentir a tua falta",
    html: layout(`
      <h2 class="rc-titulo" style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Subscrição cancelada</h2>
      <p class="rc-texto" style="margin:0 0 12px;font-size:14px;line-height:1.7;color:${MUTED};">
        A tua subscrição Plus foi cancelada. O acesso às funcionalidades Plus mantém-se até ao fim do período atual.
      </p>
      <p class="rc-texto" style="margin:0 0 12px;font-size:14px;line-height:1.7;color:${MUTED};">
        A calculadora, o simulador de IRS e o comparador continuam grátis para sempre.
      </p>
      <p class="rc-texto" style="margin:0;font-size:14px;line-height:1.7;color:${MUTED};">
        Se mudares de ideias, podes reativar a qualquer momento.
      </p>
      ${botao("Reativar o Plus", `${SITE}/dashboard/upgrade`)}
    `),
  };
}

interface AuditoriaEmailInput {
  salarioBruto: number;
  ssEsperado: number;
  irsEsperado: number;
  ssDeclarado: number;
  irsDeclarado: number;
  tudoOk: boolean;
  alertas: string[];
}

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

export function emailAuditoriaRecibo(input: AuditoriaEmailInput): { subject: string; html: string } {
  const linha = (l: string, v: string) =>
    `<tr><td class="rc-texto" style="padding:8px 0;font-size:13px;color:${MUTED};">${l}</td><td class="rc-forte" style="padding:8px 0;font-size:13px;font-weight:600;color:${INK};text-align:right;">${v}</td></tr>`;
  const alertasHtml = input.alertas.length
    ? `<div style="margin:16px 0;padding:14px 16px;background:#FEFBD0;border:1px solid #F3E59B;border-radius:10px;">${input.alertas
        .map((a) => `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#7A5C00;">• ${a}</p>`)
        .join("")}</div>`
    : `<p style="margin:16px 0;font-size:14px;color:${BRAND_DARK};font-weight:600;">Tudo certo — os valores correspondem às tabelas de 2026.</p>`;

  return {
    subject: input.tudoOk
      ? "Auditoria do teu recibo — está tudo certo"
      : "Auditoria do teu recibo — encontrámos divergências",
    html: layout(`
      <h2 class="rc-titulo" style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Auditoria do recibo de vencimento</h2>
      <p class="rc-texto" style="margin:0 0 12px;font-size:14px;line-height:1.7;color:${MUTED};">
        Resultado da auditoria ao recibo de salário bruto ${eur(input.salarioBruto)}, face às tabelas de 2026.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F5F5F4;">
        ${linha("Segurança Social esperada", eur(input.ssEsperado))}
        ${linha("Segurança Social no recibo", eur(input.ssDeclarado))}
        ${linha("IRS esperado", eur(input.irsEsperado))}
        ${linha("IRS no recibo", eur(input.irsDeclarado))}
      </table>
      ${alertasHtml}
      <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#A8A29E;">
        Estimativa pela Tabela I (Continente). Pequenas diferenças podem dever-se a arredondamentos.
      </p>
    `),
  };
}


/**
 * Aviso da plataforma de contabilistas.
 *
 * Um molde só para todos: o texto vem do catálogo fechado de `avisar.ts`, e
 * o email é o eco do que já está no sino. Fazer um template por tipo daria
 * nove ficheiros a dizer a mesma coisa com palavras diferentes — e nove
 * sítios para a marca deixar de ser coerente.
 */
export function emailAvisoPlataforma(
  titulo: string,
  corpo: string | undefined,
  url: string
): { subject: string; html: string } {
  return {
    subject: titulo,
    html: layout(`
      <h1 class="rc-titulo" style="margin:0 0 12px;font-size:21px;font-weight:700;color:${INK};">${esc(titulo)}</h1>
      ${corpo ? `<p class="rc-texto" style="margin:0;font-size:15px;line-height:1.65;color:${MUTED};">${esc(corpo)}</p>` : ""}
      ${botao("Abrir no Recibo Certo", url)}
    `, rodapeAvisos("Recebeste isto porque tens uma conta ligada a um contabilista no Recibo Certo.")),
  };
}
