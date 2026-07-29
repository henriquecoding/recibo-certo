"use client";

import { useCallback, useEffect, useState } from "react";
import { fizAtiva } from "@/lib/fiz/flag";
import { useAuth } from "@/lib/supabase/auth";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { Check, Warning, Lock, Spinner } from "@/components/ui/Icons";
import FizActionButton from "./FizActionButton";
import FizDisclosure from "./FizDisclosure";
import FizLogo, { FizMarca } from "./FizLogo";

// ─────────────────────────────────────────────────────────────────────────
//  Cartão de ligação à FIZ no dashboard (ponto 12.4 da arquitetura).
//
//  Mostra o estado da ligação, o que a ligação permite e os controlos de
//  privacidade — incluindo desligar, que é sempre possível e imediato.
// ─────────────────────────────────────────────────────────────────────────

type EstadoLigacao = "NOT_CONNECTED" | "CONNECTED" | "REAUTHORIZATION_REQUIRED" | "REVOKED";

const DESCRICAO_ESTADO: Record<EstadoLigacao, string> = {
  NOT_CONNECTED: "A tua conta FIZ não está ligada. Sem ligação, mostramos apenas prazos legais gerais.",
  CONNECTED: "Conta ligada. Passamos a mostrar aqui o estado real que a FIZ nos comunica.",
  REAUTHORIZATION_REQUIRED: "A autorização expirou. Volta a ligar para continuares a ver o teu estado.",
  REVOKED: "A ligação foi terminada. Podes voltar a ligar quando quiseres.",
};

const O_QUE_PERMITE = [
  "Ver as tuas obrigações e prazos reais, em vez de um calendário genérico.",
  "Acompanhar o estado das declarações que a FIZ trata por ti.",
  "Continuar uma simulação na FIZ sem repetir dados.",
];

export default function FizConnectionCard({ className = "" }: { className?: string }) {
  const { user, carregado: authCarregado } = useAuth();
  const [estado, setEstado] = useState<EstadoLigacao>("NOT_CONNECTED");
  const [carregado, setCarregado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const token = useCallback(async (): Promise<string | null> => {
    if (!supabaseConfigurado()) return null;
    const { getSupabase } = await import("@/lib/supabase/client");
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  useEffect(() => {
    if (!authCarregado || !user || !fizAtiva()) {
      setCarregado(true);
      return;
    }
    let ativo = true;
    (async () => {
      const t = await token();
      if (!t) {
        if (ativo) setCarregado(true);
        return;
      }
      try {
        // A ligação é lida a partir da própria rota de obrigações: um 401
        // com código "nao_autorizado" significa "não ligado".
        const r = await fetch("/api/integrations/fiz/obligations", { headers: { authorization: `Bearer ${t}` } });
        if (ativo) setEstado(r.ok ? "CONNECTED" : "NOT_CONNECTED");
      } catch {
        if (ativo) setEstado("NOT_CONNECTED");
      } finally {
        if (ativo) setCarregado(true);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [authCarregado, user, token]);

  const ligar = useCallback(async () => {
    setOcupado(true);
    setAviso(null);
    try {
      const t = await token();
      if (!t) {
        setAviso("Inicia sessão antes de ligar a conta FIZ.");
        return;
      }
      const r = await fetch("/api/integrations/fiz/connect", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
        body: JSON.stringify({ regresso: "/dashboard/conta" }),
      });
      const d = (await r.json()) as { url?: string; erro?: string };
      if (!r.ok || !d.url) {
        setAviso(d.erro ?? "Não foi possível iniciar a ligação.");
        return;
      }
      window.location.href = d.url;
    } catch {
      setAviso("Não foi possível contactar a FIZ.");
    } finally {
      setOcupado(false);
    }
  }, [token]);

  const desligar = useCallback(async () => {
    setOcupado(true);
    setAviso(null);
    try {
      const t = await token();
      if (!t) return;
      const r = await fetch("/api/integrations/fiz/disconnect", {
        method: "POST",
        headers: { authorization: `Bearer ${t}` },
      });
      const d = (await r.json()) as { aviso?: string };
      setEstado("REVOKED");
      if (d.aviso) setAviso(d.aviso);
    } catch {
      setAviso("Não foi possível desligar agora. Tenta novamente.");
    } finally {
      setOcupado(false);
    }
  }, [token]);

  if (!fizAtiva()) return null;

  const ligada = estado === "CONNECTED";

  return (
    <section
      aria-labelledby="fiz-ligacao"
      className={`overflow-hidden rounded-4xl border border-fiz-200 bg-fiz-50 shadow-card ${className}`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <FizLogo size={26} className="rounded-lg" decorativo />
              <div>
                <h2 id="fiz-ligacao" className="font-display text-lg font-semibold text-ink">
                  Execução fiscal com a <FizMarca size={15} className="align-baseline" />
                </h2>
              </div>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              {carregado ? DESCRICAO_ESTADO[estado] : "A verificar a ligação…"}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
              ligada ? "bg-brand-light text-brand-dark" : "bg-white text-stone-500 dark:bg-stone-900"
            }`}
          >
            {!carregado ? <Spinner size={12} className="animate-spin" /> : ligada ? <Check size={12} /> : <Lock size={12} />}
            {!carregado ? "A verificar" : ligada ? "Ligada" : "Não ligada"}
          </span>
        </div>

        {!ligada && (
          <ul className="mt-4 space-y-1.5">
            {O_QUE_PERMITE.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                <Check size={13} className="mt-0.5 flex-shrink-0 text-fiz-700" />
                {item}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 flex items-start gap-1.5 rounded-2xl bg-white px-3 py-2 text-xs leading-relaxed text-stone-600 dark:bg-stone-900 dark:text-stone-400">
          <Lock size={13} className="mt-0.5 flex-shrink-0 text-brand" />
          <span>
            Nunca pedimos nem guardamos as tuas credenciais da FIZ, das Finanças ou da Segurança
            Social. A autorização é feita na FIZ e podes retirá-la a qualquer momento.
          </span>
        </p>

        {aviso && (
          <p role="status" className="mt-3 rounded-xl bg-alert-bg px-3 py-2 text-xs text-alert-text">
            <Warning size={12} className="mr-1 inline" />
            {aviso}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {ligada ? (
            <button
              type="button"
              onClick={desligar}
              disabled={ocupado}
              className="min-h-[44px] rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200"
            >
              Desligar a conta FIZ
            </button>
          ) : (
            <FizActionButton onClick={ligar} ocupado={ocupado}>
              Ligar a minha conta FIZ
            </FizActionButton>
          )}
        </div>

        <FizDisclosure
          texto="A FIZ é um parceiro de execução fiscal. O ReciboCerto explica e prepara; a FIZ executa. A parceria é remunerada e o acesso à FIZ não depende do ReciboCerto Plus."
          className="mt-4"
        />
      </div>
    </section>
  );
}
