"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ATO 5 — «O que custa manter o negócio aberto?»
//  ---------------------------------------------------------------------
//  A pergunta é feita assim de propósito. «Custos fixos» é vocabulário de
//  contabilidade; «o que pagas mesmo num mês sem vendas» é a mesma coisa
//  dita de maneira a que a resposta seja certa.
//
//  ── AS TRÊS FAMÍLIAS, SEPARADAS ────────────────────────────────────
//   · overhead      — todos os meses, mesmo sem vender (§3.3 C);
//   · investimento  — uma vez, antes de abrir (§3.3 D);
//   · trabalhadores — overhead com regras próprias, e por isso à parte.
//
//  Misturá-las é o erro que faz um forno de 9 000 € aparecer como custo
//  mensal e destruir o resultado — ou, ao contrário, desaparecer da caixa
//  e fazer o negócio parecer financiável sem capital.
//
//  ── A DUPLA CONTAGEM RESOLVE-SE AQUI ───────────────────────────────
//  E resolve-se COM A PESSOA. Três saídas visíveis, nenhuma automática:
//  corrigir em silêncio um número que ela escreveu seria pior do que o
//  defeito.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { fmt } from "@/lib/format";
import { CampoEuros } from "@/components/precos/atomos";
import { Building, Check, Plus, Trash, Warning } from "@/components/ui/Icons";
import {
  custosDosPostos,
  custoTrabalhadoresPrimeiroAnoMensal,
} from "@/lib/negocio/agregar";
import type { ResultadoCustoPosto } from "@/lib/payroll/custo-empregador";
import type {
  CategoriaCustoEstrutura,
  CategoriaInvestimento,
  CustoEstrutura,
  DuplicacaoCusto,
  EstruturaNegocio as Estrutura,
  InvestimentoInicial,
  TrabalhadorPlaneado,
} from "@/lib/negocio/tipos";
import CartaoTrabalhador from "./CartaoTrabalhador";
import { BotaoSecundario, BotaoTexto, Cartao } from "./atomos";

/** As fichas do §9/ATO 5 — sugestões, não um formulário obrigatório. */
const SUGESTOES: { categoria: CategoriaCustoEstrutura; rotulo: string }[] = [
  { categoria: "contabilidade", rotulo: "Contabilidade" },
  { categoria: "software", rotulo: "Software" },
  { categoria: "sede", rotulo: "Sede / coworking" },
  { categoria: "seguros", rotulo: "Seguros" },
  { categoria: "marketing", rotulo: "Marketing fixo" },
  { categoria: "outro", rotulo: "Outro" },
];

const SUGESTOES_INVESTIMENTO: { categoria: CategoriaInvestimento; rotulo: string }[] = [
  { categoria: "equipamento", rotulo: "Equipamento" },
  { categoria: "stock", rotulo: "Stock inicial" },
  { categoria: "obras", rotulo: "Obras" },
  { categoria: "caucao", rotulo: "Caução" },
  { categoria: "constituicao", rotulo: "Constituição" },
  { categoria: "outro", rotulo: "Outro" },
];

