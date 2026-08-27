"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «A CONFERÊNCIA» — o palco do foco do salário
//  ---------------------------------------------------------------------
//  A coreografia deste palco estava certa — as três linhas que batem a
//  acender juntas, o silêncio, e depois a que ficou de fora. O que estava
//  errado era o DESENHO por cima dela.
//
//  ── O que se corrigiu, e porquê ──────────────────────────────────────
//
//  1. **O modo escuro estava partido, e não por descuido de uma classe.**
//     As linhas acendiam com `backgroundColor` animado para
//     `rgba(246,231,224,.85)` e `rgba(223,240,232,.55)` — dois pastéis
//     claros, escritos em literal. Sobre um cartão `dark:bg-stone-900`
//     isso pinta duas manchas de papel dentro de uma superfície escura, e
//     o texto por cima delas continua claro. Nenhuma variante `dark:`
//     podia salvar isto: um valor literal dentro de `animate` não passa
//     pelo Tailwind e não sabe que existe um tema.
//
//     Agora o realce é uma CAMADA por baixo do conteúdo, com classes de
//     tema a sério, e o que se anima é a sua OPACIDADE — que vale o mesmo
//     nos dois temas porque não é uma cor.
//
//  2. **Não se parecia com o simulador que responde à mesma pergunta.**
//     `ResultadoMotorRecibo` — a ferramenta para onde este hero manda — é
//     um cartão com um cabeçalho lavado a verde da marca, dois halos
//     difusos, um número grande em `font-display`, uma barra segmentada e
//     tabelas com faixa de cabeçalho e `divide-y`. Este palco tinha uma
//     grelha de quatro colunas com tipos de 9 px e nada disso. Duas peças
//     que respondem à mesma pergunta e não se parecem uma com a outra
//     leem-se como dois produtos.
//
//     A `SegBar` e a `SegLegend` são importadas dali, e não copiadas: são
//     apresentação pura, sem lógica fiscal e sem importar catálogos, e
//     por isso atravessam a fronteira do cliente sem trazer nada atrás.
//
//  3. **Números de 11 px para a resposta principal.** Os dois líquidos em
//     confronto — que são o assunto — estavam no rodapé de uma tabela,
//     do mesmo tamanho das linhas. Sobem para o cabeçalho, lado a lado,
//     no corpo grande.
// ═══════════════════════════════════════════════════════════════════════

import { m, type Transition } from "motion/react";
import { Briefcase, Calculator, Check, Close, Warning } from "@/components/ui/Icons";
import MolduraPalco, { type CenaDoPalco } from "@/components/palco/MolduraPalco";
import { Contador } from "@/components/palco/atores";
import { SegBar, SegLegend, type Seg } from "@/components/dependente/ui";
import { ATOS_SALARIO, DUR, ENTRADA, ASSENTA } from "./coreografia";

