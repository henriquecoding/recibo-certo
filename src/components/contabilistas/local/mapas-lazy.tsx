"use client";

// Carregamento diferido dos dois mapas do local da consulta.
//
// Leaflet e as suas tiles são pesados e falham de maneiras que não
// controlamos (rede, CDN, bloqueadores). Nenhuma dessas falhas pode deixar
// a agenda do contabilista — ou a área do cliente na véspera da consulta —
// em branco: `ssr:false` + `ErrorBoundary`, como manda a regra mobile-first
// 5b e como já se faz no mapa de regiões.

import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import type { PontoNoMapa } from "@/lib/contabilistas/local-consulta";
import type { LocalEscolhidoNoMapa } from "./SeletorDeLocal";

const Esqueleto = ({ altura }: { altura: number }) => (
  <div
    style={{ height: altura }}
    className="w-full animate-pulse rounded-2xl border border-stone-100 bg-stone-50"
    aria-hidden
  />
);

const Seletor = dynamic(() => import("./SeletorDeLocal"), {
  ssr: false,
  loading: () => <Esqueleto altura={280} />,
});

const Mapa = dynamic(() => import("./MapaDoLocal"), {
  ssr: false,
  loading: () => <Esqueleto altura={160} />,
});

export function SeletorDeLocalLazy(props: {
  moradaInicial?: string;
  pontoInicial?: PontoNoMapa | null;
  onEscolher: (l: LocalEscolhidoNoMapa) => void;
  onCancelar: () => void;
}) {
  return (
    <ErrorBoundary etiqueta="o mapa para escolher o local">
      <Seletor {...props} />
    </ErrorBoundary>
  );
}

export function MapaDoLocalLazy(props: { ponto: PontoNoMapa; morada: string; altura?: number }) {
  return (
    <ErrorBoundary
      etiqueta="o mapa do local"
      // Sem mapa, a morada e as ligações externas continuam por baixo: o
      // cliente perde a miniatura, não perde o caminho.
      fallback={null}
    >
      <Mapa {...props} />
    </ErrorBoundary>
  );
}

export type { LocalEscolhidoNoMapa };
