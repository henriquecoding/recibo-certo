"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ONDE VAIS OPERAR — o mapa, e não uma lista de 308 nomes
//  ---------------------------------------------------------------------
//  ┌────────────────────────────────────────────────────────────────────┐
//  │ PORQUE UM MAPA E NÃO DOIS SELECTS                                   │
//  │                                                                    │
//  │ Duas coisas desta secção só existem no espaço e não cabem numa      │
//  │ caixa de texto:                                                     │
//  │                                                                    │
//  │   · o RAIO — «25 km» é um número abstrato até se ver o círculo e   │
//  │     os concelhos que ele apanha;                                    │
//  │   · o TERRITÓRIO — «7 concelhos, 213 400 pessoas» é uma frase; a   │
//  │     mancha no mapa é a coisa.                                       │
//  │                                                                    │
//  │ Um `<select>` de 308 nomes obriga também a saber o nome do que se  │
//  │ procura. Aqui há três entradas para a mesma resposta: tocar no     │
//  │ mapa, procurar por morada ou código postal, e o GPS.                │
//  └────────────────────────────────────────────────────────────────────┘
//
//  ── A REGRA DE PRIVACIDADE NÃO MUDA ─────────────────────────────────
//  O concelho continua a NUNCA sair do dispositivo. O que sai é o que
//  já saía nos outros mapas do produto: as tiles do CARTO, as fronteiras
//  do Eurostat e — só quando a pessoa escreve na caixa ou carrega no GPS
//  — o pedido ao Nominatim, que é o serviço de pesquisa. O ponto do GPS
//  é convertido em concelho AQUI, no browser, contra as sedes
//  commitadas; nenhuma coordenada é guardada nem enviada para o servidor
//  do ReciboCerto.
//
//  ── MOBILE-FIRST, COMO O RESTO ──────────────────────────────────────
//  Arrasto e roda começam BLOQUEADOS no telemóvel — um mapa que captura
//  o scroll no meio de um formulário longo é uma armadilha. Os dois
//  destravam-se num toque, e o estado é visível no botão.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Circle,
  CircleMarker,
  GeoJSON as LeafletGeoJSON,
  Map as LeafletMap,
  Marker,
  TileLayer,
} from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import "leaflet/dist/leaflet.css";
import {
  Close,
  Crosshair,
  Lock,
  MapPin,
  Minus,
  Move,
  Plus,
  Search,
  Spinner,
} from "@/components/ui/Icons";
import { CONCELHO_POR_CODIGO, concelhosDaRegiao } from "@/lib/negocio/market/concelhos";
import {
  SEDES,
  concelhoMaisProximo,
  concelhosNoRaio,
  distanciaKm,
} from "@/lib/negocio/market/alcance";
import { MARKET_REGIONS, type MarketRegion } from "@/lib/negocio/market/geografia";

// ── Fronteiras NUTS II oficiais, a mesma fonte do mapa de preços ───────
const GEO_URL = "https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v2/2021/4326/20M/nutsrg_2.json";

/**
 * NUTS 2021 → as regiões deste motor.
 *
 * O ficheiro do Eurostat é de 2021 e traz sete regiões para Portugal; o
 * motor trabalha com nove, porque a NUTS 2024 partiu a antiga Lisboa em
 * Grande Lisboa, Península de Setúbal e Oeste e Vale do Tejo. A antiga
 * PT17 desenha, portanto, a área das três — e é por isso que tocar nela
 * não escolhe região nenhuma por si: escolhe o CONCELHO mais próximo, e
 * é o concelho que decide a região. A fronteira serve de referência
 * visual; a resposta vem sempre da sede mais perto.
 */
const NUTS_PARA_REGIAO: Readonly<Record<string, MarketRegion | null>> = Object.freeze({
  PT11: "norte",
  PT16: "centro",
  PT17: null,
  PT18: "alentejo",
  PT15: "algarve",
  PT20: "acores",
  PT30: "madeira",
});

let fronteirasEmCache: FeatureCollection | null = null;

const TILES_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILES_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILES_ATTR =
  '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const isDark = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark");

const VISTA_PAIS: [number, number] = [39.6, -8.2];

