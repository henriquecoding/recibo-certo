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

export function normalizarFocoHomepage(
  valor: string | string[] | null | undefined,
): FocoHomepage | null {
  const primeiro = Array.isArray(valor) ? valor[0] : valor;
  return FOCOS_HOMEPAGE.includes(primeiro as FocoHomepage)
    ? (primeiro as FocoHomepage)
    : null;
}
