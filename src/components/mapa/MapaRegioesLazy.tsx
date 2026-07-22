"use client";

// Carregamento diferido do mapa unificado (Leaflet) — `ssr:false` + ErrorBoundary
// para nunca deixar a página em branco se as tiles/GeoJSON/geocodificação falharem
// em runtime (regra mobile-first 5b). Wrapper cliente reutilizável para poder ser
// usado a partir de Server Components (onde `dynamic({ssr:false})` não é permitido).

import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import type { FiltroMapa } from "@/lib/profissionais-regioes";

const MapaRegioes = dynamic(() => import("./MapaRegioes"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[420px] w-full animate-pulse rounded-4xl border border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/50"
      aria-hidden
    />
  ),
});

export default function MapaRegioesLazy({ contexto }: { contexto?: FiltroMapa }) {
  return (
    <ErrorBoundary etiqueta="o mapa de preços e regiões">
      <MapaRegioes contexto={contexto} />
    </ErrorBoundary>
  );
}
