"use client";

// Primitivas partilhadas pelo motor de descoberta. Vivem aqui para os
// componentes grandes ficarem legíveis e para o estilo não divergir entre
// a fase de configuração e a de resultados.

import { useId, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Check, ChevronDown, Close, Filter, Plus, Search } from "@/components/ui/Icons";

export function Chip({ children, tom = "neutro" }: { children: ReactNode; tom?: "neutro" | "marca" | "aviso" | "risco" }) {
  const cor = {
    neutro: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
    marca: "bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint",
    aviso: "bg-alert-bg text-alert-text",
    risco: "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200",
  }[tom];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cor}`}>
      {children}
    </span>
  );
}

/** Botão de escolha única. Alvo ≥ 38 px, foco visível, `aria-pressed`. */
export function Opcao({
  ativo,
  onClick,
  children,
  largura = "auto",
}: {
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
  largura?: "auto" | "cheia";
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`min-h-[38px] rounded-xl border px-3 text-[12px] font-semibold leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        largura === "cheia" ? "flex-1" : ""
      } ${
        ativo
          ? "border-brand bg-brand text-white"
          : "border-stone-200 bg-white text-stone-600 hover:border-brand/60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
      }`}
    >
      {children}
    </button>
  );
}

export function Campo({ rotulo, nota, children }: { rotulo: string; nota?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        {rotulo}
      </legend>
      {children}
      {nota ? <p className="mt-1.5 text-[11px] leading-snug text-stone-500">{nota}</p> : null}
    </fieldset>
  );
}

/**
 * A barra de profundidade.
 *
 * Nunca chamada «precisão»: é a fração das respostas que existem, e o
 * rótulo di-lo. Uma barra chamada precisão sugeria que a resposta está
 * 82 % certa, que é outra coisa e não é verdade.
 */
export function BarraProfundidade({ percentagem }: { percentagem: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          Quanto já conhecemos do teu cenário
        </span>
        <span className="text-[12px] font-semibold tabular-nums text-ink">{percentagem}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percentagem}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profundidade do contexto"
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${Math.max(2, percentagem)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * O intervalo da pontuação, desenhado.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ PORQUE UMA BARRA E NÃO SÓ «Entre 69 e 82»                           │
 * │                                                                    │
 * │ A orientação da Government Analysis Function e do ONS sobre        │
 * │ comunicar incerteza é explícita: intervalos, faixas de densidade e │
 * │ curvas comunicam melhor do que descrições textuais — e qualquer    │
 * │ delas é melhor do que não comunicar. O texto fica na mesma, porque │
 * │ a mesma orientação diz que a forma narrativa é o que torna isto    │
 * │ acessível a quem não lê intervalos.                                 │
 * │                                                                    │
 * │ Por isso: a faixa mostra o que não sabemos, o traço mostra a       │
 * │ melhor estimativa, e o `aria-label` diz as três coisas por         │
 * │ palavras, para quem usa leitor de ecrã receber a mesma informação  │
 * │ e não uma barra muda.                                               │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Quando o intervalo fecha, a faixa colapsa e fica só o traço — que é a
 * recompensa visível por termos conseguido avaliar tudo.
 */
export function BarraDeIntervalo({
  min,
  ponto,
  max,
  fechado,
}: {
  min: number;
  ponto: number;
  max: number;
  fechado: boolean;
}) {
  const limitar = (valor: number) => Math.max(0, Math.min(100, valor));
  const inicio = limitar(Math.min(min, ponto));
  const fim = limitar(Math.max(max, ponto));
  const largura = Math.max(fim - inicio, 0);

  const descricao = fechado
    ? `Pontuação ${ponto} em 100, sem margem por apurar.`
    : `Pontuação entre ${min} e ${max} em 100, com melhor estimativa ${ponto}. A faixa é o que ainda não foi possível avaliar.`;

  return (
    <span role="img" aria-label={descricao} className="block">
      <span
        aria-hidden="true"
        className="relative block h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
      >
        {/* A faixa do que não sabemos. Sem ela, o traço sozinho mentiria. */}
        {!fechado && largura > 0 ? (
          <span
            className="absolute inset-y-0 rounded-full bg-brand-light dark:bg-brand/25"
            style={{ left: `${inicio}%`, width: `${largura}%` }}
          />
        ) : null}
        {/* A melhor estimativa. 2 px de traço, preso dentro da barra. */}
        <span
          className="absolute inset-y-0 w-0.5 rounded-full bg-brand"
          style={{ left: `calc(${limitar(ponto)}% - 1px)` }}
        />
      </span>
    </span>
  );
}

/** Uma linha de barra para uma dimensão do score. `null` = não avaliada. */
export function LinhaDimensao({
  rotulo,
  valor,
  explicacao,
}: {
  rotulo: string;
  valor: number | null;
  /**
   * O que a dimensão mede.
   *
   * Um rótulo como «Exequibilidade» com uma barra ao lado não é uma
   * explicação — e este painel chama-se «Como chegámos a esta
   * conclusão?». A frase vive no motor (`EXPLICACAO_DIMENSAO`) para não
   * poder divergir do que a aritmética faz.
   */
  explicacao?: string;
}) {
  return (
    <li className="text-[12px]">
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-stone-600 dark:text-stone-300">{rotulo}</span>
        {valor === null ? (
          <span className="flex-none text-[11px] italic text-stone-400">sem base para avaliar</span>
        ) : (
          <>
            <span aria-hidden="true" className="h-1.5 w-16 flex-none overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${valor}%` }} />
            </span>
            <span className="w-8 flex-none text-right tabular-nums text-stone-500">{valor}</span>
          </>
        )}
      </span>
      {explicacao ? (
        <span className="mt-0.5 block pr-[6.5rem] text-[11px] leading-snug text-stone-400">{explicacao}</span>
      ) : null}
    </li>
  );
}

