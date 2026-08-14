"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Preferências fiscais — o perfil que os simuladores e os guardiões usam.
//
//  Estavam desligadas (RC-P1-01): nenhum ecrã as escrevia por completo, a
//  coluna `profiles.preferencias_fiscais` não existia em migration nenhuma e
//  os erros de leitura/escrita eram engolidos. Os cartões do painel recebiam
//  valores por omissão e apresentavam-nos como se fossem do utilizador.
//
//  Aqui: schema versionado e validado, migração de forma entre versões,
//  escrita que devolve o resultado, e reset por utilizador — sem isso, numa
//  sessão partilhada as preferências de quem saiu ficavam para quem entrou.
//
//  Ganha também os campos que os guardiões precisavam para não afirmar o que
//  não sabiam: regime de IVA efetivo, data real de início de atividade e as
//  condições da acumulação com trabalho dependente (RC-P0-07, RC-P0-08).
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import { getSupabase, supabaseConfigurado } from "@/lib/supabase/client";
import { dataIsoValida, montanteValido, contagemValida, pertence } from "@/lib/validacao-dominio";
import {
  ok,
  falha,
  erroNuvem,
  lerChave,
  gravarChave,
  type Resultado,
} from "@/lib/store/persistencia";
import { chaveAtiva } from "./cofre";
import { destinoDosDados, aindaSemDestino } from "./persistencia";

/** Versão do schema. Sobe quando a FORMA muda e é preciso migrar. */
export const PREFS_SCHEMA_VERSAO = 2;

const REGIMES_CONTABILIDADE = ["simplificado", "organizada"] as const;
/** Regime de IVA efetivo. `desconhecido` é um estado legítimo, não um defeito. */
const REGIMES_IVA_PERFIL = ["desconhecido", "isento", "normal-trimestral", "normal-mensal"] as const;
export type RegimeIVAPerfil = (typeof REGIMES_IVA_PERFIL)[number];

/** Resposta de três estados: nem toda a gente sabe, e assumir é o erro. */
const TRES_ESTADOS = ["sim", "nao", "nao-sei"] as const;
export type TresEstados = (typeof TRES_ESTADOS)[number];

export interface PreferenciasFiscais {
  /** Versão do schema com que este registo foi gravado. */
  v: number;

  anoAtividade: number;
  /** Data real de início de atividade (ISO). Vazia = desconhecida. */
  dataInicioAtividade: string;
  irsJovemAno: number;
  regimeContabilidade: "simplificado" | "organizada";

  // ── IVA ───────────────────────────────────────────────────────────
  regimeIVA: RegimeIVAPerfil;
  /**
   * Faturação do ano ANTERIOR. O Art. 53.º do CIVA decide a isenção pelo
   * volume do ano anterior — sem ele, o guardião não pode concluir nada.
   */
  faturacaoAnoAnterior: number | null;

  // ── Retenção na fonte ─────────────────────────────────────────────
  /** Optou efetivamente pela dispensa de retenção (Art. 101.º-B, n.º 1)? */
  optouDispensaRetencao: TresEstados;
  /** A AT liquidou pagamentos por conta? */
  pagamentosPorConta: TresEstados;

  // ── Segurança Social ──────────────────────────────────────────────
  acumulaEmprego: boolean;
  /**
   * Condições da dispensa por acumulação (Art. 157.º do Código Contributivo).
   * Um booleano sozinho não chega: a dispensa depende de todas elas.
   */
  acumulacaoEntidadesDistintas: TresEstados;
  /** Remuneração mensal do trabalho dependente. `null` = desconhecida. */
  remuneracaoDependenteMensal: number | null;
  isencaoSSPrimeiroAno: boolean;
  atividadeAberta: boolean;

