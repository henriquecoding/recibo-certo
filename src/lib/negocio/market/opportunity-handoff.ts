import { novaOferta } from "../fabrica";
import type { ContextoNegocio, OfertaNegocio } from "../tipos";
import type { CenarioInicial } from "@/lib/pricing/tipos";

export interface OpportunityPricingSeed {
  cenario: CenarioInicial;
  nome: string;
}

export interface OpportunityHandoffResult {
  contexto: ContextoNegocio;
  oferta: OfertaNegocio;
  created: boolean;
}

/**
 * Leva uma oportunidade para o estúdio sem apagar o projeto existente.
 * Repetir o mesmo handoff é idempotente: cenário + nome identificam a
 * oferta já criada, evitando duplicados quando se atualiza a página.
 */
export function seedOpportunityOffer(
  base: ContextoNegocio,
  seed: OpportunityPricingSeed,
  now: () => string = () => new Date().toISOString(),
): OpportunityHandoffResult {
  const nome = seed.nome.trim();
  const nomeNormalizado = nome.toLocaleLowerCase("pt-PT");
  const existente = base.ofertas.find(
    (oferta) =>
      oferta.nome.trim().toLocaleLowerCase("pt-PT") === nomeNormalizado &&
      oferta.pricing.cenario === seed.cenario,
  );

  if (existente) return { contexto: base, oferta: existente, created: false };

  const oferta = novaOferta(seed.cenario, { nome });
  return {
    contexto: {
      ...base,
      ofertas: [...base.ofertas, oferta],
      meta: { ...base.meta, atualizadoEm: now() },
    },
    oferta,
    created: true,
  };
}
