"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "@/lib/format";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { IVA_LIMIAR_MENSAL } from "@/lib/fiscal-iva";
import type { PagamentosConta } from "@/lib/fiscal";
import {
  CHIP_ENTRADA,
  DOT_ENTRADA,
  META_MOVIMENTO,
  construirCalendarioFiscal,
  dataCurta,
  dataPorExtenso,
  progressoDoAno,
  regimeIVAPorVolume,
  type MovimentoFiscal,
  type TipoMovimento,
} from "@/lib/calendario-fiscal";
import { FONTES_PRAZOS } from "@/lib/prazos";
import { Calendar, ExternalLink, Warning } from "@/components/ui/Icons";

/**
 * Valor curto para os mosaicos dos meses: sem cêntimos, para caber inteiro no
 * mosaico mais estreito que as `@container` permitem (~85 px). Um número
 * cortado ao meio é pior do que número nenhum.
 */
const eurCurto = (n: number): string =>
  `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(
    Math.round(Number.isFinite(n) ? n : 0),
  )} €`;

interface TimelineFiscalProps {
  ssAnualMensal: number;
  isencaoSS: boolean;
  acertoIRS: number;
  temIva: boolean;
  ivaTotal: number;
  faturacaoAnual: number;
  /**
   * Pagamentos por conta de IRS estimados (Art. 102.º CIRS). São a saída de
   * tesouraria que ninguém vê chegar: não saem de nenhum recibo, e para quem
   * factura sem retenção são a maior do ano.
   */
  pagamentosConta?: PagamentosConta;
  className?: string;
}

/** Ordem fixa da legenda — não a do objeto, que muda com a implementação. */
const ORDEM_TIPOS: TipoMovimento[] = ["ss", "irs", "iva", "ppc"];

