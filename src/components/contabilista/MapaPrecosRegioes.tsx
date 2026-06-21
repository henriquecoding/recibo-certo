"use client";

// Mapa de preços médios de contabilistas por região (NUTS II).
//
// Baseado na lógica de mapas refinada do projeto de referência (Leaflet nativo,
// sem react-leaflet), adaptada à identidade do ReciboCerto (verde/stone, claro+escuro):
//  · Leaflet carregado dinamicamente (só no browser, como o pdf.js).
//  · Scroll-zoom DESATIVADO por defeito (não rouba o scroll da página) — botão de
//    cadeado ativa/desativa. No telemóvel, o arrasto também começa desativado, com
//    botão próprio (não prende o scroll ao tocar).
//  · Botão de GPS: vai para a tua posição e seleciona a região mais próxima.
//  · Barra de pesquisa REAL (geocodificação Nominatim/OSM): cidade, freguesia ou
//    código postal → o mapa voa para lá e seleciona a região + preço.
//  · Notificações slide-up (toast) a confirmar cada ação.
//  · Lista de regiões (botões) como camada acessível e autoritativa.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as LeafletMap, Marker, TileLayer, GeoJSON as LeafletGeoJSON, PathOptions } from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import "leaflet/dist/leaflet.css";
import {
  REGIOES_PRECO,
  BANDA_NACIONAL,
  precoMedio,
  nivelPreco,
  regiaoMaisProxima,
  PRECOS_REGIOES_VERIFICADO,
} from "@/lib/contabilista-regioes";
import { MapPin, Search, Info, Plus, Minus, Crosshair, Lock, Move, Close, Spinner } from "@/components/ui/Icons";
import InfoTip from "@/components/ui/InfoTip";

const eur0 = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

