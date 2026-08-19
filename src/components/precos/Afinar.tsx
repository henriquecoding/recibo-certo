"use client";

// ═══════════════════════════════════════════════════════════════════════
//  AFINAR — o modo preciso, com o estado à vista
//  ---------------------------------------------------------------------
//  Eram dez acordeões fechados, todos com o mesmo aspeto, nenhum a dizer
//  o que tinha lá dentro nem o que mudava no preço. Os dois
//  comportamentos observados eram ambos maus: quem os abria todos
//  desistia a meio; quem não abria nenhum levava um preço calculado com
//  zero custos fixos e zero comissões, apresentado como recomendação.
//
//  Agora cada linha diz três coisas antes de se abrir:
//
//    o estado    «por preencher» ou «3 contas · 320,00 €/mês»
//    o impacto   «muda o preço mínimo e o equilíbrio»
//    a urgência  destacado quando um aviso do motor o aponta como em falta
//
//  E a ordem não é a do ficheiro: é a que o cenário declara, com o que
//  está em falta a subir ao topo. Um aviso a dizer que não há custos
//  fixos declarados não pode conviver com o bloco dos custos fixos em
//  nono lugar.
//
//  Tudo isto vem de `pricing/blocos.ts` — dados, não `if` no JSX. Um
//  bloco novo entra lá, ganha um corpo em `blocos/`, e a interface
//  segue-o.
// ═══════════════════════════════════════════════════════════════════════

import { useState, type ReactNode } from "react";
import {
  BLOCOS,
  blocoDestacado,
  cenarioPorChave,
  ordenarBlocos,
  particionarBlocos,
  type BlocoAvancado,
  type ContextoPreco,
  type DefinicaoCenarioInicial,
  type ResultadoPreco,
} from "@/lib/pricing";
import { Plus } from "@/components/ui/Icons";
import { Bloco, CampoEuros, CampoPercentagem } from "./atomos";
import Fiscal from "./blocos/Fiscal";
import Tempo from "./blocos/Tempo";
import { Cac, CustosFixos, CustosVariaveis, Desperdicio, Escaloes, Producao } from "./blocos/Custos";
import { Comissoes, Desconto, Devolucoes, Pagamento } from "./blocos/Canal";

type Atualizar = (campo: string, patch: (c: ContextoPreco) => void) => void;

