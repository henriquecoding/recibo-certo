"use client";

// Overlays globais que NÃO são precisos para a primeira pintura: modal de auth,
// popup de Novidades (que arrasta o changelog ~79 KB), pesquisa global e o
// consentimento de cookies. Em vez de entrarem no bundle inicial de todas as
// páginas, são carregados com `next/dynamic` e só montados quando o navegador
// fica livre (requestIdleCallback) ou à primeira interação do utilizador — o
// que vier primeiro. Assim saem do caminho crítico sem perder funcionalidade.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const AuthModal = dynamic(() => import("@/components/ui/AuthModal"), { ssr: false });
const NovidadesModal = dynamic(() => import("@/components/ui/NovidadesModal"), { ssr: false });
const BuscaOverlay = dynamic(() => import("@/components/busca/BuscaGlobal"), { ssr: false });
const CookieConsent = dynamic(() => import("@/components/ui/CookieConsent"), { ssr: false });

const BUSCA_ABRIR = "recibocerto:busca:abrir";

export default function DeferredOverlays() {
  const [montar, setMontar] = useState(false);

  useEffect(() => {
    let feito = false;
    let idleId: number | undefined;

    const limpar = () => {
      window.removeEventListener("pointerdown", aoInteragir);
      window.removeEventListener("keydown", aoInteragir);
      window.removeEventListener("touchstart", aoInteragir);
      window.removeEventListener(BUSCA_ABRIR, aoInteragir);
    };

    function aoInteragir(e?: Event) {
      if (feito) return;
      feito = true;
      limpar();
      setMontar(true);

      // Se a interação foi para abrir a pesquisa (botão móvel ou Cmd/Ctrl+K), o
      // overlay só liga o seu próprio listener depois de montar — por isso
      // reemitimos o evento de abertura nos frames seguintes.
      const querPesquisa =
        (!!e && e.type === BUSCA_ABRIR) ||
        (e instanceof KeyboardEvent && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k");
      if (querPesquisa) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => window.dispatchEvent(new Event(BUSCA_ABRIR)))
        );
      }
    }

    // Monta assim que o navegador estiver livre (com teto de 2,5 s para que o
    // aviso de cookies não demore demasiado a aparecer na primeira visita).
    const ric = (window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (ric) {
      idleId = ric(() => aoInteragir(), { timeout: 2500 });
    } else {
      idleId = window.setTimeout(() => aoInteragir(), 1800);
    }

    window.addEventListener("pointerdown", aoInteragir, { passive: true });
    window.addEventListener("keydown", aoInteragir);
    window.addEventListener("touchstart", aoInteragir, { passive: true });
    window.addEventListener(BUSCA_ABRIR, aoInteragir);

    return () => {
      feito = true;
      limpar();
      const cic = (window as typeof window & {
        cancelIdleCallback?: (id: number) => void;
      }).cancelIdleCallback;
      if (idleId !== undefined) {
        if (cic) cic(idleId);
        else clearTimeout(idleId);
      }
    };
  }, []);

  if (!montar) return null;

  return (
    <>
      <AuthModal />
      <NovidadesModal />
      <BuscaOverlay />
      <CookieConsent />
    </>
  );
}
