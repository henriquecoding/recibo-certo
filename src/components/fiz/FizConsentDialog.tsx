"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { m, AnimatePresence } from "motion/react";
import { Close, Check, Lock, ShieldCheck, Warning, ChevronDown, ExternalLink } from "@/components/ui/Icons";
import InfoTip from "@/components/ui/InfoTip";
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
//  ── Defeitos estruturais corrigidos ao longo do tempo ────────────────
//    1. o corpo da página deslizava por trás do diálogo → bloqueio de scroll;
//    2. o cabeçalho saía do ecrã com listas longas → cabeçalho e rodapé
//       fixos, uma só região scrollável no meio;
//    3. o foco escapava com Tab → armadilha de foco;
//    4. a barra de navegação do telemóvel ficava POR CIMA e dava para tocar
//       nela. Não era o z-index: era o `transform` do `m.div` que anima o
//       passo do simulador, que cria um contexto de empilhamento e prende lá
//       dentro qualquer z-index dos filhos → portal para o `body`.
//
//  ── Redesenho: da parede de campos à decisão calma ───────────────────
//  A versão anterior estava correta e era desconfortável. Abria com zero
//  campos escolhidos, o botão desativado e catorze cartões empilhados. Lida
//  de relance, não parecia "o que levo comigo" — parecia "quantos dados me
//  estão a pedir". Cinco mudanças, cada uma a atacar um estado diferente:
//
//  · GARANTIA ANTES DO PEDIDO (segurança). O que nunca enviamos estava no
//    fundo, depois dos catorze cartões. Era o elemento que mais constrói
//    confiança e só se via depois de já se ter decidido. Passa para debaixo
//    do cabeçalho: aprende-se o TETO do pedido antes de ver o pedido.
//
//  · REENQUADRAR (natural). "O que vais enviar" descreve uma perda.
//    "Levar a tua simulação" descreve o que de facto acontece — continuidade
//    do trabalho que a pessoa acabou de fazer. Os factos são idênticos.
//
//  · UM CLIQUE DELIBERADO (eficiência). O §8.5 proíbe PRÉ-SELECIONAR; é
//    das caixas já marcadas que o RGPD trata. Um botão que o utilizador
//    carrega é um ato afirmativo inequívoco. A identificação nunca entra na
//    recomendação — essa marca-se sempre uma a uma.
//
//  · ATRITO PROPORCIONAL (segurança). Grupos dobráveis: enquadramento e
//    valores abertos, identificação fechada com o aviso à vista. Antes
//    custava o mesmo autorizar "Periodicidade" e "NIF".
//
//  · MOSTRAR A CONSEQUÊNCIA (confiança). O que trava alguém não é não saber
//    o que envia — é não saber o que acontece a seguir ao clique. A linha
//    sob o botão diz que abre a FIZ noutro separador e que nada é executado
//    sem confirmação lá. Não é promessa nova: é o §8.5, que já cumprimos,
//    finalmente dito a quem decide.
//
//  A cor do visto é o VERDE da marca, não o amarelo da FIZ. O visto é o ato
//  de quem autoriza, na nossa superfície; o amarelo fica para a identidade
//  do parceiro e para o destino. Marcar o consentimento com a cor de quem
//  recebe confunde agência: lê-se como cedência, não como controlo.
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

