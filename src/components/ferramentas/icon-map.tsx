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
  Clock, Briefcase, Globe, Target, Gift, Laptop, ChartProjection, Lightbulb, Coin,
  FileSign,
  // Acrescentados para os ATALHOS DE GUIAS. Os manifestos guardam o ícone
  // como componente; para os três guias que a homepage mostra, o servidor
  // traduz esse componente numa chave e o cliente resolve-a aqui — sem
  // arrastar os manifestos, que trazem o catálogo da expansão atrás.
  Calendar, Warning, Home, Heart,
} from "@/components/ui/Icons";

export type IconeFerramenta = React.ComponentType<{ size?: number; className?: string }>;

export const ICONES_FERRAMENTAS: Record<string, IconeFerramenta> = {
  Calculator, Receipt, Search, Building, User, Scale, ShieldCheck,
  MapPin, Gauge, Swap, ShoppingBag, Sparkle, Wallet, BookOpen, Trophy,
  // Acrescentados para os cenários do simulador de preço. O mapa cresce
  // por adição — nunca se substitui uma chave já usada pelo catálogo.
  Clock, Briefcase, Globe, Target, Gift, Laptop, ChartProjection, Lightbulb, Coin,
  FileSign,
  Calendar, Warning, Home, Heart,
};

/**
 * O caminho inverso: componente → chave.
 *
 * Existe para o servidor poder traduzir um ícone de manifesto numa chave
 * antes de a mandar para o cliente. É o que permite `ExplorarSecao`
 * mostrar três guias sem importar `guias-config` — e, por essa via, os
 * 550 KB do catálogo da expansão.
 */
const CHAVE_POR_ICONE = new Map<IconeFerramenta, string>(
  Object.entries(ICONES_FERRAMENTAS).map(([chave, componente]) => [componente, chave]),
);

/** `null` quando o ícone não está no mapa — quem chama decide o que fazer. */
export function chaveDoIcone(componente: IconeFerramenta): string | null {
  return CHAVE_POR_ICONE.get(componente) ?? null;
}

/** As chaves que o catálogo pode usar — o teste valida contra esta lista. */
export const CHAVES_ICONES = Object.keys(ICONES_FERRAMENTAS);

/** Resolve a chave; cai no ícone de calculadora se alguém escrever mal. */
export function iconeDe(chave: string): IconeFerramenta {
  return ICONES_FERRAMENTAS[chave] ?? Calculator;
}
