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
  type HubGroup,
  HUB_GRUPOS,
} from "@/lib/guias/manifests";
import { guiaSemCorpo } from "@/lib/guias/expansao/derivar";
import { CATALOGO_FERRAMENTAS } from "@/lib/ferramentas";
import type { ToolDefinition } from "@/lib/ferramentas/tipos";
import { TOTAL_PERGUNTAS_META } from "@/lib/quiz-fiscal/quiz-meta";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import {
  FONTES_PRAZOS,
  PRAZOS_REVISTOS_EM,
  gerarPrazos,
  type CategoriaPrazo,
} from "@/lib/prazos";
import { MENU_GRUPOS } from "@/lib/navegacao";
import type { DocumentoBusca, DominioBusca, Intencao, PerfilBusca, RendererBusca } from "./esquema";
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

/**
 * O renderer de uma ferramenta DERIVA do que ela é — não é um campo novo
 * para alguém manter em dia.
 *
 * Duas regras, e a ordem importa: uma ferramenta cuja família de decisão é
 * «comparar» apresenta-se como comparação (dois cenários e o dado que
 * falta), um mapa é um destino simples, e tudo o resto é uma ferramenta
 * preparada. Se um dia houver uma terceira forma de apresentar, ela entra
 * no catálogo como declaração da ferramenta — nunca aqui como excepção
 * escrita à mão sobre um id.
 */
function rendererDaFerramenta(f: ToolDefinition): RendererBusca {
  if (f.dominio === "comparar") return "comparison";
  if (f.kind === "map") return "direct_route";
  return "prepared_tool";
}

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
    dominio: f.dominio,
    renderer: rendererDaFerramenta(f),
    ...(f.aceitaEntidades?.length ? { aceita: f.aceitaEntidades } : {}),
    anoFiscal: f.fiscalYear,
    minutos: f.estimatedMinutes,
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
    dominio: "produto",
    renderer: "direct_route",
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
    dominio: "produto",
    renderer: "direct_route",
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
    dominio: "obrigacoes",
    renderer: "direct_route",
    requerConta: true,
    prioridade: 78,
  },
];

/* ─── Obrigações ──────────────────────────────────────────────────── */

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ «QUANDO ENTREGO O IVA?» NÃO É UM GUIA — É UMA OBRIGAÇÃO              │
 * │                                                                     │
 * │ Era a pergunta mais simples que a pesquisa não sabia responder. O    │
 * │ índice tinha o guia «IVA nos recibos verdes» (que explica a regra) e │
 * │ o calendário (que mostra as datas), e a consulta caía no guia — a    │
 * │ resposta certa a uma pergunta diferente. Quem pergunta «quando»      │
 * │ quer a data, a base legal e a fonte, por esta ordem.                 │
 * │                                                                     │
 * │ Uma família por CATEGORIA e não uma entrada por data: `gerarPrazos`  │
 * │ produz mais de trinta prazos por ano — doze deles com o mesmo título │
 * │ («Pagamento — Segurança Social») — e enchê-los no índice seria       │
 * │ devolver doze linhas iguais a quem escreveu «segurança social».      │
 * │ Três documentos, um por imposto, cada um com as suas contagens       │
 * │ DERIVADAS do motor de prazos: se a lei mudar e o motor gerar outra   │
 * │ coisa, o índice muda com ele.                                       │
 * │                                                                     │
 * │ E cada um leva `fonte`. É a regra absoluta do produto aplicada à     │
 * │ pesquisa: nenhuma afirmação fiscal chega ao ecrã sem proveniência.   │
 * └─────────────────────────────────────────────────────────────────────┘
 */
const FONTE_POR_CATEGORIA: Record<CategoriaPrazo, keyof typeof FONTES_PRAZOS> = {
  ss: "segSocialTI",
  iva: "civa41",
  irs: "cirs60",
};

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ NENHUM DESTES ALIASES É O NOME DO IMPOSTO SOZINHO — E É DELIBERADO   │
 * │                                                                     │
 * │ A primeira versão tinha «iva» na lista, e a pesquisa passou a        │
 * │ responder a «iva» com o calendário de prazos — que exige conta —     │
 * │ em vez do guia que explica o IVA nos recibos verdes. Um alias que é  │
 * │ uma correspondência EXACTA vale 120 pontos e passa à frente de       │
 * │ qualquer título; bastou uma palavra na lista errada para a melhor    │
 * │ resposta a uma pergunta comum deixar de ser a melhor resposta.       │
 * │                                                                     │
 * │ Uma obrigação responde à pergunta «QUANDO», e é isso que os aliases  │
 * │ têm de dizer. Quem escreve só «iva» está a perguntar «o que é» — e   │
 * │ essa resposta é do guia. Fixado em `busca-cabecalho.test.ts`.        │
 * └─────────────────────────────────────────────────────────────────────┘
 */
