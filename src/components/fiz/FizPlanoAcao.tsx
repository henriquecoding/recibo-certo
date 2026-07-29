"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fizAtiva } from "@/lib/fiz/flag";
import { ROTULO_CAMPO, CAMPOS_NUNCA_ENVIADOS, type CampoHandoff } from "@/lib/fiz/handoff-fields";
import { useIdentidadeFiz, type IdentidadeDisponivel } from "@/lib/fiz/use-identidade";
import { supabaseConfigurado } from "@/lib/supabase/client";
import { Warning, Check, Info } from "@/components/ui/Icons";
import FizActionButton from "./FizActionButton";
import FizConsentDialog, { type CampoConsentimento } from "./FizConsentDialog";
import FizDisclosure from "./FizDisclosure";
import FizLogo, { FizMarca } from "./FizLogo";
import type { SimuladorId } from "@/content/fiz-simulator-routes";

// ─────────────────────────────────────────────────────────────────────────
//  PLANO DE AÇÃO DE UM SIMULADOR (ponto 12.3 da arquitetura)
//
//  O simulador mantém o resultado e a memória de cálculo. Isto é o que vem
//  A SEGUIR: o que fazer com o número, e a opção de levar o contexto para a
//  FIZ sem repetir dados.
//
//  Três regras que este componente materializa:
//    · o resultado é uma ESTIMATIVA e é rotulado como tal, sempre;
//    · o utilizador escolhe campo a campo o que envia — nada por omissão;
//    · recusar não faz perder a simulação.
// ─────────────────────────────────────────────────────────────────────────

type EstadoAcao =
  | "disponivel_ligacao"
  | "disponivel_ligado" | "disponivel_por_ligar" | "disponivel_criar_conta"
  | "indisponivel" | "requer_plano_fiz" | "fiz_indisponivel";

interface AcaoResolvida {
  estado: EstadoAcao;
  rotulo: string;
  divulgacao: string;
  capabilityKey: string;
  dataMode: "NO_DATA" | "CONSENTED_HANDOFF" | "CONNECTED_ACCOUNT";
  requiresConsent: boolean;
  motivo?: string;
  degradado: boolean;
  exigeRevisaoHumana: boolean;
  preview: boolean;
  /** Rota nossa (`/ir/fiz?…`), só em `disponivel_ligacao`. */
  destinoLigacao?: string;
}

/** Valores da simulação, já formatados para leitura humana. */
export interface ValoresSimulacao {
  entityType?: string;
  activityCategory?: string;
  vatTerritory?: string;
  vatRegimeEstimate?: string;
  period?: "MONTHLY" | "QUARTERLY" | "ANNUAL" | "ONE_OFF";
  grossEstimate?: number;
  vatEstimate?: number;
  withholdingEstimate?: number;
  socialSecurityEstimate?: number;
  irsEstimate?: number;
}

interface FizPlanoAcaoProps {
  simulador: SimuladorId;
  /** O que o utilizador acabou de calcular. */
  valores: ValoresSimulacao;
  /** Passos de preparação do lado do ReciboCerto, antes de sair daqui. */
  passosPreparacao?: string[];
  className?: string;
}

const euros = (v: number) =>
  v.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const PERIODO: Record<NonNullable<ValoresSimulacao["period"]>, string> = {
  MONTHLY: "mensal",
  QUARTERLY: "trimestral",
  ANNUAL: "anual",
  ONE_OFF: "pontual",
};

/** Regime de IVA no vocabulário do contrato → português legível. */
const REGIME_IVA: Record<string, string> = {
  EXEMPT_ART_53: "Isento — Art. 53.º CIVA",
  EXEMPT_ART_9: "Isento — Art. 9.º CIVA",
  NORMAL: "Regime normal de IVA",
  UNKNOWN: "A confirmar",
};

const TERRITORIO: Record<string, string> = {
  CONTINENTAL: "Continente",
  MADEIRA: "Madeira",
  AZORES: "Açores",
};

