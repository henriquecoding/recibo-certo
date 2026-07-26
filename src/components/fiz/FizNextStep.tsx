"use client";

import { useCallback, useEffect, useState } from "react";
import { fizAtiva } from "@/lib/fiz/flag";
import { Warning, Link as LinkIcon } from "@/components/ui/Icons";
import FizActionButton from "./FizActionButton";
import FizConsentDialog, { type CampoConsentimento } from "./FizConsentDialog";
import FizDisclosure from "./FizDisclosure";
import { FizMarca } from "./FizLogo";

// ─────────────────────────────────────────────────────────────────────────
//  "Próximo passo na FIZ" — o bloco final de um Guia.
//
//  A FIZ NÃO é um banner repetido no fim de cada página: só aparece quando
//  consegue continuar a intenção daquele Guia, e o texto vem do catálogo de
//  capacidades (ponto 8.1 da auditoria).
//
//  Cobre os seis estados obrigatórios da interface (ponto 8.3). Em qualquer
//  deles o Guia continua totalmente utilizável — se a FIZ estiver em baixo,
//  este bloco desaparece ou mostra uma mensagem neutra, e mais nada muda.
// ─────────────────────────────────────────────────────────────────────────

type EstadoAcao =
  | "disponivel_ligado" | "disponivel_por_ligar" | "disponivel_criar_conta"
  | "indisponivel" | "requer_plano_fiz" | "fiz_indisponivel";

interface AcaoResolvida {
  estado: EstadoAcao;
  rotulo: string;
  divulgacao: string;
  destinationKey?: string;
  capabilityKey: string;
  dataMode: "NO_DATA" | "CONSENTED_HANDOFF" | "CONNECTED_ACCOUNT";
  requiresConsent: boolean;
  motivo?: string;
  degradado: boolean;
  exigeRevisaoHumana: boolean;
}

interface FizNextStepProps {
  slug: string;
  /** Campos que este Guia propõe transferir, já com valores legíveis. */
  camposPropostos?: CampoConsentimento[];
  camposNuncaEnviados?: readonly string[];
}

const NUNCA_ENVIADOS_PADRAO = [
  "NIF", "NISS", "nome", "morada", "email", "telefone", "IBAN",
  "dados de clientes", "documentos emitidos", "credenciais",
] as const;

