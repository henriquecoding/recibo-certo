// ═══════════════════════════════════════════════════════════════════════
//  OS DOCUMENTOS DE PESQUISA — derivados, nunca escritos à mão
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O DEFEITO QUE ESTE FICHEIRO EXISTE PARA TORNAR IMPOSSÍVEL (P0-01)    │
//  │                                                                     │
//  │ O índice do cabeçalho era uma segunda lista, escrita à mão, com 14   │
//  │ guias. O catálogo público tinha 167. A pesquisa — que o produto      │
//  │ apresenta como porta de entrada — ignorava mais de 90% do que há     │
//  │ para ler, e ninguém tinha como reparar: não havia erro, havia menos  │
//  │ resultados.                                                          │
//  │                                                                     │
//  │ Uma lista paralela nunca se desactualiza com estrondo. Por isso a    │
//  │ correcção não é «actualizar a lista»; é deixar de haver lista. Aqui  │
//  │ os documentos SAEM dos manifestos — registar um guia novo passa a    │
//  │ aumentar a contagem da pesquisa sem ninguém tocar nisto, e o teste   │
//  │ `busca:cobertura` reprova se algum dia voltarem a divergir.          │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ⚠️ ESTE MÓDULO É PESADO E NÃO PODE ENTRAR NO BUNDLE DO CABEÇALHO.
//  Importa manifestos e `fiscal-data.ts`. Quem o pode importar:
//   · `scripts/gen-busca-indice.mjs` (build);
//   · a página `/pesquisar` (componente de servidor);
//   · os testes.
//  O cabeçalho consome o JSON gerado, por `carregarIndice()` — e há um
//  teste (`busca:fronteira`) que reprova se essa regra for atravessada.
// ═══════════════════════════════════════════════════════════════════════

import { ATIVIDADES, type Atividade } from "@/lib/fiscal-data";
import {
  GUIDE_MANIFESTS,
  href as hrefDoManifesto,
  type Archetype,
  type Categoria,
  type GuideManifest,
  HUB_GRUPOS,
} from "@/lib/guias/manifests";
import { guiaSemCorpo } from "@/lib/guias/expansao/derivar";
import { CATALOGO_FERRAMENTAS } from "@/lib/ferramentas";
import { TOTAL_PERGUNTAS_META } from "@/lib/quiz-fiscal/quiz-meta";
import type { DocumentoBusca, Intencao, PerfilBusca } from "./esquema";
import { normalizar } from "./normalizar";

/* ─── Ferramentas ─────────────────────────────────────────────────── */

/**
 * Os perfis do catálogo e os da pesquisa não são o mesmo eixo: o catálogo
 * distingue «familia», a pesquisa não. Uma ferramenta que sirva três ou mais
 * perfis é transversal — é isso que «todos» significa aqui.
 */
const perfisDeBusca = (perfis: readonly string[]): PerfilBusca[] => {
  if (perfis.length >= 3) return ["todos"];
  const mapeados = perfis
    .map((p) => (p === "familia" ? "todos" : p))
    .filter((p): p is PerfilBusca =>
      p === "independente" || p === "dependente" || p === "empresa" || p === "todos");
  return mapeados.length > 0 ? [...new Set(mapeados)] : ["todos"];
};

/**
 * Objetivos do catálogo → intenções da pesquisa.
 * `comparar` e `calcular` são ambos «simular»; `verificar` é «cumprir» quando
 * o que a pessoa quer é confirmar que está em conformidade.
 */
const INTENCAO_DE_OBJETIVO: Record<string, Intencao[]> = {
  calcular: ["simular"],
  comparar: ["simular", "compreender"],
  verificar: ["cumprir", "simular"],
  cumprir: ["cumprir"],
};

const documentosFerramentas = (): DocumentoBusca[] =>
  CATALOGO_FERRAMENTAS.filter((f) => f.surfaces.includes("search")).map((f) => ({
    id: `ferramenta:${f.id}`,
    tipo: "ferramenta" as const,
    titulo: f.title,
    descricao: f.shortOutcome,
    href: f.canonicalHref,
    aliases: f.aliases,
    grupo: f.searchGroup,
    intencoes: [...new Set(f.intents.flatMap((i) => INTENCAO_DE_OBJETIVO[i] ?? ["simular"]))],
    perfis: perfisDeBusca(f.profiles),
    anoFiscal: f.fiscalYear,
    prioridade: f.searchPriority,
  }));