const ALIASES_POR_CATEGORIA: Record<CategoriaPrazo, string[]> = {
  ss: [
    "quando pago a segurança social", "declaração trimestral", "contribuição mensal",
    "quando declaro à segurança social", "prazo da segurança social", "trimestral",
  ],
  iva: [
    "quando entrego o iva", "quando pago o iva", "declaração periódica de iva",
    "prazo do iva", "iva trimestral", "iva mensal", "entrega do iva",
  ],
  irs: [
    "quando entrego o irs", "prazo do irs", "declaração de rendimentos",
    "modelo 3", "pagamentos por conta", "quando pago o irs", "acerto de irs",
  ],
};

/**
 * O nome do imposto NÃO abre o título, e pela mesma razão dos aliases.
 *
 * «IVA — prazos de 2026» começa por «iva» e apanha 90 pontos de prefixo a
 * quem escreve só «iva»; «Prazos do IVA em 2026» apanha 70 de subcadeia em
 * fronteira de palavra e deixa o guia ganhar essa consulta, que é dele. O
 * título continua a dizer exactamente a mesma coisa — só não finge ser a
 * resposta a uma pergunta que ninguém fez.
 */
const TITULO_POR_CATEGORIA: Record<CategoriaPrazo, string> = {
  ss: "Prazos da Segurança Social",
  iva: "Prazos do IVA",
  irs: "Prazos do IRS",
};

const VERBO_POR_CATEGORIA: Record<CategoriaPrazo, string> = {
  ss: "Declarar os rendimentos e pagar a contribuição",
  iva: "Entregar a declaração periódica e pagar o imposto",
  irs: "Entregar a declaração, os pagamentos por conta e o acerto",
};

const documentosObrigacoes = (): DocumentoBusca[] => {
  const prazos = gerarPrazos(FISCAL_YEAR);
  const categorias: CategoriaPrazo[] = ["iva", "ss", "irs"];

  return categorias.map((categoria) => {
    const datas = prazos.filter((p) => p.categoria === categoria).length;
    const fonte = FONTES_PRAZOS[FONTE_POR_CATEGORIA[categoria]];

    return {
      id: `obrigacao:${categoria}`,
      tipo: "obrigacao" as const,
      titulo: `${TITULO_POR_CATEGORIA[categoria]} em ${FISCAL_YEAR}`,
      /**
       * ┌───────────────────────────────────────────────────────────────┐
       * │ «16 ENTREGAS E 16 PAGAMENTOS» ERA VERDADE E ENGANAVA           │
       * │                                                               │
       * │ O motor gera as datas dos DOIS regimes de IVA — trimestral e   │
       * │ mensal — porque o calendário tem de as conhecer a todas. Somar │
       * │ as duas e dizer «16 entregas» a uma pessoa que faz quatro por  │
       * │ ano é dar-lhe um número correcto sobre o calendário e errado   │
       * │ sobre ela. Num produto fiscal, é a pior categoria de engano:   │
       * │ o que se pode defender à letra.                                │
       * │                                                               │
       * │ Passa a dizer quantas datas o CALENDÁRIO tem e a dizer, na     │
       * │ mesma frase, que as que se aplicam dependem do regime — que é  │
       * │ exactamente o que a página de prazos faz quando lá se chega.   │
       * └───────────────────────────────────────────────────────────────┘
       */
      descricao: `${VERBO_POR_CATEGORIA[categoria]}. São ${datas} datas no calendário de ${FISCAL_YEAR}, já ajustadas a fins de semana e feriados; as que se aplicam a ti dependem do teu regime.`,
      // A categoria viaja na query porque o calendário filtra por ela: o
      // destino abre já no imposto que a pessoa perguntou. Não é contexto
      // sensível — é o nome de um imposto, e é o mesmo que ela escreveu.
      href: `/dashboard/prazos?categoria=${categoria}`,
      aliases: ALIASES_POR_CATEGORIA[categoria],
      grupo: "Prazos e obrigações",
      intencoes: ["cumprir"] as Intencao[],
      perfis: ["independente"] as PerfilBusca[],
      dominio: "obrigacoes" as const,
      renderer: "obligation" as const,
      anoFiscal: FISCAL_YEAR,
      fonte: { label: fonte.label, url: fonte.url, revistoEm: PRAZOS_REVISTOS_EM },
      requerConta: true,
      // Acima das ferramentas de cálculo quando a pergunta é «quando»: a
      // desambiguação faz-se pela consulta, não por este número, mas em
      // empate uma data vale mais do que uma simulação.
      prioridade: 82,
    };
  });
};

