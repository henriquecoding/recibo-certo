// ═══════════════════════════════════════════════════════════════════════
//  OS EMAILS DO PRODUTO, PREENCHIDOS COM DADOS DE EXEMPLO
//  ---------------------------------------------------------------------
//  Um só catálogo, usado por dois sítios que antes teriam cópias
//  divergentes: `scripts/render-emails.mjs` (revisão de design, sem
//  enviar nada) e `/api/admin/emails-teste` (envio real para revisão numa
//  caixa de entrada verdadeira).
//
//  Um molde novo em `templates.ts` só é revisível depois de entrar aqui —
//  e é por isso que isto vive ao lado dos moldes, e não dentro do script.
//
//  ⚠️ Dados de exemplo, nunca dados reais de ninguém. Os valores são
//  plausíveis de propósito: um email de alerta com «0,00 €» não mostra o
//  que o alerta parece quando conta.
// ═══════════════════════════════════════════════════════════════════════

import {
  emailAlertaIVA, emailAlertaSS, emailAuditoriaRecibo, emailAvisoPlataforma,
  emailBoasVindasWaitlist, emailGuardiaoFiscal, emailSubscricaoAtivada,
  emailSubscricaoCancelada,
} from "./templates";

/** Como o aviso chega à pessoa — o que `aviso_merece_email()` decide. */
export type CanalDoAviso = "email" | "sino";

export interface ExemploDeEmail {
  /** Estável: é o nome do ficheiro na revisão e a chave no relatório de envio. */
  id: string;
  rotulo: string;
  /** O facto que o dispara, em pt-PT. */
  quando: string;
  canal: CanalDoAviso;
  /** Introduzido na versão X — para a revisão marcar o que é novo. */
  novo?: boolean;
  render: () => { subject: string; html: string };
}

