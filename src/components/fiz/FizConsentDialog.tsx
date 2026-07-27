"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Close, Check, Lock, ShieldCheck, Warning } from "@/components/ui/Icons";
import FizActionButton from "./FizActionButton";
import { FizMarca } from "./FizLogo";
import FizDisclosure from "./FizDisclosure";
import { CAMPOS, GRUPOS, type CampoHandoff, type GrupoCampo } from "@/lib/fiz/handoff-fields";

// ─────────────────────────────────────────────────────────────────────────
//  Diálogo de consentimento do handoff.
//
//  Regras invioláveis (ponto 8.3 da arquitetura, 8.5 da auditoria):
//    · mostra os CAMPOS EXATOS e os respetivos valores antes de enviar;
//    · NENHUM consentimento vem pré-selecionado;
//    · recusar não faz perder a simulação;
//    · identifica as duas entidades e a finalidade;
//    · enviar é gratuito — não há verificação de plano em lado nenhum.
//
//  ── O que foi corrigido nesta versão ────────────────────────────────
//  A primeira tinha três defeitos reais, visíveis em ecrãs baixos:
//    1. o corpo da página continuava a deslizar por trás do diálogo;
//    2. o cabeçalho saía do ecrã quando a lista crescia, deixando o
//       utilizador sem saber o que estava a autorizar;
//    3. o foco escapava para os elementos por trás, com Tab.
//  Passa a haver bloqueio de scroll, cabeçalho e rodapé fixos com uma só
//  região scrollável no meio, e armadilha de foco.
//
//  O quarto defeito era mais subtil e só se via no telemóvel: a barra de
//  navegação inferior ficava POR CIMA do diálogo e dava para tocar nela. Não
//  era o z-index — era o `transform` do `m.div` que anima o passo do
//  simulador, que cria um contexto de empilhamento e prende lá dentro
//  qualquer z-index dos filhos. Por isso o diálogo é agora desenhado num
//  portal para o `body`: fora de qualquer contexto de empilhamento, seja de
//  que animação for.
// ─────────────────────────────────────────────────────────────────────────

export interface CampoConsentimento {
  campo: string;
  rotulo: string;
  valor: string;
}

