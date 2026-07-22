import type { FetchedContent, LegalSource, SourceValidationResult } from "./source";

/**
 * Validação semântica de uma fonte legal — não apenas "respondeu 200".
 *
 * Esta função é pura (não faz `fetch`): recebe o conteúdo já obtido, para
 * ficar testável sem rede. A busca do conteúdo (`FetchedContent`) fica a
 * cargo de quem chama — no motor legado, seria uma evolução de
 * `scripts/check-fiscal-data.mjs`.
 *
 * Corrige exatamente o caso do relatório (§7): `art87circ` apontava para
 * `circ_rep/Pages/irc87.aspx`, que responde 200 mas mostra "vigor até 2013"
 * e a taxa de 25% — não a taxa 2026. `forbiddenPhrases` deteta isto.
 */
export function validateSource(
  source: LegalSource,
  fetched: FetchedContent,
): SourceValidationResult {
  const problems: string[] = [];

  if (source.state === "withdrawn" || source.state === "superseded") {
    problems.push(`Fonte marcada como "${source.state}" — não deve ser usada como origem ativa.`);
  }

  if (source.canonicalUrl && fetched.finalUrl !== source.canonicalUrl) {
    problems.push(
      `URL final (${fetched.finalUrl}) difere da URL canónica esperada (${source.canonicalUrl}).`,
    );
  }

  const titleOk = source.expectedTitleContains.every((fragment) =>
    fetched.title.toLowerCase().includes(fragment.toLowerCase()),
  );
  if (!titleOk) {
    problems.push(
      `Título da página ("${fetched.title}") não contém os fragmentos esperados: ` +
        source.expectedTitleContains.join(", "),
    );
  }

  const bodyLower = fetched.bodyText.toLowerCase();
  for (const phrase of source.forbiddenPhrases) {
    if (bodyLower.includes(phrase.toLowerCase())) {
      problems.push(`Conteúdo contém a expressão proibida "${phrase}" — versão desatualizada ou revogada.`);
    }
  }

  return { valid: problems.length === 0, problems };
}