interface ResultadoGeo {
  lat: number;
  lng: number;
  nome: string;
  detalhe: string;
}

export interface MapaOndeOperarProps {
  regiao: MarketRegion;
  concelho?: string;
  raioKm?: number;
  /** Muda os dois ao mesmo tempo: o concelho decide a região. */
  onEscolher: (escolha: { regiao: MarketRegion; concelho: string }) => void;
  /** O resumo do território, já calculado pelo motor. Uma linha, por baixo. */
  resumo?: string;
}

export default function MapaOndeOperar({
  regiao,
  concelho,
  raioKm,
  onEscolher,
  resumo,
}: MapaOndeOperarProps) {
  const caixaRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const tileRef = useRef<TileLayer | null>(null);
  const fronteirasRef = useRef<LeafletGeoJSON | null>(null);
  const pinoRef = useRef<Marker | null>(null);
  const circuloRef = useRef<Circle | null>(null);
  const pontosRef = useRef<CircleMarker[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pronto, setPronto] = useState(false);
  const [tema, setTema] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoGeo[]>([]);
  const [listaAberta, setListaAberta] = useState(false);
  const [aPesquisar, setAPesquisar] = useState(false);
  const [aLocalizar, setALocalizar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [scrollAtivo, setScrollAtivo] = useState(false);
  const [dragAtivo, setDragAtivo] = useState(true);
  const [movel, setMovel] = useState(false);

  // O callback muda a cada render do pai; o handler do Leaflet é montado
  // uma vez. A referência mantém o clique sempre ligado ao mais recente
  // — e é atualizada num efeito, não durante o render: escrever numa ref
  // a meio do render é o tipo de efeito lateral que o modo concorrente
  // do React pode executar duas vezes ou descartar.
  const escolherRef = useRef(onEscolher);
  useEffect(() => {
    escolherRef.current = onEscolher;
  }, [onEscolher]);

  const sede = concelho ? SEDES.get(concelho) : undefined;
  const nomeDoConcelho = concelho ? CONCELHO_POR_CODIGO.get(concelho)?.nome : undefined;

  const dentroDoRaio = useMemo(
    () => (concelho && raioKm ? concelhosNoRaio(concelho, raioKm) : []),
    [concelho, raioKm],
  );

  /** Escolhe pelo ponto: o concelho cuja sede está mais perto. */
  const escolherPorPonto = useCallback((lat: number, lng: number) => {
    const codigo = concelhoMaisProximo({ lat, lng });
    if (!codigo) return null;
    const encontrado = CONCELHO_POR_CODIGO.get(codigo);
    if (!encontrado) return null;
    escolherRef.current({ regiao: encontrado.regiao, concelho: codigo });
    return encontrado;
  }, []);

  // ── Montagem do mapa ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    let observador: MutationObserver | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !caixaRef.current || mapRef.current) return;
      LRef.current = L;

      const estreito = typeof window !== "undefined" && window.innerWidth < 768;
      setMovel(estreito);

      const map = L.map(caixaRef.current, {
        center: VISTA_PAIS,
        zoom: estreito ? 5 : 6,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: !estreito,
        touchZoom: !estreito,
        attributionControl: true,
        preferCanvas: true,
      });
      mapRef.current = map;
      setDragAtivo(!estreito);

      tileRef.current = L.tileLayer(isDark() ? TILES_DARK : TILES_LIGHT, {
        attribution: TILES_ATTR,
        maxZoom: 18,
      }).addTo(map);

      map.on("click", (evento: { latlng: { lat: number; lng: number } }) => {
        const escolhido = escolherPorPonto(evento.latlng.lat, evento.latlng.lng);
        if (escolhido) setAviso(null);
      });

      // As fronteiras são decoração informativa: se a rede falhar, o
      // mapa continua a funcionar inteiro. É a mesma degradação do mapa
      // de preços, pela mesma razão.
      try {
        const dados =
          fronteirasEmCache ??
          (await fetch(GEO_URL).then((resposta) =>
            resposta.ok ? resposta.json() : Promise.reject(new Error("fronteiras")),
          ));
        fronteirasEmCache = dados as FeatureCollection;
        if (!cancelado && mapRef.current) {
          const nossas = (fronteirasEmCache.features ?? []).filter((f) =>
            Object.prototype.hasOwnProperty.call(NUTS_PARA_REGIAO, codigoNuts(f)),
          );
          const camada = L.geoJSON({ type: "FeatureCollection", features: nossas } as FeatureCollection, {
            interactive: false,
            style: { color: "#1D9E75", weight: 1, opacity: 0.45, fillColor: "#1D9E75", fillOpacity: 0.06, dashArray: "3 4" },
          }).addTo(map);
          camada.bringToBack();
          fronteirasRef.current = camada;
        }
      } catch {
        /* sem fronteiras — o mapa funciona à mesma */
      }

      observador = new MutationObserver(() => {
        tileRef.current?.setUrl(isDark() ? TILES_DARK : TILES_LIGHT);
        setTema(isDark());
      });
      observador.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      setPronto(true);
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
      observador?.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      pinoRef.current = null;
      circuloRef.current = null;
      pontosRef.current = [];
      fronteirasRef.current = null;
    };
  }, [escolherPorPonto]);

  // ── O pino, o círculo e os concelhos alcançados ──────────────────────
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !pronto) return;

    for (const ponto of pontosRef.current) map.removeLayer(ponto);
    pontosRef.current = [];
    if (circuloRef.current) {
      map.removeLayer(circuloRef.current);
      circuloRef.current = null;
    }
    if (pinoRef.current) {
      map.removeLayer(pinoRef.current);
      pinoRef.current = null;
    }
    if (!sede) return;

    // Os concelhos dentro do círculo, em pontos pequenos: é a prova
    // visual de quantos são, sem precisar de os ler numa lista.
    for (const alcancado of dentroDoRaio) {
      if (alcancado.codigo === sede.codigo) continue;
      const outra = SEDES.get(alcancado.codigo);
      if (!outra) continue;
      const ponto = L.circleMarker([outra.lat, outra.lng], {
        radius: 3.5,
        color: "#0F6E56",
        weight: 1,
        opacity: 0.9,
        fillColor: "#34B98C",
        fillOpacity: 0.9,
      })
        .bindTooltip(`${alcancado.nome} · ${alcancado.distanciaKm} km`, { direction: "top" })
        .addTo(map);
      pontosRef.current.push(ponto);
    }

    if (raioKm && raioKm > 0) {
      circuloRef.current = L.circle([sede.lat, sede.lng], {
        radius: raioKm * 1000,
        color: "#0F6E56",
        weight: 1.5,
        opacity: 0.7,
        fillColor: "#34B98C",
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map);
    }

    const icone = L.divIcon({
      className: "",
      html: `<div style="width:28px;height:36px;display:flex;align-items:flex-start;justify-content:center;filter:drop-shadow(0 3px 7px rgba(10,74,57,.45))">
        <svg width="28" height="36" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M17 43C17 43 31 27.5 31 17A14 14 0 1 0 3 17c0 10.5 14 26 14 26Z" fill="#0F6E56" stroke="#fff" stroke-width="2.5"/>
          <circle cx="17" cy="17" r="5" fill="#fff"/>
        </svg></div>`,
      iconSize: [28, 36],
      iconAnchor: [14, 36],
    });
    pinoRef.current = L.marker([sede.lat, sede.lng], {
      icon: icone,
      interactive: false,
      keyboard: false,
      alt: nomeDoConcelho ?? "",
    }).addTo(map);

    // Enquadrar: o círculo quando há, o concelho quando não.
    if (circuloRef.current) {
      map.fitBounds(circuloRef.current.getBounds(), { padding: [24, 24], animate: false });
    } else {
      map.setView([sede.lat, sede.lng], 10, { animate: false });
    }
  }, [sede, raioKm, dentroDoRaio, nomeDoConcelho, pronto, tema]);

  // ── Pesquisa (Nominatim, restrita a Portugal) ────────────────────────
  const geocodificar = useCallback(async (texto: string) => {
    if (texto.trim().length < 3) {
      setResultados([]);
      setListaAberta(false);
      return;
    }
    setAPesquisar(true);
    setAviso(null);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(texto)}` +
        "&format=json&limit=5&accept-language=pt-PT&countrycodes=pt";
      const resposta = await fetch(url, { headers: { Accept: "application/json" } });
      if (!resposta.ok) throw new Error("geo");
      const dados: Array<{ lat: string; lon: string; display_name: string }> = await resposta.json();
      const encontrados = dados.map((item) => {
        const partes = item.display_name.split(",").map((parte) => parte.trim());
        return {
          lat: Number.parseFloat(item.lat),
          lng: Number.parseFloat(item.lon),
          nome: partes[0] ?? item.display_name,
          detalhe: partes.slice(1, 3).join(", "),
        };
      });
      setResultados(encontrados);
      setListaAberta(true);
      if (encontrados.length === 0) setAviso(`Sem resultados para «${texto}».`);
    } catch {
      setResultados([]);
      setListaAberta(false);
      setAviso("Não foi possível pesquisar agora. Podes tocar no mapa ou escolher na lista.");
    } finally {
      setAPesquisar(false);
    }
  }, []);

  const aoEscrever = (valor: string) => {
    setQuery(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => geocodificar(valor), 450);
  };

  const escolherResultado = (item: ResultadoGeo) => {
    setListaAberta(false);
    setResultados([]);
    const escolhido = escolherPorPonto(item.lat, item.lng);
    setQuery(escolhido?.nome ?? item.nome);
    if (escolhido) {
      // A distância entre o que a pessoa procurou e a sede do concelho
      // que respondeu não é ruído: é a diferença entre «Carvoeiro» e
      // «Lagoa», e escondê-la faria a resposta parecer errada.
      const sedeEscolhida = SEDES.get(escolhido.codigo);
      const km = sedeEscolhida
        ? Math.round(distanciaKm({ lat: item.lat, lng: item.lng }, sedeEscolhida))
        : null;
      setAviso(
        km !== null && km > 2
          ? `«${item.nome}» fica no concelho de ${escolhido.nome}, a ${km} km da sede.`
          : `Concelho de ${escolhido.nome}.`,
      );
    }
  };

  const localizar = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setAviso("O teu dispositivo não permite localização. Toca no mapa ou usa a pesquisa.");
      return;
    }
    setALocalizar(true);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setALocalizar(false);
        const escolhido = escolherPorPonto(posicao.coords.latitude, posicao.coords.longitude);
        setAviso(
          escolhido
            ? `Estás no concelho de ${escolhido.nome}. A posição não é guardada nem enviada.`
            : "Não foi possível associar a tua posição a um concelho.",
        );
      },
      () => {
        setALocalizar(false);
        setAviso("Não foi possível localizar. Verifica as permissões do browser.");
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }, [escolherPorPonto]);

  const alternarScroll = () => {
    const map = mapRef.current;
    if (!map) return;
    if (scrollAtivo) map.scrollWheelZoom.disable();
    else map.scrollWheelZoom.enable();
    setScrollAtivo(!scrollAtivo);
  };

  const alternarDrag = () => {
    const map = mapRef.current;
    if (!map) return;
    if (dragAtivo) map.dragging.disable();
    else map.dragging.enable();
    setDragAtivo(!dragAtivo);
  };

  const ctrl =
    "flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-stone-600 shadow-card transition-colors hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:bg-stone-900 dark:text-stone-300";
  const ctrlOff = "border-stone-200 dark:border-stone-700";
  const ctrlOn = "border-brand bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand";

  const listaDaRegiao = useMemo(() => concelhosDaRegiao(regiao), [regiao]);

  return (
    // ── PORQUE ESTE `isolate` NÃO É DECORAÇÃO ──────────────────────────
    //  O CSS do Leaflet põe os painéis do mapa em `z-index: 400` e os
    //  controlos em `1000`, e as sobreposições desta caixa somam-lhes
    //  outro `1000`. A barra de topo do site é `fixed … z-50`. Sem um
    //  contexto de empilhamento próprio, esses números competem no
    //  contexto da raiz e o mapa GANHA — passa a pintar por cima do
    //  cabeçalho ao percorrer a página, que foi o que aconteceu em
    //  produção assim que isto foi para o ar.
    //
    //  `isolate` fecha o assunto na origem: cria o contexto aqui, os
    //  z-index de dentro passam a ser relativos a esta caixa, e a caixa
    //  fica em `z-0` — debaixo do cabeçalho, onde tem de estar. É
    //  preferível a subir o z-index do cabeçalho, que só empurraria a
    //  mesma corrida para o próximo componente que use Leaflet.
    // ── PORQUE ESTE `isolate` NÃO É DECORAÇÃO ──────────────────────────
    //  O CSS do Leaflet põe os painéis do mapa em `z-index: 400` e os
    //  controlos em `1000`, e as sobreposições desta caixa — a pesquisa e
    //  os botões — somam-lhes outro `1000`. A barra de topo do site é
    //  `fixed … z-50`. Sem um contexto de empilhamento próprio, esses
    //  números competem no contexto da RAIZ e o mapa ganha: ao percorrer
    //  a página, a caixa de pesquisa do mapa passa a pintar por cima do
    //  logótipo e da pesquisa do site. Medido a 1876 px, com o topo do
    //  mapa debaixo da barra: 28 pontos tapados, de x=416 a x=1064.
    //
    //  `isolate` fecha o assunto na origem — cria o contexto aqui, os
    //  z-index de dentro passam a ser relativos a esta caixa, e a caixa
    //  fica em `z-0`, debaixo da barra. É melhor do que subir o z-index
    //  da barra, que só empurraria a mesma corrida para o componente
    //  seguinte que use Leaflet.
    //
    //  `data-mapa-onde-operar` é o gancho do teste que prende isto:
    //  `scripts/verificar-descobrir-negocio.mjs` varre a linha da barra
    //  e falha se algum ponto dela pertencer a esta caixa.
    <div
      data-mapa-onde-operar
      className="relative isolate z-0 overflow-hidden rounded-3xl border border-stone-100 shadow-card dark:border-stone-800"
    >
      <div className="relative">
        <div
          ref={caixaRef}
          className="h-[320px] w-full bg-stone-100 sm:h-[400px] dark:bg-stone-900"
          role="application"
          aria-label="Mapa de Portugal para escolher onde vais operar"
        />

        {/* Pesquisa */}
        <div
          className="absolute left-2 right-2 top-2 z-[1000]"
          onMouseDown={(evento) => evento.stopPropagation()}
          onTouchStart={(evento) => evento.stopPropagation()}
        >
          <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 px-2.5 py-1.5 shadow-float backdrop-blur dark:border-stone-700 dark:bg-stone-900/95">
            <Search size={15} className="flex-shrink-0 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(evento) => aoEscrever(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  evento.preventDefault();
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  geocodificar(query);
                }
                if (evento.key === "Escape") setListaAberta(false);
              }}
              placeholder="Localidade ou código postal…"
              aria-label="Procurar onde vais operar"
              className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-stone-800 placeholder-stone-400 focus:outline-none dark:text-stone-100"
            />
            {aPesquisar ? <Spinner size={15} className="flex-shrink-0 animate-spin text-brand" /> : null}
            {query && !aPesquisar ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResultados([]);
                  setListaAberta(false);
                }}
                aria-label="Limpar a pesquisa"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
              >
                <Close size={13} />
              </button>
            ) : null}
          </div>

          {listaAberta && resultados.length > 0 ? (
            <ul className="mt-1.5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-float dark:border-stone-700 dark:bg-stone-900">
              {resultados.map((item, indice) => (
                <li key={`${item.lat},${item.lng},${indice}`}>
                  <button
                    type="button"
                    onClick={() => escolherResultado(item)}
                    className="flex w-full items-start gap-2 border-b border-stone-50 px-3 py-2 text-left transition-colors last:border-0 hover:bg-brand-light/50 dark:border-stone-800 dark:hover:bg-brand/10"
                  >
                    <MapPin size={13} className="mt-0.5 flex-shrink-0 text-brand" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-stone-800 dark:text-stone-100">
                        {item.nome}
                      </span>
                      {item.detalhe ? (
                        <span className="block truncate text-[11px] text-stone-400">{item.detalhe}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Controlos */}
        <div
          className="absolute bottom-2 right-2 z-[1000] flex flex-col gap-1.5"
          onMouseDown={(evento) => evento.stopPropagation()}
        >
          <button
            type="button"
            onClick={localizar}
            aria-label="Usar a minha localização"
            className={`${ctrl} ${ctrlOff}`}
          >
            {aLocalizar ? <Spinner size={15} className="animate-spin text-brand" /> : <Crosshair size={15} />}
          </button>
          <button
            type="button"
            onClick={alternarScroll}
            aria-pressed={scrollAtivo}
            aria-label={scrollAtivo ? "Bloquear o zoom com a roda" : "Ativar o zoom com a roda"}
            className={`${ctrl} ${scrollAtivo ? ctrlOn : ctrlOff}`}
          >
            <Lock size={14} />
          </button>
          {movel ? (
            <button
              type="button"
              onClick={alternarDrag}
              aria-pressed={dragAtivo}
              aria-label={dragAtivo ? "Bloquear o arrasto do mapa" : "Ativar o arrasto do mapa"}
              className={`${ctrl} ${dragAtivo ? ctrlOn : ctrlOff}`}
            >
              <Move size={15} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Aproximar"
            className={`${ctrl} ${ctrlOff}`}
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Afastar"
            className={`${ctrl} ${ctrlOff}`}
          >
            <Minus size={15} />
          </button>
        </div>
      </div>

      {/* ── A resposta em texto, que é o que conta para quem não vê o mapa ── */}
      <div className="space-y-2 border-t border-stone-100 bg-white px-3 py-2.5 dark:border-stone-800 dark:bg-stone-900">
        <p aria-live="polite" className="text-[12px] leading-snug text-stone-600 dark:text-stone-300">
          {nomeDoConcelho ? (
            <>
              <span className="font-semibold text-ink">{nomeDoConcelho}</span>
              {resumo ? <span className="text-stone-500"> · {resumo}</span> : null}
            </>
          ) : (
            <span className="text-stone-500">
              Toca no mapa, procura a tua localidade ou usa o GPS. Também podes escolher na lista abaixo.
            </span>
          )}
        </p>
        {aviso ? <p className="text-[11px] leading-snug text-stone-500">{aviso}</p> : null}

        {/* A lista fechada continua a existir: é a via de teclado, a via
            sem rede para as tiles, e a via de quem sabe o nome. */}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="ode-concelho" className="text-[11px] font-semibold text-stone-500">
            Ou escolhe na lista
          </label>
          <select
            id="ode-concelho"
            value={concelho ?? ""}
            onChange={(evento) => {
              const codigo = evento.target.value;
              if (!codigo) return;
              const encontrado = CONCELHO_POR_CODIGO.get(codigo);
              if (encontrado) onEscolher({ regiao: encontrado.regiao, concelho: codigo });
            }}
            className="h-9 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-2 text-[12px] font-semibold text-ink focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
          >
            <option value="">
              {regiao === "portugal" ? "Todos os concelhos" : `Concelhos de ${marketRegionLabelSeguro(regiao)}`}
            </option>
            {(regiao === "portugal" ? todosOsConcelhos() : listaDaRegiao).map((item) => (
              <option key={item.codigo} value={item.codigo}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[10px] leading-snug text-stone-400">
          Fronteiras: Eurostat (NUTS 2021). Base: OpenStreetMap e CARTO. As distâncias são em linha
          reta entre sedes de concelho, não por estrada. O concelho que escolheres não sai deste
          dispositivo.
        </p>
      </div>
    </div>
  );
}

function codigoNuts(f?: Feature): string {
  if (!f) return "";
  const propriedades = (f.properties ?? {}) as Record<string, unknown>;
  return String(f.id ?? propriedades.id ?? propriedades.NUTS_ID ?? "");
}

const marketRegionLabelSeguro = (regiao: MarketRegion) =>
  MARKET_REGIONS.find((item) => item.id === regiao)?.label ?? "Portugal";

const todosOsConcelhos = () =>
  [...CONCELHO_POR_CODIGO.values()].sort((esquerda, direita) =>
    esquerda.nome.localeCompare(direita.nome, "pt-PT"),
  );
