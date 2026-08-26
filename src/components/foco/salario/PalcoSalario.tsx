"use client";

import { m } from "motion/react";
import { Briefcase, Calculator, Check, Close, Warning } from "@/components/ui/Icons";
import MolduraPalco, { type CenaDoPalco } from "@/components/palco/MolduraPalco";
import { Contador } from "@/components/palco/atores";
import { ATOS_SALARIO, DUR, ENTRADA, ASSENTA } from "./coreografia";

const eur = (n: number) =>
  `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

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
        `Porquê: ${dados.motivo} A diferença ao fim do ano é de cerca de ${eur(dados.diferencaAnual)}.`,
      ]}
      atos={ATOS_SALARIO}
    >
      {(cena) => <Cena cena={cena} dados={dados} />}
    </MolduraPalco>
  );
}

function Cena({ cena, dados }: { cena: CenaDoPalco; dados: DadosSalario }) {
  const { ato, emCena, estatico } = cena;
  const t = estatico ? { duration: 0 } : { duration: DUR.entrada / 1000, ease: ENTRADA };

  const noAto = (indice: number, beat: string) =>
    estatico || ato > indice || (ato === indice && emCena(beat));

  // ── Ato 1 · o recibo chega ─────────────────────────────────────────
  const papel = noAto(0, "papel");
  const brutoLido = noAto(0, "bruto");
  const linhaLida = [noAto(0, "linha1"), noAto(0, "linha2"), noAto(0, "linha3")];
  const liquidoRecibo = noAto(0, "liquidoRecibo");

  // ── Ato 2 · a conta refaz-se ───────────────────────────────────────
  const colunaAberta = estatico || ato > 1 || (ato === 1 && emCena("abreColuna"));
  const calc = [noAto(1, "calcSS"), noAto(1, "calcIRS"), noAto(1, "calcSub")];
  const liquidoMotor = noAto(1, "liquidoMotor");

  // ── Ato 3 · o confronto ────────────────────────────────────────────
  // As três que batem acendem quase em simultâneo. A que falha vem depois
  // de 380 ms de silêncio — e é por NÃO ter acendido com as outras que se
  // vê. A Lei do Destino Comum usada como pinça, e não como cola.
  const bate = [noAto(2, "bate1"), noAto(2, "bate2"), noAto(2, "bate3")];
  const falhou = noAto(2, "falha");
  const marcada = noAto(2, "marcaFalha");

  // ── Ato 4 · a explicação ───────────────────────────────────────────
  const explica = estatico || (ato === 3 && emCena("abreExplicacao"));
  const motivo = estatico || (ato === 3 && emCena("motivo"));
  const anual = estatico || (ato === 3 && emCena("anual"));
  const resolvido = estatico || (ato === 3 && emCena("resolve"));

  const LINHAS = [
    {
      id: "bruto",
      rotulo: "Vencimento base",
      curto: "Base",
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
      recibo: 0,
      certo: 0,
      sinal: "",
      visivelRecibo: linhaLida[2],
      visivelCerto: calc[2],
      bate: bate[2],
      erro: false,
      nota: "pagos por duodécimos",
    },
  ] as const;

  return (
    <div aria-hidden className="relative">
      {/* ── O CONFRONTO É A ESTRUTURA ────────────────────────────────
          Nenhum outro palco do site põe duas versões da mesma coisa em
          colunas adjacentes. É a única forma de mostrar uma auditoria
          sem a explicar por palavras — e é a razão de este foco deixar
          de ser a cascata de deduções do recibo verde com outro número. */}
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
        <div className="grid grid-cols-[minmax(0,1fr)_4.1rem_4.1rem_1.2rem] items-end gap-x-2 border-b border-stone-200 px-3 py-2.5 dark:border-stone-700 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_2.5rem] sm:px-4">
          <span className="text-[9px] font-bold uppercase tracking-[.14em] text-stone-400">
            Linha
          </span>
          <m.span
            initial={false}
            animate={{ opacity: papel ? 1 : 0.3 }}
            transition={t}
            className="flex items-center justify-end gap-1 text-right text-[9px] font-bold uppercase tracking-wide text-stone-500"
          >
            <Briefcase size={11} className="flex-shrink-0" />
            <span className="truncate">No recibo</span>
          </m.span>
          <m.span
            initial={false}
            animate={{ opacity: colunaAberta ? 1 : 0.25 }}
            transition={t}
            className="flex items-center justify-end gap-1 text-right text-[9px] font-bold uppercase tracking-wide text-brand"
          >
            <Calculator size={11} className="flex-shrink-0" />
            <span className="truncate">Devia ser</span>
          </m.span>
          <span className="sr-only">Confere</span>
          <span aria-hidden />
        </div>

        <div>
          {LINHAS.map((linha) => {
            const divergente = linha.id === "irs" && linha.erro;
            return (
              <m.div
                key={linha.id}
                initial={false}
                animate={{
                  backgroundColor: divergente
                    ? marcada
                      ? "rgba(246,231,224,.85)"
                      : "rgba(246,231,224,0)"
                    : linha.bate
                      ? "rgba(223,240,232,.55)"
                      : "rgba(223,240,232,0)",
                }}
                transition={t}
                className="grid grid-cols-[minmax(0,1fr)_4.1rem_4.1rem_1.2rem] items-center gap-x-2 border-b border-stone-100 px-3 py-2.5 last:border-b-0 dark:border-stone-800 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_2.5rem] sm:px-4"
              >
                <div className="min-w-0">
                  {/* Dois rótulos e não um cortado: a 320 px «Vencimento
                      base» não cabe em 99 px, e reticências num nome de
                      linha de recibo não são um nome. */}
                  <span className="block text-[11px] font-semibold text-stone-700 dark:text-stone-200 sm:hidden">
                    {linha.curto}
                  </span>
                  <span className="hidden text-[11px] font-semibold text-stone-700 dark:text-stone-200 sm:block sm:truncate">
                    {linha.rotulo}
                  </span>
                  {"nota" in linha && linha.nota ? (
                    <span className="hidden text-[9px] text-stone-400 sm:block sm:truncate">{linha.nota}</span>
                  ) : null}
                </div>

                <m.span
                  initial={false}
                  animate={{ opacity: linha.visivelRecibo ? 1 : 0 }}
                  transition={t}
                  className="text-right text-[11px] font-semibold tabular-nums text-stone-600 dark:text-stone-300"
                >
                  {linha.recibo === 0 ? "incluídos" : `${linha.sinal}${eur(linha.recibo)}`}
                </m.span>

                <m.span
                  initial={false}
                  animate={{ opacity: linha.visivelCerto ? 1 : 0 }}
                  transition={t}
                  className={`text-right text-[11px] font-semibold tabular-nums ${
                    divergente && marcada ? "text-clay-text" : "text-stone-600 dark:text-stone-300"
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
                    transition={
                      estatico
                        ? { duration: 0 }
                        : { duration: DUR.assenta / 1000, ease: ASSENTA }
                    }
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      divergente ? "bg-clay text-white" : "bg-brand text-white"
                    }`}
                  >
                    {divergente ? <Close size={10} /> : <Check size={10} />}
                  </m.span>
                </span>
              </m.div>
            );
          })}
        </div>

        {/* Os dois líquidos, lado a lado. */}
        <div className="grid grid-cols-[minmax(0,1fr)_4.1rem_4.1rem_1.2rem] items-center gap-x-2 border-t border-stone-200 bg-stone-50 px-3 py-3 dark:border-stone-700 dark:bg-stone-800/50 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_2.5rem] sm:px-4">
          <span className="text-[11px] font-bold text-stone-700 dark:text-stone-100">
            Líquido a receber
          </span>
          <m.span
            initial={false}
            animate={{ opacity: liquidoRecibo ? 1 : 0 }}
            transition={t}
            className="text-right font-display text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-200"
          >
            {estatico || !liquidoRecibo ? (
              eur(dados.liquidoRecibo)
            ) : (
              <Contador valor={dados.liquidoRecibo} formato={eur} inicial={0} duracao={DUR.contaResultado} />
            )}
          </m.span>
          <m.span
            initial={false}
            animate={{ opacity: liquidoMotor ? 1 : 0 }}
            transition={t}
            className="text-right font-display text-sm font-semibold tabular-nums text-brand-dark dark:text-brand-mint"
          >
            {estatico || !liquidoMotor ? (
              eur(dados.liquidoCerto)
            ) : (
              <Contador valor={dados.liquidoCerto} formato={eur} inicial={0} duracao={DUR.contaResultado} />
            )}
          </m.span>
          <span aria-hidden />
        </div>
      </div>

      {/* ── A explicação da linha que não bate ────────────────────── */}
      <m.div
        initial={false}
        animate={{
          opacity: explica ? 1 : 0,
          y: explica ? 0 : 8,
        }}
        transition={t}
        className="mt-3 overflow-hidden rounded-3xl border border-clay-border bg-clay-bg/50 p-4"
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-clay text-white">
            <Warning size={13} />
          </span>
          <div className="min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-wide text-clay-text">
              A linha que não bate
            </span>
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
              className="mt-2.5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-clay-border bg-white px-3 py-2 dark:bg-stone-900"
            >
              <span className="text-[10px] text-stone-500">Ao fim de catorze meses:</span>
              <span className="font-display text-base font-semibold tabular-nums text-clay-text">
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
              className="mt-2 text-[10px] leading-relaxed text-stone-500"
            >
              Retido a mais volta no acerto do IRS — mas só no ano seguinte, e sem juros. Retido
              a menos é imposto que vais ter de pagar de uma vez.
            </m.p>
          </div>
        </div>
      </m.div>
    </div>
  );
}
