// ─────────────────────────────────────────────────────────────────────
//  Diagnóstico: preciso de um contabilista? — árvore de decisão.
//  ---------------------------------------------------------------------
//  Analisa o que o utilizador preencheu no simulador guiado (faturação,
//  região, clientes, despesas, forma jurídica, trabalhadores) e devolve um
//  diagnóstico adaptado: nível de necessidade + intervalo de honorários
//  ESTIMADO de mercado + recomendação.
//
//  IMPORTANTE: os limites legais (15 000 € de isenção de IVA, 200 000 € de
//  contabilidade organizada, 25% de coeficiente de despesas no Art. 151.º)
//  vêm de `fiscal-data.ts`. Os intervalos de honorários NÃO são valores
//  fiscais — são ESTIMATIVAS DE MERCADO (variam por gabinete/região) e estão
//  rotulados como tal na UI.
// ─────────────────────────────────────────────────────────────────────

import { IVA_ISENCAO_LIMITE, REGIME_SIMPLIFICADO } from "./fiscal-data";

export const LIMITE_CONTAB_ORGANIZADA = REGIME_SIMPLIFICADO.limite.value; // 200 000 €
export const LIMITE_ISENCAO_IVA = IVA_ISENCAO_LIMITE.value; // 15 000 €
/** Coeficiente de despesas presumidas no regime simplificado (Art. 151.º): 25%. */
export const COEF_DESPESAS_PRESUMIDAS = 0.25;

export type FormaJuridica = "independente" | "sociedade";
export type ClientesAmbito = "nacional" | "internacional";

export interface DiagnosticoInput {
  formaJuridica: FormaJuridica;
  /** Faturação bruta anual (sem IVA). */
  faturacaoAnual: number;
  /** Despesas operacionais anuais reais estimadas. */
  despesasAnuais: number;
  clientes: ClientesAmbito;
  /** Sede/atividade em área metropolitana (Lisboa/Porto). */
  areaMetropolitana: boolean;
  /** Tem trabalhadores a cargo. */
  trabalhadores: boolean;
}

export type NivelContabilista =
  | "obrigatorio"
  | "muito_recomendado"
  | "recomendado"
  | "opcional"
  | "autonomo";

export interface DiagnosticoContabilista {
  nivel: NivelContabilista;
  /** Rótulo curto do nível. */
  rotulo: string;
  titulo: string;
  mensagem: string;
  /** Intervalo de honorários estimado (mensal, salvo `pontual`). */
  avencaMin: number;
  avencaMax: number;
  /** Quando true, o intervalo é um custo único (consulta), não mensal. */
  pontual: boolean;
  /** Modelo sugerido (avença, consulta, etc.). */
  modelo: string;
  /** Razões concretas que sustentam o diagnóstico. */
  motivos: string[];
  /** Despesas necessárias para esgotar a dedução automática (Art. 151.º). */
  despesasNecessarias: number;
}

const ROTULOS: Record<NivelContabilista, string> = {
  obrigatorio: "Obrigatório por lei",
  muito_recomendado: "Muito recomendado",
  recomendado: "Recomendado",
  opcional: "Opcional",
  autonomo: "Podes gerir sozinho",
};

