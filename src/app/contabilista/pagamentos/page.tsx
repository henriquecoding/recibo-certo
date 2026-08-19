"use client";

// ═══════════════════════════════════════════════════════════════════════
//  RECEBIMENTOS — a conta onde o dinheiro do contabilista cai
//  ---------------------------------------------------------------------
//  O ecrã tem de dizer três coisas antes de qualquer outra, porque são as
//  três perguntas que uma pessoa faz quando lhe pedem dados bancários:
//
//    1. quem recebe o dinheiro (ele, não nós);
//    2. quanto é que fica pelo caminho (a comissão do patamar dele);
//    3. quando é que o dinheiro chega (regras de payout da Stripe).
//
//  A cobrança é DIRETA: nasce na conta dele, é o nome dele no extrato do
//  cliente, e o dinheiro nunca entra no saldo do Recibo Certo. Dizer isto
//  não é marketing — é a diferença entre o que fazemos e ser intermediário
//  financeiro, e a pessoa tem direito a saber de que lado está.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAvisos } from "@/components/ui/Avisos";
import {
  abrirOnboarding, estadoDosRecebimentos, euros, listarPagamentos,
  liquidoParaOContabilista, sincronizarRecebimentos,
  type EstadoRecebimentos, type Pagamento,
} from "@/lib/contabilistas/fonte/pagamentos";
import { obterProgressao } from "@/lib/contabilistas/fonte/dados";
import { formatarComissao, vistaProgressao } from "@/lib/contabilistas/progressao/catalogo";
import {
  Check, ExternalLink, Invoice, Lock, ShieldCheck, Warning,
} from "@/components/ui/Icons";

const ROTULO_ESTADO: Record<string, { texto: string; tom: "brand" | "alert" | "neutral" | "danger" }> = {
  pendente: { texto: "À espera", tom: "alert" },
  pago: { texto: "Pago", tom: "brand" },
  falhado: { texto: "Falhou", tom: "danger" },
  reembolsado: { texto: "Devolvido", tom: "neutral" },
  cancelado: { texto: "Cancelado", tom: "neutral" },
  expirado: { texto: "Expirou", tom: "neutral" },
};

