"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O RESULTADO COMO OBJETO VISUAL
//  ---------------------------------------------------------------------
//  Princípio 1 do design system: mostrar o dinheiro antes do imposto. O
//  número que a pessoa veio buscar domina o ecrã; tudo o resto é contexto
//  que se abre quando ela quiser.
//
//  A hierarquia é deliberada e responde por ordem às quatro perguntas:
//    1. quanto devo cobrar     → o número grande
//    2. quanto me custa        → a barra «a cada venda»
//    3. quanto vou ganhar      → o lucro por venda e por mês
//    4. quanto preciso vender  → o ponto de equilíbrio
//
//  A faixa aparece imediatamente a seguir porque um número sozinho é falsa
//  precisão: os dados que o alimentam têm incerteza, e escondê-la seria
//  prometer uma exatidão que a aritmética não tem.
// ═══════════════════════════════════════════════════════════════════════

import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { fmt, pct } from "@/lib/format";
import { decomporPreco, type ChaveSegmento, type EstadoPreenchimento } from "@/lib/pricing";
import type { ResultadoPreco as Resultado } from "@/lib/pricing";
import { Warning, Info, CheckTrend } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";

const CORES_ANCORA: Record<string, string> = {
  piso: "bg-red-400",
  minimo: "bg-alert-border",
  recomendado: "bg-brand",
  confortavel: "bg-brand-mint",
};

/**
 * As cores da decomposição.
 *
 * As duas fatias do Estado (IVA e impostos pessoais) partilham o amarelo
 * pastel de aviso, e não um cinzento qualquer: o que as separa de todos os
 * outros custos é que este dinheiro nunca chega a ser da pessoa. Pintá-las
 * como mais uma despesa é o que leva alguém a gastar o IVA que tem a
 * entregar.
 */
const CORES_SEGMENTO: Record<ChaveSegmento, string> = {
  custo: "bg-stone-400",
  venda: "bg-stone-300",
  impostos: "bg-alert-border",
  fixos: "bg-stone-200",
  iva: "bg-alert",
  lucro: "bg-brand",
};