/* ─── Páginas e apoio ─────────────────────────────────────────────── */

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ O SITE TEM PÁGINAS QUE NÃO SÃO CONTEÚDO — E EXISTEM PARA SER LIDAS   │
 * │                                                                     │
 * │ «Como é que calculam isto?», «de que ano são estes dados?», «o que   │
 * │ fazem aos meus dados?» — três perguntas com resposta escrita         │
 * │ (`/metodologia`, `/estado-dos-dados`, `/privacidade`) e nenhuma      │
 * │ delas devolvia nada. Não estavam no índice porque não eram guias     │
 * │ nem ferramentas, e a arrumação interna do catálogo tinha-se tornado  │
 * │ o limite do que a pesquisa conseguia encontrar.                      │
 * │                                                                     │
 * │ Derivam de `MENU_GRUPOS`, que já é a fonte única da navegação: uma   │
 * │ página nova no menu passa a ser pesquisável sem ninguém tocar aqui.  │
 * │ As que já existem no índice por outra via (planos, quiz) são         │
 * │ excluídas pelo destino — duas entradas para o mesmo sítio fazem a    │
 * │ pessoa escolher entre duas coisas iguais.                            │
 * └─────────────────────────────────────────────────────────────────────┘
 */
const GRUPOS_DE_PAGINAS = ["Confiar", "Legal"] as const;

/** Sinónimos de quem procura estas páginas sem saber como se chamam. */
const ALIASES_DE_PAGINA: Record<string, string[]> = {
  "/metodologia": ["metodologia", "como calculam", "de onde vêm os números", "fórmulas", "rigor"],
  "/estado-dos-dados": ["estado dos dados", "atualizado", "que ano", "verificado", "fontes"],
  "/changelog-fiscal": ["alterações fiscais", "o que mudou na lei", "novidades fiscais", "orçamento do estado"],
  "/privacidade": ["privacidade", "dados pessoais", "rgpd", "o que guardam", "cookies"],
  "/termos": ["termos", "condições", "termos de utilização", "responsabilidade"],
  "/cookies": ["cookies", "consentimento", "rastreio"],
  "/ferramentas": ["ferramentas", "simuladores", "calculadoras", "todas as ferramentas"],
  "/guias": ["guias", "artigos", "todos os guias", "aprender"],
};

const documentosPaginas = (): DocumentoBusca[] => {
  const paginas: DocumentoBusca[] = MENU_GRUPOS.filter((g) =>
    (GRUPOS_DE_PAGINAS as readonly string[]).includes(g.titulo),
  ).flatMap((grupo) =>
    grupo.entradas.map((entrada) => ({
      id: `pagina:${entrada.href.replace(/^\//, "").replace(/\//g, "-")}`,
      tipo: "pagina" as const,
      titulo: entrada.label,
      descricao: entrada.desc ?? `Página ${entrada.label.toLocaleLowerCase("pt-PT")} do Recibo Certo.`,
      href: entrada.href,
      aliases: ALIASES_DE_PAGINA[entrada.href] ?? [],
      grupo: grupo.titulo,
      intencoes: ["compreender"] as Intencao[],
      perfis: ["todos"] as PerfilBusca[],
      dominio: "produto" as const,
      renderer: "direct_route" as const,
      // Baixa de propósito: estas páginas respondem a quem as procura pelo
      // nome, e não devem competir com uma ferramenta quando a pergunta é
      // sobre dinheiro.
      prioridade: 30,
    })),
  );

  // Os dois índices do site. Não vêm do mesmo sítio que as páginas
  // institucionais (são secções, não entradas de rodapé) mas respondem à
  // mesma classe de consulta: «onde estão todos os…».
  const indices: DocumentoBusca[] = [
    {
      id: "pagina:ferramentas",
      tipo: "pagina",
      titulo: "Todas as ferramentas",
      descricao: "O índice completo dos simuladores, calculadoras e decisores.",
      href: "/ferramentas",
      aliases: ALIASES_DE_PAGINA["/ferramentas"],
      grupo: "Ir para",
      intencoes: ["simular", "compreender"],
      perfis: ["todos"],
      dominio: "produto",
      renderer: "direct_route",
      prioridade: 40,
    },
    {
      id: "pagina:guias",
      tipo: "pagina",
      titulo: "Todos os guias",
      descricao: "O índice completo dos guias, por etapa e por obrigação.",
      href: "/guias",
      aliases: ALIASES_DE_PAGINA["/guias"],
      grupo: "Ir para",
      intencoes: ["compreender"],
      perfis: ["todos"],
      dominio: "produto",
      renderer: "direct_route",
      prioridade: 40,
    },
  ];

  return [...paginas, ...indices];
};

