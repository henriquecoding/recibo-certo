"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O DOSSIER — não um cartão, uma decisão instruída
//  ---------------------------------------------------------------------
//  Ponto 24 do pedido: cada oportunidade explica o que é, por que apareceu
//  para ESTA pessoa, que problema resolve, quem compra, com que
//  evidências, quanto custa, que riscos traz, como se valida e o que
//  falta saber.
//
//  Ponto 26: «como chegámos a esta conclusão?» tem de ser respondível.
//  Aqui é — cada número traz a origem, cada dimensão traz o valor, e o
//  plano de investigação diz o que ainda ninguém consultou.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { guardarSementeOportunidade } from "@/lib/store/handoff-descoberta-negocio";
import { formatarIntervalo, ROTULO_ORIGEM } from "@/lib/negocio/descoberta/proveniencia";
import { descreverZona, ROTULO_ENTREGA } from "@/lib/negocio/descoberta/motor/gerador";
import { EXPLICACAO_DIMENSAO, ROTULO_DIMENSAO } from "@/lib/negocio/descoberta/motor/scoring";
import { ROTULO_BASE } from "@/lib/negocio/descoberta/motor/intensidade";
import { FRASE_CONFIANCA, ROTULO_CONFIANCA } from "@/lib/negocio/descoberta/motor/confianca";
import { ROTULO_RISCO } from "@/lib/negocio/descoberta/motor/risco";
import { ROTULO_LACUNA } from "@/lib/negocio/descoberta/motor/procura";
import { ROTULO_FONTE, type PlanoDeInvestigacao } from "@/lib/negocio/descoberta/motor/planeador";
import type { OpportunityCandidate, OpportunityScore } from "@/lib/negocio/descoberta/motor/tipos";
import type { MarketHypothesis } from "@/lib/negocio/market/hipoteses";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Export,
  ExternalLink,
  Gauge,
  Info,
  Minus,
  Scale,
  Search,
  ShieldCheck,
  Warning,
} from "@/components/ui/Icons";
import { BarraDeIntervalo, Chip, LinhaDimensao } from "./atomos";
import ProvaLocal from "./ProvaLocal";

/**
 * O estilo das duas pontes para o estúdio.
 *
 * Uma é `<Link>` e a outra `<button>` — a diferença é de mecânica, não de
 * significado, e o ecrã não a pode mostrar: quem lê vê uma saída só, com
 * o mesmo peso (terciário — a ação principal do dossier continua a ser
 * formar o preço).
 */
const LIGACAO_ESTUDIO =
  "inline-flex min-h-[44px] items-center text-[12px] font-medium text-stone-500 underline-offset-4 hover:text-brand-dark hover:underline dark:text-stone-400 dark:hover:text-brand-mint";

const DIMENSOES: readonly (keyof OpportunityScore)[] = [
  "fitPessoal",
  "procura",
  "lacunaDeOferta",
  "economia",
  "exequibilidade",
  "regulacao",
  "risco",
  "geografia",
];

