"use client";

// «A CONFERÊNCIA» — duas contas nascem do mesmo bruto.
//
// O desenho deixou de ser uma tabela de relatório. O vencimento base é a
// raiz comum; daí abrem dois recibos compactos. Um feixe percorre as linhas,
// confirma a Segurança Social e pára no IRS. A diferença desce depois para
// uma projeção explícita e condicional de catorze pagamentos.

import { m, type Transition } from "@/components/palco/motion-lite";
import {
  Briefcase,
  Calculator,
  Calendar,
  Check,
  Close,
  Warning,
} from "@/components/ui/Icons";
import MolduraPalco, { type CenaDoPalco } from "@/components/palco/MolduraPalco";
import { Contador } from "@/components/palco/atores";
import { ATOS_SALARIO, DUR, ENTRADA, ASSENTA } from "./coreografia";

const eur = (n: number) =>
  `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export interface DadosSalario {
  bruto: number;
  ss: number;
  /** A retenção aplicada no recibo demonstrativo — sem o dependente. */
  irsRecibo: number;
  /** A retenção recalculada com o dependente declarado. */
  irsCerto: number;
  liquidoRecibo: number;
  liquidoCerto: number;
  /** Número de pagamentos usado apenas na projeção condicional. */
  pagamentosProjetados: number;
  diferenca14Pagamentos: number;
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
      resumo={`Uma conta com o bruto de ${eur(dados.bruto)} abre em duas: o recibo processado sem o dependente e a retenção refeita com o dependente declarado. A Segurança Social bate; o IRS não.`}
      narracao={[
        `O ponto de partida é o mesmo: ${eur(dados.bruto)} de vencimento base. O recibo usou uma retenção de IRS de ${eur(dados.irsRecibo)}, Segurança Social de ${eur(dados.ss)} e pagou ${eur(dados.liquidoRecibo)}.`,
        `A conta refeita mantém os ${eur(dados.ss)} de Segurança Social, reduz a retenção de IRS para ${eur(dados.irsCerto)} e chega a ${eur(dados.liquidoCerto)} de líquido.`,
        `A Segurança Social confere. A linha que diverge é a retenção de IRS: ${eur(diferencaMensal)} ${aMais ? "retidos a mais" : "retidos a menos"} neste pagamento.`,
        `${dados.motivo} Se o mesmo erro se repetir nos doze vencimentos e nos dois subsídios, a projeção é ${eur(dados.diferenca14Pagamentos)} em catorze pagamentos.`,
      ]}
      atos={ATOS_SALARIO}
    >
      {(cena) => (
        <Cena
          cena={cena}
          dados={dados}
          diferencaMensal={diferencaMensal}
          aMais={aMais}
        />
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

  const origem = noAto(0, "origem");
  const recibo = noAto(0, "recibo");
  const ssRecibo = noAto(0, "linhaSS");
  const irsRecibo = noAto(0, "linhaIRS");
  const liquidoRecibo = noAto(0, "liquidoRecibo");

  const recalculo = noAto(1, "recalculo");
  const ssCerto = noAto(1, "calcSS");
  const irsCerto = noAto(1, "calcIRS");
  const liquidoCerto = noAto(1, "liquidoCerto");

  const varrendo = !estatico && ato === 2 && emCena("varre") && !emCena("ssBate");
  const ssBate = noAto(2, "ssBate");
  const irsFalha = noAto(2, "irsFalha");
  const delta = noAto(2, "delta");

  const causa = estatico || (ato === 3 && emCena("causa"));
  const motivo = estatico || (ato === 3 && emCena("motivo"));
  const pagamentos = estatico || (ato === 3 && emCena("pagamentos"));
  const total = estatico || (ato === 3 && emCena("total"));
  const resolve = estatico || (ato === 3 && emCena("resolve"));

  return (
    <div
      aria-hidden
      className="relative overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[radial-gradient(circle_at_15%_0%,rgba(159,225,203,.22),transparent_34%),linear-gradient(135deg,#ffffff,#f8faf8)] shadow-card dark:border-stone-700 dark:bg-[radial-gradient(circle_at_15%_0%,rgba(19,128,97,.2),transparent_34%),linear-gradient(135deg,#1c1917,#151715)]"
    >
      <div className="relative border-b border-stone-200/80 px-4 py-4 dark:border-stone-700 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <m.div initial={false} animate={{ opacity: origem ? 1 : 0.25 }} transition={t}>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-brand-dark dark:text-brand-mint">
              <Briefcase size={12} /> Recibo em inspeção
            </p>
            <p className="mt-1 text-[10px] text-stone-500 dark:text-stone-400">
              Continente · 2026 · não casado · 1 dependente declarado
            </p>
          </m.div>
          <m.div
            initial={false}
            animate={{ opacity: origem ? 1 : 0 }}
            transition={t}
            className="flex flex-wrap gap-1.5 text-[9px] font-semibold"
          >
            <span className="rounded-full border border-stone-200 bg-white/80 px-2.5 py-1 text-stone-500 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300">
              Base {eur(dados.bruto)}
            </span>
            <span className="rounded-full border border-brand/20 bg-brand-light px-2.5 py-1 text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
              SS 11%
            </span>
          </m.div>
        </div>
      </div>

      <div className="relative grid gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,.72fr)]">
        <div className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white/75 p-3 dark:border-stone-700/80 dark:bg-stone-900/65 sm:p-4">
          <m.div
            initial={false}
            animate={{ opacity: origem ? 1 : 0, y: origem ? 0 : -6 }}
            transition={t}
            className="relative z-10 mx-auto flex max-w-[20rem] items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-brand-light px-3.5 py-2.5 shadow-sm dark:bg-brand/15"
          >
            <span className="text-[9px] font-bold uppercase tracking-[.13em] text-brand-dark dark:text-brand-mint">
              Vencimento base
            </span>
            <span className="font-display text-xl font-semibold tabular-nums text-ink">
              {eur(dados.bruto)}
            </span>
          </m.div>

          <m.div
            initial={false}
            animate={{ opacity: recibo || recalculo ? 1 : 0 }}
            transition={t}
            className="relative mx-auto hidden h-7 max-w-[68%] sm:block"
          >
            <span className="absolute inset-x-0 top-3 border-t border-brand/25" />
            <span className="absolute bottom-0 left-0 top-3 border-l border-brand/25" />
            <span className="absolute bottom-0 right-0 top-3 border-r border-brand/25" />
          </m.div>

          <div className="relative grid gap-3 sm:grid-cols-2">
            <ReciboCompacto
              titulo="Processado no recibo"
              subtitulo="Tabela I · 0 dependentes"
              Icone={Briefcase}
              bruto={dados.bruto}
              ss={dados.ss}
              irs={dados.irsRecibo}
              liquido={dados.liquidoRecibo}
              visivel={recibo}
              ssVisivel={ssRecibo}
              irsVisivel={irsRecibo}
              liquidoVisivel={liquidoRecibo}
              ssConfere={ssBate}
              irsDiverge={irsFalha}
              transicao={t}
              pousa={pousa}
              tom="recibo"
            />
            <ReciboCompacto
              titulo="Conta refeita"
              subtitulo="Tabela II · 1 dependente"
              Icone={Calculator}
              bruto={dados.bruto}
              ss={dados.ss}
              irs={dados.irsCerto}
              liquido={dados.liquidoCerto}
              visivel={recalculo}
              ssVisivel={ssCerto}
              irsVisivel={irsCerto}
              liquidoVisivel={liquidoCerto}
              ssConfere={ssBate}
              irsDiverge={irsFalha}
              transicao={t}
              pousa={pousa}
              tom="certo"
            />
          </div>

          <m.div
            initial={false}
            animate={{ opacity: varrendo ? 1 : 0, y: varrendo ? 156 : 28 }}
            transition={estatico ? { duration: 0 } : { duration: 0.85, ease: ENTRADA }}
            className="pointer-events-none absolute inset-x-5 top-[5.5rem] z-20 h-px bg-gradient-to-r from-transparent via-brand to-transparent shadow-[0_0_12px_rgba(19,128,97,.65)]"
          />

          <m.div
            initial={false}
            animate={{ opacity: delta ? 1 : 0, y: delta ? 0 : 6 }}
            transition={pousa}
            className="relative z-10 mx-auto mt-3 flex max-w-md flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-clay-border bg-clay-bg/65 px-3 py-2.5 text-center"
          >
            <Warning size={12} className="text-clay-text" />
            <span className="text-[10px] font-bold uppercase tracking-[.1em] text-clay-text">
              Só o IRS diverge
            </span>
            <span className="font-display text-lg font-semibold tabular-nums text-clay-text">
              {eur(diferencaMensal)}
            </span>
            <span className="text-[10px] text-stone-500 dark:text-stone-300">
              {aMais ? "retidos a mais" : "retidos a menos"} neste pagamento
            </span>
          </m.div>
        </div>

        <m.aside
          initial={false}
          animate={{ opacity: causa ? 1 : 0.2, x: causa ? 0 : 8 }}
          transition={t}
          className="flex min-w-0 flex-col rounded-3xl border border-clay-border bg-clay-bg/45 p-4"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-clay-text">
            <Calculator size={12} /> A linha que muda
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
            <TabelaRetencao rotulo="Aplicada" tabela="Tabela I" dependentes="0 dep." valor={dados.irsRecibo} />
            <m.span
              initial={false}
              animate={{ opacity: causa ? 1 : 0, scale: causa ? 1 : 0.6 }}
              transition={pousa}
              className="flex h-7 w-7 self-center items-center justify-center rounded-full bg-clay text-white"
            >
              <Close size={11} />
            </m.span>
            <TabelaRetencao rotulo="Declarada" tabela="Tabela II" dependentes="1 dep." valor={dados.irsCerto} certa />
          </div>

          <m.p
            initial={false}
            animate={{ opacity: motivo ? 1 : 0 }}
            transition={t}
            className="mt-3 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300"
          >
            {dados.motivo}
          </m.p>

          <m.div
            initial={false}
            animate={{ opacity: pagamentos ? 1 : 0, y: pagamentos ? 0 : 6 }}
            transition={t}
            className="mt-4 rounded-2xl border border-stone-200 bg-white/75 p-3 dark:border-stone-700 dark:bg-stone-900/65"
          >
            <div className="flex items-start gap-2">
              <Calendar size={13} className="mt-0.5 flex-shrink-0 text-clay-text" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.11em] text-stone-500 dark:text-stone-400">
                  Projeção, se o erro se repetir
                </p>
                <p className="mt-0.5 text-[9px] text-stone-400">
                  12 vencimentos + férias + Natal
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1" aria-label={`${dados.pagamentosProjetados} pagamentos`}>
              {Array.from({ length: dados.pagamentosProjetados }, (_, indice) => (
                <m.span
                  key={indice}
                  initial={false}
                  animate={{ opacity: pagamentos ? 1 : 0, scale: pagamentos ? 1 : 0.5 }}
                  transition={
                    estatico
                      ? { duration: 0 }
                      : { duration: 0.22, delay: Math.min(indice * 0.035, 0.42), ease: ASSENTA }
                  }
                  className={`h-2.5 rounded-full ${indice < 12 ? "w-2.5 bg-clay/70" : "w-5 bg-clay"}`}
                />
              ))}
            </div>

            <m.div
              initial={false}
              animate={{ opacity: total ? 1 : 0 }}
              transition={t}
              className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 border-t border-stone-200 pt-3 dark:border-stone-700"
            >
              <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                {eur(diferencaMensal)} × {dados.pagamentosProjetados}
              </span>
              <span className="font-display text-2xl font-semibold tabular-nums text-clay-text">
                {estatico || !total ? (
                  eur(dados.diferenca14Pagamentos)
                ) : (
                  <Contador
                    valor={dados.diferenca14Pagamentos}
                    formato={eur}
                    inicial={0}
                    duracao={DUR.contaResultado}
                  />
                )}
              </span>
            </m.div>
          </m.div>

          <m.p
            initial={false}
            animate={{ opacity: resolve ? 1 : 0 }}
            transition={t}
            className="mt-3 text-[9px] leading-relaxed text-stone-500 dark:text-stone-400"
          >
            É uma projeção, não um valor garantido: os subsídios são calculados em separado e só
            entram aqui se a mesma situação errada também lhes for aplicada.
          </m.p>
        </m.aside>
      </div>
    </div>
  );
}

function ReciboCompacto({
  titulo,
  subtitulo,
  Icone,
  bruto,
  ss,
  irs,
  liquido,
  visivel,
  ssVisivel,
  irsVisivel,
  liquidoVisivel,
  ssConfere,
  irsDiverge,
  transicao,
  pousa,
  tom,
}: {
  titulo: string;
  subtitulo: string;
  Icone: (props: { size?: number; className?: string }) => React.ReactNode;
  bruto: number;
  ss: number;
  irs: number;
  liquido: number;
  visivel: boolean;
  ssVisivel: boolean;
  irsVisivel: boolean;
  liquidoVisivel: boolean;
  ssConfere: boolean;
  irsDiverge: boolean;
  transicao: Transition;
  pousa: Transition;
  tom: "recibo" | "certo";
}) {
  const certo = tom === "certo";
  return (
    <m.div
      initial={false}
      animate={{ opacity: visivel ? 1 : 0.16, y: visivel ? 0 : 8, rotate: visivel ? 0 : certo ? 1 : -1 }}
      transition={transicao}
      className={`min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-stone-900 ${certo ? "border-brand/30" : "border-stone-200 dark:border-stone-700"}`}
    >
      <div className={`border-b px-3 py-2.5 ${certo ? "border-brand/20 bg-brand-light/70 dark:bg-brand/15" : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50"}`}>
        <p className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.1em] ${certo ? "text-brand-dark dark:text-brand-mint" : "text-stone-500 dark:text-stone-300"}`}>
          <Icone size={11} /> {titulo}
        </p>
        <p className="mt-0.5 text-[9px] text-stone-400">{subtitulo}</p>
      </div>

      <div className="divide-y divide-stone-100 px-3 dark:divide-stone-800">
        <LinhaDeducao
          rotulo="Segurança Social · 11%"
          valor={ss}
          visivel={ssVisivel}
          confere={ssConfere}
          transicao={transicao}
          pousa={pousa}
        />
        <LinhaDeducao
          rotulo="Retenção de IRS"
          valor={irs}
          visivel={irsVisivel}
          diverge={irsDiverge}
          certa={certo}
          transicao={transicao}
          pousa={pousa}
        />
      </div>

      <m.div
        initial={false}
        animate={{ opacity: liquidoVisivel ? 1 : 0 }}
        transition={transicao}
        className="border-t border-stone-200 px-3 py-3 dark:border-stone-700"
      >
        <div className="flex items-end justify-between gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[.1em] text-stone-400">Líquido</span>
          <span className={`font-display text-[clamp(1.2rem,3.5vw,1.75rem)] font-semibold leading-none tabular-nums ${certo && irsDiverge ? "text-brand-dark dark:text-brand-mint" : irsDiverge ? "text-clay-text" : "text-ink"}`}>
            {eur(liquido)}
          </span>
        </div>
        <BarraRecibo bruto={bruto} liquido={liquido} irs={irs} ss={ss} visivel={liquidoVisivel} />
      </m.div>
    </m.div>
  );
}

function LinhaDeducao({
  rotulo,
  valor,
  visivel,
  confere,
  diverge,
  certa,
  transicao,
  pousa,
}: {
  rotulo: string;
  valor: number;
  visivel: boolean;
  confere?: boolean;
  diverge?: boolean;
  certa?: boolean;
  transicao: Transition;
  pousa: Transition;
}) {
  return (
    <div className="relative -mx-3 overflow-hidden px-3">
      <m.span
        aria-hidden
        initial={false}
        animate={{ opacity: confere || diverge ? 1 : 0 }}
        transition={transicao}
        className={`pointer-events-none absolute inset-0 ${diverge ? (certa ? "bg-brand-light/60" : "bg-clay-bg/70") : "bg-brand-light/45"}`}
      />
      <div className="relative flex min-h-[3rem] items-center gap-2 py-2">
        <m.span initial={false} animate={{ opacity: visivel ? 1 : 0, x: visivel ? 0 : -4 }} transition={transicao} className="min-w-0 flex-1 text-[10px] font-semibold text-stone-600 dark:text-stone-300">
          {rotulo}
        </m.span>
        <m.span initial={false} animate={{ opacity: visivel ? 1 : 0 }} transition={transicao} className={`text-[10px] font-semibold tabular-nums ${diverge && !certa ? "text-clay-text" : "text-stone-600 dark:text-stone-300"}`}>
          − {eur(valor)}
        </m.span>
        <m.span
          initial={false}
          animate={{ opacity: confere || diverge ? 1 : 0, scale: confere || diverge ? 1 : 0.55 }}
          transition={pousa}
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white ${diverge && !certa ? "bg-clay" : "bg-brand"}`}
        >
          {diverge && !certa ? <Close size={9} /> : <Check size={9} />}
        </m.span>
      </div>
    </div>
  );
}

