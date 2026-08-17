"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ESCOLHER ONDE É — um ponto, não uma frase
//  ---------------------------------------------------------------------
//  Escrever «Rua de exemplo, 1 · Matosinhos» num campo de texto é uma
//  declaração de intenções. Pôr um pino em cima da porta é um facto: o
//  cliente abre a aplicação de mapas e chega lá, sem interpretar nada.
//
//  Reaproveita a mecânica já provada em `MapaRegioes`: Leaflet carregado só
//  no browser, tiles CARTO que seguem o tema, pesquisa real no Nominatim
//  restrita a Portugal, GPS, e arrasto desligado no telemóvel até a pessoa
//  o ativar (senão o mapa rouba o scroll da folha).
//
//  Três maneiras de acertar no sítio, porque as pessoas chegam de maneiras
//  diferentes: escrever a morada, usar a localização atual, ou arrastar o
//  pino. As três acabam no mesmo sítio — um ponto e uma morada que
//  concordam um com o outro.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Check, Close, Crosshair, MapPin, Minus, Move, Plus, Search, Spinner,
} from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import {
  dentroDePortugal, formatarCoordenadas, moradaCurta, pontoValido,
  type PontoNoMapa,
} from "@/lib/contabilistas/local-consulta";

const TILES_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILES_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILES_ATTR =
  '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Centro de Portugal continental, para quem abre o seletor em branco. */
const CENTRO_PT: PontoNoMapa = { lat: 39.6, lng: -8.0 };

function isDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

interface Sugestao {
  lat: number;
  lng: number;
  nome: string;
  detalhe: string;
  completo: string;
}

export interface LocalEscolhidoNoMapa {
  morada: string;
  lat: number;
  lng: number;
}

