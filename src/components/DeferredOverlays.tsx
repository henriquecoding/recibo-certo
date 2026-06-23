"use client";

// Overlays/modais que NÃO são precisos para a primeira pintura (pesquisa,
// autenticação, popup de novidades, consentimento de cookies). Carregam-se
// após a hidratação, fora do bundle inicial, melhorando o desempenho.
// A funcionalidade mantém-se: abrem por evento/interação ou na primeira visita.

import dynamic from "next/dynamic";

const BuscaOverlay = dynamic(() => import("@/components/busca/BuscaGlobal"), { ssr: false });
const AuthModal = dynamic(() => import("@/components/ui/AuthModal"), { ssr: false });
const NovidadesModal = dynamic(() => import("@/components/ui/NovidadesModal"), { ssr: false });
const CookieConsent = dynamic(() => import("@/components/ui/CookieConsent"), { ssr: false });

export default function DeferredOverlays() {
  return (
    <>
      <BuscaOverlay />
      <AuthModal />
      <NovidadesModal />
      <CookieConsent />
    </>
  );
}