const eur = (n: number) =>
  `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** A mesma tinta que o simulador usa para o IRS na barra segmentada. */
const COR_IRS = "#9FE1CB";
const CLS_SS = "text-brand-deep";

export interface DadosSalario {
  bruto: number;
  ss: number;
  /** A retenção que o recibo aplicou — a errada. */
  irsRecibo: number;
  /** A retenção que devia ter sido aplicada. */
  irsCerto: number;
  liquidoRecibo: number;
  liquidoCerto: number;
  /** A diferença ao fim de catorze meses. */
  diferencaAnual: number;
  /** Porque é que a linha não bate, em linguagem de pessoa. */
  motivo: string;
}

export default function PalcoSalario({ dados }: { dados: DadosSalario }) {
  const diferencaMensal = Math.abs(dados.liquidoCerto - dados.liquidoRecibo);
  const aMais = dados.irsRecibo > dados.irsCerto;

  return (
    <MolduraPalco
      id="palco-salario"
      tom="claro"
      nome="A conferência"
      resumo={`Um recibo de vencimento de ${eur(dados.bruto)} posto ao lado da conta refeita a partir do bruto, linha a linha, para se ver qual é a que não bate.`}
      narracao={[
        `O recibo: bruto de ${eur(dados.bruto)}, Segurança Social de ${eur(dados.ss)}, retenção de IRS de ${eur(dados.irsRecibo)} e líquido de ${eur(dados.liquidoRecibo)}.`,
        `A conta refeita a partir do bruto dá a mesma Segurança Social, mas uma retenção de IRS de ${eur(dados.irsCerto)} e um líquido de ${eur(dados.liquidoCerto)}.`,
        "Conferir: o bruto bate, a Segurança Social bate, os subsídios batem. A retenção de IRS não bate.",
        `Porquê: ${dados.motivo} A diferença é de ${eur(diferencaMensal)} por mês, cerca de ${eur(dados.diferencaAnual)} ao fim de catorze meses.`,
      ]}
      atos={ATOS_SALARIO}
    >
      {(cena) => (
        <Cena cena={cena} dados={dados} diferencaMensal={diferencaMensal} aMais={aMais} />
      )}
    </MolduraPalco>
  );
}

function Cena({
  cena,
  dados,
  diferencaMensal,
  aMais,
}: {
  cena: CenaDoPalco;
  dados: DadosSalario;
  diferencaMensal: number;
  aMais: boolean;
}) {
  const { ato, emCena, estatico } = cena;
  const t = estatico ? { duration: 0 } : { duration: DUR.entrada / 1000, ease: ENTRADA };
  const pousa = estatico ? { duration: 0 } : { duration: DUR.assenta / 1000, ease: ASSENTA };

  const noAto = (indice: number, beat: string) =>
    estatico || ato > indice || (ato === indice && emCena(beat));

  // ── Ato 1 · o recibo chega ─────────────────────────────────────────
  const papel = noAto(0, "papel");
  const brutoLido = noAto(0, "bruto");
  const linhaLida = [noAto(0, "linha1"), noAto(0, "linha2"), noAto(0, "linha3")];
  const liquidoRecibo = noAto(0, "liquidoRecibo");

  // ── Ato 2 · a conta refaz-se ───────────────────────────────────────
  const colunaAberta = noAto(1, "abreColuna");
  const calc = [noAto(1, "calcSS"), noAto(1, "calcIRS"), noAto(1, "calcSub")];
  const liquidoMotor = noAto(1, "liquidoMotor");

  // ── Ato 3 · o confronto ────────────────────────────────────────────
  // As três que batem acendem quase em simultâneo. A que falha vem depois
  // de 800 ms de silêncio — e é por NÃO ter acendido com as outras que se
  // vê. A Lei do Destino Comum usada como pinça, e não como cola.
  const bate = [noAto(2, "bate1"), noAto(2, "bate2"), noAto(2, "bate3")];
  const falhou = noAto(2, "falha");
  const marcada = noAto(2, "marcaFalha");

  // ── Ato 4 · a explicação ───────────────────────────────────────────
  const explica = estatico || (ato === 3 && emCena("abreExplicacao"));
  const motivo = estatico || (ato === 3 && emCena("motivo"));
  const anual = estatico || (ato === 3 && emCena("anual"));
  const resolvido = estatico || (ato === 3 && emCena("resolve"));

  /** A repartição verdadeira do bruto — a mesma leitura do simulador. */
  const reparticao: Seg[] = [
    { label: "Fica contigo", value: dados.liquidoCerto, brand: true },
    { label: "Retenção de IRS", value: dados.irsCerto, color: COR_IRS },
    { label: "Segurança Social", value: dados.ss, cls: CLS_SS },
  ];

  const LINHAS = [
    {
      id: "bruto",
      rotulo: "Vencimento base",
      curto: "Base",
      nota: "o ponto de partida das duas contas",
      recibo: dados.bruto,
      certo: dados.bruto,
      sinal: "",
      visivelRecibo: brutoLido,
      visivelCerto: colunaAberta,
      bate: bate[0],
      erro: false,
    },
    {
      id: "ss",
      rotulo: "Segurança Social · 11%",
      curto: "Seg. Social",
      nota: "taxa única sobre a remuneração",
      recibo: dados.ss,
      certo: dados.ss,
      sinal: "− ",
      visivelRecibo: linhaLida[0],
      visivelCerto: calc[0],
      bate: bate[1],
      erro: false,
    },
    {
      id: "irs",
      rotulo: "Retenção de IRS",
      curto: "IRS",
      nota: "tabela do Despacho 233-A/2026",
      recibo: dados.irsRecibo,
      certo: dados.irsCerto,
      sinal: "− ",
      visivelRecibo: linhaLida[1],
      visivelCerto: calc[1],
      bate: false,
      erro: falhou,
    },
    {
      id: "subsidios",
      rotulo: "Subsídios (férias e Natal)",
      curto: "Subsídios",
      nota: "pagos por duodécimos",
      recibo: 0,
      certo: 0,
      sinal: "",
      visivelRecibo: linhaLida[2],
      visivelCerto: calc[2],
      bate: bate[2],
      erro: false,
    },
  ] as const;

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ O ORÇAMENTO DE 320 px, CONTADO                                     │
  // │                                                                   │
  // │ A auditoria apanhou quatro rótulos a transbordar — «Subsídios» por │
  // │ 28 px. A conta explica porquê: a 320 px, depois do `px-4` do hero, │
  // │ do `px-3` da moldura, do `p-3` do cartão e do `px-2` da tabela,    │
  // │ sobram 224 px para a grelha. Com duas colunas de 4,4 rem, uma de   │
  // │ 1,4 rem e três intervalos de 8 px, o `1fr` do rótulo ficava com    │
  // │ 29 px — menos de metade do que a palavra mais curta precisa.       │
  // │                                                                   │
  // │ Colunas de valor a 3,5 rem e intervalos de 6 px devolvem-lhe 74 px.│
  // │ A coluna do visto NÃO desaparece a 320 px, e é deliberado: é o     │
  // │ único indicador do veredicto que não é cor.                        │
  // └───────────────────────────────────────────────────────────────────┘
  const GRELHA =
    "grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_1.25rem] items-center gap-x-1.5 " +
    "sm:grid-cols-[minmax(0,1fr)_7rem_7rem_2rem] sm:gap-x-3";

  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900"
    >
      {/* ══ O CONFRONTO, EM CIMA ═══════════════════════════════════════
          A pergunta deste foco é «o meu recibo está certo?», e a resposta
          são dois líquidos que deviam ser o mesmo número e não são. É por
          isso que estão aqui, em corpo grande e lado a lado, e não no
          rodapé de uma tabela. O mesmo cabeçalho lavado do simulador para
          onde o CTA manda — a peça e a ferramenta têm de se reconhecer. */}
      <div className="relative overflow-hidden border-b border-brand/15 bg-gradient-to-br from-brand-light via-brand-light/60 to-white p-4 dark:border-brand/20 dark:from-brand/15 dark:via-brand/[.08] dark:to-stone-900 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-brand/10 blur-3xl dark:bg-brand/25"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-44 w-44 rounded-full bg-brand-mint/20 blur-3xl dark:bg-brand/10"
        />

        <div className="relative">
          <m.p
            initial={false}
            animate={{ opacity: papel ? 1 : 0.3 }}
            transition={t}
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] font-semibold uppercase tracking-[.16em] text-brand-dark dark:text-brand-light"
          >
            <Briefcase size={12} /> Recibo de vencimento
            <span className="font-normal normal-case tracking-normal text-stone-500 dark:text-stone-400">
              · bruto de {eur(dados.bruto)}
            </span>
          </m.p>

          {/* Duas colunas a partir de `lg`, e não uma faixa a atravessar o
              cartão. A legenda da repartição são três linhas de rótulo e
              valor: esticadas por 1 100 px, o rótulo e o número ficam a um
              palmo um do outro e deixa de se ler qual pertence a qual. */}
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
            <div className="min-w-0">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <ValorEmConfronto
                  rotulo="No recibo"
                  Icone={Briefcase}
                  valor={dados.liquidoRecibo}
                  visivel={liquidoRecibo}
                  conta={!estatico && liquidoRecibo}
                  errado={marcada}
                  transicao={t}
                />
                <ValorEmConfronto
                  rotulo="Devia ser"
                  Icone={Calculator}
                  valor={dados.liquidoCerto}
                  visivel={liquidoMotor}
                  conta={!estatico && liquidoMotor}
                  certo={marcada}
                  transicao={t}
                />
              </div>

              <m.p
                initial={false}
                animate={{ opacity: marcada ? 1 : 0, y: marcada ? 0 : 6 }}
                transition={t}
                className="mt-3 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full border border-clay-border bg-white px-3 py-1.5 text-[11px] font-semibold text-clay-text shadow-sm dark:bg-stone-900"
              >
                <Warning size={11} className="flex-shrink-0" />
                {eur(diferencaMensal)} {aMais ? "retidos a mais" : "retidos a menos"} por mês
              </m.p>
            </div>

            {/* A repartição verdadeira do bruto. Mesma barra e mesma legenda
                do simulador — inclusive as cores, que ali já foram escolhidas
                para se distinguirem nos dois temas. */}
            <m.div
              initial={false}
              animate={{ opacity: liquidoMotor ? 1 : 0 }}
              transition={t}
              className="min-w-0 rounded-2xl border border-white/60 bg-white/60 p-3.5 dark:border-stone-700/50 dark:bg-stone-900/45 sm:p-4"
            >
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                A repartição certa de {eur(dados.bruto)}
              </p>
              <SegBar segs={reparticao} />
              <div className="mt-3">
                <SegLegend segs={reparticao} format={eur} />
              </div>
            </m.div>
          </div>
        </div>
      </div>

      {/* ══ A TABELA DE CONFERÊNCIA ════════════════════════════════════
          Nenhum outro palco do site põe duas versões da mesma coisa em
          colunas adjacentes. É a única forma de mostrar uma auditoria sem
          a explicar por palavras — e é a razão de este foco deixar de ser
          a cascata de deduções do recibo verde com outro número. */}
      <div className="p-3 sm:p-4">
        <div className="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800">
          <div
            className={`${GRELHA} border-b border-stone-100 bg-stone-50/80 px-2 py-2.5 dark:border-stone-800 dark:bg-stone-950/30 sm:px-4`}
          >
            <span className="truncate text-[9px] font-semibold text-stone-500 dark:text-stone-400 sm:text-[10px]">
              Linha a linha
            </span>
            <m.span
              initial={false}
              animate={{ opacity: papel ? 1 : 0.3 }}
              transition={t}
              className="flex items-center justify-end gap-1 text-right text-[9px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400"
            >
              <Briefcase size={10} className="hidden flex-shrink-0 sm:inline-block" />
              <span className="truncate">No recibo</span>
            </m.span>
            <m.span
              initial={false}
              animate={{ opacity: colunaAberta ? 1 : 0.25 }}
              transition={t}
              className="flex items-center justify-end gap-1 text-right text-[9px] font-bold uppercase tracking-wide text-brand dark:text-brand-light"
            >
              <Calculator size={10} className="hidden flex-shrink-0 sm:inline-block" />
              <span className="truncate">Devia ser</span>
            </m.span>
            <span aria-hidden />
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {LINHAS.map((linha) => {
              const divergente = linha.id === "irs" && linha.erro;
              const aceso = divergente ? marcada : linha.bate;
              return (
                <div key={linha.id} className="relative">
                  {/* ┌──────────────────────────────────────────────────┐
                      │ O REALCE É UMA CAMADA, NÃO UMA COR ANIMADA        │
                      │                                                  │
                      │ Animar `backgroundColor` obriga a escrever o      │
                      │ valor em literal, e um literal não sabe que       │
                      │ existe um tema escuro. Era assim que duas         │
                      │ manchas de papel apareciam dentro do cartão       │
                      │ escuro, com texto claro por cima.                 │
                      │                                                  │
                      │ Aqui a cor vem de classes, e o que se anima é a   │
                      │ OPACIDADE — que vale o mesmo nos dois temas       │
                      │ porque não é uma cor.                            │
                      └──────────────────────────────────────────────────┘

                      ⚠️ E SEM `dark:`, DE PROPÓSITO. `globals.css` já
                      remapeia `bg-clay-bg/NN` e `bg-brand-light/NN` no
                      escuro, por seletor de substring. Escrever um
                      `dark:bg-clay-bg/50` ao lado não reforça nada: a
                      utilidade `dark:` GANHA do remapeamento e repõe a
                      cor CLARA. Medido — a camada ficava
                      `rgba(246,231,224,.5)` (o pastel de modo claro)
                      sobre a linha escura, e o rótulo por baixo dela
                      deixava de se ler. Sem a variante, a mesma classe
                      resolve para `rgba(61,33,25,.75)`, que é o que se
                      quer. Vale para todos os tokens `clay`, `alert` e
                      `categoria` desta casa. */}
                  <m.span
                    aria-hidden
                    initial={false}
                    animate={{ opacity: aceso ? 1 : 0 }}
                    transition={t}
                    className={`pointer-events-none absolute inset-0 ${
                      divergente ? "bg-clay-bg/70" : "bg-brand-light/60"
                    }`}
                  />
                  <div className={`${GRELHA} relative px-2 py-2.5 sm:px-4`}>
                    <div className="min-w-0">
                      {/* Dois rótulos e não um cortado: a 360 px
                          «Vencimento base» não cabe, e reticências num
                          nome de linha de recibo não são um nome. */}
                      <span className="block text-[10px] font-semibold leading-tight text-stone-700 dark:text-stone-200 sm:hidden">
                        {linha.curto}
                      </span>
                      <span className="hidden truncate text-xs font-semibold text-stone-700 dark:text-stone-200 sm:block">
                        {linha.rotulo}
                      </span>
                      <span className="hidden truncate text-[10px] text-stone-400 sm:block">
                        {linha.nota}
                      </span>
                    </div>

                    <m.span
                      initial={false}
                      animate={{ opacity: linha.visivelRecibo ? 1 : 0 }}
                      transition={t}
                      className="text-right text-[10px] font-semibold tabular-nums text-stone-600 dark:text-stone-300 sm:text-[11px]"
                    >
                      {linha.recibo === 0 ? "incluídos" : `${linha.sinal}${eur(linha.recibo)}`}
                    </m.span>

                    <m.span
                      initial={false}
                      animate={{ opacity: linha.visivelCerto ? 1 : 0 }}
                      transition={t}
                      className={`text-right text-[10px] font-semibold tabular-nums sm:text-[11px] ${
                        divergente && marcada
                          ? "text-clay-text"
                          : "text-stone-600 dark:text-stone-300"
                      }`}
                    >
                      {linha.certo === 0 ? "incluídos" : `${linha.sinal}${eur(linha.certo)}`}
                    </m.span>

                    <span className="flex justify-center">
                      <m.span
                        initial={false}
                        animate={{
                          opacity: divergente ? (falhou ? 1 : 0) : linha.bate ? 1 : 0,
                          scale: divergente ? (falhou ? 1 : 0.6) : linha.bate ? 1 : 0.6,
                        }}
                        transition={pousa}
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${
                          divergente ? "bg-clay" : "bg-brand"
                        }`}
                      >
                        {divergente ? <Close size={10} /> : <Check size={10} />}
                      </m.span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ A LINHA QUE NÃO BATE ═══════════════════════════════════════ */}
      <m.div
        initial={false}
        animate={{ opacity: explica ? 1 : 0, y: explica ? 0 : 8 }}
        transition={t}
        className="border-t border-clay-border bg-clay-bg/45 p-4 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-clay text-white">
            <Warning size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-clay-text">
              A retenção de IRS é a única que não bate
            </p>
            <m.p
              initial={false}
              animate={{ opacity: motivo ? 1 : 0 }}
              transition={t}
              className="mt-1 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300"
            >
              {dados.motivo}
            </m.p>

            <m.div
              initial={false}
              animate={{ opacity: anual ? 1 : 0, y: anual ? 0 : 5 }}
              transition={t}
              className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-2xl border border-clay-border bg-white px-3.5 py-2.5 dark:bg-stone-900"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Ao fim de catorze meses
              </span>
              <span className="font-display text-xl font-semibold tabular-nums text-clay-text">
                {estatico || !anual ? (
                  eur(dados.diferencaAnual)
                ) : (
                  <Contador
                    valor={dados.diferencaAnual}
                    formato={eur}
                    inicial={0}
                    duracao={DUR.contaResultado}
                  />
                )}
              </span>
            </m.div>

            <m.p
              initial={false}
              animate={{ opacity: resolvido ? 1 : 0 }}
              transition={t}
              className="mt-2.5 text-[10px] leading-relaxed text-stone-500 dark:text-stone-400"
            >
              Retido a mais volta no acerto do IRS — mas só no ano seguinte, e sem juros. Retido a
              menos é imposto que vais ter de pagar de uma vez.
            </m.p>
          </div>
        </div>
      </m.div>
    </div>
  );
}

