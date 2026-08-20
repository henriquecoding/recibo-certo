"use client";

// ═══════════════════════════════════════════════════════════════════════
//  UM POSTO DE TRABALHO — três dinheiros, não um
//  ---------------------------------------------------------------------
//  §28-29 do relatório. O cartão antigo tinha dois campos («salário
//  bruto» e «meses por ano») e devolvia uma linha: «Pessoal: X €/mês, já
//  com encargos». Isso não responde a nenhuma das perguntas que se fazem
//  antes de contratar alguém.
//
//  ── AS TRÊS COLUNAS ────────────────────────────────────────────────
//  · EMPRESA PAGA        — o custo económico do posto;
//  · TRABALHADOR RECEBE  — o líquido;
//  · ESTADO E SEG. SOCIAL — retenção e contribuições.
//
//  E não se chama «impostos» ao terceiro: a Segurança Social é uma
//  contribuição com contrapartida, e juntá-las numa palavra torna as duas
//  incompreensíveis.
//
//  ── O QUE ESTE CARTÃO SE RECUSA A INVENTAR ─────────────────────────
//  §29: estado civil e dependentes de alguém que ainda não foi
//  contratado. Sem perfil declarado, o líquido diz «ainda não estimado» e
//  há um botão para o estimar — em vez de mostrar o líquido de uma pessoa
//  solteira sem filhos como se fosse o daquela pessoa.
//
//  ── §30 ────────────────────────────────────────────────────────────
//  Não há seletor «12 ou 14». Os subsídios de férias e Natal são lei, não
//  uma escolha do empregador; o que é escolha é o CALENDÁRIO.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { fmt } from "@/lib/format";
import { CampoEuros, CampoNumero, CampoPercentagem, Segmentado } from "@/components/precos/atomos";
import { ChevronDown, Trash, Warning } from "@/components/ui/Icons";
import { horasProdutivasDoPosto } from "@/lib/negocio/capacidade";
import type { ResultadoCustoPosto } from "@/lib/payroll/custo-empregador";
import type { PagamentoSubsidios, TrabalhadorPlaneado } from "@/lib/negocio/tipos";
import { BotaoTexto } from "./atomos";

