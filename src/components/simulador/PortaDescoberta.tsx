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
import { useAuth } from "@/lib/supabase/auth";
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

/**
 * O que se faz antes de sair, nas duas variantes.
 *
 * ── A CORRIDA COM A SESSÃO, DITA EM VOZ ALTA ───────────────────────
 * O cofre ativo começa no anónimo e só sabe de quem é depois de a
 * autenticação resolver a sessão. Quem tem conta e carregue nesta porta
 * ANTES disso escreve o bilhete no cofre anónimo, e o convite do outro
 * lado — que espera pela sessão, e bem — procura no cofre da conta e não
 * o encontra.
 *
 * Não se resolve escrevendo nos dois: um cofre existe precisamente para
 * o que uma pessoa deixou não aparecer a quem usar o browser a seguir, e
 * a régua não muda por o dado ser pequeno. Também não se resolve
 * atrasando a navegação, que seria pagar com o gesto de toda a gente uma
 * corrida que quase ninguém corre — a porta vive dentro de um simulador
 * que só monta depois da hidratação.
 *
 * Fica então limitada ao seu tamanho real (perde-se um convite de volta;
 * nenhum dado se perde e nenhum aparece a quem não é dele) e, sobretudo,
 * fica MEDIDA: `error_code` distingue-a de quem não tem armazenamento
 * nenhum. Uma corrida invisível é a que ninguém corrige.
 */
function aoSair(origem: SimuladorDeOrigem, userId: string | null, sessaoPronta: boolean) {
  const guardou = guardarRegressoAoSimulador(origem, userId);
  // Nenhum valor sai daqui (§8.2): só que houve uma saída, por que porta,
  // e se a pessoa vai poder voltar.
  registar("simulator_step", {
    tool_id: origem,
    step_id: PASSO_SAIDA,
    outcome: guardou && sessaoPronta ? "ok" : "erro",
    error_code: !guardou ? "sem_armazenamento" : sessaoPronta ? undefined : "sessao_por_resolver",
  });
}

export default function PortaDescoberta({ origem, variante = "cartao" }: PortaDescobertaProps) {
  const porta = PORTAS_DESCOBERTA[origem];
  const { user, carregado: sessaoPronta } = useAuth();
  const userId = user?.id ?? null;

  if (variante === "nota") {
    return (
      <p className="texto-mini mt-4 border-t border-stone-200/80 pt-4 text-center leading-relaxed text-stone-500 dark:border-stone-800 dark:text-stone-400">
        Ainda não decidiste o que vais vender?{" "}
        <Link
          href={ROTA_DESCOBERTA}
          onClick={() => aoSair(origem, userId, sessaoPronta)}
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
      onClick={() => aoSair(origem, userId, sessaoPronta)}
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