export const EXEMPLOS_DE_EMAIL: readonly ExemploDeEmail[] = [
  // ── Conta e subscrição ───────────────────────────────────────────────
  {
    id: "01-boas-vindas",
    rotulo: "Boas-vindas (lista de espera)",
    quando: "Alguém se inscreve com o email na landing.",
    canal: "email",
    render: () => emailBoasVindasWaitlist("exemplo@recibocerto.pt"),
  },
  {
    id: "02-plus-ativado-mensal",
    rotulo: "Plus ativado — mensal",
    quando: "Webhook do Stripe: subscrição mensal ativada.",
    canal: "email",
    render: () => emailSubscricaoAtivada("monthly"),
  },
  {
    id: "03-plus-ativado-anual",
    rotulo: "Plus ativado — anual",
    quando: "Webhook do Stripe: subscrição anual ativada.",
    canal: "email",
    render: () => emailSubscricaoAtivada("annual"),
  },
  {
    id: "04-plus-cancelado",
    rotulo: "Plus cancelado",
    quando: "Webhook do Stripe: subscrição cancelada.",
    canal: "email",
    render: () => emailSubscricaoCancelada(),
  },

  // ── Alertas fiscais ──────────────────────────────────────────────────
  {
    id: "05-guardiao-aviso",
    rotulo: "Guardião fiscal — 80%",
    quando: "A faturação do ano chega a 80% do limite de isenção de IVA.",
    canal: "email",
    render: () => emailGuardiaoFiscal({
      faturado: 12000, limite: 15000, restante: 3000, percentagem: 0.80, nivel: "aviso",
    }),
  },
  {
    id: "06-guardiao-preparacao",
    rotulo: "Guardião fiscal — 90%",
    quando: "A faturação chega a 90% do limite.",
    canal: "email",
    render: () => emailGuardiaoFiscal({
      faturado: 13500, limite: 15000, restante: 1500, percentagem: 0.90, nivel: "preparacao",
    }),
  },
  {
    id: "07-guardiao-critico",
    rotulo: "Guardião fiscal — 95%",
    quando: "A faturação chega a 95% do limite.",
    canal: "email",
    render: () => emailGuardiaoFiscal({
      faturado: 14250, limite: 15000, restante: 750, percentagem: 0.95, nivel: "critico",
    }),
  },
  {
    id: "08-guardiao-ultrapassado",
    rotulo: "Guardião fiscal — limite ultrapassado",
    quando: "A faturação passa o limite de isenção de IVA.",
    canal: "email",
    render: () => emailGuardiaoFiscal({
      faturado: 16200, limite: 15000, restante: 0, percentagem: 1.08, nivel: "ultrapassado",
    }),
  },
  {
    id: "09-iva-aviso",
    rotulo: "Alerta de IVA — aviso",
    quando: "Aproximação ao limite de isenção, pelo alerta de IVA.",
    canal: "email",
    render: () => emailAlertaIVA(12000, 15000, "aviso"),
  },
  {
    id: "10-iva-critico",
    rotulo: "Alerta de IVA — crítico",
    quando: "Limite de isenção quase esgotado.",
    canal: "email",
    render: () => emailAlertaIVA(14400, 15000, "critico"),
  },
  {
    id: "11-seguranca-social",
    rotulo: "Alerta de Segurança Social",
    quando: "Aproxima-se o prazo da contribuição trimestral.",
    canal: "email",
    render: () => emailAlertaSS("3.º trimestre de 2026", 431.55, "20 de outubro de 2026"),
  },
  {
    id: "12-auditoria-ok",
    rotulo: "Auditoria ao recibo — tudo certo",
    quando: "A auditoria ao recibo de vencimento não encontra divergências.",
    canal: "email",
    render: () => emailAuditoriaRecibo({
      salarioBruto: 1800, ssEsperado: 198, irsEsperado: 214.2,
      ssDeclarado: 198, irsDeclarado: 214.2, tudoOk: true, alertas: [],
    }),
  },
  {
    id: "13-auditoria-divergencias",
    rotulo: "Auditoria ao recibo — com divergências",
    quando: "A auditoria encontra valores fora das tabelas de 2026.",
    canal: "email",
    render: () => emailAuditoriaRecibo({
      salarioBruto: 1800, ssEsperado: 198, irsEsperado: 214.2,
      ssDeclarado: 180, irsDeclarado: 250, tudoOk: false,
      alertas: [
        "A Segurança Social descontada (180,00 €) é inferior à esperada (198,00 €).",
        "O IRS retido (250,00 €) é superior ao esperado (214,20 €) — confirma a tabela de retenção aplicada.",
      ],
    }),
  },

  // ── Plataforma de contabilistas ──────────────────────────────────────
  //  Um molde só (`emailAvisoPlataforma`). O `canal` de cada um é o que
  //  `aviso_merece_email()` responde na base de dados — não uma opinião.
  {
    id: "14-vinculo-pedido",
    rotulo: "Pedido de vínculo",
    quando: "Um cliente pede acompanhamento a um contabilista.",
    canal: "email",
    render: () => emailAvisoPlataforma(
      "Um cliente quer ser teu cliente",
      "Vê o pedido e decide se aceitas.",
      "https://www.recibocerto.pt/contabilista/clientes"),
  },
  {
    id: "15-vinculo-aceite",
    rotulo: "Vínculo aceite",
    quando: "O contabilista aceita o pedido.",
    canal: "email",
    render: () => emailAvisoPlataforma(
      "O teu pedido foi aceite",
      "Já podes marcar consultas e falar diretamente.",
      "https://www.recibocerto.pt/dashboard/contabilista"),
  },
  {
    id: "16-caso-novo",
    rotulo: "Caso novo",
    quando: "Um caso é encaminhado para o contabilista escolhido.",
    canal: "email",
    render: () => emailAvisoPlataforma(
      "Um caso novo para ti",
      "Alguém te escolheu. Vê o pedido e responde.",
      "https://www.recibocerto.pt/contabilista/casos"),
  },
  {
    id: "17-consulta-pedida",
    rotulo: "Consulta pedida",
    quando: "O cliente marca uma consulta.",
    canal: "email",
    render: () => emailAvisoPlataforma(
      "Tens uma consulta por confirmar",
      "Um cliente marcou para 2 de setembro às 15:00.",
      "https://www.recibocerto.pt/contabilista/agenda"),
  },
  {
    id: "18-consulta-confirmada",
    rotulo: "Consulta confirmada",
    quando: "O contabilista confirma a consulta.",
    canal: "email",
    render: () => emailAvisoPlataforma(
      "A tua consulta está confirmada",
      "2 de setembro às 15:00, online.",
      "https://www.recibocerto.pt/dashboard/contabilista"),
  },
  {
    id: "19-consulta-cancelada",
    rotulo: "Consulta cancelada",
    quando: "Qualquer uma das partes cancela.",
    canal: "email",
    render: () => emailAvisoPlataforma(
      "A consulta foi cancelada",
      "A consulta de 2 de setembro às 15:00 já não se realiza.",
      "https://www.recibocerto.pt/dashboard/contabilista"),
  },
  {
    id: "20-cupao-ganho",
    rotulo: "Benefício ganho",
    quando: "O cartão de fidelidade completa-se.",
    canal: "email",
    render: () => emailAvisoPlataforma(
      "Completaste o cartão",
      "Tens um desconto de 20% para usar na próxima consulta.",
      "https://www.recibocerto.pt/dashboard/contabilista"),
  },
  {
    id: "21-candidatura-decidida",
    rotulo: "Candidatura decidida",
    quando: "A administração aprova (ou recusa) uma candidatura de contabilista.",
    canal: "email",
    render: () => emailAvisoPlataforma(
      "Há novidades sobre a tua candidatura",
      "O teu perfil está aprovado. Já podes receber clientes.",
      "https://www.recibocerto.pt/contabilista"),
  },
  {
    id: "22-proposta-pronta",
    rotulo: "Proposta à espera",
    quando: "Um contabilista envia proposta a um caso.",
    canal: "email",
    novo: true,
    render: () => emailAvisoPlataforma(
      "Tens uma proposta à espera",
      undefined,
      "https://www.recibocerto.pt/dashboard/casos"),
  },
  {
    id: "23-caso-por-responder",
    rotulo: "Caso por responder",
    quando: "Três dias depois de um caso ser encaminhado sem resposta.",
    canal: "email",
    novo: true,
    render: () => emailAvisoPlataforma(
      "Tens um caso por responder",
      "O caso RC-2026-0041 está à tua espera há alguns dias.",
      "https://www.recibocerto.pt/contabilista/casos"),
  },
  {
    id: "24-sem-resposta",
    rotulo: "Ninguém respondeu",
    quando: "Sete dias depois, avisa-se o cliente para poder escolher outra pessoa.",
    canal: "email",
    novo: true,
    render: () => emailAvisoPlataforma(
      "Ainda não tens resposta",
      "Ninguém respondeu ao caso RC-2026-0041. Podes escolher outro contabilista.",
      "https://www.recibocerto.pt/dashboard/casos"),
  },
];

/** Um exemplo pelo seu id, para enviar só esse. */
export function exemploPorId(id: string): ExemploDeEmail | undefined {
  return EXEMPLOS_DE_EMAIL.find((e) => e.id === id);
}