const MESES_DO_ANO = [
  "desde o início",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export default function CartaoTrabalhador({
  trabalhador: t,
  custo,
  aoMudar,
  aoRemover,
}: {
  trabalhador: TrabalhadorPlaneado;
  /** `null` enquanto não houver salário — não há posto para calcular. */
  custo: ResultadoCustoPosto | null;
  aoMudar: (patch: Partial<TrabalhadorPlaneado>) => void;
  aoRemover: () => void;
}) {
  const [afinar, setAfinar] = useState(false);
  const [divisao, setDivisao] = useState(false);
  const salario = t.remuneracao.salarioBaseMensal;

  return (
    <li className="rounded-2xl border border-stone-100 p-3 dark:border-stone-800">
      {/* ── Identidade ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor={`trab-funcao-${t.id}`}>
            Função
          </label>
          <input
            id={`trab-funcao-${t.id}`}
            value={t.funcao}
            placeholder="Função"
            onChange={(e) => aoMudar({ funcao: e.target.value })}
            className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-stone-800 placeholder:font-normal placeholder:text-stone-400 hover:border-stone-200 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-100 dark:hover:border-stone-700"
          />
        </div>
        <BotaoTexto onClick={aoRemover} tom="perigo" ariaLabel={`Remover ${t.funcao || "trabalhador"}`}>
          <Trash size={12} />
        </BotaoTexto>
      </div>

      {/* ── O essencial ─────────────────────────────────────────── */}
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CampoEuros
          id={`trab-salario-${t.id}`}
          rotulo="Salário base mensal"
          descricao="Ilíquido, sem subsídios. Os encargos calculam-se."
          valor={salario}
          aoMudar={(v) => aoMudar({ remuneracao: { ...t.remuneracao, salarioBaseMensal: v } })}
          max={20000}
        />
        <div>
          <label
            htmlFor={`trab-inicio-${t.id}`}
            className="block text-xs font-semibold text-stone-700 dark:text-stone-200"
          >
            Quando entra
          </label>
          <p id={`trab-inicio-${t.id}-desc`} className="mt-0.5 text-[11px] leading-snug text-stone-500 dark:text-stone-400">
            Decide o custo do primeiro ano — e a caixa dos meses anteriores.
          </p>
          <select
            id={`trab-inicio-${t.id}`}
            aria-describedby={`trab-inicio-${t.id}-desc`}
            value={t.contrato.inicioMes}
            onChange={(e) =>
              aoMudar({ contrato: { ...t.contrato, inicioMes: Number(e.target.value) } })
            }
            className="mt-1.5 min-h-[40px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          >
            {MESES_DO_ANO.map((m, i) => (
              <option key={m} value={i}>
                {i === 0 ? "Desde o início" : `A partir de ${m}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Os três dinheiros (§28-29) ──────────────────────────── */}
      {custo ? (
        <>
          <dl className="mt-3 grid grid-cols-1 gap-2 rounded-2xl bg-stone-50 p-3 dark:bg-stone-800/50 sm:grid-cols-3">
            <Dinheiro
              rotulo="Empresa paga"
              valor={fmt(custo.empresa.custoMedioMensal)}
              nota="custo do posto, por mês"
              forte
            />
            <Dinheiro
              rotulo="Trabalhador recebe"
              valor={
                custo.trabalhador.liquido === null
                  ? "por estimar"
                  : fmt(custo.trabalhador.liquido / 12)
              }
              nota={
                custo.trabalhador.liquido === null
                  ? "falta a situação pessoal"
                  : "líquido estimado, por mês"
              }
            />
            <Dinheiro
              rotulo="Estado + Seg. Social"
              valor={fmt(
                (custo.publico.segurancaSocialEmpresa +
                  custo.publico.segurancaSocialTrabalhador +
                  (custo.publico.irsRetido ?? 0)) /
                  12,
              )}
              nota="contribuições e retenção"
            />
          </dl>

          <div className="mt-2 flex flex-wrap gap-2">
            <BotaoTexto tom="marca" onClick={() => setDivisao((v) => !v)}>
              <ChevronDown
                size={12}
                className={`transition-transform ${divisao ? "rotate-180" : ""}`}
              />
              {divisao ? "Esconder a divisão" : "Ver divisão"}
            </BotaoTexto>
            <BotaoTexto onClick={() => setAfinar((v) => !v)}>
              {afinar ? "Fechar o posto" : "Afinar posto"}
            </BotaoTexto>
          </div>

          {divisao ? <Divisao custo={custo} /> : null}
        </>
      ) : (
        <p className="mt-3 rounded-2xl bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-500 dark:bg-stone-800/50 dark:text-stone-400">
          Escreve o salário base e mostramos o que a empresa paga, o que a pessoa recebe e o que vai para o Estado e
          para a Segurança Social.
        </p>
      )}

      {/* ── Afinar o posto ──────────────────────────────────────── */}
      {afinar ? <Afinar trabalhador={t} aoMudar={aoMudar} /> : null}
    </li>
  );
}

function Dinheiro({
  rotulo,
  valor,
  nota,
  forte,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  forte?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {rotulo}
      </dt>
      <dd
        className={`mt-0.5 tabular-nums ${
          forte
            ? "text-base font-semibold text-stone-800 dark:text-stone-100"
            : "text-sm font-medium text-stone-700 dark:text-stone-200"
        }`}
      >
        {valor}
      </dd>
      <dd className="text-[10px] leading-snug text-stone-500 dark:text-stone-400">{nota}</dd>
    </div>
  );
}

/** A divisão completa — e o que nela é estimativa (§35, §36, §37). */
function Divisao({ custo }: { custo: ResultadoCustoPosto }) {
  const e = custo.empresa;
  const linhas: { rotulo: string; valor: number; nota?: string }[] = [
    { rotulo: "Remuneração (12 meses)", valor: e.remuneracao },
    ...(e.subsidioFerias > 0 ? [{ rotulo: "Subsídio de férias", valor: e.subsidioFerias }] : []),
    ...(e.subsidioNatal > 0 ? [{ rotulo: "Subsídio de Natal", valor: e.subsidioNatal }] : []),
    { rotulo: "Segurança Social da empresa", valor: e.ssEntidade },
    ...(e.refeicao > 0 ? [{ rotulo: "Subsídio de refeição", valor: e.refeicao }] : []),
    {
      rotulo: "Seguro de acidentes de trabalho",
      valor: e.seguroAT,
      nota: custo.estimado.seguroAT ? "estimativa de planeamento, não um prémio real" : undefined,
    },
    ...(e.sst > 0 ? [{ rotulo: "Saúde e segurança no trabalho", valor: e.sst }] : []),
    ...(e.formacao > 0 ? [{ rotulo: "Formação contínua", valor: e.formacao }] : []),
    ...(e.outros > 0 ? [{ rotulo: "Outros", valor: e.outros }] : []),
  ];

  return (
    <div className="mt-2 rounded-2xl border border-stone-100 p-3 dark:border-stone-800">
      <p className="eyebrow mb-2 text-stone-500 dark:text-stone-400">Por ano, o que a empresa paga</p>
      <dl className="space-y-1">
        {linhas.map((l) => (
          <div key={l.rotulo} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="min-w-0 text-xs text-stone-600 dark:text-stone-300">
              {l.rotulo}
              {l.nota ? (
                <span className="mt-0.5 block text-[10px] leading-snug text-stone-500 dark:text-stone-400">
                  {l.nota}
                </span>
              ) : null}
            </dt>
            <dd className="flex-shrink-0 text-xs tabular-nums text-stone-700 dark:text-stone-200">
              {fmt(l.valor)}
            </dd>
          </div>
        ))}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-stone-100 pt-1 dark:border-stone-800">
          <dt className="text-xs font-semibold text-stone-800 dark:text-stone-100">Custo anual</dt>
          <dd className="text-xs font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {fmt(e.custoAnual)}
          </dd>
        </div>
      </dl>

      {custo.primeiroAno.mesesTrabalhados < 12 ? (
        <p className="mt-2 rounded-xl bg-brand-light/50 px-3 py-2 text-[11px] leading-relaxed text-brand-deep dark:bg-brand/10 dark:text-brand-mint">
          No <strong>primeiro ano</strong> são {custo.primeiroAno.mesesTrabalhados} meses:{" "}
          {fmt(custo.primeiroAno.custoAnual)}. O ponto de equilíbrio usa o custo estabilizado; a caixa usa este.
        </p>
      ) : null}

      {custo.estimado.calendarioPorConfirmar ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-alert-bg px-3 py-2 text-[11px] leading-relaxed text-alert-text">
          <Warning size={12} className="mt-0.5 flex-shrink-0" aria-hidden />
          <span>
            Este posto veio de uma versão antiga do projeto, em que os subsídios de férias e Natal não estavam na
            conta. Confirma o calendário em «Afinar posto» — eles são devidos por lei.
          </span>
        </p>
      ) : null}

      {custo.estimado.liquidoPorEstimar ? (
        <p className="mt-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          O líquido depende da situação pessoal de quem for contratado — estado civil, dependentes, região. Não
          inventamos nenhuma; podes declará-la em «Afinar posto» se já souberes.
        </p>
      ) : null}
    </div>
  );
}

const CALENDARIOS: { valor: PagamentoSubsidios; rotulo: string }[] = [
  { valor: "normal", rotulo: "Pagamento normal" },
  { valor: "duodecimos", rotulo: "Duodécimos" },
];

/** Tudo o que um posto tem além do salário. Fechado por omissão. */
function Afinar({
  trabalhador: t,
  aoMudar,
}: {
  trabalhador: TrabalhadorPlaneado;
  aoMudar: (patch: Partial<TrabalhadorPlaneado>) => void;
}) {
  const refeicaoAtiva = t.refeicao?.ativo ?? false;

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-stone-100 bg-stone-50/50 p-3 dark:border-stone-800 dark:bg-stone-800/30">
      {/* §30 — o calendário, não «12 ou 14 salários» */}
      <Segmentado
        id={`trab-subsidios-${t.id}`}
        rotulo="Subsídios de férias e Natal"
        descricao="São devidos por lei. O que escolhes aqui é quando se pagam."
        opcoes={CALENDARIOS.map((c) => ({ valor: c.valor, rotulo: c.rotulo }))}
        valor={t.contrato.pagamentoSubsidios === "duodecimos" ? "duodecimos" : "normal"}
        aoMudar={(v) =>
          aoMudar({
            contrato: { ...t.contrato, pagamentoSubsidios: v as PagamentoSubsidios },
          })
        }
      />

      {/* §34 — refeição é configuração, não um default para toda a gente */}
      <div>
        <label className="flex min-h-[36px] cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={refeicaoAtiva}
            onChange={(e) =>
              aoMudar({
                refeicao: {
                  valorDia: t.refeicao?.valorDia ?? 0,
                  diasMes: t.refeicao?.diasMes ?? 22,
                  cartao: t.refeicao?.cartao ?? true,
                  ativo: e.target.checked,
                },
              })
            }
            className="h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand dark:border-stone-600"
          />
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">
            Subsídio de refeição
          </span>
        </label>
        {refeicaoAtiva ? (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <CampoEuros
              id={`trab-ref-valor-${t.id}`}
              rotulo="Valor por dia"
              valor={t.refeicao?.valorDia ?? 0}
              aoMudar={(v) =>
                aoMudar({ refeicao: { ...t.refeicao!, valorDia: v, ativo: true } })
              }
              max={30}
            />
            <CampoNumero
              id={`trab-ref-dias-${t.id}`}
              rotulo="Dias por mês"
              valor={t.refeicao?.diasMes ?? 22}
              aoMudar={(v) => aoMudar({ refeicao: { ...t.refeicao!, diasMes: v, ativo: true } })}
              max={31}
            />
            <Segmentado
              id={`trab-ref-meio-${t.id}`}
              rotulo="Como é pago"
              descricao="O cartão tem limite isento mais alto."
              opcoes={[
                { valor: "cartao", rotulo: "Cartão" },
                { valor: "dinheiro", rotulo: "Dinheiro" },
              ]}
              valor={t.refeicao?.cartao ? "cartao" : "dinheiro"}
              aoMudar={(v) =>
                aoMudar({ refeicao: { ...t.refeicao!, cartao: v === "cartao", ativo: true } })
              }
            />
          </div>
        ) : null}
      </div>

      {/* §40 — este posto produz, ou só custa? */}
      <div>
        <Segmentado
          id={`trab-produtivo-${t.id}`}
          rotulo="Este posto aumenta a capacidade de entrega?"
          descricao="Um administrativo custa e não entrega horas faturáveis. Um operador produtivo entrega — e sem isto, contratar parecia sempre má ideia."
          opcoes={[
            { valor: "nao", rotulo: "Não" },
            { valor: "sim", rotulo: "Sim" },
          ]}
          valor={t.capacidade?.aumenta ? "sim" : "nao"}
          aoMudar={(v) =>
            aoMudar({
              capacidade: {
                horasSemana: t.capacidade?.horasSemana ?? 40,
                fracaoProdutiva: t.capacidade?.fracaoProdutiva ?? 0.7,
                ofertas: t.capacidade?.ofertas,
                aumenta: v === "sim",
              },
            })
          }
        />
        {t.capacidade?.aumenta ? (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <CampoNumero
              id={`trab-horas-${t.id}`}
              rotulo="Horas por semana"
              valor={t.capacidade.horasSemana ?? 40}
              aoMudar={(v) => aoMudar({ capacidade: { ...t.capacidade!, horasSemana: v } })}
              max={40}
            />
            <CampoPercentagem
              id={`trab-produtiva-${t.id}`}
              rotulo="Fração faturável"
              descricao="Quanto do tempo é mesmo entregue ao cliente. Reuniões, admin e imprevistos ficam de fora."
              valor={t.capacidade.fracaoProdutiva ?? 0.7}
              aoMudar={(v) => aoMudar({ capacidade: { ...t.capacidade!, fracaoProdutiva: v } })}
              max={100}
            />
            <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400 sm:col-span-2">
              Acrescenta cerca de <strong>{Math.round(horasProdutivasDoPosto(t))} horas faturáveis por mês</strong> ao
              teto do negócio — já sem as férias e sem as 40 horas anuais de formação que o Código do Trabalho prevê.
            </p>
          </div>
        ) : null}
      </div>

      {/* §35, §36, §37 — conhecidos ou por orçamentar */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <CampoEuros
          id={`trab-seguro-${t.id}`}
          rotulo="Seguro de trabalho (€/ano)"
          descricao="Deixa vazio se ainda não tens orçamento — usamos uma estimativa e dizemos que o é."
          valor={t.seguroAT?.premioAnual ?? 0}
          aoMudar={(v) => aoMudar({ seguroAT: { premioAnual: v > 0 ? v : undefined } })}
          max={20000}
        />
        <CampoEuros
          id={`trab-sst-${t.id}`}
          rotulo="Medicina do trabalho (€/ano)"
          descricao="Obrigatória. Sem orçamento, fica como pressuposto por resolver."
          valor={t.sst?.custoAnual ?? 0}
          aoMudar={(v) => aoMudar({ sst: { custoAnual: v > 0 ? v : undefined } })}
          max={20000}
        />
        <CampoEuros
          id={`trab-formacao-${t.id}`}
          rotulo="Formação (€/ano)"
          descricao="O Código do Trabalho prevê 40 horas anuais mínimas."
          valor={t.formacao?.custoAnual ?? 0}
          aoMudar={(v) =>
            aoMudar({ formacao: { ...t.formacao, custoAnual: v > 0 ? v : undefined } })
          }
          max={20000}
        />
      </div>
    </div>
  );
}
