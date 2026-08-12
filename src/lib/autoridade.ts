// ═══════════════════════════════════════════════════════════════════════
//  PROGRAMA DE AUTORIDADE — §10 e §14.3 do relatório estratégico
//  ---------------------------------------------------------------------
//  A tese do §10 vale a pena repetir porque contraria o instinto: «A
//  estratégia correta para ChatGPT, Gemini, Perplexity e outras respostas
//  sintetizadas não é produzir texto "para a IA". É tornar o ReciboCerto
//  rastreável, citável, atual, semanticamente claro e mais útil do que uma
//  parafrase genérica.» Não existe um atalho técnico chamado GEO.
//
//  Este ficheiro guarda três estruturas que governam conteúdo e produto:
//
//   · CAMADAS_RESULTADO       a experiência de resultado do §14.3
//   · CAMADAS_PAGINA_CITAVEL  a arquitetura de página do §10.2
//   · PROMPTS_BENCHMARK       o conjunto de avaliação do §10.4
//
//  Vivem em código para que as páginas as leiam em vez de as reescreverem
//  — e para que um teste possa verificar que a estrutura prometida na
//  /metodologia é a que os componentes de resultado realmente usam.
// ═══════════════════════════════════════════════════════════════════════

import type { IcpId } from "@/lib/clusters";

// ─── §14.3 — Experiência de resultado recomendada ──────────────────────

export interface CamadaResultado {
  id: string;
  titulo: string;
  mostra: string;
  porque: string;
}

export const CAMADAS_RESULTADO: readonly CamadaResultado[] = [
  {
    id: "cabecalho",
    titulo: "Cabeçalho",
    mostra: "O resultado ou intervalo, o ano fiscal, o perfil e o nível de confiança.",
    porque: "Sem o ano e o perfil, o número é verdadeiro para alguém — mas talvez não para ti.",
  },
  {
    id: "como",
    titulo: "Como chegámos aqui",
    mostra: "Premissas editáveis, fórmula resumida, arredondamento e versão do motor.",
    porque: "Permite verificar o cálculo em vez de acreditar nele.",
  },
  {
    id: "acao",
    titulo: "O que reservar ou fazer",
    mostra: "Uma ação concreta com data, sem se apresentar como obrigação já cumprida.",
    porque: "O valor de saber quanto é só existe se souberes o que fazer a seguir.",
  },
  {
    id: "cenarios",
    titulo: "Cenários",
    mostra: "Alterar uma variável e comparar, com a diferença explicada.",
    porque: "Quase nenhuma decisão fiscal é sobre um número — é sobre a escolha entre dois.",
  },
  {
    id: "fontes",
    titulo: "Fontes e limites",
    mostra: "Data de revisão, fonte primária, casos não cobertos e como pedir correção.",
    porque: "É o que distingue um resultado de um palpite bem formatado.",
  },
  {
    id: "ctas",
    titulo: "Próximo passo",
    mostra: "Guardar, executar ou falar com um profissional — com um deles em destaque.",
    porque: "Três opções com o mesmo peso não são uma recomendação; são um encolher de ombros.",
  },
];

// ─── §10.2 — Arquitetura de uma página citável ─────────────────────────

export interface CamadaCitavel {
  camada: string;
  conteudo: string;
  porque: string;
}

export const CAMADAS_PAGINA_CITAVEL: readonly CamadaCitavel[] = [
  {
    camada: "Resposta",
    conteudo: "Conclusão curta, com data e ano, perfil aplicável e a ressalva principal.",
    porque: "Permite extrair uma afirmação sem lhe retirar o contexto que a torna verdadeira.",
  },
  {
    camada: "Cenário",
    conteudo: "Entradas, intervalos e exemplos reproduzíveis.",
    porque: "Distingue a página de texto comoditizado que qualquer modelo já sabe parafrasear.",
  },
  {
    camada: "Cálculo",
    conteudo: "Fórmula, arredondamento, versão do motor e passos intermédios.",
    porque: "Permite verificar e comparar com outra fonte.",
  },
  {
    camada: "Evidência",
    conteudo: "Fonte primária, artigo ou guia oficial, data consultada e data revista.",
    porque: "Reduz ambiguidade e sustenta a atualização quando a regra mudar.",
  },
  {
    camada: "Limites",
    conteudo: "Casos excluídos, variáveis não consideradas e quando procurar ajuda.",
    porque: "Evita uma resposta excessivamente confiante sobre um caso que não cobre.",
  },
  {
    camada: "Ação",
    conteudo: "A ferramenta, guardar, exportar, continuar na FIZ ou falar com um especialista.",
    porque: "Converte a resposta em utilidade — que é precisamente o que um modelo não substitui.",
  },
];

// ─── §10.4 — Benchmark mensal de respostas de IA ───────────────────────

export interface PromptBenchmark {
  id: string;
  icp: IcpId;
  pergunta: string;
  /** A superfície do ReciboCerto que deveria ser citada nesta resposta. */
  paginaAlvo: string;
}

/**
 * Vinte perguntas canónicas, distribuídas pelos ICPs do §5.1, cobrindo os
 * temas que o §10.4 nomeia: primeiro recibo, reserva, salário vs recibos,
 * ato isolado, Lda, IRS, IVA e clientes externos.
 *
 * São perguntas reais, na linguagem de quem as faz — não consultas
 * otimizadas. O ponto do benchmark é medir se somos citados quando alguém
 * pergunta o que realmente pergunta.
 */