export default function Dossier({
  candidato,
  plano,
  onGuardar,
  guardada,
  hipotese,
  onProva,
}: {
  candidato: OpportunityCandidate;
  plano?: PlanoDeInvestigacao;
  onGuardar: () => void;
  guardada: boolean;
  hipotese?: MarketHypothesis;
  onProva: (proxima: MarketHypothesis) => void;
}) {
  const router = useRouter();
  const [comoChegamos, setComoChegamos] = useState(false);
  const objecoesQueProcedem = candidato.objecoes.filter((item) => item.procede);
  const ficha = useRef<HTMLDivElement>(null);

  /**
   * Imprime só ESTA ficha.
   *
   * Três coisas têm de acontecer antes de chamar `print()`, e nenhuma é
   * cosmética:
   *
   *  1. marcar o cartão, para a CSS esconder os outros — sem isto sairiam
   *     dez hipóteses e o papel deixava de ser uma ficha;
   *  2. abrir os `<details>` fechados, porque o browser não imprime o que
   *     está colapsado e a escala aos concelhos ficaria de fora;
   *  3. abrir «como chegámos a esta conclusão», que é justamente a parte
   *     que dá valor a levar isto a alguém.
   *
   * O estado é reposto no `afterprint`, e também quando o utilizador
   * cancela a caixa de impressão — que é o mesmo evento.
   */
  const imprimirFicha = () => {
    const alvo = ficha.current?.closest("article") ?? ficha.current;
    if (!alvo) return;

    setComoChegamos(true);
    const reabrir: HTMLDetailsElement[] = [];
    for (const item of alvo.querySelectorAll("details")) {
      if (!item.open) {
        item.open = true;
        reabrir.push(item);
      }
    }
    alvo.setAttribute("data-ficha-a-imprimir", "");
    document.body.classList.add("a-imprimir-ficha");

    const limpar = () => {
      alvo.removeAttribute("data-ficha-a-imprimir");
      document.body.classList.remove("a-imprimir-ficha");
      for (const item of reabrir) item.open = false;
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);

    // Um quadro para o React aplicar `comoChegamos` antes de o browser
    // tirar a fotografia da página.
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  return (
    <div ref={ficha} className="border-t border-stone-100 px-4 pb-5 pt-4 dark:border-stone-800 sm:px-5">
      {/* ── Porque apareceu para mim ─────────────────────────────── */}
      <div className="rounded-3xl border border-brand-light bg-brand-light/30 p-4 dark:border-brand/20 dark:bg-brand/10">
        <p className="text-xs font-semibold text-brand-deep dark:text-brand-mint">Porque apareceu para ti</p>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
          {candidato.explicacao.resumo}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {candidato.explicacao.aFavor.length > 0 ? (
            <ul className="space-y-1">
              {candidato.explicacao.aFavor.map((linha) => (
                <li key={linha} className="flex gap-1.5 text-[12px] leading-snug text-stone-600 dark:text-stone-300">
                  <Check size={12} className="mt-0.5 flex-none text-brand" />
                  {linha}
                </li>
              ))}
            </ul>
          ) : null}
          {candidato.explicacao.contra.length > 0 ? (
            <ul className="space-y-1">
              {candidato.explicacao.contra.map((linha) => (
                <li key={linha} className="flex gap-1.5 text-[12px] leading-snug text-stone-500">
                  <Warning size={12} className="mt-0.5 flex-none text-alert-text" />
                  {linha}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* ── O problema, o cliente, o modelo ──────────────────────── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">O problema</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-500">{candidato.problema.enunciado}</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">{candidato.problema.porqueDoi}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Quem compra</p>
          <ul className="mt-1 space-y-0.5">
            {candidato.problema.clientes.map((cliente) => (
              <li key={cliente} className="text-sm leading-relaxed text-stone-500">
                {cliente}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-semibold text-stone-700 dark:text-stone-200">Como ganha dinheiro</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-500">{candidato.modelo.comoSeCobra}</p>
        </div>
      </div>

      {/* ── Economia ─────────────────────────────────────────────── */}
      <div className="mt-4 rounded-3xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/40">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200">
          <Gauge size={13} className="text-brand" /> Capital e prazo
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <Numero
            rotulo="Investimento inicial"
            valor={candidato.viabilidade.investimentoInicial ? formatarIntervalo(candidato.viabilidade.investimentoInicial) : null}
            origem={candidato.viabilidade.investimentoInicial?.proveniencia.origem}
          />
          <Numero
            rotulo="Custo fixo mensal"
            valor={candidato.viabilidade.custoMensal ? formatarIntervalo(candidato.viabilidade.custoMensal) : null}
            origem={candidato.viabilidade.custoMensal?.proveniencia.origem}
          />
          <Numero
            rotulo="Até à primeira receita"
            valor={candidato.viabilidade.tempoAteReceitaMeses ? formatarIntervalo(candidato.viabilidade.tempoAteReceitaMeses) : null}
            origem={candidato.viabilidade.tempoAteReceitaMeses?.proveniencia.origem}
          />
        </div>
        <ul className="mt-3 space-y-1 border-t border-stone-200/70 pt-2.5 dark:border-stone-800">
          {candidato.viabilidade.limitacoes.map((limitacao) => (
            <li key={limitacao} className="text-[11px] leading-snug text-stone-500">
              {limitacao}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Evidência ────────────────────────────────────────────── */}
      <div className="mt-4 rounded-3xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200">
            <ShieldCheck size={13} className="text-brand" /> O que o mercado mostra
          </p>
          <Chip tom={candidato.procura.leitura === "desconhecida" ? "aviso" : "marca"}>
            {ROTULO_LACUNA[candidato.procura.leitura]}
          </Chip>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-stone-500">{candidato.procura.nota}</p>

        {candidato.evidencias.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {candidato.evidencias.map((evidencia) => (
              <li key={evidencia.id} className="rounded-2xl bg-white/70 p-2.5 dark:bg-stone-900/40">
                <p className="flex flex-wrap items-baseline gap-1.5">
                  {evidencia.valor ? (
                    <span className="text-base font-semibold tabular-nums text-ink">
                      {evidencia.valor.numero.toLocaleString("pt-PT")}
                      <span className="ml-0.5 text-[10px] font-medium text-stone-500">{evidencia.valor.unidade}</span>
                    </span>
                  ) : null}
                  <span className="text-[12px] font-medium text-stone-700 dark:text-stone-200">{evidencia.afirmacao}</span>
                </p>
                <p
                  data-proveniencia={evidencia.proveniencia.origem}
                  className="mt-0.5 text-[11px] leading-snug text-stone-500"
                >
                  {ROTULO_ORIGEM[evidencia.proveniencia.origem]} · {evidencia.proveniencia.fonte}
                  {evidencia.proveniencia.periodo ? ` · ${evidencia.proveniencia.periodo}` : ""}
                  {evidencia.proveniencia.geografia ? ` · ${evidencia.proveniencia.geografia}` : ""}
                </p>
                {evidencia.proveniencia.limitacao ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-stone-400">{evidencia.proveniencia.limitacao}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {/* ── A ESCALA AOS 308 CONCELHOS ──────────────────────────────
            A ferramenta sabia dizer «o teu concelho está no percentil 78»
            e não sabia dizer ONDE é que não está. A distribuição já era
            calculada para produzir esse percentil e era deitada fora; a
            matriz já está toda no browser, porque o concelho de quem
            pergunta nunca sai do dispositivo. Mostrá-la não custa um
            pedido, um dado, nem uma linha de rede.

            Os DOIS extremos, sempre. Só os menos servidos leria-se como
            uma seta a apontar para onde mudar — e menos operadores tanto
            pode ser espaço por ocupar como mercado que não existe. */}
        {candidato.procura.escalaDeLacuna ? (
          <details className="group mt-3 border-t border-stone-200/70 pt-2.5 dark:border-stone-800">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500 marker:hidden hover:text-stone-700 dark:hover:text-stone-300">
              <span>Onde há menos operadores por cliente</span>
              <span className="text-[10px] font-normal normal-case tracking-normal text-stone-400 group-open:hidden">
                ver os {candidato.procura.escalaDeLacuna.unidadesComparadas} concelhos
              </span>
            </summary>

            <p className="mt-2 text-[11px] leading-snug text-stone-500">
              Operadores por mil{" "}
              {candidato.procura.escalaDeLacuna.unidadeCliente === "residentes" ? "residentes" : "clientes possíveis"},
              entre {candidato.procura.escalaDeLacuna.unidadesComparadas} concelhos · mediana{" "}
              <span className="tabular-nums">{candidato.procura.escalaDeLacuna.medianaNacional.toFixed(1)}</span> ·
              INE {candidato.procura.escalaDeLacuna.periodoEmpresas}
            </p>

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["Menos servidos", candidato.procura.escalaDeLacuna.menosServidos],
                  ["Mais servidos", candidato.procura.escalaDeLacuna.maisServidos],
                ] as const
              ).map(([titulo, lista]) => (
                <div key={titulo}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{titulo}</p>
                  <ul className="mt-1 space-y-0.5">
                    {lista.map((item) => (
                      <li
                        key={item.codigo}
                        className={`flex items-baseline justify-between gap-2 text-[11px] ${
                          item.codigo === candidato.procura.escalaDeLacuna?.aqui?.codigo
                            ? "font-semibold text-brand-deep dark:text-brand-mint"
                            : "text-stone-600 dark:text-stone-300"
                        }`}
                      >
                        <span className="truncate">
                          {item.posicao}. {item.nome}
                        </span>
                        <span className="flex-none tabular-nums text-stone-500">
                          {item.porMilClientes.toFixed(1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {candidato.procura.escalaDeLacuna.aqui ? (
              <p className="mt-2 text-[11px] leading-snug text-stone-500">
                {candidato.procura.escalaDeLacuna.aqui.nome} fica em{" "}
                <strong className="font-semibold text-stone-700 dark:text-stone-200">
                  {candidato.procura.escalaDeLacuna.aqui.posicao}.º
                </strong>{" "}
                de {candidato.procura.escalaDeLacuna.unidadesComparadas}, com{" "}
                <span className="tabular-nums">{candidato.procura.escalaDeLacuna.aqui.porMilClientes.toFixed(1)}</span>{" "}
                por mil.
              </p>
            ) : null}

            <p className="mt-2 text-[11px] leading-snug text-stone-400">
              Poucos operadores não é o mesmo que oportunidade: tanto pode ser espaço por ocupar como mercado que
              não existe — e a segunda leitura é a que arruína quem se muda. Esta é a ordem por densidade, um facto,
              não um conselho sobre onde ir.
              {candidato.procura.escalaDeLacuna.ressalva ? ` ${candidato.procura.escalaDeLacuna.ressalva}` : ""}
            </p>
          </details>
        ) : null}

        {candidato.lacunas.length > 0 ? (
          <div className="mt-3 border-t border-stone-200/70 pt-2.5 dark:border-stone-800">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">O que ainda não sabemos</p>
            <ul className="mt-1.5 space-y-1.5">
              {candidato.lacunas.map((lacuna) => (
                <li key={lacuna.pergunta} className="text-[11px] leading-snug text-stone-500">
                  <strong className="font-semibold text-stone-700 dark:text-stone-200">{lacuna.pergunta}</strong>{" "}
                  {lacuna.motivo}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* ── Requisitos e riscos ──────────────────────────────────── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-stone-100 p-4 dark:border-stone-800">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200">
            <Scale size={13} className="text-brand" /> Requisitos a confirmar
          </p>
          {candidato.regulacao.requisitos.length === 0 ? (
            <p className="mt-2 text-[12px] leading-relaxed text-stone-500">
              Não identificámos requisitos específicos para esta composição. Isso não é o mesmo que não
              existirem — é o que sabemos.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {candidato.regulacao.requisitos.map((requisito) => (
                <li key={requisito.id} className="text-[12px] leading-snug">
                  <span className="font-semibold text-stone-700 dark:text-stone-200">{requisito.rotulo}</span>
                  <span className="ml-1.5 align-middle">
                    <Chip tom={requisito.obrigatorio === true ? "aviso" : "neutro"}>
                      {requisito.obrigatorio === true ? "obrigatório" : "depende do caso"}
                    </Chip>
                  </span>
                  <span className="mt-0.5 block text-stone-500">{requisito.exigencia}</span>
                  {requisito.proveniencia.url ? (
                    <a
                      href={requisito.proveniencia.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-dark hover:underline dark:text-brand-mint"
                    >
                      {requisito.proveniencia.fonte} <ExternalLink size={10} />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-stone-100 p-4 dark:border-stone-800">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200">
            <Warning size={13} className="text-alert-text" /> Riscos, face ao que declaraste
          </p>
          <ul className="mt-2 space-y-1.5">
            {candidato.riscos
              .filter((risco) => risco.nivel > 0)
              .map((risco) => (
                <li key={risco.dimensao} className="text-[12px] leading-snug">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-stone-700 dark:text-stone-200">{ROTULO_RISCO[risco.dimensao]}</span>
                    {/* Três estados, porque há três. O chip vermelho num
                        risco por apurar contradizia a frase logo por baixo
                        («por não estar apurada, não conta contra a tua
                        tolerância») e a contagem do stress test, que já o
                        ignorava. Cinza e «por apurar» dizem o que é. */}
                    <Chip tom={risco.dentroDaTolerancia === false ? "risco" : "neutro"}>
                      {risco.dentroDaTolerancia === null
                        ? "por apurar"
                        : risco.dentroDaTolerancia
                          ? "dentro do que aceitas"
                          : "acima do que aceitas"}
                    </Chip>
                  </span>
                  <span className="mt-0.5 block text-stone-500">{risco.nota}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* ── Stress test ──────────────────────────────────────────── */}
      {objecoesQueProcedem.length > 0 ? (
        <div className="mt-4 rounded-3xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            Tentámos destruir esta hipótese. Isto é o que ficou de pé contra ela
          </p>
          <ul className="mt-2 space-y-1.5">
            {objecoesQueProcedem.map((objecao) => (
              <li key={objecao.id} className="text-[12px] leading-snug">
                <span className="font-semibold text-amber-900 dark:text-amber-200">{objecao.pergunta}</span>
                <span className="mt-0.5 block text-amber-900/75 dark:text-amber-100/70">{objecao.resposta}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Plano de validação ───────────────────────────────────── */}
      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200">
          <BookOpen size={13} className="text-brand" /> Validar esta oportunidade
        </p>
        <ol className="mt-2 space-y-2.5">
          {candidato.validacao.map((passo, indice) => (
            <li key={passo.titulo} className="flex gap-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-light text-[11px] font-semibold text-brand-deep dark:bg-brand/15 dark:text-brand-mint"
              >
                {indice + 1}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-200">{passo.titulo}</span>
                  <Chip>{passo.horizonte.replace("-", " ")}</Chip>
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-stone-500">{passo.detalhe}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-stone-400">
                  Feito quando: {passo.criterio}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Provar no mercado ────────────────────────────────────── */}
      <div className="mt-4">
        <ProvaLocal
          hipoteseId={candidato.seedTemplateId ?? candidato.id}
          hipotese={hipotese}
          regiao={candidato.regiao}
          onChange={onProva}
        />
      </div>

      {/* ── Como chegámos aqui ───────────────────────────────────── */}
      <div className="mt-4 border-t border-stone-100 pt-4 dark:border-stone-800">
        <button
          type="button"
          aria-expanded={comoChegamos}
          onClick={() => setComoChegamos(!comoChegamos)}
          className="inline-flex min-h-[38px] items-center gap-1.5 text-[12px] font-semibold text-brand-dark hover:underline dark:text-brand-mint"
        >
          <Info size={13} /> Como chegámos a esta conclusão?
        </button>

        {comoChegamos ? (
          <div className="mt-3 space-y-4 rounded-3xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/40">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                As oito dimensões, em separado
              </p>
              <ul className="mt-2 space-y-1.5">
                {DIMENSOES.map((dimensao) => (
                  <LinhaDimensao
                    key={dimensao}
                    rotulo={ROTULO_DIMENSAO[dimensao]}
                    valor={candidato.scores[dimensao]}
                    explicacao={EXPLICACAO_DIMENSAO[dimensao]}
                  />
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-snug text-stone-500">
                As dimensões sem base para serem avaliadas ficam de fora da média — não valem zero.
                Zero seria uma afirmação sobre o mercado; ausência é uma afirmação sobre nós.
              </p>
              {/* A mesma barra do cartão, aqui em largura cheia: é o
                  painel «como chegámos a esta conclusão», e é onde o
                  intervalo merece o espaço. */}
              <span className="mt-2 block">
                <BarraDeIntervalo
                  min={candidato.intervaloPontuacao.min}
                  ponto={candidato.intervaloPontuacao.ponto}
                  max={candidato.intervaloPontuacao.max}
                  fechado={candidato.intervaloPontuacao.fechado}
                />
              </span>
              <p className="mt-1.5 text-[11px] leading-snug text-stone-500">
                <strong className="font-semibold text-stone-700 dark:text-stone-200">
                  Pontuação {candidato.pontuacaoGlobal}
                  {candidato.intervaloPontuacao.fechado
                    ? ""
                    : `, entre ${candidato.intervaloPontuacao.min} e ${candidato.intervaloPontuacao.max}`}
                </strong>{" "}
                {candidato.intervaloPontuacao.fechado
                  ? "— todas as dimensões tinham base para ser avaliadas, por isso não há intervalo: o número é o número."
                  : "consoante o que ainda não sabemos. O intervalo fecha à medida que respondes a mais perguntas e que mais leituras oficiais ficam ligadas."}
              </p>
            </div>

            {/* A intensidade: o que as séries DIZEM, contra o quê */}
            {candidato.procura.intensidade.leituras.length > 0 ? (
              <div className="border-t border-stone-200/70 pt-3 dark:border-stone-800">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  Como lemos a procura
                </p>
                <ul className="mt-2 space-y-1.5">
                  {candidato.procura.intensidade.leituras.map((leitura) => (
                    <li key={leitura.seriesId} className="text-[11px] leading-snug">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-stone-700 dark:text-stone-200">
                          {leitura.seriesLabel}
                        </span>
                        <Chip tom={leitura.posicao >= 60 ? "marca" : "neutro"}>{leitura.posicao} / 100</Chip>
                      </span>
                      <span className="mt-0.5 block text-stone-500">
                        {leitura.valor.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} {leitura.unidade} ·{" "}
                        {ROTULO_BASE[leitura.base]} · {leitura.referencia}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] leading-snug text-stone-500">
                  Um número solto não diz nada: 62 % de ocupação é bom ou mau consoante o resto do país. O
                  motor só pontua a procura quando tem contra o que a ler — e quando não tem, diz que não
                  tem em vez de contar quantas leituras encontrou.
                </p>
              </div>
            ) : null}

            {/* ── PARA ONDE ISTO SE MOVEU ──────────────────────────────
                «É alto?» e «está a subir?» são perguntas diferentes, e o
                motor só respondia à primeira. Um mercado nos 63 % a subir
                e um nos 63 % a cair são decisões opostas.

                A tendência vem sempre do instantâneo, mesmo quando as
                leituras acima são frescas: a API do INE devolve um
                período por pedido, e dois períodos custam duas chamadas —
                trabalho de job, não de pedido. A data está à vista. */}
            {candidato.procura.tendencias.length > 0 ? (
              <div className="border-t border-stone-200/70 pt-3 dark:border-stone-800">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  Para onde se moveu no último período
                </p>
                <ul className="mt-2 space-y-1.5">
                  {candidato.procura.tendencias.map((tendencia) => {
                    const Seta =
                      tendencia.direcao === "subiu"
                        ? ChevronUp
                        : tendencia.direcao === "desceu"
                          ? ChevronDown
                          : Minus;
                    // A cor diz a DIREÇÃO, nunca se é bom ou mau: mais
                    // transações de casas é procura para quem faz
                    // mudanças e concorrência para quem já as faz. O
                    // motor não sabe de que lado a pessoa está.
                    return (
                      <li key={tendencia.seriesId} className="text-[11px] leading-snug">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-stone-700 dark:text-stone-200">
                            {tendencia.seriesLabel}
                          </span>
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-stone-100 px-1.5 py-0.5 font-semibold tabular-nums text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                            <Seta size={11} aria-hidden="true" />
                            {tendencia.direcao === "estavel"
                              ? "estável"
                              : `${tendencia.variacaoPct > 0 ? "+" : ""}${tendencia.variacaoPct.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} %`}
                          </span>
                        </span>
                        <span
                          data-numero="tendencia"
                          data-proveniencia="observado"
                          className="mt-0.5 block text-stone-500"
                        >
                          {tendencia.anterior.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} →{" "}
                          {tendencia.atual.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}{" "}
                          {tendencia.unidade} · {tendencia.periodoAnterior} para {tendencia.periodoAtual} ·{" "}
                          {tendencia.nacional ? "leitura do país" : "leitura da tua zona"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-[11px] leading-snug text-stone-400">
                  A direção não diz se é bom ou mau — mais transações de casas são procura para quem faz
                  mudanças e concorrência para quem já as faz. Diz para onde o mercado andou entre as duas
                  últimas edições publicadas.
                </p>
              </div>
            ) : null}

            <div className="border-t border-stone-200/70 pt-3 dark:border-stone-800">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Confiança da análise</p>
              <p className="mt-1 text-[12px] font-semibold text-stone-700 dark:text-stone-200">
                {ROTULO_CONFIANCA[candidato.confianca.nivel]} · {Math.round(candidato.confianca.cobertura * 100)}% das
                dimensões com base
              </p>
              <p className="mt-1 text-[12px] leading-snug text-stone-500">{FRASE_CONFIANCA[candidato.confianca.nivel]}</p>
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                <Chip>Força da evidência {candidato.confianca.forcaDaEvidencia} / 100</Chip>
                {candidato.confianca.frescura !== null ? (
                  <Chip tom={candidato.confianca.frescura < 50 ? "aviso" : "neutro"}>
                    Atualidade {candidato.confianca.frescura} / 100
                  </Chip>
                ) : null}
              </p>
              <p className="mt-1.5 text-[11px] leading-snug text-stone-500">
                Estas duas viajam ao lado da pontuação e nunca entram nela. Medem o que sabemos, não o
                negócio — somá-las ao score seria dizer que uma hipótese vale mais por termos mais dados
                sobre ela.
              </p>
              <ul className="mt-2 space-y-1">
                {candidato.confianca.motivos.map((motivo) => (
                  <li key={motivo} className="text-[11px] leading-snug text-stone-500">
                    · {motivo}
                  </li>
                ))}
              </ul>
            </div>

            {plano ? (
              <div className="border-t border-stone-200/70 pt-3 dark:border-stone-800">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  <Search size={12} /> O que seria preciso investigar
                </p>
                <p className="mt-1 text-[11px] leading-snug text-stone-500">
                  {plano.ligadas} de {plano.consultas.length} destas consultas têm fonte ligada ao motor. As
                  outras estão por ligar — e enquanto não estiverem, não temos a resposta e não a
                  inventamos.
                </p>
                <ul className="mt-2 space-y-1.5">
                  {plano.consultas.map((consulta) => (
                    <li key={consulta.pergunta} className="text-[11px] leading-snug">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-stone-700 dark:text-stone-200">{consulta.pergunta}</span>
                        <Chip tom={consulta.ligada ? "marca" : "neutro"}>{consulta.ligada ? "ligada" : "por ligar"}</Chip>
                      </span>
                      <span className="mt-0.5 block text-stone-500">
                        {consulta.metrica} · {consulta.fontes.map((fonte) => ROTULO_FONTE[fonte]).join(", ")} ·{" "}
                        {consulta.ambito} · válida {consulta.frescuraMaximaDias} dias
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="border-t border-stone-200/70 pt-3 text-[11px] leading-snug text-stone-500 dark:border-stone-800">
              <p>
                Composição: {candidato.problema.enunciado.slice(0, 60)}… × {candidato.modelo.rotulo} ×{" "}
                {ROTULO_ENTREGA[candidato.entrega]} × {descreverZona(candidato.regiao)}.
              </p>
              <p className="mt-1">
                {candidato.seedTemplateId
                  ? "Esta composição coincide com um dossier curado, revisto por uma pessoa — o texto vem de lá."
                  : "Esta composição não corresponde a nenhum dossier escrito à mão: foi montada pelo motor a partir do que sabes fazer."}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Ações ────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4 dark:border-stone-800">
        <Link
          href={`/ferramentas/recibos-verdes?modo=preco&cenario=${candidato.cenarioPreco}${
            candidato.seedTemplateId ? `&h=${encodeURIComponent(candidato.seedTemplateId)}` : ""
          }`}
          className="btn-shine inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-card hover:shadow-lift"
        >
          Formar o preço desta hipótese <ArrowRight size={14} />
        </Link>
        <button
          type="button"
          onClick={onGuardar}
          disabled={guardada}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-stone-200 px-4 text-[12px] font-semibold text-stone-600 hover:border-brand/60 hover:text-brand-dark disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
        >
          {guardada ? <Check size={13} /> : null}
          {guardada ? "Guardada neste dispositivo" : "Guardar esta hipótese"}
        </button>
        {/* ── LEVAR A FICHA PARA FORA DO DISPOSITIVO ────────────────
            É a única saída compatível com `privacy: "local-only"`: o
            browser imprime, e nada é enviado para lado nenhum. Sai UMA
            hipótese por folha — as outras são escondidas na CSS de
            impressão — com os números e a proveniência colada a cada um,
            que é o que se leva a um contabilista ou ao banco.

            `<button>` e não `<a>`, e sem `bg-brand`: a ação principal do
            dossier continua a ser uma só. */}
        <button
          type="button"
          data-print="hide"
          onClick={imprimirFicha}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-stone-200 px-4 text-[12px] font-semibold text-stone-600 hover:border-brand/60 hover:text-brand-dark dark:border-stone-700 dark:text-stone-300"
        >
          <Export size={13} /> Imprimir ou guardar em PDF
        </button>
        {/* ── A CONTINUIDADE PARA O ESTÚDIO, PARA TODAS AS HIPÓTESES ──
            Isto existia só para as composições que coincidem com um dos 24
            dossiers curados, porque a ponte era um `?o=<id do catálogo>` —
            e um id de catálogo é precisamente a única coisa que uma
            composição gerada não tem. As hipóteses que este motor existe
            para compor eram as que acabavam num beco.

            Duas pontes, um destino. A curada continua a viajar no URL: um
            id público não diz nada sobre quem o escolheu, é indexável e é
            o que o teste de contrato verifica. A gerada leva o cenário e o
            nome pelo cofre local, porque um título composto a partir das
            competências de alguém não pode ficar no histórico do browser
            (§10). O rótulo é o mesmo nos dois casos: quem lê não tem de
            saber qual das duas está a atravessar. */}
        {candidato.seedTemplateId ? (
          <Link
            href={`/dashboard/negocio?o=${encodeURIComponent(candidato.seedTemplateId)}`}
            data-print="hide"
            className={LIGACAO_ESTUDIO}
          >
            ou construir no estúdio de empresa
          </Link>
        ) : (
          <button
            type="button"
            data-print="hide"
            onClick={() => {
              guardarSementeOportunidade({ cenario: candidato.cenarioPreco, nome: candidato.titulo });
              // Navega mesmo sem armazenamento: o estúdio abre na mesma e
              // a pessoa cria a oferta como sempre criou. Uma ferramenta
              // que se recusa a abrir porque não guardou uma conveniência
              // é pior do que a conveniência que perdeu.
              router.push("/dashboard/negocio");
            }}
            className={LIGACAO_ESTUDIO}
          >
            ou construir no estúdio de empresa
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Um número do dossier, com a origem colada a ele.
 *
 * `data-numero` e `data-proveniencia` não são decoração de teste: são a
 * única forma de a verificação de ponta a ponta afirmar a regra de ouro
 * — nenhum número chega ao ecrã sem dizer de onde vem — sem a ler do
 * texto. O rótulo é `uppercase`, e `innerText` devolve o texto JÁ
 * transformado por CSS; procurá-lo por palavras acaba a acertar em
 * «hipóteses» no meio de uma frase e a verificação passa a não verificar
 * nada. O atributo diz a origem em dados, e não em prosa.
 */
function Numero({
  rotulo,
  valor,
  origem,
}: {
  rotulo: string;
  valor: string | null;
  origem?: "observado" | "estimativa" | "calculo" | "hipotese";
}) {
  return (
    <div data-numero={rotulo} className="rounded-2xl bg-white p-2.5 dark:bg-stone-900">
      <p className="text-[11px] font-medium text-stone-500">{rotulo}</p>
      {valor === null ? (
        <p data-numero-ausente="" className="mt-0.5 text-[12px] italic text-stone-400">
          não estimável com o que sabemos
        </p>
      ) : (
        <>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{valor}</p>
          {origem ? (
            <p data-proveniencia={origem} className="mt-0.5 text-[10px] uppercase tracking-wide text-stone-400">
              {ROTULO_ORIGEM[origem]}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