/**
 * A calculadora da página inicial e a página de planos.
 *
 * Não são «ferramentas do hub» — uma é uma secção da homepage, a outra é
 * comercial — mas são destinos que as pessoas procuram pelo nome. Ficarem
 * de fora do índice era obrigar quem escreve «preços» a não encontrar nada.
 */
const documentosAvulso = (): DocumentoBusca[] => [
  // A calculadora de recibos verdes deixou de estar aqui: passou a ter
  // ferramenta com destino canónico (`/ferramentas/recibos-verdes`) e vem do
  // catálogo como todas as outras. Manter esta entrada seria repor a lista
  // paralela — e fazer competir `/#calculadora` com a própria ferramenta.
  {
    id: "quiz:quiz-fiscal",
    tipo: "quiz",
    titulo: "Quiz Fiscal",
    descricao: "Testa os teus conhecimentos, com base legal e fontes oficiais em cada resposta.",
    href: "/quiz-fiscal",
    aliases: ["quiz", "quiz fiscal", "perguntas", "testar conhecimentos", "treinar"],
    grupo: "Aprender",
    intencoes: ["compreender"],
    perfis: ["todos"],
    prioridade: 55,
  },
  {
    id: "plano:precos",
    tipo: "plano",
    titulo: "Planos e preços",
    descricao: "O que é grátis, o que traz o Plus e quanto custa.",
    href: "/precos",
    aliases: ["preços", "planos", "assinatura", "subscrição", "plus", "quanto custa", "gratuito"],
    grupo: "Conta",
    intencoes: ["compreender"],
    perfis: ["todos"],
    prioridade: 50,
  },
  {
    id: "ferramenta:prazos",
    tipo: "ferramenta",
    titulo: "Calendário fiscal",
    descricao: "Todas as datas de entrega e pagamento, num só sítio.",
    href: "/dashboard/prazos",
    aliases: ["prazos", "calendário", "datas", "quando pago", "quando entrego", "obrigações"],
    grupo: "Ferramentas",
    intencoes: ["cumprir"],
    perfis: ["todos"],
    prioridade: 78,
  },
];

/* ─── Guias ───────────────────────────────────────────────────────── */

const PERFIS_POR_CATEGORIA: Record<Categoria, PerfilBusca[]> = {
  Independentes: ["independente"],
  "Conta de outrem": ["dependente"],
  Empresas: ["empresa"],
  Transversal: ["todos"],
};

/**
 * O arquétipo do guia já responde à pergunta «o que é que isto serve para
 * fazer?». Traduzi-lo em intenção é só falar a mesma língua do filtro —
 * não é uma classificação nova para alguém manter em dia.
 */
const INTENCOES_POR_ARQUETIPO: Record<Archetype, Intencao[]> = {
  calculation: ["simular", "compreender"],
  procedure: ["cumprir"],
  status: ["cumprir"],
  decision: ["compreender", "simular"],
  reference: ["compreender"],
};

const TITULO_HUB = new Map(HUB_GRUPOS.map((h) => [h.id, h.titulo]));

/**
 * Os guias publicáveis — EXACTAMENTE o mesmo critério do índice `/guias` e
 * do sitemap (`GUIA_SLUGS`). Um andaime sem corpo redigido não se anuncia
 * no Google nem se devolve numa pesquisa: em ambos os casos seria prometer
 * conteúdo que ainda não existe.
 */
export const manifestosPesquisaveis = (): GuideManifest[] =>
  GUIDE_MANIFESTS.filter((m) => m.status !== "archived" && !guiaSemCorpo(m.slug));

const documentosGuias = (): DocumentoBusca[] =>
  manifestosPesquisaveis().map((g) => ({
    id: `guia:${g.id}`,
    tipo: "guia" as const,
    titulo: g.title,
    descricao: g.descricao,
    href: hrefDoManifesto(g),
    aliases: g.seo.aliases,
    grupo: TITULO_HUB.get(g.hub) ?? "Guias",
    intencoes: INTENCOES_POR_ARQUETIPO[g.archetype],
    perfis: PERFIS_POR_CATEGORIA[g.categoria],
    anoFiscal: Number(g.effectiveFrom.slice(0, 4)),
    // Um guia revisto vale mais do que um em revisão, e um procedimento
    // («como faço isto») vale mais do que uma referência quando as duas
    // respondem à mesma consulta.
    prioridade:
      (g.archetype === "procedure" || g.archetype === "status" ? 45 : 35) + (g.status === "published" ? 10 : 0),
  }));