export default function Afinar({
  contexto,
  definicao,
  atualizar,
  resultado,
}: {
  contexto: ContextoPreco;
  definicao: DefinicaoCenarioInicial;
  atualizar: Atualizar;
  resultado: ResultadoPreco;
}) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const alternar = (id: string) => setAbertos((a) => ({ ...a, [id]: !a[id] }));

  // ── Os blocos que a pessoa mandou aparecer ────────────────────────
  //  Ver `particionarBlocos`: à entrada só se desenham os que já têm
  //  dados dela e os que o motor aponta como em falta. Os outros ficam
  //  como fichas, a um clique.
  const [promovidos, setPromovidos] = useState<Set<BlocoAvancado>>(() => new Set());
  const promover = (b: BlocoAvancado) => {
    setPromovidos((a) => new Set(a).add(b));
    // Promover e abrir é o mesmo gesto: quem carregou em «Embalagem»
    // quer escrever o custo da embalagem, não ver mais um acordeão.
    setAbertos((a) => ({ ...a, [b]: true }));
  };

  const rapidos = new Set(definicao.rapido);

  // `comissoes` e `pagamento` partilhavam um bloco; continuam a
  // partilhá-lo, e por isso o segundo só aparece sozinho quando o
  // primeiro não está declarado neste cenário.
  const declarados = definicao.avancado.filter(
    (b) => !(b === "pagamento" && definicao.avancado.includes("comissoes")),
  );

  const ordem = ordenarBlocos(declarados, contexto, resultado.avisos);
  const { visiveis, disponiveis } = particionarBlocos(ordem, contexto, resultado.avisos, promovidos);

  const corpos: Partial<Record<BlocoAvancado, ReactNode>> = {
    fiscalidade: <Fiscal contexto={contexto} atualizar={atualizar} />,
    custos_fixos: <CustosFixos contexto={contexto} atualizar={atualizar} />,
    custos_variaveis: <CustosVariaveis contexto={contexto} atualizar={atualizar} />,
    desperdicio: <Desperdicio contexto={contexto} atualizar={atualizar} />,
    escaloes: <Escaloes contexto={contexto} atualizar={atualizar} />,
    comissoes: <Comissoes contexto={contexto} atualizar={atualizar} canalNoEssencial={rapidos.has("canal")} />,
    pagamento: <Pagamento contexto={contexto} atualizar={atualizar} />,
    devolucoes: <Devolucoes contexto={contexto} atualizar={atualizar} />,
    tempo_detalhe: contexto.tempo ? <Tempo contexto={contexto} atualizar={atualizar} /> : null,
    producao_detalhe: contexto.producao ? <Producao contexto={contexto} atualizar={atualizar} /> : null,
    cac: <Cac contexto={contexto} atualizar={atualizar} />,
    desconto: <Desconto contexto={contexto} atualizar={atualizar} />,
  };

  const emFalta = ordem.filter((b) => blocoDestacado(b, contexto, resultado.avisos)).length;

  return (
    <section aria-label="Afinar o preço" className="space-y-3">
      <div className="px-1">
        <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Afinar o preço</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          {emFalta > 0
            ? `Cada bloco que preencheres muda o número. ${emFalta === 1 ? "Um está" : `${emFalta} estão`} a fazer falta ao cálculo — ${emFalta === 1 ? "está" : "estão"} marcado${emFalta === 1 ? "" : "s"} em cima.`
            : "Cada bloco que preencheres torna o número mais teu. Nenhum é obrigatório."}
        </p>
      </div>

      {visiveis.map((chave) => {
        const meta = BLOCOS[chave];
        const corpo = corpos[chave];
        if (!meta || !corpo) return null;

        const destacado = blocoDestacado(chave, contexto, resultado.avisos);

        return (
          <Bloco
            key={chave}
            id={`bloco-${chave}`}
            titulo={meta.titulo}
            descricao={meta.descricao}
            estado={meta.resumo(contexto)}
            impacto={meta.oQueMuda}
            destacado={destacado}
            aberto={!!abertos[chave]}
            alternar={() => alternar(chave)}
            aoRepor={
              meta.preenchido(contexto)
                ? () =>
                    atualizar(`repor-${chave}`, (c) => meta.repor(c, cenarioPorChave(contexto.cenario).contexto()))
                : undefined
            }
          >
            {corpo}
          </Bloco>
        );
      })}

      {/* ── TENS OUTROS CUSTOS? ──────────────────────────────────────
          Os blocos que este cenário conhece mas que ainda não dizem
          respeito a esta pessoa. Eram doze acordeões fechados à entrada,
          todos iguais; agora são uma linha de fichas, e cada uma diz o
          que muda no preço.

          Nada foi removido — `visiveis` + `disponiveis` é sempre o total,
          e há um teste que o garante. O que mudou foi o custo de os
          ignorar. ──────────────────────────────────────────────────── */}
      {disponiveis.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-3.5 dark:border-stone-700">
          <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">Tens outros custos?</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            Só o que te diz respeito. Cada um muda o preço de maneira diferente.
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {disponiveis.map((chave) => {
              const meta = BLOCOS[chave];
              if (!meta || !corpos[chave]) return null;
              return (
                <li key={chave}>
                  <button
                    type="button"
                    onClick={() => promover(chave)}
                    // `title` com o que muda: quem passa o rato sabe se
                    // vale a pena antes de acrescentar mais uma linha.
                    title={`${meta.descricao} — ${meta.oQueMuda}`}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:border-brand hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-brand dark:hover:text-brand-mint"
                  >
                    <Plus size={13} className="flex-shrink-0" aria-hidden />
                    {meta.titulo}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* ── A faixa, e o preço que já tinhas em mente ────────────────
          Fica sempre no fim e fora da lista ordenada: não é um custo, é
          uma verificação do que a ferramenta produziu. */}
      <Bloco
        id="bloco-faixa"
        titulo="A faixa e o preço que tinhas em mente"
        descricao="Diz-nos o preço que pensaste e nós dizemos se fecha as contas"
        estado={contexto.precoPensado ? "com preço para comparar" : "por preencher"}
        impacto="não muda o preço — verifica-o"
        aberto={!!abertos.faixa}
        alternar={() => alternar("faixa")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoEuros
            id="preco-pensado"
            rotulo="O preço que tinhas pensado (com IVA)"
            descricao="Comparamo-lo com o piso, com o mínimo e com o recomendado, e dizemos-te em qual deles cai."
            valor={contexto.precoPensado ?? 0}
            aoMudar={(v) => atualizar("preco-pensado", (c) => void (c.precoPensado = v > 0 ? v : undefined))}
            max={1_000_000}
          />
          {/* `folgaConfortavel` existia no tipo e não tinha campo: a
              âncora «confortável» era sempre 10 pontos acima do objetivo,
              sem que ninguém o pudesse discutir. É um pressuposto, e um
              pressuposto edita-se. */}
          <CampoPercentagem
            id="folga-confortavel"
            rotulo="Folga da margem confortável"
            descricao="Quantos pontos de margem acima do teu objetivo é que consideras confortável. Serve para absorver o erro das tuas próprias estimativas."
            valor={contexto.objetivo.folgaConfortavel ?? 0.1}
            aoMudar={(v) => atualizar("folga-confortavel", (c) => void (c.objetivo.folgaConfortavel = v))}
            max={50}
          />
        </div>
      </Bloco>
    </section>
  );
}
