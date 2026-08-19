"use client";

// ═══════════════════════════════════════════════════════════════════════
//  DECIDIR — a zona que a ferramenta não tinha
//  ---------------------------------------------------------------------
//  A ferramenta acabava num parágrafo de isenção de responsabilidade. Sem
//  guardar, sem exportar, sem copiar, sem próximo passo. A skill de
//  crescimento é explícita: «Tem transição definida? Guardar, FIZ,
//  especialista ou nada. Sem transição, é dívida editorial.»
//
//  ── A HIERARQUIA DOS CTA NÃO É ESCOLHIDA AQUI ───────────────────────
//  Passa-se `escolherRota()` os SINAIS e ela decide qual é a ação
//  principal. É deliberado, e a razão está escrita em
//  `ResultadoExplicado.tsx`: se cada página pudesse escolher os seus
//  botões, a regra «nunca três ações com o mesmo peso» duraria até à
//  primeira semana em que a receita estivesse abaixo do esperado.
//
//  Repare-se no sinal mais importante: `confianca`. Enquanto o resultado
//  for um exemplo ou uma estimativa, `escolherRota` devolve
//  `sem_parceiro` — nenhuma rota comercial abre sobre um número que a
//  pessoa não alimentou. Monetizar uma dúvida mal resolvida é exatamente
//  o que o §12.1 proíbe.
//
//  ── E as três saídas locais ─────────────────────────────────────────
//  Guardar, copiar e imprimir acontecem TODAS no dispositivo. Não há
//  envio, não há conta, não há email. `privacy: "local-only"` continua a
//  ser verdade depois desta secção existir — e é por isso que não há aqui
//  «partilhar por link»: encodar o contexto na URL punha custos de
//  fornecedor no histórico do browser e na área de transferência.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Link from "next/link";
import { escolherRota } from "@/lib/routing";
import type { EstadoConfianca } from "@/lib/analytics/eventos";
import { fmt, pct } from "@/lib/format";
import type { ContextoPreco, EstadoPreenchimento, ResultadoPreco } from "@/lib/pricing";
import { cenarioPorChave } from "@/lib/pricing";
import { guardarPreco } from "@/lib/store/precos-guardados";
import { registarAcaoResultado } from "./medicao";
import { ArrowRight, Check, Copy, Download } from "@/components/ui/Icons";

const DESTINO_ROTA: Record<string, { href: string; rotulo: string }> = {
  fiz: { href: "/ir/fiz?s=calcular-preco&v=resultado", rotulo: "Continuar na FIZ" },
  contabilista: { href: "/contabilistas", rotulo: "Falar com um contabilista" },
  plus: { href: "/precos", rotulo: "Guardar e acompanhar" },
  sem_parceiro: { href: "/metodologia", rotulo: "Ver como calculamos" },
};

