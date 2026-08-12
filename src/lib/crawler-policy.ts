/**
 * Agentes declarados de IA, prospeção de dados e scraping comercial.
 *
 * Esta lista não é uma fronteira de segurança: qualquer cliente pode falsificar
 * o User-Agent. Centralizá-la garante, porém, que robots.txt e o bloqueio HTTP
 * tomam a mesma decisão e que agentes cooperantes recebem uma recusa inequívoca.
 */
export const AGENTES_EXTRACAO_BLOQUEADOS = [
  // OpenAI
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",

  // Anthropic
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",

  // Google / Apple / Meta / Amazon
  "Google-Extended",
  "GoogleOther",
  "Google-CloudVertexBot",
  "Applebot-Extended",
  "meta-externalagent",
  "meta-externalfetcher",
  "Amazonbot",

  // Motores de resposta e fornecedores de datasets
  "PerplexityBot",
  "Perplexity-User",
  "cohere-ai",
  "CCBot",
  "Bytespider",
  "PetalBot",
  "YouBot",
  "Diffbot",
  "ImagesiftBot",
  "AI2Bot",
  "AI2Bot-Dolma",
  "Timpibot",
  "Omgilibot",
  "omgili",
  "PanguBot",
  "Kangaroo Bot",
  "DuckAssistBot",

  // Scraping comercial / inteligência competitiva
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "BLEXBot",
  "DotBot",
] as const;

export function agenteDeExtracaoBloqueado(userAgent: string): boolean {
  const normalizado = userAgent.toLocaleLowerCase("en-US");
  return AGENTES_EXTRACAO_BLOQUEADOS.some((agente) =>
    normalizado.includes(agente.toLocaleLowerCase("en-US")),
  );
}
