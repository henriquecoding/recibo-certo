// ═══════════════════════════════════════════════════════════════════════
//  ToolIconKey → SVG
//  ---------------------------------------------------------------------
//  O catálogo transporta uma CHAVE, não um componente. É aqui — e só aqui
//  — que a chave vira ícone.
//
//  Porquê: `catalogo.ts` é consumido pelo sitemap, pelos testes, pelo
//  gerador do índice de pesquisa e pelo painel. Se guardasse componentes,
//  qualquer um desses consumidores arrastava a árvore de ícones consigo.
//  A chave quebra essa ligação sem perder a verificação: `iconesValidos`
//  deixa o teste do catálogo reprovar uma chave que não existe, que era o
//  risco de trocar um import por uma string.
// ═══════════════════════════════════════════════════════════════════════

import {
  Calculator, Receipt, Search, Building, User, Scale, ShieldCheck,
  MapPin, Gauge, Swap, ShoppingBag, Sparkle, Wallet, BookOpen, Trophy,
} from "@/components/ui/Icons";

export type IconeFerramenta = React.ComponentType<{ size?: number; className?: string }>;

export const ICONES_FERRAMENTAS: Record<string, IconeFerramenta> = {
  Calculator, Receipt, Search, Building, User, Scale, ShieldCheck,
  MapPin, Gauge, Swap, ShoppingBag, Sparkle, Wallet, BookOpen, Trophy,
};

/** As chaves que o catálogo pode usar — o teste valida contra esta lista. */
export const CHAVES_ICONES = Object.keys(ICONES_FERRAMENTAS);

/** Resolve a chave; cai no ícone de calculadora se alguém escrever mal. */
export function iconeDe(chave: string): IconeFerramenta {
  return ICONES_FERRAMENTAS[chave] ?? Calculator;
}