const ENTIDADE: Record<string, string> = {
  INDIVIDUAL: "Trabalhador independente",
  SOLE_TRADER: "Empresário em nome individual",
  COMPANY: "Sociedade",
};

/**
 * Constrói a lista que o diálogo mostra.
 *
 * Os valores de identificação servem só para o utilizador ver o que está a
 * autorizar. Não são enviados no pedido: o servidor relê-os do perfil
 * autenticado (ver `use-identidade.ts`).
 */
function paraCampos(v: ValoresSimulacao, identidade: IdentidadeDisponivel): CampoConsentimento[] {
  const bruto: [CampoHandoff, string | undefined][] = [
    ["entityType", v.entityType ? (ENTIDADE[v.entityType] ?? v.entityType) : undefined],
    ["activityCategory", v.activityCategory],
    ["vatTerritory", v.vatTerritory ? (TERRITORIO[v.vatTerritory] ?? v.vatTerritory) : undefined],
    ["vatRegimeEstimate", v.vatRegimeEstimate ? (REGIME_IVA[v.vatRegimeEstimate] ?? v.vatRegimeEstimate) : undefined],
    ["period", v.period ? PERIODO[v.period] : undefined],
    ["grossEstimate", v.grossEstimate !== undefined ? euros(v.grossEstimate) : undefined],
    ["vatEstimate", v.vatEstimate !== undefined ? euros(v.vatEstimate) : undefined],
    ["withholdingEstimate", v.withholdingEstimate !== undefined ? euros(v.withholdingEstimate) : undefined],
    ["socialSecurityEstimate", v.socialSecurityEstimate !== undefined ? euros(v.socialSecurityEstimate) : undefined],
    ["irsEstimate", v.irsEstimate !== undefined ? euros(v.irsEstimate) : undefined],
    ["fullName", identidade.fullName],
    ["taxpayerNumber", identidade.taxpayerNumber],
    ["email", identidade.email],
    ["phone", identidade.phone],
  ];
  return bruto
    .filter(([, valor]) => valor !== undefined && valor !== "")
    .map(([campo, valor]) => ({ campo, rotulo: ROTULO_CAMPO[campo], valor: valor as string }));
}