function BarraRecibo({
  bruto,
  liquido,
  irs,
  ss,
  visivel,
}: {
  bruto: number;
  liquido: number;
  irs: number;
  ss: number;
  visivel: boolean;
}) {
  const pct = (valor: number) => `${(valor / Math.max(1, bruto)) * 100}%`;
  return (
    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
      <span className="h-full bg-brand transition-[width] duration-700" style={{ width: visivel ? pct(liquido) : "0%" }} />
      <span className="h-full bg-brand-mint transition-[width] duration-700" style={{ width: visivel ? pct(irs) : "0%" }} />
      <span className="h-full bg-brand-deep transition-[width] duration-700" style={{ width: visivel ? pct(ss) : "0%" }} />
    </div>
  );
}

function TabelaRetencao({
  rotulo,
  tabela,
  dependentes,
  valor,
  certa,
}: {
  rotulo: string;
  tabela: string;
  dependentes: string;
  valor: number;
  certa?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-2xl border p-2.5 ${certa ? "border-brand/30 bg-brand-light/55 dark:bg-brand/15" : "border-clay-border bg-white/70 dark:bg-stone-900/60"}`}>
      <span className={`block text-[8px] font-bold uppercase tracking-[.1em] ${certa ? "text-brand-dark dark:text-brand-mint" : "text-clay-text"}`}>{rotulo}</span>
      <span className="mt-1 block truncate text-[10px] font-semibold text-stone-700 dark:text-stone-200">{tabela}</span>
      <span className="block text-[9px] text-stone-400">{dependentes}</span>
      <span className={`mt-2 block text-[11px] font-bold tabular-nums ${certa ? "text-brand-dark dark:text-brand-mint" : "text-clay-text"}`}>− {eur(valor)}</span>
    </div>
  );
}
