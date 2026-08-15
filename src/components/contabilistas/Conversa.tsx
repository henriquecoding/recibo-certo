"use client";

// ═══════════════════════════════════════════════════════════════════════
//  CONVERSA — a mesma peça dos dois lados do vínculo
//  ---------------------------------------------------------------------
//  Serve o contabilista (na ficha do cliente) e o cliente (na área dele).
//  Não há duas conversas: há uma, e cada lado vê-a da sua perspetiva.
//
//  Decisões que se notam a usar:
//   · As mensagens chegam por Realtime — sem recarregar e sem sondagem.
//   · Marcar como lidas acontece quando a conversa está mesmo à vista, não
//     ao montar o componente: uma conversa fechada num acordeão não é uma
//     conversa lida.
//   · O rolo desce sozinho para o fim, EXCETO se a pessoa tiver subido para
//     ler algo antigo — nesse caso aparece um aviso de mensagem nova em vez
//     de lhe roubarem a posição.
//   · Em pausa lê-se e não se escreve, e a interface diz porquê em vez de
//     mostrar uma caixa que falha ao submeter.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { EASE } from "@/lib/motion";
import { useAvisos } from "@/components/ui/Avisos";
import {
  ANEXOS_MAX, ANEXO_MAX_BYTES, MENSAGEM_MAX, TIPOS_ANEXO_ACEITES,
  enviarMensagem, escutarMensagens, listarMensagens, marcarLidas,
  tamanhoLegivel, urlDoAnexo, type Mensagem,
} from "@/lib/contabilistas/fonte/conversa";
import type { EstadoVinculo } from "@/lib/contabilistas/tipos";
import Button from "@/components/ui/Button";
import { ArrowRight, Close, PaperClip, Trash } from "@/components/ui/Icons";

