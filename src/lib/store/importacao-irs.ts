"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Importação para o Simulador de IRS — ponte entre os vários simuladores.
//
//  Os simuladores guiados (Calculadora de recibos verdes, Abrir empresa) e o
//  simulador de Recibo de vencimento guardam um instantâneo normalizado dos
//  seus dados aqui. O Simulador de IRS lê todas as fontes disponíveis e oferece
//  preencher automaticamente os campos correspondentes — para o utilizador não
//  ter de reintroduzir o que já calculou noutro lado.
//
//  Tudo local (localStorage), sem rede. Cada fonte descreve o que preenche.
// ─────────────────────────────────────────────────────────────────────────

import type { TipoAtividade } from "@/lib/fiscal-data";
import type { RendimentoId } from "@/lib/irs-guiado";
import { lerPreferenciasFiscais } from "@/lib/store/preferencias-fiscais";
import { calcularVencimentoAnual } from "@/lib/fiscal-dependente";

// ─── Patch normalizado aplicável ao estado do Simulador de IRS ──────────────
export interface PatchImportacao {
  // Agregado
  conjunta?: boolean;
  deficiencia?: boolean;
  ifici?: boolean;
  dependentesCount?: number;
  // Módulos a abrir
  ativar?: RendimentoId[];
  // Trabalho independente (cat. B)
  atividadeTipo?: TipoAtividade;
  indBruto?: number;
  indRet?: number;
  indRegime?: "simplificado" | "organizada";
  indAno?: number;
  indJovem?: number;
  indDespesas?: number;
  indIsencaoSS?: boolean;
  indAcumula?: boolean;
  // Trabalho dependente (cat. A)
  salBruto?: number;
  salRet?: number;
  salEntidade?: string;
  // Capitais (cat. E)
  dividendos?: number;
  // Deduções (Anexo H)
  saude?: number;
  educacao?: number;
  gerais?: number;
  rendasDed?: number;
}

export interface FonteImportacao {
  id: string;
  titulo: string;
  descricao: string;
  /** Identificador do ícone (mapeado na UI). */
  icone: string;
  /** Linhas com o detalhe do que será preenchido (legíveis). */
  detalhes: string[];
  patch: PatchImportacao;
}

// ─── Instantâneo: Calculadora de recibos verdes (ModoGuiado) ────────────────
export interface ExportRecibosVerdes {
  faturacaoAnual: number;
  tipoAtividade: TipoAtividade;
  anoAtividade: number;
  regimeContabilidade: "simplificado" | "organizada";
  irsJovemAno: number;
  acumulaEmprego: boolean;
  isencaoSSPrimeiroAno: boolean;
  ifici: boolean;
  deficiencia: boolean;
  despSaude: number;
  despEducacao: number;
  despGerais: number;
  despRendas: number;
  atualizadoEm: number;
}

// ─── Instantâneo: Abrir empresa (ModoGuiadoEmpresa) ─────────────────────────
export interface ExportEmpresa {
  faturacao: number;
  salarioGerenteAnual: number;
  dividendosLiquidos: number;
  atualizadoEm: number;
}

const KEY_RV = "recibocerto:export-recibos-verdes:v1";
const KEY_EMP = "recibocerto:export-empresa:v1";
const KEY_VENC = "recibocerto:vencimentos:v1";

function lerJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function gravarJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage indisponível */
  }
}

export const gravarExportRecibosVerdes = (s: ExportRecibosVerdes) => gravarJSON(KEY_RV, s);
export const gravarExportEmpresa = (s: ExportEmpresa) => gravarJSON(KEY_EMP, s);

const euros = (n: number) =>
  `${Math.round(n).toLocaleString("pt-PT")} €`;

// ─── Cenário de vencimento (mesmo formato do store de vencimentos) ──────────
interface CenarioVencimentoMin {
  nome?: string;
  salarioBruto: number;
  dependentes: number;
  subsidioRefeicaoDia: number;
  subsidioRefeicaoCartao: boolean;
  diasUteis: number;
}

/**
 * Reúne todas as fontes de importação disponíveis no armazenamento local
 * (exceto os recibos verdes registados, que vêm do hook `useRecibos` na
 * página). Cada fonte só aparece se tiver dados úteis.
 */
