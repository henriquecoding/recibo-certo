"use client";

import { useState, type FormEvent } from "react";
import { m } from "motion/react";
import { Check } from "@/components/ui/Icons";
import { getSupabase, supabaseConfigurado } from "@/lib/supabase/client";

export default function EmailCapture({ fonte = "landing" }: { fonte?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);

  const isValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid(email)) { setError(true); return; }
    setError(false);
    setAEnviar(true);

    const emailLimpo = email.trim().toLowerCase();

    if (supabaseConfigurado()) {
      await getSupabase()
        .from("email_waitlist")
        .upsert({ email: emailLimpo, fonte }, { onConflict: "email" });
    }

    fetch("/api/email/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailLimpo }),
    }).catch(() => {});

    setSent(true);
    setAEnviar(false);
  };

  return (
    <section
      id="lista"
      className="grain relative scroll-mt-24 overflow-hidden px-6 py-28"
      style={{ background: "linear-gradient(135deg, #0A4A39 0%, #0F6E56 45%, #1D9E75 100%)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-xl text-center">
        <div className="text-sm font-semibold uppercase tracking-[0.15em] text-green-200 mb-3">Plano Pro</div>
        <h2 className="font-display text-3xl font-semibold text-white mb-4">Deixa de te preocupar com prazos</h2>
        <p className="text-green-100 text-sm leading-relaxed mb-8">
          O plano Pro traz alertas de prazos antes de cada entrega, histórico seguro na nuvem e exportação
          direta para o teu contabilista. Regista-te e experimenta.
        </p>

        {!sent ? (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto" noValidate>
            <div className="flex-1">
              <label htmlFor="email-capture" className="sr-only">O teu email</label>
              <input
                id="email-capture"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(false); }}
                placeholder="o.teu@email.pt"
                aria-invalid={error}
                aria-describedby={error ? "email-error" : undefined}
                className="w-full px-4 py-3.5 rounded-xl text-[16px] bg-white/10 text-white placeholder-green-200 border border-white/20 focus:outline-none focus:border-white/70 focus:ring-2 focus:ring-white/30 transition-all"
              />
            </div>
            <m.button
              type="submit"
              disabled={aEnviar}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="btn-shine flex-shrink-0 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-brand-dark shadow-lift transition-colors hover:bg-green-50 disabled:opacity-70"
            >
              {aEnviar ? "A guardar…" : "Quero experimentar"}
            </m.button>
          </form>
        ) : (
          <div className="flex items-center justify-center gap-3 py-3.5 px-6 bg-white/15 rounded-xl max-w-sm mx-auto">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white">
              <Check size={14} />
            </div>
            <span className="text-white text-sm font-medium">Registado com sucesso!</span>
          </div>
        )}

        {error && (
          <p id="email-error" className="text-white text-xs mt-3 font-medium" role="alert">
            Introduz um email válido.
          </p>
        )}
        <p className="text-green-200/70 text-xs mt-4">Sem spam. Cancelamento a qualquer momento.</p>
      </div>
    </section>
  );
}
