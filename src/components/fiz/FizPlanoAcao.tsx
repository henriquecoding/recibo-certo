"use client";

import { useCallback, useEffect, useState } from "react";
import { fizAtiva } from "@/lib/fiz/flag";
import { ROTULO_CAMPO, CAMPOS_NUNCA_ENVIADOS, type CampoHandoff } from "@/lib/fiz/handoff-fields";
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

function paraCampos(v: ValoresSimulacao): CampoConsentimento[] {
  const bruto: [CampoHandoff, string | undefined][] = [
    ["entityType", v.entityType],
    ["activityCategory", v.activityCategory],
    ["vatTerritory", v.vatTerritory],
    ["vatRegimeEstimate", v.vatRegimeEstimate],
    ["period", v.period ? PERIODO[v.period] : undefined],
    ["grossEstimate", v.grossEstimate !== undefined ? euros(v.grossEstimate) : undefined],
    ["vatEstimate", v.vatEstimate !== undefined ? euros(v.vatEstimate) : undefined],
    ["withholdingEstimate", v.withholdingEstimate !== undefined ? euros(v.withholdingEstimate) : undefined],
    ["socialSecurityEstimate", v.socialSecurityEstimate !== undefined ? euros(v.socialSecurityEstimate) : undefined],
    ["irsEstimate", v.irsEstimate !== undefined ? euros(v.irsEstimate) : undefined],
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
  const [carregado, setCarregado] = useState(false);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const campos = paraCampos(valores);

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
      .then((d: { acao: AcaoResolvida | null } | null) => {
        if (ativo) setAcao(d?.acao ?? null);
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
        const resposta = await fetch("/api/integrations/fiz/handoff", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            simulador,
            campos: campos.map((c) => c.campo),
            camposAutorizados,
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
            {acao.estado === "disponivel_por_ligar" ? (
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
