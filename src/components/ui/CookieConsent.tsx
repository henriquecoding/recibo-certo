"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "motion/react";
import { EASE } from "@/lib/motion";
import { Cookie } from "@/components/ui/Icons";
import { lerConsentimento, guardarConsentimento, ABRIR_PREFERENCIAS_EVENT } from "@/lib/cookie-consent";

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-0 p-0 transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900 ${
        checked ? "bg-brand" : "bg-stone-300 dark:bg-stone-600"
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Categoria({
  titulo,
  children,
  control,
}: {
  titulo: string;
  children: React.ReactNode;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-stone-100 dark:border-stone-800 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{titulo}</p>
        <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{children}</p>
      </div>
      <div className="flex-shrink-0 pt-0.5">{control}</div>
    </div>
  );
}

export default function CookieConsent() {
  const [aberto, setAberto] = useState(false);
  const [jaDecidiu, setJaDecidiu] = useState(true);
  const [estatistica, setEstatistica] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = lerConsentimento();
    if (!c) {
      setJaDecidiu(false);
      setAberto(true);
    } else {
      setEstatistica(c.estatistica);
      setMarketing(c.marketing);
    }
    const abrir = () => {
      const cur = lerConsentimento();
      setEstatistica(cur?.estatistica ?? false);
      setMarketing(cur?.marketing ?? false);
      setJaDecidiu(!!cur);
      setAberto(true);
    };
    window.addEventListener(ABRIR_PREFERENCIAS_EVENT, abrir);
    return () => window.removeEventListener(ABRIR_PREFERENCIAS_EVENT, abrir);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    painelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && jaDecidiu) setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, jaDecidiu]);

  const rejeitar = () => {
    guardarConsentimento({ estatistica: false, marketing: false });
    setAberto(false);
  };
  const aceitarTodos = () => {
    guardarConsentimento({ estatistica: true, marketing: true });
    setAberto(false);
  };
  const confirmar = () => {
    guardarConsentimento({ estatistica, marketing });
    setAberto(false);
  };

  return (
    <AnimatePresence>
      {aberto && (
        <m.div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          // Fechar ao clicar fora só depois de já ter havido uma decisão.
          onClick={() => jaDecidiu && setAberto(false)}
        >
          <m.div
            ref={painelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="grain max-h-[92vh] w-full overflow-y-auto rounded-t-4xl border border-stone-100 bg-white p-6 shadow-float outline-none dark:border-stone-800 dark:bg-stone-900 sm:max-w-lg sm:rounded-4xl"
          >
            <div className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand">
                <Cookie size={24} />
              </span>
              <h2 id="cookie-title" className="mt-3 font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
                Preferências de cookies
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                Usamos cookies para garantir o bom funcionamento do site e, com a tua autorização, para medir a
                utilização e personalizar conteúdos. Podes escolher o que aceitas. Sabe mais na{" "}
                <Link href="/cookies" className="font-medium text-brand-dark underline underline-offset-2 hover:text-brand">
                  Política de Cookies
                </Link>{" "}
                e na{" "}
                <Link href="/privacidade" className="font-medium text-brand-dark underline underline-offset-2 hover:text-brand">
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>

            <div className="mt-5">
              <Categoria
                titulo="Cookies estritamente necessários"
                control={<span className="text-xs font-semibold text-brand">Sempre ativos</span>}
              >
                Essenciais para o funcionamento do site — por exemplo, o tema (claro/escuro), a sessão e as tuas
                preferências. Não podem ser desligados.
              </Categoria>

              <Categoria
                titulo="Cookies de estatística"
                control={<Switch checked={estatistica} onChange={setEstatistica} label="Cookies de estatística" />}
              >
                Ajudam-nos a perceber, de forma agregada e anónima, como o site é utilizado, para o melhorarmos.
              </Categoria>

              <Categoria
                titulo="Cookies de marketing e personalização"
                control={<Switch checked={marketing} onChange={setMarketing} label="Cookies de marketing e personalização" />}
              >
                Permitem mostrar conteúdos e mensagens mais relevantes para ti dentro e fora do site.
              </Categoria>
            </div>

            <div className="mt-5 flex flex-col gap-2 border-t border-stone-100 pt-4 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={rejeitar}
                className="order-2 rounded-xl px-3 py-2 text-sm font-semibold text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 sm:order-1"
              >
                Rejeitar cookies
              </button>
              <div className="order-1 flex gap-2 sm:order-2">
                <button
                  type="button"
                  onClick={confirmar}
                  className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-all hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 sm:flex-none"
                >
                  Confirmar seleção
                </button>
                <button
                  type="button"
                  onClick={aceitarTodos}
                  className="btn-shine flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float sm:flex-none"
                >
                  Aceitar todos
                </button>
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
