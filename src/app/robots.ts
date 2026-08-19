import type { MetadataRoute } from "next";
import { AGENTES_EXTRACAO_BLOQUEADOS } from "@/lib/crawler-policy";
// RC-CFG-001: a origem vive em `origem.ts` e mais lado nenhum. Este ficheiro
// re-declarava `https://www.recibocerto.pt` à mão — o valor até coincidia, mas
// era a mesma duplicação que já pôs o canónico e os `redirect_uri` de OAuth em
// hosts diferentes. Mudar a origem passaria a deixar o `Host:` e o `Sitemap:`
// a apontar para um domínio que o site já não serve, sem um único erro.
import { ORIGEM_CANONICA as SITE_URL } from "@/lib/origem";

/**
 * Rotas sem conteúdo indexável: privadas, técnicas ou redirecionadores.
 *
 * ⚠️ A BARRA FINAL NÃO É DECORATIVA. `Disallow: /dashboard/` corresponde a
 * `/dashboard/recibos` mas NÃO a `/dashboard` — e essa página existe. As duas
 * raízes de painel (`/dashboard` e `/admin`) ficaram assim rastreáveis, e não
 * há como as marcar `noindex`: os seus layouts são `"use client"` e um
 * componente-cliente não exporta `metadata`. Sem barra, o prefixo cobre a raiz
 * e tudo o que está por baixo dela.
 *
 * `/contabilista` é o caso que obriga a ter as duas formas. É o painel privado
 * do contabilista, e faltava por inteiro desta lista. Não pode ser escrito sem
 * barra — `/contabilista` como prefixo apanharia também `/contabilistas`, o
 * diretório PÚBLICO, que é precisamente a página que queremos indexada. Daí o
 * par: o prefixo com barra para o que está por baixo, e a âncora `$` para a
 * raiz exata. Googlebot e Bingbot suportam `$`; um crawler que não o suporte
 * lê-o como um caminho literal que não corresponde a nada — não sobre-bloqueia.
 */
const PRIVADAS = [
  "/dashboard",
  "/admin",
  "/api/",
  "/ir/",
  "/contabilista/",
  "/contabilista$",
];

/**
 * Política deliberada:
 *  - Googlebot e Bingbot continuam a poder indexar títulos e URLs;
 *  - crawlers declarados de IA, treino, datasets e scraping comercial recebem
 *    Disallow total e são também recusados por src/proxy.ts;
 *  - a reserva TDM é repetida no header HTTP, HTML e TDMRep.
 *
 * robots.txt é uma instrução para agentes cooperantes, não autenticação.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVADAS,
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: PRIVADAS,
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: PRIVADAS,
      },
      ...AGENTES_EXTRACAO_BLOQUEADOS.map((userAgent) => ({
        userAgent,
        disallow: "/",
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