export default function FizNextStep({
  slug,
  camposPropostos = [],
  camposNuncaEnviados = NUNCA_ENVIADOS_PADRAO,
}: FizNextStepProps) {
  const [acao, setAcao] = useState<AcaoResolvida | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Integração desligada: nem sequer se faz o pedido.
    if (!fizAtiva()) {
      setCarregado(true);
      return;
    }
    let ativo = true;
    fetch("/api/integrations/fiz/guide-route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, placement: "NEXT_STEP" }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { acao: AcaoResolvida | null } | null) => {
        if (ativo) setAcao(d?.acao ?? null);
      })
      .catch(() => {
        // Silêncio deliberado: uma falha de rede não pode partir o Guia.
      })
      .finally(() => {
        if (ativo) setCarregado(true);
      });
    return () => {
      ativo = false;
    };
  }, [slug]);

  const autorizar = useCallback(
    async (camposAutorizados: string[]) => {
      setAEnviar(true);
      setErro(null);
      try {
        const resposta = await fetch("/api/integrations/fiz/handoff", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slug,
            intent: undefined,
            campos: camposPropostos.map((c) => c.campo),
            camposAutorizados,
            sourceType: "guia",
          }),
        });
        const dados = (await resposta.json()) as { url?: string; erro?: string };
        if (!resposta.ok || !dados.url) {
          setErro(dados.erro ?? "Não foi possível preparar a continuação.");
          return;
        }
        window.open(dados.url, "_blank", "noopener,noreferrer");
        setDialogoAberto(false);
      } catch {
        setErro("Não foi possível contactar a FIZ. A tua simulação mantém-se aqui.");
      } finally {
        setAEnviar(false);
      }
    },
    [slug, camposPropostos],
  );

  // Nada a mostrar: integração desligada, guia sem ação FIZ, ou ação
  // indisponível. Em nenhum destes casos se ocupa espaço com um aviso.
  if (!carregado || !acao) return null;
  if (acao.estado === "indisponivel") return null;

  const indisponivelTemporario = acao.estado === "fiz_indisponivel";

  return (
    <section
      aria-labelledby={`fiz-proximo-${slug}`}
      className="mt-8 overflow-hidden rounded-4xl border border-fiz-200 bg-fiz-50 shadow-card"
    >
      <div className="p-5 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fiz-700">Próximo passo</span>
          <span aria-hidden className="text-fiz-400">·</span>
          <FizMarca size={15} />
        </div>

        <h2 id={`fiz-proximo-${slug}`} className="font-display text-xl font-semibold text-ink">
          {indisponivelTemporario ? "Continuação temporariamente indisponível" : acao.rotulo}
        </h2>

        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {indisponivelTemporario
            ? "Não conseguimos falar com a FIZ neste momento. Este guia e os simuladores continuam a funcionar normalmente."
            : "O ReciboCerto explica e prepara. A execução — faturação, declarações e prazos — acontece na FIZ."}
        </p>

        {acao.exigeRevisaoHumana && !indisponivelTemporario && (
          <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-alert-bg px-3 py-2 text-xs leading-relaxed text-alert-text">
            <Warning size={13} className="mt-0.5 flex-shrink-0" />
            <span>
              Este caso depende do teu contrato e da tua situação concreta. Nada é emitido nem
              submetido automaticamente: revês tudo na FIZ antes de confirmar.
            </span>
          </p>
        )}

        {!indisponivelTemporario && (
          <div className="mt-4">
            {acao.estado === "disponivel_por_ligar" && (
              <div className="flex flex-col gap-2">
                <p className="flex items-start gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                  <LinkIcon size={13} className="mt-0.5 flex-shrink-0 text-fiz-700" />
                  <span>Para veres o teu estado real, liga a tua conta FIZ. Sem ligação, mostramos apenas regras gerais.</span>
                </p>
                <FizActionButton href="/dashboard/conta?ligar=fiz">Ligar a minha conta FIZ</FizActionButton>
              </div>
            )}

            {acao.estado === "disponivel_criar_conta" && (
              <>
                {acao.requiresConsent && camposPropostos.length > 0 ? (
                  <FizActionButton onClick={() => setDialogoAberto(true)}>{acao.rotulo}</FizActionButton>
                ) : (
                  <FizActionButton href="/dashboard/conta?ligar=fiz">{acao.rotulo}</FizActionButton>
                )}
              </>
            )}

            {acao.estado === "disponivel_ligado" &&
              (acao.requiresConsent && camposPropostos.length > 0 ? (
                <FizActionButton onClick={() => setDialogoAberto(true)}>{acao.rotulo}</FizActionButton>
              ) : (
                <FizActionButton href="/dashboard/conta?ligar=fiz">{acao.rotulo}</FizActionButton>
              ))}

            {acao.estado === "requer_plano_fiz" && (
              <div className="flex flex-col gap-2">
                {/* Ponto 8.4: um serviço pago da FIZ nunca se confunde com o Plus. */}
                <p className="rounded-2xl bg-white px-3 py-2 text-xs leading-relaxed text-stone-600 dark:bg-stone-900 dark:text-stone-400">
                  Esta ação está sujeita às condições comerciais da FIZ e é independente do
                  ReciboCerto Plus.
                </p>
                <FizActionButton variante="secundaria" href="/dashboard/conta?ligar=fiz">
                  {acao.rotulo}
                </FizActionButton>
              </div>
            )}
          </div>
        )}

        {acao.degradado && (
          <p className="mt-3 text-[11px] text-stone-500 dark:text-stone-400">
            Estamos a usar a última informação válida da FIZ. Pode não refletir alterações recentes.
          </p>
        )}

        <FizDisclosure texto={acao.divulgacao} className="mt-4" />
      </div>

      <FizConsentDialog
        aberto={dialogoAberto}
        aoFechar={() => setDialogoAberto(false)}
        campos={camposPropostos}
        finalidade={acao.rotulo}
        divulgacao={acao.divulgacao}
        camposNuncaEnviados={camposNuncaEnviados}
        ocupado={aEnviar}
        erro={erro}
        aoAutorizar={autorizar}
      />
    </section>
  );
}
