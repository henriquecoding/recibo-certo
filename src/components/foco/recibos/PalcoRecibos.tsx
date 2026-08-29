"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { m } from "@/components/palco/motion-lite";
import { Calendar, Check, Lock, Receipt, ShieldCheck, Warning } from "@/components/ui/Icons";
import MolduraPalco, { type CenaDoPalco } from "@/components/palco/MolduraPalco";
import { Contador, Ficha, Anel, type FichaEmCena } from "@/components/palco/atores";
import { Ponteiro, Toque, type LeituraPonteiro } from "@/components/palco/ponteiro";
import type { Ponto } from "@/components/palco/medida";
import {
  ATOS_RECIBOS,
  DIGITACAO,
  DUR,
  ENTRADA,
  ASSENTA,
  medir,
  type Curva,
} from "./coreografia";
import { usePrazoSSAtual, type PrazoSSResolvido } from "./PrazoSSAtual";

// ═══════════════════════════════════════════════════════════════════════
//  A PALETA DESTA CENA
//  ---------------------------------------------------------------------
//  Três tipos de dinheiro, três cores, e a cor É a informação:
//    brand · o que fica contigo
//    clay  · a retenção de IRS — sai da fatura e não volta
//    areia · a Segurança Social — a única com data
// ═══════════════════════════════════════════════════════════════════════
const SOMBRA = "shadow-[0_8px_28px_rgba(4,36,28,.14)]";
const TOM = {
  teu: `border-brand/45 bg-brand-light text-brand-dark ${SOMBRA} dark:bg-brand/25 dark:text-brand-mint`,
  irs: `border-clay-border bg-clay-bg text-clay-text ${SOMBRA}`,
  ss: `border-categoria-areia-border bg-categoria-areia-bg text-categoria-areia-text ${SOMBRA} dark:border-stone-600 dark:bg-stone-800 dark:text-[#e7c98e]`,
} as const;

const ANEL = {
  teu: "border-brand",
  irs: "border-clay-border",
  ss: "border-categoria-areia-border",
} as const;

const SEM_PRAZOS: readonly string[] = [];

type TomRecibo = keyof typeof TOM;

