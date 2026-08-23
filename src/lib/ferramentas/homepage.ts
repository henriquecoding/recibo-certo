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

/** Os 6 cartões da grelha, sem o destaque.
    Contagem constante por perfil → a secção não salta de altura na troca.

    ┌───────────────────────────────────────────────────────────────────┐
    │ OS DOIS MOTORES ENTRAM AQUI, E ATÉ AGORA A PROMESSA ERA FALSA      │
    │                                                                   │
    │ `calcular-preco` e `descobrir-negocio` declaravam                  │
    │ `surfaces: [..., "homepage", ...]` no catálogo desde que nasceram, │
    │ e esta curadoria — que é a ÚNICA coisa que decide o que a homepage │
    │ mostra — nunca os incluiu. A declaração não era lida por código    │
    │ nenhum, portanto ninguém tropeçava nela: os dois motores só        │
    │ existiam dentro de `/ferramentas`.                                 │
    │                                                                   │
    │ Agora entram, e `validar.ts` passa a reprovar a divergência nos    │
    │ DOIS sentidos — uma ferramenta que declare `homepage` e não esteja │
    │ na curadoria, e uma que esteja na curadoria sem o declarar. A      │
    │ superfície deixa de poder ser uma etiqueta decorativa.             │
    │                                                                   │
    │ Ficam nos dois primeiros lugares de `independente` e de `empresa`  │
    │ — os dois perfis que ambos declaram em `profiles` — porque é essa  │
    │ a ordem do ciclo de vida que a navegação passou a contar: que      │
    │ negócio testar, quanto cobrar, e só depois quanto fica.            │
    └───────────────────────────────────────────────────────────────────┘ */
export const ORDEM_POR_PERFIL: Record<PerfilHomepage, string[]> = {
  independente: [
    "descobrir-negocio", "calcular-preco", "regime-simplificado",
    "seguranca-social", "ato-isolado", "classificar-atividade",
  ],
  dependente: [
    "auditoria-recibo", "simulador-irs", "irs-jovem",
    "comparar-regimes", "simulador-herancas", "mapa-contabilistas",
  ],
  empresa: [
    "descobrir-negocio", "calcular-preco", "comparar-regimes",
    "mapa-contabilistas", "simulador-irs", "regime-simplificado",
  ],
  comparar: [
    "recibos-verdes", "recibo-vencimento", "simulador-empresa",
    "simulador-irs", "calcular-preco", "regime-simplificado",
  ],
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