  // ── Agregado e deduções ───────────────────────────────────────────
  conjunta: boolean;
  /** Rendimento anual da categoria A do cônjuge. `null` = desconhecido. */
  rendimentoConjuge: number | null;
  /** Rendimento anual próprio da categoria A (quando acumula). `null` = desconhecido. */
  rendimentoCategoriaA: number | null;
  dependentes: number;
  despSaude: number;
  despEducacao: number;
  despGerais: number;
  despRendas: number;
  despesasJustificadas: number;
  deficiencia: boolean;
  ifici: boolean;
}

export const DEFAULTS: PreferenciasFiscais = {
  v: PREFS_SCHEMA_VERSAO,
  anoAtividade: 3,
  dataInicioAtividade: "",
  irsJovemAno: 0,
  regimeContabilidade: "simplificado",
  regimeIVA: "desconhecido",
  faturacaoAnoAnterior: null,
  optouDispensaRetencao: "nao-sei",
  pagamentosPorConta: "nao-sei",
  acumulaEmprego: false,
  acumulacaoEntidadesDistintas: "nao-sei",
  remuneracaoDependenteMensal: null,
  isencaoSSPrimeiroAno: false,
  atividadeAberta: true,
  conjunta: false,
  rendimentoConjuge: null,
  rendimentoCategoriaA: null,
  dependentes: 0,
  despSaude: 0,
  despEducacao: 0,
  despGerais: 0,
  despRendas: 0,
  despesasJustificadas: 0,
  deficiencia: false,
  ifici: false,
};

// A chave já não é uma constante: depende de quem está a usar o browser.
// Enquanto era global, quem entrasse a seguir noutra conta via os dados de
// quem entrou antes — ver `store/cofre.ts`.
const STORAGE_KEY = () => chaveAtiva("perfil-fiscal");

// ─── Validação e migração de forma ─────────────────────────────────────

const numeroOuNulo = (v: unknown, atual: number | null): number | null =>
  v === null ? null : montanteValido(v) ? v : atual;

/**
 * Aceita um registo de qualquer versão e devolve preferências válidas.
 *
 * Antes fazia-se `{ ...DEFAULTS, ...JSON.parse(raw) }` — o que quer que
 * estivesse gravado passava, incluindo enums inválidos e números negativos,
 * e ia direto para os cálculos (RC-P1-12).
 */
export function normalizar(bruto: unknown): PreferenciasFiscais {
  if (!bruto || typeof bruto !== "object") return { ...DEFAULTS };
  const o = bruto as Record<string, unknown>;
  const p = { ...DEFAULTS };

  if (contagemValida(o.anoAtividade, 99)) p.anoAtividade = o.anoAtividade;
  if (dataIsoValida(o.dataInicioAtividade)) p.dataInicioAtividade = o.dataInicioAtividade;
  if (contagemValida(o.irsJovemAno, 10)) p.irsJovemAno = o.irsJovemAno;
  if (pertence(o.regimeContabilidade, REGIMES_CONTABILIDADE)) p.regimeContabilidade = o.regimeContabilidade;
  if (pertence(o.regimeIVA, REGIMES_IVA_PERFIL)) p.regimeIVA = o.regimeIVA;
  p.faturacaoAnoAnterior = numeroOuNulo(o.faturacaoAnoAnterior, null);
  if (pertence(o.optouDispensaRetencao, TRES_ESTADOS)) p.optouDispensaRetencao = o.optouDispensaRetencao;
  if (pertence(o.pagamentosPorConta, TRES_ESTADOS)) p.pagamentosPorConta = o.pagamentosPorConta;
  p.acumulaEmprego = !!o.acumulaEmprego;
  if (pertence(o.acumulacaoEntidadesDistintas, TRES_ESTADOS)) p.acumulacaoEntidadesDistintas = o.acumulacaoEntidadesDistintas;
  p.remuneracaoDependenteMensal = numeroOuNulo(o.remuneracaoDependenteMensal, null);
  p.isencaoSSPrimeiroAno = !!o.isencaoSSPrimeiroAno;
  p.atividadeAberta = o.atividadeAberta === undefined ? DEFAULTS.atividadeAberta : !!o.atividadeAberta;
  p.conjunta = !!o.conjunta;
  p.rendimentoConjuge = numeroOuNulo(o.rendimentoConjuge, null);
  p.rendimentoCategoriaA = numeroOuNulo(o.rendimentoCategoriaA, null);
  if (contagemValida(o.dependentes, 30)) p.dependentes = o.dependentes;
  (["despSaude", "despEducacao", "despGerais", "despRendas", "despesasJustificadas"] as const).forEach((k) => {
    if (montanteValido(o[k])) p[k] = o[k] as number;
  });
  p.deficiencia = !!o.deficiencia;
  p.ifici = !!o.ifici;

  // v1 → v2: `isencaoSSPrimeiroAno` era um booleano solto. Se houver data de
  // início, é ela que manda; o booleano fica como pista até a pessoa confirmar.
  if (p.dataInicioAtividade) {
    p.isencaoSSPrimeiroAno = dentroDoPrimeiroAno(p.dataInicioAtividade);
  }

  p.v = PREFS_SCHEMA_VERSAO;
  return p;
}

