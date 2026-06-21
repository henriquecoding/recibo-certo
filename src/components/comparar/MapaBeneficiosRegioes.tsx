"use client";

// Mapa de benefícios e incentivos fiscais por região (NUTS II) — "onde vale a
// pena instalar a atividade/empresa".
//
// Reutiliza a estrutura do mapa do modo guiado (MapaPrecosRegioes): Leaflet
// nativo carregado dinamicamente, fronteiras NUTS II oficiais, pesquisa real
// (Nominatim/OSM), GPS, controlos de scroll/arrasto e lista acessível de
// regiões. Aqui a escala de cor representa o NÍVEL DE INCENTIVO (verde profundo
// = mais benefícios) e o painel mostra os regimes fiscais verificados de cada
// região. Dados com base legal em `incentivos-regioes.ts`.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as LeafletMap, Marker, TileLayer, GeoJSON as LeafletGeoJSON, PathOptions } from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import "leaflet/dist/leaflet.css";
import {
  REGIOES_INCENTIVO,
  INCENTIVOS_NACIONAIS,
  INCENTIVOS_FONTES,
  INCENTIVOS_VERIFICADO,
  regiaoIncentivoMaisProxima,
} from "@/lib/incentivos-regioes";
import { REGIOES_PRECO, PRECOS_REGIOES_VERIFICADO } from "@/lib/contabilista-regioes";
import { MapPin, Search, Info, Plus, Minus, Crosshair, Lock, Move, Close, Spinner, Check, Receipt, Flag } from "@/components/ui/Icons";
import InfoTip from "@/components/ui/InfoTip";

const eur0 = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
/** Avença mensal estimada de contabilista por região (mesmo id que os incentivos). */
const precoPorId: Record<string, { min: number; max: number }> = Object.fromEntries(
  REGIOES_PRECO.map((r) => [r.id, { min: r.min, max: r.max }])
);

