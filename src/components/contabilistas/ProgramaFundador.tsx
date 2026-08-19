"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O PROGRAMA FUNDADOR, E A NEGOCIAÇÃO PARA QUEM CHEGOU DEPOIS
//  ---------------------------------------------------------------------
//  Dois componentes, e a razão de serem dois é que nunca aparecem os dois
//  ao mesmo tempo: ou se é fundador, ou se está a negociar. Juntá-los num
//  só produzia um ecrã com metade sempre escondida.
//
//  O QUE ESTE ECRÃ NÃO PODE FAZER
//  ------------------------------
//  Vender pressa. «Restam 3 lugares» é um facto e diz-se; «só faltam 3,
//  despacha-te» é uma pressão, e a pressão numa decisão profissional é o
//  que faz alguém arrepender-se e cancelar duas semanas depois. O texto do
//  contador vem de `textoLugares`, que tem um teste a proibir essa família
//  de palavras.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAvisos } from "@/components/ui/Avisos";
import { Award, Check, Clock, Handshake, Info, Spinner, Warning } from "@/components/ui/Icons";
import {
  COMISSAO_FUNDADOR_TEXTO, JUSTIFICACAO_MAX, JUSTIFICACAO_MIN,
  estadoDaPropostaLegivel, poupancaDaProposta, textoLugares, validarProposta,
  type LugaresFundadores, type PropostaDesbloqueio,
} from "@/lib/contabilistas/progressao/fundadores";
import { formatarEuros } from "@/lib/contabilistas/progressao/catalogo";
import { DESBLOQUEIO_NAO_COMPRA } from "@/lib/contabilistas/progressao/fronteiras";
import {
  aceitarContraproposta, lugaresFundadores, meuLugarDeFundador,
  minhasPropostas, proporValor,
} from "@/lib/contabilistas/fonte/fundadores";

/* ── O cartão de fundador ──────────────────────────────────────────── */

