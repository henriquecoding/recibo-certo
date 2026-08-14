"use client";

// ─────────────────────────────────────────────────────────────────────
//  Repositório de cenários do simulador de vencimento — MODO DUPLO + TIER.
//  · Grátis (anónimo ou sem Pro) → localStorage, até LIMITE_FREE cenários.
//  · Pro (com sessão + subscrição) → tabela `recibos_vencimento` (nuvem,
//    histórico ilimitado e sincronizado entre dispositivos).
//  A interface (`useVencimentos`) é a mesma nos dois modos.
// ─────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import { calcularVencimento, calcularVencimentoAnual } from "@/lib/fiscal-dependente";
import {
  data,
  dinheiro,
  escreverCSV,
  numero,
  texto,
  type DialetoCSV,
  type TabelaCSV,
} from "@/lib/export/csv";
import { arredondar } from "@/lib/export/dinheiro";
import { chaveAtiva } from "./cofre";
import { destinoDosDados, aindaSemDestino } from "./persistencia";

export interface CenarioVencimento {
  id: string;
  nome?: string;
  salarioBruto: number;
  dependentes: number;
  subsidioRefeicaoDia: number;
  subsidioRefeicaoCartao: boolean;
  diasUteis: number;
  duodecimos: boolean;
  /** ISO timestamp. */
  criadoEm: string;
}

export type NovoCenario = Omit<CenarioVencimento, "id" | "criadoEm">;

/** Limite de cenários guardados no plano grátis (local). Pro é ilimitado. */
export const LIMITE_FREE = 3;

// A chave já não é uma constante: depende de quem está a usar o browser.
// Enquanto era global, quem entrasse a seguir noutra conta via os dados de
// quem entrou antes — ver `store/cofre.ts`.
const STORAGE_KEY = () => chaveAtiva("vencimentos");