export default function Conversa({
  vinculoId, meuId, estadoVinculo, tratamentoDoOutro, ativa = true,
}: {
  vinculoId: string;
  meuId: string;
  estadoVinculo: EstadoVinculo;
  /** Como chamar a outra pessoa. Aparece no estado vazio. */
  tratamentoDoOutro: string;
  /** `false` quando a conversa está fechada num acordeão — não marca lidas. */
  ativa?: boolean;
}) {
  const avisos = useAvisos();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [aLer, setALer] = useState(true);
  const [texto, setTexto] = useState("");
  const [ficheiros, setFicheiros] = useState<File[]>([]);
  const [aEnviar, setAEnviar] = useState(false);
  const [haNovas, setHaNovas] = useState(false);

  const rolo = useRef<HTMLDivElement>(null);
  const noFim = useRef(true);

  const podeEscrever = estadoVinculo === "ativo";

  // ── Carregar e escutar ───────────────────────────────────────────
  useEffect(() => {
    let vivo = true;
    setALer(true);
    listarMensagens(vinculoId)
      .then((m) => { if (vivo) setMensagens(m); })
      .catch((e: Error) => { if (vivo) avisos.erro(e.message); })
      .finally(() => { if (vivo) setALer(false); });
    return () => { vivo = false; };
  }, [vinculoId, avisos]);

  useEffect(() => {
    // A limpeza fecha o canal. Sem ela, cada montagem deixaria uma ligação
    // aberta e o limite de ligações simultâneas esgotava-se sozinho.
    return escutarMensagens(vinculoId, (nova) => {
      setMensagens((atuais) =>
        atuais.some((m) => m.id === nova.id) ? atuais : [...atuais, nova]
      );
      if (!noFim.current) setHaNovas(true);
    });
  }, [vinculoId]);

  // ── Marcar lidas só quando está mesmo à vista ────────────────────
  const porLer = useMemo(
    () => mensagens.filter((m) => m.autorId !== meuId && !m.lidaEm).length,
    [mensagens, meuId]
  );

  useEffect(() => {
    if (!ativa || porLer === 0) return;
    void marcarLidas(vinculoId, meuId).then(() => {
      setMensagens((atuais) =>
        atuais.map((m) =>
          m.autorId !== meuId && !m.lidaEm ? { ...m, lidaEm: new Date().toISOString() } : m
        )
      );
    });
  }, [ativa, porLer, vinculoId, meuId]);

  // ── Rolo ─────────────────────────────────────────────────────────
  const irAoFim = useCallback((suave = true) => {
    const el = rolo.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: suave ? "smooth" : "auto" });
    setHaNovas(false);
  }, []);

  useEffect(() => {
    if (!aLer && noFim.current) irAoFim(false);
  }, [aLer, mensagens.length, irAoFim]);

  function aoRolar() {
    const el = rolo.current;
    if (!el) return;
    // 48px de folga: «no fim» não pode exigir precisão ao pixel.
    noFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (noFim.current) setHaNovas(false);
  }

  // ── Anexos ───────────────────────────────────────────────────────
  function escolher(lista: FileList | null) {
    if (!lista) return;
    const novos: File[] = [];
    for (const f of Array.from(lista)) {
      if (f.size > ANEXO_MAX_BYTES) { avisos.erro(`«${f.name}» passa dos 10 MB.`); continue; }
      if (!(TIPOS_ANEXO_ACEITES as readonly string[]).includes(f.type)) {
        avisos.erro(`«${f.name}» não é um formato aceite.`); continue;
      }
      novos.push(f);
    }
    setFicheiros((a) => [...a, ...novos].slice(0, ANEXOS_MAX));
  }

  // O ficheiro descarrega, não abre num separador. Um separador servido
  // do nosso domínio partilha a origem com a sessão de quem o abriu — e o
  // servidor manda `Content-Disposition: attachment` precisamente para
  // isso não acontecer, pelo que abrir aqui só produzia uma janela vazia.
  async function abrir(caminho: string, nome: string) {
    const url = await urlDoAnexo(caminho);
    if (!url) { avisos.erro(`Não foi possível abrir «${nome}».`); return; }
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    // O endereço temporário é do browser e não caduca sozinho: sem isto,
    // os bytes de cada anexo aberto ficavam em memória até recarregar.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!texto.trim() || aEnviar) return;
    setAEnviar(true);
    noFim.current = true;

    const r = await enviarMensagem({ vinculoId, autorId: meuId, corpo: texto, ficheiros });
    setAEnviar(false);

    if (r.erro) { avisos.erro(r.erro); return; }
    setTexto(""); setFicheiros([]);
    if (r.recusados?.length) {
      avisos.erro(`Enviado, mas ${r.recusados.length} ficheiro(s) ficaram de fora.`, );
    }
    // A mensagem própria não vem pelo Realtime a tempo; relê-se.
    listarMensagens(vinculoId).then(setMensagens).catch(() => {});
  }

  return (
    <section aria-labelledby="conversa-titulo" className="flex flex-col overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-card">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
        <h2 id="conversa-titulo" className="font-display text-lg text-ink">Conversa</h2>
        {porLer > 0 && (
          <span className="rounded-lg bg-brand-light px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-dark">
            {porLer} por ler
          </span>
        )}
      </header>

      <div className="relative">
        <div
          ref={rolo}
          onScroll={aoRolar}
          className="flex max-h-[26rem] min-h-[12rem] flex-col gap-3 overflow-y-auto px-5 py-4"
          role="log"
          aria-live="polite"
          aria-label="Mensagens"
        >
          {aLer ? (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-12 animate-pulse rounded-2xl bg-stone-100 ${i % 2 ? "ml-auto w-2/3" : "w-3/4"}`} />
              ))}
            </div>
          ) : mensagens.length === 0 ? (
            <p className="my-auto text-center text-sm leading-relaxed text-stone-400">
              Ainda não trocaram mensagens.
              {podeEscrever && ` Escreve a ${tratamentoDoOutro.split(" ")[0]} aqui em baixo.`}
            </p>
          ) : (
            mensagens.map((msg, i) => {
              const minha = msg.autorId === meuId;
              const anterior = mensagens[i - 1];
              const mudouDeDia =
                !anterior || diaDe(anterior.criadoEm) !== diaDe(msg.criadoEm);
              return (
                <div key={msg.id}>
                  {mudouDeDia && (
                    <p className="my-3 text-center text-xs font-medium text-stone-400">
                      {rotuloDeDia(msg.criadoEm)}
                    </p>
                  )}
                  <m.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className={`flex ${minha ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[75%] ${
                        minha
                          ? "bg-brand text-white"
                          : "bg-cream text-stone-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.corpo}</p>

                      {msg.anexos.length > 0 && (
                        <ul className={`mt-2.5 space-y-1.5 border-t pt-2.5 ${minha ? "border-white/25" : "border-stone-200"}`}>
                          {msg.anexos.map((a) => (
                            <li key={a.id}>
                              <button
                                type="button"
                                onClick={() => void abrir(a.caminho, a.nome)}
                                className={`flex w-full items-center gap-2 text-left text-xs underline underline-offset-2 ${
                                  minha ? "text-white/90 hover:text-white" : "text-stone-600 hover:text-stone-900"
                                }`}
                              >
                                <PaperClip size={13} className="shrink-0" aria-hidden />
                                <span className="min-w-0 flex-1 truncate">{a.nome}</span>
                                <span className="shrink-0 tabular-nums opacity-70">{tamanhoLegivel(a.bytes)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <p className={`mt-1 text-right text-[0.6875rem] tabular-nums ${minha ? "text-white/60" : "text-stone-400"}`}>
                        {hora(msg.criadoEm)}
                        {minha && msg.lidaEm && " · lida"}
                      </p>
                    </div>
                  </m.div>
                </div>
              );
            })
          )}
        </div>

        {/* Chegou mensagem enquanto a pessoa lia algo antigo. Descer o rolo
            à força tirar-lhe-ia o sítio onde estava. */}
        <AnimatePresence>
          {haNovas && (
            <m.button
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={() => irAoFim()}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-ink px-3.5 py-2 text-xs font-semibold text-white shadow-float"
            >
              Mensagem nova
            </m.button>
          )}
        </AnimatePresence>
      </div>

      {podeEscrever ? (
        <form onSubmit={enviar} className="shrink-0 border-t border-stone-100 p-4">
          {ficheiros.length > 0 && (
            <ul className="mb-2.5 space-y-1.5">
              {ficheiros.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-xl bg-cream px-3 py-1.5 text-xs">
                  <span className="min-w-0 truncate text-stone-700">{f.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums text-stone-400">{tamanhoLegivel(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => setFicheiros((a) => a.filter((_, j) => j !== i))}
                      aria-label={`Remover ${f.name}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-200 hover:text-clay-text"
                    >
                      <Trash size={13} aria-hidden />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="mensagem">Mensagem</label>
            <textarea
              id="mensagem"
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, MENSAGEM_MAX))}
              onKeyDown={(e) => {
                // Enter envia; Shift+Enter faz parágrafo. No telemóvel o
                // teclado não tem Shift à mão, por isso lá só o botão envia.
                if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) {
                  e.preventDefault(); void enviar();
                }
              }}
              rows={2}
              placeholder="Escreve aqui…"
              className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />

            <label className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-700">
              <PaperClip size={17} aria-hidden />
              <span className="sr-only">Anexar ficheiro (até {ANEXOS_MAX}, 10 MB cada)</span>
              <input
                type="file"
                multiple
                accept={TIPOS_ANEXO_ACEITES.join(",")}
                onChange={(e) => { escolher(e.target.files); e.target.value = ""; }}
                className="sr-only"
              />
            </label>

            <Button type="submit" disabled={!texto.trim() || aEnviar} className="h-11 shrink-0 !px-4">
              <ArrowRight size={16} aria-hidden />
              <span className="sr-only">Enviar</span>
            </Button>
          </div>
        </form>
      ) : (
        <p className="shrink-0 border-t border-stone-100 px-5 py-4 text-sm leading-relaxed text-stone-500">
          {estadoVinculo === "pausado"
            ? "O acompanhamento está em pausa: podes ler o histórico, mas não enviar mensagens novas."
            : "Esta conversa está fechada."}
        </p>
      )}
    </section>
  );
}

function diaDe(iso: string): string { return iso.slice(0, 10); }

function hora(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function rotuloDeDia(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje.getTime() - 86400_000);
  if (diaDe(iso) === diaDe(hoje.toISOString())) return "Hoje";
  if (diaDe(iso) === diaDe(ontem.toISOString())) return "Ontem";
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric" }).format(d);
}