/**
 * Um dos dois líquidos em confronto.
 *
 * Os dois nascem iguais e ficam iguais até ao ato 3 — é isso que faz a
 * marca de divergência ter alguma coisa para dizer quando chega. Marcar um
 * deles logo à entrada seria dar a resposta antes de fazer a conferência.
 */
function ValorEmConfronto({
  rotulo,
  Icone,
  valor,
  visivel,
  conta,
  errado,
  certo,
  transicao,
}: {
  rotulo: string;
  Icone: (props: { size?: number; className?: string }) => React.ReactNode;
  valor: number;
  visivel: boolean;
  conta: boolean;
  errado?: boolean;
  certo?: boolean;
  transicao: Transition;
}) {
  return (
    <m.div
      initial={false}
      animate={{ opacity: visivel ? 1 : 0.25, y: visivel ? 0 : 6 }}
      transition={transicao}
      className={`min-w-0 rounded-2xl border p-3 transition-colors duration-500 sm:p-3.5 ${
        errado
          ? "border-clay-border bg-white/80 dark:bg-stone-900/70"
          : certo
            ? "border-brand/35 bg-white/85 dark:bg-stone-900/70"
            : "border-stone-200/80 bg-white/70 dark:border-stone-700/60 dark:bg-stone-900/50"
      }`}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        <Icone size={11} className="flex-shrink-0" />
        <span className="truncate">{rotulo}</span>
      </p>
      <p
        className={`mt-1 font-display text-[clamp(1.35rem,4.6vw,2.1rem)] font-semibold leading-none tabular-nums transition-colors duration-500 ${
          errado
            ? "text-clay-text"
            : certo
              ? "text-brand-dark dark:text-brand-light"
              : "text-stone-800 dark:text-stone-100"
        }`}
      >
        {conta ? (
          <Contador valor={valor} formato={eur} inicial={0} duracao={DUR.contaResultado} />
        ) : (
          eur(valor)
        )}
      </p>
    </m.div>
  );
}
