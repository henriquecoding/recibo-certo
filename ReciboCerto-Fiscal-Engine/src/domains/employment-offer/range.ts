import type { PayrollEmployee } from "../payroll/types";

/**
 * Cenários de referência públicos e documentados, para formar um intervalo sem
 * inventar a situação de uma pessoa concreta. Não incluem incapacidade nem
 * IRS Jovem: esses regimes exigem factos e invocação explícita — e é por isso
 * que estes quatro perfis NÃO são um envelope universal, apenas quatro casos
 * nomeados (relatório, CON-P0-17).
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

/** Os mesmos perfis, nomeados para poderem ser lidos no resultado. */
export function workerRangeProfileLabels(
  jurisdiction: PayrollEmployee["jurisdiction"],
): readonly string[] {
  void jurisdiction;
  return [
    "Não casado, sem dependentes",
    "Não casado, dois dependentes",
    "Casado, único titular, um dependente",
    "Casado, dois titulares, um dependente",
  ];
}