export const PROMPTS_BENCHMARK: readonly PromptBenchmark[] = [
  { id: "b01", icp: "A", pergunta: "Como abro atividade nas Finanças como trabalhador independente?", paginaAlvo: "/guias/abrir-atividade" },
  { id: "b02", icp: "A", pergunta: "Que código CIRS devo escolher ao abrir atividade?", paginaAlvo: "/ferramentas/classificar-atividade" },
  { id: "b03", icp: "A", pergunta: "Tenho de cobrar IVA nos recibos verdes se faturar pouco?", paginaAlvo: "/guias/iva-recibos-verdes" },
  { id: "b04", icp: "A", pergunta: "Quando é que devo fazer retenção na fonte num recibo verde?", paginaAlvo: "/guias/retencao-na-fonte" },
  { id: "b05", icp: "A", pergunta: "Posso passar um ato isolado ou tenho mesmo de abrir atividade?", paginaAlvo: "/ferramentas/ato-isolado" },
  { id: "b06", icp: "B", pergunta: "Quanto devo guardar de cada recibo verde para impostos?", paginaAlvo: "/ferramentas/regime-simplificado" },
  { id: "b07", icp: "B", pergunta: "Como funciona o coeficiente do regime simplificado?", paginaAlvo: "/guias/regime-simplificado" },
  { id: "b08", icp: "B", pergunta: "Quanto pago à Segurança Social como trabalhador independente?", paginaAlvo: "/guias/seguranca-social" },
  { id: "b09", icp: "B", pergunta: "Quando entrego a declaração trimestral da Segurança Social?", paginaAlvo: "/guias/calendario-fiscal" },
  { id: "b10", icp: "B", pergunta: "Que despesas posso deduzir com recibos verdes?", paginaAlvo: "/guias/despesas-dedutiveis" },
  { id: "b11", icp: "B", pergunta: "Como preencho o anexo B do IRS?", paginaAlvo: "/ferramentas/simulador-irs" },
  { id: "b12", icp: "B", pergunta: "Como faturo a um cliente noutro país da União Europeia?", paginaAlvo: "/guias/clientes-estrangeiros" },
  { id: "b13", icp: "B", pergunta: "Recebi de uma plataforma que é merchant of record: que recibo passo?", paginaAlvo: "/ferramentas/payout-mor" },
  { id: "b14", icp: "C", pergunta: "Compensa-me mais recibos verdes ou contrato de trabalho?", paginaAlvo: "/ferramentas/comparar-regimes" },
  { id: "b15", icp: "C", pergunta: "Como calculo o salário líquido a partir do bruto em 2026?", paginaAlvo: "/ferramentas/recibo-vencimento" },
  { id: "b16", icp: "C", pergunta: "O meu recibo de vencimento está com os descontos certos?", paginaAlvo: "/ferramentas/auditoria-recibo" },
  { id: "b17", icp: "C", pergunta: "Posso ter recibos verdes e um emprego ao mesmo tempo?", paginaAlvo: "/guias/acumulacao-emprego" },
  { id: "b18", icp: "D", pergunta: "A partir de que rendimento compensa abrir uma empresa em vez de recibos verdes?", paginaAlvo: "/ferramentas/simulador-empresa" },
  { id: "b19", icp: "D", pergunta: "Quanto custa ter contabilidade organizada em Portugal?", paginaAlvo: "/ferramentas/mapa-contabilistas" },
  { id: "b20", icp: "D", pergunta: "Compensa receber salário de gerente ou dividendos?", paginaAlvo: "/guias/salario-gerente-ou-dividendos" },
];

/** Os motores avaliados. Mesma localização, data e prompt registados. */
export const MOTORES_BENCHMARK: readonly string[] = [
  "ChatGPT Search",
  "Google AI (Gemini)",
  "Perplexity",
];

export interface MetricaBenchmark {
  nome: string;
  definicao: string;
}

export const METRICAS_BENCHMARK: readonly MetricaBenchmark[] = [
  { nome: "Taxa de citação", definicao: "Prompts em que o ReciboCerto é citado / total do conjunto." },
  { nome: "Quota de citações", definicao: "Citações nossas / total de citações dadas nas respostas." },
  { nome: "Frescura", definicao: "A resposta reflete o ano fiscal e as regras em vigor?" },
  { nome: "Factualidade", definicao: "O que é atribuído ao ReciboCerto está correto?" },
  { nome: "Posição", definicao: "A citação aparece na resposta principal ou apenas nas fontes?" },
];

/**
 * Regras de execução do benchmark. A terceira é a que impede isto de se
 * transformar noutra coisa: nenhum teste tenta manipular o motor. Se a
 * resposta for para melhorar a colocação através de qualquer forma de
 * enganar o sistema, o benchmark deixa de medir confiança e passa a medir
 * outra coisa qualquer.
 */
export const REGRAS_BENCHMARK: readonly string[] = [
  "Registar motor, localização, data e prompt exato de cada execução; guardar captura e endereço.",
  "Um revisor fiscal avalia a resposta e a citação — não basta aparecer, é preciso aparecer correto.",
  "Nenhum teste tenta manipular o motor. Medimos, não otimizamos contra o avaliador.",
  "Se não somos citados: melhorar unicidade, evidência e ligações internas.",
  "Se somos citados com erro: corrigir a fonte, o resumo, o canonical ou o conteúdo — por esta ordem.",
];