/**
 * O DIRETÓRIO DE CONTABILISTAS — uma zona própria, e não mais uma linha.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ O QUE NÃO ENTRA AQUI, E PORQUE NÃO PODE ENTRAR                       │
 * │                                                                     │
 * │ Perfis de contabilistas. Nem um. O índice é um ficheiro estático     │
 * │ servido pela CDN a toda a gente: pôr lá pessoas seria publicar um    │
 * │ diretório inteiro em JSON, congelado no último build, com nomes e    │
 * │ zonas de quem se inscreveu. O diretório vivo já existe, já filtra no │
 * │ servidor e já pagina — a pesquisa ENCAMINHA para ele.                │
 * │                                                                     │
 * │ O que o índice guarda é a capacidade («há apoio profissional, e é    │
 * │ aqui»); quem a executa é o destino.                                  │
 * └─────────────────────────────────────────────────────────────────────┘
 */
const documentosApoio = (): DocumentoBusca[] => [
  {
    id: "apoio:contabilistas",
    tipo: "apoio",
    titulo: "Encontrar um contabilista certificado",
    descricao: "Contabilistas com inscrição na OCC verificada. Só partilhas o pedido quando confirmares.",
    href: "/contabilistas",
    aliases: [
      "contabilista", "contabilistas", "occ", "toc", "ajuda profissional",
      "validar com alguém", "preciso de ajuda", "quero falar com alguém",
      "contabilidade", "caso complexo",
    ],
    grupo: "Apoio profissional",
    intencoes: ["cumprir", "compreender"],
    perfis: ["todos"],
    dominio: "apoio",
    renderer: "professional_support",
    prioridade: 76,
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
 * O hub do guia JÁ É a sua família de decisão — falta só traduzi-la.
 *
 * Um `Record` sobre a união fechada dos hubs e não um `??`: um hub novo no
 * catálogo editorial deixa de compilar aqui até alguém decidir a que
 * família pertence. A alternativa silenciosa — cair num domínio por
 * omissão — punha guias inteiros a responder à consulta errada sem nada
 * que o denunciasse.
 */
const DOMINIO_POR_HUB: Record<HubGroup, DominioBusca> = {
  comecar: "recibos",
  faturar: "recibos",
  profissao: "recibos",
  encerrar: "recibos",
  contribuir: "obrigacoes",
  irs: "obrigacoes",
  prazos: "obrigacoes",
  direitos: "obrigacoes",
  familia: "obrigacoes",
  reforma: "obrigacoes",
  estrangeiro: "obrigacoes",
  investir: "patrimonio",
  casa: "patrimonio",
  empresa: "empresa",
  "conta-outrem": "salario",
};

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
    dominio: DOMINIO_POR_HUB[g.hub],
    renderer: "guide" as const,
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
      dominio: "recibos" as const,
      renderer: "direct_route" as const,
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
    ...documentosObrigacoes(),
    ...documentosGuias(),
    ...documentosApoio(),
    ...documentosPaginas(),
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
    // A regra absoluta do produto, aplicada à pesquisa: uma obrigação é uma
    // afirmação sobre a lei, e nenhuma afirmação sobre a lei chega ao ecrã
    // sem dizer de onde vem e quando foi conferida.
    if (doc.tipo === "obrigacao" && !doc.fonte?.url) {
      throw new Error(`Índice de pesquisa: obrigação sem fonte — ${doc.id}`);
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
