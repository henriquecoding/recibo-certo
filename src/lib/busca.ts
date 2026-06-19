// ─────────────────────────────────────────────────────────────────────
//  Índice de pesquisa global do ReciboCerto.
//  ---------------------------------------------------------------------
//  Pesquisa densa e sensível ao contexto, em três categorias:
//   · ferramentas — simuladores e ferramentas (preferindo as rotas do painel);
//   · guias       — os guias fiscais;
//   · atividades  — o catálogo de atividades do Art. 151.º / categorias.
//  Tudo client-side (sem servidor). A categoria por defeito adapta-se à secção
//  onde o utilizador está (ver `categoriaPorContexto`).
// ─────────────────────────────────────────────────────────────────────

import { ATIVIDADES, type Atividade } from "@/lib/fiscal-data";

export type CategoriaBusca = "ferramentas" | "guias" | "atividades";

export interface CategoriaDef {
  id: CategoriaBusca;
  label: string;
  sub: string;
  /** Nome do ícone (mapeado para SVG no componente). */
  icone: string;
  placeholder: string;
}

export const CATEGORIAS: CategoriaDef[] = [
  { id: "ferramentas", label: "Ferramentas", sub: "simuladores", icone: "Calculator", placeholder: "Comparar, empresa, vencimento, IRS…" },
  { id: "guias", label: "Guias", sub: "explicações", icone: "BookOpen", placeholder: "IVA, Segurança Social, IRS Jovem…" },
  { id: "atividades", label: "Atividades", sub: "Art. 151.º", icone: "Search", placeholder: "Designer, médico, programador…" },
];

export interface ItemBusca {
  id: string;
  titulo: string;
  descricao: string;
  href: string;
  /** Nome do ícone para ferramentas/guias. */
  icone: string;
  /** Grupo (para agrupar resultados). */
  grupo: string;
  /** Texto adicional pesquisável (sinónimos). */
  termos?: string;
}

// ── Ferramentas & simuladores (preferir rotas do painel; resto marketing) ──
export const FERRAMENTAS: ItemBusca[] = [
  { id: "f-irs", titulo: "Simulador de IRS", descricao: "Estima o IRS anual e o acerto", href: "/dashboard/simulador", icone: "Calculator", grupo: "Simuladores", termos: "irs anual acerto englobamento" },
  { id: "f-rv", titulo: "Calculadora de recibos verdes", descricao: "Líquido, IRS, SS e IVA em segundos", href: "/?modo=independente", icone: "Receipt", grupo: "Simuladores", termos: "recibo verde liquido tesouraria categoria b" },
  { id: "f-venc", titulo: "Recibo de vencimento", descricao: "Do salário bruto ao líquido (Cat. A)", href: "/dashboard/recibo-vencimento", icone: "Wallet", grupo: "Simuladores", termos: "salario por conta de outrem dependente subsidio refeicao" },
  { id: "f-empresa", titulo: "Abrir empresa", descricao: "Líquido via sociedade: IRC + dividendos", href: "/dashboard/empresa", icone: "Building", grupo: "Simuladores", termos: "sociedade lda irc derrama dividendos" },
  { id: "f-comparar", titulo: "Comparar cenários", descricao: "Recibos verdes vs contrato vs empresa", href: "/dashboard/comparar", icone: "Scale", grupo: "Simuladores", termos: "comparador empresa contrato ponto de viragem regiao beneficios" },
  { id: "f-simplificado", titulo: "Regime simplificado", descricao: "Coeficiente, tributável e IRS estimado", href: "/dashboard/regime-simplificado", icone: "Gauge", grupo: "Simuladores", termos: "coeficiente rendimento tributavel" },
  { id: "f-ato", titulo: "Ato isolado ou atividade?", descricao: "Decisor para a tua situação", href: "/dashboard/ato-isolado", icone: "Swap", grupo: "Simuladores", termos: "ato isolado abrir atividade decisor" },
  { id: "f-auditoria", titulo: "Auditoria do recibo de vencimento", descricao: "Confirma se o teu recibo está certo", href: "/dashboard/auditoria-recibo", icone: "ShieldCheck", grupo: "Ferramentas", termos: "auditar recibo erro irs seguranca social" },
  { id: "f-classificar", titulo: "Classificar atividade fiscal", descricao: "Retenção, coeficiente e SS por profissão", href: "/dashboard/classificar-atividade", icone: "Search", grupo: "Ferramentas", termos: "cae profissao retencao coeficiente" },
  { id: "f-mapa", titulo: "Mapa de contabilistas", descricao: "Preço médio por região, num mapa", href: "/dashboard/mapa-contabilistas", icone: "MapPin", grupo: "Ferramentas", termos: "contabilista avenca preco regiao honorarios" },
  { id: "f-mor", titulo: "Recibo Merchant of Record", descricao: "Paddle / Lemon Squeezy em 5 passos", href: "/ferramentas/payout-mor", icone: "ShoppingBag", grupo: "Ferramentas", termos: "payout mor paddle lemon squeezy" },
  { id: "f-quiz", titulo: "Quiz Fiscal", descricao: "Testa-te com base legal e fontes", href: "/quiz-fiscal", icone: "Trophy", grupo: "Aprender", termos: "quiz perguntas teste conhecimentos" },
];

