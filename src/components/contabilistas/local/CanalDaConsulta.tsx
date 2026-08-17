"use client";

// ═══════════════════════════════════════════════════════════════════════
//  COMO SE ENCONTRAM — o compositor do canal
//  ---------------------------------------------------------------------
//  Isto era um `<input>` com um `placeholder`. O contabilista escrevia lá
//  qualquer coisa e o cliente lia o que saísse: um link com uma gralha, uma
//  morada sem número, um «na minha sala» que só significava alguma coisa
//  para quem já lá tinha estado.
//
//  Um campo de texto não tem opinião nenhuma sobre o que se escreve nele, e
//  é isso que está errado. Este compositor tem três:
//
//   1. Sabe o que está a pedir. Um link de chamada reconhece-se, valida-se
//      e diz de que plataforma é ANTES de ser enviado. Uma morada escolhe-se
//      num mapa, não se descreve por palavras.
//
//   2. Mostra o que o outro lado vai ver. O mesmo cartão que o cliente
//      recebe, aqui, enquanto ainda dá para corrigir. Sem pré-visualização,
//      quem escreve está a adivinhar.
//
//   3. Repete o que já funcionou. A sala de reuniões de um contabilista é
//      quase sempre a mesma — oferecê-la com um toque poupa a colagem, e a
//      colagem é onde nascem as gralhas.
//
//  Uma consulta online pode ser por vídeo ou por telefone, e a escolha é do
//  contabilista: a modalidade que o cliente marcou diz «não é presencial»,
//  não diz «tem de ser vídeo».
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { EASE } from "@/lib/motion";
import type { Modalidade } from "@/lib/contabilistas/tipos";
import {
  PLATAFORMAS, examinarLigacao, examinarTelefone, ehTelefone, formatarTelefone,
  lerLocal, numeroDe, pontoValido, PREFIXO_TEL, type PontoNoMapa, type TipoCanal,
} from "@/lib/contabilistas/local-consulta";
import { Check, Eye, Laptop, MapPin, Pencil, Smartphone, Warning } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import CartaoDoLocal from "./CartaoDoLocal";
import { SeletorDeLocalLazy } from "./mapas-lazy";

/** O que o compositor devolve a quem o usa. */
export interface CanalEscolhido {
  texto: string;
  lat: number | null;
  lng: number | null;
}

