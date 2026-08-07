// ─────────────────────────────────────────────────────────────────────────
//  Compatibilidade: a fonte única dos guias passou a ser
//  `src/lib/guias/manifests.ts` (GuideManifest). Este módulo deriva a forma
//  antiga (`Guia`) a partir dos manifestos para não partir a homepage, o
//  índice e os testes existentes — e para eliminar a duplicação manual do
//  catálogo apontada no ponto 4.5 da auditoria.
//
//  Ao criar um guia novo: registar o manifesto, não editar este ficheiro.
// ─────────────────────────────────────────────────────────────────────────

import {
  GUIDE_MANIFESTS,
  href as hrefDoManifesto,
  type GuideManifest,
  type Categoria,
  type HubGroup,
  type IconType,
} from "@/lib/guias/manifests";
import { guiaSemCorpo } from "@/lib/guias/expansao/derivar";
import type { Perfil } from "@/lib/perfil";

export type { IconType, Categoria, HubGroup };

export interface Guia {
  href: string;
  slug: string;
  titulo: string;
  descricao: string;
  tempo: number;
  categoria: Categoria;
  /** Grupo por INTENÇÃO. O índice filtra por este eixo além da categoria:
      "o que preciso de fazer" e "quem sou" são perguntas diferentes. */
  hub: HubGroup;
  icon: IconType;
}

const daManifesto = (m: GuideManifest): Guia => ({
  href: hrefDoManifesto(m),
  slug: m.slug,
  titulo: m.title,
  descricao: m.descricao,
  tempo: m.tempo,
  categoria: m.categoria,
  hub: m.hub,
  icon: m.icon,
});

// O índice mostra o que existe para ler. Um andaime da expansão — fontes
// completas, corpo por escrever — não está para ser lido, e anunciá-lo no
// catálogo era prometer conteúdo que ainda não há. Mesmo critério do
// sitemap (`GUIA_SLUGS`), para os dois nunca divergirem.
export const GUIAS: Guia[] = GUIDE_MANIFESTS
  .filter((m) => m.status !== "archived" && !guiaSemCorpo(m.slug))
  .map(daManifesto);

/** Slug de um guia a partir do href ("/guias/abrir-atividade" → "abrir-atividade"). */
export const guiaSlug = (g: Guia): string => g.href.replace("/guias/", "");

/** Categoria de guias mais afim a cada perfil do seletor da homepage. */
export const CATEGORIA_POR_PERFIL: Record<Perfil, Categoria> = {
  independente: "Independentes",
  dependente: "Conta de outrem",
  empresa: "Empresas",
  comparar: "Transversal",
};

/** Curadoria explícita: os 4 guias em destaque na homepage por perfil.
    Validado em ecossistema.test.ts (todos os slugs têm de existir em GUIAS). */
export const GUIAS_DESTAQUE_POR_PERFIL: Record<Perfil, string[]> = {
  independente: ["abrir-atividade", "regime-simplificado", "iva-recibos-verdes", "seguranca-social"],
  dependente: ["recibo-vencimento", "subsidios-ferias-natal", "trabalho-suplementar", "irs-jovem"],
  empresa: ["abrir-empresa", "unipessoal-vs-eni", "irc", "tributacao-autonoma"],
  comparar: ["unipessoal-vs-eni", "acumulacao-emprego", "escaloes-irs", "calendario-fiscal"],
};

/** Os guias em destaque de um perfil, já resolvidos e na ordem curada. */
export function guiasPorPerfil(perfil: Perfil): Guia[] {
  return GUIAS_DESTAQUE_POR_PERFIL[perfil]
    .map((slug) => GUIAS.find((g) => guiaSlug(g) === slug))
    .filter((g): g is Guia => Boolean(g));
}
