"use client";

// ═══════════════════════════════════════════════════════════════════════
//  SINCRONIZAR COM O CALENDÁRIO DE FORA
//  ---------------------------------------------------------------------
//  Um endereço, três instruções e dois interruptores. O que este ecrã
//  tem de conseguir é uma coisa só: que a pessoa acabe com as consultas
//  no telemóvel dela e perceba o que acabou de partilhar.
//
//  A PARTE INCÓMODA ESTÁ À VISTA
//  -----------------------------
//  O endereço É a chave. Não há forma de o esconder — um calendário
//  externo não sabe autenticar-se — e por isso a alternativa honesta a
//  escondê-lo é dizê-lo, com o botão de o trocar ao lado. Um aviso que se
//  lê e um botão que resolve valem mais do que um aviso que assusta.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
import {
  CalendarSync, Check, Copy, ExternalLink, Lock, RotateCcw, Spinner, Warning,
} from "@/components/ui/Icons";
import { linkWebcal } from "@/lib/calendario/ics";
import {
  ajustar, criarOuRodar, obterAssinatura, revogar,
  type Assinatura, type DetalheDoCalendario, type PapelDeCalendario,
} from "@/lib/contabilistas/fonte/calendario";

const ALARMES: { valor: number | null; rotulo: string }[] = [
  { valor: null, rotulo: "Sem alarme" },
  { valor: 30, rotulo: "30 min antes" },
  { valor: 60, rotulo: "1 hora antes" },
  { valor: 1440, rotulo: "1 dia antes" },
];

