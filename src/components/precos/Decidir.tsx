"use client";

// ═══════════════════════════════════════════════════════════════════════
//  DECIDIR — a zona que a ferramenta não tinha
//  ---------------------------------------------------------------------
//  A ferramenta acabava num parágrafo de isenção de responsabilidade. Sem
//  guardar, sem exportar, sem copiar, sem próximo passo. A skill de
//  crescimento é explícita: «Tem transição definida? Guardar, FIZ,
//  especialista ou nada. Sem transição, é dívida editorial.»
//
//  ── SÓ AS SAÍDAS LOCAIS ─────────────────────────────────────────────
//  O próximo passo comercial NÃO vive aqui. Vive em `ConclusaoPreco`,
//  que o delega a `ResultadoExplicado` e, através dela, a
//  `escolherRota()`. É deliberado: se cada página pudesse escolher os
//  seus botões, a regra «nunca três ações com o mesmo peso» duraria até à
//  primeira semana em que a receita estivesse abaixo do esperado.
//
//  ── As três saídas locais ───────────────────────────────────────────
//  Guardar, copiar e imprimir acontecem TODAS no dispositivo. Não há
//  envio, não há conta, não há email. `privacy: "local-only"` continua a
//  ser verdade depois desta secção existir — e é por isso que não há aqui
//  «partilhar por link»: encodar o contexto na URL punha custos de
//  fornecedor no histórico do browser e na área de transferência.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Link from "next/link";
import { fmt, pct } from "@/lib/format";
import type { ContextoPreco, ResultadoPreco } from "@/lib/pricing";
import { cenarioPorChave, REVISAO_PRICING } from "@/lib/pricing";
import { guardarPreco } from "@/lib/store/precos-guardados";
import { registarAcaoResultado } from "./medicao";
import { ArrowRight, Check, Copy, Download } from "@/components/ui/Icons";

export default function Decidir({
  contexto,
  resultado,
  respondidos,
  aoGuardar,
}: {
  contexto: ContextoPreco;
  resultado: ResultadoPreco;
  respondidos: ReadonlySet<string>;
  /** Devolve o nome com que ficou guardado, para o cabeçalho o mostrar. */
  aoGuardar?: (nome: string) => void;
}) {
  const [nome, setNome] = useState(contexto.produto.nome ?? "");
  const [guardado, setGuardado] = useState(false);
  const [copiado, setCopiado] = useState(false);

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
      // Qual o conjunto de regras que produziu ESTE número. Sem isto, um
      // preço relido no ano seguinte parece o mesmo e não é (ADR-07).
      anoFiscal: Number(REVISAO_PRICING.slice(0, 4)),
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
      className="px-5 py-5 print:hidden sm:px-6"
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
        <Link
          href="/dashboard/precos"
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold text-brand-dark underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-brand-mint"
        >
          Comparar com os que já guardaste
          <ArrowRight size={12} />
        </Link>
        <button
          type="button"
          onClick={imprimir}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:text-stone-400"
        >
          <Download size={12} />
          Imprimir ou guardar em PDF
        </button>
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