/** Está dentro dos primeiros 12 meses contados da data real de início? */
export function dentroDoPrimeiroAno(dataInicio: string, ref: Date = new Date()): boolean {
  if (!dataIsoValida(dataInicio)) return false;
  const [a, m, d] = dataInicio.split("-").map(Number);
  const fim = new Date(a + 1, m - 1, d);
  return ref.getTime() < fim.getTime();
}

function ler(): PreferenciasFiscais {
  const raw = lerChave(STORAGE_KEY());
  if (!raw) return { ...DEFAULTS };
  try {
    return normalizar(JSON.parse(raw));
  } catch {
    return { ...DEFAULTS };
  }
}

function gravar(prefs: PreferenciasFiscais): Resultado<void> {
  return gravarChave(STORAGE_KEY(), JSON.stringify(prefs));
}

// ─── Hook ──────────────────────────────────────────────────────────────

/**
 * Um perfil por estrear é indistinguível dos valores por omissão. Só vale a
 * pena subir o que a pessoa realmente respondeu — subir defaults por cima de
 * uma conta nova não acrescenta nada e pisaria dados de outro dispositivo.
 */
function vazio(p: PreferenciasFiscais): boolean {
  return (Object.keys(DEFAULTS) as Array<keyof PreferenciasFiscais>)
    .filter((k) => k !== "v")
    .every((k) => p[k] === DEFAULTS[k]);
}

