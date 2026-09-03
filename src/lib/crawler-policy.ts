/**
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ DUAS PERGUNTAS DIFERENTES, DUAS LISTAS                                 │
 * │                                                                       │
 * │ «Podes treinar um modelo com isto?» e «Podes ler isto para responder  │
 * │ a uma pessoa que está a perguntar agora?» não são a mesma pergunta, e │
 * │ durante um tempo tiveram aqui a mesma resposta.                        │
 * │                                                                       │
 * │ O custo dessa simplificação era invisível e total: a `ESTRATEGIA.md`  │
 * │ §6 desenha um programa inteiro para o Recibo Certo ser CITADO por     │
 * │ motores de resposta, o `autoridade.ts` §10.4 mede mensalmente a taxa  │
 * │ de citação em ChatGPT Search, Google AI e Perplexity, e o `/llms.txt` │
 * │ existe para lhes explicar como citar. Com a lista única, os agentes   │
 * │ desses três recebiam 403 — incluindo no `/llms.txt`. O programa       │
 * │ media um número que estava fixado em zero por construção.              │
 * │                                                                       │
 * │ A separação abaixo é a que a própria `ESTRATEGIA.md` já descrevia:    │
 * │ «GPTBot (treino — decisão SEPARADA; bloqueá-lo não exclui a           │
 * │ pesquisa)». Ficou por aplicar ao código quando a decisão de proteção  │
 * │ de ativos (`docs/PROTECAO-ATIVOS.md`) chegou depois e levou tudo à    │
 * │ frente.                                                                │
 * │                                                                       │
 * │ Nenhuma destas listas é uma fronteira de segurança: qualquer cliente  │
 * │ pode falsificar o User-Agent. O que elas garantem é que o robots.txt  │
 * │ e o bloqueio HTTP tomam a MESMA decisão, e que um agente cooperante   │
 * │ recebe uma resposta inequívoca.                                        │
 * └───────────────────────────────────────────────────────────────────────┘
 */

/**
 * BLOQUEADOS — treino de modelos, construção de datasets e scraping comercial.
 *
 * O que estes agentes fazem com o conteúdo não devolve nada a quem o escreveu:
 * entra num corpus, e o corpus não cita. É a reserva do Art. 4.º, n.º 3 da
 * Diretiva (UE) 2019/790, repetida no `robots.txt`, no cabeçalho HTTP
 * `tdm-reservation` e no TDMRep.
 */
export const AGENTES_EXTRACAO_BLOQUEADOS = [
  // Treino de modelos
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "Google-CloudVertexBot",
  "meta-externalagent",
  "meta-externalfetcher",
  "Amazonbot",
  "cohere-ai",
  "Bytespider",
  "PanguBot",

  // Datasets e prospeção em massa
  "CCBot",
  "AI2Bot",
  "AI2Bot-Dolma",
  "Timpibot",
  "Omgilibot",
  "omgili",
  "Diffbot",
  "ImagesiftBot",
  "PetalBot",
  "YouBot",
  "Kangaroo Bot",
  "GoogleOther",

  // Scraping comercial / inteligência competitiva
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "BLEXBot",
  "DotBot",
] as const;

/**
 * PERMITIDOS — motores de resposta e pedidos iniciados por uma pessoa.
 *
 * Estes leem para responder a uma pergunta feita agora, e devolvem uma
 * citação com ligação. É exatamente o que o programa de autoridade quer, e é
 * por isso que estão AQUI e não na lista de cima. A distinção é a que os
 * próprios fornecedores documentam — a OpenAI separa `GPTBot` (treino) de
 * `OAI-SearchBot` (pesquisa) e `ChatGPT-User` (pedido de uma pessoa).
 *
 * Esta lista não é usada para permitir nada — o `robots.txt` permite por
 * omissão. Existe para que a decisão fique escrita, para que o portão de
 * fronteira a possa verificar, e para que ninguém volte a somá-los à lista
 * de cima sem ler isto primeiro.
 */
export const AGENTES_RESPOSTA_PERMITIDOS = [
  // OpenAI — pesquisa do ChatGPT e leitura pedida por uma pessoa
  "OAI-SearchBot",
  "ChatGPT-User",

  // Anthropic — pesquisa do Claude e leitura pedida por uma pessoa
  "Claude-SearchBot",
  "Claude-User",

  // Motores de resposta
  "PerplexityBot",
  "Perplexity-User",
  "DuckAssistBot",
] as const;

export function agenteDeExtracaoBloqueado(userAgent: string): boolean {
  const normalizado = userAgent.toLocaleLowerCase("en-US");

  // ┌─────────────────────────────────────────────────────────────────────┐
  // │ A ORDEM IMPORTA, E É POR CAUSA DE UM PREFIXO                         │
  // │                                                                     │
  // │ A comparação é por SUBSTRING, e há pares em que um nome permitido    │
  // │ contém um nome bloqueado — `ClaudeBot` está dentro de nada, mas      │
  // │ `Claude-SearchBot` e `ClaudeBot` partilham `Claude`, e um dia        │
  // │ alguém encurta uma entrada. Verificar PRIMEIRO a lista de            │
  // │ permitidos torna a regra explícita: quem está lá passa, aconteça o   │
  // │ que acontecer à outra lista.                                         │
  // └─────────────────────────────────────────────────────────────────────┘
  if (AGENTES_RESPOSTA_PERMITIDOS.some((a) => normalizado.includes(a.toLocaleLowerCase("en-US")))) {
    return false;
  }

  return AGENTES_EXTRACAO_BLOQUEADOS.some((agente) =>
    normalizado.includes(agente.toLocaleLowerCase("en-US")),
  );
}