export default function Decidir({
  contexto,
  resultado,
  estado,
  respondidos,
  aoGuardar,
}: {
  contexto: ContextoPreco;
  resultado: ResultadoPreco;
  estado: EstadoPreenchimento;
  respondidos: ReadonlySet<string>;
  /** Devolve o nome com que ficou guardado, para o cabeçalho o mostrar. */
  aoGuardar?: (nome: string) => void;
}) {
  const [nome, setNome] = useState(contexto.produto.nome ?? "");
  const [guardado, setGuardado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const confianca: EstadoConfianca = estado === "completo" ? "completo" : "estimado";

  const rota = escolherRota({
    confianca,
    temResultado: resultado.ok,
    enquadramento:
      contexto.vendedor.tipo === "ti"
        ? "independente"
        : contexto.vendedor.tipo === "empresa"
          ? "sociedade"
          : "desconhecido",
    contabilidadeOrganizada: contexto.vendedor.regimeContabilidade === "organizada",
  });
  const destino = DESTINO_ROTA[rota.rota] ?? DESTINO_ROTA.sem_parceiro;

  const guardar = () => {
    const rotulo = nome.trim() || cenarioPorChave(contexto.cenario).rotulo;
    guardarPreco({
      id: `p${Date.now()}`,
      nome: rotulo,
      em: new Date().toISOString(),
      cenario: contexto.cenario,
      pvp: resultado.pvp,
      margem: resultado.margem.margem,
      lucroMensal: resultado.margem.lucroMensal,
      contexto: { ...contexto, produto: { ...contexto.produto, nome: rotulo } },
      respondidos: [...respondidos],
    });
    registarAcaoResultado("guardar");
    setGuardado(true);
    aoGuardar?.(rotulo);
    window.setTimeout(() => setGuardado(false), 2500);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(resumoEmTexto(contexto, resultado, nome));
      registarAcaoResultado("copiar");
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão de área de transferência não há nada a fazer nem
      // nada a explicar: os números continuam todos no ecrã.
    }
  };

  const imprimir = () => {
    registarAcaoResultado("imprimir");
    window.print();
  };

  return (
    <section
      aria-label="O que fazer com este preço"
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card print:hidden dark:border-stone-800 dark:bg-stone-900"
    >
      <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
        Guardar este preço
      </h2>
      <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        Fica no teu dispositivo, sem conta e sem email. Podes voltar a abri-lo e continuar de onde ficaste.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <label htmlFor="nome-produto" className="sr-only">
          Nome do produto ou serviço
        </label>
        <input
          id="nome-produto"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do produto ou serviço"
          className="min-h-[40px] min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
        <button
          type="button"
          onClick={guardar}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          {guardado ? <Check size={14} /> : null}
          {guardado ? "Guardado" : "Guardar"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copiar}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:text-stone-400"
        >
          {copiado ? <Check size={12} /> : <Copy size={12} />}
          {copiado ? "Copiado" : "Copiar resumo"}
        </button>
        <button
          type="button"
          onClick={imprimir}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:text-stone-400"
        >
          <Download size={12} />
          Imprimir ou guardar em PDF
        </button>
      </div>

      {/* ── O próximo passo, escolhido por `escolherRota` ─────────────
          Uma ação principal, nunca três com o mesmo peso. E nenhuma rota
          comercial enquanto a confiança não for `completo`. ─────────── */}
      <div className="mt-5 border-t border-stone-100 pt-4 dark:border-stone-800">
        <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{rota.mensagem}</p>
        <Link
          href={destino.href}
          data-rota={rota.rota}
          data-motivo={rota.motivo}
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:border-brand hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:text-stone-200 dark:hover:text-brand-mint"
          {...(rota.rota === "fiz" ? { rel: "sponsored nofollow" } : {})}
        >
          {destino.rotulo}
          <ArrowRight size={13} />
        </Link>
        <p className="mt-2.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{rota.dados}</p>
      </div>
    </section>
  );
}

/**
 * O resumo que vai para a área de transferência.
 *
 * Texto simples de propósito: vai colar-se num email a um sócio, numa
 * nota, num orçamento. Uma tabela em HTML cola mal em metade dos sítios
 * onde isto acaba.
 */
function resumoEmTexto(c: ContextoPreco, r: ResultadoPreco, nome: string): string {
  const titulo = nome.trim() || cenarioPorChave(c.cenario).rotulo;
  const linhas = [
    `PREÇO — ${titulo}`,
    "",
    `Preço ao cliente: ${fmt(r.pvp)}${r.taxaIVA > 0 ? " (com IVA)" : " (isento de IVA)"}`,
  ];

  if (r.taxaIVA > 0) linhas.push(`Sem IVA: ${fmt(r.precoLiquido)} · IVA a entregar: ${fmt(r.iva)}`);

  linhas.push(
    `Margem: ${pct(r.margem.margem)} · Markup: ${pct(r.margem.markup)}`,
    `Fica por venda: ${fmt(r.margem.lucroUnidade)}`,
    `Ao volume de ${c.volume.unidadesMes}/mês: ${fmt(r.margem.lucroMensal)} por mês`,
    "",
    "A CADA VENDA",
    `  Custo: ${fmt(r.custo.direto)}`,
    `  Contas fixas: ${fmt(r.custo.fixosPorUnidade)}`,
  );

  if (r.fiscal.aplicavel) {
    linhas.push(
      `  Segurança Social: ${fmt(r.fiscal.ssPorUnidade)}`,
      `  IRS: ${fmt(r.fiscal.irsPorUnidade)}`,
    );
  }
  if (r.taxaIVA > 0) linhas.push(`  IVA: ${fmt(r.iva)}`);

  linhas.push("", "FAIXA");
  for (const a of [...r.faixa.ancoras].sort((x, y) => x.pvp - y.pvp)) {
    linhas.push(`  ${a.rotulo}: ${fmt(a.pvp)}`);
  }

  if (r.breakEven.possivel && r.breakEven.unidades > 0) {
    linhas.push("", `Ponto de equilíbrio: ${r.breakEven.unidades} vendas por mês`);
  }

  linhas.push(
    "",
    "Estimativa calculada em recibocerto.pt/ferramentas/calcular-preco.",
    "Não substitui a análise de um contabilista certificado.",
  );

  return linhas.join("\n");
}
