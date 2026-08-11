// Registry de métricas da página de investidores.
//
// ── A regra ────────────────────────────────────────────────────────────────
// Se uma métrica não tem definição, fonte, data e dono, não aparece na página.
// `assertMetrica` corre ao importar este módulo e FAZ O BUILD FALHAR — a mesma
// disciplina que `fiscal-data.ts` aplica aos números fiscais.
//
// ── O que está aqui, e o que deliberadamente NÃO está ──────────────────────
// As métricas públicas são todas CONTADAS A PARTIR DO CÓDIGO deste repositório.
// Qualquer pessoa as pode confirmar abrindo os ficheiros indicados — são
// factos sobre a superfície do produto, verificáveis sem confiar em nós.
//
// As métricas que um investidor mais quer ver — utilizadores ativos, receita,
// retenção, conversão, CAC — estão declaradas aqui com `visibilidade: "gated"`
// e SEM VALOR. Não é um esquecimento nem uma tática: é a única resposta
// honesta enquanto não houver uma fonte de verdade auditável para elas. A
// página diz que são partilhadas na conversa, em vez de mostrar um número que
// ninguém consegue reproduzir.
//
// Preencher qualquer uma delas exige: (a) o valor real, (b) o sistema de onde
// sai, (c) a data. Sem os três, `assertMetrica` recusa.

import { assertMetrica, type MetricaInvestidor } from "../_lib/evidence";
import { PARAMETROS_AUDITADOS, SOURCES, ATIVIDADES } from "@/lib/fiscal-data";
import { GUIA_SLUGS, FERRAMENTA_SLUGS } from "@/lib/seo";
import { TOTAL_PERGUNTAS_META } from "@/lib/quiz-fiscal/quiz-meta";

/** Data de referência das contagens — a data de revisão desta página. */
export const DATA_REFERENCIA = "2026-08-11";

// A contagem de guias vem de `GUIA_SLUGS`, que é a MESMA que a página inicial
// e o sitemap usam. Contar aqui de outra maneira (por exemplo, só os que têm
// `status: "published"`) daria um número diferente do que o site anuncia dois
// cliques ao lado — e uma página de investidores que se contradiz com o
// próprio produto é o oposto do que esta reescrita procura.
const guiasPublicados = GUIA_SLUGS.length;
const ferramentas = FERRAMENTA_SLUGS.length;
const parametrosVerificados = PARAMETROS_AUDITADOS.length;
const fontesOficiais = Object.keys(SOURCES).length;

/**
 * `useGrouping: "always"` porque o pt-PT NÃO agrupa números de quatro dígitos
 * por omissão: 1614 sairia "1614" ao lado de "1 526 926". A página fica com
 * duas convenções na mesma frase e parece feita à pressa.
 */
const fmt = (n: number) => n.toLocaleString("pt-PT", { useGrouping: "always" });

/**
 * Superfície do produto. Tudo contado a partir do código, no servidor.
 * Não são métricas de tração e a página nunca as apresenta como tal.
 */
export const METRICAS_PRODUTO: MetricaInvestidor[] = [
  {
    id: "parametros_verificados",
    rotulo: "Parâmetros fiscais com base legal e fonte",
    valor: parametrosVerificados,
    formatado: fmt(parametrosVerificados),
    unidade: "count",
    tipo: "actual",
    visibilidade: "public",
    asOf: DATA_REFERENCIA,
    definicao:
      "Cada taxa, escalão, coeficiente ou limite usado pelos motores de cálculo que tem norma, fonte oficial e data de verificação registadas em src/lib/fiscal-data.ts. Contado a partir do código.",
    sistemaFonte: "repositório (src/lib/fiscal-data.ts)",
    urlFonte: "/estado-dos-dados",
    dono: "Engenharia",
  },
  {
    id: "fontes_oficiais",
    rotulo: "Fontes oficiais citadas",
    valor: fontesOficiais,
    formatado: fmt(fontesOficiais),
    unidade: "count",
    tipo: "actual",
    visibilidade: "public",
    asOf: DATA_REFERENCIA,
    definicao:
      "Diplomas, portarias e páginas oficiais distintas referenciadas pelos parâmetros fiscais. Contado a partir do código, não de uma lista escrita à mão.",
    sistemaFonte: "repositório (src/lib/fiscal-data.ts)",
    urlFonte: "/metodologia",
    dono: "Engenharia",
  },
  {
    id: "guias_publicados",
    rotulo: "Guias fiscais publicados",
    valor: guiasPublicados,
    formatado: fmt(guiasPublicados),
    unidade: "count",
    tipo: "actual",
    visibilidade: "public",
    asOf: DATA_REFERENCIA,
    definicao:
      "Guias com página própria e corpo escrito, excluindo arquivados. É a mesma contagem que a página inicial e o sitemap usam — não uma contagem alternativa feita para esta página.",
    sistemaFonte: "repositório (src/lib/seo.ts · GUIA_SLUGS)",
    urlFonte: "/guias",
    dono: "Conteúdo",
  },
  {
    id: "ferramentas",
    rotulo: "Ferramentas e simuladores",
    valor: ferramentas,
    formatado: fmt(ferramentas),
    unidade: "count",
    tipo: "actual",
    visibilidade: "public",
    asOf: DATA_REFERENCIA,
    definicao:
      "Ferramentas com página própria e cálculo com dados de 2026. Contado a partir do código, pela mesma lista que a página inicial usa.",
    sistemaFonte: "repositório (src/lib/seo.ts · FERRAMENTA_SLUGS)",
    urlFonte: "/ferramentas",
    dono: "Produto",
  },
  {
    id: "atividades_catalogo",
    rotulo: "Atividades do artigo 151.º no catálogo",
    valor: ATIVIDADES.length,
    formatado: fmt(ATIVIDADES.length),
    unidade: "count",
    tipo: "actual",
    visibilidade: "public",
    asOf: DATA_REFERENCIA,
    definicao:
      "Códigos de atividade com coeficiente e taxa de retenção validados, usados pela classificação e pelos simuladores. Contado a partir do código.",
    sistemaFonte: "repositório (src/lib/fiscal-data.ts)",
    dono: "Engenharia",
  },
  {
    id: "perguntas_quiz",
    rotulo: "Perguntas no banco do Quiz Fiscal",
    valor: TOTAL_PERGUNTAS_META,
    formatado: fmt(TOTAL_PERGUNTAS_META),
    unidade: "count",
    tipo: "actual",
    visibilidade: "public",
    asOf: DATA_REFERENCIA,
    definicao:
      "Perguntas distintas no banco do Quiz Fiscal, somadas por categoria e geradas a partir do banco real, não de uma contagem manual.",
    sistemaFonte: "repositório (src/lib/quiz-fiscal/quiz-meta.ts)",
    urlFonte: "/quiz-fiscal",
    dono: "Conteúdo",
  },
];

