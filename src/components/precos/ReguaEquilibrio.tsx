"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A RÉGUA DO EQUILÍBRIO — quantas vendas até deixar de perder dinheiro
//  ---------------------------------------------------------------------
//  O ponto de equilíbrio estava numa célula da grelha de métricas, como
//  «34» com a legenda «vendas/mês · 11 dias», e mais uma nota em texto
//  corrido por baixo. Três problemas:
//
//   ① «34 vendas» não diz nada sem o outro número. A pergunta real é
//     «34 é muito ou pouco PARA MIM?», e a resposta depende do volume
//     que a pessoa espera — que a ferramenta sabe e não punha ao lado.
//
//   ② A relação entre os dois é a informação mais acionável da
//     ferramenta («faltam-te 9 vendas para o mês fechar») e não estava
//     escrita em lado nenhum: tinha de ser o leitor a subtrair.
//
//   ③ Estar em prejuízo — volume esperado ABAIXO do equilíbrio — lia-se
//     igual a estar em lucro. Dois números pretos lado a lado.
//
//  A régua põe os dois na mesma escala e pinta o troço que falta. Deixou
//  tirar a nota em texto e a legenda apertada da métrica, que é o que o
//  §24 exige de uma visualização nova.
//
//  Sem bibliotecas (§27): é uma barra com uma marca.
// ═══════════════════════════════════════════════════════════════════════

import { Info } from "@/components/ui/Icons";

export default function ReguaEquilibrio({
  unidadesEquilibrio,
  unidadesEsperadas,
  possivel,
  nota,
}: {
  unidadesEquilibrio: number;
  /** O volume que a pessoa disse esperar vender por mês. */
  unidadesEsperadas: number;
  possivel: boolean;
  nota?: string;
}) {
  // Sem equilíbrio possível a régua mentiria: não há ponto nenhum onde as
  // contas fechem, e desenhar uma escala sugeria que havia.
  if (!possivel) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-800 dark:bg-red-950/30 dark:text-red-300">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        A este preço não há ponto de equilíbrio: cada venda afunda mais as contas, por isso vender mais não resolve.
      </p>
    );
  }

  // Sem custos fixos o equilíbrio é zero — lucro desde a primeira venda.
  if (unidadesEquilibrio <= 0) {
    return (
      <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
        Sem contas fixas declaradas, dás lucro desde a primeira venda.{" "}
        <span className="text-stone-500 dark:text-stone-400">
          Se tens despesas que pagas todos os meses, declara-as em «Contas que pagas mesmo sem vender» — o equilíbrio
          muda.
        </span>
      </p>
    );
  }

  const faltam = Math.max(0, unidadesEquilibrio - unidadesEsperadas);
  const chegou = faltam === 0;

  // A escala vai até ao maior dos dois, com folga, para nenhum dos
  // marcadores ficar colado à ponta.
  const teto = Math.max(unidadesEquilibrio, unidadesEsperadas) * 1.15 || 1;
  const posEquilibrio = Math.min(100, (unidadesEquilibrio / teto) * 100);
  const posEsperado = Math.min(100, (unidadesEsperadas / teto) * 100);
  const percentagem = Math.min(100, Math.round((unidadesEsperadas / unidadesEquilibrio) * 100));

  return (
    <div>
      <p className="text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
        {chegou ? (
          <>
            Ao ritmo que esperas, o mês fecha à{" "}
            <strong className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">
              {unidadesEquilibrio}.ª venda
            </strong>{" "}
            — e as {Math.max(0, unidadesEsperadas - unidadesEquilibrio)} seguintes já são lucro.
          </>
        ) : (
          <>
            Faltam-te{" "}
            <strong className="font-semibold tabular-nums text-red-600 dark:text-red-400">
              {faltam} {faltam === 1 ? "venda" : "vendas"}
            </strong>{" "}
            por mês para as contas fecharem: precisas de {unidadesEquilibrio} e esperas {unidadesEsperadas}.
          </>
        )}
      </p>

      <div className="relative mt-2.5">
        <div
          className="h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
          role="progressbar"
          aria-valuenow={percentagem}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Volume esperado: ${unidadesEsperadas} vendas por mês, ${percentagem}% do ponto de equilíbrio de ${unidadesEquilibrio}`}
        >
          <div
            className={`h-full rounded-full ${chegou ? "bg-brand" : "bg-alert-border"}`}
            style={{ width: `${posEsperado}%` }}
          />
        </div>

        {/* A marca do equilíbrio. É o número que interessa, por isso é
            uma linha cheia e não um gradiente. */}
        <span
          aria-hidden="true"
          className="absolute -top-1 h-4.5 w-0.5 rounded-full bg-stone-600 dark:bg-stone-300"
          style={{ left: `${posEquilibrio}%`, height: "1.125rem" }}
        />
      </div>

      <div className="relative mt-1 h-4 text-[10px] text-stone-500 dark:text-stone-400">
        <span
          className="absolute whitespace-nowrap"
          style={{ left: `${posEquilibrio}%`, transform: "translateX(-50%)" }}
        >
          {unidadesEquilibrio} = equilíbrio
        </span>
      </div>

      {nota ? (
        <p className="mt-1.5 flex items-start gap-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          {nota}
        </p>
      ) : null}
    </div>
  );
}