// ─── localStorage ──────────────────────────────────────────────────────
function readLocal(): CenarioVencimento[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CenarioVencimento[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(xs: CenarioVencimento[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY(), JSON.stringify(xs));
  } catch {
    /* quota excedida / storage indisponível — ignora */
  }
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const ordenar = (xs: CenarioVencimento[]) =>
  [...xs].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

// ─── Exportação CSV (Pro) ────────────────────────────────────────────────
// Uma tabela, um cabeçalho. O preâmbulo de quatro linhas com fonte e data que
// existia por cima do cabeçalho fazia com que nenhuma ferramenta importasse o
// ficheiro — a proveniência vive no PDF e no separador de verificação do XLSX,
// não a meio de uma tabela.

const COLUNAS_CENARIOS = [
  { codigo: "cenario", rotulo: "Cenário" },
  { codigo: "salario_bruto_eur", rotulo: "Salário bruto (€)" },
  { codigo: "dependentes", rotulo: "Dependentes" },
  { codigo: "situacao", rotulo: "Situação" },
  { codigo: "subsidio_refeicao_dia_eur", rotulo: "Subsídio refeição/dia (€)" },
  { codigo: "subsidio_refeicao_forma", rotulo: "Forma" },
  { codigo: "dias_uteis", rotulo: "Dias úteis" },
  { codigo: "duodecimos", rotulo: "Subsídios em duodécimos" },
  { codigo: "subsidio_refeicao_mes_eur", rotulo: "Subsídio refeição/mês (€)" },
  { codigo: "subsidio_refeicao_isento_mes_eur", rotulo: "Subsídio isento/mês (€)" },
  { codigo: "seguranca_social_mes_eur", rotulo: "Segurança Social/mês (€)" },
  { codigo: "retencao_irs_mes_eur", rotulo: "Retenção IRS/mês (€)" },
  { codigo: "liquido_mes_eur", rotulo: "Vencimento líquido/mês (€)" },
  { codigo: "taxa_efetiva", rotulo: "Taxa efetiva" },
  { codigo: "custo_empresa_mes_eur", rotulo: "Custo p/ empresa/mês (€)" },
  { codigo: "bruto_anual_eur", rotulo: "Bruto anual (€)" },
  { codigo: "subsidio_ferias_eur", rotulo: "Subsídio de férias (€)" },
  { codigo: "subsidio_natal_eur", rotulo: "Subsídio de Natal (€)" },
  { codigo: "irs_anual_eur", rotulo: "IRS anual (€)" },
  { codigo: "seguranca_social_anual_eur", rotulo: "Segurança Social anual (€)" },
  { codigo: "liquido_anual_eur", rotulo: "Líquido anual (€)" },
  { codigo: "liquido_medio_mes_eur", rotulo: "Líquido médio/mês (€)" },
  { codigo: "criado_em", rotulo: "Criado em" },
] as const;

/** Tabela dos cenários com a decomposição mensal e anual recalculada pelos motores. */
export function tabelaCenarios(cenarios: CenarioVencimento[]): TabelaCSV {
  return {
    colunas: COLUNAS_CENARIOS,
    linhas: cenarios.map((c) => {
      const args = {
        salarioBruto: c.salarioBruto,
        dependentes: c.dependentes,
        subsidioRefeicaoDia: c.subsidioRefeicaoDia,
        subsidioRefeicaoCartao: c.subsidioRefeicaoCartao,
        diasUteis: c.diasUteis,
      };
      const m = calcularVencimento(args);
      const a = calcularVencimentoAnual(args);
      return [
        texto(c.nome ?? "(sem nome)"),
        dinheiro(c.salarioBruto),
        numero(c.dependentes),
        texto("Não casado"),
        dinheiro(c.subsidioRefeicaoDia),
        texto(c.subsidioRefeicaoDia > 0 ? (c.subsidioRefeicaoCartao ? "Cartão" : "Dinheiro") : ""),
        numero(c.diasUteis),
        texto(c.duodecimos ? "Sim" : "Não"),
        dinheiro(m.subsidioRefeicaoTotal),
        dinheiro(m.subsidioRefeicaoIsento),
        dinheiro(m.ssTrabalhador),
        dinheiro(m.irsRetido),
        dinheiro(m.liquido),
        // Fração, não texto com «%»: assim a coluna continua a ser numérica.
        numero(arredondar(m.taxaEfetiva, 4)),
        dinheiro(m.custoEmpresa),
        dinheiro(a.brutoAnual),
        dinheiro(a.subsidioFerias),
        dinheiro(a.subsidioNatal),
        dinheiro(a.irsAnual),
        dinheiro(a.ssAnual),
        dinheiro(a.liquidoAnual),
        dinheiro(a.liquidoMedioMes),
        data(c.criadoEm),
      ];
    }),
  };
}

/** CSV detalhado dos cenários, no dialeto pedido (default: humano/Excel pt-PT). */
export function gerarCSVCenarios(cenarios: CenarioVencimento[], dialeto: DialetoCSV = "humano"): string {
  return escreverCSV(tabelaCenarios(cenarios), { dialeto });
}

// ─── Mapeamento Supabase ────────────────────────────────────────────────
interface CenarioRow {
  id: string;
  nome: string | null;
  salario_bruto: number | string;
  dependentes: number;
  subsidio_refeicao_dia: number | string;
  subsidio_refeicao_cartao: boolean;
  dias_uteis: number;
  duodecimos: boolean;
  criado_em: string;
}

function fromRow(r: CenarioRow): CenarioVencimento {
  return {
    id: r.id,
    nome: r.nome ?? undefined,
    salarioBruto: Number(r.salario_bruto) || 0,
    dependentes: r.dependentes ?? 0,
    subsidioRefeicaoDia: Number(r.subsidio_refeicao_dia) || 0,
    subsidioRefeicaoCartao: !!r.subsidio_refeicao_cartao,
    diasUteis: r.dias_uteis ?? 22,
    duodecimos: !!r.duodecimos,
    criadoEm: r.criado_em,
  };
}

function toRow(c: CenarioVencimento, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    nome: c.nome ?? null,
    salario_bruto: c.salarioBruto,
    dependentes: c.dependentes,
    subsidio_refeicao_dia: c.subsidioRefeicaoDia,
    subsidio_refeicao_cartao: c.subsidioRefeicaoCartao,
    dias_uteis: c.diasUteis,
    duodecimos: c.duodecimos,
    criado_em: c.criadoEm,
  };
}

async function cloudList(userId: string): Promise<CenarioVencimento[]> {
  const { data, error } = await getSupabase()
    .from("recibos_vencimento")
    .select("*")
    .eq("user_id", userId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => fromRow(r as CenarioRow));
}

// ─── Hook de acesso (modo duplo + tiering) ──────────────────────────────
export function useVencimentos() {
  const { user, carregado: authPronto, disponivel } = useAuth();
  const { plano, carregado: planoPronto } = useSubscricao();
  const userId = user?.id ?? null;
  const destino = destinoDosDados({ disponivel, userId, authPronto, plano, planoPronto });
  const naNuvem = destino === "nuvem";

  const [cenarios, setCenarios] = useState<CenarioVencimento[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!authPronto) return;
    let ativo = true;
    setCarregado(false);

    if (naNuvem && userId) {
      cloudList(userId)
        .then((rows) => {
          if (!ativo) return;
          setCenarios(ordenar(rows));
          setCarregado(true);
        })
        .catch((e) => {
          if (!ativo) return;
          console.error("[vencimentos] erro ao carregar da nuvem:", e);
          setCenarios([]);
          setCarregado(true);
        });
    } else {
      setCenarios(ordenar(readLocal()));
      setCarregado(true);
    }

    return () => {
      ativo = false;
    };
  }, [authPronto, naNuvem, userId]);

  // No plano grátis o histórico fica limitado; Pro é ilimitado e na nuvem.
  const limiteAtingido = !naNuvem && cenarios.length >= LIMITE_FREE;

  const guardar = useCallback(
    (novo: NovoCenario): { erro?: string } => {
      // Enquanto não se sabe o destino, não se escreve: escrever no
      // aparelho e a subscrição chegar a seguir punha o registo num
      // sítio de onde a aplicação nunca mais o lê.
      if (destino === "por-decidir") return { erro: aindaSemDestino().mensagem };

      if (!naNuvem && cenarios.length >= LIMITE_FREE) {
        return { erro: `Plano grátis guarda até ${LIMITE_FREE} cenários. Passa ao Plus para histórico ilimitado na nuvem.` };
      }
      const cenario: CenarioVencimento = { ...novo, id: uid(), criadoEm: new Date().toISOString() };
      const proximos = ordenar([cenario, ...cenarios]);
      setCenarios(proximos);
      if (naNuvem && userId) {
        getSupabase()
          .from("recibos_vencimento")
          .insert(toRow(cenario, userId))
          .then(({ error }) => {
            if (error) console.error("[vencimentos] erro a sincronizar:", error);
          });
      } else {
        writeLocal(proximos);
      }
      return {};
    },
    [cenarios, naNuvem, userId]
  );

  const remover = useCallback(
    (id: string) => {
      const proximos = cenarios.filter((c) => c.id !== id);
      setCenarios(proximos);
      if (naNuvem && userId) {
        getSupabase()
          .from("recibos_vencimento")
          .delete()
          .eq("id", id)
          .eq("user_id", userId)
          .then(({ error }) => {
            if (error) console.error("[vencimentos] erro a remover:", error);
          });
      } else {
        writeLocal(proximos);
      }
    },
    [cenarios, naNuvem, userId]
  );

  return { cenarios, carregado, naNuvem, plano, limite: LIMITE_FREE, limiteAtingido, guardar, remover };
}
