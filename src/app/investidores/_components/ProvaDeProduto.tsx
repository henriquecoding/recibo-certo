// Uma prova de produto — estática, no servidor, sem animação.
//
// Eram três demonstrações animadas, com temporizadores a correr desde o mount
// (não desde a entrada no viewport), a repetir em ciclo. Custavam CPU e
// bateria a quem nem estava a olhar, e para um investidor três demos longas
// valem menos do que uma prova curta e honesta.
//
// Esta mostra o cálculo que o produto faz, com os números vindos do motor
// verificado no servidor — e com os pressupostos à vista, que era a segunda
// falha do cartão da empresa: dizia "Exemplo ilustrativo" e escondia que
// tratava faturação como lucro, assumia derrama máxima, distribuía tudo como
// dividendos e não modelava salário nem Segurança Social do gerente.

import { allocateWholePercentages } from "../_lib/percentages";
import { eur } from "./Primitivas";

export interface ValoresProva {
  bruto: number;
  liquido: number;
  irs: number;
  ss: number;
}

export default function ProvaDeProduto({ v }: { v: ValoresProva }) {
  // As três fatias têm de somar 100 — arredondar cada uma isoladamente dava
  // 101% no donut da página anterior.
  const [pctLiquido, pctIrs, pctSs] = allocateWholePercentages([v.liquido, v.irs, v.ss], v.bruto);

  const fatias = [
    { rotulo: "Fica contigo", valor: v.liquido, pct: pctLiquido, cor: "bg-brand-dark" },
    { rotulo: "Retenção de IRS", valor: v.irs, pct: pctIrs, cor: "bg-brand" },
    { rotulo: "Segurança Social", valor: v.ss, pct: pctSs, cor: "bg-brand-mint" },
  ];

  return (
    <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-ink">
          Recibo de {eur(v.bruto)} · artigo 151.º
        </h3>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          Exemplo
        </span>
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-stone-400">
        O que é mesmo teu
      </p>
      <p className="font-display text-4xl font-semibold tabular-nums text-brand-dark dark:text-brand-mint sm:text-5xl">
        {eur(v.liquido)}
      </p>

      {/* Barra proporcional. Sem animação: a largura está no HTML. */}
      <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800" aria-hidden>
        {fatias.map((f) => (
          <div key={f.rotulo} className={f.cor} style={{ width: `${f.pct}%` }} />
        ))}
      </div>

      {/* A tabela é o acesso real aos valores — o gráfico é o complemento, não
          o contrário. Um leitor de ecrã lê isto e fica com tudo. */}
      <table className="mt-4 w-full text-left text-[13px]">
        <caption className="sr-only">
          Decomposição de um recibo de {eur(v.bruto)} ao abrigo do artigo 151.º
        </caption>
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-stone-400">
            <th scope="col" className="pb-1 font-semibold">Parcela</th>
            <th scope="col" className="pb-1 text-right font-semibold">Valor</th>
            <th scope="col" className="pb-1 text-right font-semibold">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {fatias.map((f) => (
            <tr key={f.rotulo}>
              <th scope="row" className="py-2 font-medium text-stone-700 dark:text-stone-300">
                {f.rotulo}
              </th>
              <td className="py-2 text-right tabular-nums text-stone-700 dark:text-stone-300">{eur(f.valor)}</td>
              <td className="py-2 text-right tabular-nums text-stone-500 dark:text-stone-400">{f.pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800 dark:text-stone-400">
        Pressupostos: atividade estabelecida (2.º ano ou seguinte), Continente, isenção de IVA
        pelo artigo 53.º, base de incidência de serviços, sem dispensa de retenção e sem
        acumulação com trabalho dependente. Não é aconselhamento fiscal.
      </p>
    </div>
  );
}