// Escala de cor verde: mais barato (claro) → mais caro (verde profundo).
const COR_BARATO: [number, number, number] = [0x34, 0xb9, 0x8c];
const COR_CARO: [number, number, number] = [0x0b, 0x4d, 0x3b];
function corPorNivel(t: number): string {
  const c = COR_BARATO.map((a, i) => Math.round(a + (COR_CARO[i] - a) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// Fronteiras NUTS II oficiais (Eurostat Nuts2json, WGS84, baixa resolução).
// Reais, não inventadas — desenhadas em pastel suave por cima dos tiles.
const GEO_URL = "https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v2/2021/4326/20M/nutsrg_2.json";
const NUTS2_REGIAO: Record<string, string> = {
  PT11: "norte",
  PT16: "centro",
  PT17: "aml",
  PT18: "alentejo",
  PT15: "algarve",
  PT20: "acores",
  PT30: "madeira",
};
let geoCache: FeatureCollection | null = null;

function codigoNuts(f?: Feature): string {
  if (!f) return "";
  const props = (f.properties ?? {}) as Record<string, unknown>;
  return String(f.id ?? props.id ?? props.NUTS_ID ?? "");
}
function regiaoDeFeature(f?: Feature): string | undefined {
  return NUTS2_REGIAO[codigoNuts(f)];
}
/** Estilo pastel da região (cor da paleta a baixa opacidade; realça a selecionada). */
function estiloRegiao(regiaoId: string | undefined, selId: string | null): PathOptions {
  const reg = REGIOES_PRECO.find((x) => x.id === regiaoId);
  const cor = reg ? corPorNivel(nivelPreco(reg)) : "#1D9E75";
  const sel = !!regiaoId && regiaoId === selId;
  return {
    color: cor,
    weight: sel ? 2 : 1,
    opacity: sel ? 0.85 : 0.4,
    fillColor: cor,
    fillOpacity: sel ? 0.22 : 0.1,
    dashArray: sel ? undefined : "3 4",
  };
}

const TILES_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILES_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILES_ATTR =
  '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function isDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

interface ResultadoGeo {
  lat: number;
  lng: number;
  nome: string;
  detalhe: string;
}

type NotifTipo = "ok" | "off" | "erro";
interface Notif {
  titulo: string;
  msg: string;
  tipo: NotifTipo;
}

const NOTIF_ESTILO: Record<NotifTipo, string> = {
  ok: "border-brand/30 bg-brand text-white",
  off: "border-stone-700 bg-stone-800 text-stone-100",
  erro: "border-clay-border bg-clay text-white",
};

export default function MapaPrecosRegioes() {
  const [selecionada, setSelecionada] = useState<string | null>(null);

  // Pesquisa (geocodificação)
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoGeo[]>([]);
  const [aPesquisar, setAPesquisar] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [erroGeo, setErroGeo] = useState<string | null>(null);

  // Controlos do mapa
  const [scrollAtivo, setScrollAtivo] = useState(false);
  const [dragAtivo, setDragAtivo] = useState(false);
  const [aLocalizar, setALocalizar] = useState(false);
  const [notif, setNotif] = useState<Notif | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const userMarkerRef = useRef<Marker | null>(null);
  const tileRef = useRef<TileLayer | null>(null);
  const geoLayerRef = useRef<LeafletGeoJSON | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduzirRef = useRef(false);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const regioesOrdenadas = useMemo(
    () => [...REGIOES_PRECO].sort((a, b) => precoMedio(b) - precoMedio(a)),
    []
  );
  const regiaoSel = useMemo(() => REGIOES_PRECO.find((r) => r.id === selecionada) ?? null, [selecionada]);

  const mostrarNotif = useCallback((titulo: string, msg: string, tipo: NotifTipo) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotif({ titulo, msg, tipo });
    notifTimerRef.current = setTimeout(() => setNotif(null), 3800);
  }, []);

  const voarPara = useCallback((lat: number, lng: number, zoom: number) => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (reduzirRef.current) map.setView([lat, lng], zoom);
      else map.flyTo([lat, lng], zoom, { duration: 0.8 });
    } catch {
      /* noop */
    }
  }, []);

  const marcarUtilizador = useCallback((lat: number, lng: number) => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
      return;
    }
    const W = 90;
    const H = 36;
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))">
        <span style="background:#0F6E56;color:#fff;font:700 9.5px/1 ui-sans-serif,system-ui,sans-serif;padding:3px 8px;border-radius:9999px;white-space:nowrap;border:1.5px solid #fff">A tua zona</span>
        <span style="width:2px;height:7px;background:#0F6E56"></span>
      </div>`,
      iconSize: [W, H],
      iconAnchor: [W / 2, H],
    });
    userMarkerRef.current = L.marker([lat, lng], { icon, interactive: false, keyboard: false }).addTo(map);
  }, []);

  const selecionarPorCoords = useCallback(
    (lat: number, lng: number) => {
      marcarUtilizador(lat, lng);
      const r = regiaoMaisProxima(lat, lng);
      setSelecionada(r.id);
      voarPara(lat, lng, 9);
      return r;
    },
    [marcarUtilizador, voarPara]
  );

  // ── Geocodificação (Nominatim / OSM), restrita a Portugal ──────────────────
  const geocodificar = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setResultados([]);
      setAberto(false);
      return;
    }
    setAPesquisar(true);
    setErroGeo(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&limit=5&accept-language=pt-PT&countrycodes=pt`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("geo");
      const data: Array<{ lat: string; lon: string; display_name: string }> = await res.json();
      const mapped: ResultadoGeo[] = data.map((d) => {
        const partes = d.display_name.split(",").map((s) => s.trim());
        return {
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
          nome: partes[0],
          detalhe: partes.slice(1, 3).join(", "),
        };
      });
      setResultados(mapped);
      setAberto(true);
      if (mapped.length === 0) setErroGeo(`Sem resultados para «${q}».`);
    } catch {
      setResultados([]);
      setErroGeo("Não foi possível pesquisar agora. Tenta de novo.");
      setAberto(true);
    } finally {
      setAPesquisar(false);
    }
  }, []);

  const onQueryChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => geocodificar(v), 450);
  };

  const escolherResultado = (r: ResultadoGeo) => {
    setQuery(r.nome);
    setAberto(false);
    setResultados([]);
    const regiao = selecionarPorCoords(r.lat, r.lng);
    mostrarNotif(`${r.nome}`, `Região ${regiao.nome} · ${eur0(regiao.min)}–${eur0(regiao.max)}/mês`, "ok");
  };

  // ── Controlos (lógica refinada do mapa de referência) ──────────────────────
  const alternarScroll = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (scrollAtivo) {
      try {
        map.scrollWheelZoom.disable();
      } catch {
        /* noop */
      }
      setScrollAtivo(false);
      mostrarNotif("Scroll bloqueado", "A roda do rato volta a percorrer a página.", "off");
    } else {
      try {
        map.scrollWheelZoom.enable();
      } catch {
        /* noop */
      }
      setScrollAtivo(true);
      mostrarNotif("Scroll ativado", "Usa a roda do rato para aproximar e afastar o mapa.", "ok");
    }
  }, [scrollAtivo, mostrarNotif]);

  const alternarDrag = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (dragAtivo) {
      try {
        map.dragging.disable();
        map.touchZoom.disable();
      } catch {
        /* noop */
      }
      setDragAtivo(false);
      mostrarNotif("Arrasto bloqueado", "Podes voltar a deslizar a página normalmente.", "off");
    } else {
      try {
        map.dragging.enable();
        map.touchZoom.enable();
      } catch {
        /* noop */
      }
      setDragAtivo(true);
      mostrarNotif("Arrasto ativado", "Arrasta para explorar o mapa. Toca de novo para bloquear.", "ok");
    }
  }, [dragAtivo, mostrarNotif]);

  const localizar = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      mostrarNotif("Localização indisponível", "O teu dispositivo não permite localização.", "erro");
      return;
    }
    setALocalizar(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setALocalizar(false);
        const regiao = selecionarPorCoords(pos.coords.latitude, pos.coords.longitude);
        mostrarNotif("Localização ativada", `Estás na região ${regiao.nome} · ${eur0(regiao.min)}–${eur0(regiao.max)}/mês`, "ok");
      },
      () => {
        setALocalizar(false);
        mostrarNotif("Não foi possível localizar", "Verifica as permissões de localização do browser.", "erro");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [selecionarPorCoords, mostrarNotif]);

  // ── Inicializa o mapa (só no browser) ──────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    let observer: MutationObserver | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !containerRef.current || mapRef.current) return;
      LRef.current = L;

      reduzirRef.current =
        typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      const mobile = window.innerWidth < 768;
      const map = L.map(containerRef.current, {
        center: [39.6, -8.0],
        zoom: 6,
        zoomControl: false,
        scrollWheelZoom: false, // nunca rouba o scroll da página por defeito
        dragging: !mobile, // no telemóvel só após o utilizador ativar
        touchZoom: !mobile,
        attributionControl: true,
        preferCanvas: true,
      });
      mapRef.current = map;
      setDragAtivo(!mobile);

      const tile = L.tileLayer(isDark() ? TILES_DARK : TILES_LIGHT, { attribution: TILES_ATTR, maxZoom: 18 }).addTo(map);
      tileRef.current = tile;

      const PW = 118;
      const PH = 30;
      REGIOES_PRECO.forEach((r) => {
        const cor = corPorNivel(nivelPreco(r));
        // Caixa transparente (PW×PH) centrada na coordenada; pill visível centrado dentro.
        const html = `<div style="width:${PW}px;height:${PH}px;display:flex;align-items:center;justify-content:center;pointer-events:none">
          <span style="pointer-events:auto;display:inline-flex;align-items:center;height:26px;padding:0 11px;border-radius:9999px;background:${cor};color:#fff;font:700 12.5px/1 ui-sans-serif,system-ui,sans-serif;border:2px solid #fff;box-shadow:0 3px 10px rgba(10,74,57,.35);white-space:nowrap;cursor:pointer">${eur0(
          r.min
        )}–${eur0(r.max)}</span></div>`;
        const icon = L.divIcon({ className: "", html, iconSize: [PW, PH], iconAnchor: [PW / 2, PH / 2] });
        const m = L.marker([r.lat, r.lng], {
          icon,
          title: `${r.nome}: ${eur0(r.min)}–${eur0(r.max)}/mês`,
          riseOnHover: true,
          zIndexOffset: 1000,
        })
          .addTo(map)
          .on("click", () => {
            setSelecionada(r.id);
            voarPara(r.lat, r.lng, r.id === "madeira" || r.id === "acores" ? 9 : 8);
          });
        markersRef.current[r.id] = m;
      });

      // ── Fronteiras das regiões (NUTS II oficiais) em pastel suave. ──
      try {
        const data = geoCache ?? (await fetch(GEO_URL).then((res) => (res.ok ? res.json() : Promise.reject())));
        geoCache = data as FeatureCollection;
        if (!cancelado && mapRef.current) {
          const feats = (geoCache.features ?? []).filter((f) => regiaoDeFeature(f));
          const layer = L.geoJSON(
            { type: "FeatureCollection", features: feats } as FeatureCollection,
            {
              style: (f) => estiloRegiao(regiaoDeFeature(f), null),
              onEachFeature: (f, lyr) => {
                const rid = regiaoDeFeature(f);
                const reg = REGIOES_PRECO.find((x) => x.id === rid);
                if (reg) {
                  lyr.bindTooltip(`${reg.nome} · ${eur0(reg.min)}–${eur0(reg.max)}/mês`, { sticky: true });
                  lyr.on("click", () => {
                    setSelecionada(reg.id);
                    voarPara(reg.lat, reg.lng, reg.id === "madeira" || reg.id === "acores" ? 9 : 8);
                  });
                }
              },
            }
          ).addTo(map);
          layer.bringToBack();
          geoLayerRef.current = layer;
        }
      } catch {
        /* sem ligação às fronteiras — o mapa funciona à mesma (fallback gracioso) */
      }

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
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = {};
      userMarkerRef.current = null;
      tileRef.current = null;
      geoLayerRef.current = null;
      LRef.current = null;
    };
  }, [voarPara]);

  // Realça a região selecionada nas fronteiras (restyle pastel → sólido).
  useEffect(() => {
    geoLayerRef.current?.setStyle((f) => estiloRegiao(regiaoDeFeature(f), selecionada));
  }, [selecionada]);

  const escolherRegiao = (id: string) => {
    setSelecionada(id);
    const r = REGIOES_PRECO.find((x) => x.id === id);
    if (r) voarPara(r.lat, r.lng, r.id === "madeira" || r.id === "acores" ? 9 : 8);
  };

  const ctrlBtn =
    "relative flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-stone-600 shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:shadow-float hover:text-brand active:scale-95 active:translate-y-0 dark:bg-stone-900 dark:text-stone-300 motion-reduce:transform-none motion-reduce:transition-none";
  const ctrlOff = "border-stone-200 dark:border-stone-700";
  const ctrlOn = "border-brand bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand";

  return (
    <div className="space-y-5">
      {/* ── Mapa + pesquisa sobreposta ── */}
      <div
        className="overflow-hidden rounded-3xl border border-stone-100 shadow-card dark:border-stone-800"
        role="application"
        aria-label="Mapa de Portugal com a média de preços de contabilistas por região"
      >
        <div className="relative">
          <div ref={containerRef} className="h-[420px] w-full bg-stone-100 dark:bg-stone-900" />

          {/* Barra de pesquisa */}
          <div
            className="absolute left-3 right-3 top-3 z-[1000]"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 px-3 py-2 shadow-float backdrop-blur dark:border-stone-700 dark:bg-stone-900/95">
              <Search size={16} className="flex-shrink-0 text-stone-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onFocus={() => resultados.length > 0 && setAberto(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    geocodificar(query);
                  }
                  if (e.key === "Escape") setAberto(false);
                }}
                placeholder="Procura a tua zona (cidade, freguesia, código postal)…"
                aria-label="Procura a tua zona"
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 placeholder-stone-400 focus:outline-none dark:text-stone-100"
              />
              {aPesquisar && <Spinner size={16} className="flex-shrink-0 animate-spin text-brand" />}
              {query && !aPesquisar && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResultados([]);
                    setAberto(false);
                    setErroGeo(null);
                  }}
                  aria-label="Limpar pesquisa"
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                >
                  <Close size={13} />
                </button>
              )}
            </div>

            {aberto && (resultados.length > 0 || erroGeo) && (
              <div className="mt-1.5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-float dark:border-stone-700 dark:bg-stone-900">
                {resultados.map((r, i) => (
                  <button
                    key={`${r.lat},${r.lng},${i}`}
                    type="button"
                    onClick={() => escolherResultado(r)}
                    className="flex w-full items-start gap-2.5 border-b border-stone-50 px-3.5 py-2.5 text-left transition-colors last:border-0 hover:bg-brand-light/50 dark:border-stone-800 dark:hover:bg-brand/10"
                  >
                    <MapPin size={14} className="mt-0.5 flex-shrink-0 text-brand" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{r.nome}</span>
                      {r.detalhe && <span className="block truncate text-[11px] text-stone-400">{r.detalhe}</span>}
                    </span>
                  </button>
                ))}
                {erroGeo && resultados.length === 0 && (
                  <p className="px-3.5 py-3 text-xs text-stone-500 dark:text-stone-400">{erroGeo}</p>
                )}
              </div>
            )}
          </div>

          {/* Controlos: GPS · scroll · arrasto (mobile) · zoom */}
          <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={localizar}
              aria-label="Usar a minha localização"
              title="Ir para a minha localização"
              className={`${ctrlBtn} ${ctrlOff}`}
            >
              {aLocalizar ? <Spinner size={16} className="animate-spin text-brand" /> : <Crosshair size={16} />}
            </button>
            <button
              type="button"
              onClick={alternarScroll}
              aria-pressed={scrollAtivo}
              aria-label={scrollAtivo ? "Bloquear zoom com a roda do rato" : "Ativar zoom com a roda do rato"}
              title={scrollAtivo ? "Scroll do mapa ativo (clica para bloquear)" : "Ativar scroll do mapa"}
              className={`${ctrlBtn} ${scrollAtivo ? ctrlOn : ctrlOff}`}
            >
              <Lock size={15} />
            </button>
            {isMobile && (
              <button
                type="button"
                onClick={alternarDrag}
                aria-pressed={dragAtivo}
                aria-label={dragAtivo ? "Bloquear arrasto do mapa" : "Ativar arrasto do mapa"}
                title={dragAtivo ? "Arrasto ativo (clica para bloquear)" : "Ativar arrasto do mapa"}
                className={`${ctrlBtn} ${dragAtivo ? ctrlOn : ctrlOff}`}
              >
                <Move size={16} />
              </button>
            )}
            <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="Aproximar" className={`${ctrlBtn} ${ctrlOff}`}>
              <Plus size={16} />
            </button>
            <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="Afastar" className={`${ctrlBtn} ${ctrlOff}`}>
              <Minus size={16} />
            </button>
          </div>
        </div>

        {/* Legenda da escala de cor */}
        <div className="flex items-center gap-3 border-t border-stone-100 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
          <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">Avença mensal</span>
          <div className="flex flex-1 items-center gap-2">
            <span className="text-[10px] text-stone-400">menor</span>
            <span
              className="h-2 flex-1 rounded-full"
              style={{ background: `linear-gradient(90deg, ${corPorNivel(0)}, ${corPorNivel(1)})` }}
              aria-hidden
            />
            <span className="text-[10px] text-stone-400">maior</span>
          </div>
          <span className="text-[11px] font-semibold tabular-nums text-stone-600 dark:text-stone-300">
            {eur0(BANDA_NACIONAL.min)}–{eur0(BANDA_NACIONAL.max)}/mês
          </span>
        </div>
      </div>

      {/* ── Região selecionada ── */}
      {regiaoSel && (
        <div className="rounded-3xl border border-brand/20 bg-brand-light/50 p-5 dark:border-brand/20">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
              <MapPin size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">{regiaoSel.nome}</h3>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{regiaoSel.referencia}</p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-brand-dark dark:text-brand">
                {eur0(regiaoSel.min)} – {eur0(regiaoSel.max)}
                <span className="ml-1 text-sm font-medium text-stone-400">/mês</span>
              </p>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Avença mensal estimada para um trabalhador independente típico. Sociedades e contabilidade organizada
                custam mais.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de regiões (acessível) ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Todas as regiões
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {regioesOrdenadas.map((r) => {
            const ativa = r.id === selecionada;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => escolherRegiao(r.id)}
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
      </div>

      {/* ── Nota / metodologia ── */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/50">
        <Info size={14} className="mt-0.5 flex-shrink-0 text-stone-400" />
        <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          <strong className="text-stone-600 dark:text-stone-300">Estimativas de mercado</strong>, não tabela oficial — a
          profissão de Contabilista Certificado tem honorários livres. Os valores são avenças mensais típicas para
          independentes (clientes nacionais, poucos documentos) e variam por gabinete, volume de documentos e
          complexidade.{" "}
          <InfoTip label="Como usamos isto">
            Centros urbanos e áreas metropolitanas tendem a praticar honorários mais altos. Para o teu caso concreto
            (sociedade, IVA, clientes internacionais), usa o passo «O que fazer a seguir» do simulador guiado.
          </InfoTip>{" "}
          Última revisão: {PRECOS_REGIOES_VERIFICADO}.
        </p>
      </div>

      {/* ── Notificação slide-up (toast) ── */}
      {typeof document !== "undefined" &&
        notif &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100000] flex justify-center px-4">
            <div
              className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-float ${NOTIF_ESTILO[notif.tipo]}`}
              role="status"
              style={{ animation: "rc-toast-up .42s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              <span className="mt-0.5 flex-shrink-0">
                {notif.tipo === "ok" ? <Crosshair size={16} /> : notif.tipo === "erro" ? <Info size={16} /> : <Lock size={16} />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">{notif.titulo}</p>
                <p className="mt-0.5 text-xs leading-snug opacity-90">{notif.msg}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
                  setNotif(null);
                }}
                aria-label="Fechar"
                className="-mr-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full opacity-80 hover:opacity-100"
              >
                <Close size={12} />
              </button>
            </div>
            <style>{`@keyframes rc-toast-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}@media (prefers-reduced-motion: reduce){@keyframes rc-toast-up{from{opacity:0}to{opacity:1}}}`}</style>
          </div>,
          document.body
        )}
    </div>
  );
}
