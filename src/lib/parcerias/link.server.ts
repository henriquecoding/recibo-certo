// ═══════════════════════════════════════════════════════════════════════
//  CONSTRUÇÃO DO LINK DE AFILIADO
//  ---------------------------------------------------------------------
//  Regra única deste ficheiro: o destino NUNCA é uma URL arbitrária vinda da
//  base de dados, e nada do que é interpolado no URL vem do perfil ou de uma
//  simulação.
//
//  `urlSemDadosSensiveis()` é a última verificação, não a primeira. Ela
//  verifica os NOMES dos parâmetros da query — protege contra `?nif=…` — mas
//  não olha para os valores fora do fragmento. Um valor sensível numa chave
//  inocente (`utm_content=<qualquer coisa>`) passaria. Como somos nós que
//  construímos todos os valores, a disciplina tem de viver aqui.
// ═══════════════════════════════════════════════════════════════════════

import "server-only";
import { randomUUID } from "node:crypto";
import { urlSemDadosSensiveis } from "@/lib/fiz/contracts";
import { DESTINO_POR_INTENT } from "@/content/parcerias-destinos";
import { ParceriaError } from "./errors";
import type { ParceriaAtiva } from "./catalogo.server";
import type { FizIntent } from "@/lib/guias/manifests";

/**
 * Generalização de `destinoFizValido()`: mesmo desenho, lista vinda da
 * parceria em vez de constante do módulo, `https:` obrigatório.
 */
export function hostPermitido(url: URL, dominios: readonly string[]): boolean {
  if (url.protocol !== "https:") return false;
  if (dominios.length === 0) return false;
  return dominios.some((d) => url.host === d || url.host.endsWith(`.${d}`));
}

/** Identificador opaco por clique. Não persiste em lado nenhum do browser. */
export function gerarClickId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 24);
}

/**
 * Parâmetros que carregam o código de afiliado no link do parceiro.
 *
 * Não é uma lista de tudo o que existe no mercado — é a dos parceiros que
 * temos. A FIZ usa `ref`; os outros dois estão aqui porque são os nomes que
 * aparecem a seguir com mais frequência e custa zero antecipá-los.
 */
const PARAMS_DE_AFILIADO = ["ref", "aff", "affiliate"];

/**
 * Estamos em produção a sério?
 *
 * `NODE_ENV` não serve para esta pergunta: numa pré-visualização da Vercel
 * vale `production` na mesma, que é precisamente o ambiente onde mais se
 * clica sem intenção de comprar. Quem sabe a diferença é `VERCEL_ENV`, que
 * vale `production`, `preview` ou `development`. Fora da Vercel (local, CI)
 * a variável não existe e a resposta é não.
 */
function emProducao(): boolean {
  const vercel = process.env.VERCEL_ENV;
  if (vercel) return vercel === "production";
  return false;
}

/**
 * Fora de produção, o link vai sem código de afiliado.
 *
 * Um clique de QA numa pré-visualização é um clique real no sistema do
 * parceiro: entra na janela de atribuição de 90 dias e, se a conta for a
 * nossa, é uma auto-referência — o tipo de coisa que faz um programa de
 * afiliados ser cancelado, e que o contrato proíbe. O destino continua a ser
 * o site deles (a pré-visualização tem de ser fiel); o que não vai é o
 * código.
 */
function limparAfiliadoForaDeProducao(url: URL): void {
  if (emProducao()) return;
  for (const p of PARAMS_DE_AFILIADO) url.searchParams.delete(p);
}

/**
 * Qual dos dois destinos do parceiro usar.
 *
 * `site` é a homepage; `registo` é o formulário de inscrição. Quem chega do
 * fim de um simulador já decidiu — mandá-lo para a homepage é pedir-lhe que
 * volte a procurar o botão. Quem chega do meio de um Guia ainda está a ler.
 */
export type DestinoParceria = "site" | "registo";

export interface EntradaLink {
  parceiro: ParceriaAtiva;
  superficie: string;
  variante?: string;
  slug?: string;
  intent?: FizIntent;
  clickId: string;
  destino?: DestinoParceria;
}

export interface LinkConstruido {
  url: string;
  host: string;
  caminho: string;
}

export function construirLinkAfiliado(entrada: EntradaLink): LinkConstruido {
  // O destino de registo só é usado quando existe; sem ele, cai no site —
  // nunca se inventa um caminho de inscrição no domínio de outra pessoa.
  const base =
    entrada.destino === "registo" && entrada.parceiro.linkAfiliadoRegisto
      ? entrada.parceiro.linkAfiliadoRegisto
      : entrada.parceiro.linkAfiliado;

  if (!base) {
    throw new ParceriaError("sem_link", "Esta parceria ainda não tem uma ligação configurada.");
  }

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new ParceriaError("destino_recusado", "O link do parceiro não é um URL válido.");
  }

  if (!hostPermitido(url, entrada.parceiro.dominiosPermitidos)) {
    throw new ParceriaError(
      "destino_recusado",
      "O link do parceiro não pertence a um domínio permitido.",
    );
  }

  // Caminho de aterragem por intenção — só quando o parceiro confirmar que o
  // link o preserva. Sem confirmação, `caminhoSuportado` é false e o destino
  // é o que eles nos deram, sem tocar.
  if (entrada.destino !== "registo" && entrada.parceiro.caminhoSuportado && entrada.intent) {
    const caminho = DESTINO_POR_INTENT[entrada.intent];
    if (caminho) url.pathname = caminho;
  }

  // Sub-id: uma única string opaca, para conseguirmos perguntar ao parceiro
  // «quantos registos vieram do fim dos Guias?» sem lhes dar mais nada.
  if (entrada.parceiro.subidParam) {
    url.searchParams.set(entrada.parceiro.subidParam, entrada.clickId);
  }

  // UTM para o lado deles. Todos os valores são nossos e fechados: uma chave
  // de superfície, um slug de conteúdo. Nunca nada vindo do perfil.
  url.searchParams.set("utm_source", "recibocerto");
  url.searchParams.set("utm_medium", "afiliado");
  url.searchParams.set("utm_campaign", entrada.superficie);
  if (entrada.slug) url.searchParams.set("utm_content", entrada.slug);

  // Por último, para apanhar o código venha ele de onde vier: do piso em
  // código, da linha na base de dados, ou de um caminho de registo próprio.
  limparAfiliadoForaDeProducao(url);

  const final = url.toString();
  if (!urlSemDadosSensiveis(final)) {
    throw new ParceriaError("dados_no_url", "O link construído contém dados sensíveis.");
  }

  return { url: final, host: url.host, caminho: url.pathname };
}

/**
 * Classificação grosseira do dispositivo. Deliberadamente grosseira: o que
 * interessa é *que superfície converte*, não *quem clicou*. O user-agent é
 * lido e descartado — não é guardado em bruto.
 */
export function classificarDispositivo(
  userAgent: string | null,
): "desktop" | "mobile" | "tablet" | "desconhecido" {
  if (!userAgent) return "desconhecido";
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) return "mobile";
  return "desktop";
}