export default function TimelineFiscal({
  ssAnualMensal,
  isencaoSS,
  acertoIRS,
  temIva,
  ivaTotal,
  faturacaoAnual,
  pagamentosConta,
  className = "",
}: TimelineFiscalProps) {
  // `new Date()` no corpo do render devolvia uma coisa no servidor e outra no
  // cliente. Tudo o que depende de «hoje» espera pela montagem; o calendário
  // em si é o do ano fiscal simulado e não depende do relógio.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const ano = FISCAL_YEAR;

  const calendario = useMemo(
    () =>
      construirCalendarioFiscal({
        ano,
        ssMensal: isencaoSS ? 0 : ssAnualMensal,
        isencaoSS,
        acertoIRS,
        regimeIVA: regimeIVAPorVolume(temIva, faturacaoAnual, IVA_LIMIAR_MENSAL),
        ivaAnual: temIva ? ivaTotal : 0,
        pagamentosConta: pagamentosConta
          ? {
              total: pagamentosConta.total,
              prestacao: pagamentosConta.prestacao,
              meses: pagamentosConta.meses,
            }
          : undefined,
      }),
    [ano, ssAnualMensal, isencaoSS, acertoIRS, temIva, ivaTotal, faturacaoAnual, pagamentosConta],
  );

  const { meses, totais } = calendario;

  const hoje = montado ? new Date() : null;
  const noAnoSimulado = hoje !== null && hoje.getFullYear() === ano;
  const mesAtual = noAnoSimulado ? hoje.getMonth() : null;
  const progresso = !hoje
    ? 0
    : noAnoSimulado
      ? progressoDoAno(hoje)
      : hoje.getFullYear() > ano
        ? 1
        : 0;

  // O mês aberto segue o mês corrente até a pessoa escolher outro.
  const [mesEscolhido, setMesEscolhido] = useState<number | null>(null);
  const mesAberto = mesEscolhido ?? mesAtual ?? 0;
  const mesDetalhe = meses[mesAberto];

  const tiposPresentes = useMemo(() => {
    const s = new Set<TipoMovimento>();
    meses.forEach((m) => m.movimentos.forEach((mv) => s.add(mv.tipo)));
    return ORDEM_TIPOS.filter((t) => s.has(t));
  }, [meses]);

  // ── Navegação por teclado da grelha (padrão tablist) ────────────────
  const refsMes = useRef<(HTMLButtonElement | null)[]>([]);
  const irPara = useCallback((i: number) => {
    const alvo = ((i % 12) + 12) % 12;
    setMesEscolhido(alvo);
    refsMes.current[alvo]?.focus();
  }, []);

  const onTeclaGrelha = useCallback(
    (e: React.KeyboardEvent, indice: number) => {
      // A grelha muda de 3 para 6 colunas conforme a largura do contentor,
      // por isso as setas andam sempre de um em um: é o único movimento que
      // se mantém previsível em qualquer largura.
      const mapa: Record<string, number | undefined> = {
        ArrowRight: indice + 1,
        ArrowDown: indice + 1,
        ArrowLeft: indice - 1,
        ArrowUp: indice - 1,
        Home: 0,
        End: 11,
      };
      const destino = mapa[e.key];
      if (destino === undefined) return;
      e.preventDefault();
      irPara(destino);
    },
    [irPara],
  );

  const ssAlto = !isencaoSS && ssAnualMensal > 300;
  const irsAPagar = acertoIRS < 0 ? Math.abs(acertoIRS) : 0;
  const irsAReceber = acertoIRS > 0 ? acertoIRS : 0;
  const movimentoAcerto = useMemo(
    () => calendario.movimentos.find((m) => m.tipo === "irs" && m.natureza === "pagamento"),
    [calendario],
  );
  const dataAcerto = movimentoAcerto ? dataCurta(movimentoAcerto.data) : "31 ago";

  if (faturacaoAnual <= 0) return null;

  return (
    // `cal-fiscal` abre o contexto de `@container` (ver globals.css): as
    // grelhas lá dentro medem esta coluna, não o ecrã.
    <div className={`cal-fiscal ${className}`}>
      {/* ── Cabeçalho ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 dark:bg-brand/15">
            <Calendar size={16} className="text-brand" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold leading-tight text-stone-800 dark:text-stone-100">
              Calendário fiscal
            </h4>
            <p className="text-[11px] leading-tight text-stone-400 dark:text-stone-500">
              {ano} · datas oficiais, ajustadas a dias úteis
            </p>
          </div>
        </div>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400 dark:text-stone-500">
          {tiposPresentes.map((tipo) => (
            <li key={tipo} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${META_MOVIMENTO[tipo].corDot}`} aria-hidden />
              {META_MOVIMENTO[tipo].legenda}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Barra de progresso do ano ── */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
          role="progressbar"
          aria-label={`Ano de ${ano} decorrido`}
          aria-valuenow={Math.round(progresso * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-brand/40 transition-all duration-500"
            style={{ width: `${progresso * 100}%` }}
          />
        </div>
        <span className="flex-shrink-0 text-[10px] font-semibold tabular-nums text-stone-400 dark:text-stone-500">
          {montado ? `${Math.round(progresso * 100)}% do ano` : `Ano de ${ano}`}
        </span>
      </div>

      {/* ── Grelha de meses ── */}
      <div
        role="tablist"
        aria-label="Meses do calendário fiscal"
        aria-orientation="horizontal"
        className="cal-grelha grid items-stretch gap-2"
      >
        {meses.map((m) => {
          const ehAtual = m.indice === mesAtual;
          const ehAberto = m.indice === mesAberto;
          const isPassado = mesAtual !== null && m.indice < mesAtual;
          const tipos = ORDEM_TIPOS.filter((t) => m.movimentos.some((mv) => mv.tipo === t)).map(
            (t) => ({ t, comDinheiro: m.movimentos.some((mv) => mv.tipo === t && mv.valor > 0) }),
          );
          const soEntradas = m.entradas > 0 && m.saidas === 0;
          const nObrigacoes = m.movimentos.length;
          const rotuloLeitor = [
            m.nomeLongo,
            m.saidas > 0 ? `${fmt(m.saidas)} a pagar` : null,
            m.entradas > 0 ? `${fmt(m.entradas)} a receber` : null,
            nObrigacoes === 0
              ? "sem obrigações"
              : nObrigacoes === 1
                ? "1 obrigação"
                : `${nObrigacoes} obrigações`,
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <button
              key={m.nome}
              type="button"
              role="tab"
              id={`mes-tab-${m.indice}`}
              aria-selected={ehAberto}
              aria-controls="mes-painel"
              aria-label={rotuloLeitor}
              tabIndex={ehAberto ? 0 : -1}
              ref={(el) => {
                refsMes.current[m.indice] = el;
              }}
              onClick={() => setMesEscolhido(m.indice)}
              onKeyDown={(e) => onTeclaGrelha(e, m.indice)}
              className={`flex h-full flex-col rounded-2xl border p-2.5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                ehAberto
                  ? "border-brand/60 bg-brand/5 shadow-card ring-1 ring-brand/25 dark:border-brand/50 dark:bg-brand/10"
                  : isPassado
                    ? "border-stone-100 bg-white/60 hover:border-stone-200 dark:border-stone-800/60 dark:bg-stone-900/40"
                    : "border-stone-200/70 bg-white hover:border-stone-300 hover:shadow-card dark:border-stone-800 dark:bg-stone-900/60"
              }`}
            >
              {/* Mês + marcador de «agora». Envolve em vez de cortar: era o
                  emblema a sair pela direita do cartão. */}
              <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                <span
                  className={`text-[11px] font-bold uppercase leading-none tracking-wider ${
                    ehAberto
                      ? "text-brand-dark dark:text-brand"
                      : isPassado
                        ? "text-stone-300 dark:text-stone-600"
                        : "text-stone-500 dark:text-stone-400"
                  }`}
                >
                  {m.nome}
                </span>
                {ehAtual && (
                  <span className="rounded bg-brand px-1 py-px text-[8px] font-bold uppercase leading-[1.4] tracking-wide text-white">
                    Agora
                  </span>
                )}
              </span>

              {/* Categorias do mês, em pontos: cheio quando há dinheiro a
                  mexer, contorno quando é só declaração. O detalhe vive no
                  painel. */}
              <span className="mt-2 flex min-h-[8px] flex-wrap items-center gap-1">
                {tipos.map(({ t, comDinheiro }) => (
                  <span
                    key={t}
                    className={`h-2 w-2 rounded-full ${
                      comDinheiro
                        ? META_MOVIMENTO[t].corDot
                        : `ring-1 ring-inset ${META_MOVIMENTO[t].corAro}`
                    } ${isPassado ? "opacity-50" : ""}`}
                    aria-hidden
                  />
                ))}
                {tipos.length === 0 && (
                  <span className="h-2 w-2 rounded-full bg-stone-200 dark:bg-stone-700" aria-hidden />
                )}
              </span>

              {/* O número do mês, inteiro. `mt-auto` alinha-o em baixo em
                  todos os cartões, mesmo com contagens de pontos diferentes. */}
              <span
                className={`mt-auto whitespace-nowrap pt-2 text-[11px] font-bold tabular-nums leading-none ${
                  soEntradas
                    ? "text-emerald-600 dark:text-emerald-400"
                    : m.saidas > 0
                      ? isPassado
                        ? "text-stone-400 dark:text-stone-500"
                        : "text-stone-700 dark:text-stone-200"
                      : "text-stone-300 dark:text-stone-600"
                }`}
                aria-hidden
              >
                {soEntradas
                  ? `+${eurCurto(m.entradas)}`
                  : m.saidas > 0
                    ? eurCurto(m.saidas)
                    : m.movimentos.length > 0
                      ? "declarar"
                      : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Painel do mês aberto ── */}
      <div
        role="tabpanel"
        id="mes-painel"
        aria-labelledby={`mes-tab-${mesAberto}`}
        tabIndex={-1}
        className="mt-2 rounded-2xl border border-stone-200/70 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/60"
      >
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h5 className="text-sm font-bold text-stone-800 dark:text-stone-100">
            {/* Só o mês leva maiúscula: `capitalize` no elemento inteiro
                escrevia «Agosto De 2026». */}
            <span className="capitalize">{mesDetalhe.nomeLongo}</span> de {ano}
          </h5>
          <span className="text-[11px] tabular-nums text-stone-400 dark:text-stone-500">
            {mesDetalhe.saidas > 0 ? `${fmt(mesDetalhe.saidas)} a sair` : null}
            {mesDetalhe.saidas > 0 && mesDetalhe.entradas > 0 ? " · " : null}
            {mesDetalhe.entradas > 0 ? `${fmt(mesDetalhe.entradas)} a entrar` : null}
            {mesDetalhe.saidas === 0 && mesDetalhe.entradas === 0
              ? mesDetalhe.movimentos.length > 0
                ? "Sem dinheiro a mexer"
                : "Sem obrigações"
              : null}
          </span>
        </div>

        {mesDetalhe.movimentos.length === 0 ? (
          <p className="text-xs leading-relaxed text-stone-400 dark:text-stone-500">
            Não há prazos fiscais neste mês para o teu enquadramento. As contribuições
            e declarações voltam nos meses assinalados acima.
          </p>
        ) : (
          <ul className="space-y-2">
            {mesDetalhe.movimentos.map((mv) => (
              <LinhaMovimento key={mv.id} mv={mv} />
            ))}
          </ul>
        )}
      </div>

      {/* ── Resumo anual ── */}
      <div className="cal-resumo mt-4 grid gap-2">
        <CartaoResumo
          cor={META_MOVIMENTO.ss.corDot}
          titulo="Segurança Social"
          valor={isencaoSS ? "Isento" : fmt(totais.ss)}
          destaque={isencaoSS ? "brand" : "neutro"}
          nota={
            isencaoSS
              ? "isenção do 1.º ano — declaras à mesma"
              : totais.ss > 0
                ? `${fmt(ssAnualMensal)}/mês × 12 · até dia 20`
                : undefined
          }
        />
        <CartaoResumo
          cor={META_MOVIMENTO.irs.corDot}
          titulo="Acerto IRS"
          valor={
            totais.irs > 0
              ? fmt(totais.irs)
              : totais.reembolso > 0
                ? `+${fmt(totais.reembolso)}`
                : "Sem acerto"
          }
          destaque={totais.irs > 0 ? "negativo" : totais.reembolso > 0 ? "positivo" : "brand"}
          nota={
            totais.irs > 0
              ? `a pagar até ${dataAcerto}`
              : totais.reembolso > 0
                ? `reembolso até ${dataAcerto}`
                : "a retenção cobre o IRS"
          }
        />
        <CartaoResumo
          cor={META_MOVIMENTO.iva.corDot}
          titulo="IVA previsto"
          valor={totais.iva > 0 ? fmt(totais.iva) : "Isento"}
          destaque={totais.iva > 0 ? "neutro" : "brand"}
          nota={
            totais.iva > 0
              ? calendario.regimeIVA === "normal-mensal"
                ? `${fmt(totais.iva / 12)}/mês · pagamento ao dia 25`
                : `${fmt(totais.iva / 4)}/trimestre · pagamento ao dia 25`
              : "Art. 53.º do CIVA"
          }
        />
        {pagamentosConta && (pagamentosConta.total > 0 || pagamentosConta.abaixoDoMinimo) && (
          <CartaoResumo
            cor={META_MOVIMENTO.ppc.corDot}
            titulo="Pagamentos por conta"
            valor={pagamentosConta.total > 0 ? fmt(pagamentosConta.total) : "Não exigível"}
            destaque={pagamentosConta.total > 0 ? "neutro" : "brand"}
            nota={
              pagamentosConta.total > 0
                ? `${fmt(pagamentosConta.prestacao)} × ${pagamentosConta.numero} · jul · set · dez`
                : "cada prestação fica abaixo do mínimo legal"
            }
          />
        )}
      </div>

      {/* ── Total anual ── */}
      <div className="mt-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Total de saídas no ano
          </span>
          <span className="text-lg font-bold tabular-nums text-stone-800 dark:text-stone-100">
            {fmt(totais.saidas)}
          </span>
        </div>
        {totais.entradas > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-stone-200 pt-1.5 text-[11px] dark:border-stone-700">
            <span className="text-stone-400 dark:text-stone-500">
              Menos o reembolso de {dataAcerto} · custo líquido do ano
            </span>
            <span className="font-bold tabular-nums text-stone-600 dark:text-stone-300">
              {fmt(totais.liquido)}
            </span>
          </div>
        )}
      </div>

      {/* ── Avisos contextuais ── */}
      {ssAlto && (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-alert-border bg-alert-bg px-4 py-3 text-xs leading-relaxed text-alert-text">
          <span className="mt-0.5 flex-shrink-0">
            <Warning size={14} />
          </span>
          <span>
            A tua Segurança Social ronda os <strong>{fmt(ssAnualMensal)}/mês</strong> — um valor
            considerável. Reserva esta quantia todos os meses para nunca seres apanhado de surpresa
            no dia 20.
          </span>
        </div>
      )}
      {irsAPagar > 0 && (
        <div className="mt-2 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <span className="mt-0.5 flex-shrink-0">
            <Warning size={14} />
          </span>
          <span>
            O acerto de IRS de cerca de <strong>{fmt(irsAPagar)}</strong> paga-se até{" "}
            <strong>{dataAcerto}</strong> — não em junho, que é apenas o fim do prazo de entrega da
            declaração. Tens até lá para o reservar.
          </span>
        </div>
      )}
      {irsAReceber > 0 && (
        <div className="mt-2 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
          <span className="mt-0.5 flex-shrink-0">
            <Warning size={14} />
          </span>
          <span>
            Com um ano como este ficas com <strong>{fmt(irsAReceber)}</strong> a receber. A
            restituição corre até <strong>{dataAcerto}</strong>, o mesmo prazo em que se paga quem
            tem imposto a acertar (Art. 96.º do CIRS).
          </span>
        </div>
      )}

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-stone-400 dark:bg-stone-500" aria-hidden />
          dinheiro a mexer
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full ring-1 ring-inset ring-stone-400 dark:ring-stone-500"
            aria-hidden
          />
          só declaração
        </span>
      </p>
      <p className="mt-1.5 text-[10px] leading-relaxed text-stone-400 dark:text-stone-600">
        Valores estimados a partir da tua simulação; as datas são as da agenda fiscal oficial,
        já transferidas para o dia útil seguinte quando calham a fim de semana ou feriado
        (Art. 57.º-A da LGT). Regras conferidas a {calendario.revistoEm}.
      </p>
    </div>
  );
}

// ─── Linha de obrigação, dentro do painel do mês ───────────────────────

function LinhaMovimento({ mv }: { mv: MovimentoFiscal }) {
  const meta = META_MOVIMENTO[mv.tipo];
  const ehEntrada = mv.sentido === "entrada";
  const ehDeclaracao = mv.natureza === "declaracao";
  const fonte = FONTES_PRAZOS[mv.fonte];

  return (
    <li className="rounded-xl border border-stone-100 bg-stone-50/60 p-2.5 dark:border-stone-800 dark:bg-stone-800/30">
      {/* Linha de leitura rápida: quando, o quê, quanto. A explicação vem
          por baixo, a toda a largura — encaixada ao lado do valor, ficava
          espremida numa coluna estreita mesmo num ecrã largo. */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        {/* `min-w` em vez de encolher até ao fim: sem ele o título espremia-se
            em três linhas a 360 px para deixar o valor na mesma linha. */}
        <div className="flex min-w-[9rem] flex-1 items-start gap-2">
          {/* Data real. Nunca «até dia 20» genérico. */}
          <span
            className={`flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-wide ring-1 ring-inset ${
              ehEntrada
                ? CHIP_ENTRADA
                : ehDeclaracao
                  ? "bg-white text-stone-500 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700"
                  : meta.corChip
            }`}
          >
            {dataCurta(mv.data)}
          </span>
          <span className="min-w-0 text-xs font-semibold leading-snug text-stone-700 dark:text-stone-200">
            <span
              className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                ehEntrada ? DOT_ENTRADA : meta.corDot
              }`}
              aria-hidden
            />
            {mv.titulo}
            {ehDeclaracao && (
              <span className="ml-1.5 whitespace-nowrap rounded bg-stone-200/70 px-1 py-px align-middle text-[9px] font-bold uppercase tracking-wide text-stone-500 dark:bg-stone-700/60 dark:text-stone-300">
                Declarar
              </span>
            )}
          </span>
        </div>

        {mv.valor > 0 && (
          <span
            className={`flex-shrink-0 text-sm font-bold leading-snug tabular-nums ${
              ehEntrada
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-stone-800 dark:text-stone-100"
            }`}
          >
            {ehEntrada ? "+" : "−"}
            {fmt(mv.valor)}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
        {mv.descricao}
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
        {mv.base}
        {mv.dataBase
          ? ` · o prazo era ${dataPorExtenso(mv.dataBase)} e transitou para dia útil`
          : ""}{" "}
        ·{" "}
        <a
          href={fonte.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline font-semibold text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
        >
          {fonte.label}
          <ExternalLink size={9} className="ml-0.5 inline-block align-baseline" />
        </a>
      </p>
    </li>
  );
}

// ─── Cartão do resumo anual ────────────────────────────────────────────

function CartaoResumo({
  cor,
  titulo,
  valor,
  nota,
  destaque,
}: {
  cor: string;
  titulo: string;
  valor: string;
  nota?: string;
  destaque: "neutro" | "brand" | "positivo" | "negativo";
}) {
  const corValor =
    destaque === "brand"
      ? "text-brand"
      : destaque === "positivo"
        ? "text-emerald-600 dark:text-emerald-400"
        : destaque === "negativo"
          ? "text-red-600 dark:text-red-400"
          : "text-stone-800 dark:text-stone-100";

  return (
    <div className="rounded-2xl border border-stone-200/70 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900/60">
      <div className="mb-1 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${cor}`} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          {titulo}
        </span>
      </div>
      <div className={`text-base font-bold tabular-nums ${corValor}`}>{valor}</div>
      {nota && (
        <div className="text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">{nota}</div>
      )}
    </div>
  );
}