export default function SeletorDeLocal({
  moradaInicial, pontoInicial, onEscolher, onCancelar,
}: {
  moradaInicial?: string;
  pontoInicial?: PontoNoMapa | null;
  onEscolher: (l: LocalEscolhidoNoMapa) => void;
  onCancelar: () => void;
}) {
  const [query, setQuery] = useState(moradaInicial ?? "");
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [aPesquisar, setAPesquisar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aLocalizar, setALocalizar] = useState(false);
  const [dragAtivo, setDragAtivo] = useState(false);

  /** O que vai ser devolvido: morada legível + ponto. */
  const [morada, setMorada] = useState(moradaInicial ?? "");
  const [ponto, setPonto] = useState<PontoNoMapa | null>(
    pontoInicial && pontoValido(pontoInicial.lat, pontoInicial.lng) ? pontoInicial : null
  );

  const caixaRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const pinoRef = useRef<Marker | null>(null);
  const tileRef = useRef<TileLayer | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduzirRef = useRef(false);

  const voarPara = useCallback((p: PontoNoMapa, zoom: number) => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (reduzirRef.current) map.setView([p.lat, p.lng], zoom);
      else map.flyTo([p.lat, p.lng], zoom, { duration: 0.7 });
    } catch {
      /* noop */
    }
  }, []);

  // ── Geocodificação inversa: do pino para a morada ────────────────────
  //
  // Arrastar o pino sem isto deixava a morada a dizer uma coisa e o ponto
  // a apontar para outra — que é precisamente o problema que este ecrã
  // veio resolver.
  const moradaDoPonto = useCallback(async (p: PontoNoMapa) => {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?lat=${p.lat}&lon=${p.lng}` +
        `&format=json&accept-language=pt-PT&zoom=18`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("geo");
      const d: { display_name?: string } = await res.json();
      if (d.display_name) setMorada(moradaCurta(d.display_name));
    } catch {
      // Sem rede não se inventa uma morada: fica a que lá estava, e o
      // ponto — que é o que abre no mapa do cliente — continua certo.
    }
  }, []);

  const colocarPino = useCallback(
    (p: PontoNoMapa, opcoes?: { comMorada?: boolean }) => {
      const L = LRef.current;
      const map = mapRef.current;
      setPonto(p);
      setAviso(dentroDePortugal(p) ? null : "Este ponto fica fora de Portugal. Confirma que é mesmo aqui.");
      if (!L || !map) return;

      if (pinoRef.current) {
        pinoRef.current.setLatLng([p.lat, p.lng]);
      } else {
        const W = 34;
        const H = 44;
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:${W}px;height:${H}px;display:flex;align-items:flex-start;justify-content:center;filter:drop-shadow(0 4px 8px rgba(10,74,57,.45))">
            <svg width="${W}" height="${H}" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M17 43C17 43 31 27.5 31 17A14 14 0 1 0 3 17c0 10.5 14 26 14 26Z" fill="#0F6E56" stroke="#fff" stroke-width="2.5"/>
              <circle cx="17" cy="17" r="5" fill="#fff"/>
            </svg>
          </div>`,
          iconSize: [W, H],
          iconAnchor: [W / 2, H],
        });
        pinoRef.current = L.marker([p.lat, p.lng], {
          icon,
          draggable: true,
          keyboard: true,
          title: "Arrasta para acertar no sítio",
          alt: "Local da consulta",
        }).addTo(map);
        pinoRef.current.on("dragend", () => {
          const ll = pinoRef.current?.getLatLng();
          if (!ll) return;
          const novo = { lat: ll.lat, lng: ll.lng };
          setPonto(novo);
          setAviso(dentroDePortugal(novo) ? null : "Este ponto fica fora de Portugal. Confirma que é mesmo aqui.");
          void moradaDoPonto(novo);
        });
      }
      if (opcoes?.comMorada) void moradaDoPonto(p);
    },
    [moradaDoPonto]
  );

  // ── Pesquisa (Nominatim), restrita a Portugal ────────────────────────
  const pesquisar = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setSugestoes([]);
      return;
    }
    setAPesquisar(true);
    setAviso(null);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}` +
        `&format=json&limit=6&addressdetails=0&accept-language=pt-PT&countrycodes=pt`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("geo");
      const dados: Array<{ lat: string; lon: string; display_name: string }> = await res.json();
      const mapeadas: Sugestao[] = dados.map((d) => {
        const partes = d.display_name.split(",").map((s) => s.trim());
        return {
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
          nome: partes[0],
          detalhe: partes.slice(1, 4).join(", "),
          completo: moradaCurta(d.display_name),
        };
      });
      setSugestoes(mapeadas);
      if (mapeadas.length === 0) {
        setAviso(`Sem resultados para «${q.trim()}». Podes escrever a morada e pôr o pino à mão.`);
      }
    } catch {
      setSugestoes([]);
      setAviso("Não foi possível pesquisar agora. Podes pôr o pino à mão no mapa.");
    } finally {
      setAPesquisar(false);
    }
  }, []);

  function aoEscrever(v: string) {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void pesquisar(v), 450);
  }

  function escolherSugestao(s: Sugestao) {
    setQuery(s.completo);
    setMorada(s.completo);
    setSugestoes([]);
    colocarPino({ lat: s.lat, lng: s.lng });
    voarPara({ lat: s.lat, lng: s.lng }, 17);
  }

  function usarLocalizacao() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setAviso("O teu navegador não dá a localização.");
      return;
    }
    setALocalizar(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setALocalizar(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        colocarPino(p, { comMorada: true });
        voarPara(p, 17);
      },
      () => {
        setALocalizar(false);
        setAviso("Não foi possível obter a tua localização. Pesquisa a morada ou põe o pino à mão.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // ── Mapa ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    let observer: MutationObserver | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !caixaRef.current || mapRef.current) return;
      LRef.current = L;

      reduzirRef.current =
        typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      const inicial = ponto ?? CENTRO_PT;
      const movel = window.innerWidth < 768;
      const map = L.map(caixaRef.current, {
        center: [inicial.lat, inicial.lng],
        zoom: ponto ? 17 : 6,
        zoomControl: false,
        scrollWheelZoom: false,
        // No telemóvel o mapa vive dentro de uma folha que faz scroll: com
        // arrasto ligado à entrada, o dedo move o mapa em vez da folha.
        dragging: !movel,
        touchZoom: !movel,
        attributionControl: true,
      });
      mapRef.current = map;
      setDragAtivo(!movel);

      tileRef.current = L.tileLayer(isDark() ? TILES_DARK : TILES_LIGHT, {
        attribution: TILES_ATTR,
        maxZoom: 19,
      }).addTo(map);

      if (ponto) colocarPino(ponto);

      // Clicar no mapa põe o pino ali. É o gesto que as pessoas tentam
      // primeiro, e não o fazer seria estranho.
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const p = { lat: e.latlng.lat, lng: e.latlng.lng };
        colocarPino(p, { comMorada: true });
      });

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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      pinoRef.current = null;
      tileRef.current = null;
      LRef.current = null;
    };
    // Só monta uma vez: o ponto inicial entra na criação e o resto é
    // imperativo. Reexecutar isto destruía o mapa a cada arrasto do pino.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alternarArrasto() {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (dragAtivo) {
        map.dragging.disable();
        map.touchZoom.disable();
      } else {
        map.dragging.enable();
        map.touchZoom.enable();
      }
    } catch {
      /* noop */
    }
    setDragAtivo((v) => !v);
  }

  const ctrl =
    "flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-stone-600 shadow-card transition-colors hover:text-brand";
  const ctrlOff = "border-stone-200";
  const ctrlOn = "border-brand bg-brand-light text-brand-dark";

  const prontoParaGuardar = Boolean(ponto && morada.trim());

  return (
    <div className="space-y-3">
      {/* ── Pesquisar ── */}
      <div className="relative">
        <label htmlFor="seletor-local-busca" className="sr-only">
          Pesquisar a morada
        </label>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
          {aPesquisar ? <Spinner size={16} aria-hidden /> : <Search size={16} aria-hidden />}
        </span>
        <input
          id="seletor-local-busca"
          value={query}
          onChange={(e) => aoEscrever(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (debounceRef.current) clearTimeout(debounceRef.current);
              void pesquisar(query);
            }
          }}
          type="search"
          autoComplete="off"
          placeholder="Rua, número e localidade"
          aria-describedby="seletor-local-ajuda"
          className="min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />

        {sugestoes.length > 0 && (
          <ul
            className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-[9200] max-h-56 overflow-y-auto rounded-2xl border border-stone-200 bg-white py-1 shadow-float"
            aria-label="Resultados da pesquisa"
          >
            {sugestoes.map((s, i) => (
              <li key={`${s.lat}-${s.lng}-${i}`}>
                <button
                  type="button"
                  onClick={() => escolherSugestao(s)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-cream"
                >
                  <MapPin size={14} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-stone-800">{s.nome}</span>
                    <span className="block truncate text-xs text-stone-500">{s.detalhe}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p id="seletor-local-ajuda" className="text-xs leading-relaxed text-stone-400">
        Pesquisa a morada, usa a tua localização, ou toca no mapa. Depois arrasta o pino
        para acertar na porta.
      </p>

      {/* ── Mapa ── */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200">
        <div ref={caixaRef} className="h-[240px] w-full sm:h-[280px]" aria-hidden />

        <div className="absolute right-2.5 top-2.5 z-[1000] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={usarLocalizacao}
            disabled={aLocalizar}
            aria-label="Usar a minha localização"
            title="Usar a minha localização"
            className={`${ctrl} ${ctrlOff}`}
          >
            {aLocalizar ? <Spinner size={15} aria-hidden /> : <Crosshair size={15} aria-hidden />}
          </button>
          <button
            type="button"
            onClick={alternarArrasto}
            aria-pressed={dragAtivo}
            aria-label={dragAtivo ? "Bloquear o arrasto do mapa" : "Permitir arrastar o mapa"}
            title={dragAtivo ? "Bloquear o arrasto do mapa" : "Permitir arrastar o mapa"}
            className={`${ctrl} ${dragAtivo ? ctrlOn : ctrlOff}`}
          >
            <Move size={15} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Aproximar"
            className={`${ctrl} ${ctrlOff}`}
          >
            <Plus size={15} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Afastar"
            className={`${ctrl} ${ctrlOff}`}
          >
            <Minus size={15} aria-hidden />
          </button>
        </div>
      </div>

      {aviso && (
        <p role="status" className="rounded-xl bg-alert-bg px-3 py-2 text-xs leading-relaxed text-alert-text">
          {aviso}
        </p>
      )}

      {/* ── A morada, editável: o geocodificador acerta na rua e falha no
             andar, e é o andar que faz alguém tocar à campainha certa. ── */}
      <label className="block">
        <span className="text-sm font-semibold text-stone-700">Como o cliente vê a morada</span>
        <input
          value={morada}
          onChange={(e) => setMorada(e.target.value.slice(0, 300))}
          placeholder="Rua, número, andar e sala"
          className="mt-1.5 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </label>

      {ponto && (
        <p className="flex items-center gap-1.5 text-xs tabular-nums text-stone-400">
          <MapPin size={12} aria-hidden />
          Ponto escolhido: {formatarCoordenadas(ponto)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <Button
          size="sm"
          disabled={!prontoParaGuardar}
          onClick={() => {
            if (!ponto || !morada.trim()) return;
            onEscolher({ morada: morada.trim(), lat: ponto.lat, lng: ponto.lng });
          }}
        >
          <Check size={15} aria-hidden /> Usar este local
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancelar}>
          <Close size={15} aria-hidden /> Fechar o mapa
        </Button>
        {!prontoParaGuardar && (
          <span className="text-xs text-stone-400">Falta pôr o pino e escrever a morada.</span>
        )}
      </div>
    </div>
  );
}