export function CartaoDeFundador({
  numero, atribuidoEm,
}: { numero: number; atribuidoEm: string }) {
  return (
    <section className="rounded-4xl border border-brand/30 bg-brand-light/50 p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white"
          >
            <Award size={20} />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Programa fundador</p>
            <h2 className="mt-1 font-display text-2xl leading-tight text-ink">
              És o fundador n.º {numero}
            </h2>
          </div>
        </div>
        <Badge tone="brand">{COMISSAO_FUNDADOR_TEXTO} de comissão</Badge>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-stone-700">
        Ficas com <strong>{COMISSAO_FUNDADOR_TEXTO}</strong> — a comissão mais baixa que a
        tabela tem — sem precisares de subir patamar nenhum. Vale enquanto a tua conta de
        contabilista estiver ativa, e não desce se deixares de faturar durante um tempo.
      </p>

      <dl className="mt-4 grid gap-3 border-t border-brand/20 pt-4 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/70">
            Desde
          </dt>
          <dd className="mt-0.5 text-sm tabular-nums text-stone-700">
            {new Date(atribuidoEm).toLocaleDateString("pt-PT", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/70">
            O que continua a valer
          </dt>
          <dd className="mt-0.5 text-sm leading-relaxed text-stone-700">
            O XP e os créditos continuam a contar. Se um dia houver um patamar melhor do que
            este, ficas com o melhor dos dois.
          </dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * O cartão quando se sabe que é fundador mas não se conseguiu ler o
 * número. Acontece se a leitura da linha falhar — e é melhor do que
 * mostrar um «n.º 0» ou esconder um benefício que existe.
 */
function CartaoDeFundadorSemNumero() {
  return (
    <section className="rounded-4xl border border-brand/30 bg-brand-light/50 p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white"
        >
          <Award size={20} />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">Programa fundador</p>
          <h2 className="mt-1 font-display text-2xl leading-tight text-ink">
            Tens {COMISSAO_FUNDADOR_TEXTO} de comissão
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            És um dos primeiros. Vale enquanto a tua conta de contabilista estiver ativa.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── O contador, para quem ainda não é ─────────────────────────────── */

export function ContadorDeFundadores({ lugares }: { lugares: LugaresFundadores }) {
  if (lugares.esgotado && lugares.verificado) return null;

  return (
    <p className="flex items-start gap-2.5 rounded-2xl bg-brand-light px-4 py-3 text-xs leading-relaxed text-brand-dark">
      <Award size={15} className="mt-0.5 shrink-0" aria-hidden />
      <span>
        <strong>{textoLugares(lugares)}</strong> Os primeiros {lugares.total} contabilistas
        aprovados ficam com {COMISSAO_FUNDADOR_TEXTO} de comissão, de imediato e enquanto a
        conta estiver ativa.
      </span>
    </p>
  );
}

/* ── A negociação ──────────────────────────────────────────────────── */

export function NegociarDesbloqueio({
  precoCatalogoCents,
  patamarAlvo,
  aoMudar,
}: {
  precoCatalogoCents: number;
  patamarAlvo: number;
  aoMudar?: () => void;
}) {
  const avisos = useAvisos();
  const [propostas, setPropostas] = useState<PropostaDesbloqueio[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [aEscrever, setAEscrever] = useState(false);
  const [valor, setValor] = useState("");
  const [justificacao, setJustificacao] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try { setPropostas(await minhasPropostas()); }
    catch { /* sem ligação: o ecrã mostra o que consegue */ }
    finally { setACarregar(false); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const aberta = propostas.find(
    (p) => p.estado === "enviada" || p.estado === "contraproposta",
  );
  const ultimaAceite = propostas.find((p) => p.estado === "aceite");

  // Cêntimos, a partir do que a pessoa escreveu. Aceita vírgula e ponto:
  // num campo de euros em Portugal escreve-se vírgula, e recusar isso
  // seria fazer a pessoa duvidar do teclado dela.
  const valorCents = Math.round(Number(valor.replace(",", ".")) * 100);
  const validacao = validarProposta({
    valorCents: Number.isFinite(valorCents) ? valorCents : -1,
    precoCatalogoCents,
    justificacao,
  });

  async function enviar() {
    setOcupado(true);
    const { erro } = await proporValor(valorCents, justificacao);
    setOcupado(false);
    if (erro) { avisos.erro(erro); return; }
    setValor(""); setJustificacao(""); setAEscrever(false);
    avisos.sucesso("Proposta enviada.", {
      detalhe: "Vai direta ao administrador. Avisamos-te quando houver decisão.",
    });
    await carregar();
    aoMudar?.();
  }

  async function aceitar(id: string) {
    setOcupado(true);
    const { erro } = await aceitarContraproposta(id);
    setOcupado(false);
    if (erro) { avisos.erro(erro); return; }
    avisos.sucesso("Contraproposta aceite.", {
      detalhe: "É este o valor que vais pagar ao desbloquear.",
    });
    await carregar();
    aoMudar?.();
  }

  if (aCarregar) {
    return <div className="h-32 animate-pulse rounded-4xl bg-stone-100" />;
  }

  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-600"
        >
          <Handshake size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg text-ink">Propor outro valor</h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-500">
            Se o preço de tabela não faz sentido no teu caso, diz qual faz e porquê. A
            proposta vai direta ao administrador, que aceita, contrapõe ou recusa. Isto é
            além dos créditos de fidelidade — não em vez deles.
          </p>
        </div>
      </div>

      {ultimaAceite && !aberta && (
        <PropostaEmCurso proposta={ultimaAceite} />
      )}

      {aberta ? (
        <>
          <PropostaEmCurso proposta={aberta} />
          {aberta.estado === "contraproposta" && aberta.contrapropostaCents !== null && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => void aceitar(aberta.id)} disabled={ocupado}>
                {ocupado
                  ? <><Spinner size={14} /> A aceitar…</>
                  : `Aceitar ${formatarEuros(aberta.contrapropostaCents)}`}
              </Button>
            </div>
          )}
        </>
      ) : !aEscrever ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={() => setAEscrever(true)}>
            <Handshake size={14} aria-hidden /> Propor um valor
          </Button>
          <p className="mt-2 text-xs text-stone-400">
            Preço de tabela para o patamar {patamarAlvo}:{" "}
            <strong className="tabular-nums text-stone-600">
              {formatarEuros(precoCatalogoCents)}
            </strong>
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-stone-200 bg-cream/50 p-4">
          <label htmlFor="valor-proposto" className="block text-sm font-semibold text-stone-700">
            O valor que propões
          </label>
          <p className="mt-0.5 text-xs text-stone-500">
            Tem de ser abaixo de {formatarEuros(precoCatalogoCents)} — senão não há nada a
            negociar.
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              id="valor-proposto"
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 10))}
              placeholder="25,00"
              className="w-32 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
            <span className="text-sm text-stone-500">€</span>
          </div>

          <label
            htmlFor="justificacao"
            className="mt-4 block text-sm font-semibold text-stone-700"
          >
            Porque é que faz sentido
          </label>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
            É isto que a pessoa do outro lado vai ler para decidir. Quantos clientes tens,
            que volume esperas trazer, o que te faz achar que este valor é o justo.
          </p>
          <textarea
            id="justificacao"
            rows={5}
            value={justificacao}
            onChange={(e) => setJustificacao(e.target.value.slice(0, JUSTIFICACAO_MAX))}
            className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
          <p className="mt-1 text-[11px] tabular-nums text-stone-400">
            {justificacao.trim().length} / {JUSTIFICACAO_MIN} mínimo
          </p>

          {justificacao.length > 0 && !validacao.valido && (
            <ul className="mt-2 space-y-1" role="status">
              {validacao.problemas.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-2 text-xs leading-relaxed text-alert-text"
                >
                  <Warning size={12} className="mt-0.5 shrink-0" aria-hidden /> {p}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => void enviar()}
              disabled={!validacao.valido || ocupado}
              className="w-full sm:w-auto"
            >
              {ocupado ? <><Spinner size={14} /> A enviar…</> : "Enviar ao administrador"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setAEscrever(false)}
              disabled={ocupado}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* A mesma lista que já aparece no desbloqueio pago. Repete-se aqui
          de propósito: um valor negociado é um pagamento, e um pagamento
          cujo efeito não está explícito é um pagamento mal informado. */}
      <div className="mt-5 border-t border-stone-100 pt-4">
        <p className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
          <Info size={13} aria-hidden /> O que um valor acordado não compra
        </p>
        <ul className="mt-2 space-y-1">
          {DESBLOQUEIO_NAO_COMPRA.map((linha) => (
            <li key={linha} className="flex items-start gap-2 text-xs leading-relaxed text-stone-500">
              <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-300" />
              {linha}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PropostaEmCurso({ proposta }: { proposta: PropostaDesbloqueio }) {
  const { titulo, explicacao, tom } = estadoDaPropostaLegivel(proposta);
  const emCima = proposta.contrapropostaCents ?? proposta.valorPropostoCents;
  const poupanca = poupancaDaProposta(proposta);

  const cor = tom === "bom"
    ? "border-brand/30 bg-brand-light/40"
    : tom === "aviso"
      ? "border-alert-border bg-alert-bg/40"
      : "border-stone-200 bg-cream/50";

  return (
    <div className={`mt-4 rounded-3xl border p-4 ${cor}`}>
      <div className="flex flex-wrap items-center gap-2">
        {tom === "bom"
          ? <Check size={14} className="text-brand-dark" aria-hidden />
          : <Clock size={14} className="text-stone-500" aria-hidden />}
        <span className="text-sm font-semibold text-stone-800">{titulo}</span>
        <span className="text-[11px] tabular-nums text-stone-400">
          {new Date(proposta.criadoEm).toLocaleDateString("pt-PT", {
            day: "numeric", month: "short",
          })}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-stone-600">{explicacao}</p>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <dt className="text-[11px] text-stone-500">Preço de tabela</dt>
          <dd className="text-sm tabular-nums text-stone-500 line-through">
            {formatarEuros(proposta.precoCatalogoCents)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-stone-500">
            {proposta.contrapropostaCents !== null ? "Contraproposta" : "O teu valor"}
          </dt>
          <dd className="text-sm font-semibold tabular-nums text-stone-800">
            {formatarEuros(emCima)}
          </dd>
        </div>
        {poupanca > 0 && (
          <div>
            <dt className="text-[11px] text-stone-500">Diferença</dt>
            <dd className="text-sm tabular-nums text-brand-dark">−{formatarEuros(poupanca)}</dd>
          </div>
        )}
      </dl>

      {proposta.notaAdmin && (
        <p className="mt-3 rounded-2xl bg-white/70 px-3 py-2 text-xs leading-relaxed text-stone-600">
          {proposta.notaAdmin}
        </p>
      )}
    </div>
  );
}

/* ── O que a página de progressão monta ────────────────────────────── */

/**
 * Decide sozinho o que mostrar: o cartão de fundador, ou a negociação.
 *
 * Existe para a página não ter de saber a regra. A regra é uma só — ou se
 * é fundador, ou se pode negociar — e viver em dois sítios era garantir
 * que um deles ficava desatualizado.
 */
export default function ProgramaFundador({
  eFundador,
  precoCatalogoCents,
  patamarAlvo,
  aoMudar,
}: {
  /**
   * Vem do mesmo estado que desenha o herói.
   *
   * É a AUTORIDADE sobre qual dos dois blocos se mostra. A leitura própria
   * deste componente serve para o número e a data do lugar — se ela
   * falhar, um fundador continua a não ver uma proposta de negociação que
   * não lhe serve de nada.
   */
  eFundador: boolean;
  /** Nulo quando não há patamar seguinte para desbloquear. */
  precoCatalogoCents: number | null;
  patamarAlvo: number | null;
  aoMudar?: () => void;
}) {
  const [lugar, setLugar] = useState<{ numero: number; atribuidoEm: string } | null>(null);
  const [lugares, setLugares] = useState<LugaresFundadores | null>(null);
  const [aCarregar, setACarregar] = useState(true);

  useEffect(() => {
    let vivo = true;
    Promise.all([meuLugarDeFundador(), lugaresFundadores()])
      .then(([l, ls]) => { if (vivo) { setLugar(l); setLugares(ls); } })
      .catch(() => {})
      .finally(() => { if (vivo) setACarregar(false); });
    return () => { vivo = false; };
  }, []);

  if (aCarregar) {
    return <div className="h-32 animate-pulse rounded-4xl bg-stone-100" />;
  }

  if (eFundador) {
    // Sem o número — a leitura falhou — mostra-se o cartão na mesma, sem
    // inventar um. O benefício é verdade; o número é um pormenor.
    return lugar
      ? <CartaoDeFundador numero={lugar.numero} atribuidoEm={lugar.atribuidoEm} />
      : <CartaoDeFundadorSemNumero />;
  }

  return (
    <div className="space-y-4">
      {lugares && !lugares.esgotado && <ContadorDeFundadores lugares={lugares} />}
      {precoCatalogoCents !== null && patamarAlvo !== null && (
        <NegociarDesbloqueio
          precoCatalogoCents={precoCatalogoCents}
          patamarAlvo={patamarAlvo}
          aoMudar={aoMudar}
        />
      )}
    </div>
  );
}