interface FizConsentDialogProps {
  aberto: boolean;
  aoFechar: () => void;
  campos: CampoConsentimento[];
  finalidade: string;
  divulgacao: string;
  camposNuncaEnviados: readonly string[];
  ocupado?: boolean;
  erro?: string | null;
  aoAutorizar: (camposAutorizados: string[]) => void;
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function FizConsentDialog({
  aberto,
  aoFechar,
  campos,
  finalidade,
  divulgacao,
  camposNuncaEnviados,
  ocupado = false,
  erro = null,
  aoAutorizar,
}: FizConsentDialogProps) {
  // Começa VAZIO — nada pré-selecionado, por decisão de produto.
  const [selecionados, setSelecionados] = useState<string[]>([]);
  // O portal só existe no cliente; no servidor não há `document`.
  const [montado, setMontado] = useState(false);
  const tituloId = useId();
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (aberto) setSelecionados([]);
  }, [aberto]);

  // Bloqueia o scroll do documento enquanto o diálogo está aberto, sem
  // deixar a página "saltar" pela largura da barra de scroll que desaparece.
  useEffect(() => {
    if (!aberto) return;
    const { body } = document;
    const overflowAnterior = body.style.overflow;
    const paddingAnterior = body.style.paddingRight;
    const larguraBarra = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (larguraBarra > 0) body.style.paddingRight = `${larguraBarra}px`;
    return () => {
      body.style.overflow = overflowAnterior;
      body.style.paddingRight = paddingAnterior;
    };
  }, [aberto]);

  // Escape fecha; Tab fica preso dentro do diálogo.
  const aoTeclar = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        aoFechar();
        return;
      }
      if (e.key !== "Tab" || !painel.current) return;
      const focaveis = [...painel.current.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(
        (el) => el.offsetParent !== null,
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    },
    [aoFechar],
  );

  useEffect(() => {
    if (!aberto) return;
    const focoAnterior = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", aoTeclar);
    painel.current?.focus();
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      focoAnterior?.focus?.();
    };
  }, [aberto, aoTeclar]);

  // Agrupar por família, mantendo a ordem declarada em GRUPOS.
  const porGrupo = useMemo(() => {
    const mapa = new Map<GrupoCampo, CampoConsentimento[]>();
    for (const c of campos) {
      const def = CAMPOS[c.campo as CampoHandoff];
      if (!def) continue;
      const lista = mapa.get(def.grupo) ?? [];
      lista.push(c);
      mapa.set(def.grupo, lista);
    }
    return GRUPOS.map((g) => ({ ...g, itens: mapa.get(g.id) ?? [] })).filter((g) => g.itens.length > 0);
  }, [campos]);

  if (!aberto || !montado) return null;

  const alternar = (campo: string) =>
    setSelecionados((atual) => (atual.includes(campo) ? atual.filter((c) => c !== campo) : [...atual, campo]));

  const nenhumSelecionado = selecionados.length === 0;
  const identificaveisSelecionados = selecionados.filter(
    (c) => CAMPOS[c as CampoHandoff]?.identificavel,
  ).length;

  return createPortal(
    /* z-[9000] é a camada dos diálogos deste projeto (ver
       GuardarCenarioDialog). Com z-50 ficava EMPATADO com a barra de
       navegação inferior do telemóvel, que renderiza depois e por isso
       ganhava: dava para tocar em "Menu" por cima de um modal aberto. */
    <div
      className="fixed inset-0 z-[9000] flex items-end justify-center overscroll-contain bg-ink/50 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-4xl border border-fiz-200 bg-white shadow-float outline-none dark:bg-stone-900 sm:max-h-[85dvh] sm:rounded-4xl"
      >
        {/* ── Cabeçalho: fixo, nunca sai do ecrã ───────────────────── */}
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-fiz-200 bg-fiz-50 px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-fiz-700">
              <span>ReciboCerto</span>
              <span aria-hidden>→</span>
              <FizMarca size={14} />
            </div>
            <h2 id={tituloId} className="font-display text-lg font-semibold leading-tight text-ink">
              O que vais enviar para a FIZ
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">{finalidade}</p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar sem enviar"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-white/80 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-fiz-600 dark:hover:bg-stone-800"
          >
            <Close size={17} />
          </button>
        </div>

        {/* ── Corpo: a ÚNICA região scrollável ─────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <p className="mb-3 text-xs font-semibold text-stone-700 dark:text-stone-300">
            Escolhe o que autorizas. Nada está selecionado à partida.
          </p>

          {porGrupo.map((grupo) => (
            <fieldset key={grupo.id} className="mb-5 last:mb-0">
              <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                {grupo.titulo}
              </legend>
              <p className="mb-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                {grupo.descricao}
              </p>

              {/* Identificação leva um aviso próprio: é a única família com
                  dados que te identificam pessoalmente. */}
              {grupo.id === "identificacao" && (
                <p className="mb-2 flex items-start gap-1.5 rounded-xl bg-alert-bg px-3 py-2 text-xs leading-relaxed text-alert-text">
                  <Warning size={13} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Só precisas destes se quiseres continuar já na FIZ sem voltar a escrever tudo.
                    Podes enviar sem eles.
                  </span>
                </p>
              )}

              <ul className="space-y-2">
                {grupo.itens.map((c) => {
                  const ativo = selecionados.includes(c.campo);
                  const def = CAMPOS[c.campo as CampoHandoff];
                  return (
                    <li key={c.campo}>
                      <label
                        className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-fiz-600 ${
                          ativo
                            ? "border-fiz-400 bg-fiz-50"
                            : "border-stone-200 bg-white hover:border-fiz-300 dark:border-stone-700 dark:bg-stone-900"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={ativo}
                          onChange={() => alternar(c.campo)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                            ativo ? "border-fiz-600 bg-fiz text-fiz-ink" : "border-stone-300 dark:border-stone-600"
                          }`}
                        >
                          {ativo && <Check size={12} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-stone-800 dark:text-stone-100">
                            {c.rotulo}
                          </span>
                          <span className="mt-0.5 block break-words text-sm tabular-nums text-stone-600 dark:text-stone-300">
                            {c.valor}
                          </span>
                          {def?.porque && (
                            <span className="mt-1 block text-xs leading-relaxed text-stone-400">{def.porque}</span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ))}

          {/* O que nunca sai daqui — tão importante como o que sai. */}
          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
              <Lock size={13} className="text-brand" /> O que nunca enviamos, escolhas o que escolheres
            </p>
            <ul className="mt-1.5 space-y-1">
              {camposNuncaEnviados.map((c) => (
                <li key={c} className="flex items-start gap-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-clay" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            <ShieldCheck size={13} className="mt-0.5 flex-shrink-0 text-brand" />
            <span>
              Enviar é gratuito e não depende de subscrição. Se recusares, a tua simulação
              mantém-se aqui, intacta.
            </span>
          </p>

          {erro && (
            <p role="alert" className="mt-3 rounded-xl bg-clay-bg px-3 py-2 text-xs text-clay-text">
              {erro}
            </p>
          )}
        </div>

        {/* ── Rodapé: fixo, com o botão sempre visível ─────────────── */}
        <div
          className="flex-shrink-0 border-t border-stone-200 bg-white px-5 py-4 dark:border-stone-700 dark:bg-stone-900"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <FizDisclosure texto={divulgacao} className="mb-3" />

          {/* Resumo do que está selecionado, para não ser preciso voltar a
              subir a lista antes de confirmar. */}
          <p aria-live="polite" className="mb-2 text-xs text-stone-500 dark:text-stone-400">
            {nenhumSelecionado
              ? "Ainda não escolheste nenhum campo."
              : `${selecionados.length} ${selecionados.length === 1 ? "campo selecionado" : "campos selecionados"}` +
                (identificaveisSelecionados > 0
                  ? `, ${identificaveisSelecionados} ${identificaveisSelecionados === 1 ? "que te identifica" : "que te identificam"}`
                  : "")}
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={aoFechar}
              className="min-h-[44px] rounded-2xl px-4 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Não enviar
            </button>
            <FizActionButton
              onClick={() => aoAutorizar(selecionados)}
              desativado={nenhumSelecionado}
              ocupado={ocupado}
            >
              {nenhumSelecionado ? "Escolhe o que enviar" : `Autorizar e continuar (${selecionados.length})`}
            </FizActionButton>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
