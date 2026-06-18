"use client";

// Mapa de preços médios de contabilistas por região (NUTS II).
// O mapa Leaflet é uma camada visual; a LISTA de regiões (botões reais) é a
// interação acessível e autoritativa — funciona com teclado e sem JS de mapa.
// Leaflet é carregado dinamicamente (só no browser), à semelhança do pdf.js.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  REGIOES_PRECO,
  BANDA_NACIONAL,
  precoMedio,
  nivelPreco,
  PRECOS_REGIOES_VERIFICADO,
  type RegiaoPreco,
} from "@/lib/contabilista-regioes";
import { MapPin, Search, Info } from "@/components/ui/Icons";
import InfoTip from "@/components/ui/InfoTip";

const eur0 = (n: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

// Escala de cor verde: mais barato (claro) → mais caro (verde profundo).
const COR_BARATO: [number, number, number] = [0x34, 0xb9, 0x8c];
const COR_CARO: [number, number, number] = [0x0b, 0x4d, 0x3b];
function corPorNivel(t: number): string {
  const c = COR_BARATO.map((a, i) => Math.round(a + (COR_CARO[i] - a) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const TILES_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILES_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILES_ATTR =
  '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function isDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

export default function MapaPrecosRegioes() {
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const tileRef = useRef<{ layer: import("leaflet").TileLayer; L: typeof import("leaflet") } | null>(null);

  const regioesOrdenadas = useMemo(
    () => [...REGIOES_PRECO].sort((a, b) => precoMedio(b) - precoMedio(a)),
    []
  );
  const regioesFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return regioesOrdenadas;
    return regioesOrdenadas.filter(
      (r) => r.nome.toLowerCase().includes(q) || r.referencia.toLowerCase().includes(q)
    );
  }, [filtro, regioesOrdenadas]);

  const regiaoSel = useMemo(
    () => REGIOES_PRECO.find((r) => r.id === selecionada) ?? null,
    [selecionada]
  );

  // ── Inicializa o mapa Leaflet (só no browser) ──────────────────────────────
  useEffect(() => {
    let cancelado = false;
    let observer: MutationObserver | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [39.6, -8.0],
        zoom: 6,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      mapRef.current = map;

      const tile = L.tileLayer(isDark() ? TILES_DARK : TILES_LIGHT, {
        attribution: TILES_ATTR,
        maxZoom: 18,
      }).addTo(map);
      tileRef.current = { layer: tile, L };

      const reduzir =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      REGIOES_PRECO.forEach((r) => {
        const cor = corPorNivel(nivelPreco(r));
        const html = `
          <div style="
            display:flex;align-items:center;gap:5px;white-space:nowrap;
            padding:5px 10px;border-radius:9999px;
            background:${cor};color:#fff;
            font:700 12px/1 'DM Sans',system-ui,sans-serif;
            border:2px solid rgba(255,255,255,.85);
            box-shadow:0 4px 14px rgba(10,74,57,.35);cursor:pointer">
            ${eur0(r.min)}–${eur0(r.max)}
          </div>`;
        const icon = L.divIcon({
          className: "",
          html,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        const m = L.marker([r.lat, r.lng], {
          icon,
          title: `${r.nome}: ${eur0(r.min)}–${eur0(r.max)}/mês`,
          riseOnHover: true,
        })
          .addTo(map)
          .on("click", () => setSelecionada(r.id));
        markersRef.current[r.id] = m;
      });

      // Reage à mudança de tema (classe .dark no <html>) trocando os tiles.
      observer = new MutationObserver(() => {
        const t = tileRef.current;
        if (!t) return;
        t.layer.setUrl(isDark() ? TILES_DARK : TILES_LIGHT);
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      // Guarda a preferência de motion para o flyTo posterior.
      (map as unknown as { _reduzir?: boolean })._reduzir = reduzir;
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
      markersRef.current = {};
      tileRef.current = null;
    };
  }, []);

  // ── Voa para a região selecionada e abre o respetivo marcador ──────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !regiaoSel) return;
    const reduzir = (map as unknown as { _reduzir?: boolean })._reduzir;
    const zoom = regiaoSel.id === "madeira" || regiaoSel.id === "acores" ? 9 : 8;
    try {
      if (reduzir) map.setView([regiaoSel.lat, regiaoSel.lng], zoom);
      else map.flyTo([regiaoSel.lat, regiaoSel.lng], zoom, { duration: 0.8 });
    } catch {
      /* noop */
    }
  }, [regiaoSel]);

  return (
    <div className="space-y-5">
      {/* Pesquisa de região */}
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
        />
        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Procurar região ou cidade…"
          aria-label="Procurar região ou cidade"
          className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm text-stone-800 placeholder-stone-400 transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        />
      </div>

      {/* Mapa */}
      <div
        className="overflow-hidden rounded-3xl border border-stone-100 shadow-card dark:border-stone-800"
        role="application"
        aria-label="Mapa de Portugal com a média de preços de contabilistas por região"
      >
        <div ref={containerRef} className="h-[360px] w-full bg-stone-100 dark:bg-stone-900" />
        {/* Legenda da escala de cor */}
        <div className="flex items-center gap-3 border-t border-stone-100 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
          <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
            Avença mensal
          </span>
          <div className="flex flex-1 items-center gap-2">
            <span className="text-[10px] text-stone-400">menor</span>
            <span
              className="h-2 flex-1 rounded-full"
              style={{ background: `linear-gradient(90deg, ${corPorNivel(0)}, ${corPorNivel(1)})` }}
              aria-hidden
            />
            <span className="text-[10px] text-stone-400">maior</span>
          </div>
          <span className="text-[11px] font-semibold text-stone-600 tabular-nums dark:text-stone-300">
            {eur0(BANDA_NACIONAL.min)}–{eur0(BANDA_NACIONAL.max)}/mês
          </span>
        </div>
      </div>

      {/* Região selecionada */}
      {regiaoSel && (
        <div className="rounded-3xl border border-brand/20 bg-brand-light/50 p-5 dark:border-brand/20">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
              <MapPin size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
                {regiaoSel.nome}
              </h3>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{regiaoSel.referencia}</p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-brand-dark dark:text-brand">
                {eur0(regiaoSel.min)} – {eur0(regiaoSel.max)}
                <span className="ml-1 text-sm font-medium text-stone-400">/mês</span>
              </p>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Avença mensal estimada para um trabalhador independente típico. Sociedades e
                contabilidade organizada custam mais.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de regiões (acessível) */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Regiões {filtro && `(${regioesFiltradas.length})`}
        </p>
        {regioesFiltradas.length === 0 ? (
          <p className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-6 text-center text-sm text-stone-400 dark:border-stone-800 dark:bg-stone-900/50">
            Sem regiões para «{filtro}».
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {regioesFiltradas.map((r) => {
              const ativa = r.id === selecionada;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    aria-pressed={ativa}
                    onClick={() => setSelecionada(r.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                      ativa
                        ? "border-brand bg-brand-light shadow-lift dark:bg-brand/10"
                        : "border-stone-200 bg-white hover:border-brand/40 dark:border-stone-700 dark:bg-stone-900"
                    }`}
                  >
                    <span
                      className="h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ background: corPorNivel(nivelPreco(r)) }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-semibold ${
                          ativa ? "text-brand-dark dark:text-brand" : "text-stone-800 dark:text-stone-100"
                        }`}
                      >
                        {r.nome}
                      </span>
                      <span className="block truncate text-[11px] text-stone-400">{r.referencia}</span>
                    </span>
                    <span className="flex-shrink-0 text-xs font-bold tabular-nums text-stone-600 dark:text-stone-300">
                      {eur0(r.min)}–{eur0(r.max)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Nota / metodologia */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/50">
        <Info size={14} className="mt-0.5 flex-shrink-0 text-stone-400" />
        <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          <strong className="text-stone-600 dark:text-stone-300">Estimativas de mercado</strong>, não
          tabela oficial — a profissão de Contabilista Certificado tem honorários livres. Os valores são
          avenças mensais típicas para independentes (clientes nacionais, poucos documentos) e variam por
          gabinete, volume de documentos e complexidade.{" "}
          <InfoTip label="Como usamos isto">
            Centros urbanos e áreas metropolitanas tendem a praticar honorários mais altos. Para o teu
            caso concreto (sociedade, IVA, clientes internacionais), usa o passo «O que fazer a seguir» do
            simulador guiado.
          </InfoTip>{" "}
          Última revisão: {PRECOS_REGIOES_VERIFICADO}.
        </p>
      </div>
    </div>
  );
}