/**
 * Uma escolha múltipla compacta.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ PORQUE A DESCRIÇÃO É OPCIONAL E NÃO OBRIGATÓRIA                     │
 * │                                                                    │
 * │ A versão anterior desenhava sempre duas linhas — rótulo e nota — e │
 * │ vinte e duas competências passavam a quarenta e quatro linhas de   │
 * │ texto antes da primeira decisão. As notas são boas («não é          │
 * │ bricolage» evita que alguém se declare eletricista), mas todas ao  │
 * │ mesmo tempo são um muro.                                           │
 * │                                                                    │
 * │ Sem `nota` isto é uma pastilha de uma linha; com `nota` volta a    │
 * │ ser o cartão de antes. Quem desenha decide, por secção, e a pessoa │
 * │ pede as descrições quando quiser.                                  │
 * └────────────────────────────────────────────────────────────────────┘
 */
export function EscolhaChip({
  ativo,
  onClick,
  rotulo,
  nota,
}: {
  ativo: boolean;
  onClick: () => void;
  rotulo: string;
  nota?: string;
}) {
  const marca = (
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 flex-none items-center justify-center rounded-md transition-colors ${
        ativo ? "bg-brand text-white" : "bg-stone-100 text-stone-400 dark:bg-stone-800"
      }`}
    >
      {ativo ? <Check size={10} /> : <Plus size={10} />}
    </span>
  );

  if (!nota) {
    return (
      <button
        type="button"
        aria-pressed={ativo}
        onClick={onClick}
        className={`inline-flex min-h-[38px] max-w-full items-center gap-1.5 rounded-full border px-3 text-left text-[12px] font-semibold leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
          ativo
            ? "border-brand bg-brand-light text-brand-deep dark:border-brand/40 dark:bg-brand/15 dark:text-brand-mint"
            : "border-stone-200 bg-white text-stone-600 hover:border-brand/60 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
        }`}
      >
        {marca}
        <span className="min-w-0">{rotulo}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`flex min-h-[42px] w-full items-start gap-2 rounded-xl border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        ativo
          ? "border-brand bg-brand-light/60 dark:border-brand/40 dark:bg-brand/10"
          : "border-stone-200 bg-white hover:border-brand/50 dark:border-stone-700 dark:bg-stone-900"
      }`}
    >
      <span className="mt-0.5">{marca}</span>
      <span className="min-w-0">
        <span
          className={`block text-[12px] font-semibold leading-tight ${
            ativo ? "text-brand-deep dark:text-brand-mint" : "text-stone-700 dark:text-stone-200"
          }`}
        >
          {rotulo}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-stone-500">{nota}</span>
      </span>
    </button>
  );
}

/**
 * Um grupo de escolhas com nome — a categoria dentro da secção.
 *
 * O contador não é enfeite: com o grupo cheio de pastilhas iguais, é a
 * única maneira de saber de relance onde já se respondeu.
 */
export function GrupoEscolhas({
  rotulo,
  escolhidas,
  detalhado = false,
  children,
}: {
  rotulo: string;
  escolhidas: number;
  /** `true` quando as escolhas mostram descrição e pedem uma grelha. */
  detalhado?: boolean;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-label={rotulo}>
      <p className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">
          {rotulo}
        </span>
        {escolhidas > 0 ? (
          <span className="rounded-full bg-brand-light px-1.5 text-[10px] font-semibold tabular-nums text-brand-deep dark:bg-brand/15 dark:text-brand-mint">
            {escolhidas}
          </span>
        ) : null}
      </p>
      <div className={detalhado ? "grid gap-1.5 sm:grid-cols-2" : "flex flex-wrap gap-1.5"}>
        {children}
      </div>
    </div>
  );
}

/**
 * A secção do configurador — dobrável, e com o que já respondeste à vista
 * quando está fechada.
 *
 * Sem `onAlternar` comporta-se como sempre se comportou (cabeçalho fixo,
 * corpo sempre aberto): é o que as superfícies que não são o configurador
 * continuam a usar.
 */
export function Seccao({
  titulo,
  icone: Icone,
  children,
  acao,
  id,
  resumo,
  aberta = true,
  onAlternar,
}: {
  titulo: string;
  icone?: ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
  acao?: ReactNode;
  id?: string;
  /** O que já foi respondido, para a secção fechada dizer alguma coisa. */
  resumo?: string;
  aberta?: boolean;
  onAlternar?: () => void;
}) {
  const cabecalho = (
    <h3 className="font-display flex min-w-0 items-center gap-2 text-base font-semibold text-ink">
      {Icone ? <Icone size={15} className="flex-none text-brand" /> : null}
      <span className="min-w-0">{titulo}</span>
    </h3>
  );

  if (!onAlternar) {
    return (
      <section id={id} className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {cabecalho}
          {acao}
        </div>
        {children}
      </section>
    );
  }

  const corpoId = `${id ?? titulo.replace(/\s+/g, "-").toLowerCase()}-corpo`;

  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-start gap-2 p-2 sm:p-3">
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={aberta}
          aria-controls={corpoId}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-3xl px-2 py-1.5 text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-stone-800/60"
        >
          <span className="min-w-0 flex-1">
            {cabecalho}
            {!aberta && resumo ? (
              <span className="mt-0.5 block truncate text-[11px] leading-snug text-stone-500">{resumo}</span>
            ) : null}
          </span>
          <ChevronDown
            size={16}
            className={`flex-none text-stone-400 transition-transform duration-200 motion-reduce:transition-none ${
              aberta ? "rotate-180" : ""
            }`}
          />
        </button>
        {acao && aberta ? <div className="flex-none self-center pr-1">{acao}</div> : null}
      </div>
      <div id={corpoId} hidden={!aberta} className="px-4 pb-4 sm:px-5 sm:pb-5">
        {children}
      </div>
    </section>
  );
}


// ═══════════════════════════════════════════════════════════════════════
//  LISTA FILTRÁVEL — a mesma gramática de filtros do hub de ferramentas
//  ---------------------------------------------------------------------
//  Agrupar em categorias resolveu a leitura. Não resolveu a procura: com
//  vinte e duas competências, catorze meios e quinze recusas, quem sabe o
//  que quer continua a percorrer tudo com os olhos.
//
//  Isto é o mesmo sistema que o `/ferramentas` já tinha, e de propósito —
//  duas gramáticas de filtro no mesmo site é uma a mais:
//
//   · pesquisa com limpar, que ignora acentos e procura também na
//     descrição («bricolage» encontra «Instalações elétricas»);
//   · filtro de estado — tudo · escolhidas · por escolher;
//   · painel «Filtros» com as categorias, cada uma com a sua contagem, em
//     escolha MÚLTIPLA (o hub é única; aqui somar duas famílias é o caso
//     normal de quem sabe fazer duas coisas diferentes);
//   · contador de filtros ativos no botão, contagem de resultados
//     anunciada (`aria-live`) e «Limpar filtros»;
//   · estado vazio que explica e oferece a saída.
//
//  ── O QUE NUNCA SE FILTRA PARA FORA ────────────────────────────────
//  Uma escolha JÁ FEITA não desaparece por causa de um filtro. Filtrar é
//  para procurar, não para desfazer: se a pessoa filtrasse por «técnica»
//  e a competência que declarou noutra família saísse do ecrã, ficava com
//  um perfil que já não consegue ver nem corrigir — e o contador do
//  painel lateral a discordar do que está à vista. As escolhidas fora do
//  filtro aparecem num grupo próprio, marcado como tal.
// ═══════════════════════════════════════════════════════════════════════

export interface OpcaoFiltravel {
  id: string;
  rotulo: string;
  nota: string;
  /** A categoria a que pertence — família do grafo ou grupo do questionário. */
  grupo: string;
}

/** Sem acentos e em minúsculas: quem escreve «eletrica» procura «elétrica». */
export const semAcentos = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const chipFiltro = (ativo: boolean) =>
  `inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
    ativo
      ? "border-brand bg-brand text-white"
      : "border-stone-200 bg-white text-stone-600 hover:border-brand/60 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
  }`;

export function ListaFiltravel({
  nome,
  singular,
  plural: pluralRotulo,
  opcoes,
  grupos,
  escolhidas,
  onAlternar,
  descricoes = false,
  intro,
}: {
  /** Identificador estável — dá os `id` dos controlos e o âmbito dos testes. */
  nome: string;
  singular: string;
  plural: string;
  opcoes: readonly OpcaoFiltravel[];
  grupos: readonly { id: string; rotulo: string }[];
  escolhidas: ReadonlySet<string>;
  onAlternar: (id: string) => void;
  /** Mostrar a descrição de cada opção (interruptor global do configurador). */
  descricoes?: boolean;
  intro?: ReactNode;
}) {
  const [procura, setProcura] = useState("");
  const [estado, setEstado] = useState<"tudo" | "escolhidas" | "por-escolher">("tudo");
  const [categorias, setCategorias] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [painelAberto, setPainelAberto] = useState(false);
  const idBase = useId().replace(/:/g, "");

  const consulta = semAcentos(procura.trim());
  const nEscolhidas = useMemo(
    () => opcoes.filter((item) => escolhidas.has(item.id)).length,
    [opcoes, escolhidas],
  );

  const encontradas = useMemo(
    () =>
      opcoes.filter(
        (item) =>
          (consulta.length === 0 ||
            semAcentos(item.rotulo).includes(consulta) ||
            semAcentos(item.nota).includes(consulta)) &&
          (estado === "tudo" ||
            (estado === "escolhidas" ? escolhidas.has(item.id) : !escolhidas.has(item.id))) &&
          (categorias.size === 0 || categorias.has(item.grupo)),
      ),
    [opcoes, consulta, estado, categorias, escolhidas],
  );

  // As escolhidas que o filtro deixou de fora — visíveis, e ditas como tal.
  const escondidas = useMemo(
    () => opcoes.filter((item) => escolhidas.has(item.id) && !encontradas.includes(item)),
    [opcoes, escolhidas, encontradas],
  );

  const nFiltros = (consulta.length > 0 ? 1 : 0) + (estado !== "tudo" ? 1 : 0) + categorias.size;

  const limpar = () => {
    setProcura("");
    setEstado("tudo");
    setCategorias(new Set<string>());
  };

  const alternarCategoria = (id: string) =>
    setCategorias((anterior) => {
      const proximo = new Set(anterior);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });

  const desenharGrupo = (grupo: { id: string; rotulo: string }) => {
    const desta = encontradas.filter((item) => item.grupo === grupo.id);
    if (desta.length === 0) return null;
    return (
      <GrupoEscolhas
        key={grupo.id}
        rotulo={grupo.rotulo}
        escolhidas={desta.filter((item) => escolhidas.has(item.id)).length}
        detalhado={descricoes}
      >
        {desta.map((item) => (
          <EscolhaChip
            key={item.id}
            ativo={escolhidas.has(item.id)}
            onClick={() => onAlternar(item.id)}
            rotulo={item.rotulo}
            nota={descricoes ? item.nota : undefined}
          />
        ))}
      </GrupoEscolhas>
    );
  };

  return (
    <div data-lista={nome}>
      {intro}

      {/* ── Pesquisa ─────────────────────────────────────────────── */}
      <label htmlFor={`${idBase}-procura`} className="sr-only">
        Procurar {pluralRotulo}
      </label>
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
        <input
          id={`${idBase}-procura`}
          type="search"
          value={procura}
          onChange={(evento) => setProcura(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Escape" && procura) {
              evento.preventDefault();
              setProcura("");
            }
          }}
          placeholder={`Procurar entre ${opcoes.length} ${pluralRotulo}…`}
          aria-describedby={`${idBase}-contagem`}
          className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-10 text-[12px] text-ink placeholder:text-stone-400 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
        />
        {procura ? (
          <button
            type="button"
            onClick={() => setProcura("")}
            aria-label={`Limpar a procura em ${pluralRotulo}`}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-stone-800"
          >
            <Close size={14} />
          </button>
        ) : null}
      </div>

      {/* ── Estado + porta dos filtros por categoria ─────────────── */}
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Filtrar ${pluralRotulo}`}>
        {(
          [
            ["tudo", "Tudo"],
            ["escolhidas", `Escolhidas${nEscolhidas > 0 ? ` (${nEscolhidas})` : ""}`],
            ["por-escolher", "Por escolher"],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={estado === valor}
            onClick={() => setEstado(valor)}
            className={chipFiltro(estado === valor)}
          >
            {rotulo}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPainelAberto((anterior) => !anterior)}
          aria-expanded={painelAberto}
          aria-controls={`${idBase}-categorias`}
          className={chipFiltro(false)}
        >
          <Filter size={13} />
          Categorias
          {categorias.size > 0 ? (
            <span className="rounded-full bg-brand px-1.5 text-[10px] font-bold tabular-nums text-white">
              {categorias.size}
            </span>
          ) : null}
        </button>
      </div>

      <div
        id={`${idBase}-categorias`}
        hidden={!painelAberto}
        className="mt-2 rounded-2xl border border-stone-100 bg-cream/70 p-3 dark:border-stone-800 dark:bg-stone-950/40"
      >
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">
          Categorias — podes somar mais do que uma
        </p>
        <div className="flex flex-wrap gap-1.5">
          {grupos.map((grupo) => {
            const total = opcoes.filter((item) => item.grupo === grupo.id).length;
            return (
              <button
                key={grupo.id}
                type="button"
                aria-pressed={categorias.has(grupo.id)}
                onClick={() => alternarCategoria(grupo.id)}
                className={chipFiltro(categorias.has(grupo.id))}
              >
                {grupo.rotulo} <span className="font-normal tabular-nums opacity-60">{total}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contagem anunciada + limpar ──────────────────────────── */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p id={`${idBase}-contagem`} aria-live="polite" className="text-[11px] text-stone-500">
          {nFiltros === 0
            ? `${opcoes.length} ${pluralRotulo}`
            : `${encontradas.length} de ${opcoes.length} ${encontradas.length === 1 ? singular : pluralRotulo}`}
        </p>
        {nFiltros > 0 ? (
          <button
            type="button"
            onClick={limpar}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-xl px-2 text-[11px] font-semibold text-brand-dark transition-colors hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-brand-mint dark:hover:bg-brand/10"
          >
            <Close size={12} /> Limpar filtros
          </button>
        ) : null}
      </div>

      {/* ── As opções, por categoria ─────────────────────────────── */}
      <div className="mt-3 space-y-3">
        {grupos.map(desenharGrupo)}

        {encontradas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 px-3 py-5 text-center dark:border-stone-700">
            <p className="text-[12px] font-semibold text-stone-700 dark:text-stone-200">
              Nada corresponde a esta procura.
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[11px] leading-snug text-stone-500">
              As {opcoes.length} {pluralRotulo} são largas de propósito — procura a mais próxima do
              que fazes, ou limpa os filtros.
            </p>
            <button
              type="button"
              onClick={limpar}
              className="mt-2.5 inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Limpar filtros <Close size={12} />
            </button>
          </div>
        ) : null}

        {escondidas.length > 0 ? (
          <div className="rounded-2xl border border-brand/25 bg-brand-light/40 p-2.5 dark:border-brand/25 dark:bg-brand/10">
            <GrupoEscolhas
              rotulo={`Já escolheste, fora deste filtro (${escondidas.length})`}
              escolhidas={escondidas.length}
              detalhado={descricoes}
            >
              {escondidas.map((item) => (
                <EscolhaChip
                  key={item.id}
                  ativo
                  onClick={() => onAlternar(item.id)}
                  rotulo={item.rotulo}
                  nota={descricoes ? item.nota : undefined}
                />
              ))}
            </GrupoEscolhas>
          </div>
        ) : null}
      </div>
    </div>
  );
}
