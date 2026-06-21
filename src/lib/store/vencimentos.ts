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

const STORAGE_KEY = "recibocerto:vencimentos:v1";

// ─── localStorage ──────────────────────────────────────────────────────
function readLocal(): CenarioVencimento[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CenarioVencimento[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(xs: CenarioVencimento[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(xs));
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const ordenar = (xs: CenarioVencimento[]) =>
  [...xs].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

// ─── Exportação CSV (Pro) ────────────────────────────────────────────────
// Documento detalhado: preâmbulo com fonte/data, cabeçalhos legíveis com
// unidades e a decomposição completa (mensal + anual de 14 meses), recalculada
// pelos motores verificados. Separador ';' e decimais com vírgula para abrir
// corretamente no Excel pt-PT (a BOM é adicionada por quem faz o download).
const txt = (s: string) => (/[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const eur = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(2).replace(".", ",");
const pctv = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")}%`;
const dataCurta = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-PT");
};

/** Gera um CSV detalhado dos cenários com a decomposição mensal e anual
 *  recalculada pelos motores verificados (recibo mensal + 14 meses). */
export function gerarCSVCenarios(cenarios: CenarioVencimento[]): string {
  const preambulo = [
    "ReciboCerto — Cenários de vencimento",
    `Gerado em;${new Date().toLocaleDateString("pt-PT")}`,
    "Fonte;Despacho n.º 233-A/2026 (Tabelas I a VII, Continente)",
    "Nota;Valores em euros, decimais com vírgula. Estimativa — não substitui o recibo oficial.",
    "",
  ];
  const cabecalho = [
    "Cenário",
    "Salário bruto (€)",
    "Dependentes",
    "Situação",
    "Subsídio refeição/dia (€)",
    "Forma",
    "Dias úteis",
    "Subsídios em duodécimos",
    "Subsídio refeição/mês (€)",
    "Subsídio isento/mês (€)",
    "Segurança Social/mês (€)",
    "Retenção IRS/mês (€)",
    "Vencimento líquido/mês (€)",
    "Taxa efetiva",
    "Custo p/ empresa/mês (€)",
    "Bruto anual (€)",
    "Subsídio de férias (€)",
    "Subsídio de Natal (€)",
    "IRS anual (€)",
    "Segurança Social anual (€)",
    "Líquido anual (€)",
    "Líquido médio/mês (€)",
    "Criado em",
  ];
  const linhas = cenarios.map((c) => {
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
      txt(c.nome ?? "(sem nome)"),
      eur(c.salarioBruto),
      c.dependentes,
      "Não casado",
      eur(c.subsidioRefeicaoDia),
      c.subsidioRefeicaoDia > 0 ? (c.subsidioRefeicaoCartao ? "Cartão" : "Dinheiro") : "—",
      c.diasUteis,
      c.duodecimos ? "Sim" : "Não",
      eur(m.subsidioRefeicaoTotal),
      eur(m.subsidioRefeicaoIsento),
      eur(m.ssTrabalhador),
      eur(m.irsRetido),
      eur(m.liquido),
      pctv(m.taxaEfetiva),
      eur(m.custoEmpresa),
      eur(a.brutoAnual),
      eur(a.subsidioFerias),
      eur(a.subsidioNatal),
      eur(a.irsAnual),
      eur(a.ssAnual),
      eur(a.liquidoAnual),
      eur(a.liquidoMedioMes),
      dataCurta(c.criadoEm),
    ].join(";");
  });
  return [...preambulo, cabecalho.join(";"), ...linhas].join("\r\n");
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
  const { plano } = useSubscricao();
  const userId = user?.id ?? null;
  const naNuvem = disponivel && !!userId && plano === "pro";

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
      if (!naNuvem && cenarios.length >= LIMITE_FREE) {
        return { erro: `Plano grátis guarda até ${LIMITE_FREE} cenários. Passa a Pro para histórico ilimitado na nuvem.` };
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
