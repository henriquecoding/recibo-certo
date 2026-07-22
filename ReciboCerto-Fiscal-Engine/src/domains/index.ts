import type { Decision } from "../core/decision";
import { unsupported } from "../core/decision";
import type { DomainId } from "./coverage";
import { COVERAGE } from "./coverage";

/**
 * Encaminha um pedido para o domínio certo. Como nenhum domínio passou de
 * `contract_only`, este router devolve sempre `unsupported` — literalmente o
 * "falhar fechado" da arquitetura (invariante #5): um domínio não migrado
 * nunca inventa um resultado.
 *
 * Quando um domínio migrar (ver MIGRATION.md), a sua entrada aqui passa a
 * chamar `evaluate()` (core/engine.ts) com as suas regras reais, e
 * `coverage.ts` atualiza o `status` desse domínio.
 */
export function route(domainId: DomainId): Decision<never> {
  const domain = COVERAGE[domainId];
  return unsupported(
    `Domínio "${domain.label}" ainda é "${domain.status}" — nenhuma regra foi ` +
      `migrada para este núcleo. Bloqueio principal: ${domain.mainBlocker}. ` +
      "Continua servido pelo motor legado em src/lib/ (ver MIGRATION.md).",
    domainId,
  );
}