export default function SincronizarCalendario({ papel }: { papel: PapelDeCalendario }) {
  const avisos = useAvisos();
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [aConfirmarTroca, setAConfirmarTroca] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const carregar = useCallback(async () => {
    try { setAssinatura(await obterAssinatura(papel)); }
    catch { /* sem ligação, o ecrã mostra o estado de partida */ }
    finally { setACarregar(false); }
  }, [papel]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function ligar() {
    setOcupado(true);
    const { erro } = await criarOuRodar(papel);
    setOcupado(false);
    if (erro) { avisos.erro(erro); return; }
    await carregar();
    avisos.sucesso("Endereço criado.", { detalhe: "Agora subscreve-o no teu calendário." });
  }

  async function rodar() {
    setOcupado(true);
    const { erro } = await criarOuRodar(papel, assinatura?.detalhe ?? "completo", assinatura?.alarmeMin ?? 60);
    setOcupado(false);
    setAConfirmarTroca(false);
    if (erro) { avisos.erro(erro); return; }
    await carregar();
    avisos.sucesso("Endereço trocado.", {
      detalhe: "O antigo deixou de funcionar. Volta a subscrever nos aparelhos onde o tinhas.",
    });
  }

  async function desligar() {
    setOcupado(true);
    const { erro } = await revogar(papel);
    setOcupado(false);
    if (erro) { avisos.erro(erro); return; }
    setAssinatura(null);
    avisos.sucesso("Endereço desligado.", { detalhe: "Deixou de responder a qualquer calendário." });
  }

  async function mudar(detalhe: DetalheDoCalendario, alarmeMin: number | null) {
    if (!assinatura) return;
    const antes = assinatura;
    // Otimista: mudar isto é instantâneo do lado de quem carrega, e um
    // atraso de rede num interruptor faz a pessoa carregar duas vezes.
    setAssinatura({ ...assinatura, detalhe, alarmeMin });
    const { erro } = await ajustar(papel, detalhe, alarmeMin);
    if (erro) { setAssinatura(antes); avisos.erro(erro); return; }
  }

  async function copiar() {
    if (!assinatura) return;
    try {
      await navigator.clipboard.writeText(assinatura.url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      avisos.erro("Não foi possível copiar.", {
        detalhe: "Seleciona o endereço à mão e copia com o teclado.",
      });
    }
  }

  if (aCarregar) {
    return <div className="h-56 animate-pulse rounded-4xl bg-stone-100" />;
  }

  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand-dark"
        >
          <CalendarSync size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg text-ink">No teu calendário</h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-500">
            As consultas aparecem no Google Calendar, no calendário do iPhone e do Mac,
            no Outlook — e atualizam-se sozinhas quando alguma muda de hora ou é
            cancelada. Não pedimos acesso ao teu calendário: só publicamos o nosso.
          </p>
        </div>
      </div>

      {!assinatura ? (
        <div className="mt-5">
          <Button onClick={() => void ligar()} disabled={ocupado}>
            {ocupado ? <><Spinner size={14} /> A criar…</> : "Criar o endereço"}
          </Button>
          <p className="mt-2 text-xs leading-relaxed text-stone-400">
            Gera um endereço só teu. Podes trocá-lo ou desligá-lo quando quiseres.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <label htmlFor="url-calendario" className="block text-xs font-bold uppercase tracking-wide text-stone-500">
              O teu endereço
            </label>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
              <input
                id="url-calendario"
                readOnly
                value={assinatura.url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-cream px-3.5 py-2.5 font-mono text-xs text-stone-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
              />
              <Button variant="secondary" onClick={() => void copiar()} className="shrink-0">
                {copiado
                  ? <><Check size={14} aria-hidden /> Copiado</>
                  : <><Copy size={14} aria-hidden /> Copiar</>}
              </Button>
            </div>

            <p className="mt-2 flex items-start gap-2 rounded-2xl bg-alert-bg px-3.5 py-2.5 text-xs leading-relaxed text-alert-text">
              <Warning size={14} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                Este endereço é a chave da tua agenda: quem o tiver consegue ver as tuas
                consultas. Não o publiques nem o envies para listas. Se achares que
                escapou, troca-o aqui em baixo.
              </span>
            </p>
          </div>

          <ComoSubscrever url={assinatura.url} />

          <fieldset className="mt-6 border-t border-stone-100 pt-5">
            <legend className="sr-only">O que sai no calendário</legend>
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
              O que aparece em cada consulta
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <OpcaoDetalhe
                ativo={assinatura.detalhe === "completo"}
                titulo="Tudo"
                ajuda={papel === "contabilista"
                  ? "Nome do cliente, assunto e morada."
                  : "Assunto e morada da consulta."}
                onClick={() => void mudar("completo", assinatura.alarmeMin)}
              />
              <OpcaoDetalhe
                ativo={assinatura.detalhe === "ocupado"}
                titulo="Só «ocupado»"
                ajuda="A hora, e mais nada. Para calendários que outros veem."
                onClick={() => void mudar("ocupado", assinatura.alarmeMin)}
              />
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Alarme
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALARMES.map((a) => (
                <button
                  key={a.rotulo}
                  type="button"
                  aria-pressed={assinatura.alarmeMin === a.valor}
                  onClick={() => void mudar(assinatura.detalhe, a.valor)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                    assinatura.alarmeMin === a.valor
                      ? "bg-ink text-white"
                      : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {a.rotulo}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 border-t border-stone-100 pt-5">
            <p className="text-xs tabular-nums text-stone-400">
              {assinatura.ultimoAcessoEm
                ? `Lido pela última vez a ${new Date(assinatura.ultimoAcessoEm).toLocaleDateString("pt-PT", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}.`
                : "Ainda nenhum calendário leu este endereço. Se já o subscreveste há mais de uma hora, confirma que o copiaste inteiro."}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {!aConfirmarTroca ? (
                <Button size="sm" variant="secondary" onClick={() => setAConfirmarTroca(true)} disabled={ocupado}>
                  <RotateCcw size={13} aria-hidden /> Trocar o endereço
                </Button>
              ) : (
                <div className="w-full rounded-2xl border border-alert-border bg-alert-bg/40 p-3.5">
                  <p className="text-xs leading-relaxed text-alert-text">
                    Ao trocar, o endereço atual deixa de funcionar de imediato. Vais ter de
                    voltar a subscrever em todos os aparelhos onde o tinhas.
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void rodar()} disabled={ocupado}>
                      {ocupado ? <><Spinner size={13} /> A trocar…</> : "Trocar mesmo assim"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAConfirmarTroca(false)} disabled={ocupado}>
                      Afinal não
                    </Button>
                  </div>
                </div>
              )}

              <Button size="sm" variant="ghost" onClick={() => void desligar()} disabled={ocupado}>
                Desligar
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function OpcaoDetalhe({
  ativo, titulo, ajuda, onClick,
}: { ativo: boolean; titulo: string; ajuda: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      onClick={onClick}
      className={`flex-1 rounded-2xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        ativo
          ? "border-brand bg-brand-light"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <span className={`flex items-center gap-1.5 text-sm font-semibold ${ativo ? "text-brand-dark" : "text-stone-700"}`}>
        {ativo && <Check size={13} aria-hidden />}
        {titulo}
      </span>
      <span className={`mt-0.5 block text-xs leading-relaxed ${ativo ? "text-brand-dark/80" : "text-stone-500"}`}>
        {ajuda}
      </span>
    </button>
  );
}

/**
 * As instruções.
 *
 * Estão escritas por aplicação e não em genérico porque o passo que trava
 * toda a gente é diferente em cada uma: no Google é encontrar «De um
 * URL», no Apple é perceber que o `webcal:` abre sozinho, no Outlook é
 * «Subscrever a partir da Web» estar num sítio que ninguém adivinha.
 */
function ComoSubscrever({ url }: { url: string }) {
  const webcal = linkWebcal(url);
  const google = `https://calendar.google.com/calendar/r/settings/addbyurl`;

  return (
    <div className="mt-5 rounded-3xl border border-stone-200 bg-cream/60 p-4">
      <p className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
        <Lock size={13} aria-hidden /> Como subscrever
      </p>

      <dl className="mt-3 space-y-3">
        <div>
          <dt className="text-xs font-semibold text-stone-700">iPhone, iPad ou Mac</dt>
          <dd className="mt-1 text-xs leading-relaxed text-stone-500">
            <a
              href={webcal}
              className="inline-flex items-center gap-1 font-semibold text-brand-dark underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
            >
              Abrir no calendário da Apple <ExternalLink size={10} aria-hidden />
            </a>
            {" "}— o aparelho pergunta se queres subscrever. Diz que sim.
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold text-stone-700">Google Calendar</dt>
          <dd className="mt-1 text-xs leading-relaxed text-stone-500">
            <a
              href={google}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand-dark underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
            >
              Abrir «Adicionar por URL» <ExternalLink size={10} aria-hidden />
            </a>
            {" "}e colar o endereço. Só funciona no computador — a aplicação de
            telemóvel não tem esta opção, mas mostra o calendário depois de o
            adicionares uma vez.
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold text-stone-700">Outlook</dt>
          <dd className="mt-1 text-xs leading-relaxed text-stone-500">
            Calendário → <em>Adicionar calendário</em> → <em>Subscrever a partir da Web</em>,
            e colar o endereço.
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
        Cada aplicação relê quando lhe apetece — o Google costuma demorar algumas horas
        na primeira vez. Não é o endereço que está errado: é o calendário a ir ao seu
        ritmo.
      </p>
    </div>
  );
}