// ── Guias (espelha o catálogo de /guias) ──────────────────────────────────
export const GUIAS: ItemBusca[] = [
  { id: "g-abrir", titulo: "Como abrir atividade nas Finanças", descricao: "Passo a passo online, gratuito e imediato.", href: "/guias/abrir-atividade", icone: "BookOpen", grupo: "Começar", termos: "iniciar atividade financas" },
  { id: "g-ato", titulo: "Ato isolado ou recibos verdes?", descricao: "Decisor interativo para a tua situação.", href: "/guias/ato-isolado", icone: "BookOpen", grupo: "Começar", termos: "ato isolado" },
  { id: "g-simplificado", titulo: "Regime simplificado e coeficientes", descricao: "O que realmente pagas em IRS.", href: "/guias/regime-simplificado", icone: "BookOpen", grupo: "IRS", termos: "coeficiente regime" },
  { id: "g-retencao", titulo: "Retenção na fonte", descricao: "Quando aplicar e quando dispensar.", href: "/guias/retencao-na-fonte", icone: "BookOpen", grupo: "IRS", termos: "retencao 25%" },
  { id: "g-iva", titulo: "IVA nos recibos verdes", descricao: "A isenção de 15 000 € explicada.", href: "/guias/iva-recibos-verdes", icone: "BookOpen", grupo: "IVA", termos: "iva isencao 15000 art 53" },
  { id: "g-ss", titulo: "Segurança Social", descricao: "Fórmula, prazos e isenção do 1.º ano.", href: "/guias/seguranca-social", icone: "BookOpen", grupo: "Segurança Social", termos: "seguranca social ss contribuicao" },
  { id: "g-jovem", titulo: "IRS Jovem 2026", descricao: "Isenção, anos e como pedir.", href: "/guias/irs-jovem", icone: "BookOpen", grupo: "IRS", termos: "irs jovem isencao" },
  { id: "g-escaloes", titulo: "Escalões de IRS 2026", descricao: "Tabela e mitos sobre subir de escalão.", href: "/guias/escaloes-irs", icone: "BookOpen", grupo: "IRS", termos: "escaloes taxas tabela" },
  { id: "g-acumulacao", titulo: "Acumulação com emprego", descricao: "Tens emprego e passas recibos verdes?", href: "/guias/acumulacao-emprego", icone: "BookOpen", grupo: "Situações", termos: "acumular emprego contrato" },
  { id: "g-estrangeiros", titulo: "Clientes estrangeiros", descricao: "IVA e retenção para fora de Portugal.", href: "/guias/clientes-estrangeiros", icone: "BookOpen", grupo: "Situações", termos: "estrangeiro vies intracomunitario exportacao" },
  { id: "g-cessar", titulo: "Cessar atividade", descricao: "Como fechar e o que acontece se não fechares.", href: "/guias/cessar-atividade", icone: "BookOpen", grupo: "Situações", termos: "fechar cessar atividade" },
  { id: "g-deducoes", titulo: "Deduções à coleta", descricao: "Saúde, educação e despesas gerais no IRS.", href: "/guias/deducoes-coleta", icone: "BookOpen", grupo: "IRS", termos: "deducoes coleta saude educacao" },
  { id: "g-fatura", titulo: "Fatura, recibo e fatura-recibo", descricao: "As diferenças e onde entram os recibos verdes.", href: "/guias/fatura-vs-recibo", icone: "BookOpen", grupo: "Começar", termos: "fatura recibo fatura-recibo" },
  { id: "g-mor", titulo: "Merchant of Record (MoR)", descricao: "Paddle, Lemon Squeezy e como emitir 1 recibo/mês.", href: "/guias/merchant-of-record", icone: "BookOpen", grupo: "Situações", termos: "mor paddle lemon squeezy" },
];

// ── Pesquisa difusa simples (subcadeia + sequência) ───────────────────────
function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function pontuar(texto: string, q: string): number {
  const t = normalizar(texto);
  const query = normalizar(q);
  if (!query) return 0;
  const idx = t.indexOf(query);
  if (idx >= 0) return 100 - idx + (t.startsWith(query) ? 50 : 0);
  // subsequência
  let qi = 0;
  for (let i = 0; i < t.length && qi < query.length; i++) if (t[i] === query[qi]) qi++;
  return qi === query.length ? 20 : 0;
}

export interface ResultadoAtividade {
  id: string;
  label: string;
  grupo: string;
  tipo: string;
  /** Resumo curto (coeficiente/retenção) para mostrar inline. */
  resumo: string;
}

/** Pesquisa ferramentas ou guias (lista fixa). */
export function pesquisarItens(itens: ItemBusca[], q: string): ItemBusca[] {
  if (!q.trim()) return itens;
  return itens
    .map((it) => ({ it, s: Math.max(pontuar(it.titulo, q), pontuar(it.descricao, q) - 10, pontuar(it.termos ?? "", q) - 5) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.it);
}

const TIPO_LABEL: Record<string, string> = {
  art151: "Art. 151.º (serviços)",
  outros: "Outros serviços",
  vendas: "Vendas / hotelaria",
  diretosAutor: "Direitos de autor",
};

/** Pesquisa o catálogo de atividades (Art. 151.º + categorias). */
export function pesquisarAtividades(q: string, limite = 24): ResultadoAtividade[] {
  const base = (ATIVIDADES as Atividade[]).map((a) => {
    const resumo = a.coef != null ? `Coeficiente ${String(a.coef).replace(".", ",")}` : (TIPO_LABEL[a.tipo] ?? a.grupo ?? "");
    return { id: a.label, label: a.label, grupo: a.grupo ?? "Atividades", tipo: a.tipo, resumo };
  });
  if (!q.trim()) return base.slice(0, limite);
  return base
    .map((a) => ({ a, s: pontuar(a.label, q) || pontuar(a.grupo, q) - 8 }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limite)
    .map((x) => x.a);
}

/** Categoria por defeito conforme a secção atual. */
export function categoriaPorContexto(pathname: string): CategoriaBusca {
  if (pathname.startsWith("/guias")) return "guias";
  if (pathname.includes("classificar-atividade")) return "atividades";
  return "ferramentas";
}
