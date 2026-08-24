"use client";

// ═══════════════════════════════════════════════════════════════════════
//  /admin/emails — os moldes que o produto envia, e um envio de teste
//  ---------------------------------------------------------------------
//  Um molde revisto no browser não é o mesmo molde aberto no Gmail: o
//  cliente de email reescreve CSS, corta larguras e trata as tabelas à sua
//  maneira. Esta página existe para fechar essa distância — escolhe-se um
//  endereço e recebem-se os emails a sério.
//
//  A autorização é do SERVIDOR (`adminDoPedido` em /api/admin/emails-teste).
//  O que aqui se vê é conveniência; quem autoriza é a rota.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import { Check, Mail, Warning } from "@/components/ui/Icons";

interface ExemploLido {
  id: string;
  rotulo: string;
  quando: string;
  canal: "email" | "sino";
  novo: boolean;
  assunto: string;
}

interface ResultadoEnvio {
  id: string;
  rotulo: string;
  ok: boolean;
  erro?: string;
  enviadoId?: string;
}

export default function AdminEmails() {
  const [emails, setEmails] = useState<ExemploLido[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [para, setPara] = useState("");
  const [aEnviar, setAEnviar] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ResultadoEnvio[] | null>(null);

  const token = useCallback(async () => {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  useEffect(() => {
    (async () => {
      const t = await token();
      if (!t) { setErro("A sessão expirou. Entra outra vez."); setCarregado(true); return; }
      const res = await fetch("/api/admin/emails-teste", { headers: { Authorization: `Bearer ${t}` } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setErro(json?.erro ?? "Não foi possível carregar os moldes.");
      else setEmails((json.emails ?? []) as ExemploLido[]);
      setCarregado(true);
    })();
  }, [token]);

  async function enviar(apenas?: string) {
    setErro(null);
    setResultados(null);
    setAEnviar(apenas ?? "todos");

    const t = await token();
    if (!t) { setErro("A sessão expirou. Entra outra vez."); setAEnviar(null); return; }

    const res = await fetch("/api/admin/emails-teste", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify(apenas ? { para, apenas } : { para }),
    });
    const json = await res.json().catch(() => ({}));
    setAEnviar(null);

    if (!res.ok) { setErro(json?.erro ?? "Não foi possível enviar."); return; }
    setResultados(json.resultados as ResultadoEnvio[]);
  }

  const enderecoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para.trim());
  const enviados = resultados?.filter((r) => r.ok).length ?? 0;
  const falhados = (resultados?.length ?? 0) - enviados;
  const porId = new Map((resultados ?? []).map((r) => [r.id, r]));

  return (
    <div className="mx-auto max-w-4xl">
      <CabecalhoAdmin
        titulo="Emails"
        descricao={
          carregado
            ? `${emails.length} moldes. Envia-os para um endereço teu e vê como chegam a sério.`
            : "A carregar…"
        }
      />

      {/* ── O envio ─────────────────────────────────────────────────── */}
      <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-light text-brand dark:bg-brand/15">
            <Mail size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              Enviar para uma caixa a sério
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Os assuntos vão prefixados com <span className="font-mono">[teste]</span> e o conteúdo
              é inventado — nunca dados de ninguém. São 3 envios por hora.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Endereço de email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={para}
              onChange={(e) => setPara(e.target.value)}
              placeholder="o.teu@email.pt"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </label>
          <button
            type="button"
            onClick={() => void enviar()}
            disabled={!enderecoValido || aEnviar !== null}
            className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {aEnviar === "todos" ? "A enviar…" : `Enviar os ${emails.length}`}
          </button>
        </div>

        {erro && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
            <Warning size={16} className="mt-0.5 flex-none" aria-hidden /> {erro}
          </p>
        )}

        {resultados && (
          <p
            aria-live="polite"
            className={`mt-3 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm ${
              falhados === 0
                ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-light"
                : "bg-alert-bg text-alert-text"
            }`}
          >
            {falhados === 0
              ? <Check size={16} className="mt-0.5 flex-none" aria-hidden />
              : <Warning size={16} className="mt-0.5 flex-none" aria-hidden />}
            <span>
              {enviados} enviado{enviados !== 1 ? "s" : ""}
              {falhados > 0 && ` · ${falhados} falhado${falhados !== 1 ? "s" : ""}`}. Confere a caixa
              de entrada — e a pasta de spam, que é onde um domínio novo costuma cair.
            </span>
          </p>
        )}
      </section>

      {/* ── O catálogo ──────────────────────────────────────────────── */}
      <h2 className="mt-7 mb-2.5 text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">
        Os moldes
      </h2>

      {!carregado ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {emails.map((e) => {
            const r = porId.get(e.id);
            return (
              <li
                key={e.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-stone-100 bg-white px-4 py-3.5 dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">{e.rotulo}</span>
                    {e.novo && (
                      <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        novo
                      </span>
                    )}
                    {r && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          r.ok ? "bg-brand-light text-brand-dark" : "bg-clay-bg text-clay-text"
                        }`}
                      >
                        {r.ok ? "enviado" : "falhou"}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-stone-500 dark:text-stone-400">
                    {e.assunto}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{e.quando}</p>
                  {r && !r.ok && r.erro && (
                    <p className="mt-1 text-xs text-clay-text">{r.erro}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void enviar(e.id)}
                  disabled={!enderecoValido || aEnviar !== null}
                  className="inline-flex min-h-[2.25rem] flex-none items-center rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
                >
                  {aEnviar === e.id ? "A enviar…" : "Enviar só este"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