const EASE = [0.16, 1, 0.3, 1] as const;

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
  // Começa VAZIO — nada pré-selecionado, por decisão de produto e por regra.
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [abertos, setAbertos] = useState<GrupoCampo[]>([]);
  const [garantiaAberta, setGarantiaAberta] = useState(false);
  // O portal só existe no cliente; no servidor não há `document`.
  const [montado, setMontado] = useState(false);
  const tituloId = useId();
  const garantiaId = useId();
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => setMontado(true), []);

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

  /**
   * O conjunto recomendado: tudo o que NÃO te identifica.
   *
   * Não é uma pré-seleção — é o que o botão marca quando o utilizador
   * carrega. A identificação fica deliberadamente de fora: recomendar o NIF
   * seria transformar uma decisão pessoal numa formalidade.
   */
  const recomendados = useMemo(
    () => campos.filter((c) => CAMPOS[c.campo as CampoHandoff]?.grupo !== "identificacao").map((c) => c.campo),
    [campos],
  );

  // Reabrir o diálogo repõe tudo: seleção vazia e grupos no estado de origem.
  useEffect(() => {
    if (!aberto) return;
    setSelecionados([]);
    setGarantiaAberta(false);
    setAbertos(porGrupo.filter((g) => g.abertoPorOmissao).map((g) => g.id));
  }, [aberto, porGrupo]);

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

  if (!aberto || !montado) return null;

  const alternar = (campo: string) =>
    setSelecionados((atual) => (atual.includes(campo) ? atual.filter((c) => c !== campo) : [...atual, campo]));

  const alternarGrupo = (id: GrupoCampo) =>
    setAbertos((atual) => (atual.includes(id) ? atual.filter((g) => g !== id) : [...atual, id]));

  /** Marca ou desmarca todos os campos de um grupo de uma vez. */
  const alternarTodosDoGrupo = (itens: CampoConsentimento[]) => {
    const chaves = itens.map((i) => i.campo);
    const todosMarcados = chaves.every((c) => selecionados.includes(c));
    setSelecionados((atual) =>
      todosMarcados
        ? atual.filter((c) => !chaves.includes(c))
        : [...new Set([...atual, ...chaves])],
    );
  };

  const nenhumSelecionado = selecionados.length === 0;
  const identificaveisSelecionados = selecionados.filter(
    (c) => CAMPOS[c as CampoHandoff]?.identificavel,
  ).length;
  const recomendadoCompleto =
    recomendados.length > 0 && recomendados.every((c) => selecionados.includes(c));

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
              <span>Recibo Certo</span>
              <span aria-hidden>→</span>
              <FizMarca size={14} />
            </div>
            <h2 id={tituloId} className="font-display text-lg font-semibold leading-tight text-ink">
              Levar a tua simulação para a FIZ
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              {finalidade}
            </p>
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

        {/* ── Garantia: o TETO do pedido, antes do pedido ───────────── */}
        <div className="flex-shrink-0 border-b border-stone-200 bg-brand-light/40 px-5 py-2.5 dark:border-stone-700 dark:bg-brand/5">
          <button
            type="button"
            onClick={() => setGarantiaAberta((v) => !v)}
            aria-expanded={garantiaAberta}
            aria-controls={garantiaId}
            className="flex min-h-[36px] w-full items-center gap-2 rounded-lg text-left text-xs font-semibold text-brand-dark transition-colors hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-brand"
          >
            <Lock size={13} className="flex-shrink-0" />
            <span className="flex-1">Há coisas que nunca saem daqui, escolhas o que escolheres</span>
            <ChevronDown
              size={14}
              aria-hidden
              className={`flex-shrink-0 transition-transform ${garantiaAberta ? "rotate-180" : ""}`}
            />
          </button>
          <AnimatePresence initial={false}>
            {garantiaAberta && (
              <m.ul
                id={garantiaId}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="space-y-1 pb-1 pt-2">
                  {camposNuncaEnviados.map((c) => (
                    <li
                      key={c}
                      className="flex items-start gap-1.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400"
                    >
                      <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand" />
                      {c}
                    </li>
                  ))}
                </div>
              </m.ul>
            )}
          </AnimatePresence>
        </div>

        {/* ── Corpo: a ÚNICA região scrollável ─────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4">
          <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Escolhes tu o que segue. Nada vai sem o teu visto.
          </p>

          {/* Atalho para o caminho comum. NÃO é pré-seleção: exige este
              clique, e nunca inclui campos que te identificam. */}
          {recomendados.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelecionados((atual) =>
                    recomendadoCompleto
                      ? atual.filter((c) => !recomendados.includes(c))
                      : [...new Set([...atual, ...recomendados])],
                  )
                }
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-brand/40 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Check size={13} />
                {recomendadoCompleto
                  ? `Desmarcar o recomendado (${recomendados.length})`
                  : `Selecionar o recomendado (${recomendados.length})`}
              </button>
              {!nenhumSelecionado && (
                <button
                  type="button"
                  onClick={() => setSelecionados([])}
                  className="inline-flex min-h-[36px] items-center rounded-xl px-3 py-1.5 text-xs font-semibold text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-300"
                >
                  Limpar
                </button>
              )}
              <span className="text-[11px] text-stone-400">Sem dados que te identifiquem</span>
            </div>
          )}

          <div className="mt-4 space-y-2.5">
            {porGrupo.map((grupo) => {
              const estaAberto = abertos.includes(grupo.id);
              const chaves = grupo.itens.map((i) => i.campo);
              const marcados = chaves.filter((c) => selecionados.includes(c)).length;
              const todos = marcados === chaves.length && chaves.length > 0;
              const painelId = `fiz-grupo-${grupo.id}`;

              return (
                <fieldset
                  key={grupo.id}
                  /* `min-w-0`: o <fieldset> tem `min-width: min-content` por
                     omissão nos browsers e ignora o w-full do pai — sem isto
                     o grupo transbordava 27px a 360px. */
                  className={`min-w-0 overflow-hidden rounded-2xl border transition-colors ${
                    marcados > 0
                      ? "border-brand/30 bg-brand-light/25 dark:bg-brand/5"
                      : "border-stone-200 dark:border-stone-700"
                  }`}
                >
                  <legend className="sr-only">{grupo.titulo}</legend>

                  {/* Cabeçalho do grupo: abrir/fechar e marcar tudo são duas
                      ações distintas, com alvos distintos. */}
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => alternarGrupo(grupo.id)}
                      aria-expanded={estaAberto}
                      aria-controls={painelId}
                      className="flex min-h-[52px] flex-1 items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand dark:hover:bg-stone-800/50"
                    >
                      <ChevronDown
                        size={15}
                        aria-hidden
                        className={`flex-shrink-0 text-stone-400 transition-transform ${estaAberto ? "rotate-180" : ""}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                            {grupo.titulo}
                          </span>
                          <span
                            className={`text-[11px] font-semibold tabular-nums ${
                              marcados > 0 ? "text-brand-dark dark:text-brand" : "text-stone-400"
                            }`}
                          >
                            {marcados}/{chaves.length}
                          </span>
                        </span>
                        {!estaAberto && (
                          <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                            {grupo.resumo}
                          </span>
                        )}
                      </span>
                    </button>

                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={todos ? "true" : marcados > 0 ? "mixed" : "false"}
                      aria-label={`${todos ? "Desmarcar" : "Marcar"} todos os campos de ${grupo.titulo}`}
                      onClick={() => alternarTodosDoGrupo(grupo.itens)}
                      className="flex w-12 flex-shrink-0 items-center justify-center border-l border-stone-200 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand dark:border-stone-700 dark:hover:bg-stone-800/50"
                    >
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                          todos
                            ? "border-brand bg-brand text-white"
                            : marcados > 0
                              ? "border-brand bg-brand-light text-brand-dark"
                              : "border-stone-300 dark:border-stone-600"
                        }`}
                      >
                        {todos ? <Check size={12} /> : marcados > 0 ? <span className="h-0.5 w-2.5 rounded-full bg-current" /> : null}
                      </span>
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {estaAberto && (
                      <m.div
                        id={painelId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-stone-200/70 px-3 pb-3 pt-2.5 dark:border-stone-700/70">
                          <p className="mb-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                            {grupo.descricao}
                          </p>

                          {/* A identificação leva um aviso próprio: é a única
                              família com dados que te identificam. */}
                          {grupo.id === "identificacao" && (
                            <p className="mb-2 flex items-start gap-1.5 rounded-xl bg-alert-bg px-3 py-2 text-xs leading-relaxed text-alert-text">
                              <Warning size={13} className="mt-0.5 flex-shrink-0" />
                              <span>
                                Só precisas destes se quiseres continuar já na FIZ sem voltar a
                                escrever tudo. Podes enviar sem eles.
                              </span>
                            </p>
                          )}

                          <ul className="space-y-1">
                            {grupo.itens.map((c) => {
                              const ativo = selecionados.includes(c.campo);
                              const def = CAMPOS[c.campo as CampoHandoff];
                              const identificavel = Boolean(def?.identificavel);

                              return (
                                <li key={c.campo}>
                                  {/* O InfoTip é um <button>: NÃO pode viver
                                      dentro do <label>, senão abri-lo
                                      alternava o campo. Por isso a linha é um
                                      div e o label cobre só rótulo + valor. */}
                                  <div
                                    className={`flex min-h-[44px] items-start gap-2 rounded-xl px-2 transition-colors ${
                                      ativo ? "bg-brand-light/70 dark:bg-brand/10" : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                                    }`}
                                  >
                                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 py-2">
                                      <input
                                        type="checkbox"
                                        checked={ativo}
                                        onChange={() => alternar(c.campo)}
                                        className="peer sr-only"
                                      />
                                      <span
                                        aria-hidden
                                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-1 ${
                                          ativo ? "border-brand bg-brand text-white" : "border-stone-300 dark:border-stone-600"
                                        }`}
                                      >
                                        {ativo && <Check size={12} />}
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        {/* Sem largura fixa e com wrap: um
                                            valor curto encosta à direita do
                                            rótulo; um longo desce para a sua
                                            própria linha em vez de alargar o
                                            diálogo. */}
                                        <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                                          <span className="text-sm font-medium text-stone-800 dark:text-stone-100">
                                            {c.rotulo}
                                          </span>
                                          <span className="min-w-0 break-words text-sm tabular-nums text-stone-600 dark:text-stone-300">
                                            {c.valor}
                                          </span>
                                        </span>
                                        {/* Nos identificativos a razão fica
                                            inline: é o que sustenta a decisão
                                            e não pode estar escondida. */}
                                        {identificavel && def?.porque && (
                                          <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                                            {def.porque}
                                          </span>
                                        )}
                                      </span>
                                    </label>
                                    {!identificavel && def?.porque && (
                                      <InfoTip label={`Porque é que enviamos ${c.rotulo}`}>{def.porque}</InfoTip>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </fieldset>
              );
            })}
          </div>

          <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
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
          className="flex-shrink-0 border-t border-stone-200 bg-white px-5 py-3.5 dark:border-stone-700 dark:bg-stone-900"
          style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
        >
          <FizDisclosure texto={divulgacao} className="mb-2.5" />

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

          {/* O que trava alguém não é não saber o que envia — é não saber o
              que acontece a seguir ao clique. Por isso vem ANTES do botão. */}
          <p className="mb-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            <ExternalLink size={12} className="mt-0.5 flex-shrink-0 text-brand" />
            <span>
              Abre a FIZ num separador novo. Nada é emitido nem submetido sem a tua confirmação lá.
            </span>
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
