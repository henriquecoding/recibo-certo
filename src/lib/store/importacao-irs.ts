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
import { adaptarCenarioVencimento } from "@/lib/store/cenario-vencimento-adaptador";
import type { Cenario } from "@/lib/store/cenarios";

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
  /**
   * Rendimento anual da Cat. A a englobar. Opcional para não invalidar os
   * instantâneos já gravados no `localStorage` de quem usou o simulador antes
   * de o campo existir.
   */
  outrosRendimentos?: number;
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
/**
 * Instantâneo COMPLETO do último cenário de vencimento — o mesmo objeto que
 * vai para a store de cenários. Substitui `recibocerto:vencimentos:v1`, o
 * espelho legado que reduzia o cenário a quatro campos (RC-P1-02).
 */
const KEY_VENC = "recibocerto:cenario-vencimento:v2";

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

/**
 * Constrói a fonte de importação a partir de um instantâneo de vencimento.
 *
 * Funciona igual para um cenário local e para um vindo da nuvem: é o mesmo
 * objeto. A ponte anterior só existia em localStorage, por isso um cenário
 * criado no telemóvel nunca chegava ao IRS no portátil.
 */
export function fonteDeVencimento(dados: Record<string, unknown>, nome?: string): FonteImportacao | null {
  const v = adaptarCenarioVencimento(dados);
  if (!v) return null;

  const detalhes = [
    `Bruto anual (14 meses + variáveis) ${euros(v.brutoAnual)}`,
    `Retenção de IRS anual ${euros(v.irsAnual)}`,
    `Segurança Social anual ${euros(v.ssAnual)}`,
  ];
  if (v.dependentes > 0) detalhes.push(`${v.dependentes} dependente(s)`);
  if (v.rubricasAnualizadas > 0) detalhes.push(`Rubricas variáveis ${euros(v.rubricasAnualizadas)}/ano`);
  if (v.irsJovemAno !== null) detalhes.push(`IRS Jovem (${v.irsJovemAno}.º ano)`);
  if (v.estadoCivil) detalhes.push(`Estado civil: ${v.estadoCivil}`);
  if (v.regiao !== "continente") detalhes.push(`Região: ${v.regiao}`);
  if (v.deficiencia) detalhes.push("Deficiência declarada");
  // O que NÃO foi importado é dito, em vez de desaparecer em silêncio.
  detalhes.push(...v.naoImportado.map((n) => `Nota: ${n}`));

  return {
    id: "vencimento",
    titulo: "Recibo de vencimento",
    descricao: nome ? `Cenário «${nome}» do simulador de vencimento.` : "O teu último cenário de vencimento simulado.",
    icone: "Briefcase",
    detalhes,
    patch: {
      ativar: ["salarios"],
      salBruto: v.brutoAnual,
      salRet: v.irsAnual,
      dependentesCount: v.dependentes || undefined,
      deficiencia: v.deficiencia || undefined,
    },
  };
}

/** Grava o instantâneo completo do cenário de vencimento para o IRS o ler. */
export const gravarCenarioVencimento = (snapshot: Record<string, unknown>) => gravarJSON(KEY_VENC, snapshot);

/**
 * As fontes que vêm dos cenários guardados na NUVEM. A página do simulador
 * passa-as; sem isto, um cenário criado noutro dispositivo não chegava ao IRS.
 */
export function fontesDeCenarios(cenarios: Cenario[]): FonteImportacao[] {
  const venc = cenarios.find((c) => c.tipo === "vencimento");
  if (!venc) return [];
  const f = fonteDeVencimento(venc.dados, venc.nome);
  return f ? [{ ...f, id: `vencimento-nuvem-${venc.id}` }] : [];
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
    // O salário da acumulação faz parte do cenário: sem ele, o Simulador de IRS
    // recebia a Categoria B sozinha e voltava a tributá-la desde o 1.º escalão.
    const salarioCatA = rv.acumulaEmprego ? (rv.outrosRendimentos ?? 0) : 0;
    if (salarioCatA > 0) detalhes.push(`Salário anual (Cat. A) ${euros(salarioCatA)}`);
    fontes.push({
      id: "recibos-verdes-guiado",
      titulo: "Calculadora de recibos verdes",
      descricao: "O cenário que simulaste na calculadora guiada de recibos verdes.",
      icone: "Invoice",
      detalhes,
      patch: {
        ativar: salarioCatA > 0 ? ["independente", "salarios"] : ["independente"],
        salBruto: salarioCatA || undefined,
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

  // 2. Recibo de vencimento — instantâneo COMPLETO, local ou da nuvem.
  const dadosVenc = lerJSON<Record<string, unknown>>(KEY_VENC);
  const fonteVenc = dadosVenc ? fonteDeVencimento(dadosVenc) : null;
  if (fonteVenc) fontes.push(fonteVenc);

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
