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
  | "disponivel_ligacao"
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
  /** Rota nossa (`/ir/fiz?…`), só em `disponivel_ligacao`. */
  destinoLigacao?: string;
}

interface FizNextStepProps {
  slug: string;
  /**
   * Ação já resolvida no servidor.
   *
   * Em modo LIGACAO a resposta NÃO DEPENDE DE NADA que só se saiba no
   * browser: o destino é conhecido no momento em que a página é renderizada.
   * Manter o `fetch` custava um round-trip por visita em 54 Guias, um salto
   * de layout, e — o mais grave — NENHUM LINK para quem tem JavaScript
   * desligado ou bloqueado.
   *
   * Sem `acaoInicial`, o componente faz exatamente o que fazia antes.
   */
  acaoInicial?: AcaoResolvida | null;
  /** Campos que este Guia propõe transferir, já com valores legíveis. */
  camposPropostos?: CampoConsentimento[];
  camposNuncaEnviados?: readonly string[];
  /**
   * O PESO deste bloco na página, não o seu conteúdo.
   *
   * `principal` é o cartão de sempre — tinta da FIZ, `h2`, botão cheio — e
   * continua a ser o que sai por omissão em todas as superfícies que já o
   * usavam. `secundaria` desenha o MESMO bloco, com a mesma divulgação,
   * num porte que não compete com a ação que está por cima.
   *
   * Existe porque no fim de um Guia há duas saídas, e nunca podem ter o
   * mesmo peso: duas ações iguais no fim de uma página é a forma garantida
   * de ninguém clicar em nenhuma. Quando o guia marca matéria que depende
   * do caso concreto, quem lidera é o contabilista e a FIZ recolhe — e
   * quando não marca, é ao contrário.
   *
   * ⚠️ O que NÃO muda com esta variante é a divulgação da relação
   * comercial: `FizDisclosure` aparece nas duas, porque «rotular antes do
   * clique» não é uma questão de porte.
   */
  variante?: "principal" | "secundaria";
  /**
   * A SUPERFÍCIE em que o bloco assenta — coisa diferente do peso.
   *
   * `marca` é o cartão tinto de amarelo de sempre, e continua a ser o que
   * sai por omissão nas superfícies que já o usavam: a homepage, as
   * ferramentas, os resultados. Aí o bloco É a página, ou uma das duas
   * coisas que a página tem.
   *
   * `sobrio` assenta na superfície neutra do site. Existe por causa dos
   * GUIAS, e por uma razão que não é estética:
   *
   *   · um Guia é conteúdo editorial, e a regra da casa é que a relação
   *     comercial se declara — não que se pinta. `FizDisclosure` continua
   *     onde estava, com o mesmo texto;
   *   · `MONETIZACAO_PROIBIDA` proíbe tratamento publicitário «dentro de
   *     resultados, páginas de elevada ansiedade ou fluxos de dados
   *     pessoais», e metade destes guias são exatamente isso — penhoras,
   *     execuções fiscais, dívidas, despedimento;
   *   · e porque um painel amarelo a toda a largura no fim de um artigo
   *     lê-se como anúncio antes de se ler como passo seguinte. Passou a
   *     haver duas saídas no fim de um Guia: se a mais berrante for a do
   *     parceiro, a hierarquia que `escolherRota()` calculou perde para a
   *     cor, e quem decide deixa de ser o motor.
   *
   * O que NÃO muda com o tom: o rótulo aprovado, o destino, o logótipo, a
   * divulgação e o botão continuam a ser os da FIZ. Baixar o volume não é
   * esconder — é deixar de gritar dentro de um texto.
   */
  tom?: "marca" | "sobrio";
}

const NUNCA_ENVIADOS_PADRAO = [
  "NIF", "NISS", "nome", "morada", "email", "telefone", "IBAN",
  "dados de clientes", "documentos emitidos", "credenciais",
] as const;

