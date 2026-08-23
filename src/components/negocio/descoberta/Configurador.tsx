"use client";

// ═══════════════════════════════════════════════════════════════════════
//  FASE A — construir o contexto, antes de qualquer resultado
//  ---------------------------------------------------------------------
//  O defeito que isto corrige está no ponto 1 do pedido: a configuração
//  saía de vista assim que a lista de resultados crescia, e era preciso
//  navegar por cima de cartões para acabar de responder. Configurar e
//  decidir eram a mesma coluna.
//
//  Agora são duas fases. Aqui não há um único cartão de negócio: há o
//  perfil a formar-se, com a leitura do que já sabemos e do que ainda
//  falta. Os resultados só assumem o ecrã quando a pessoa disser que
//  acabou.
//
//  ── PROGRESSIVE DISCLOSURE, EM DOIS EIXOS ──────────────────────────
//  Três níveis decidem QUE perguntas existem. O essencial são cinco
//  decisões e chega para correr o motor; os outros dois abrem a pedido.
//  Ninguém é obrigado a responder a setenta campos, e quem quiser
//  precisão não fica limitado a cinco.
//
//  Isso resolvia o número de perguntas e não resolvia a densidade — que
//  era o defeito seguinte, e o mais visível de todos: mesmo no nível
//  essencial a primeira coisa que aparecia eram vinte e duas competências
//  numa grelha plana, cada uma com título e descrição, quarenta e quatro
//  linhas de texto antes da primeira decisão. Uma página verdadeira e
//  ilegível ao mesmo tempo.
//
//  O segundo eixo trata disso, e não tira nada a ninguém:
//
//   · CATEGORIAS — competências, meios e recusas entram agrupados pela
//     taxonomia que já existe nos dados (a família do grafo, o grupo do
//     questionário), nunca numa lista corrida;
//   · PASTILHAS — a escolha é um alvo de uma linha. A descrição continua
//     a existir e passa a pedido, no interruptor «Mostrar descrições»;
//   · SECÇÕES DOBRÁVEIS — cada secção fecha e, fechada, diz num resumo o
//     que já lá está. Abertas por omissão: nada fica escondido de quem
//     chega, e quem já respondeu arruma.
//
//  O que falta responder deixou de ser uma lista para ler e passou a ser
//  uma lista para carregar: cada linha leva à secção certa, e sobe o
//  nível de configuração sozinha quando a resposta vive num nível que
//  ainda não está aberto.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  ATIVOS,
  DEDICACOES,
  EQUIPAS,
  FAIXAS_CAPITAL,
  FAMILIAS_COMPETENCIA,
  GRUPOS_ATIVOS,
  GRUPOS_RESTRICOES,
  MERCADOS,
  NIVEIS,
  ONDE_SE_RESPONDE,
  PRAZOS_RECEITA,
  PUBLICOS,
  RESTRICOES,
  SETORES_OFERECIDOS,
  COMPETENCIAS_OFERECIDAS,
  type NivelConfiguracao,
  type SeccaoConfigurador,
} from "@/lib/negocio/descoberta/contexto/perguntas";
import {
  profundidadeDoContexto,
  type Profundidade,
} from "@/lib/negocio/descoberta/contexto/profundidade";
import type {
  AtivoId,
  CompetenciaDeclarada,
  DimensaoRisco,
  NivelCompetencia,
  OpportunityContext,
  PerfilRisco,
  PublicoAlvo,
  RestricaoId,
  TipoExperiencia,
} from "@/lib/negocio/descoberta/contexto/tipos";
import { MARKET_REGIONS, type MarketRegion } from "@/lib/negocio/market/geografia";
import { concelhosDaRegiao } from "@/lib/negocio/market/concelhos";
import { ROTULO_RISCO } from "@/lib/negocio/descoberta/motor/risco";
import {
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Wallet,
} from "@/components/ui/Icons";
import {
  BarraProfundidade,
  Campo,
  Chip,
  EscolhaChip,
  ListaFiltravel,
  Opcao,
  Seccao,
  type OpcaoFiltravel,
} from "./atomos";
import ExplorarSemCompetencias from "./ExplorarSemCompetencias";

const NIVEIS_COMPETENCIA: readonly { id: NivelCompetencia; rotulo: string }[] = [
  { id: "basico", rotulo: "Básico" },
  { id: "intermedio", rotulo: "Intermédio" },
  { id: "avancado", rotulo: "Avançado" },
];

const EXPERIENCIAS: readonly { id: TipoExperiencia; rotulo: string }[] = [
  { id: "interesse", rotulo: "Nunca fiz, tenho interesse" },
  { id: "sei-fazer", rotulo: "Sei fazer" },
  { id: "trabalhei", rotulo: "Já trabalhei nisso" },
  { id: "geri", rotulo: "Já geri isto" },
  { id: "conheco-setor", rotulo: "Conheço o setor" },
  { id: "tenho-contactos", rotulo: "Tenho contactos" },
];

const PERFIS_RISCO: readonly { id: PerfilRisco; rotulo: string }[] = [
  { id: "muito-conservador", rotulo: "Muito conservador" },
  { id: "conservador", rotulo: "Conservador" },
  { id: "moderado", rotulo: "Moderado" },
  { id: "arrojado", rotulo: "Arrojado" },
  { id: "muito-arrojado", rotulo: "Muito arrojado" },
];