export default function EstruturaNegocioEditor({
  estrutura,
  duplicacoes,
  overheadMes,
  custoTrabalhadoresMes,
  declarouSemCustos,
  aoAdicionarCusto,
  aoMudarCusto,
  aoRemoverCusto,
  aoAdicionarInvestimento,
  aoMudarInvestimento,
  aoRemoverInvestimento,
  aoAdicionarTrabalhador,
  aoMudarTrabalhador,
  aoRemoverTrabalhador,
  aoDeclararSemCustos,
  aoResolverDuplicacao,
}: {
  estrutura: Estrutura;
  duplicacoes: DuplicacaoCusto[];
  overheadMes: number;
  custoTrabalhadoresMes: number;
  declarouSemCustos: boolean;
  aoAdicionarCusto: (categoria: CategoriaCustoEstrutura, rotulo: string) => void;
  aoMudarCusto: (id: string, patch: Partial<CustoEstrutura>) => void;
  aoRemoverCusto: (id: string) => void;
  aoAdicionarInvestimento: (categoria: CategoriaInvestimento, rotulo: string) => void;
  aoMudarInvestimento: (id: string, patch: Partial<InvestimentoInicial>) => void;
  aoRemoverInvestimento: (id: string) => void;
  aoAdicionarTrabalhador: () => void;
  aoMudarTrabalhador: (id: string, patch: Partial<TrabalhadorPlaneado>) => void;
  aoRemoverTrabalhador: (id: string) => void;
  aoDeclararSemCustos: () => void;
  aoResolverDuplicacao: (d: DuplicacaoCusto, acao: "empresa" | "oferta") => void;
}) {
  const custos = estrutura.overheadMensal;
  const investimentos = estrutura.investimentosIniciais;
  const trabalhadores = estrutura.trabalhadores ?? [];
  const vazio = custos.length === 0 && trabalhadores.length === 0;

  // O custo de cada posto, calculado UMA vez para o cartão e para o
  // total. Calculá-lo dentro de cada cartão corria o motor de vencimento
  // uma vez por letra escrita no campo da função.
  const custosPorPosto = useMemo(() => {
    const mapa = new Map<string, ResultadoCustoPosto>();
    for (const p of custosDosPostos(estrutura)) mapa.set(p.trabalhador.id, p.custo);
    return mapa;
  }, [estrutura]);

  const custoPrimeiroAnoMes = useMemo(
    () => custoTrabalhadoresPrimeiroAnoMensal(estrutura),
    [estrutura],
  );

  return (
    <div className="space-y-3" id="estrutura">
      {/* ── Dupla contagem, antes de tudo o resto ─────────────────── */}
      {duplicacoes.map((d) => (
        <div
          key={`${d.ofertaId}-${d.custoEstruturaId}`}
          className="rounded-2xl border border-alert-border bg-alert-bg p-4"
          role="group"
          aria-label="Custo contado duas vezes"
        >
          <p className="flex items-start gap-2 text-sm leading-relaxed text-alert-text">
            <Warning size={15} className="mt-px flex-shrink-0" />
            <span>{d.mensagem}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <BotaoSecundario onClick={() => aoResolverDuplicacao(d, "empresa")}>
              Tratar como custo da empresa
            </BotaoSecundario>
            <BotaoSecundario onClick={() => aoResolverDuplicacao(d, "oferta")}>
              Manter só nesta oferta
            </BotaoSecundario>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-alert-text/80">
            Não mudámos nada — a escolha é tua. «Custo da empresa» tira-o do preço da oferta; «só nesta oferta»
            deixa-o dentro do preço e fora das contas da estrutura.
          </p>
        </div>
      ))}

      {/* ── Overhead ──────────────────────────────────────────────── */}
      <Cartao
        titulo="O que custa manter o negócio aberto"
        descricao="O que pagas mesmo num mês sem vender nada"
        id="overhead"
      >
        {custos.length > 0 ? (
          <ul className="space-y-2">
            {custos.map((c) => (
              <li key={c.id} className="rounded-2xl border border-stone-100 p-3 dark:border-stone-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <label className="sr-only" htmlFor={`custo-nome-${c.id}`}>
                      Nome do custo
                    </label>
                    <input
                      id={`custo-nome-${c.id}`}
                      value={c.rotulo}
                      onChange={(e) => aoMudarCusto(c.id, { rotulo: e.target.value })}
                      className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-stone-800 hover:border-stone-200 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-100 dark:hover:border-stone-700"
                    />
                    {c.escopo === "oferta" ? (
                      <p className="px-1 text-[11px] text-stone-500 dark:text-stone-400">
                        Dentro do preço de uma oferta — não conta outra vez aqui.
                      </p>
                    ) : null}
                  </div>
                  <BotaoTexto onClick={() => aoRemoverCusto(c.id)} tom="perigo" ariaLabel={`Remover ${c.rotulo}`}>
                    <Trash size={12} />
                  </BotaoTexto>
                </div>
                <div className="mt-2">
                  <CampoEuros
                    id={`custo-valor-${c.id}`}
                    rotulo="Por mês"
                    valor={c.mensal}
                    aoMudar={(v) => aoMudarCusto(c.id, { mensal: v })}
                    max={100000}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGESTOES.map((s) => (
            <button
              key={s.rotulo}
              type="button"
              onClick={() => aoAdicionarCusto(s.categoria, s.rotulo)}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-dashed border-stone-200 px-3 text-xs font-medium text-stone-600 transition-colors hover:border-brand hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:text-stone-300 dark:hover:border-brand dark:hover:text-brand-mint"
            >
              <Plus size={12} />
              {s.rotulo}
            </button>
          ))}
        </div>

        {custos.length > 0 ? (
          <p className="mt-3 border-t border-stone-100 pt-3 text-sm tabular-nums text-stone-700 dark:border-stone-800 dark:text-stone-200">
            Estrutura: <strong>{fmt(overheadMes)}</strong> por mês
          </p>
        ) : null}

        {/* A saída honesta para quem mesmo não tem custos. Sem ela, a
            ferramenta pedia para sempre uma coisa que não existe — e o
            livro de pressupostos nunca deixava de a assinalar. */}
        {vazio ? (
          <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
            {declarouSemCustos ? (
              <p className="flex items-center gap-1.5 text-xs text-brand-dark dark:text-brand-mint">
                <Check size={13} />
                Confirmaste que não tens custos fixos. As contas assumem isso.
              </p>
            ) : (
              <BotaoTexto onClick={aoDeclararSemCustos} tom="marca">
                Não tenho nenhum custo fixo
              </BotaoTexto>
            )}
          </div>
        ) : null}
      </Cartao>

      {/* ── Trabalhadores ─────────────────────────────────────────── */}
      <Cartao
        titulo="Quem trabalha contigo"
        descricao="O custo real de um posto: remuneração, subsídios, contribuições, refeição e seguro"
        id="trabalhadores"
        acao={
          <BotaoSecundario onClick={aoAdicionarTrabalhador}>
            <Plus size={14} />
            Adicionar
          </BotaoSecundario>
        }
      >
        {trabalhadores.length === 0 ? (
          <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Sem ninguém contratado. Se estás a pensar contratar, acrescenta aqui — mostramos o que a empresa paga, o
            que a pessoa recebe e o que vai para o Estado, e o ponto de equilíbrio sobe com isso.
          </p>
        ) : (
          <ul className="space-y-2">
            {trabalhadores.map((t) => (
              <CartaoTrabalhador
                key={t.id}
                trabalhador={t}
                custo={custosPorPosto.get(t.id) ?? null}
                aoMudar={(patch) => aoMudarTrabalhador(t.id, patch)}
                aoRemover={() => aoRemoverTrabalhador(t.id)}
              />
            ))}
            <li className="pt-1 text-sm text-stone-700 dark:text-stone-200">
              Pessoal: <strong className="tabular-nums">{fmt(custoTrabalhadoresMes)}</strong> por mês, já com todos os
              encargos
              {custoPrimeiroAnoMes !== custoTrabalhadoresMes ? (
                <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                  No primeiro ano, com as datas de entrada:{" "}
                  <strong className="tabular-nums">{fmt(custoPrimeiroAnoMes)}</strong> por mês
                </span>
              ) : null}
            </li>
          </ul>
        )}
      </Cartao>

      {/* ── Investimento inicial ──────────────────────────────────── */}
      <Cartao
        titulo="O que é preciso pagar antes de abrir"
        descricao="Uma vez, não todos os meses — entra na caixa, não no resultado mensal"
        id="investimento"
      >
        {investimentos.length > 0 ? (
          <ul className="space-y-2">
            {investimentos.map((i) => (
              <li key={i.id} className="rounded-2xl border border-stone-100 p-3 dark:border-stone-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <label className="sr-only" htmlFor={`inv-nome-${i.id}`}>
                      Nome do investimento
                    </label>
                    <input
                      id={`inv-nome-${i.id}`}
                      value={i.rotulo}
                      onChange={(e) => aoMudarInvestimento(i.id, { rotulo: e.target.value })}
                      className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-stone-800 hover:border-stone-200 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-100 dark:hover:border-stone-700"
                    />
                  </div>
                  <BotaoTexto onClick={() => aoRemoverInvestimento(i.id)} tom="perigo" ariaLabel={`Remover ${i.rotulo}`}>
                    <Trash size={12} />
                  </BotaoTexto>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CampoEuros
                    id={`inv-valor-${i.id}`}
                    rotulo="Valor"
                    valor={i.valor}
                    aoMudar={(v) => aoMudarInvestimento(i.id, { valor: v })}
                    max={1000000}
                  />
                  {/* §58 — o timing existia no contrato e a interface só
                      oferecia «antes de abrir». Um forno comprado no mês 4
                      aparecia como despesa do mês 0, e o buraco de caixa
                      saía no sítio errado. */}
                  <div>
                    <label
                      htmlFor={`inv-mes-${i.id}`}
                      className="block text-xs font-semibold text-stone-700 dark:text-stone-200"
                    >
                      Quando sai este dinheiro
                    </label>
                    <p
                      id={`inv-mes-${i.id}-desc`}
                      className="mt-0.5 text-[11px] leading-snug text-stone-500 dark:text-stone-400"
                    >
                      Não muda o resultado — muda o mês em que a conta sente.
                    </p>
                    <select
                      id={`inv-mes-${i.id}`}
                      aria-describedby={`inv-mes-${i.id}-desc`}
                      value={i.mes ?? 0}
                      onChange={(e) => aoMudarInvestimento(i.id, { mes: Number(e.target.value) })}
                      className="mt-1.5 min-h-[40px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                    >
                      <option value={0}>Antes de abrir</option>
                      {Array.from({ length: 36 }, (_, m) => m + 1).map((m) => (
                        <option key={m} value={m}>
                          No mês {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Equipamento, obras, stock inicial, caução, constituição. Não afetam o lucro mensal — afetam se tens dinheiro
            para começar.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGESTOES_INVESTIMENTO.map((s) => (
            <button
              key={s.rotulo}
              type="button"
              onClick={() => aoAdicionarInvestimento(s.categoria, s.rotulo)}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-dashed border-stone-200 px-3 text-xs font-medium text-stone-600 transition-colors hover:border-brand hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:text-stone-300 dark:hover:border-brand dark:hover:text-brand-mint"
            >
              <Plus size={12} />
              {s.rotulo}
            </button>
          ))}
        </div>

        {investimentos.length > 0 ? (
          <p className="mt-3 flex items-center gap-1.5 border-t border-stone-100 pt-3 text-sm tabular-nums text-stone-700 dark:border-stone-800 dark:text-stone-200">
            <Building size={14} className="flex-shrink-0 text-stone-500" />
            Investimento inicial: <strong>{fmt(investimentos.reduce((s, i) => s + i.valor, 0))}</strong>
          </p>
        ) : null}
      </Cartao>
    </div>
  );
}
