"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A MOLDURA CANÓNICA — a mesma sempre, e o conteúdo é que muda
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O QUE ESTA SUPERFÍCIE É, E O QUE NUNCA PODE VOLTAR A SER             │
//  │                                                                     │
//  │ É uma REGIÃO que cresce dentro do documento: sem véu, sem foco       │
//  │ preso, sem `aria-modal`, sem portal e sem bloquear o scroll. O herói │
//  │ continua visível por baixo e a página continua clicável. Tudo isso   │
//  │ já era verdade no painel e continua a ser — esta moldura acrescenta  │
//  │ conteúdo, não uma segunda arquitectura.                              │
//  │                                                                     │
//  │ São regressões de conceito, e estão escritas aqui porque cada uma    │
//  │ delas já foi proposta a sério em algum momento: transformar isto num │
//  │ bilhete, abrir um popup, esconder o herói, criar bolhas de conversa, │
//  │ pôr um avatar de «IA», mostrar cinco CTAs com o mesmo peso, ou dizer │
//  │ «pedido claro» quando há ambiguidade.                                │
//  │                                                                     │
//  │ A hierarquia é uma só e não se negoceia:                             │
//  │                                                                     │
//  │   1. a consulta        4. uma eventual confirmação                   │
//  │   2. a interpretação   5. alternativas                               │
//  │   3. UMA ação          6. apoio profissional                         │
//  │                                                                     │
//  │ É esta ordem que impede a superfície de voltar a ser o mini-painel   │
//  │ de controlo de quinze destinos que o ponto P1-04 desmontou.          │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  MOBILE-FIRST: uma coluna a 360 px, duas a partir de `lg`. Os alvos têm
//  36 px de altura mínima e o texto pequeno usa `.texto-mini`, que é 12px
//  no telemóvel — o piso que o `movel:e2e` mede.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { ROTULO_DOMINIO } from "@/lib/busca/esquema";
import { OPCAO_NAO_SEI_ID, type AcaoPreparada, type CodigoExplicacao, type PlanoBusca } from "@/lib/busca/plano";
import {
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  Lightbulb,
  Lock,
  Clock,
  ShieldCheck,
  User,
} from "@/components/ui/Icons";
import type { ControladorBusca } from "./useControladorBusca";

/* ─── Vocabulário ─────────────────────────────────────────────────── */

/**
 * O verbo do botão principal — um por forma de apresentar.
 *
 * `Record` sobre a união fechada: um renderer novo sem verbo não compila.
 * Um `?? "Abrir"` teria deixado a interface a dizer «Abrir» a coisas que
 * merecem um verbo próprio, e ninguém daria por isso.
 */
const VERBO: Record<AcaoPreparada["renderer"], string> = {
  prepared_tool: "Abrir o simulador",
  comparison: "Comparar",
  obligation: "Ver as datas",
  guide: "Ler o guia",
  direct_route: "Abrir",
  professional_support: "Ver contabilistas",
};

/**
 * As explicações, em português e sem jargão.
 *
 * O plano transporta CÓDIGOS — verificáveis, testáveis, estáveis. Esta é a
 * tradução para quem lê, e vive junto do desenho porque é copy. Se um
 * código não tiver frase, não aparece: mais vale explicar menos do que
 * mostrar `MATCH_EXACT_TOOL` a uma pessoa.
 */
