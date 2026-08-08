import type { MetadataRoute } from "next";

const SITE_URL = "https://www.recibocerto.pt";

// ═══════════════════════════════════════════════════════════════════════
//  §10.1 do relatório estratégico — controlo de rastreio
//  ---------------------------------------------------------------------
//  Antes havia uma regra `*` e três bots de SEO. Isso deixa o rastreio de
//  IA por decidir — e «por decidir» não é neutro: cada motor tem regras
//  diferentes, e não declarar nada significa aceitar o que cada um decidir
//  fazer, sem sequer se saber qual foi.
//
//  A distinção que o relatório faz e que é fácil perder:
//
//   · OAI-SearchBot   descobre e inclui na PESQUISA do ChatGPT.
//   · GPTBot          recolhe para TREINO. É uma decisão separada, e
//                     bloqueá-lo NÃO exclui o site da pesquisa.
//   · ChatGPT-User    é um pedido iniciado por uma pessoa que está a usar
//                     o produto. Não é indexação; é alguém a abrir o site
//                     através do assistente.
//   · PerplexityBot   descoberta e indexação.
//   · Google-Extended controla o uso em modelos generativos, não o
//                     Googlebot nem a inclusão na Pesquisa.
//
//  A decisão tomada aqui: PERMITIR descoberta e citação em todos os
//  motores de resposta, e permitir também o treino. A estratégia do §10 é
//  ser citável, e o ativo defensável não é o texto — é o motor de cálculo,
//  o histórico e o handoff, que nenhum modelo copia ao ler uma página.
//
//  Nota do relatório que vale repetir: alterações a robots.txt demoram a
//  propagar-se (a documentação da OpenAI fala em ~24 horas). Validar por
//  logs de servidor, não por um testador de robots.
// ═══════════════════════════════════════════════════════════════════════

/** Rotas sem conteúdo indexável: privadas, técnicas ou redirecionadores. */
const PRIVADAS = ["/dashboard/", "/admin/", "/api/", "/ir/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // `/ir/` é o redirecionador de parcerias: só existe para levar alguém
        // a outro sítio e não tem conteúdo para indexar. Fica também com
        // `X-Robots-Tag: noindex, nofollow` na própria resposta, porque um
        // robots.txt é uma sugestão e um cabeçalho é uma instrução.
        disallow: PRIVADAS,
      },

      // ── Pesquisa e respostas de IA (§10.1) ───────────────────────────
      // Declarados um a um, e não deixados ao `*`, para que a decisão
      // fique escrita: quem ler este ficheiro sabe que foi decidida.
      { userAgent: "Googlebot", allow: "/", disallow: PRIVADAS },
      { userAgent: "Google-Extended", allow: "/", disallow: PRIVADAS },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: PRIVADAS },
      { userAgent: "GPTBot", allow: "/", disallow: PRIVADAS },
      { userAgent: "ChatGPT-User", allow: "/", disallow: PRIVADAS },
      { userAgent: "PerplexityBot", allow: "/", disallow: PRIVADAS },
      { userAgent: "Perplexity-User", allow: "/", disallow: PRIVADAS },
      { userAgent: "Applebot", allow: "/", disallow: PRIVADAS },
      { userAgent: "Applebot-Extended", allow: "/", disallow: PRIVADAS },
      { userAgent: "Bingbot", allow: "/", disallow: PRIVADAS },
      { userAgent: "ClaudeBot", allow: "/", disallow: PRIVADAS },
      { userAgent: "Claude-User", allow: "/", disallow: PRIVADAS },
      { userAgent: "Claude-SearchBot", allow: "/", disallow: PRIVADAS },
      { userAgent: "meta-externalagent", allow: "/", disallow: PRIVADAS },
      { userAgent: "Amazonbot", allow: "/", disallow: PRIVADAS },
      { userAgent: "cohere-ai", allow: "/", disallow: PRIVADAS },

      // ── Rastreadores comerciais de SEO ───────────────────────────────
      { userAgent: "AhrefsBot",  crawlDelay: 10 },
      { userAgent: "SemrushBot", crawlDelay: 10 },
      { userAgent: "MJ12bot",    disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