/** Diagnóstico principal (árvore de decisão da análise de custos). */
export function diagnosticoContabilista(input: DiagnosticoInput): DiagnosticoContabilista {
  const Y = Math.max(0, input.faturacaoAnual);
  const D = Math.max(0, input.despesasAnuais);
  const limiar25 = Y * COEF_DESPESAS_PRESUMIDAS;
  // Dedução automática equivalente à específica do trabalho dependente (4 104 €).
  const despesasNecessarias = Math.max(0, limiar25 - 4104);
  const metro = input.areaMetropolitana;

  // 1) Sociedade → contabilidade organizada obrigatória, sempre.
  if (input.formaJuridica === "sociedade") {
    return {
      nivel: "obrigatorio",
      rotulo: ROTULOS.obrigatorio,
      titulo: "Necessidade legal imediata",
      mensagem:
        "A constituição de uma sociedade comercial exige a nomeação de um Contabilista Certificado logo no início de atividade. Formaliza um contrato de prestação de serviços (com seguro de responsabilidade civil ativo) antes de submeter a declaração de início.",
      avencaMin: metro ? 150 : 120,
      avencaMax: metro ? 250 : 180,
      pontual: false,
      modelo: "Avença mensal (contabilidade organizada)",
      motivos: ["Sociedade comercial — contabilidade organizada obrigatória", "Necessário CC inscrito na OCC para assinar as declarações"],
      despesasNecessarias,
    };
  }

  // 2) Independente acima do limite do regime simplificado.
  if (Y >= LIMITE_CONTAB_ORGANIZADA) {
    return {
      nivel: "obrigatorio",
      rotulo: ROTULOS.obrigatorio,
      titulo: "Obrigatório pelo volume de negócios",
      mensagem: `A faturação estimada (${eur(Y)}) coloca-te no enquadramento obrigatório de Contabilidade Organizada. É imperativo contratar um CC inscrito na OCC para assinar as declarações periódicas e o IRS.`,
      avencaMin: 130,
      avencaMax: 180,
      pontual: false,
      modelo: "Avença mensal (contabilidade organizada)",
      motivos: [`Faturação ≥ ${eur(LIMITE_CONTAB_ORGANIZADA)} (limite do regime simplificado)`],
      despesasNecessarias,
    };
  }

  // 3) Clientes internacionais → complexidade de IVA (VIES, recapitulativas).
  if (input.clientes === "internacional") {
    return {
      nivel: "muito_recomendado",
      rotulo: ROTULOS.muito_recomendado,
      titulo: "Muito recomendado — complexidade de IVA",
      mensagem:
        "Transações intracomunitárias ou exportações exigem o controlo do sistema VIES e Declarações Recapitulativas de IVA. O apoio de um contabilista evita erros declarativos e coimas — frequentemente mais caras do que a avença.",
      avencaMin: 60,
      avencaMax: 120,
      pontual: false,
      modelo: "Avença mensal (digital ou presencial)",
      motivos: ["Clientes internacionais — VIES e Declarações Recapitulativas", "Regras de localização e isenções à exportação (Art. 6.º e 14.º CIVA)"],
      despesasNecessarias,
    };
  }

  // 4) Despesas reais acima da dedução presumida de 25% → vale a pena organizar.
  if (D > limiar25 && Y > 0) {
    return {
      nivel: "recomendado",
      rotulo: ROTULOS.recomendado,
      titulo: "Vantagem fiscal em organizar a contabilidade",
      mensagem: `As tuas despesas reais estimadas (${eur(D)}) superam a dedução automática de 25% (${eur(limiar25)}) do regime simplificado. Passar por opção a Contabilidade Organizada, com um CC, reduz a matéria coletável — e a poupança de IRS costuma compensar a avença.`,
      avencaMin: 110,
      avencaMax: 150,
      pontual: false,
      modelo: "Avença mensal (contabilidade organizada por opção)",
      motivos: [`Despesas reais (${eur(D)}) > 25% da faturação (${eur(limiar25)})`],
      despesasNecessarias,
    };
  }

  // 5) Acima da isenção de IVA mas dentro do simplificado, clientes nacionais.
  if (Y >= LIMITE_ISENCAO_IVA) {
    return {
      nivel: "opcional",
      rotulo: ROTULOS.opcional,
      titulo: "Apoio de gestão opcional",
      mensagem: `Estás no regime simplificado e sujeito a IVA (faturação acima de ${eur(LIMITE_ISENCAO_IVA)}). Podes gerir as Declarações Periódicas de IVA e o e-fatura sozinho, mas uma avença básica traz segurança declarativa e poupa tempo.`,
      avencaMin: 50,
      avencaMax: 80,
      pontual: false,
      modelo: "Avença mensal básica (opcional)",
      motivos: [`Sujeito a IVA (faturação ≥ ${eur(LIMITE_ISENCAO_IVA)})`, "Declarações Periódicas de IVA e validação do e-fatura"],
      despesasNecessarias,
    };
  }

  // 6) Abaixo da isenção de IVA, clientes nacionais, despesas simples.
  return {
    nivel: "autonomo",
    rotulo: ROTULOS.autonomo,
    titulo: "Gestão autónoma recomendada",
    mensagem: `Beneficias de isenção de IVA (Art. 53.º — abaixo de ${eur(LIMITE_ISENCAO_IVA)}) e tens uma estrutura de despesas simples. Podes usar o ReciboCerto para emitir faturas e submeter o IRS. Sugerimos apenas uma consulta inicial para validar o enquadramento.`,
    avencaMin: 40,
    avencaMax: 80,
    pontual: true,
    modelo: "Consulta pontual (custo único)",
    motivos: [`Isento de IVA (faturação < ${eur(LIMITE_ISENCAO_IVA)})`, "Despesas dentro dos 25% presumidos", "Operações nacionais"],
    despesasNecessarias,
  };
}

function eur(n: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );
}

/** Tabela de referência de honorários por perfil (estimativas de mercado). */
export interface PerfilHonorario {
  perfil: string;
  regime: string;
  complexidade: string;
  min: number;
  max: number;
  pontual?: boolean;
  inclui: string;
}

export const TABELA_HONORARIOS: PerfilHonorario[] = [
  {
    perfil: "Freelancer / TI inicial",
    regime: "Simplificado (isento de IVA · Art. 53.º)",
    complexidade: "< 5 documentos/mês · só nacional",
    min: 30,
    max: 60,
    inclui: "Abertura de atividade, e-fatura, dúvidas de IRS",
  },
  {
    perfil: "Freelancer com operações internacionais",
    regime: "Simplificado (com IVA · UE)",
    complexidade: "5–30 faturas/mês · VIES",
    min: 60,
    max: 120,
    inclui: "IVA (trimestral), recapitulativas, SS, Anexo B",
  },
  {
    perfil: "Independente · contabilidade organizada",
    regime: "Contabilidade organizada (opcional/obrigatória)",
    complexidade: "< 50 documentos/mês",
    min: 120,
    max: 180,
    inclui: "Despesas reais, reconciliação, Anexo C",
  },
  {
    perfil: "Microempresa / Unipessoal Lda.",
    regime: "Contabilidade organizada (obrigatória)",
    complexidade: "< 50 docs/mês · 1 gerente",
    min: 130,
    max: 200,
    inclui: "Salários, retenções, IRC (Modelo 22), IVA, IES",
  },
  {
    perfil: "Pequena empresa (Lda.)",
    regime: "Contabilidade organizada (obrigatória)",
    complexidade: "50–150 docs/mês · 2–5 trabalhadores",
    min: 200,
    max: 350,
    inclui: "Folha de pagamentos, conciliação, IVA, fecho",
  },
];