export function fontesDeArmazenamento(): FonteImportacao[] {
  const fontes: FonteImportacao[] = [];

  // 1. Calculadora de recibos verdes (simulador guiado)
  const rv = lerJSON<ExportRecibosVerdes>(KEY_RV);
  if (rv && rv.faturacaoAnual > 0) {
    const detalhes = [`Faturação anual ${euros(rv.faturacaoAnual)}`];
    if (rv.irsJovemAno > 0) detalhes.push(`IRS Jovem (${rv.irsJovemAno}.º ano)`);
    detalhes.push(rv.regimeContabilidade === "organizada" ? "Contabilidade organizada" : "Regime simplificado");
    const ded = rv.despSaude + rv.despEducacao + rv.despGerais + rv.despRendas;
    if (ded > 0) detalhes.push(`Deduções de despesas ${euros(ded)}`);
    fontes.push({
      id: "recibos-verdes-guiado",
      titulo: "Calculadora de recibos verdes",
      descricao: "O cenário que simulaste na calculadora guiada de recibos verdes.",
      icone: "Invoice",
      detalhes,
      patch: {
        ativar: ["independente"],
        atividadeTipo: rv.tipoAtividade,
        indBruto: Math.round(rv.faturacaoAnual),
        indRegime: rv.regimeContabilidade,
        indAno: rv.anoAtividade,
        indJovem: rv.irsJovemAno,
        indIsencaoSS: rv.isencaoSSPrimeiroAno,
        indAcumula: rv.acumulaEmprego,
        ifici: rv.ifici,
        deficiencia: rv.deficiencia,
        saude: rv.despSaude || undefined,
        educacao: rv.despEducacao || undefined,
        gerais: rv.despGerais || undefined,
        rendasDed: rv.despRendas || undefined,
      },
    });
  }

  // 2. Recibo de vencimento (cenário mais recente guardado)
  const cenarios = lerJSON<CenarioVencimentoMin[]>(KEY_VENC);
  if (Array.isArray(cenarios) && cenarios.length > 0 && cenarios[0]?.salarioBruto > 0) {
    const c = cenarios[0];
    const anual = calcularVencimentoAnual({
      salarioBruto: c.salarioBruto,
      dependentes: c.dependentes,
      subsidioRefeicaoDia: c.subsidioRefeicaoDia,
      subsidioRefeicaoCartao: c.subsidioRefeicaoCartao,
      diasUteis: c.diasUteis,
    });
    fontes.push({
      id: "vencimento",
      titulo: "Recibo de vencimento",
      descricao: c.nome ? `Cenário «${c.nome}» do simulador de vencimento.` : "O teu último cenário de vencimento simulado.",
      icone: "Briefcase",
      detalhes: [
        `Bruto anual (14 meses) ${euros(anual.brutoAnual)}`,
        `Retenção de IRS anual ${euros(anual.irsAnual)}`,
        ...(c.dependentes > 0 ? [`${c.dependentes} dependente(s)`] : []),
      ],
      patch: {
        ativar: ["salarios"],
        salBruto: Math.round(anual.brutoAnual),
        salRet: Math.round(anual.irsAnual),
        dependentesCount: c.dependentes || undefined,
      },
    });
  }

  // 3. Abrir empresa (gerente: salário cat. A + dividendos cat. E)
  const emp = lerJSON<ExportEmpresa>(KEY_EMP);
  if (emp && (emp.salarioGerenteAnual > 0 || emp.dividendosLiquidos > 0)) {
    const detalhes: string[] = [];
    if (emp.salarioGerenteAnual > 0) detalhes.push(`Salário de gerência ${euros(emp.salarioGerenteAnual)}/ano`);
    if (emp.dividendosLiquidos > 0) detalhes.push(`Dividendos ${euros(emp.dividendosLiquidos)}`);
    const ativar: RendimentoId[] = [];
    if (emp.salarioGerenteAnual > 0) ativar.push("salarios");
    if (emp.dividendosLiquidos > 0) ativar.push("capitais");
    fontes.push({
      id: "empresa",
      titulo: "Abrir empresa",
      descricao: "Remuneração de gerência e dividendos do cenário de sociedade.",
      icone: "Building",
      detalhes,
      patch: {
        ativar,
        salBruto: emp.salarioGerenteAnual > 0 ? Math.round(emp.salarioGerenteAnual) : undefined,
        salEntidade: emp.salarioGerenteAnual > 0 ? "Sociedade (gerência)" : undefined,
        dividendos: emp.dividendosLiquidos > 0 ? Math.round(emp.dividendosLiquidos) : undefined,
      },
    });
  }

  // 4. Preferências fiscais (regime, agregado, deduções partilhadas)
  const prefs = lerPreferenciasFiscais();
  const temPrefs =
    prefs.conjunta || prefs.dependentes > 0 || prefs.deficiencia || prefs.ifici ||
    prefs.despSaude > 0 || prefs.despEducacao > 0 || prefs.despGerais > 0 || prefs.despRendas > 0 ||
    prefs.irsJovemAno > 0 || prefs.regimeContabilidade === "organizada" || prefs.despesasJustificadas > 0;
  if (temPrefs) {
    const detalhes: string[] = [];
    if (prefs.conjunta) detalhes.push("Tributação conjunta");
    if (prefs.dependentes > 0) detalhes.push(`${prefs.dependentes} dependente(s)`);
    if (prefs.irsJovemAno > 0) detalhes.push(`IRS Jovem (${prefs.irsJovemAno}.º ano)`);
    const ded = prefs.despSaude + prefs.despEducacao + prefs.despGerais + prefs.despRendas;
    if (ded > 0) detalhes.push(`Deduções de despesas ${euros(ded)}`);
    if (prefs.deficiencia) detalhes.push("Deficiência ≥ 60%");
    fontes.push({
      id: "preferencias",
      titulo: "Preferências fiscais",
      descricao: "Regime, agregado e deduções que definiste e são reutilizados nos simuladores.",
      icone: "Settings",
      detalhes: detalhes.length > 0 ? detalhes : ["Regime e parâmetros fiscais guardados"],
      patch: {
        conjunta: prefs.conjunta || undefined,
        deficiencia: prefs.deficiencia || undefined,
        ifici: prefs.ifici || undefined,
        dependentesCount: prefs.dependentes || undefined,
        indRegime: prefs.regimeContabilidade,
        indAno: prefs.anoAtividade,
        indJovem: prefs.irsJovemAno || undefined,
        indDespesas: prefs.despesasJustificadas || undefined,
        indIsencaoSS: prefs.isencaoSSPrimeiroAno || undefined,
        indAcumula: prefs.acumulaEmprego || undefined,
        saude: prefs.despSaude || undefined,
        educacao: prefs.despEducacao || undefined,
        gerais: prefs.despGerais || undefined,
        rendasDed: prefs.despRendas || undefined,
      },
    });
  }

  return fontes;
}