const DIMENSOES_RISCO: readonly DimensaoRisco[] = [
  "financeiro",
  "regulatorio",
  "sazonalidade",
  "volatilidade",
];

/** As secções dobráveis, por ordem de aparecimento. */
type SeccaoId = SeccaoConfigurador;

// As três listas grandes, na forma que o filtro entende. Fora do
// componente porque são constantes: recalcular isto a cada tecla escrita
// na caixa de procura seria trabalho por nada.
const COMPETENCIAS_FILTRAVEIS: readonly OpcaoFiltravel[] = COMPETENCIAS_OFERECIDAS.map(
  (item) => ({ id: item.id, rotulo: item.rotulo, nota: item.descricao, grupo: item.familia }),
);
const ATIVOS_FILTRAVEIS: readonly OpcaoFiltravel[] = ATIVOS.map((item) => ({
  id: item.id,
  rotulo: item.rotulo,
  nota: item.nota,
  grupo: item.grupo,
}));
const RESTRICOES_FILTRAVEIS: readonly OpcaoFiltravel[] = RESTRICOES.map((item) => ({
  id: item.id,
  rotulo: item.rotulo,
  nota: item.nota,
  grupo: item.grupo,
}));

const plural = (quantidade: number, singular: string, muitos: string) =>
  `${quantidade} ${quantidade === 1 ? singular : muitos}`;

export interface ConfiguradorProps {
  contexto: OpportunityContext;
  onChange: (proximo: OpportunityContext) => void;
  onDescobrir: () => void;
  onRepor: () => void;
  /** Já houve uma análise? Muda o texto do botão, não o comportamento. */
  jaAnalisou: boolean;
}