// Escala de cor verde: menos incentivos (claro) → mais incentivos (verde profundo).
const COR_MENOS: [number, number, number] = [0x9f, 0xe1, 0xcb];
const COR_MAIS: [number, number, number] = [0x0a, 0x4a, 0x39];
function corPorNivel(t: number): string {
  const c = COR_MENOS.map((a, i) => Math.round(a + (COR_MAIS[i] - a) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

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
function estiloRegiao(regiaoId: string | undefined, selId: string | null): PathOptions {
  const reg = REGIOES_INCENTIVO.find((x) => x.id === regiaoId);
  const cor = reg ? corPorNivel(reg.nivel) : "#1D9E75";
  const sel = !!regiaoId && regiaoId === selId;
  return {
    color: cor,
    weight: sel ? 2 : 1,
    opacity: sel ? 0.85 : 0.4,
    fillColor: cor,
    fillOpacity: sel ? 0.25 : 0.12,
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

export default function MapaBeneficiosRegioes() {
  const [selecionada, setSelecionada] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoGeo[]>([]);
  const [aPesquisar, setAPesquisar] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [erroGeo, setErroGeo] = useState<string | null>(null);

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

  const regioesOrdenadas = useMemo(() => [...REGIOES_INCENTIVO].sort((a, b) => b.nivel - a.nivel), []);
  const regiaoSel = useMemo(() => REGIOES_INCENTIVO.find((r) => r.id === selecionada) ?? null, [selecionada]);

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
      const r = regiaoIncentivoMaisProxima(lat, lng);
      setSelecionada(r.id);
      voarPara(lat, lng, 9);
      return r;
    },
    [marcarUtilizador, voarPara]
  );

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
    mostrarNotif(`${r.nome}`, `Região ${regiao.nome} · ${regiao.headline}`, "ok");
  };

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
        mostrarNotif("Localização ativada", `Estás na região ${regiao.nome} · ${regiao.headline}`, "ok");
      },
      () => {
        setALocalizar(false);
        mostrarNotif("Não foi possível localizar", "Verifica as permissões de localização do browser.", "erro");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [selecionarPorCoords, mostrarNotif]);

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
        scrollWheelZoom: false,
        dragging: !mobile,
        touchZoom: !mobile,
        attributionControl: true,
        preferCanvas: true,
      });
      mapRef.current = map;
      setDragAtivo(!mobile);

      const tile = L.tileLayer(isDark() ? TILES_DARK : TILES_LIGHT, { attribution: TILES_ATTR, maxZoom: 18 }).addTo(map);
      tileRef.current = tile;

      const PW = 124;
      const PH = 30;
      REGIOES_INCENTIVO.forEach((r) => {
        const cor = corPorNivel(r.nivel);
        const html = `<div style="width:${PW}px;height:${PH}px;display:flex;align-items:center;justify-content:center;pointer-events:none">
          <span style="pointer-events:auto;display:inline-flex;align-items:center;height:26px;padding:0 11px;border-radius:9999px;background:${cor};color:#fff;font:700 12px/1 ui-sans-serif,system-ui,sans-serif;border:2px solid #fff;box-shadow:0 3px 10px rgba(10,74,57,.35);white-space:nowrap;cursor:pointer">${r.selo}</span></div>`;
        const icon = L.divIcon({ className: "", html, iconSize: [PW, PH], iconAnchor: [PW / 2, PH / 2] });
        const m = L.marker([r.lat, r.lng], {
          icon,
          title: `${r.nome}: ${r.headline}`,
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
                const reg = REGIOES_INCENTIVO.find((x) => x.id === rid);
                if (reg) {
                  lyr.bindTooltip(`${reg.nome} · ${reg.selo}`, { sticky: true });
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
        /* sem ligação às fronteiras — o mapa funciona à mesma */
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

  useEffect(() => {
    geoLayerRef.current?.setStyle((f) => estiloRegiao(regiaoDeFeature(f), selecionada));
  }, [selecionada]);

  const escolherRegiao = (id: string) => {
    setSelecionada(id);
    const r = REGIOES_INCENTIVO.find((x) => x.id === id);
    if (r) voarPara(r.lat, r.lng, r.id === "madeira" || r.id === "acores" ? 9 : 8);
  };

  const ctrlBtn =
    "relative flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-stone-600 shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:shadow-float hover:text-brand active:scale-95 active:translate-y-0 dark:bg-stone-900 dark:text-stone-300 motion-reduce:transform-none motion-reduce:transition-none";
  const ctrlOff = "border-stone-200 dark:border-stone-700";
  const ctrlOn = "border-brand bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand";

  return (
    <div className="rounded-4xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-card sm:p-6 space-y-5">
      {/* ── Cabeçalho da secção ── */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand dark:bg-brand/15">
          <MapPin size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Onde instalar a atividade</p>
          <p className="text-[11px] text-stone-400">Benefícios fiscais por região + custo médio de contabilista</p>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800"
        role="application"
        aria-label="Mapa de Portugal com os benefícios fiscais por região"
      >
        <div className="relative">
          <div ref={containerRef} className="h-[400px] w-full bg-stone-100 dark:bg-stone-900" />

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

          <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" onClick={localizar} aria-label="Usar a minha localização" title="Ir para a minha localização" className={`${ctrlBtn} ${ctrlOff}`}>
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
          <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">Nível de incentivo</span>
          <div className="flex flex-1 items-center gap-2">
            <span className="text-[10px] text-stone-400">menos</span>
            <span className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${corPorNivel(0)}, ${corPorNivel(1)})` }} aria-hidden />
            <span className="text-[10px] text-stone-400">mais</span>
          </div>
        </div>
      </div>

      {/* ── Região selecionada — benefícios verificados ── */}
      {regiaoSel && (
        <div className="rounded-2xl border border-brand/20 bg-gradient-to-b from-brand-light/60 to-transparent dark:from-brand/8 dark:to-transparent p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <MapPin size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-stone-800 dark:text-stone-100 leading-snug">{regiaoSel.nome}</h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">{regiaoSel.referencia}</p>
              <p className="mt-1 text-sm font-semibold text-brand-dark dark:text-brand">{regiaoSel.headline}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {regiaoSel.beneficios.map((b) => (
              <div key={b.titulo} className="rounded-xl border border-stone-200/50 dark:border-stone-700/50 bg-white/80 dark:bg-stone-900/50 p-3.5">
                <div className="flex items-start gap-2">
                  <Check size={13} className="mt-0.5 flex-shrink-0 text-brand" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">{b.titulo}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">{b.detalhe}</p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-stone-400">{b.base}</p>
                  </div>
                </div>
              </div>
            ))}
            {precoPorId[regiaoSel.id] && (
              <div className="rounded-xl border border-stone-200/50 dark:border-stone-700/50 bg-white/80 dark:bg-stone-900/50 p-3.5">
                <div className="flex items-start gap-2">
                  <Receipt size={13} className="mt-0.5 flex-shrink-0 text-brand" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                      Contabilista: {eur0(precoPorId[regiaoSel.id].min)}–{eur0(precoPorId[regiaoSel.id].max)}/mês
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
                      Avença mensal estimada para independente típico. Sociedades e contabilidade organizada custam mais.
                    </p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-stone-400">
                      Estimativa de mercado · {PRECOS_REGIOES_VERIFICADO}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Lista de regiões (acessível) ── */}
      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand dark:bg-brand/15">
            <MapPin size={14} />
          </span>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Todas as regiões</p>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {regioesOrdenadas.map((r) => {
            const ativa = r.id === selecionada;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => escolherRegiao(r.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    ativa
                      ? "border-brand bg-brand-light shadow-sm ring-1 ring-brand/20 dark:bg-brand/10"
                      : "border-stone-200/70 bg-stone-50 hover:border-brand/40 hover:bg-white dark:border-stone-700 dark:bg-stone-900/50 dark:hover:bg-stone-800"
                  }`}
                >
                  <span className="h-3 w-3 flex-shrink-0 rounded-full shadow-sm" style={{ background: corPorNivel(r.nivel) }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${ativa ? "text-brand-dark dark:text-brand" : "text-stone-800 dark:text-stone-100"}`}>
                      {r.nome}
                    </span>
                    <span className="block truncate text-[11px] text-stone-400">
                      {r.headline}
                      {precoPorId[r.id] && ` · contab. ${eur0(precoPorId[r.id].min)}–${eur0(precoPorId[r.id].max)}/mês`}
                    </span>
                  </span>
                  <span className={`flex-shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                    ativa
                      ? "bg-brand/10 text-brand-dark dark:bg-brand/20 dark:text-brand"
                      : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                  }`}>
                    {r.selo}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Incentivos disponíveis em todo o país ── */}
      <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand dark:bg-brand/15">
            <Flag size={14} />
          </span>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Disponíveis em todo o país</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {INCENTIVOS_NACIONAIS.map((b) => (
            <div key={b.titulo} className="flex items-start gap-2.5 rounded-xl border border-stone-200/50 dark:border-stone-700/50 bg-white dark:bg-stone-800/60 p-3.5">
              <Check size={13} className="mt-0.5 flex-shrink-0 text-brand" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">{b.titulo}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{b.detalhe}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-stone-400">{b.base}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Nota / metodologia ── */}
      <p className="text-[11px] leading-relaxed text-stone-400">
        <strong className="text-stone-500 dark:text-stone-400">Benefícios reais com base legal</strong>, não estimativas.
        A taxa de IRC de 12,5% aplica-se a concelhos classificados como território do interior (não a
        uma região inteira){" "}
        <InfoTip label="Confirma o teu concelho">
          A lista de territórios do interior consta da Portaria n.º 208/2017. A derrama municipal (0–1,5%) também varia
          por município. Confirma sempre o teu concelho concreto.
        </InfoTip>
        . Madeira e Açores têm regimes próprios que abrangem toda a região. Não substitui o aconselhamento de um
        Contabilista Certificado. Verificação: {INCENTIVOS_VERIFICADO}.{" "}
        {INCENTIVOS_FONTES.map((f, i) => (
          <span key={f.url}>
            {i > 0 ? " · " : "Fontes: "}
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline decoration-stone-300 underline-offset-2 hover:text-brand">
              {f.label}
            </a>
          </span>
        ))}
        .
      </p>

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
