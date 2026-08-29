/**
 * Modos editoriais que a homepage consegue renderizar por inteiro.
 *
 * Isto é deliberadamente separado de `Perfil`: «Descobrir» é a tarefa que a
 * pessoa quer fazer agora; «independente», «dependente» e «empresa» descrevem
 * contextos profissionais que podem coexistir.
 */
export const FOCOS_HOMEPAGE = [
  "descobrir",
  "preco",
  "recibos",
  "empresa",
  "salario",
] as const;

export type FocoHomepage = (typeof FOCOS_HOMEPAGE)[number];

/**
 * Uma rota concreta por leitura editorial.
 *
 * Manter este mapa fora dos componentes torna a separação verificável: a
 * navegação, o chrome móvel, os redirects legados e os testes leem a mesma
 * fonte, sem voltar a inventar `/?foco=...` em cada superfície.
 */
export const ROTA_POR_FOCO = Object.freeze({
  descobrir: "/",
  preco: "/inicio/preco",
  recibos: "/inicio/recibos",
  empresa: "/inicio/empresa",
  salario: "/inicio/salario",
} satisfies Record<FocoHomepage, string>);

export type RotaFocoHomepage = (typeof ROTA_POR_FOCO)[FocoHomepage];

const FOCO_POR_ROTA = new Map<string, FocoHomepage>(
  Object.entries(ROTA_POR_FOCO).map(([foco, rota]) => [rota, foco as FocoHomepage]),
);

/** Resolve apenas as cinco entradas editoriais, nunca rotas de ferramentas. */
export function focoDaRotaHomepage(pathname: string): FocoHomepage | null {
  const rota = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return FOCO_POR_ROTA.get(rota) ?? null;
}

export function normalizarFocoHomepage(
  valor: string | string[] | null | undefined,
): FocoHomepage | null {
  const primeiro = Array.isArray(valor) ? valor[0] : valor;
  return FOCOS_HOMEPAGE.includes(primeiro as FocoHomepage)
    ? (primeiro as FocoHomepage)
    : null;
}