const EXPLICACAO: Partial<Record<CodigoExplicacao, string>> = {
  DOMAIN_MATCH: "A pergunta nomeia esta família de decisão.",
  INTENT_SIMULATE: "Pediste um cálculo, não uma explicação.",
  INTENT_COMPLY: "Pediste um prazo ou um procedimento.",
  INTENT_UNDERSTAND: "Pediste para perceber uma regra.",
  ENTITY_AMOUNT: "Reconhecemos um valor na frase.",
  ENTITY_PERIOD: "Reconhecemos a periodicidade.",
  ENTITY_YEAR: "Reconhecemos o ano.",
  ENTITY_REGIME: "Reconhecemos o tema fiscal.",
  ENTITY_LOCATION: "Reconhecemos o distrito.",
  COMPARISON_DETECTED: "A frase compara duas alternativas.",
  PROFESSIONAL_HELP_REQUESTED: "Pediste ajuda profissional.",
  CLARIFICATION_ANSWERED: "Usámos a tua resposta à pergunta acima.",
  LEADING_MARGIN: "Este resultado destaca-se com margem clara dos seguintes.",
  TIED_RESULTS: "Há resultados próximos — por isso não coroámos nenhum.",
  MATCH_EXACT_TOOL: "A ferramenta aceita o contexto que reconhecemos.",
  MATCH_TEXT_ONLY: "A correspondência é pelo texto da pergunta.",
  MISSING_PERIOD: "Falta saber se o valor é mensal ou anual.",
  MISSING_BASIS: "Falta saber qual é a base de comparação.",
  MISSING_TARGET: "Falta saber o que fazer com o valor.",
  NO_MATCH: "Nada no catálogo respondeu com confiança suficiente.",
};

const dataCurta = (iso: string) => {
  const [ano, mes, dia] = iso.split("-");
  return dia ? `${dia}/${mes}/${ano}` : iso;
};

/* ─── A promessa que a barra faz ──────────────────────────────────── */

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ ESTA LINHA SÓ PODE EXISTIR PORQUE É VERDADE                          │
 * │                                                                     │
 * │ O índice é um JSON estático; o reconhecimento, o ranking e o plano   │
 * │ correm no dispositivo; a medição envia baldes e ids do catálogo, e   │
 * │ nunca a frase; o contexto viaja em `sessionStorage` e no endereço    │
 * │ vai um identificador opaco.                                          │
 * │                                                                     │
 * │ Cada uma destas quatro afirmações tem um teste que reprova se        │
 * │ deixar de ser verdadeira (`busca:fronteira`, `busca:handoff`,        │
 * │ `analytics:sem-pii`). Uma promessa de privacidade escrita numa       │
 * │ interface sem nada por baixo é a pior espécie de copy: a que a       │
 * │ pessoa não tem como verificar e nós não temos como cumprir.          │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function NotaPrivacidade() {
  return (
    <p className="texto-mini flex items-center gap-1.5 px-1 text-stone-600 dark:text-stone-400">
      <ShieldCheck size={12} className="flex-none text-brand" aria-hidden />
      <span>
        <span className="font-semibold">Pesquisa global</span> · Tudo fica neste dispositivo
      </span>
    </p>
  );
}

/* ─── Linha de interpretação ──────────────────────────────────────── */

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="texto-micro font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">{children}</p>
  );
}

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ «PEDIDO CLARO» É UMA AFIRMAÇÃO — E TEM DE SER GANHA                  │
 * │                                                                     │
 * │ Só aparece com confiança ALTA, que exige margem clara sobre o        │
 * │ segundo resultado. Em tudo o resto lê-se «pedido reconhecido», que   │
 * │ diz a verdade: percebemos o assunto, não temos a certeza do caminho. │
 * │                                                                     │
 * │ A diferença parece cosmética e não é. Num produto fiscal, uma        │
 * │ interface que diz «claro» sobre um palpite ensina a pessoa a confiar │
 * │ exactamente nas alturas em que não devia.                            │
 * └─────────────────────────────────────────────────────────────────────┘
 */
/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ O VALOR E A PERIODICIDADE SÃO UMA COISA SÓ QUANDO ESTÃO OS DOIS      │
 * │                                                                     │
 * │ «3 500 €» e «por mês» em duas etiquetas separadas lêem-se como dois  │
 * │ dados independentes — e não são: um valor sem periodicidade não quer │
 * │ dizer nada, e é precisamente por isso que a moldura pergunta quando  │
 * │ ela falta. Juntos, formam a grandeza: «3 500 €/mês».                 │
 * └─────────────────────────────────────────────────────────────────────┘
 */