export default function FizNextStep({
  slug,
  acaoInicial = null,
  camposPropostos = [],
  camposNuncaEnviados = NUNCA_ENVIADOS_PADRAO,
  variante = "principal",
  tom = "marca",
}: FizNextStepProps) {
  const [acao, setAcao] = useState<AcaoResolvida | null>(acaoInicial);
  const [carregado, setCarregado] = useState(acaoInicial !== null);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Em LIGACAO a resposta é estática: já veio do servidor e não se repete.
    // Repetir o pedido não traria informação nova e reintroduziria
    // exatamente o round-trip que a resolução no servidor eliminou.
    if (acaoInicial?.estado === "disponivel_ligacao") return;
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
  }, [slug, acaoInicial]);

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

  const quieto = variante === "secundaria";
  const Titulo = quieto ? "h3" : "h2";

  // O tom decide a SUPERFÍCIE; a variante decide o PESO. São dois eixos, e
  // separá-los é o que permite a um Guia ter a FIZ a liderar sem que o fim
  // do artigo passe a ser um painel amarelo.
  const superficie =
    tom === "sobrio" || quieto
      ? "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
      : "border-fiz-200 bg-fiz-50";

  return (
    <section
      aria-labelledby={`fiz-proximo-${slug}`}
      className={`overflow-hidden rounded-4xl shadow-card border ${superficie} ${quieto ? "mt-4" : "mt-8"}`}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              quieto ? "text-stone-400" : "text-fiz-700"
            }`}
          >
            {quieto ? "Ou, para executar" : "Próximo passo"}
          </span>
          <span aria-hidden className={quieto ? "text-stone-300" : "text-fiz-400"}>·</span>
          <FizMarca size={15} />
        </div>

        <Titulo
          id={`fiz-proximo-${slug}`}
          className={
            quieto
              ? "font-display text-base font-semibold text-ink sm:text-lg"
              : "font-display text-xl font-semibold text-ink"
          }
        >
          {indisponivelTemporario ? "Continuação temporariamente indisponível" : acao.rotulo}
        </Titulo>

        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {indisponivelTemporario
            ? "Não conseguimos falar com a FIZ neste momento. Este guia e os simuladores continuam a funcionar normalmente."
            : "O Recibo Certo explica e prepara. A execução — faturação, declarações e prazos — acontece na FIZ."}
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
            {/* Modo LIGACAO: um `<a href>` real, presente no HTML inicial.
                Sem diálogo de consentimento — não há nada a consentir,
                porque não segue nada. */}
            {acao.estado === "disponivel_ligacao" && acao.destinoLigacao && (
              <FizActionButton variante={quieto ? "secundaria" : "primaria"} href={acao.destinoLigacao}>{acao.rotulo}</FizActionButton>
            )}

            {acao.estado === "disponivel_por_ligar" && (
              <div className="flex flex-col gap-2">
                <p className="flex items-start gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                  <LinkIcon size={13} className="mt-0.5 flex-shrink-0 text-fiz-700" />
                  <span>Para veres o teu estado real, liga a tua conta FIZ. Sem ligação, mostramos apenas regras gerais.</span>
                </p>
                <FizActionButton variante={quieto ? "secundaria" : "primaria"} href="/dashboard/conta?ligar=fiz">Ligar a minha conta FIZ</FizActionButton>
              </div>
            )}

            {acao.estado === "disponivel_criar_conta" && (
              <>
                {acao.requiresConsent && camposPropostos.length > 0 ? (
                  <FizActionButton variante={quieto ? "secundaria" : "primaria"} onClick={() => setDialogoAberto(true)}>{acao.rotulo}</FizActionButton>
                ) : (
                  <FizActionButton variante={quieto ? "secundaria" : "primaria"} href="/dashboard/conta?ligar=fiz">{acao.rotulo}</FizActionButton>
                )}
              </>
            )}

            {acao.estado === "disponivel_ligado" &&
              (acao.requiresConsent && camposPropostos.length > 0 ? (
                <FizActionButton variante={quieto ? "secundaria" : "primaria"} onClick={() => setDialogoAberto(true)}>{acao.rotulo}</FizActionButton>
              ) : (
                <FizActionButton variante={quieto ? "secundaria" : "primaria"} href="/dashboard/conta?ligar=fiz">{acao.rotulo}</FizActionButton>
              ))}

            {acao.estado === "requer_plano_fiz" && (
              <div className="flex flex-col gap-2">
                {/* Ponto 8.4: um serviço pago da FIZ nunca se confunde com o Plus. */}
                <p className="rounded-2xl bg-white px-3 py-2 text-xs leading-relaxed text-stone-600 dark:bg-stone-900 dark:text-stone-400">
                  Esta ação está sujeita às condições comerciais da FIZ e é independente do
                  Recibo Certo Plus.
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