export default function Configurador({
  contexto,
  onChange,
  onDescobrir,
  onRepor,
  jaAnalisou,
}: ConfiguradorProps) {
  const [nivel, setNivel] = useState<NivelConfiguracao>("essencial");
  // Guarda-se o que está FECHADO, não o que está aberto: assim uma secção
  // que só nasce ao subir de nível nasce aberta, sem ninguém ter de a
  // registar em lado nenhum.
  const [fechadas, setFechadas] = useState<ReadonlySet<SeccaoId>>(() => new Set<SeccaoId>());
  const [descricoes, setDescricoes] = useState(false);

  const profundidade = useMemo(() => profundidadeDoContexto(contexto), [contexto]);
  const idsDeclarados = useMemo(
    () => new Set(contexto.competencias.map((item) => item.id)),
    [contexto.competencias],
  );
  const concelhosDisponiveis = useMemo(
    () => concelhosDaRegiao(contexto.localizacao.regiao),
    [contexto.localizacao.regiao],
  );

  const alterar = (parcial: Partial<OpportunityContext>) => onChange({ ...contexto, ...parcial });

  const alternarCompetencia = (id: string) => {
    const existe = contexto.competencias.some((item) => item.id === id);
    alterar({
      competencias: existe
        ? contexto.competencias.filter((item) => item.id !== id)
        : [...contexto.competencias, { id, nivel: "intermedio" } satisfies CompetenciaDeclarada],
    });
  };

  const atualizarCompetencia = (id: string, parcial: Partial<CompetenciaDeclarada>) =>
    alterar({
      competencias: contexto.competencias.map((item) =>
        item.id === id ? { ...item, ...parcial } : item,
      ),
    });

  const alternarLista = <T,>(lista: readonly T[], valor: T): T[] =>
    lista.includes(valor) ? lista.filter((item) => item !== valor) : [...lista, valor];

  const mostrar = (deste: NivelConfiguracao) =>
    deste === "essencial" ||
    (deste === "personalizado" && nivel !== "essencial") ||
    (deste === "avancado" && nivel === "avancado");

  const visiveis: readonly SeccaoId[] = [
    "competencias",
    "local",
    "recursos",
    "tempo",
    ...(mostrar("personalizado") ? (["preferencias", "limites"] as const) : []),
    ...(mostrar("avancado") ? (["risco"] as const) : []),
  ];

  const alternarSeccao = (id: SeccaoId) =>
    setFechadas((anterior) => {
      const proximo = new Set(anterior);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });

  const todasFechadas = visiveis.every((id) => fechadas.has(id));
  const alternarTodas = () =>
    setFechadas(todasFechadas ? new Set<SeccaoId>() : new Set<SeccaoId>(visiveis));

  /** Levar alguém à resposta que falta — abrindo o nível e a secção. */
  const irPara = (campoId: string) => {
    const destino = ONDE_SE_RESPONDE[campoId];
    if (!destino) return;
    if (destino.nivel === "avancado") setNivel("avancado");
    else if (destino.nivel === "personalizado" && nivel === "essencial") setNivel("personalizado");
    setFechadas((anterior) => {
      const proximo = new Set(anterior);
      proximo.delete(destino.seccao);
      return proximo;
    });
    if (typeof window === "undefined") return;
    // O elemento pode ainda não existir: subir de nível cria a secção neste
    // mesmo ciclo. Esperar por um quadro depois da pintura chega, e falhar
    // em silêncio é preferível a saltar para o sítio errado.
    window.setTimeout(() => {
      document
        .getElementById(`ode-${destino.seccao}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 90);
  };

  // ── As competências escolhidas ────────────────────────────────────
  const selecionadas = useMemo(
    () => new Set(contexto.competencias.map((item) => item.id)),
    [contexto.competencias],
  );
  const ativosEscolhidos = useMemo(() => new Set<string>(contexto.ativos), [contexto.ativos]);
  const restricoesEscolhidas = useMemo(
    () => new Set<string>(contexto.restricoes),
    [contexto.restricoes],
  );
  const escolhidasEmOrdem = useMemo(
    () => COMPETENCIAS_OFERECIDAS.filter((item) => selecionadas.has(item.id)),
    [selecionadas],
  );

  // ── Os resumos que cada secção fechada mostra ─────────────────────
  const zona = MARKET_REGIONS.find((item) => item.id === contexto.localizacao.regiao)?.label ?? "";
  const dedicacao = DEDICACOES.find((item) => item.id === contexto.tempo.dedicacao)?.rotulo ?? "";
  const equipa = EQUIPAS.find((item) => item.id === contexto.equipa.forma)?.rotulo ?? "";
  const capital =
    contexto.capital.disponivelAgora === undefined
      ? "capital por declarar"
      : `até ${contexto.capital.disponivelAgora.toLocaleString("pt-PT")} €`;

  const resumos: Readonly<Record<SeccaoId, string>> = {
    competencias:
      escolhidasEmOrdem.length === 0
        ? "Por responder — é aqui que o motor começa"
        : escolhidasEmOrdem.map((item) => item.rotulo).join(" · "),
    local: [zona, contexto.localizacao.alcance === "online" ? "só online" : null]
      .filter(Boolean)
      .join(" · "),
    recursos: [
      capital,
      contexto.ativos.length === 0 ? "nenhum meio declarado" : plural(contexto.ativos.length, "meio", "meios"),
    ].join(" · "),
    tempo: [dedicacao, equipa].filter(Boolean).join(" · "),
    preferencias:
      MERCADOS.find((item) => item.id === contexto.preferencias.mercado)?.rotulo ?? "Tanto faz",
    limites:
      contexto.restricoes.length === 0
        ? "Nenhuma declarada"
        : plural(contexto.restricoes.length, "recusa declarada", "recusas declaradas"),
    risco: PERFIS_RISCO.find((item) => item.id === contexto.risco.perfil)?.rotulo ?? "",
  };

  const props = (id: SeccaoId) => ({
    id: `ode-${id}`,
    resumo: resumos[id],
    aberta: !fechadas.has(id),
    onAlternar: () => alternarSeccao(id),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* ══ Coluna principal — as perguntas ═══════════════════════ */}
      <div className="space-y-3 lg:col-span-8">
        {/* ── Como queres responder ───────────────────────────── */}
        <div className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
          <h2 id="contexto-descoberta" className="font-display text-lg font-semibold text-ink">
            Constrói o teu contexto
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            Quanto mais o motor souber, mais diferente é a resposta que te dá. Nada do que escreves
            sai deste dispositivo, e só é guardado se o pedires.
          </p>

          <div
            className="mt-3 inline-flex max-w-full flex-wrap gap-1 rounded-full bg-stone-100 p-1 dark:bg-stone-800"
            role="group"
            aria-label="Quantas perguntas queres responder"
          >
            {NIVEIS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={nivel === item.id}
                onClick={() => setNivel(item.id)}
                className={`min-h-[38px] rounded-full px-3.5 text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  nivel === item.id
                    ? "bg-white text-ink shadow-card dark:bg-stone-950 dark:text-stone-100"
                    : "text-stone-500 hover:text-brand-dark dark:text-stone-400"
                }`}
              >
                {item.rotulo}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-stone-500">
            {NIVEIS.find((item) => item.id === nivel)?.nota}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-stone-100 pt-3 dark:border-stone-800">
            <BotaoDiscreto
              onClick={() => setDescricoes((anterior) => !anterior)}
              icone={descricoes ? EyeOff : Eye}
              pressionado={descricoes}
            >
              {descricoes ? "Ocultar descrições" : "Mostrar descrições"}
            </BotaoDiscreto>
            <BotaoDiscreto onClick={alternarTodas} icone={todasFechadas ? Plus : Minus}>
              {todasFechadas ? "Abrir todas as secções" : "Fechar todas as secções"}
            </BotaoDiscreto>
          </div>
        </div>

        {/* ── 1. O que sabes fazer ────────────────────────────── */}
        <Seccao titulo="O que sabes fazer" icone={Briefcase} {...props("competencias")}>
          <p className="mb-3 text-[11px] leading-relaxed text-stone-500">
            É por aqui que o motor começa: sem isto não consegue compor hipótese nenhuma. Escolhe o
            que farias por dinheiro amanhã, não o que gostavas de aprender.
          </p>

          {/* Quem chega sem saber o que sabe fazer não fica com um botão
              desativado: fica com a lista dos problemas que existem, para
              se reconhecer numa e declarar a competência a partir dali. */}
          {contexto.competencias.length === 0 ? (
            <div className="mb-4">
              <ExplorarSemCompetencias
                regiao={contexto.localizacao.regiao}
                declaradas={idsDeclarados}
                onDeclarar={alternarCompetencia}
              />
            </div>
          ) : null}

          <ListaFiltravel
            nome="competencias"
            singular="competência"
            plural="competências"
            opcoes={COMPETENCIAS_FILTRAVEIS}
            grupos={FAMILIAS_COMPETENCIA}
            escolhidas={selecionadas}
            onAlternar={alternarCompetencia}
            descricoes={descricoes}
          />

          {/* O nível de cada uma, só das que foram escolhidas. Inline em
              cada pastilha partia a grelha e voltava a encher a secção. */}
          {mostrar("personalizado") && escolhidasEmOrdem.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-stone-100 bg-cream/70 p-3 dark:border-stone-800 dark:bg-stone-950/40">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                A que nível{mostrar("avancado") ? " — e com que experiência" : ""}
              </p>
              <ul className="mt-2 space-y-2">
                {escolhidasEmOrdem.map((competencia) => {
                  const declarada = contexto.competencias.find((item) => item.id === competencia.id);
                  if (!declarada) return null;
                  return (
                    <li
                      key={competencia.id}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0 dark:border-stone-800"
                    >
                      <span className="w-full text-[12px] font-semibold text-stone-700 dark:text-stone-200 sm:w-auto sm:min-w-[10rem] sm:flex-1">
                        {competencia.rotulo}
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {NIVEIS_COMPETENCIA.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={declarada.nivel === item.id}
                            aria-label={`${competencia.rotulo}: nível ${item.rotulo}`}
                            onClick={() => atualizarCompetencia(competencia.id, { nivel: item.id })}
                            className={`min-h-[38px] rounded-full border px-2.5 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                              declarada.nivel === item.id
                                ? "border-brand bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint"
                                : "border-stone-200 bg-white text-stone-500 hover:border-brand/60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
                            }`}
                          >
                            {item.rotulo}
                          </button>
                        ))}
                      </span>
                      {mostrar("avancado") ? (
                        <select
                          aria-label={`Experiência em ${competencia.rotulo}`}
                          value={declarada.experiencia ?? ""}
                          onChange={(evento) =>
                            atualizarCompetencia(competencia.id, {
                              experiencia: (evento.target.value || undefined) as
                                | TipoExperiencia
                                | undefined,
                            })
                          }
                          className="h-10 max-w-full rounded-full border border-stone-200 bg-white px-2.5 text-[11px] font-semibold text-stone-600 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300"
                        >
                          <option value="">Experiência…</option>
                          {EXPERIENCIAS.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.rotulo}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </Seccao>

        {/* ── 2. Onde estás ───────────────────────────────────── */}
        <Seccao titulo="Onde vais operar" icone={MapPin} {...props("local")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="ode-regiao"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-500"
              >
                Zona
              </label>
              <select
                id="ode-regiao"
                value={contexto.localizacao.regiao}
                onChange={(evento) =>
                  alterar({
                    localizacao: {
                      ...contexto.localizacao,
                      regiao: evento.target.value as MarketRegion,
                      // Mudar de região invalida o concelho: manter um
                      // concelho de outra região faria a leitura de
                      // oferta descrever um território que não é o dela.
                      concelho: undefined,
                    },
                  })
                }
                className="h-10 w-full rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              >
                {MARKET_REGIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] leading-snug text-stone-500">
                Decide que leituras oficiais são da tua zona e quais entram como contexto nacional.
              </p>

              {/* ── O concelho, quando a região já foi escolhida ──────
                  «Que negócio abrir» varia ao concelho: nos dados que o
                  motor lê, Lisboa tem 8,3 empresas de limpeza por dez mil
                  habitantes e Mafra 23,8 — a mesma célula em NUTS II. A
                  lista é fechada e a escolha nunca sai do dispositivo. */}
              {concelhosDisponiveis.length > 0 ? (
                <div className="mt-3">
                  <label
                    htmlFor="ode-concelho"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-500"
                  >
                    Concelho{" "}
                    <span className="font-normal normal-case tracking-normal text-brand">
                      a resposta que mais muda a análise
                    </span>
                  </label>
                  <select
                    id="ode-concelho"
                    value={contexto.localizacao.concelho ?? ""}
                    onChange={(evento) =>
                      alterar({
                        localizacao: {
                          ...contexto.localizacao,
                          concelho: evento.target.value || undefined,
                        },
                      })
                    }
                    className="h-10 w-full rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  >
                    <option value="">Toda a região</option>
                    {concelhosDisponiveis.map((item) => (
                      <option key={item.codigo} value={item.codigo}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                  {/* ── O CUSTO DE NÃO RESPONDER, COM O NÚMERO MEDIDO ──
                      Era um campo «(opcional)» com uma explicação técnica,
                      e é a pergunta de que depende a leitura de
                      concorrência: medido sobre 1 231 hipóteses, com o
                      mesmo pack e a mesma evidência, a lacuna de oferta é
                      conhecida em 9 % das hipóteses sem concelho e em
                      77 % com ele. Dizer «opcional» sem dizer isto é
                      esconder o preço da escolha. */}
                  {contexto.localizacao.concelho ? (
                    <p className="mt-1.5 text-[11px] leading-snug text-stone-500">
                      A contagem de concorrentes passa a comparar-se entre os 308 concelhos em vez das nove
                      regiões. Continua a não ser morada — é uma escolha de uma lista, e não sai daqui.
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] leading-snug text-stone-500">
                      <span className="font-semibold text-stone-700 dark:text-stone-200">
                        Sem concelho, a maioria das hipóteses fica sem leitura de concorrência.
                      </span>{" "}
                      Com ele, essa leitura existe em cerca de três em cada quatro — a densidade de operadores
                      compara-se entre os 308 concelhos em vez das nove regiões. Continua a não ser morada: é
                      uma escolha de uma lista, e não sai daqui.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
            <Campo rotulo="Alcance">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["concelho", "O meu concelho"],
                    ["regiao", "A minha região"],
                    ["nacional", "Todo o país"],
                    ["online", "Só online"],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <Opcao
                    key={valor}
                    ativo={contexto.localizacao.alcance === valor}
                    onClick={() => alterar({ localizacao: { ...contexto.localizacao, alcance: valor } })}
                  >
                    {rotulo}
                  </Opcao>
                ))}
              </div>
            </Campo>
          </div>

          {mostrar("personalizado") ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Território">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["urbano", "Urbano"],
                      ["suburbano", "Suburbano"],
                      ["rural", "Rural"],
                    ] as const
                  ).map(([valor, rotulo]) => (
                    <Opcao
                      key={valor}
                      ativo={contexto.localizacao.territorio === valor}
                      onClick={() =>
                        alterar({
                          localizacao: {
                            ...contexto.localizacao,
                            territorio: contexto.localizacao.territorio === valor ? undefined : valor,
                          },
                        })
                      }
                    >
                      {rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
              <Campo rotulo="Raio que aceitas percorrer" nota="Deixa vazio se não for relevante.">
                <div className="flex flex-wrap gap-1.5">
                  {[10, 25, 40, 80].map((km) => (
                    <Opcao
                      key={km}
                      ativo={contexto.localizacao.raioKm === km}
                      onClick={() =>
                        alterar({
                          localizacao: {
                            ...contexto.localizacao,
                            raioKm: contexto.localizacao.raioKm === km ? undefined : km,
                          },
                        })
                      }
                    >
                      {km} km
                    </Opcao>
                  ))}
                </div>
              </Campo>
            </div>
          ) : null}
        </Seccao>

        {/* ── 3. O que tens ───────────────────────────────────── */}
        <Seccao titulo="O que já tens" icone={Wallet} {...props("recursos")}>
          <Campo
            rotulo="Capital disponível"
            nota="Elimina modelos que não arrancam com o que tens, em vez de os mostrar em nono lugar."
          >
            <div className="flex flex-wrap gap-1.5">
              {FAIXAS_CAPITAL.map((faixa) => (
                <Opcao
                  key={faixa.rotulo}
                  ativo={contexto.capital.disponivelAgora === faixa.valor}
                  onClick={() =>
                    alterar({
                      capital: {
                        ...contexto.capital,
                        disponivelAgora: faixa.valor,
                        precisaComecarSemCapital: faixa.valor === 200 ? true : undefined,
                      },
                    })
                  }
                >
                  {faixa.rotulo}
                </Opcao>
              ))}
            </div>
          </Campo>

          <div className="mt-4">
            <Campo rotulo="Meios que já tens">
              <ListaFiltravel
                nome="meios"
                singular="meio"
                plural="meios"
                opcoes={ATIVOS_FILTRAVEIS}
                grupos={GRUPOS_ATIVOS}
                escolhidas={ativosEscolhidos}
                onAlternar={(id) => alterar({ ativos: alternarLista(contexto.ativos, id as AtivoId) })}
                descricoes={descricoes}
                intro={
                  <p className="mb-2 text-[11px] leading-snug text-stone-500">
                    Uma carrinha ou um terreno abrem hipóteses que não existem sem eles.
                  </p>
                }
              />
            </Campo>
          </div>

          {mostrar("personalizado") ? (
            <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
              <EscolhaChip
                ativo={contexto.capital.aberturaCredito === true}
                onClick={() =>
                  alterar({
                    capital: { ...contexto.capital, aberturaCredito: !contexto.capital.aberturaCredito },
                  })
                }
                rotulo="Aceito recorrer a crédito"
                nota="Alarga o teto de capital de forma declarada — não o torna ilimitado."
              />
              <EscolhaChip
                ativo={contexto.capital.aberturaInvestidores === true}
                onClick={() =>
                  alterar({
                    capital: {
                      ...contexto.capital,
                      aberturaInvestidores: !contexto.capital.aberturaInvestidores,
                    },
                  })
                }
                rotulo="Aceito investidores"
                nota="Muda a ambição possível, e a quem prestas contas."
              />
            </div>
          ) : null}
        </Seccao>

        {/* ── 4. Tempo e equipa ───────────────────────────────── */}
        <Seccao titulo="Tempo e equipa" icone={Clock} {...props("tempo")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Dedicação">
              <div className="flex flex-wrap gap-1.5">
                {DEDICACOES.map((item) => (
                  <Opcao
                    key={item.id}
                    ativo={contexto.tempo.dedicacao === item.id}
                    onClick={() =>
                      alterar({ tempo: { ...contexto.tempo, dedicacao: item.id, horasSemana: undefined } })
                    }
                  >
                    {item.rotulo}
                  </Opcao>
                ))}
              </div>
            </Campo>
            <Campo rotulo="Com quem">
              <div className="flex flex-wrap gap-1.5">
                {EQUIPAS.map((item) => (
                  <Opcao
                    key={item.id}
                    ativo={contexto.equipa.forma === item.id}
                    onClick={() => alterar({ equipa: { ...contexto.equipa, forma: item.id, pessoas: undefined } })}
                  >
                    {item.rotulo}
                  </Opcao>
                ))}
              </div>
            </Campo>
          </div>

          {mostrar("personalizado") ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo
                rotulo="Prazo até à primeira receita"
                nota="Descarta o que só paga daqui a um ano quando aguentas três meses."
              >
                <div className="flex flex-wrap gap-1.5">
                  {PRAZOS_RECEITA.map((item) => (
                    <Opcao
                      key={item.rotulo}
                      ativo={contexto.tempo.prazoMaxPrimeiraReceitaMeses === item.meses}
                      onClick={() =>
                        alterar({ tempo: { ...contexto.tempo, prazoMaxPrimeiraReceitaMeses: item.meses } })
                      }
                    >
                      {item.rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
              <div className="self-end">
                <EscolhaChip
                  ativo={contexto.equipa.disponibilidadeContratar === true}
                  onClick={() =>
                    alterar({
                      equipa: {
                        ...contexto.equipa,
                        disponibilidadeContratar: !contexto.equipa.disponibilidadeContratar,
                      },
                    })
                  }
                  rotulo="Aceito contratar"
                  nota="Abre modelos que uma pessoa sozinha não consegue operar."
                />
              </div>
            </div>
          ) : null}
        </Seccao>

        {/* ── 5. Que negócio aceitas ──────────────────────────── */}
        {mostrar("personalizado") ? (
          <Seccao titulo="Que tipo de negócio aceitas" icone={Search} {...props("preferencias")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Quem compra">
                <div className="flex flex-wrap gap-1.5">
                  {MERCADOS.map((item) => (
                    <Opcao
                      key={item.id}
                      ativo={contexto.preferencias.mercado === item.id}
                      onClick={() => alterar({ preferencias: { ...contexto.preferencias, mercado: item.id } })}
                    >
                      {item.rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
              <Campo rotulo="Formato">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["fisico", "Presencial"],
                      ["hibrido", "Tanto faz"],
                      ["digital", "À distância"],
                    ] as const
                  ).map(([valor, rotulo]) => (
                    <Opcao
                      key={valor}
                      ativo={contexto.preferencias.formato === valor}
                      onClick={() => alterar({ preferencias: { ...contexto.preferencias, formato: valor } })}
                    >
                      {rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
              <Campo rotulo="Receita que preferes">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["indiferente", "Tanto faz"],
                      ["recorrente", "Recorrente"],
                      ["pontual", "Por trabalho"],
                      ["contratos", "Contratos"],
                    ] as const
                  ).map(([valor, rotulo]) => (
                    <Opcao
                      key={valor}
                      ativo={contexto.preferencias.receita === valor}
                      onClick={() => alterar({ preferencias: { ...contexto.preferencias, receita: valor } })}
                    >
                      {rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
              <Campo rotulo="Com quem gostas de trabalhar">
                <div className="flex flex-wrap gap-1.5">
                  {PUBLICOS.map((item) => (
                    <Opcao
                      key={item.id}
                      ativo={contexto.preferencias.publicosPreferidos.includes(item.id)}
                      onClick={() =>
                        alterar({
                          preferencias: {
                            ...contexto.preferencias,
                            publicosPreferidos: alternarLista(
                              contexto.preferencias.publicosPreferidos,
                              item.id as PublicoAlvo,
                            ),
                          },
                        })
                      }
                    >
                      {item.rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
            </div>

            {mostrar("avancado") ? (
              <div className="mt-4">
                <Campo rotulo="Setores que te interessam" nota="Vazio = todos. Escolher restringe a sério.">
                  <div className="flex flex-wrap gap-1.5">
                    {SETORES_OFERECIDOS.map((setor) => (
                      <Opcao
                        key={setor.id}
                        ativo={contexto.preferencias.setoresPreferidos.includes(setor.id)}
                        onClick={() =>
                          alterar({
                            preferencias: {
                              ...contexto.preferencias,
                              setoresPreferidos: alternarLista(contexto.preferencias.setoresPreferidos, setor.id),
                            },
                          })
                        }
                      >
                        {setor.rotulo}
                      </Opcao>
                    ))}
                  </div>
                </Campo>
              </div>
            ) : null}
          </Seccao>
        ) : null}

        {/* ── 6. Restrições ───────────────────────────────────── */}
        {mostrar("personalizado") ? (
          <Seccao titulo="O que não queres ou não podes" icone={Lock} {...props("limites")}>
            <p className="mb-3 text-[11px] leading-relaxed text-stone-500">
              Estas não são preferências fracas:{" "}
              <strong className="font-semibold text-stone-700 dark:text-stone-200">eliminam</strong>. O
              motor passa a recusar em vez de ordenar, e diz-te o que recusou e porquê.
            </p>
            <ListaFiltravel
              nome="limites"
              singular="recusa"
              plural="recusas"
              opcoes={RESTRICOES_FILTRAVEIS}
              grupos={GRUPOS_RESTRICOES}
              escolhidas={restricoesEscolhidas}
              onAlternar={(id) =>
                alterar({ restricoes: alternarLista(contexto.restricoes, id as RestricaoId) })
              }
              descricoes={descricoes}
            />
          </Seccao>
        ) : null}

        {/* ── 7. Risco e rendimento ───────────────────────────── */}
        {mostrar("avancado") ? (
          <Seccao titulo="Risco e rendimento" icone={Scale} {...props("risco")}>
            <Campo rotulo="Perfil geral de risco">
              <div className="flex flex-wrap gap-1.5">
                {PERFIS_RISCO.map((item) => (
                  <Opcao
                    key={item.id}
                    ativo={contexto.risco.perfil === item.id}
                    onClick={() => alterar({ risco: { ...contexto.risco, perfil: item.id } })}
                  >
                    {item.rotulo}
                  </Opcao>
                ))}
              </div>
            </Campo>

            <div className="mt-4">
              <Campo
                rotulo="Tolerância por dimensão"
                nota="Uma etiqueta só esconde que podes aceitar receita volátil e não aceitar risco regulatório nenhum."
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {DIMENSOES_RISCO.map((dimensao) => (
                    <div key={dimensao} className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor={`risco-${dimensao}`}
                        className="min-w-[7rem] flex-1 text-[12px] text-stone-600 dark:text-stone-300"
                      >
                        {ROTULO_RISCO[dimensao]}
                      </label>
                      <select
                        id={`risco-${dimensao}`}
                        value={contexto.risco.toleranciaPorDimensao?.[dimensao] ?? ""}
                        onChange={(evento) => {
                          const valor = evento.target.value as PerfilRisco | "";
                          const proximo = { ...(contexto.risco.toleranciaPorDimensao ?? {}) };
                          if (valor === "") delete proximo[dimensao];
                          else proximo[dimensao] = valor;
                          alterar({
                            risco: {
                              ...contexto.risco,
                              toleranciaPorDimensao: Object.keys(proximo).length > 0 ? proximo : undefined,
                            },
                          });
                        }}
                        className="h-10 max-w-full rounded-xl border border-stone-200 bg-white px-2 text-[11px] font-semibold text-stone-600 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300"
                      >
                        <option value="">Como o perfil geral</option>
                        {PERFIS_RISCO.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.rotulo}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </Campo>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo rotulo="O que queres deste negócio">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["complemento", "Complemento"],
                      ["substituir-salario", "Substituir salário"],
                      ["crescer", "Crescer"],
                      ["escalar", "Empresa escalável"],
                    ] as const
                  ).map(([valor, rotulo]) => (
                    <Opcao
                      key={valor}
                      ativo={contexto.rendimento.ambicao === valor}
                      onClick={() => alterar({ rendimento: { ...contexto.rendimento, ambicao: valor } })}
                    >
                      {rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
              <Campo rotulo="Mínimo mensal que precisas de tirar">
                <div className="flex flex-wrap gap-1.5">
                  {[undefined, 500, 1000, 1500, 2500].map((valor) => (
                    <Opcao
                      key={String(valor)}
                      ativo={contexto.rendimento.minimoMensal === valor}
                      onClick={() => alterar({ rendimento: { ...contexto.rendimento, minimoMensal: valor } })}
                    >
                      {valor === undefined ? "Ainda não sei" : `${valor.toLocaleString("pt-PT")} €`}
                    </Opcao>
                  ))}
                </div>
              </Campo>
            </div>
          </Seccao>
        ) : null}
      </div>

      {/* ══ Coluna lateral — o perfil a formar-se ═════════════════ */}
      <aside className="lg:col-span-4">
        <div className="lg:sticky lg:top-24">
          <ResumoDoPerfil
            contexto={contexto}
            profundidade={profundidade}
            onDescobrir={onDescobrir}
            onRepor={onRepor}
            jaAnalisou={jaAnalisou}
            onIrPara={irPara}
            onAbrirNivel={() => setNivel(nivel === "essencial" ? "personalizado" : "avancado")}
            nivel={nivel}
          />
        </div>
      </aside>
    </div>
  );
}

/** Um botão de texto com ícone — as ações de leitura, não de resposta. */
function BotaoDiscreto({
  onClick,
  icone: Icone,
  pressionado,
  children,
}: {
  onClick: () => void;
  icone: ComponentType<{ size?: number; className?: string }>;
  pressionado?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...(pressionado === undefined ? {} : { "aria-pressed": pressionado })}
      className="inline-flex min-h-[38px] items-center gap-1.5 text-[11px] font-semibold text-stone-500 transition-colors hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-400 dark:hover:text-brand-mint"
    >
      <Icone size={13} className="flex-none" />
      {children}
    </button>
  );
}

/**
 * O perfil a formar-se — e nenhum cartão de negócio à vista.
 *
 * Ponto 7 do pedido: durante a configuração pode mostrar-se o perfil a
 * ganhar forma, mas não começar a despejar resultados. Esta caixa é
 * exatamente isso, e o botão que a fecha é o que inicia o motor.
 *
 * «O que mais mudaria o resultado» deixou de ser texto para ler: cada
 * linha é o atalho para a pergunta que falta, e abre o nível onde ela
 * vive. Dizer a alguém que a tolerância ao risco muda a resposta, e
 * deixá-la à procura da secção, era meio aviso.
 */
function ResumoDoPerfil({
  contexto,
  profundidade,
  onDescobrir,
  onRepor,
  jaAnalisou,
  onIrPara,
  onAbrirNivel,
  nivel,
}: {
  contexto: OpportunityContext;
  profundidade: Profundidade;
  onDescobrir: () => void;
  onRepor: () => void;
  jaAnalisou: boolean;
  onIrPara: (campoId: string) => void;
  onAbrirNivel: () => void;
  nivel: NivelConfiguracao;
}) {
  const zona = MARKET_REGIONS.find((item) => item.id === contexto.localizacao.regiao)?.label ?? "";
  const linhas: readonly [string, string][] = [
    [
      "Sabes fazer",
      contexto.competencias.length === 0
        ? "por responder"
        : plural(contexto.competencias.length, "competência", "competências"),
    ],
    ["Zona", zona],
    [
      "Capital",
      contexto.capital.disponivelAgora === undefined
        ? "por declarar"
        : `até ${contexto.capital.disponivelAgora.toLocaleString("pt-PT")} €`,
    ],
    [
      "Meios",
      contexto.ativos.length === 0 ? "nenhum declarado" : plural(contexto.ativos.length, "meio", "meios"),
    ],
    ["Tempo", DEDICACOES.find((item) => item.id === contexto.tempo.dedicacao)?.rotulo ?? ""],
    ["Restrições", contexto.restricoes.length === 0 ? "nenhuma" : `${contexto.restricoes.length} declaradas`],
    ["Risco", PERFIS_RISCO.find((item) => item.id === contexto.risco.perfil)?.rotulo ?? ""],
  ];

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
      <h2 className="font-display text-base font-semibold text-ink">O teu perfil está a formar-se</h2>

      <div className="mt-3">
        <BarraProfundidade percentagem={profundidade.percentagem} />
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-stone-100 pt-3 dark:border-stone-800">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex items-baseline justify-between gap-2 text-[12px]">
            <dt className="flex-none text-stone-500">{rotulo}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-stone-700 dark:text-stone-200">
              {valor}
            </dd>
          </div>
        ))}
      </dl>

      {profundidade.emFalta.length > 0 ? (
        <div className="mt-4 border-t border-stone-100 pt-3 dark:border-stone-800">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            O que mais mudaria o resultado
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {profundidade.emFalta.slice(0, 3).map((campo) => (
              <li key={campo.id}>
                <button
                  type="button"
                  onClick={() => onIrPara(campo.id)}
                  className="flex min-h-[38px] w-full items-start gap-1.5 rounded-xl px-2 py-1.5 text-left text-[11px] leading-snug text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-stone-800/60 dark:hover:text-stone-300"
                >
                  <Plus size={12} className="mt-0.5 flex-none text-brand" />
                  <span>
                    <strong className="font-semibold text-stone-700 dark:text-stone-200">
                      {campo.rotulo}
                    </strong>{" "}
                    — {campo.efeito}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {nivel !== "avancado" ? (
            <button
              type="button"
              onClick={onAbrirNivel}
              className="mt-1 inline-flex min-h-[38px] items-center gap-1 px-2 text-[11px] font-semibold text-brand-dark hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-brand-mint"
            >
              Abrir mais perguntas <ChevronDown size={12} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 space-y-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        <button
          type="button"
          onClick={onDescobrir}
          disabled={!profundidade.suficienteParaCorrer}
          className="btn-shine inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-card transition-shadow hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
        >
          {jaAnalisou ? "Voltar a analisar" : "Descobrir oportunidades"} <ArrowRight size={15} />
        </button>
        {!profundidade.suficienteParaCorrer ? (
          <p className="text-[11px] leading-snug text-stone-500">
            Escolhe pelo menos uma coisa que sabes fazer. Sem isso o motor não tem por onde começar —
            e preferimos dizer isto a devolver uma lista genérica.
          </p>
        ) : (
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-stone-500">
            <Check size={12} className="mt-0.5 flex-none text-brand" />
            Já dá para correr. Cada resposta que acrescentares muda o que sai — e o que é descartado.
          </p>
        )}
        <button
          type="button"
          onClick={onRepor}
          className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 text-[11px] font-semibold text-stone-600 hover:border-brand/60 hover:text-brand-dark dark:border-stone-700 dark:text-stone-300"
        >
          <RotateCcw size={12} /> Recomeçar
        </button>
      </div>

      <p className="mt-3 flex items-start gap-1.5 border-t border-stone-100 pt-3 text-[11px] leading-snug text-stone-500 dark:border-stone-800">
        <Lock size={12} className="mt-0.5 flex-none text-brand" />
        <span>
          <Chip>Local</Chip> Nada disto sai do dispositivo. O perfil só é guardado se carregares em
          «Guardar o meu perfil», depois da análise.
        </span>
      </p>
    </div>
  );
}