const ABREVIATURA_PERIODO: Record<string, string> = {
  hora: "/hora",
  dia: "/dia",
  mes: "/mês",
  trimestre: "/trimestre",
  ano: "/ano",
};

export function LinhaInterpretacao({ controlador }: { controlador: ControladorBusca }) {
  const { plano, aCorrigir, alternarCorrecao, corrigir } = controlador;
  if (!plano || plano.estado === "sem_caminho") return null;

  const claro = plano.confianca === "alta";

  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ A MESMA PALAVRA DUAS VEZES DIZ QUE NÃO PERCEBEMOS NADA             │
   * │                                                                   │
   * │ «recibos verdes ou empresa» produz «empresa» como TEMA e «empresa» │
   * │ como PERFIL — duas leituras correctas da mesma palavra. Ambas      │
   * │ servem para pontuar; mostradas lado a lado, o que a pessoa lê é    │
   * │ uma interface a repetir-se, e isso não inspira confiança nenhuma   │
   * │ numa linha cujo trabalho é dizer «percebi».                        │
   * │                                                                   │
   * │ Uma etiqueta por texto visível. O que se perde é ruído.            │
   * └───────────────────────────────────────────────────────────────────┘
   */
  const vistos = new Set<string>();
  const partes: { texto: string; removivel: boolean; cru?: string }[] = [];

  if (plano.dominio) {
    partes.push({ texto: ROTULO_DOMINIO[plano.dominio], removivel: false });
    vistos.add(ROTULO_DOMINIO[plano.dominio].toLocaleLowerCase("pt-PT"));
  }

  const periodo = plano.entidades.find((e) => e.tipo === "periodicidade");
  const sufixoPeriodo = periodo ? (ABREVIATURA_PERIODO[String(periodo.valor)] ?? "") : "";

  for (const e of plano.entidades) {
    if (e.tipo === "comparacao") continue;
    // A periodicidade não é uma etiqueta própria: viaja colada ao valor.
    if (e.tipo === "periodicidade" && sufixoPeriodo) continue;
    const texto = e.tipo === "valor" ? `${e.texto} €${sufixoPeriodo}` : (e.rotulo ?? e.texto);
    const chave = texto.toLocaleLowerCase("pt-PT");
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    partes.push({ texto, removivel: true, cru: e.texto });
  }

  /**
   * «Portugal {ano}» fecha a linha — e só quando o índice o declara.
   *
   * Não é enfeite: é o âmbito da resposta. A jurisdição é uma só neste
   * produto inteiro, mas o ANO não é adivinhável, e escrevê-lo a partir de
   * um `new Date()` seria afirmar que a matéria é do ano corrente quando
   * pode ser de outro. Vem do documento, ou não vem.
   */
  const ano = plano.principal?.anoFiscal;
  if (ano) partes.push({ texto: `Portugal ${ano}`, removivel: false });

  if (partes.length === 0) return null;

  return (
    <section aria-labelledby="rc-busca-interpretacao" className="px-1">
      <Rotulo>
        <span id="rc-busca-interpretacao">Pedido reconhecido · 02</span>
      </Rotulo>

      {/**
       * ┌───────────────────────────────────────────────────────────────┐
       * │ TEXTO PONTUADO, E JÁ NÃO SEIS PASTILHAS COM CONTORNO           │
       * │                                                               │
       * │ Cada etiqueta com caixa própria dava a seis fragmentos da      │
       * │ MESMA frase a forma de seis objectos independentes — e a linha │
       * │ que devia ler-se de uma vez («comparar regimes, 3 500 € por    │
       * │ mês, em Portugal, em 2026») passava a ser um inventário.       │
       * │                                                               │
       * │ Uma frase separada por pontos lê-se como uma frase. O que      │
       * │ ganha caixa é só o que é acção: o «Ver ou corrigir».           │
       * └───────────────────────────────────────────────────────────────┘
       */}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="min-w-0 flex-1 text-sm text-stone-700 dark:text-stone-300">
          {partes.map((p, i) => (
            <span key={p.texto}>
              {i > 0 && <span aria-hidden className="px-1.5 text-stone-300 dark:text-stone-600">·</span>}
              <span className={p.removivel ? "font-medium text-stone-800 dark:text-stone-200" : ""}>{p.texto}</span>
            </span>
          ))}
        </p>

        {/* A afirmação de confiança, e só quando é ganha. Ver o quadro. */}
        {claro && (
          <span className="flex flex-none items-center gap-1.5 text-sm font-medium text-brand-dark dark:text-brand">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
            Pedido claro
          </span>
        )}

        <button
          type="button"
          onClick={alternarCorrecao}
          aria-expanded={aCorrigir}
          aria-controls="rc-busca-correcao"
          className="focus-marca flex min-h-9 flex-none items-center gap-1 rounded-lg px-2 text-xs font-semibold text-stone-600 transition-colors hover:text-brand-dark dark:text-stone-400 dark:hover:text-brand"
        >
          Ver ou corrigir
          <ChevronDown size={12} className={aCorrigir ? "rotate-180 transition-transform" : "transition-transform"} aria-hidden />
        </button>
      </div>

      {aCorrigir && (
        <div
          id="rc-busca-correcao"
          className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50"
        >
          <p className="texto-mini text-stone-600 dark:text-stone-400">
            Isto é o que percebemos da tua pergunta. Tira o que estiver errado — o texto volta ao campo e podes
            reescrevê-lo.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {partes.filter((p) => p.removivel).length === 0 ? (
              <p className="texto-mini text-stone-500">Não reconhecemos nenhum dado concreto na frase.</p>
            ) : (
              partes
                .filter((p) => p.removivel)
                .map((p) => (
                  <button
                    key={p.texto}
                    type="button"
                    onClick={() => p.cru && corrigir(p.cru)}
                    className="focus-marca min-h-9 rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 transition-colors hover:border-alert-border hover:text-alert-text dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                  >
                    Tirar «{p.texto}»
                  </button>
                ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── Caminho preparado ───────────────────────────────────────────── */

function Chip({ children, icone: Icone }: { children: React.ReactNode; icone: React.ComponentType<{ size?: number }> }) {
  return (
    <span className="texto-mini flex min-h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2 font-semibold text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
      <Icone size={12} />
      {children}
    </span>
  );
}

function rotuloDoBotao(acao: AcaoPreparada, plano: PlanoBusca): string {
  const valor = plano.entidades.find((e) => e.tipo === "valor");
  // O valor só entra no botão quando VAI MESMO viajar. Escrever «Comparar
  // com 3 500 €» num botão que abre o comparador vazio é a promessa mais
  // barata de fazer e a mais cara de quebrar.
  return valor && acao.campos.includes("valor")
    ? `${VERBO[acao.renderer]} com ${valor.texto} €`
    : VERBO[acao.renderer];
}

export function CaminhoPreparado({
  controlador,
  aoFechar,
}: {
  controlador: ControladorBusca;
  aoFechar: () => void;
}) {
  const { plano, hrefPrincipal } = controlador;
  const acao = plano?.principal;
  if (!plano || !acao || !hrefPrincipal) return null;

  const local = acao.renderer === "prepared_tool" || acao.renderer === "comparison";

  return (
    <section
      aria-labelledby="rc-busca-caminho"
      className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"
    >
      <Rotulo>
        <span id="rc-busca-caminho">Caminho preparado</span>
      </Rotulo>

      <h3 className="mt-1.5 font-display text-xl leading-tight text-stone-900 dark:text-stone-100 sm:text-2xl">
        {acao.titulo}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{acao.descricao}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {acao.minutos ? <Chip icone={Clock}>≈ {acao.minutos} min</Chip> : null}
        <Chip icone={acao.requerConta ? Lock : User}>{acao.requerConta ? "Precisa de conta" : "Sem conta"}</Chip>
        {local && <Chip icone={ShieldCheck}>Dados locais</Chip>}
      </div>

      <Link
        prefetch={false}
        href={hrefPrincipal}
        data-resultado
        data-caminho-principal
        onClick={(e) => {
          controlador.aoEscolherAcao(acao, 1, "principal");
          if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) aoFechar();
        }}
        className="focus-marca mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-brand-dark"
      >
        {rotuloDoBotao(acao, plano)}
        <ArrowRight size={15} aria-hidden />
      </Link>

      <PorqueRecomendamos plano={plano} />
    </section>
  );
}

function PorqueRecomendamos({ plano }: { plano: PlanoBusca }) {
  const frases = plano.explicacoes.map((c) => EXPLICACAO[c]).filter((f): f is string => Boolean(f));
  if (frases.length === 0) return null;

  return (
    <details className="group mt-3">
      <summary className="focus-marca inline-flex min-h-9 cursor-pointer list-none items-center gap-1 rounded-lg text-xs font-semibold text-brand-dark dark:text-brand">
        Porque recomendamos isto?
        <ChevronDown size={12} className="transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      {/* Regras, não uma explicação gerada. Cada linha corresponde a um
          código que o plano transporta e que os testes conseguem afirmar. */}
      <ul className="mt-2 space-y-1">
        {[...new Set(frases)].map((f) => (
          <li key={f} className="texto-mini flex gap-1.5 text-stone-600 dark:text-stone-400">
            <Check size={11} className="mt-0.5 flex-none text-brand" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
    </details>
  );
}

/* ─── A pergunta, ou o contexto do renderer ───────────────────────── */

/**
 * O lado direito da moldura: ou uma pergunta, ou o que o renderer tem para
 * dizer sobre o caminho. Nunca as duas coisas — e nunca duas perguntas.
 */
/** O nome da preparação, por forma de apresentar. Fechado por `Record`. */
const PREPARACAO: Record<AcaoPreparada["renderer"], string> = {
  prepared_tool: "Simulação em preparação",
  comparison: "Comparação em preparação",
  obligation: "Prazo em preparação",
  guide: "Leitura em preparação",
  direct_route: "Destino em preparação",
  professional_support: "Pedido em preparação",
};

/**
 * O indicador de passos — «1 de 2», e não uma barra de progresso.
 *
 * São dois: confirmar o dado que falta, e abrir. Uma barra sugeriria um
 * processo longo com fim incerto; dois pontos dizem exactamente quantos
 * gestos faltam, que é a informação que faz alguém decidir continuar.
 */
function Passos({ atual, total }: { atual: number; total: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`Passo ${atual} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="h-px w-3 bg-stone-300 dark:bg-stone-600" />}
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${
              i < atual ? "bg-brand" : "border border-stone-300 dark:border-stone-600"
            }`}
          />
        </span>
      ))}
    </span>
  );
}

export function ContextoDoPlano({ controlador }: { controlador: ControladorBusca }) {
  const { plano } = controlador;
  if (!plano) return null;

  if (plano.clarificacao) {
    const q = plano.clarificacao;
    const acao = plano.principal;
    const valor = plano.entidades.find((e) => e.tipo === "valor");
    const periodo = plano.entidades.find((e) => e.tipo === "periodicidade");
    const cenarios = plano.entidades
      .filter((e) => e.tipo === "regime")
      .map((e) => e.texto)
      .slice(0, 3);

    return (
      <section className="relative rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
        {/**
         * A LIGAÇÃO ENTRE OS DOIS CARTÕES, desenhada e não implícita.
         *
         * Lado a lado sem nada entre eles, os dois lêem-se como duas
         * ofertas paralelas — «ou isto, ou aquilo». E não são: o da
         * direita é uma condição do da esquerda. O traço com seta diz a
         * direcção da dependência, e só existe onde há duas colunas.
         */}
        <span aria-hidden className="absolute -left-3 top-9 hidden items-center lg:flex">
          <span className="h-px w-3 bg-stone-300 dark:bg-stone-600" />
          <span className="-ml-px h-1.5 w-1.5 rotate-45 border-r border-t border-stone-300 dark:border-stone-600" />
        </span>

        <div className="flex items-start justify-between gap-3">
          <Rotulo>
            {acao ? PREPARACAO[acao.renderer] : "Em preparação"} · 1 de 2
          </Rotulo>
          <Passos atual={1} total={2} />
        </div>

        {/**
         * O que está em preparação, dito com o número à frente.
         *
         * A pessoa escreveu «3 500 € por mês» e o que a interface lhe
         * devolve é o mesmo número, em corpo grande, para ela confirmar
         * de relance que não houve engano na leitura. É o mesmo papel do
         * «check answers» do GOV.UK: mostrar antes de agir.
         */}
        {valor && (
          <div className="mt-2">
            <p className="texto-micro font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
              {cenarios.length >= 2 ? `${cenarios.length} cenários` : "Valor reconhecido"}
            </p>
            <p className="font-display text-2xl leading-tight text-stone-900 dark:text-stone-100 sm:text-3xl">
              {valor.texto} €
              {periodo && (
                <span className="text-stone-500 dark:text-stone-400">
                  {ABREVIATURA_PERIODO[String(periodo.valor)] ?? ""}
                </span>
              )}
            </p>
            {cenarios.length >= 2 && (
              <p className="texto-mini mt-1 text-stone-600 dark:text-stone-400">{cenarios.join(" · ")}</p>
            )}
          </div>
        )}

        {/* A régua pontilhada separa o que já se sabe do que falta saber. */}
        <hr className="my-3 border-0 border-t border-dashed border-stone-200 dark:border-stone-700" />

        <fieldset>
          <legend className="texto-micro mb-1.5 inline-block rounded-md border border-brand/30 px-1.5 py-0.5 font-bold uppercase tracking-widest text-brand-dark dark:text-brand">
            Contexto · por confirmar
          </legend>
          <p className="text-sm font-semibold leading-snug text-stone-900 dark:text-stone-100">{q.pergunta}</p>
          <p className="texto-mini mt-1 text-stone-600 dark:text-stone-400">{q.porque}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {q.opcoes.map((o) =>
              o.href ? (
                <Link
                  prefetch={false}
                  key={o.id}
                  href={o.href}
                  className="focus-marca flex min-h-9 items-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 no-underline transition-colors hover:border-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                >
                  {o.label}
                </Link>
              ) : (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => controlador.responder(o.id)}
                  className="focus-marca min-h-9 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition-colors hover:border-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                >
                  {o.label}
                </button>
              ),
            )}
          </div>

          {/**
           * «Saltar por agora» dá no MESMO estado que «Não sei» — e isso é
           * deliberado, não um descuido. São duas maneiras de dizer a
           * mesma decisão («não preenchas isto») e as pessoas dizem-na das
           * duas: umas não sabem a resposta, outras não querem responder
           * agora. Fingir que são estados diferentes obrigaria a inventar
           * uma diferença que não existe do lado de lá.
           */}
          {q.opcoes.some((o) => o.id === OPCAO_NAO_SEI_ID) && (
            <button
              type="button"
              onClick={() => controlador.responder(OPCAO_NAO_SEI_ID)}
              className="focus-marca mt-2 inline-flex min-h-9 items-center rounded-lg text-xs font-medium text-stone-500 underline underline-offset-2 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Saltar por agora
            </button>
          )}
        </fieldset>
      </section>
    );
  }

  const acao = plano.principal;
  if (!acao) return null;

  // ── Obrigação: a fonte e a data em que foi conferida ──────────────
  //  Uma obrigação é uma afirmação sobre a lei. Sem proveniência não
  //  aparece — a regra é do produto inteiro, e aqui é o tipo que a impõe.
  if (acao.renderer === "obligation" && acao.fonte) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/40">
        <Rotulo>De onde vem esta data</Rotulo>
        <p className="mt-1.5 text-sm font-semibold leading-snug text-stone-900 dark:text-stone-100">
          {acao.fonte.label}
        </p>
        <p className="texto-mini mt-1 text-stone-600 dark:text-stone-400">
          Conferido a {dataCurta(acao.fonte.revistoEm)}. As datas já estão ajustadas a fins de semana e feriados.
        </p>
        <a
          href={acao.fonte.url}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-marca mt-2 inline-flex min-h-9 items-center gap-1 rounded-lg text-xs font-semibold text-brand-dark underline dark:text-brand"
        >
          Abrir a fonte oficial
        </a>
      </section>
    );
  }

  // ── Ferramenta preparada: o que vai levar, dito por extenso ───────
  if (acao.campos.length > 0) {
    const legiveis = acao.campos
      .map((c) => plano.entidades.find((e) => e.tipo === c))
      .filter((e): e is NonNullable<typeof e> => Boolean(e));

    return (
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/40">
        <Rotulo>O que vai preenchido</Rotulo>
        <ul className="mt-1.5 space-y-1">
          {legiveis.map((e) => (
            <li key={e.tipo} className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
              <Check size={13} className="flex-none text-brand" aria-hidden />
              {e.tipo === "valor" ? `${e.texto} €` : (e.rotulo ?? e.texto)}
            </li>
          ))}
        </ul>
        <p className="texto-mini mt-2 text-stone-600 dark:text-stone-400">
          Fica no teu dispositivo e é usado uma só vez, ao abrir. Nada disto entra no endereço.
        </p>
      </section>
    );
  }

  return null;
}

/* ─── Alternativas ────────────────────────────────────────────────── */

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ AS ALTERNATIVAS SÃO UMA FILA, E NÃO UMA LISTA                        │
 * │                                                                     │
 * │ Empilhadas, com um ícone e uma seta cada, tinham a forma de          │
 * │ RESULTADOS — a mesma da lista que a moldura veio substituir — e a    │
 * │ superfície ficava outra vez com duas respostas do mesmo tamanho: um  │
 * │ caminho preparado em cima e uma lista de destinos por baixo.         │
 * │                                                                     │
 * │ Numa fila, separadas por réguas e ao lado do rótulo que as nomeia,   │
 * │ lêem-se pelo que são: as outras portas, para quem não quer aquela.   │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function OutrosCaminhos({
  controlador,
  aoFechar,
}: {
  controlador: ControladorBusca;
  aoFechar: () => void;
}) {
  const { plano } = controlador;
  if (!plano || plano.alternativas.length === 0) return null;

  return (
    <nav aria-labelledby="rc-busca-alternativas" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
      <Rotulo>
        <span id="rc-busca-alternativas">Outros caminhos</span>
      </Rotulo>
      <span aria-hidden className="hidden h-4 w-px bg-stone-200 sm:block dark:bg-stone-700" />

      {plano.alternativas.map((a, i) => (
        <span key={a.id} className="flex min-w-0 items-center gap-3">
          {i > 0 && <span aria-hidden className="hidden h-4 w-px bg-stone-200 sm:block dark:bg-stone-700" />}
          <Link
            prefetch={false}
            href={a.href}
            data-resultado
            onClick={(e) => {
              controlador.aoEscolherAcao(a, i + 2, "alternativa");
              if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) aoFechar();
            }}
            className="focus-marca flex min-h-9 min-w-0 items-center gap-1.5 rounded-lg px-1 text-sm text-stone-700 no-underline transition-colors hover:text-brand-dark dark:text-stone-300 dark:hover:text-brand"
          >
            <Lightbulb size={13} className="flex-none text-stone-400" aria-hidden />
            <span className="min-w-0 truncate">{a.titulo}</span>
          </Link>
        </span>
      ))}

      {controlador.totalSemTeto > plano.alternativas.length + 1 && (
        <Link
          prefetch={false}
          href={controlador.hrefTodos}
          onClick={(e) => {
            if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) aoFechar();
          }}
          className="focus-marca ml-auto flex min-h-9 flex-none items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-brand-dark no-underline dark:text-brand"
        >
          Explorar {controlador.totalSemTeto} resultados
          <ArrowRight size={13} aria-hidden />
        </Link>
      )}
    </nav>
  );
}

