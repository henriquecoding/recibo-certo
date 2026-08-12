// ─────────────────────────────────────────────────────────────────────────
//  Adaptador do cenário de vencimento para o Simulador de IRS.
//
//  A ponte anterior era um espelho legado (RC-P1-02): o simulador de
//  vencimento guardava um cenário rico — rubricas variáveis, prémios, horas
//  extra, região, estado civil, deficiência, IRS Jovem — e depois escrevia à
//  parte um registo com salário base, dependentes, subsídio de refeição e
//  duodécimos. Era ESSE registo reduzido que chegava ao IRS. Tudo o resto
//  desaparecia pelo caminho, e um cenário criado noutro dispositivo nunca
//  chegava sequer, porque a ponte era só localStorage.
//
//  Aqui há um adaptador explícito por versão do instantâneo, que funciona
//  igualmente sobre um cenário local ou vindo da nuvem — é o mesmo objeto.
// ─────────────────────────────────────────────────────────────────────────

import { calcularVencimentoAnual } from "@/lib/fiscal-dependente";
import type { Regiao as RegiaoDependente } from "@/lib/fiscal-data";

/** O que o adaptador consegue extrair de um instantâneo de vencimento. */
export interface CenarioVencimentoNormalizado {
  /** Versão do instantâneo de origem. */
  versao: number;
  salarioBase: number;
  dependentes: number;
  subsidioRefeicaoDia: number;
  subsidioRefeicaoCartao: boolean;
  diasUteis: number;
  duodecimos: boolean;
  regiao: RegiaoDependente;
  estadoCivil: string | null;
  deficiencia: boolean;
  irsJovemAno: number | null;
  /** Rubricas variáveis (prémios, horas extra, ajudas de custo…) do mês. */
  rubricasMensais: { tipo: string; valor: number }[];
  /** Total anualizado das rubricas variáveis (12 meses). */
  rubricasAnualizadas: number;
  brutoAnual: number;
  irsAnual: number;
  ssAnual: number;
  /** O que o adaptador NÃO conseguiu aproveitar deste instantâneo. */
  naoImportado: string[];
}

const num = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const REGIOES_DEP: RegiaoDependente[] = ["continente", "madeira", "acores"];

/**
 * Normaliza um instantâneo de cenário de vencimento (qualquer versão).
 *
 * Devolve `null` quando o instantâneo não tem sequer um salário — não vale a
 * pena oferecer uma importação vazia.
 */
export function adaptarCenarioVencimento(dados: Record<string, unknown>): CenarioVencimentoNormalizado | null {
  const versao = typeof dados.version === "number" ? dados.version : typeof dados.__versao === "number" ? dados.__versao : 1;
  const naoImportado: string[] = [];

  // v2 usa `gross`/`target`; o formato antigo usava `salarioBruto`.
  const salarioBase = num(dados.gross ?? dados.salarioBruto);
  if (salarioBase <= 0) return null;

  const mealEnabled = dados.mealEnabled === undefined ? true : !!dados.mealEnabled;
  const subsidioRefeicaoDia = mealEnabled ? num(dados.mealDaily ?? dados.subsidioRefeicaoDia) : 0;
  const diasUteis = Math.max(1, Math.min(31, Math.floor(num(dados.mealDays ?? dados.diasUteis) || 22)));
  const subsidioRefeicaoCartao = !!(dados.mealCard ?? dados.subsidioRefeicaoCartao);
  const dependentes = Math.max(0, Math.floor(num(dados.dependants ?? dados.dependentes)));
  const duodecimos = !!dados.duodecimos;

  const regiaoBruta = typeof dados.region === "string" ? dados.region : "continente";
  const regiao = (REGIOES_DEP.includes(regiaoBruta as RegiaoDependente) ? regiaoBruta : "continente") as RegiaoDependente;

  const estadoCivil = typeof dados.maritalStatus === "string" ? dados.maritalStatus : null;
  const deficiencia = !!dados.disability;
  const irsJovemAno = dados.youthIrs ? Math.max(0, Math.floor(num(dados.youthYear))) : null;

  // ── Rubricas variáveis ────────────────────────────────────────────
  // Prémios, horas extra e ajudas de custo faziam parte do cenário e nunca
  // chegavam ao IRS. Chegam agora, com o total anualizado à parte para quem
  // quiser decidir se são recorrentes.
  const rubricasBrutas = Array.isArray(dados.rubrics) ? dados.rubrics : [];
  const rubricasMensais = rubricasBrutas
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const valor = num(o.amount) + num(o.days) * num(o.dailyAmount);
      return { tipo: typeof o.type === "string" ? o.type : "outro", valor };
    })
    .filter((r) => r.valor > 0);
  const rubricasAnualizadas = rubricasMensais.reduce((s, r) => s + r.valor, 0) * 12;

  // Anualização das rubricas é uma suposição: dizemo-lo em vez de a esconder.
  if (rubricasMensais.length > 0) {
    naoImportado.push(
      "As rubricas variáveis foram anualizadas como se se repetissem todos os meses — confirma se é o teu caso.",
    );
  }
  if (deficiencia) {
    naoImportado.push("A deficiência entra no perfil fiscal, mas confirma o grau no simulador de IRS.");
  }
  if (regiao !== "continente") {
    naoImportado.push(`Região ${regiao}: as tabelas de retenção diferem — confirma o resultado.`);
  }

  const anual = calcularVencimentoAnual({
    salarioBruto: salarioBase,
    dependentes,
    subsidioRefeicaoDia,
    subsidioRefeicaoCartao,
    diasUteis,
    regiao,
  });

  return {
    versao,
    salarioBase,
    dependentes,
    subsidioRefeicaoDia,
    subsidioRefeicaoCartao,
    diasUteis,
    duodecimos,
    regiao,
    estadoCivil,
    deficiencia,
    irsJovemAno,
    rubricasMensais,
    rubricasAnualizadas,
    // O bruto que vai para o IRS inclui as rubricas variáveis anualizadas: o
    // salário base × 14 sozinho não é o rendimento da categoria A.
    brutoAnual: Math.round(anual.brutoAnual + rubricasAnualizadas),
    irsAnual: Math.round(anual.irsAnual),
    ssAnual: Math.round(anual.ssAnual),
    naoImportado,
  };
}