/* ─── Atividades ──────────────────────────────────────────────────── */

const ROTULO_TIPO_ATIVIDADE: Record<string, string> = {
  art151: "Art. 151.º (serviços)",
  outros: "Outros serviços",
  vendas: "Vendas / hotelaria",
  diretosAutor: "Direitos de autor",
};

/**
 * Cada atividade do catálogo do Art. 151.º é um destino: leva ao
 * classificador já com a profissão escolhida.
 *
 * A prioridade é baixa DE PROPÓSITO. São 123 documentos com nomes muito
 * parecidos entre si; se pesassem como uma ferramenta, uma consulta como
 * «médico» encheria o painel de variantes da mesma linha do catálogo e
 * empurraria para fora o simulador que responde à pergunta.
 */
const documentosAtividades = (): DocumentoBusca[] =>
  (ATIVIDADES as Atividade[]).map((a) => {
    const resumo =
      a.coef != null
        ? `Coeficiente ${String(a.coef).replace(".", ",")}`
        : (ROTULO_TIPO_ATIVIDADE[a.tipo] ?? a.grupo ?? "Atividade do catálogo fiscal");
    return {
      id: `atividade:${normalizar(a.label).replace(/\s+/g, "-")}`,
      tipo: "atividade" as const,
      titulo: a.label,
      descricao: `${a.grupo ?? "Atividades"} · ${resumo}`,
      href: `/ferramentas/classificar-atividade?q=${encodeURIComponent(a.label)}`,
      aliases: [a.grupo ?? ""].filter(Boolean),
      grupo: a.grupo ?? "Atividades",
      intencoes: ["compreender", "cumprir"] as Intencao[],
      perfis: ["independente"] as PerfilBusca[],
      prioridade: 20,
    };
  });

/* ─── O índice completo ───────────────────────────────────────────── */

/**
 * Constrói o índice e VERIFICA-O.
 *
 * As invariantes correm aqui — e não só no script — para que o teste, a
 * página `/pesquisar` e o gerador estejam a validar a mesma coisa. Um
 * documento duplicado não é um detalhe: um `key` repetido em React parte a
 * lista, e dois destinos iguais fazem a pessoa clicar duas vezes no mesmo
 * sítio a pensar que são coisas diferentes.
 */
export function construirDocumentos(): DocumentoBusca[] {
  const documentos = [
    ...documentosFerramentas(),
    ...documentosAvulso(),
    ...documentosGuias(),
    ...documentosAtividades(),
  ];

  const ids = new Set<string>();
  const destinos = new Set<string>();
  for (const doc of documentos) {
    if (ids.has(doc.id)) throw new Error(`Índice de pesquisa: id duplicado — ${doc.id}`);
    ids.add(doc.id);

    if (!doc.href.startsWith("/")) {
      throw new Error(`Índice de pesquisa: destino não absoluto — ${doc.id} → ${doc.href}`);
    }
    if (!doc.titulo.trim() || !doc.descricao.trim()) {
      throw new Error(`Índice de pesquisa: documento sem título ou descrição — ${doc.id}`);
    }
    // As atividades partilham a página do classificador e distinguem-se
    // pela query; nos restantes tipos, dois documentos com o mesmo destino
    // são a mesma coisa contada duas vezes.
    if (doc.tipo !== "atividade") {
      if (destinos.has(doc.href)) throw new Error(`Índice de pesquisa: destino duplicado — ${doc.href}`);
      destinos.add(doc.href);
    }
  }

  return documentos;
}

/** Metadados de contagem — o `/pesquisar` mostra-os no estado vazio. */
export function contagens() {
  const docs = construirDocumentos();
  return {
    total: docs.length,
    guias: docs.filter((d) => d.tipo === "guia").length,
    ferramentas: docs.filter((d) => d.tipo === "ferramenta").length,
    atividades: docs.filter((d) => d.tipo === "atividade").length,
    perguntasQuiz: TOTAL_PERGUNTAS_META,
  };
}
