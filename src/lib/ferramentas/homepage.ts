// ═══════════════════════════════════════════════════════════════════════
//  CURADORIA DA HOMEPAGE POR PERFIL — ids do catálogo, nada mais
//  ---------------------------------------------------------------------
//  A homepage tem um eixo próprio (`Perfil`, com «comparar» como modo) que
//  não é o `ToolProfile` do catálogo. É curadoria editorial e é legítimo
//  que exista — o que não é legítimo é ser uma SEGUNDA LISTA de ferramentas.
//  Aqui só há ids; a ferramenta em si vem sempre do catálogo, e `validar.ts`
//  reprova um id que não exista.
//
//  Duas mudanças materiais face à curadoria anterior:
//   · «independente» destacava o classificador de atividade. Passa a
//     destacar o simulador de recibos verdes — o núcleo do produto, que
//     até agora não tinha sequer landing (P0-01).
//   · «comparar» destacava o simulador de IRS. Passa a destacar o
//     comparador de regimes, que é literalmente o que o modo promete e que
//     até agora não tinha destino canónico (P0-02).
// ═══════════════════════════════════════════════════════════════════════

import { CATALOGO_FERRAMENTAS } from "./catalogo";
import type { ToolDefinition } from "./tipos";

/** O eixo da homepage. Espelha `Perfil` de `src/lib/perfil.tsx`. */
export type PerfilHomepage = "independente" | "dependente" | "empresa" | "comparar";

export const DESTAQUE_POR_PERFIL: Record<PerfilHomepage, string> = {
  independente: "recibos-verdes",
  dependente: "recibo-vencimento",
  empresa: "simulador-empresa",
  comparar: "comparar-regimes",
};

/** Os 4 cartões da grelha, sem o destaque.
    Contagem constante por perfil → a secção não salta de altura na troca. */
export const ORDEM_POR_PERFIL: Record<PerfilHomepage, string[]> = {
  independente: ["regime-simplificado", "seguranca-social", "ato-isolado", "classificar-atividade"],
  dependente: ["auditoria-recibo", "simulador-irs", "irs-jovem", "simulador-herancas"],
  empresa: ["comparar-regimes", "mapa-contabilistas", "simulador-irs", "regime-simplificado"],
  comparar: ["recibos-verdes", "recibo-vencimento", "simulador-empresa", "simulador-irs"],
};

const porIdInterno = (id: string): ToolDefinition | undefined =>
  CATALOGO_FERRAMENTAS.find((f) => f.id === id);

/** Destaque + grelha de um perfil, já resolvidos e na ordem curada. */
export function ferramentasPorPerfil(perfil: PerfilHomepage): {
  destaque: ToolDefinition;
  restantes: ToolDefinition[];
} {
  const destaque = porIdInterno(DESTAQUE_POR_PERFIL[perfil]) ?? CATALOGO_FERRAMENTAS[0];
  const restantes = ORDEM_POR_PERFIL[perfil]
    .map(porIdInterno)
    .filter((f): f is ToolDefinition => f !== undefined);
  return { destaque, restantes };
}