/* ─── Apoio profissional ──────────────────────────────────────────── */

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PERSISTENTE, SECUNDÁRIO — E PRIMÁRIO SÓ QUANDO FOI PEDIDO            │
 * │                                                                     │
 * │ O apoio humano é parte do produto e não um link escondido: por isso  │
 * │ a faixa aparece em todas as consultas. Mas nunca compete com o CTA   │
 * │ principal, e nunca é uma fuga automática — quem não encontrou o que  │
 * │ procurava não pediu, por isso, para falar com um contabilista.       │
 * │                                                                     │
 * │ E a frase que mais importa está aqui: nada é partilhado antes da     │
 * │ confirmação. O que o endereço leva são filtros de catálogo fechado   │
 * │ (distrito, área) — nunca a pergunta que a pessoa escreveu.           │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function FaixaApoio({
  controlador,
  aoFechar,
}: {
  controlador: ControladorBusca;
  aoFechar: () => void;
}) {
  const apoio = controlador.plano?.apoio;
  if (!apoio) return null;

  const principal = apoio.principal;

  return (
    <section
      aria-label="Apoio profissional"
      className={`flex flex-none flex-wrap items-center gap-x-3 gap-y-1 ${
        principal ? "rounded-xl bg-brand-light/50 px-3 py-2 dark:bg-brand/10" : ""
      }`}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-brand/30 text-brand"
      >
        <Briefcase size={15} />
      </span>
      <div className="min-w-0">
        <Rotulo>Apoio profissional</Rotulo>
        <p className="text-sm font-semibold leading-tight text-stone-900 dark:text-stone-100">
          {principal ? "Falar com um contabilista certificado" : "Precisas de validar esta decisão?"}
        </p>
        <p className="texto-mini text-stone-600 dark:text-stone-400">
          Contabilistas Certificados · Inscrição OCC verificada
          {apoio.filtros.length > 0 && ` · ${apoio.filtros.map((f) => f.valor).join(" · ")}`}
        </p>
      </div>
      <div className="ml-auto flex flex-none flex-col items-end">
        <Link
          prefetch={false}
          href={apoio.href}
          data-resultado
          onClick={(e) => {
            controlador.aoEscolherAcao({ id: "apoio:contabilistas", tipo: "apoio" }, 1, "apoio");
            if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) aoFechar();
          }}
          className={`focus-marca flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold no-underline transition-colors ${
            principal
              ? "bg-brand px-3 text-white hover:bg-brand-dark"
              : "text-stone-800 hover:text-brand-dark dark:text-stone-100 dark:hover:text-brand"
          }`}
        >
          Encontrar contabilista
          <ArrowRight size={13} aria-hidden />
        </Link>
        {/* A promessa fica COLADA ao botão, e não no parágrafo de cima: é
            no instante antes do clique que ela tem de ser lida. */}
        <p className="texto-mini text-stone-500 dark:text-stone-400">
          Só partilhas o pedido quando confirmares
        </p>
      </div>
    </section>
  );
}
