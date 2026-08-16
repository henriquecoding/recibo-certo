/**
 * Máquina de estados da Fidelidade V2 — função pura.
 *
 * A base de dados é a garantia (índices únicos parciais + RPCs
 * transacionais). Esta camada existe para ser lida, testada e usada
 * pela UI para prever o que vai acontecer antes de acontecer.
 *
 * Relatório Mestre §15, §20.
 *
 *   SEM CICLO ──consulta elegível──▶ CARTÃO ATIVO ──último carimbo──▶
 *   BENEFÍCIO PENDENTE ──resgate──▶ SEM CICLO (regra mais recente)
 *
 * Invariante que nunca pode ser violada: não coexistem um benefício por
 * usar e um cartão novo a acumular carimbos.
 */

export type EstadoCiclo = "sem_ciclo" | "cartao_ativo" | "beneficio_pendente";

export interface RegraFidelidade {
  id: string;
  versao: number;
  meta: number;            // 3..12
  descontoPct: number;     // 10..50
  exigePagamento: boolean;
  ativa: boolean;
}

export interface Ciclo {
  estado: EstadoCiclo;
  carimbos: number;
  regra: RegraFidelidade | null;
  /** Código do benefício por usar, quando estado = beneficio_pendente. */
  beneficioCodigo?: string;
}

export interface ConsultaConcluida {
  agendamentoId: string;
  precoCents: number;
  compareceu: boolean;
  /** Preenchido quando o contabilista aplica o benefício nesta consulta. */
  resgataBeneficio?: boolean;
}

export type EfeitoFidelidade =
  | { tipo: "nada"; motivo: "nao_compareceu" | "fidelidade_inativa" | "consulta_nao_elegivel" | "beneficio_pendente" }
  | { tipo: "abre_cartao_e_carimba"; regra: RegraFidelidade; carimbos: 1 }
  | { tipo: "carimba"; carimbos: number }
  | { tipo: "completa_e_emite_beneficio"; descontoPct: number }
  | { tipo: "resgata_beneficio"; descontoPct: number; baseCents: number; descontoCents: number; finalCents: number };

export interface Transicao {
  proximo: Ciclo;
  efeito: EfeitoFidelidade;
}

/** Desconto sobre o preço REAL da consulta. Tudo em cêntimos, sempre. */
export function calcularDesconto(precoCents: number, pct: number): {
  descontoCents: number; finalCents: number;
} {
  const descontoCents = Math.round((precoCents * pct) / 100);
  return { descontoCents, finalCents: precoCents - descontoCents };
}

export function aplicarConsulta(
  ciclo: Ciclo,
  consulta: ConsultaConcluida,
  regraCorrente: RegraFidelidade | null,
): Transicao {
  if (!consulta.compareceu) {
    return { proximo: ciclo, efeito: { tipo: "nada", motivo: "nao_compareceu" } };
  }

  // Resgate: encerra o ciclo anterior e — de propósito — NÃO carimba o
  // seguinte. Uma consulta não pode ser simultaneamente o prémio de um
  // ciclo e o primeiro passo do próximo (§20).
  if (consulta.resgataBeneficio && ciclo.estado === "beneficio_pendente" && ciclo.regra) {
    const { descontoCents, finalCents } = calcularDesconto(consulta.precoCents, ciclo.regra.descontoPct);
    return {
      proximo: { estado: "sem_ciclo", carimbos: 0, regra: null },
      efeito: {
        tipo: "resgata_beneficio",
        descontoPct: ciclo.regra.descontoPct,
        baseCents: consulta.precoCents,
        descontoCents,
        finalCents,
      },
    };
  }

  if (ciclo.estado === "beneficio_pendente") {
    return { proximo: ciclo, efeito: { tipo: "nada", motivo: "beneficio_pendente" } };
  }

  if (ciclo.estado === "cartao_ativo" && ciclo.regra) {
    // Elegibilidade segue a regra CONGELADA no cartão, não a corrente.
    if (ciclo.regra.exigePagamento && consulta.precoCents <= 0) {
      return { proximo: ciclo, efeito: { tipo: "nada", motivo: "consulta_nao_elegivel" } };
    }
    const carimbos = ciclo.carimbos + 1;
    if (carimbos < ciclo.regra.meta) {
      return {
        proximo: { ...ciclo, carimbos },
        efeito: { tipo: "carimba", carimbos },
      };
    }
    return {
      proximo: { estado: "beneficio_pendente", carimbos: ciclo.regra.meta, regra: ciclo.regra },
      efeito: { tipo: "completa_e_emite_beneficio", descontoPct: ciclo.regra.descontoPct },
    };
  }

  // sem_ciclo: o cartão novo nasce com a regra MAIS RECENTE.
  if (!regraCorrente || !regraCorrente.ativa) {
    return { proximo: ciclo, efeito: { tipo: "nada", motivo: "fidelidade_inativa" } };
  }
  if (regraCorrente.exigePagamento && consulta.precoCents <= 0) {
    return { proximo: ciclo, efeito: { tipo: "nada", motivo: "consulta_nao_elegivel" } };
  }
  if (regraCorrente.meta === 1) {
    return {
      proximo: { estado: "beneficio_pendente", carimbos: 1, regra: regraCorrente },
      efeito: { tipo: "completa_e_emite_beneficio", descontoPct: regraCorrente.descontoPct },
    };
  }
  return {
    proximo: { estado: "cartao_ativo", carimbos: 1, regra: regraCorrente },
    efeito: { tipo: "abre_cartao_e_carimba", regra: regraCorrente, carimbos: 1 },
  };
}

/** Texto que o cliente vê. Nunca inventa um valor em euros (§137). */
export function copyPublicaFidelidade(regra: RegraFidelidade | null): string | null {
  if (!regra || !regra.ativa) return null;
  return `Ao completar ${regra.meta} serviços elegíveis, recebes ${regra.descontoPct}% de desconto numa consulta elegível futura.`;
}

/** Texto do cartão do lado do contabilista, por estado. */
export function copyEstadoCiclo(ciclo: Ciclo): string {
  switch (ciclo.estado) {
    case "sem_ciclo":
      return "Ainda sem cartão. O próximo serviço elegível abre um ciclo com a regra atual.";
    case "cartao_ativo":
      return ciclo.regra
        ? `${ciclo.carimbos} de ${ciclo.regra.meta} · ${ciclo.regra.descontoPct}% ao completar`
        : `${ciclo.carimbos} carimbos`;
    case "beneficio_pendente":
      return ciclo.regra
        ? `Benefício por usar: ${ciclo.regra.descontoPct}% na próxima consulta elegível. A nova regra só entra depois de o cliente o usar.`
        : "Benefício por usar.";
  }
}