export default function PagamentosPage() {
  const { ficha, aCarregar } = usarFicha();
  const avisos = useAvisos();
  const params = useSearchParams();

  const [conta, setConta] = useState<EstadoRecebimentos | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [comissaoBps, setComissaoBps] = useState<number | null>(null);
  const [eFundador, setEFundador] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (id: string) => {
    try {
      const [c, p, prog] = await Promise.all([
        estadoDosRecebimentos(),
        listarPagamentos({ contabilistaId: id }).catch(() => []),
        obterProgressao(id).catch(() => null),
      ]);
      setConta(c);
      setPagamentos(p);
      // ⚠️ A EFETIVA, não a do patamar. Esta é a página do dinheiro: dizer
      // aqui a percentagem do patamar a um fundador — que paga menos —
      // seria anunciar uma retenção diferente da que a Stripe faz. O
      // `comissaoEfetivaBps` espelha `comissao_bps_do_contabilista`, que é
      // a função que calcula o `application_fee`.
      if (prog) {
        setComissaoBps(vistaProgressao(prog).comissaoEfetivaBps);
        setEFundador(prog.eFundador);
      }
      setErro(null);
    } catch (e) {
      setErro((e as Error).message);
    }
  }, []);

  useEffect(() => { if (ficha) void carregar(ficha.userId); }, [ficha, carregar]);

  // Quem volta do formulário da Stripe quer ver o resultado já. O webhook é
  // a fonte normal, mas chega quando chega — e ficar a olhar para «em
  // análise» depois de ter acabado tudo parece uma avaria.
  useEffect(() => {
    if (params.get("estado") !== "voltou") return;
    void (async () => {
      const r = await sincronizarRecebimentos();
      if (!r.erro) setConta({ ...r, ligada: true });
    })();
  }, [params]);

  if (aCarregar || !ficha || !conta) return <EsqueletoPainel forma="lista" />;

  async function ligar() {
    setOcupado(true);
    const r = await abrirOnboarding();
    setOcupado(false);
    if (r.erro) { avisos.erro("Não foi possível abrir o formulário.", { detalhe: r.erro }); return; }
    if (r.url) window.location.href = r.url;
  }

  async function verPainel() {
    setOcupado(true);
    const r = await sincronizarRecebimentos();
    setOcupado(false);
    if (r.erro) { avisos.erro("Não foi possível abrir.", { detalhe: r.erro }); return; }
    setConta({ ...r, ligada: true });
    if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
    else avisos.erro("Ainda não há painel para abrir.", { detalhe: "Acaba primeiro o formulário." });
  }

  const recebidos = pagamentos.filter((p) => p.estado === "pago");
  const totalRecebido = recebidos.reduce((s, p) => s + liquidoParaOContabilista(p), 0);
  const aguardar = pagamentos.filter((p) => p.estado === "pendente");

  return (
    <div className="space-y-6">
      <CabecalhoPainel
        titulo="Recebimentos"
        descricao="Onde o dinheiro das tuas consultas cai, e o que já lá caiu."
      />

      {erro && (
        <p role="alert" className="rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">{erro}</p>
      )}

      {/* ── Quem recebe o quê. Antes de qualquer botão. ─────────────── */}
      <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-lg text-ink">
          <ShieldCheck size={17} className="shrink-0 text-brand-dark" aria-hidden />
          Como funciona o dinheiro
        </h2>
        <ul className="mt-3 space-y-2.5">
          {[
            "O cliente paga-te a ti. A cobrança nasce na tua conta Stripe e é o teu nome que aparece no extrato dele.",
            "O dinheiro nunca passa pela conta do Recibo Certo. Vai direto para o teu saldo.",
            comissaoBps !== null
              ? eFundador
                ? `A nossa comissão é ${formatarComissao(comissaoBps)} e é retida no momento do pagamento. É a do programa fundador — não sobe.`
                : `A nossa comissão é ${formatarComissao(comissaoBps)} e é retida no momento do pagamento. Desce à medida que subes de patamar.`
              : "A nossa comissão depende do teu patamar e é retida no momento do pagamento.",
            "Os pagamentos saem do teu saldo Stripe para o teu IBAN segundo o calendário que definires no painel da Stripe.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-sm leading-relaxed text-stone-600">
              <Check size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* ── O estado da conta ───────────────────────────────────────── */}
      {!conta.ligada ? (
        <section className="rounded-4xl border border-brand/25 bg-brand-light/40 p-5 sm:p-6">
          <h2 className="font-display text-xl text-ink">Ainda não recebes pagamentos por aqui</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
            Para os teus clientes poderem pagar-te pelo Recibo Certo, precisas de uma conta
            Stripe. O formulário é da Stripe e pede o que a lei obriga: identificação, morada
            e o IBAN onde queres receber. Nós não vemos nem guardamos nada disso.
          </p>
          <div className="mt-5">
            <Button onClick={ligar} disabled={ocupado}>
              {ocupado ? "A abrir…" : "Ativar recebimentos"}
            </Button>
          </div>
        </section>
      ) : !conta.podeCobrar ? (
        <section className="rounded-4xl border border-alert-border bg-alert-bg p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-lg text-alert-text">
            <Warning size={17} aria-hidden />
            {conta.dadosSubmetidos ? "A Stripe está a analisar" : "Falta acabar o formulário"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-alert-text">
            {conta.dadosSubmetidos
              ? "Já enviaste tudo. Assim que a Stripe verificar, os teus clientes passam a poder pagar-te aqui — avisamos-te."
              : "A conta existe mas ainda não está pronta para cobrar. Faltam dados no formulário da Stripe."}
          </p>

          {conta.requisitos.length > 0 && (
            <div className="mt-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-alert-text/70">
                O que a Stripe ainda pede
              </p>
              <ul className="mt-1.5 space-y-1">
                {conta.requisitos.slice(0, 8).map((r) => (
                  <li key={r} className="font-mono text-xs text-alert-text/85">{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={ligar} disabled={ocupado}>
              {conta.dadosSubmetidos ? "Rever os dados" : "Continuar o formulário"}
            </Button>
            <Button variant="secondary" onClick={verPainel} disabled={ocupado}>
              Verificar outra vez
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <Check size={17} className="shrink-0 text-brand" aria-hidden />
                Recebes pagamentos pelo Recibo Certo
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {conta.podeReceber
                  ? "As transferências para o teu IBAN estão ativas."
                  : "Podes cobrar, mas as transferências para o IBAN ainda não estão ativas."}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={verPainel} disabled={ocupado}>
              <ExternalLink size={14} aria-hidden /> Painel da Stripe
            </Button>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <Tile valor={euros(totalRecebido)} rotulo="recebido, já sem comissão" destaque />
            <Tile valor={String(recebidos.length)} rotulo={recebidos.length === 1 ? "pagamento" : "pagamentos"} />
            <Tile valor={String(aguardar.length)} rotulo="à espera de pagamento" />
          </dl>
        </section>
      )}

      {/* ── O histórico ─────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xl text-ink">Pagamentos</h2>
        {pagamentos.length === 0 ? (
          <div className="mt-3">
            <EstadoVazio
              Icon={Invoice}
              titulo="Ainda não recebeste nenhum pagamento"
              descricao="Quando um cliente pagar uma consulta pelo Recibo Certo, aparece aqui com o valor e a comissão descriminados."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {pagamentos.map((p) => {
              const meta = ROTULO_ESTADO[p.estado] ?? { texto: p.estado, tom: "neutral" as const };
              return (
                <li key={p.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3.5 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-800">
                        {p.descricao ?? "Consulta"}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" })
                          .format(new Date(p.pagoEm ?? p.criadoEm))}
                        {p.momento === "no_pedido" ? " · pago ao marcar" : " · pago depois"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className="text-right">
                        <span className="block text-sm font-semibold tabular-nums text-ink">
                          {euros(liquidoParaOContabilista(p))}
                        </span>
                        {p.comissaoCents > 0 && (
                          <span className="block text-[0.6875rem] tabular-nums text-stone-400">
                            de {euros(p.liquidoCents)} · {euros(p.comissaoCents)} de comissão
                          </span>
                        )}
                      </span>
                      <Badge tone={meta.tom}>{meta.texto}</Badge>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-2.5 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs leading-relaxed text-stone-500">
        <Lock size={14} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
        Os dados bancários e de identificação vivem na Stripe e nunca passam pelos nossos
        servidores. O que guardamos é o que vês aqui: valores, datas e estado.
      </p>
    </div>
  );
}

function Tile({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3.5 ${
      destaque ? "border-brand/25 bg-brand-light/50" : "border-stone-200 bg-cream/60"
    }`}>
      <dt className="sr-only">{rotulo}</dt>
      <dd>
        <span className={`block font-display text-2xl leading-none tabular-nums ${
          destaque ? "text-brand-dark" : "text-ink"
        }`}>
          {valor}
        </span>
        <span className="mt-1.5 block text-xs leading-tight text-stone-600">{rotulo}</span>
      </dd>
    </div>
  );
}