export default function ResultadoPreco({
  resultado,
  temFiscalidade,
  estado = "completo",
  faltam = 0,
  aoAdotarPreco,
}: {
  resultado: Resultado;
  temFiscalidade: boolean;
  /**
   * Quanto do essencial é que a pessoa respondeu. O número existe sempre —
   * o motor calcula sempre —, mas apresentá-lo como «quanto deves cobrar»
   * quando saiu dos valores de partida do cenário é dar autoridade de
   * conselho a algo que ninguém introduziu.
   *
   * ISTO JÁ FOI UM BOOLEANO (`exemplo`), e um booleano vira-se com uma
   * tecla: escrever um dígito no volume promovia um exemplo a
   * recomendação. Três estados, porque o meio-termo — «já me disseste
   * alguma coisa, mas ainda não o suficiente» — é onde a maior parte das
   * pessoas está quando olha para o número.
   */
  estado?: EstadoPreenchimento;
  /** Quantos campos essenciais faltam. Só usado no estado `estimado`. */
  faltam?: number;
  /** Adotar um preço redondo como o preço da pessoa. */
  aoAdotarPreco?: (pvp: number) => void;
}) {
  const exemplo = estado === "exemplo";
  if (!resultado.ok) {
    return (
      <div className="rounded-4xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/30">
        <div className="mb-2 flex items-center gap-2">
          <Warning size={18} className="flex-shrink-0 text-red-600" />
          <h2 className="font-display text-lg font-semibold text-red-900 dark:text-red-200">
            Não há preço possível com estes números
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-red-800 dark:text-red-300">{resultado.motivoTexto}</p>
      </div>
    );
  }

  const { faixa, margem, breakEven } = resultado;
  const recomendado = faixa.ancoras.find((a) => a.chave === "recomendado");
  const pisoAncora = faixa.ancoras.find((a) => a.chave === "piso");
  const minimoAncora = faixa.ancoras.find((a) => a.chave === "minimo") ?? pisoAncora;
  const ancorasOrdenadas = [...faixa.ancoras].sort((a, b) => a.pvp - b.pvp);

  // A régua começa um pouco abaixo do piso e acaba um pouco acima do teto,
  // para os marcadores dos extremos não ficarem colados às pontas.
  const menor = ancorasOrdenadas[0]?.pvp ?? 0;
  const maior = ancorasOrdenadas[ancorasOrdenadas.length - 1]?.pvp ?? 1;
  const folgaEscala = Math.max(0.01, (maior - menor) * 0.12);
  const inicio = Math.max(0, menor - folgaEscala);
  const fim = Math.max(inicio + 0.01, Math.max(maior, resultado.pvp) + folgaEscala);
  const posicao = (v: number) => Math.max(0, Math.min(100, ((v - inicio) / (fim - inicio)) * 100));

  // A barra que explica o número tem de explicar O NÚMERO. Esta soma era
  // feita aqui, no componente, e dava o preço LÍQUIDO enquanto o cabeçalho
  // mostrava o PVP — a 23%, uma barra que decompunha 24,60 € somando
  // 20,00 €, com o IVA ausente. A aritmética passou para a engine
  // (`motores/decomposicao.ts`), onde é testável e onde a soma fecha por
  // construção.
  const decomposicao = decomporPreco(resultado);
  const totalBarra = decomposicao.total || 1;

  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      aria-label="Resultado"
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-7"
    >
      {/* ── O número ─────────────────────────────────────────────── */}
      <p
        className={`eyebrow mb-2 ${
          exemplo ? "text-stone-600 dark:text-stone-400" : "text-brand-dark dark:text-brand-mint"
        }`}
      >
        {exemplo
          ? "Um exemplo, por enquanto"
          : estado === "estimado"
            ? "Uma estimativa — falta responder ao resto"
            : "Quanto deves cobrar"}
      </p>
      {exemplo ? (
        <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Ainda não nos disseste nada sobre o teu caso, por isso este número sai dos valores de partida deste cenário —
          não do teu negócio.{" "}
          <strong className="font-semibold text-stone-800 dark:text-stone-100">
            Preenche o essencial aí em cima
          </strong>{" "}
          e ele passa a ser teu.
        </p>
      ) : null}
      {estado === "estimado" ? (
        <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {faltam === 1
            ? "Falta uma resposta do essencial, e estamos a assumi-la por ti — está listada aqui em baixo."
            : `Faltam ${faltam} respostas do essencial, e estamos a assumi-las por ti — estão listadas aqui em baixo.`}
        </p>
      ) : null}
      {/* Desemfatizar com COR, nunca com `opacity`.
          Havia aqui um `opacity-60` que dizia bem o que queria dizer — «este
          número ainda não é teu» — e cegava quem precisa de contraste: o
          cinzento da legenda caía de 4,5:1 para 2,38:1. A opacidade mistura o
          texto com o fundo sem que nenhuma regra de cor o denuncie, por isso
          escapa a quem lê o CSS e só aparece no medidor. Trocar o tom faz o
          mesmo efeito visual e continua legível. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={`font-display text-4xl font-semibold tabular-nums sm:text-5xl ${
            exemplo ? "text-stone-500 dark:text-stone-400" : "text-ink dark:text-stone-50"
          }`}
        >
          {fmt(resultado.pvp)}
        </span>
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {resultado.taxaIVA > 0 ? (
            <>
              com IVA · <span className="tabular-nums">{fmt(resultado.precoLiquido)}</span> sem IVA
            </>
          ) : (
            "sem IVA — estás isento"
          )}
        </span>
      </div>

      {/* ── A faixa, como escala ─────────────────────────────────
          Era uma barra empilhada a fingir de escala: o primeiro segmento
          ia de 0 € ao piso, e por isso a cor do piso ocupava a maior
          parte da largura e lia-se como «o piso é 80% do preço». Não
          havia marcador nenhum do preço recomendado.

          Agora é uma régua entre o piso e o teto da faixa, com cada
          âncora no sítio que lhe corresponde e o preço recomendado
          assinalado. A distância entre duas âncoras passa a significar a
          distância entre dois preços. ────────────────────────────── */}
      {ancorasOrdenadas.length > 1 && (
        <div className="mt-6">
          <div className="relative h-9">
            <div
              className="absolute inset-x-0 top-3 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
              aria-hidden="true"
            >
              {/* A zona sustentável: do mínimo para cima. */}
              <span
                className="absolute inset-y-0 rounded-full bg-brand-light dark:bg-brand/20"
                style={{ left: `${posicao(minimoAncora?.pvp ?? inicio)}%`, right: "0%" }}
              />
              {/* A zona de prejuízo: até ao piso. */}
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-red-200 dark:bg-red-900/40"
                style={{ width: `${posicao(pisoAncora?.pvp ?? inicio)}%` }}
              />
            </div>

            {ancorasOrdenadas.map((a) => (
              <span
                key={a.chave}
                aria-hidden="true"
                className={`absolute top-1.5 h-5 w-[3px] -translate-x-1/2 rounded-full ${CORES_ANCORA[a.chave] ?? "bg-stone-300"}`}
                style={{ left: `${posicao(a.pvp)}%` }}
              />
            ))}

            {/* Onde cai o preço recomendado, com o número por cima. */}
            <span
              aria-hidden="true"
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white dark:bg-stone-100 dark:text-ink"
              style={{ left: `${posicao(resultado.pvp)}%` }}
            >
              {fmt(resultado.pvp)}
            </span>
          </div>

          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {ancorasOrdenadas.map((a) => (
              <li key={a.chave} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${CORES_ANCORA[a.chave] ?? "bg-stone-300"}`}
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                      {fmt(a.pvp)}
                    </span>
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{a.rotulo}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                    {a.explicacao}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── A cada venda ─────────────────────────────────────────── */}
      {decomposicao.segmentos.length > 0 ? (
        <div className="mt-7 border-t border-stone-100 pt-5 dark:border-stone-800">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              A cada venda de {fmt(decomposicao.pvp)}
            </p>
            {decomposicao.prejuizo > 0 ? (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                custa {fmt(decomposicao.total)} — faltam {fmt(decomposicao.prejuizo)}
              </p>
            ) : null}
          </div>

          <div className="relative">
            <div className="flex h-3 w-full overflow-hidden rounded-full" aria-hidden="true">
              {decomposicao.segmentos.map((d) => (
                <span
                  key={d.chave}
                  className={`${CORES_SEGMENTO[d.chave]} h-full`}
                  style={{ width: `${(d.valor / totalBarra) * 100}%` }}
                />
              ))}
            </div>
            {/* Com prejuízo a barra é MAIOR do que o preço, e é essa a
                história. O marcador diz onde o dinheiro do cliente acaba —
                tudo o que fica à direita sai do bolso de quem vende. */}
            {decomposicao.prejuizo > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-1 h-5 w-0.5 rounded-full bg-red-600"
                style={{ left: `${Math.min(100, (decomposicao.pvp / totalBarra) * 100)}%` }}
              />
            ) : null}
          </div>

          <ul className="mt-3 space-y-1.5">
            {decomposicao.segmentos.map((d) => (
              <li key={d.chave} className="flex items-start gap-2.5 text-sm">
                <span
                  aria-hidden="true"
                  className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-sm ${CORES_SEGMENTO[d.chave]}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-stone-600 dark:text-stone-400">{d.rotulo}</span>
                    <span className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                      {fmt(d.valor)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                    {d.nota}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Números-chave ────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica
          rotulo="Margem"
          valor={pct(margem.margem)}
          nota="sobre o preço sem IVA"
          alerta={margem.margem < 0}
        />
        <Metrica
          rotulo="Markup"
          valor={pct(margem.markup)}
          nota="acrescentado ao custo"
        />
        <Metrica
          rotulo="Lucro por mês"
          valor={fmt(margem.lucroMensal)}
          nota="ao volume que esperas"
          alerta={margem.lucroMensal < 0}
        />
        {/* `diasAoRitmoAtual` era calculado e nunca mostrado. «34 vendas»
            é um número; «11 dias de vendas» é uma sensação — e é a
            sensação que faz a pessoa perceber se o negócio respira. */}
        <Metrica
          rotulo="Equilíbrio"
          valor={breakEven.possivel ? `${breakEven.unidades}` : "—"}
          nota={
            breakEven.possivel
              ? breakEven.unidades === 0
                ? "sem custos fixos"
                : breakEven.diasAoRitmoAtual !== undefined && breakEven.diasAoRitmoAtual > 0
                  ? `vendas/mês · ${breakEven.diasAoRitmoAtual} dias`
                  : "vendas por mês"
              : "não existe"
          }
          alerta={!breakEven.possivel}
        />
      </div>

      {/* A margem de contribuição é o número que decide se aceitar mais
          uma encomenda vale a pena. Era calculado e nunca aparecia. */}
      {margem.contribuicaoUnidade !== 0 ? (
        <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2.5 text-xs leading-relaxed text-stone-600 dark:bg-stone-800/40 dark:text-stone-400">
          Cada venda extra, para lá das contas fixas já pagas, deixa-te{" "}
          <strong className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {fmt(margem.contribuicaoUnidade)}
          </strong>{" "}
          ({pct(margem.contribuicaoPercentagem)} do preço sem IVA). É este o número a olhar quando decides se aceitas
          mais uma encomenda — não a margem.
        </p>
      ) : null}

      {breakEven.nota ? (
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-stone-500 dark:text-stone-400" />
          {breakEven.nota}
        </p>
      ) : null}

      {/* ── Veredicto sobre o preço pensado ──────────────────────── */}
      {resultado.veredicto ? (
        <div
          className={`mt-6 rounded-2xl border p-4 ${
            resultado.veredicto.classificacao === "abaixo_do_piso"
              ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
              : resultado.veredicto.classificacao === "abaixo_do_minimo"
                ? "border-alert-border bg-alert-bg dark:border-alert-border/40 dark:bg-alert-text/10"
                : "border-brand-light bg-brand-light/40 dark:border-brand/30 dark:bg-brand/10"
          }`}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
            {resultado.veredicto.classificacao === "alinhado" ||
            resultado.veredicto.classificacao === "acima_do_recomendado" ? (
              <CheckTrend size={16} className="flex-shrink-0 text-brand" />
            ) : (
              <Warning size={16} className="flex-shrink-0 text-alert-text dark:text-alert" />
            )}
            {resultado.veredicto.titulo}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            {resultado.veredicto.texto}
          </p>
        </div>
      ) : null}

      {/* ── Preços psicológicos ──────────────────────────────────
          Eram uma fila de chips inertes: não se via qual estava mais
          perto do recomendado e não havia forma de adotar nenhum. A regra
          que não muda é a outra: um preço redondo NUNCA substitui o
          recomendado, e o custo em margem de cada terminação está sempre
          à vista. ──────────────────────────────────────────────────── */}
      {faixa.psicologicos.length > 0 && recomendado ? (
        <div className="mt-6 border-t border-stone-100 pt-5 dark:border-stone-800">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Se preferires um preço redondo
          </p>
          <p className="mb-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Sugestões comerciais. Não substituem o preço recomendado — mostram o que cada terminação custa em margem.
          </p>
          <div className="flex flex-wrap gap-2">
            {faixa.psicologicos.map((p) => {
              const perde = p.margem < margem.margem;
              const conteudo = (
                <>
                  <span className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">{fmt(p.pvp)}</span>
                  <span className="ml-2 tabular-nums text-stone-500 dark:text-stone-400">{pct(p.margem)} margem</span>
                  <span className="ml-1.5 tabular-nums text-[10px] text-stone-500 dark:text-stone-400">
                    ({perde ? "−" : "+"}
                    {fmt(Math.abs(p.delta))})
                  </span>
                </>
              );

              return aoAdotarPreco ? (
                <button
                  key={p.pvp}
                  type="button"
                  onClick={() => aoAdotarPreco(p.pvp)}
                  className="min-h-[36px] rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs transition-colors hover:border-brand hover:bg-brand-light/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-brand/10"
                >
                  {conteudo}
                </button>
              ) : (
                <span
                  key={p.pvp}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs dark:border-stone-700 dark:bg-stone-800"
                >
                  {conteudo}
                </span>
              );
            })}
          </div>
          {aoAdotarPreco ? (
            <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">
              Carrega num deles para o adotar como o teu preço. O recomendado fica sempre a um clique de distância.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* As notas fiscais do motor. Eram escritas e nunca lidas. */}
      {resultado.fiscal.aplicavel && resultado.fiscal.notas.length > 0 ? (
        <ul className="mt-5 space-y-1.5 border-t border-stone-100 pt-4 dark:border-stone-800">
          {resultado.fiscal.notas.map((n) => (
            <li key={n} className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </m.section>
  );
}

function Metrica({
  rotulo,
  valor,
  nota,
  alerta,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/40">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{rotulo}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          alerta ? "text-red-600 dark:text-red-400" : "text-stone-800 dark:text-stone-100"
        }`}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] leading-tight text-stone-500 dark:text-stone-400">{nota}</p>
    </div>
  );
}