export default function FizPlanoAcao({
  simulador,
  valores,
  passosPreparacao = [],
  className = "",
}: FizPlanoAcaoProps) {
  const [acao, setAcao] = useState<AcaoResolvida | null>(null);
  /** O que ESTE simulador pode propor. `null` = ainda não sabemos. */
  const [propostos, setPropostos] = useState<CampoHandoff[] | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  // ── Minimização de dados (RGPD) ────────────────────────────────────────
  // `useIdentidadeFiz()` lê nome, NIF, email e telefone do perfil para os
  // mostrar no diálogo de consentimento. Em modo LIGACAO NÃO HÁ DIÁLOGO — e
  // sem diálogo não há finalidade. O hook é chamado com a leitura desligada.
  const modoLigacao = acao?.estado === "disponivel_ligacao";
  const { identidade } = useIdentidadeFiz({ ativo: !modoLigacao });
  const campos = useMemo(() => {
    // Em LIGACAO nada é transportado: `camposPropostos` nem sequer é
    // calculado, quanto mais enviado ao servidor.
    if (modoLigacao) return [];
    const todos = paraCampos(valores, identidade);
    // Nunca oferecer o que o servidor vai recusar: o utilizador escolheria um
    // campo, carregaria em autorizar e levaria com um erro sem perceber
    // porquê.
    return propostos ? todos.filter((c) => propostos.includes(c.campo as CampoHandoff)) : todos;
  }, [valores, identidade, propostos, modoLigacao]);

  useEffect(() => {
    if (!fizAtiva()) {
      setCarregado(true);
      return;
    }
    let ativo = true;
    fetch("/api/integrations/fiz/simulator-route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ simulador }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { acao: AcaoResolvida | null; camposPropostos?: CampoHandoff[] } | null) => {
        if (!ativo) return;
        setAcao(d?.acao ?? null);
        setPropostos(d?.camposPropostos ?? []);
      })
      .catch(() => {
        /* silêncio: uma falha de rede não pode partir o resultado do simulador */
      })
      .finally(() => {
        if (ativo) setCarregado(true);
      });
    return () => {
      ativo = false;
    };
  }, [simulador]);

  const autorizar = useCallback(
    async (camposAutorizados: string[]) => {
      setAEnviar(true);
      setErro(null);
      try {
        // O token só serve para o servidor saber QUEM está a autorizar — é
        // assim que ele consegue reler a identificação do perfil em vez de
        // confiar em valores vindos do browser.
        let autorizacao: string | null = null;
        if (supabaseConfigurado()) {
          const { getSupabase } = await import("@/lib/supabase/client");
          const { data } = await getSupabase().auth.getSession();
          autorizacao = data.session?.access_token ?? null;
        }

        const resposta = await fetch("/api/integrations/fiz/handoff", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(autorizacao ? { authorization: `Bearer ${autorizacao}` } : {}),
          },
          body: JSON.stringify({
            simulador,
            campos: campos.map((c) => c.campo),
            camposAutorizados,
            // Repara no que NÃO vai aqui: nome, NIF, email e telefone. O
            // cliente só diz que campos foram autorizados.
            valores,
            sourceType: "simulador",
          }),
        });
        const dados = (await resposta.json()) as { url?: string; erro?: string; preview?: boolean };
        if (!resposta.ok || !dados.url) {
          setErro(dados.erro ?? "Não foi possível preparar a continuação.");
          return;
        }
        window.open(dados.url, "_blank", "noopener,noreferrer");
        setEnviado(true);
        setDialogoAberto(false);
      } catch {
        setErro("Não foi possível contactar a FIZ. A tua simulação mantém-se aqui, intacta.");
      } finally {
        setAEnviar(false);
      }
    },
    [simulador, campos, valores],
  );

  if (!carregado || !acao || acao.estado === "indisponivel") return null;

  const indisponivelTemporario = acao.estado === "fiz_indisponivel";
  const podeEnviar = acao.requiresConsent && campos.length > 0;

  return (
    <section
      aria-labelledby={`fiz-plano-${simulador}`}
      className={`overflow-hidden rounded-4xl border border-fiz-200 bg-fiz-50 shadow-card ${className}`}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fiz-700">
            Passar do cálculo à execução
          </span>
          <span aria-hidden className="text-fiz-400">·</span>
          <FizMarca size={15} />
        </div>

        <h2 id={`fiz-plano-${simulador}`} className="font-display text-xl font-semibold text-ink">
          {indisponivelTemporario ? "Continuação temporariamente indisponível" : acao.rotulo}
        </h2>

        {/* Estimativa vs. execução — a distinção que o ponto 4.3 da
            arquitetura exige que nunca se perca. */}
        <p className="mt-1.5 flex items-start gap-1.5 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          <Info size={13} className="mt-1 flex-shrink-0 text-fiz-700" />
          <span>
            Os valores acima são uma <strong>estimativa do ReciboCerto</strong>, não um documento
            nem uma declaração. Quem emite, declara e submete é a FIZ, com a tua revisão.
          </span>
        </p>

        {acao.preview && (
          <p className="mt-3 flex items-start gap-1.5 rounded-2xl border border-fiz-300 bg-white px-3 py-2 text-xs leading-relaxed text-stone-700 dark:bg-stone-900 dark:text-stone-300">
            <Warning size={13} className="mt-0.5 flex-shrink-0 text-fiz-700" />
            <span>
              <strong>Pré-visualização.</strong> A integração ainda não está ativa: isto mostra como
              o percurso vai funcionar, mas nenhum dado é enviado e nada é executado.
            </span>
          </p>
        )}

        {passosPreparacao.length > 0 && !indisponivelTemporario && (
          <div className="mt-4 rounded-2xl border border-fiz-200 bg-white p-4 dark:bg-stone-900">
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
              Antes de continuares, tens isto tratado aqui
            </p>
            <ul className="mt-2 space-y-1.5">
              {passosPreparacao.map((passo) => (
                <li key={passo} className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                  <Check size={13} className="mt-0.5 flex-shrink-0 text-brand" />
                  {passo}
                </li>
              ))}
            </ul>
          </div>
        )}

        {acao.exigeRevisaoHumana && !indisponivelTemporario && (
          <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-alert-bg px-3 py-2 text-xs leading-relaxed text-alert-text">
            <Warning size={13} className="mt-0.5 flex-shrink-0" />
            <span>
              Este caso depende da tua situação concreta. Nada é emitido nem submetido
              automaticamente — revês tudo na FIZ antes de confirmar.
            </span>
          </p>
        )}

        {enviado && (
          <p role="status" className="mt-3 flex items-start gap-1.5 rounded-2xl bg-brand-light px-3 py-2 text-xs leading-relaxed text-brand-dark">
            <Check size={13} className="mt-0.5 flex-shrink-0" />
            Contexto enviado. A tua simulação continua aqui, tal como estava.
          </p>
        )}

        {!indisponivelTemporario && (
          <div className="mt-4">
            {/* Modo LIGACAO: uma âncora real para uma rota nossa, com o
                destino de alta intenção (`d=registo`) — quem chega ao fim de
                um simulador já decidiu. Nenhum diálogo, nenhum campo, nenhum
                pedido de identidade. */}
            {acao.estado === "disponivel_ligacao" && acao.destinoLigacao ? (
              <FizActionButton href={`${acao.destinoLigacao}&d=registo`}>
                {acao.rotulo}
              </FizActionButton>
            ) : acao.estado === "disponivel_por_ligar" ? (
              <FizActionButton href="/dashboard/conta?ligar=fiz">Ligar a minha conta FIZ</FizActionButton>
            ) : acao.estado === "requer_plano_fiz" ? (
              <div className="flex flex-col gap-2">
                <p className="rounded-2xl bg-white px-3 py-2 text-xs leading-relaxed text-stone-600 dark:bg-stone-900 dark:text-stone-400">
                  Esta ação está sujeita às condições comerciais da FIZ e é independente do
                  ReciboCerto Plus.
                </p>
                <FizActionButton
                  variante="secundaria"
                  onClick={podeEnviar ? () => setDialogoAberto(true) : undefined}
                  href={podeEnviar ? undefined : "/dashboard/conta?ligar=fiz"}
                >
                  {acao.rotulo}
                </FizActionButton>
              </div>
            ) : podeEnviar ? (
              <FizActionButton onClick={() => setDialogoAberto(true)}>
                Escolher o que enviar e continuar
              </FizActionButton>
            ) : (
              <FizActionButton href="/dashboard/conta?ligar=fiz">{acao.rotulo}</FizActionButton>
            )}
          </div>
        )}

        {indisponivelTemporario && (
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            Não conseguimos falar com a FIZ neste momento. O teu resultado e a memória de cálculo
            continuam disponíveis aqui.
          </p>
        )}

        {acao.degradado && !acao.preview && (
          <p className="mt-3 text-[11px] text-stone-500 dark:text-stone-400">
            Estamos a usar a última informação válida da FIZ. Pode não refletir alterações recentes.
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <FizLogo size={14} className="flex-shrink-0 rounded-[0.25em]" decorativo />
          <FizDisclosure texto={acao.divulgacao} />
        </div>
      </div>

      <FizConsentDialog
        aberto={dialogoAberto}
        aoFechar={() => setDialogoAberto(false)}
        campos={campos}
        finalidade={acao.rotulo}
        divulgacao={acao.divulgacao}
        camposNuncaEnviados={CAMPOS_NUNCA_ENVIADOS}
        ocupado={aEnviar}
        erro={erro}
        aoAutorizar={autorizar}
      />
    </section>
  );
}
