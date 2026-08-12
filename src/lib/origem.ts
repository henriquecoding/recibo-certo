// ═══════════════════════════════════════════════════════════════════════
//  A ORIGEM DO SITE — RC-CFG-001
//  ---------------------------------------------------------------------
//  Havia duas. `SITE_URL`, em `seo.ts`, dizia `https://www.recibocerto.pt` e
//  alimentava o canónico, o sitemap e os metadados. O `.env.example` dizia
//  `https://recibocerto.pt` e alimentava — via `NEXT_PUBLIC_APP_URL` — os URLs
//  de retorno da Stripe, da Lemon Squeezy e o `redirect_uri` do OAuth da FIZ.
//
//  Em produção o apex responde 307 para o www. Para um humano a seguir um
//  link, a diferença não existe. Para um fornecedor de OAuth, existe e é
//  fatal: o `redirect_uri` é comparado LITERALMENTE com o que está registado.
//  Com o host errado a autorização é recusada à entrada, e a mensagem de erro
//  aparece do lado deles — onde ninguém a lê.
//
//  ── Porque é que a correção é automática ────────────────────────────────
//  `appUrl()` reescreve o apex para o www em vez de se limitar a avisar. Não é
//  adivinhar: é aplicar em código a mesma regra que o servidor já aplica em
//  HTTP. O que NÃO se reescreve é tudo o resto — uma origem de
//  pré-visualização da Vercel ou um `localhost` noutra porta são legítimos e
//  passam intactos.
//
//  ── Porque é que a omissão cai em localhost ─────────────────────────────
//  Cair na origem de produção quando ninguém a definiu seria pior do que o
//  erro que estamos a corrigir: um ambiente mal configurado passaria a enviar
//  pessoas para o site a sério a meio de um checkout de teste.
// ═══════════════════════════════════════════════════════════════════════

/**
 * A origem canónica do site — a que o servidor efetivamente serve, e a única
 * que pode aparecer num canónico, num sitemap ou num `redirect_uri`.
 *
 * Declarada aqui e reexportada por `seo.ts` como `SITE_URL`, para o valor
 * existir uma vez só.
 */
export const ORIGEM_CANONICA = "https://www.recibocerto.pt";

/** A mesma origem sem o `www` — a forma que o servidor redireciona. */
const ORIGEM_APEX = ORIGEM_CANONICA.replace("://www.", "://");

/** Origem de desenvolvimento. Nunca é produção por omissão. */
const ORIGEM_LOCAL = "http://localhost:3000";

let avisado = false;

/**
 * A origem sobre a qual construir URLs absolutos — retornos de pagamento,
 * `redirect_uri` de OAuth, ligações em emails.
 *
 * Sempre sem barra final, para `${appUrl()}/rota` nunca produzir `//rota`.
 */
export function appUrl(): string {
  // Leitura literal: o Next só substitui `process.env.NEXT_PUBLIC_X` escrito
  // por extenso no build do cliente. Um acesso por índice chegaria ao browser
  // como `undefined` e mandava toda a gente para localhost.
  const bruto = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!bruto) return ORIGEM_LOCAL;

  const semBarra = bruto.replace(/\/+$/, "");

  if (semBarra === ORIGEM_APEX) {
    if (!avisado) {
      avisado = true;
      console.warn(
        `[origem] NEXT_PUBLIC_APP_URL está no apex (${ORIGEM_APEX}) mas o site é servido em ` +
          `${ORIGEM_CANONICA}. A usar a origem canónica — corrige a variável para os URLs de ` +
          "OAuth e de pagamento coincidirem com o que está registado nos fornecedores.",
      );
    }
    return ORIGEM_CANONICA;
  }

  return semBarra;
}
