"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A CAIXA — o que o cliente paga, o que entra, e o que sai depois
//  ---------------------------------------------------------------------
//  `resultado.caixa` é calculado pelo motor desde o primeiro dia e nunca
//  chegou ao ecrã. É provavelmente a omissão mais cara da ferramenta,
//  porque é literalmente o posicionamento do produto: «vende
//  tranquilidade, não cálculos — mostrar quanto é teu, quanto reservar».
//
//  A distância entre «vendi por 100 €» e «tenho 100 €» é onde nasce o
//  susto de fim de trimestre. Três linhas resolvem-no:
//
//    cobrado ao cliente    o número da montra
//    entra na conta        já sem comissão nem retenção
//    sai depois            IVA a entregar, Segurança Social, IRS
//
//  A retenção na fonte aparece aqui e SÓ aqui, porque é o único sítio
//  onde é verdade: ela muda quando recebes, nunca quanto ganhas. Pô-la
//  na margem seria o erro que o invariante 3 da especificação proíbe.
// ═══════════════════════════════════════════════════════════════════════

import { fmt } from "@/lib/format";
import type { ResultadoPreco } from "@/lib/pricing";
import { Wallet, Info } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";

export default function Caixa({ resultado }: { resultado: ResultadoPreco }) {
  const { caixa, fiscal } = resultado;
  if (!resultado.ok || caixa.cobradoAoCliente <= 0) return null;

  const fica = caixa.entraNaConta - caixa.saiDepois;
  const maximo = Math.max(caixa.cobradoAoCliente, 0.01);

  const linhas = [
    {
      chave: "cobrado",
      rotulo: "O cliente paga",
      valor: caixa.cobradoAoCliente,
      nota: "O preço da montra, com IVA incluído.",
      cor: "bg-stone-300",
    },
    {
      chave: "entra",
      rotulo: "Entra na tua conta",
      valor: caixa.entraNaConta,
      nota:
        fiscal.retencaoPorUnidade > 0
          ? `Já sem a comissão do canal e sem ${fmt(fiscal.retencaoPorUnidade)} de retenção na fonte — que é IRS adiantado, não um custo.`
          : "Já sem a comissão do canal e as taxas de pagamento.",
      cor: "bg-brand-mint",
    },
    {
      chave: "fica",
      rotulo: "Fica mesmo contigo",
      valor: Math.max(0, fica),
      nota: `Depois de entregar ${fmt(caixa.saiDepois)} em IVA, Segurança Social e IRS — noutra data, e é aí que apanha as pessoas.`,
      cor: "bg-brand",
    },
  ];

  return (
    <section
      aria-label="Do que o cliente paga ao que fica contigo"
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
          <Wallet size={16} className="flex-shrink-0 text-stone-500 dark:text-stone-400" />
          De {fmt(caixa.cobradoAoCliente)} a {fmt(Math.max(0, fica))}
        </h2>
        <Badge tone="neutral">por venda</Badge>
      </div>

      <ol className="space-y-3">
        {linhas.map((l) => (
          <li key={l.chave}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm text-stone-700 dark:text-stone-200">{l.rotulo}</span>
              <span className="text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                {fmt(l.valor)}
              </span>
            </div>
            <div
              className="mt-1 h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
              aria-hidden="true"
            >
              <span
                className={`block h-full rounded-full ${l.cor}`}
                style={{ width: `${Math.max(2, Math.min(100, (l.valor / maximo) * 100))}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{l.nota}</p>
          </li>
        ))}
      </ol>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-stone-50 px-3 py-2.5 text-xs leading-relaxed text-stone-600 dark:bg-stone-800/40 dark:text-stone-400">
        <Info size={13} className="mt-0.5 flex-shrink-0" />
        <span>
          A diferença entre a segunda e a terceira linha é dinheiro que passa pela tua conta e não é teu. O calendário
          aqui em baixo diz em que datas é que ele sai.
        </span>
      </p>
    </section>
  );
}
