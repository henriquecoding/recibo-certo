"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ONDE É — o mapa que o cliente vê
//  ---------------------------------------------------------------------
//  O lado de leitura do ponto que o contabilista escolheu. Não é um mapa
//  para explorar: é um mapa para reconhecer. Por isso abre já no sítio, com
//  zoom de rua, e sem nenhum dos controlos que convidam a andar por lá —
//  quem quer navegar carrega em «abrir no mapa» e vai para a aplicação que
//  já usa, que é onde as direções funcionam mesmo.
//
//  Continua a ser Leaflet e continua a carregar só no browser: um mapa que
//  falha não pode deixar a área do cliente em branco na véspera de uma
//  consulta. Ver o wrapper `MapaDoLocalLazy`.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PontoNoMapa } from "@/lib/contabilistas/local-consulta";

const TILES_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILES_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILES_ATTR =
  '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function isDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

export default function MapaDoLocal({
  ponto, morada, altura = 160,
}: {
  ponto: PontoNoMapa;
  morada: string;
  altura?: number;
}) {
  const caixaRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileRef = useRef<TileLayer | null>(null);

  useEffect(() => {
    let cancelado = false;
    let observer: MutationObserver | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !caixaRef.current || mapRef.current) return;

      const map = L.map(caixaRef.current, {
        center: [ponto.lat, ponto.lng],
        zoom: 17,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: true,
      });
      mapRef.current = map;

      tileRef.current = L.tileLayer(isDark() ? TILES_DARK : TILES_LIGHT, {
        attribution: TILES_ATTR,
        maxZoom: 19,
      }).addTo(map);

      const W = 30;
      const H = 38;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:${W}px;height:${H}px;display:flex;align-items:flex-start;justify-content:center;filter:drop-shadow(0 3px 7px rgba(10,74,57,.45))">
          <svg width="${W}" height="${H}" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M17 43C17 43 31 27.5 31 17A14 14 0 1 0 3 17c0 10.5 14 26 14 26Z" fill="#0F6E56" stroke="#fff" stroke-width="2.5"/>
            <circle cx="17" cy="17" r="5" fill="#fff"/>
          </svg>
        </div>`,
        iconSize: [W, H],
        iconAnchor: [W / 2, H],
      });
      L.marker([ponto.lat, ponto.lng], { icon, interactive: false, keyboard: false, alt: morada }).addTo(map);

      observer = new MutationObserver(() => {
        tileRef.current?.setUrl(isDark() ? TILES_DARK : TILES_LIGHT);
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {
          /* noop */
        }
      }, 160);
    })();

    return () => {
      cancelado = true;
      observer?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      tileRef.current = null;
    };
  }, [ponto.lat, ponto.lng, morada]);

  return (
    <div
      ref={caixaRef}
      style={{ height: altura }}
      className="w-full"
      role="img"
      aria-label={`Mapa com o local da consulta: ${morada}`}
    />
  );
}