const eur = (n: number) =>
  `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export interface DadosRecibo {
  bruto: number;
  liquido: number;
  retencaoIRS: number;
  segSocial: number;
  taxaRetencao: number;
  /** O dia em que a Segurança Social sai da conta. */
  prazoSS: string;
  /** Quantos dias faltam para esse prazo, calculados no servidor. */
  diasParaPrazo: number;
}

/** Versão estável do payload: a data corrente é escolhida no dispositivo. */
export interface DadosReciboSnapshot {
  bruto: number;
  liquido: number;
  retencaoIRS: number;
  segSocial: number;
  taxaRetencao: number;
  prazosSS: readonly string[];
}

export type DadosReciboHomepage = DadosRecibo | DadosReciboSnapshot;

interface Impacto {
  id: string;
  em: Ponto;
  tom: TomRecibo;
}

export default function PalcoRecibos({ dados }: { dados: DadosReciboHomepage }) {
  const reservado = dados.retencaoIRS + dados.segSocial;
  const prazoDoSnapshot = usePrazoSSAtual(
    "prazosSS" in dados ? dados.prazosSS : SEM_PRAZOS,
  );
  const prazo =
    "prazoSS" in dados
      ? { iso: "", rotulo: dados.prazoSS, dias: dados.diasParaPrazo }
      : prazoDoSnapshot;
  const rotuloPrazo = prazo?.rotulo ?? "ao próximo dia 20";

  return (
    <MolduraPalco
      id="palco-recibos"
      tom="claro"
      nome="A repartição"
      resumo={`Um recibo de ${eur(dados.bruto)} parte-se em três: o que fica contigo, a retenção de IRS e a contribuição para a Segurança Social — que tem prazo.`}
      narracao={[
        `Valor: o recibo é de ${eur(dados.bruto)}, ao abrigo do Art. 151.º.`,
        `Repartir: ${eur(dados.liquido)} ficam contigo, ${eur(dados.retencaoIRS)} são retenção de IRS a ${Math.round(dados.taxaRetencao * 100)}% e ${eur(dados.segSocial)} são a contribuição para a Segurança Social.`,
        `Datar: a contribuição para a Segurança Social é paga até ${rotuloPrazo}. A retenção já foi entregue pelo cliente.`,
        `Reservar: ${eur(reservado)} não são para gastar. O que sobra mesmo para gastar são ${eur(dados.liquido)}.`,
      ]}
      atos={ATOS_RECIBOS}
    >
      {(cena) => <Cena cena={cena} dados={dados} prazo={prazo} />}
    </MolduraPalco>
  );
}

function Cena({
  cena,
  dados,
  prazo,
}: {
  cena: CenaDoPalco;
  dados: DadosReciboHomepage;
  prazo: PrazoSSResolvido | null;
}) {
  const { ato, feito, emCena, estatico, ciclo, palcoRef } = cena;
  const [fichas, setFichas] = useState<FichaEmCena[]>([]);
  const [chegadas, setChegadas] = useState<ReadonlySet<string>>(new Set());
  const [impactos, setImpactos] = useState<Impacto[]>([]);
  const lancadasRef = useRef(new Set<string>());
  const tomDaFichaRef = useRef(new Map<string, TomRecibo>());

  const campoRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLDivElement>(null);
  const notaRef = useRef<HTMLDivElement>(null);
  const alvoTeuRef = useRef<HTMLDivElement>(null);
  const alvoIRSRef = useRef<HTMLDivElement>(null);
  const alvoSSRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lancadasRef.current.clear();
    setFichas([]);
    setChegadas(new Set());
    setImpactos([]);
  }, [ato, ciclo]);

  const aoChegar = useCallback((id: string) => {
    setChegadas((atuais) => new Set([...atuais, id]));
  }, []);
  const aoSair = useCallback((id: string) => {
    setFichas((atuais) => atuais.filter((f) => f.id !== id));
  }, []);

  useEffect(() => {
    if (estatico || ato !== 1) return;
    const lancar = (
      id: string,
      beat: string,
      destino: Element | null,
      rotulo: string,
      tom: TomRecibo,
    ) => {
      if (!feito(beat) || lancadasRef.current.has(id)) return;
      const origem = medir(notaRef.current, palcoRef.current);
      const alvo = medir(destino, palcoRef.current);
      if (!origem || !alvo) return;
      lancadasRef.current.add(id);
      tomDaFichaRef.current.set(id, tom);
      setFichas((atuais) => [
        ...atuais,
        { id, origem, destino: alvo, rotulo, tom: TOM[tom], duracao: DUR.viagemAmpla },
      ]);
    };
    // ── AS FICHAS DIVERGEM, e é isso que separa este palco do preço ──
    //  Lá, três origens diferentes convergem para um cartão que soma.
    //  Aqui, UMA origem parte-se em três. Mesma maquinaria, argumento
    //  oposto — e por isso as três partem do mesmo ponto medido.
    lancar("rep-teu", "fichaTeu", alvoTeuRef.current, eur(dados.liquido), "teu");
    lancar("rep-irs", "fichaIRS", alvoIRSRef.current, eur(dados.retencaoIRS), "irs");
    lancar("rep-ss", "fichaSS", alvoSSRef.current, eur(dados.segSocial), "ss");
  }, [ato, estatico, feito, palcoRef, dados]);

  useEffect(() => {
    const porChegar = fichas.filter((f) => chegadas.has(f.id));
    if (porChegar.length === 0) return;
    setImpactos((atuais) => {
      const jaLa = new Set(atuais.map((i) => i.id));
      const novos = porChegar
        .filter((f) => !jaLa.has(f.id))
        .map((f) => ({
          id: f.id,
          em: f.destino,
          tom: tomDaFichaRef.current.get(f.id) ?? "teu",
        }));
      return novos.length ? [...atuais, ...novos] : atuais;
    });
  }, [chegadas, fichas]);

  const chegou = (id: string, atoConcluido: number) =>
    estatico || ato > atoConcluido || chegadas.has(id);

  // ── Ato 1 · a digitação ────────────────────────────────────────────
  const escrito = (() => {
    if (estatico || ato > 0) return eur(dados.bruto);
    if (emCena("formata")) return eur(dados.bruto);
    for (let i = DIGITACAO.length - 1; i >= 0; i -= 1) {
      if (feito(DIGITACAO[i].beat)) return DIGITACAO[i].texto;
    }
    return "";
  })();
  const campoAceso = emCena("campo");
  const calculou = estatico || ato > 0 || emCena("calcula");

  // ── A MÃO ──────────────────────────────────────────────────────────
  //  O ponteiro não recebe um destino por beat: recebe uma FUNÇÃO que
  //  lhe diz, a cada frame, onde é que ele quer estar. Ver o cabeçalho
  //  de `palco/ponteiro.tsx` — a versão anterior era um tween que
  //  reiniciava a cada beat e media o alvo uma vez só, com o palco ainda
  //  a encher-se. O cursor nascia fora do palco e arrastava-se.
  //
  //  Aqui o alvo é remedido a cada frame. Se uma peça se mexer a meio do
  //  percurso — e mexe-se, porque as colunas ainda estão a preencher-se
  //  — o cursor acompanha-a em vez de ir para onde ela já não está.
  const [toques, setToques] = useState<{ id: string; em: Ponto }[]>([]);
  const feitoRef = useRef(feito);
  feitoRef.current = feito;
  const atoRef = useRef(ato);
  atoRef.current = ato;
  const estaticoRef = useRef(estatico);
  estaticoRef.current = estatico;

  const lerPonteiro = useCallback((): LeituraPonteiro => {
    const palco = palcoRef.current;
    if (estaticoRef.current || atoRef.current !== 0 || !palco) {
      return { ponto: null, premido: false };
    }
    const f = feitoRef.current;
    const centro = (alvo: Element | null, fx = 0.34, fy = 0.62) => {
      if (!alvo) return null;
      const a = alvo.getBoundingClientRect();
      const b = palco.getBoundingClientRect();
      if (a.width === 0) return null;
      return { x: a.left - b.left + a.width * fx, y: a.top - b.top + a.height * fy };
    };

    if (!f("ponteiroEntra")) return { ponto: null, premido: false };

    // 4 · o botão
    if (f("vaiAoBotao")) {
      return {
        ponto: f("calcula") ? null : centro(botaoRef.current, 0.5, 0.5),
        premido: f("clicaBotao") && !f("soltaBotao"),
      };
    }
    // 3 · estaciona enquanto se escreve — afasta-se para não tapar
    if (f("d1")) {
      const c = centro(campoRef.current);
      return { ponto: c ? { x: c.x + 104, y: c.y + 58 } : null, premido: false };
    }
    // 2 · o campo
    if (f("vaiAoCampo")) {
      return {
        ponto: centro(campoRef.current),
        premido: f("clicaCampo") && !f("soltaCampo"),
      };
    }
    // 1 · entra em cena PARADO, à direita e a meia altura. `imediato`
    //     porque uma entrada não é um percurso: aparecer já a viajar do
    //     canto lê-se como um erro a acontecer devagar.
    const b = palco.getBoundingClientRect();
    return { ponto: { x: b.width * 0.66, y: b.height * 0.34 }, premido: false, imediato: true };
  }, [palcoRef]);

  // Os anéis de toque: um por clique, uma vez cada.
  useEffect(() => {
    if (estatico || ato !== 0) {
      setToques([]);
      return;
    }
    const palco = palcoRef.current;
    if (!palco) return;
    const centro = (alvo: Element | null, fx: number, fy: number) => {
      if (!alvo) return null;
      const a = alvo.getBoundingClientRect();
      const b = palco.getBoundingClientRect();
      if (a.width === 0) return null;
      return { x: a.left - b.left + a.width * fx, y: a.top - b.top + a.height * fy };
    };
    const marcar = (id: string, ponto: Ponto | null) => {
      if (!ponto) return;
      setToques((t) => (t.some((x) => x.id === id) ? t : [...t, { id, em: ponto }]));
    };
    if (feito("clicaCampo")) marcar("campo", centro(campoRef.current, 0.34, 0.62));
    if (feito("clicaBotao")) marcar("botao", centro(botaoRef.current, 0.5, 0.5));
  }, [ato, ciclo, estatico, feito, palcoRef]);

  const focado = !estatico && ato === 0 && emCena("clicaCampo");
  const botaoPremido = !estatico && ato === 0 && emCena("clicaBotao") && !emCena("soltaBotao");

  const teuChegou = chegou("rep-teu", 1);
  const irsChegou = chegou("rep-irs", 1);
  const ssChegou = chegou("rep-ss", 1);
  const repartido = teuChegou && irsChegou && ssChegou;

  const datado = estatico || ato > 2 || (ato === 2 && emCena("dataSS"));
  const dataIRS = estatico || ato > 2 || (ato === 2 && emCena("dataIRS"));
  const contaDias = estatico || ato > 2 || (ato === 2 && emCena("contaDias"));

  const reservou = estatico || (ato === 3 && emCena("moveSS"));
  const desceu = estatico || (ato === 3 && emCena("desceDisponivel"));
  const resolvido = estatico || (ato === 3 && emCena("resolve"));

  const reservado = dados.retencaoIRS + dados.segSocial;
  const t = estatico ? { duration: 0 } : { duration: DUR.entrada / 1000, ease: ENTRADA };

  return (
    <>
      <div aria-hidden className="relative grid gap-3 lg:grid-cols-[.9fr_1.15fr_.95fr]">
        {/* ── 1. O recibo ─────────────────────────────────────────── */}
        <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[.17em] text-stone-400">
                Recibo · 01
              </div>
              <div className="mt-1 text-xs font-semibold text-stone-700 dark:text-stone-200">
                O que emitiste
              </div>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-brand dark:border-stone-600 dark:bg-stone-900">
              <Receipt size={14} />
            </span>
          </div>

          {/* O campo, com a hesitação que a homepage antiga tinha e que é a
              melhor coisa que lá existe. O que mudou: era uma cadeia de
              `setTimeout`, que não sabe o que é uma pausa. Agora são beats
              do relógio do ato. */}
          <div className="mt-4">
            <span className="block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
              Valor do serviço
            </span>
            <m.div
              ref={campoRef}
              initial={false}
              animate={{
                borderColor: focado
                  ? "rgba(23,126,94,.9)"
                  : campoAceso
                    ? "rgba(23,126,94,.5)"
                    : "rgba(214,206,191,1)",
                boxShadow: focado
                  ? "0 0 0 3px rgba(23,126,94,.16)"
                  : "0 0 0 0px rgba(23,126,94,0)",
              }}
              transition={t}
              className="mt-1.5 flex min-h-[52px] items-center rounded-2xl border-2 bg-white px-3 dark:bg-stone-900"
            >
              <span className="font-display text-2xl font-semibold tabular-nums text-ink">
                {escrito || <span className="text-stone-300">0</span>}
              </span>
              {!estatico && ato === 0 && focado && !emCena("formata") && (
                <span
                  className="ml-0.5 inline-block h-6 w-px animate-pulse bg-brand"
                  style={{ animationDuration: "1s" }}
                />
              )}
            </m.div>
            {/* `text-stone-500` e não `stone-400`: medido, o 400 dava
                4,26:1 sobre a pastilha escura — abaixo dos 4,5 de AA para
                texto pequeno. O 500 sobe para 5,4:1 e no claro mantém-se
                acima. Apanhado pela varredura de contraste de
                `palcos:e2e`, que o axe não apanha. */}
            <div className="mt-2 flex items-center gap-1.5 text-[9px] text-stone-500 dark:text-stone-300">
              <span className="rounded-full bg-stone-100 px-2 py-0.5 font-semibold dark:bg-stone-800">
                Art. 151.º
              </span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 font-semibold dark:bg-stone-800">
                Continente
              </span>
            </div>

            {/* ── O BOTÃO QUE O CURSOR CLICA ─────────────────────────
                Sem ele o ponteiro não tinha onde aterrar e o resultado
                aparecia sozinho. Um cálculo que acontece sem ninguém o
                mandar fazer não é uma demonstração do produto: é uma
                animação por cima dele.

                É um `div` e não um `button`: a cena inteira é
                `aria-hidden` e quem usa teclado ou leitor de ecrã tem o
                CTA a sério por baixo do palco. Um botão de verdade aqui
                seria uma paragem de tabulação que não faz nada. */}
            <m.div
              ref={botaoRef}
              initial={false}
              animate={{
                opacity: emCena("formata") || calculou ? 1 : 0.45,
                scale: botaoPremido ? 0.97 : 1,
                backgroundColor: calculou ? "rgb(23,126,94)" : "rgb(23,126,94)",
              }}
              transition={estatico ? { duration: 0 } : { duration: DUR.micro / 1000, ease: ENTRADA }}
              className="mt-3 flex min-h-[40px] items-center justify-center gap-1.5 rounded-2xl px-4 text-xs font-semibold text-white shadow-glow"
            >
              {calculou ? <Check size={13} /> : null}
              {calculou ? "Calculado" : "Calcular"}
            </m.div>
          </div>

          {/* A nota: a origem de onde as três fichas se partem. */}
          <m.div
            ref={notaRef}
            initial={false}
            animate={{
              opacity: calculou ? 1 : 0.25,
              y: repartido && ato === 1 ? -2 : 0,
              scale: emCena("nota") && ato === 1 ? 1 : 1,
            }}
            transition={t}
            className="mt-4 rounded-2xl border border-brand/30 bg-brand-light px-3 py-2.5 dark:bg-brand/15"
          >
            <span className="block text-[8px] font-bold uppercase tracking-wide text-brand-dark dark:text-brand-mint">
              Entra na conta
            </span>
            <span className="mt-0.5 block font-display text-lg font-semibold tabular-nums text-ink">
              {calculou ? eur(dados.bruto) : "—"}
            </span>
          </m.div>
        </div>

        {/* ── 2. Os três destinos ─────────────────────────────────── */}
        <div className="rounded-3xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[.17em] text-stone-400">
                Repartição · 02
              </div>
              <div className="mt-1 text-xs font-semibold text-stone-700 dark:text-stone-200">
                Para onde vai cada parte
              </div>
            </div>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
                repartido
                  ? "border-brand/40 bg-brand-light text-brand"
                  : "border-stone-200 bg-stone-50 text-stone-300 dark:border-stone-700 dark:bg-stone-800"
              }`}
            >
              <Check size={14} />
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <Destino
              refAlvo={alvoTeuRef}
              chegou={teuChegou}
              tom="teu"
              rotulo="Fica contigo"
              valor={dados.liquido}
              nota="Depois de tudo o que sai"
              t={t}
            />
            <Destino
              refAlvo={alvoIRSRef}
              chegou={irsChegou}
              tom="irs"
              rotulo={`Retenção de IRS · ${Math.round(dados.taxaRetencao * 100)}%`}
              valor={dados.retencaoIRS}
              nota={dataIRS ? "Entregue pelo cliente — já saiu" : "Sai da fatura"}
              data={dataIRS ? "já entregue" : undefined}
              t={t}
            />
            <Destino
              refAlvo={alvoSSRef}
              chegou={ssChegou}
              tom="ss"
              rotulo="Segurança Social"
              valor={dados.segSocial}
              nota="Pagas tu, no trimestre seguinte"
              data={datado ? (prazo?.rotulo ?? "próximo dia 20") : undefined}
              destaque={datado}
              t={t}
            />
          </div>

          {/* A soma que confirma que nada se perdeu no caminho. */}
          <m.div
            initial={false}
            animate={{ opacity: emCena("parcelas") && (ato >= 1 || estatico) ? 1 : 0 }}
            transition={t}
            className="mt-3 rounded-2xl border border-dashed border-stone-300 px-3 py-2 text-[10px] tabular-nums text-stone-500 dark:border-stone-700"
          >
            {eur(dados.liquido)} + {eur(dados.retencaoIRS)} + {eur(dados.segSocial)} ={" "}
            <strong className="text-stone-700 dark:text-stone-200">{eur(dados.bruto)}</strong>
          </m.div>

          {/* O contador de dias: a única data em movimento do site. */}
          <m.div
            initial={false}
            animate={{ opacity: contaDias ? 1 : 0, y: contaDias ? 0 : 4 }}
            transition={t}
            className="mt-2 flex items-center gap-2 rounded-2xl border border-categoria-areia-border bg-categoria-areia-bg px-3 py-2 dark:border-stone-600 dark:bg-stone-800"
          >
            <Calendar size={13} className="flex-shrink-0 text-categoria-areia-text dark:text-[#e7c98e]" />
            <span className="text-[10px] font-semibold text-categoria-areia-text dark:text-[#e7c98e]">
              Faltam{" "}
              <span className="tabular-nums">
                {prazo && contaDias && !estatico ? (
                  <Contador
                    valor={prazo.dias}
                    formato={(n) => String(Math.round(n))}
                    inicial={0}
                    duracao={DUR.contaResultado}
                  />
                ) : (
                  (prazo?.dias ?? "—")
                )}
              </span>{" "}
              dias
            </span>
          </m.div>
        </div>

        {/* ── 3. O que fica ───────────────────────────────────────── */}
        <div className="flex flex-col rounded-3xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[.17em] text-stone-400">
                Saída · 03
              </div>
              <div className="mt-1 text-xs font-semibold text-stone-700 dark:text-stone-200">
                {desceu ? "O que é mesmo para gastar" : "O que parece teu"}
              </div>
            </div>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
                resolvido
                  ? "border-brand/40 bg-brand-light text-brand"
                  : "border-stone-200 bg-white text-stone-300 dark:border-stone-700 dark:bg-stone-900"
              }`}
            >
              <Lock size={14} />
            </span>
          </div>

          {/* ── O NÚMERO QUE DESCE ──────────────────────────────────
              Todos os outros palcos do site constroem para cima. Este
              constrói e depois TIRA — e é a razão de existir. A mentira
              a desfazer é «recebi 2 000 €», e uma animação que só soma
              nunca a desfaz. */}
          <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 text-center dark:border-stone-700 dark:bg-stone-900">
            <span className="block text-[9px] font-bold uppercase tracking-wide text-stone-400">
              Disponível para gastar
            </span>
            <m.div
              initial={false}
              animate={{ scale: desceu && ato === 3 ? 1 : 1 }}
              transition={estatico ? { duration: 0 } : { duration: DUR.assenta / 1000, ease: ASSENTA }}
              className="mt-1 font-display text-[clamp(1.9rem,4.4vw,2.6rem)] font-semibold leading-none tabular-nums text-ink"
            >
              {estatico ? (
                eur(dados.liquido)
              ) : (
                <Contador
                  valor={desceu ? dados.liquido : calculou ? dados.bruto : 0}
                  formato={eur}
                  inicial={0}
                  duracao={DUR.contaResultado}
                />
              )}
            </m.div>
            <m.p
              initial={false}
              animate={{ opacity: desceu ? 1 : 0 }}
              transition={t}
              className="mt-2 text-[10px] leading-relaxed text-clay-text"
            >
              Desceu {eur(dados.bruto - dados.liquido)}. Essa parte nunca foi tua.
            </m.p>
          </div>

          {/* A reserva enche-se com o que saiu do número de cima. */}
          <m.div
            initial={false}
            animate={{
              opacity: emCena("abreReserva") && (ato >= 3 || estatico) ? 1 : 0.2,
              borderColor: reservou ? "rgba(194,116,90,.5)" : "rgba(214,206,191,1)",
            }}
            transition={t}
            className="mt-3 rounded-2xl border-2 border-dashed p-3"
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-clay-text" />
              <span className="text-[9px] font-bold uppercase tracking-wide text-clay-text">
                Reservado — não é para gastar
              </span>
            </div>
            <div className="mt-1.5 font-display text-xl font-semibold tabular-nums text-clay-text">
              {estatico ? (
                eur(reservado)
              ) : (
                <Contador
                  valor={reservou ? reservado : 0}
                  formato={eur}
                  inicial={0}
                  duracao={DUR.contaResultado}
                />
              )}
            </div>
            <p className="mt-1 text-[9px] leading-relaxed text-stone-500">
              Retenção já entregue + Segurança Social por pagar até {prazo?.rotulo ?? "ao próximo dia 20"}.
            </p>
          </m.div>

          <m.div
            initial={false}
            animate={{ opacity: resolvido ? 1 : 0, y: resolvido ? 0 : 6 }}
            transition={t}
            className="mt-auto flex items-start gap-2 pt-3"
          >
            <Warning size={12} className="mt-0.5 flex-shrink-0 text-categoria-areia-text" />
            <p className="text-[10px] leading-relaxed text-stone-500">
              Quem gasta o recibo inteiro paga a Segurança Social com o dinheiro do mês
              seguinte. É assim que a dívida começa.
            </p>
          </m.div>
        </div>
      </div>

      {toques.map((toque) => (
        <Toque key={`${ciclo}-${toque.id}`} em={toque.em} />
      ))}
      <Ponteiro ler={lerPonteiro} />

      {fichas.map((ficha) => (
        <Ficha key={ficha.id} ficha={ficha} aoChegar={aoChegar} aoSair={aoSair} />
      ))}
      {impactos.map((impacto) => (
        <Anel key={`${ciclo}-${impacto.id}`} em={impacto.em} cor={ANEL[impacto.tom]} />
      ))}
    </>
  );
}

function Destino({
  refAlvo,
  chegou,
  tom,
  rotulo,
  valor,
  nota,
  data,
  destaque,
  t,
}: {
  refAlvo: React.RefObject<HTMLDivElement | null>;
  chegou: boolean;
  tom: TomRecibo;
  rotulo: string;
  valor: number;
  nota: string;
  data?: string;
  destaque?: boolean;
  t: { duration: number; ease?: Curva };
}) {
  const cor =
    tom === "teu"
      ? "border-brand/35 bg-brand-light/60 dark:bg-brand/15"
      : tom === "irs"
        ? "border-clay-border bg-clay-bg/50"
        : "border-categoria-areia-border bg-categoria-areia-bg/50 dark:border-stone-600 dark:bg-stone-800";
  const texto =
    tom === "teu"
      ? "text-brand-dark dark:text-brand-mint"
      : tom === "irs"
        ? "text-clay-text"
        : "text-categoria-areia-text dark:text-[#e7c98e]";

  return (
    <m.div
      ref={refAlvo}
      initial={false}
      animate={{
        opacity: chegou ? 1 : 0.32,
        scale: destaque ? 1.015 : 1,
      }}
      transition={t}
      className={`min-h-[62px] rounded-2xl border p-3 transition-colors ${chegou ? cor : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/40"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={`block text-[9px] font-bold uppercase tracking-wide ${chegou ? texto : "text-stone-400"}`}>
            {rotulo}
          </span>
          <span className="mt-0.5 block text-[9px] leading-tight text-stone-500">{nota}</span>
        </div>
        <span className="flex-shrink-0 text-right">
          <span className="block font-display text-base font-semibold tabular-nums text-ink">
            {chegou ? eur(valor) : "—"}
          </span>
          {data ? (
            <span className={`mt-0.5 block whitespace-nowrap text-[8px] font-bold uppercase tracking-wide ${texto}`}>
              {data}
            </span>
          ) : null}
        </span>
      </div>
    </m.div>
  );
}