export default function CanalDaConsulta({
  modalidade, valorInicial, pontoInicial, sugestaoLigacao, onMudar,
}: {
  modalidade: Modalidade;
  valorInicial: string;
  pontoInicial: PontoNoMapa | null;
  /** O link da última consulta online confirmada, se houver. */
  sugestaoLigacao?: string | null;
  onMudar: (c: CanalEscolhido) => void;
}) {
  const arrancaEmTelefone = modalidade === "online" && ehTelefone(valorInicial);

  const [tipo, setTipo] = useState<TipoCanal>(
    modalidade === "presencial" ? "presencial" : arrancaEmTelefone ? "telefone" : "video"
  );
  const [ligacao, setLigacao] = useState(arrancaEmTelefone ? "" : valorInicial);
  const [telefone, setTelefone] = useState(arrancaEmTelefone ? formatarTelefone(numeroDe(valorInicial)) : "");
  const [morada, setMorada] = useState(modalidade === "presencial" ? valorInicial : "");
  const [ponto, setPonto] = useState<PontoNoMapa | null>(
    pontoInicial && pontoValido(pontoInicial.lat, pontoInicial.lng) ? pontoInicial : null
  );
  const [mapaAberto, setMapaAberto] = useState(false);

  const exameLigacao = useMemo(() => examinarLigacao(ligacao), [ligacao]);
  const exameTelefone = useMemo(() => examinarTelefone(telefone), [telefone]);

  /** O valor final, tal como vai para a base de dados. */
  const escolhido = useMemo<CanalEscolhido>(() => {
    if (tipo === "presencial") {
      return { texto: morada.trim(), lat: ponto?.lat ?? null, lng: ponto?.lng ?? null };
    }
    if (tipo === "telefone") {
      return { texto: exameTelefone.valor ? `${PREFIXO_TEL}${exameTelefone.valor}` : "", lat: null, lng: null };
    }
    return { texto: exameLigacao.valor, lat: null, lng: null };
  }, [tipo, morada, ponto, exameTelefone.valor, exameLigacao.valor]);

  // Avisa quem usa o compositor sempre que o valor útil muda.
  //
  // A dependência é a CHAVE do valor e não o objeto: `escolhido` é novo a
  // cada render (vem de um `useMemo` com dependências que mudam), e um
  // efeito que dependesse dele avisava o pai em ciclo.
  const chave = `${escolhido.texto}|${escolhido.lat ?? ""}|${escolhido.lng ?? ""}`;
  const escolhidoRef = useRef(escolhido);
  escolhidoRef.current = escolhido;
  const onMudarRef = useRef(onMudar);
  onMudarRef.current = onMudar;
  useEffect(() => {
    onMudarRef.current(escolhidoRef.current);
  }, [chave]);

  const previsao = lerLocal(
    tipo === "presencial" ? "presencial" : "online",
    escolhido.texto,
    escolhido.lat,
    escolhido.lng
  );

  return (
    <section aria-labelledby="canal-titulo" className="space-y-3">
      <div>
        <h3 id="canal-titulo" className="text-sm font-semibold text-stone-700">
          Como se encontram
        </h3>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-400">
          O cliente vê isto na área dele assim que confirmares — e recebe aviso se mudares.
        </p>
      </div>

      {/* ── Que canal ─────────────────────────────────────────────────── */}
      {modalidade === "online" ? (
        <div role="group" aria-label="Tipo de chamada" className="flex gap-2">
          <Escolha
            ativo={tipo === "video"}
            Icon={Laptop}
            rotulo="Videochamada"
            onClick={() => setTipo("video")}
          />
          <Escolha
            ativo={tipo === "telefone"}
            Icon={Smartphone}
            rotulo="Telefone"
            onClick={() => setTipo("telefone")}
          />
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
          <MapPin size={13} className="text-stone-400" aria-hidden />
          Consulta presencial — o cliente precisa de saber a morada exata.
        </p>
      )}

      {/* ── Videochamada ──────────────────────────────────────────────── */}
      {tipo === "video" && (
        <div className="space-y-2">
          <label className="block">
            <span className="sr-only">Endereço da sala da chamada</span>
            <input
              value={ligacao}
              onChange={(e) => setLigacao(e.target.value.slice(0, 500))}
              placeholder="https://meet.google.com/…"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(exameLigacao.erro)}
              aria-describedby="canal-video-estado"
              className={`min-h-[2.75rem] w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 ${
                exameLigacao.erro
                  ? "border-clay-border focus:border-clay focus:ring-clay/25"
                  : "border-stone-200 focus:border-brand focus:ring-brand/30"
              }`}
            />
          </label>

          <p id="canal-video-estado" className="min-h-[1.1rem] text-xs leading-relaxed">
            {exameLigacao.erro ? (
              <span className="flex items-center gap-1.5 text-clay-text">
                <Warning size={12} aria-hidden /> {exameLigacao.erro}
              </span>
            ) : exameLigacao.aviso ? (
              <span className="flex items-center gap-1.5 text-alert-text">
                <Warning size={12} aria-hidden /> {exameLigacao.aviso}
              </span>
            ) : exameLigacao.plataforma ? (
              <span className="flex items-center gap-1.5 font-semibold text-brand-dark">
                <Check size={12} aria-hidden /> Link do {exameLigacao.plataforma.nome} reconhecido.
              </span>
            ) : exameLigacao.valor ? (
              <span className="text-stone-400">Endereço válido. Plataforma não reconhecida — o link vai na mesma.</span>
            ) : (
              <span className="text-stone-400">
                Cola o link da sala: {PLATAFORMAS.slice(0, 3).map((p) => p.nome).join(", ")} e outros.
              </span>
            )}
          </p>

          {/* A sala de sempre, a um toque. */}
          {sugestaoLigacao && sugestaoLigacao !== ligacao && (
            <button
              type="button"
              onClick={() => setLigacao(sugestaoLigacao)}
              className="inline-flex min-h-[2.25rem] max-w-full items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-600 transition-colors hover:border-brand/40 hover:text-brand-dark"
            >
              <Check size={12} className="shrink-0" aria-hidden />
              <span className="truncate">Usar o link da última consulta</span>
            </button>
          )}
        </div>
      )}

      {/* ── Telefone ──────────────────────────────────────────────────── */}
      {tipo === "telefone" && (
        <div className="space-y-2">
          <label className="block">
            <span className="sr-only">Número para a chamada</span>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value.slice(0, 30))}
              placeholder="+351 912 345 678"
              inputMode="tel"
              autoComplete="off"
              aria-invalid={Boolean(exameTelefone.erro)}
              aria-describedby="canal-tel-estado"
              className={`min-h-[2.75rem] w-full rounded-xl border bg-white px-3.5 py-2 text-sm tabular-nums text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 ${
                exameTelefone.erro
                  ? "border-clay-border focus:border-clay focus:ring-clay/25"
                  : "border-stone-200 focus:border-brand focus:ring-brand/30"
              }`}
            />
          </label>
          <p id="canal-tel-estado" className="min-h-[1.1rem] text-xs leading-relaxed">
            {exameTelefone.erro ? (
              <span className="flex items-center gap-1.5 text-clay-text">
                <Warning size={12} aria-hidden /> {exameTelefone.erro}
              </span>
            ) : (
              <span className="text-stone-400">
                Quem liga és tu, à hora marcada. O cliente vê o número para saber quem o procura.
              </span>
            )}
          </p>
        </div>
      )}

      {/* ── Presencial ────────────────────────────────────────────────── */}
      {tipo === "presencial" && (
        <div className="space-y-2.5">
          {!mapaAberto && (
            <>
              {morada.trim() ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setMapaAberto(true)}>
                    <Pencil size={14} aria-hidden /> Mudar o local
                  </Button>
                  {!ponto && (
                    <span className="flex items-center gap-1.5 text-xs text-alert-text">
                      <Warning size={12} aria-hidden /> Sem ponto no mapa.
                    </span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMapaAberto(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-stone-300 px-4 py-3.5 text-left transition-colors hover:border-brand/50 hover:bg-brand-light/30"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
                    <MapPin size={17} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-stone-800">Escolher o local no mapa</span>
                    <span className="block text-xs leading-relaxed text-stone-500">
                      Pesquisa a morada e põe o pino na porta. O cliente abre as direções com um toque.
                    </span>
                  </span>
                </button>
              )}
            </>
          )}

          <AnimatePresence initial={false}>
            {mapaAberto && (
              <m.div
                key="seletor"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="rounded-2xl border border-stone-200 bg-white p-3"
              >
                <SeletorDeLocalLazy
                  moradaInicial={morada}
                  pontoInicial={ponto}
                  onEscolher={(l) => {
                    setMorada(l.morada);
                    setPonto({ lat: l.lat, lng: l.lng });
                    setMapaAberto(false);
                  }}
                  onCancelar={() => setMapaAberto(false)}
                />
              </m.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── O que o cliente vai ver ───────────────────────────────────── */}
      {previsao && !mapaAberto && (
        <div className="space-y-1.5 pt-0.5">
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wide text-stone-400">
            <Eye size={12} aria-hidden /> O que o cliente vê
          </p>
          <CartaoDoLocal local={previsao} />
        </div>
      )}
    </section>
  );
}

function Escolha({
  ativo, Icon, rotulo, onClick,
}: {
  ativo: boolean;
  Icon: typeof Laptop;
  rotulo: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`inline-flex min-h-[2.5rem] flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors ${
        ativo
          ? "border-brand bg-brand text-white"
          : "border-stone-200 bg-white text-stone-600 hover:border-brand/40 hover:text-brand-dark"
      }`}
    >
      <Icon size={15} aria-hidden />
      {rotulo}
    </button>
  );
}
