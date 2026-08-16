// ═══════════════════════════════════════════════════════════════════════
//  VERIFICADOR DA CONFIGURAÇÃO DA STRIPE
//  ---------------------------------------------------------------------
//  Escrito depois de encontrar, em produção, duas avarias que nenhuma
//  revisão de código apanharia porque nenhuma delas está no código:
//
//   1. Os dois webhooks estavam registados em `https://recibocerto.pt/...`
//      — o apex, que responde 307 para o `www`. A Stripe NÃO segue
//      redirecionamentos em webhooks: cada entrega batia no 307 e contava
//      como falhada.
//
//   2. `STRIPE_CONNECT_WEBHOOK_SECRET` não estava definido. Mesmo que a
//      entrega chegasse, o handler recusava-a.
//
//  Qualquer uma das duas, sozinha, parava o sistema de recebimentos
//  inteiro: `account.updated` nunca era processado, `charges_enabled`
//  nunca subia, e todos os contabilistas ficavam em «a Stripe está a
//  verificar» para sempre. O cliente pagava e a plataforma não sabia.
//
//  O sintoma não aparecia em lado nenhum. Não havia erro, não havia
//  registo, não havia teste a falhar — havia contabilistas a esperar.
//
//  ── Como correr ─────────────────────────────────────────────────────
//    STRIPE_SECRET_KEY=sk_... node scripts/check-stripe-config.mjs
//
//  Sem chave, verifica só o que consegue verificar sem falar com a Stripe
//  (as variáveis de ambiente) e diz que o resto ficou por verificar. Não
//  finge que passou.
// ═══════════════════════════════════════════════════════════════════════

/**
 * A origem canónica. Espelhada de `src/lib/origem.ts` — é o mesmo valor,
 * e há um teste que compara os dois para não divergirem em silêncio.
 */
const ORIGEM_CANONICA = "https://www.recibocerto.pt";
const ORIGEM_APEX = ORIGEM_CANONICA.replace("://www.", "://");

/** O que cada webhook TEM de escutar para o produto funcionar. */
const EVENTOS_OBRIGATORIOS = {
  "/api/stripe/connect-webhook": [
    // Sem este, `charges_enabled` nunca sobe e nenhum contabilista fica
    // apto a receber. É o evento mais importante do sistema inteiro.
    "account.updated",
    // Sem este, o cliente paga e o pagamento nunca é dado por pago.
    "checkout.session.completed",
  ],
  "/api/stripe/webhook": [
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ],
};

const VARIAVEIS = [
  ["STRIPE_SECRET_KEY", "sem isto não há Stripe nenhuma"],
  ["STRIPE_WEBHOOK_SECRET", "os eventos da plataforma (Plus, patamares) não são processados"],
  [
    "STRIPE_CONNECT_WEBHOOK_SECRET",
    "os eventos das contas ligadas não são processados: nenhum contabilista fica apto a receber",
  ],
];

const problemas = [];
const avisos = [];
const oks = [];

// ── 1. As variáveis de ambiente ────────────────────────────────────────
for (const [nome, consequencia] of VARIAVEIS) {
  if (process.env[nome]?.trim()) oks.push(`${nome} definida`);
  else problemas.push(`${nome} não está definida — ${consequencia}.`);
}

// ── 2. Os webhooks, contra a Stripe ────────────────────────────────────
const chave = process.env.STRIPE_SECRET_KEY?.trim();

if (!chave) {
  avisos.push(
    "Sem STRIPE_SECRET_KEY não se verificam os webhooks registados. " +
      "O URL e os eventos ficaram POR VERIFICAR — não confundas isso com estarem bem.",
  );
} else {
  const res = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=100", {
    headers: { Authorization: `Bearer ${chave}` },
  });

  if (!res.ok) {
    problemas.push(`A Stripe recusou a leitura dos webhooks (HTTP ${res.status}).`);
  } else {
    const { data: endpoints = [] } = await res.json();

    for (const [caminho, obrigatorios] of Object.entries(EVENTOS_OBRIGATORIOS)) {
      const ep = endpoints.find((e) => (e.url ?? "").endsWith(caminho));

      if (!ep) {
        problemas.push(`Não há webhook registado para ${caminho}.`);
        continue;
      }

      // O apex. É esta a verificação que teria poupado o problema todo.
      if (ep.url.startsWith(ORIGEM_APEX) && !ep.url.startsWith(ORIGEM_CANONICA)) {
        problemas.push(
          `${caminho} está registado no apex (${ep.url}). O apex responde 307 para ` +
            `${ORIGEM_CANONICA}, e a Stripe NÃO segue redirecionamentos: nenhuma ` +
            "entrega chega. Corrige o URL no painel da Stripe.",
        );
      } else if (!ep.url.startsWith(ORIGEM_CANONICA)) {
        avisos.push(`${caminho} aponta para ${ep.url}, que não é a origem canónica.`);
      } else {
        oks.push(`${caminho} aponta para a origem canónica`);
      }

      if (ep.status !== "enabled") {
        problemas.push(`${caminho} está com estado «${ep.status}», não «enabled».`);
      }

      const emFalta = obrigatorios.filter((e) => !(ep.enabled_events ?? []).includes(e));
      if (emFalta.length > 0) {
        problemas.push(`${caminho} não escuta: ${emFalta.join(", ")}.`);
      } else {
        oks.push(`${caminho} escuta os eventos obrigatórios`);
      }
    }
  }
}

// ── 3. O relatório ─────────────────────────────────────────────────────
for (const o of oks) console.log(`  ok   · ${o}`);
for (const a of avisos) console.warn(`  aviso· ${a}`);
for (const p of problemas) console.error(`  FALHA· ${p}`);

console.log("");
if (problemas.length > 0) {
  console.error(
    `Configuração da Stripe com ${problemas.length} problema(s). ` +
      "Enquanto estiverem por resolver, os recebimentos não funcionam — e falham em silêncio.",
  );
  process.exit(1);
}

console.log(
  avisos.length > 0
    ? "Configuração da Stripe sem falhas conhecidas, com verificações por fazer (ver avisos)."
    : "Configuração da Stripe verificada.",
);
