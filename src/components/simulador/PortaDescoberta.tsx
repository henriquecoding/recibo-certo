"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A TERCEIRA PORTA
//  ---------------------------------------------------------------------
//  Um simulador guiado tem duas portas óbvias: «já tenho» e «estou a
//  avaliar». As duas assumem a mesma coisa — que a pessoa sabe o que vai
//  vender. Quem não sabe não fica sem resposta: inventa a faturação, e sai
//  com IRS, Segurança Social ou IRC calculados sobre um palpite, com data
//  de revisão fiscal por baixo. Um erro credível é pior do que um erro
//  visível.
//
//  Esta é a porta para essa pessoa, e é a MESMA nos dois simuladores. A
//  copy, a rota e os `step_id` vivem em `lib/simuladores/porta-descoberta`
//  — estavam escritos à mão dentro do simulador de empresa, e escrever a
//  mesma decisão duas vezes é criar a primeira oportunidade de ela
//  divergir.
//
//  ── PORQUE É UM `<Link>` E NÃO UM PASSO ────────────────────────────
//  Porque muda de ferramenta. Fingir que é mais um passo do assistente
//  escondia para onde se vai — e tirava o clique do meio, o abrir noutro
//  separador e o «voltar» do browser, que é exatamente o gesto de quem
//  está a decidir se sai.
//
//  ── O BILHETE DE REGRESSO ──────────────────────────────────────────
//  Antes de navegar, marca-se de onde se saiu (`store/regresso-descoberta`
//  — um id de ferramenta, no cofre local, nunca no URL). É o que permite
//  ao motor de descoberta oferecer o caminho de volta. Sem isto a porta
//  era uma viagem só de ida: mandar alguém embora é fácil, o valor está em
//  recebê-lo de volta com a resposta que lhe faltava.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { registar } from "@/lib/analytics/cliente";
import {
  PASSO_SAIDA,
  PORTAS_DESCOBERTA,
  ROTA_DESCOBERTA,
  type SimuladorDeOrigem,
} from "@/lib/simuladores/porta-descoberta";
import { guardarRegressoAoSimulador } from "@/lib/store/regresso-descoberta";
import { ArrowRight, Lightbulb } from "@/components/ui/Icons";

interface PortaDescobertaProps {
  origem: SimuladorDeOrigem;
  /**
   * `cartao` — a porta a par das outras, no ecrã da pergunta inicial.
   * `nota` — a segunda oportunidade, uma linha de texto, para quem já
   * escolheu outra porta e depois percebe que ainda não tem o número que
   * o passo seguinte lhe vai pedir.
   */
  variante?: "cartao" | "nota";
}

/** O que se faz antes de sair, nas duas variantes. */
function aoSair(origem: SimuladorDeOrigem) {
  const guardou = guardarRegressoAoSimulador(origem);
  // Nenhum valor sai daqui (§8.2): só que houve uma saída, e por que
  // porta. `outcome` distingue quem vai poder voltar de quem não vai
  // (modo privado, quota cheia) — sem isso, a taxa de regresso seria
  // impossível de ler.
  registar("simulator_step", {
    tool_id: origem,
    step_id: PASSO_SAIDA,
    outcome: guardou ? "ok" : "erro",
    error_code: guardou ? undefined : "sem_armazenamento",
  });
}

export default function PortaDescoberta({ origem, variante = "cartao" }: PortaDescobertaProps) {
  const porta = PORTAS_DESCOBERTA[origem];

  if (variante === "nota") {
    return (
      <p className="texto-mini mt-4 border-t border-stone-200/80 pt-4 text-center leading-relaxed text-stone-500 dark:border-stone-800 dark:text-stone-400">
        Ainda não decidiste o que vais vender?{" "}
        <Link
          href={ROTA_DESCOBERTA}
          onClick={() => aoSair(origem)}
          className="font-semibold text-stone-600 underline underline-offset-2 transition-colors hover:text-brand focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-300"
        >
          Descobre o negócio primeiro
        </Link>{" "}
        — os próximos passos pedem {porta.numeroQuePede}, e um palpite aqui vale um resultado de palpite.
      </p>
    );
  }

  return (
    <Link
      href={ROTA_DESCOBERTA}
      onClick={() => aoSair(origem)}
      className="group flex w-full items-center gap-3 rounded-3xl border-2 border-dashed border-stone-300 bg-stone-50/60 p-4 text-left transition-all hover:border-brand hover:bg-white hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-stone-700 dark:bg-stone-900/40 dark:hover:bg-stone-900"
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand group-hover:text-white dark:bg-stone-800"
        aria-hidden
      >
        <Lightbulb size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{porta.titulo}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          {porta.descricao}
        </span>
      </span>
      <ArrowRight
        size={16}
        aria-hidden
        className="flex-shrink-0 text-stone-400 transition-all group-hover:translate-x-0.5 group-hover:text-brand"
      />
    </Link>
  );
}