export function usePreferenciasFiscais() {
  const { user, carregado: authPronto } = useAuth();
  const { plano, carregado: planoPronto } = useSubscricao();
  const destino = destinoDosDados({
    disponivel: supabaseConfigurado(), userId: user?.id ?? null,
    authPronto, plano, planoPronto,
  });
  const naNuvem = destino === "nuvem";
  const [prefs, setPrefs] = useState<PreferenciasFiscais>(DEFAULTS);
  const [carregado, setCarregado] = useState(false);
  /**
   * De quem são as preferências já carregadas. Era um booleano solto: ao
   * trocar de conta no mesmo browser, ficava a `true` e as preferências do
   * utilizador anterior sobreviviam à troca.
   */
  const donoCarregado = useRef<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    let ativo = true;
    const chave = naNuvem ? userId : "local";

    if (donoCarregado.current === chave) return;
    // Reset atómico: nada do dono anterior atravessa a troca.
    setPrefs(DEFAULTS);
    setCarregado(false);

    if (naNuvem && userId) {
      (async () => {
        try {
          const { data, error } = await getSupabase()
            .from("profiles")
            .select("preferencias_fiscais")
            .eq("id", userId)
            .maybeSingle();
          if (!ativo) return;
          if (error) throw error;

          if (data?.preferencias_fiscais) {
            setPrefs(normalizar(data.preferencias_fiscais));
          } else {
            // A NUVEM AINDA NÃO TEM NADA — mas este dispositivo pode ter.
            //
            // Acontece a quem preencheu o perfil antes de ter Plus: as
            // preferências ficaram em localStorage e a coluna ficou vazia.
            // Ler o local e parar aqui — que era o comportamento anterior —
            // resolvia ESTE dispositivo e deixava a nuvem por preencher: no
            // segundo dispositivo a pessoa encontrava o perfil em branco e
            // achava que o tinha perdido.
            //
            // Ao subir o que é local na primeira leitura, o perfil passa a
            // existir onde diz que existe. Uma falha aqui é irrelevante: o
            // local continua a ser fonte legítima e a próxima gravação
            // tenta de novo.
            const locais = ler();
            setPrefs(locais);
            if (!vazio(locais)) {
              await getSupabase()
                .from("profiles")
                .update({ preferencias_fiscais: locais })
                .eq("id", userId)
                .then(undefined, () => undefined);
            }
          }
        } catch {
          if (!ativo) return;
          // A nuvem falhou: o dispositivo continua a ser uma fonte legítima.
          setPrefs(ler());
        }
        if (!ativo) return;
        donoCarregado.current = chave;
        setCarregado(true);
      })();
    } else {
      setPrefs(ler());
      donoCarregado.current = chave;
      setCarregado(true);
    }

    return () => { ativo = false; };
  }, [naNuvem, userId]);

  /**
   * Atualiza e persiste. Devolve o resultado — quem chama sabe se pode dizer
   * "Guardado". A escrita local é síncrona e é a que garante a durabilidade
   * imediata; a nuvem é a réplica.
   */
  const atualizar = useCallback(
    async (patch: Partial<PreferenciasFiscais>): Promise<Resultado<PreferenciasFiscais>> => {
      // Enquanto não se sabe o destino, não se escreve: escrever no
      // aparelho e a subscrição chegar a seguir punha o registo num
      // sítio de onde a aplicação nunca mais o lê.
      if (destino === "por-decidir") return falha(aindaSemDestino());

      const proximas = normalizar({ ...prefs, ...patch });
      const local = gravar(proximas);
      if (!local.ok) return local;
      setPrefs(proximas);

      if (naNuvem && userId) {
        try {
          const { error } = await getSupabase()
            .from("profiles")
            .update({ preferencias_fiscais: proximas })
            .eq("id", userId);
          if (error) return falha(erroNuvem(error));
        } catch (e) {
          return falha(erroNuvem(e));
        }
      }
      return ok(proximas);
    },
    [prefs, destino, naNuvem, userId],
  );

  return { prefs, atualizar, carregado, naNuvem };
}

export function lerPreferenciasFiscais(): PreferenciasFiscais {
  return ler();
}

// ─── Derivações partilhadas ────────────────────────────────────────────

/** O perfil que o calendário de prazos precisa, derivado das preferências. */
export function perfilPrazos(prefs: PreferenciasFiscais) {
  return {
    regimeIVA: prefs.regimeIVA === "desconhecido" ? null : prefs.regimeIVA,
    atividadeAberta: prefs.atividadeAberta,
    pagamentosPorConta:
      prefs.pagamentosPorConta === "nao-sei" ? null : prefs.pagamentosPorConta === "sim",
    isencaoSSPrimeiroAno: prefs.isencaoSSPrimeiroAno,
  } as const;
}

/** Quantos campos decisivos continuam por preencher. Alimenta a saúde fiscal. */
export function lacunasDoPerfil(prefs: PreferenciasFiscais): string[] {
  const faltam: string[] = [];
  if (prefs.regimeIVA === "desconhecido") faltam.push("Regime de IVA");
  if (!prefs.dataInicioAtividade) faltam.push("Data de início de atividade");
  if (prefs.pagamentosPorConta === "nao-sei") faltam.push("Pagamentos por conta de IRS");
  if (prefs.acumulaEmprego && prefs.rendimentoCategoriaA === null) faltam.push("Rendimento do trabalho dependente");
  if (prefs.conjunta && prefs.rendimentoConjuge === null) faltam.push("Rendimento do cônjuge");
  return faltam;
}
