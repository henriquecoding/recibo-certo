// ─────────────────────────────────────────────────────────────────────
//  Preços de contabilistas por região (NUTS II) — ESTIMATIVAS DE MERCADO.
//  ---------------------------------------------------------------------
//  IMPORTANTE: estes valores NÃO são dados fiscais (não há tabela legal de
//  honorários — a profissão é liberalizada). São ESTIMATIVAS de avença mensal
//  praticada no mercado para um trabalhador independente típico (regime
//  simplificado / contabilidade organizada de pequena dimensão, clientes
//  nacionais, poucos documentos), recolhidas de valores publicamente referidos
//  por gabinetes e diretórios profissionais. Variam por gabinete, volume de
//  documentos, complexidade (IVA, internacional) e negociação.
//
//  Metodologia: parte-se de uma banda nacional de referência e aplica-se um
//  fator regional de custo (centros urbanos e metropolitanos tendem a praticar
//  honorários mais altos). Para sociedades / contabilidade organizada, os
//  valores são superiores — ver `diagnosticoContabilista` (Passo 5).
//
//  No futuro, este mapa passará a listar Contabilistas Certificados reais,
//  contactáveis diretamente. Por agora mostra apenas a média por região.
// ─────────────────────────────────────────────────────────────────────

/** Data da última revisão das estimativas de mercado. */
export const PRECOS_REGIOES_VERIFICADO = "2026-06-18";

export interface RegiaoPreco {
  id: string;
  /** Nome da região (NUTS II). */
  nome: string;
  /** Coordenadas aproximadas do centro da região (para o mapa). */
  lat: number;
  lng: number;
  /** Avença mensal estimada — mínimo (€/mês). */
  min: number;
  /** Avença mensal estimada — máximo (€/mês). */
  max: number;
  /** Cidades de referência da região. */
  referencia: string;
}

/**
 * Estimativas de avença mensal (€/mês) para um trabalhador independente típico.
 * Ordenadas por preço médio decrescente para facilitar a leitura.
 */
export const REGIOES_PRECO: RegiaoPreco[] = [
  {
    id: "aml",
    nome: "Área Metropolitana de Lisboa",
    lat: 38.75,
    lng: -9.15,
    min: 75,
    max: 160,
    referencia: "Lisboa, Sintra, Cascais, Setúbal",
  },
  {
    id: "norte",
    nome: "Norte",
    lat: 41.25,
    lng: -8.35,
    min: 65,
    max: 140,
    referencia: "Porto, Braga, Guimarães, Vila Real",
  },
  {
    id: "algarve",
    nome: "Algarve",
    lat: 37.15,
    lng: -8.0,
    min: 65,
    max: 130,
    referencia: "Faro, Portimão, Loulé",
  },
  {
    id: "madeira",
    nome: "Madeira",
    lat: 32.75,
    lng: -16.95,
    min: 60,
    max: 120,
    referencia: "Funchal",
  },
  {
    id: "acores",
    nome: "Açores",
    lat: 37.74,
    lng: -25.67,
    min: 60,
    max: 120,
    referencia: "Ponta Delgada, Angra do Heroísmo",
  },
  {
    id: "centro",
    nome: "Centro",
    lat: 40.2,
    lng: -8.0,
    min: 55,
    max: 120,
    referencia: "Coimbra, Aveiro, Leiria, Viseu",
  },
  {
    id: "alentejo",
    nome: "Alentejo",
    lat: 38.3,
    lng: -7.9,
    min: 50,
    max: 110,
    referencia: "Évora, Beja, Portalegre",
  },
];

/** Ponto médio de uma região (para ordenação/cor). */
export function precoMedio(r: RegiaoPreco): number {
  return Math.round((r.min + r.max) / 2);
}

/** Banda nacional agregada (mínimo dos mínimos, máximo dos máximos). */
export const BANDA_NACIONAL = {
  min: Math.min(...REGIOES_PRECO.map((r) => r.min)),
  max: Math.max(...REGIOES_PRECO.map((r) => r.max)),
} as const;

/**
 * Nível de preço (0–1) de uma região face à banda nacional — para a escala de
 * cor do mapa (verde claro = mais barato, verde escuro = mais caro).
 */
export function nivelPreco(r: RegiaoPreco): number {
  const medios = REGIOES_PRECO.map(precoMedio);
  const lo = Math.min(...medios);
  const hi = Math.max(...medios);
  if (hi === lo) return 0.5;
  return (precoMedio(r) - lo) / (hi - lo);
}

/** Distância aproximada (km) entre dois pontos (Haversine). */
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Região cujo centro está mais próximo de umas coordenadas (para a pesquisa). */
export function regiaoMaisProxima(lat: number, lng: number): RegiaoPreco {
  return REGIOES_PRECO.reduce((maisPerto, r) =>
    distanciaKm(lat, lng, r.lat, r.lng) < distanciaKm(lat, lng, maisPerto.lat, maisPerto.lng)
      ? r
      : maisPerto
  );
}