/**
 * Tração e economia do negócio.
 *
 * ⚠️ SEM VALORES, DE PROPÓSITO. Cada uma destas está definida — o que conta, de
 * onde sairia, com que cadência — mas nenhuma tem número publicado porque
 * nenhuma tem hoje uma fonte de verdade que um terceiro possa auditar. Inventar
 * qualquer uma seria o erro exato que esta reescrita corrige.
 *
 * Para publicar uma: preencher `valor` + `formatado`, apontar `sistemaFonte` ao
 * sistema real (Stripe, event store) e mudar `visibilidade` para "public".
 * `assertMetrica` recusa qualquer atalho.
 */
export const METRICAS_TRACAO: MetricaInvestidor[] = [
  {
    id: "mau",
    rotulo: "Utilizadores ativos mensais",
    unidade: "users",
    tipo: "actual",
    visibilidade: "gated",
    asOf: DATA_REFERENCIA,
    periodo: "últimos 30 dias",
    definicao:
      "Utilizador pseudónimo distinto com pelo menos um evento de valor (cálculo concluído, guia lido acima do limiar, exportação) nos últimos 30 dias.",
    sistemaFonte: "por instrumentar (camada de medição própria)",
    dono: "Fundador",
  },
  {
    id: "ativacao",
    rotulo: "Ativação",
    unidade: "percent",
    tipo: "actual",
    visibilidade: "gated",
    asOf: DATA_REFERENCIA,
    definicao:
      "Proporção de novos utilizadores que concluem um cálculo E executam uma ação de retenção (guardar, exportar ou abrir um passo seguinte) na primeira sessão.",
    sistemaFonte: "por instrumentar (camada de medição própria)",
    dono: "Fundador",
  },
  {
    id: "retorno_30d",
    rotulo: "Retorno a 30 dias",
    unidade: "percent",
    tipo: "actual",
    visibilidade: "gated",
    asOf: DATA_REFERENCIA,
    definicao:
      "Coorte ativa no dia zero e novamente entre o dia 1 e o dia 30. É retorno por coorte — não é o mesmo que 'retenção', palavra que a página anterior usava sem coorte nenhuma por trás.",
    sistemaFonte: "por instrumentar (consulta de coorte)",
    dono: "Fundador",
  },
  {
    id: "mrr",
    rotulo: "Receita recorrente mensal",
    unidade: "eur",
    tipo: "actual",
    visibilidade: "gated",
    asOf: DATA_REFERENCIA,
    definicao:
      "Subscrições ativas do Plus, líquidas de descontos e sem IVA, na data de referência. Não inclui receita de parceria, que se conta à parte e só quando a comissão está validada.",
    sistemaFonte: "por consolidar (faturação)",
    dono: "Fundador",
  },
  {
    id: "conversao_plus",
    rotulo: "Conversão para Plus",
    unidade: "percent",
    tipo: "actual",
    visibilidade: "gated",
    asOf: DATA_REFERENCIA,
    definicao:
      "Primeiras subscrições no período a dividir por utilizadores elegíveis, com o denominador declarado. Não misturar com sessões nem com contas criadas.",
    sistemaFonte: "por consolidar (faturação + app)",
    dono: "Fundador",
  },
];

export const TODAS_AS_METRICAS = [...METRICAS_PRODUTO, ...METRICAS_TRACAO];

// Corre ao importar — o build falha se alguma métrica perder a evidência.
for (const m of TODAS_AS_METRICAS) assertMetrica(m);

/** As que a página pode mostrar com número. */
export const METRICAS_PUBLICAS = TODAS_AS_METRICAS.filter((m) => m.visibilidade === "public");

/** As que a página nomeia mas não divulga. */
export const METRICAS_RESERVADAS = TODAS_AS_METRICAS.filter((m) => m.visibilidade === "gated");
