import type { PayrollEmployee } from "../payroll/types";

/**
 * Perfis públicos e documentados para formar um intervalo sem inventar a
 * situação de uma pessoa concreta. Não inclui incapacidade nem IRS Jovem:
 * esses regimes exigem factos e invocação explícita.
 */
export function workerRangeProfiles(
  jurisdiction: PayrollEmployee["jurisdiction"],
): readonly PayrollEmployee[] {
  return [
    { dependants: 0, maritalStatus: "not_married", disability: false, jurisdiction },
    { dependants: 2, maritalStatus: "not_married", disability: false, jurisdiction },
    { dependants: 1, maritalStatus: "married_single_holder", disability: false, jurisdiction },
    { dependants: 1, maritalStatus: "married_two_holders", disability: false, jurisdiction },
  ];
}

