"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «Gerir ou desligar os avisos» — a página onde isso passa a existir
//  ---------------------------------------------------------------------
//  Todos os emails deste produto trazem esse texto no rodapé a apontar
//  para aqui, e trazem o mesmo endereço no cabeçalho `List-Unsubscribe`,
//  que é o que o Gmail e o Yahoo mostram como «cancelar subscrição». Esta
//  página não tinha nada que cancelasse nada — e a única alavanca que
//  sobrava a quem queria menos email era o botão de spam.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O QUE ESTE INTERRUPTOR NÃO FAZ                                       │
//  │                                                                     │
//  │ Não desliga o sino, e diz isso por escrito. O sino é onde se VAI     │
//  │ ver se aconteceu alguma coisa; desligá-lo era desligar a             │
//  │ funcionalidade em vez da interrupção.                                │
//  │                                                                     │
//  │ E não desliga os emails que não são avisos: uma redefinição de       │
//  │ palavra-passe, um recibo de pagamento ou a confirmação de um email   │
//  │ são respostas a uma coisa que a pessoa acabou de pedir, e uma        │
//  │ preferência de marketing não as pode calar. Dizê-lo aqui é o que     │
//  │ impede a promessa de ser maior do que a implementação.                │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { Mail, Spinner, Warning } from "@/components/ui/Icons";
import {
  definirPreferenciaAvisos,
  lerPreferenciaAvisos,
} from "@/lib/notificacoes/preferencias";

type Estado = "a-ler" | "pronto" | "erro-leitura";

export default function AvisosPorEmail() {
  const [estado, setEstado] = useState<Estado>("a-ler");
  const [ativo, setAtivo] = useState(true);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    lerPreferenciaAvisos()
      .then((p) => {
        if (!vivo) return;
        setAtivo(p.emailAtivo);
        setEstado("pronto");
      })
      .catch(() => {
        // Um erro de leitura não pode desenhar o interruptor «desligado»:
        // quem o visse assim carregava a pensar que estava a desligar e
        // estaria a ligar. Diz-se que não se conseguiu ler.
        if (vivo) setEstado("erro-leitura");
      });
    return () => { vivo = false; };
  }, []);

  const alternar = useCallback(async () => {
    const novo = !ativo;
    setAGuardar(true);
    setErro("");
    // Otimista, e desfeito se falhar: um interruptor que só se move depois
    // da rede parece avariado.
    setAtivo(novo);
    try {
      await definirPreferenciaAvisos(novo);
    } catch (e) {
      setAtivo(!novo);
      setErro(e instanceof Error ? e.message : "Não foi possível guardar.");
    } finally {
      setAGuardar(false);
    }
  }, [ativo]);

  return (
    <section
      aria-labelledby="conta-avisos"
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6"
    >
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15">
        <Mail size={18} />
      </span>
      <h2 id="conta-avisos" className="text-sm font-semibold text-stone-800 dark:text-stone-100">
        Avisos por email
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        Um pedido de consulta, uma proposta à espera de resposta, o limite de isenção de IVA a
        aproximar-se. Só o que pede alguma coisa de ti — nunca um email por cada mensagem de
        conversa.
      </p>

      {estado === "a-ler" ? (
        <div className="mt-4 h-12 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-800" />
      ) : estado === "erro-leitura" ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-alert-border bg-alert-bg p-3 text-xs leading-relaxed text-alert-text">
          <span className="mt-0.5 flex-shrink-0"><Warning size={13} /></span>
          Não conseguimos ler a tua preferência. Atualiza a página — enquanto isso, os avisos
          continuam a sair como estavam.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-900/50">
            <span id="conta-avisos-rotulo" className="text-sm font-medium text-stone-700 dark:text-stone-200">
              Receber avisos por email
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={ativo}
              aria-labelledby="conta-avisos-rotulo"
              disabled={aGuardar}
              onClick={() => void alternar()}
              className={`relative inline-flex h-9 w-16 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60 dark:focus-visible:ring-offset-stone-900 ${
                ativo ? "bg-brand" : "bg-stone-300 dark:bg-stone-700"
              }`}
            >
              <span
                aria-hidden
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-card transition-transform motion-reduce:transition-none ${
                  ativo ? "translate-x-8" : "translate-x-1"
                }`}
              >
                {aGuardar && <Spinner size={13} className="text-stone-400" />}
              </span>
            </button>
          </div>

          {/* O estado dito por extenso, e não só pela posição do botão. */}
          <p aria-live="polite" className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {ativo
              ? "Estás a receber os avisos por email."
              : "Não vais receber avisos por email. Continuam todos no sino, dentro do site."}
          </p>

          {erro && (
            <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
              {erro}
            </p>
          )}

          <p className="mt-3 border-t border-stone-100 pt-3 text-xs leading-relaxed text-stone-400 dark:border-stone-800 dark:text-stone-500">
            Isto não desliga os emails que respondem a uma coisa que pediste — redefinir a
            palavra-passe, confirmar o email, o recibo de um pagamento. Esses continuam a chegar.
          </p>
        </>
      )}
    </section>
  );
}
