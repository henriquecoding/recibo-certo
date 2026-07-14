"use client";

// Carregamento diferido do mapa de preços (Leaflet) — `ssr:false` + ErrorBoundary
// para nunca deixar a página em branco se as tiles/GeoJSON/geocodificação falharem
// em runtime (regra mobile-first 5b). Wrapper cliente reutilizável para poder ser
// usado a partir de Server Components (onde `dynamic({ssr:false})` não é permitido).

import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

const MapaPrecosRegioes = dynamic(() => import("./MapaPrecosRegioes"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[420px] w-full animate-pulse rounded-4xl border border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/50"
      aria-hidden
    />
  ),
});

export default function MapaPrecosRegioesLazy() {
  return (
    <ErrorBoundary etiqueta="o mapa de preços de contabilistas">
      <MapaPrecosRegioes />
    </ErrorBoundary>
  );
}
