"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useCenarios,
  marcarReabertura,
  META_TIPO_CENARIO,
  TIPOS_CENARIO,
  type Cenario,
  type TipoCenario,
} from "@/lib/store/cenarios";
import { useSubscricao } from "@/lib/stripe/subscription";
import { permissaoDe } from "@/lib/entitlements";
import { fmt, pct } from "@/lib/format";
import {
  data as celulaData,
  escreverCSV,
  numero,
  texto,
  type DialetoCSV,
  type TabelaCSV,
} from "@/lib/export/csv";
import { MIME, descarregar } from "@/lib/export/nomes";
import {
  Invoice, Wallet, Building, Calculator, Trash, Export, ArrowRight, Sparkle, Lock, Scale, Warning, History,
} from "@/components/ui/Icons";
import type { ReactNode } from "react";

const ICONES: Record<string, (p: { size?: number; className?: string }) => ReactNode> = {
  Invoice, Wallet, Building, Calculator, Scale,
};

// Deriva da fonte única. Uma segunda lista escrita à mão foi como os cenários
// de heranças passaram a ser guardados mas nunca mostrados — e a contar na
// mesma para o limite do plano grátis (RC-P0-04).
const SIMULADORES: { tipo: TipoCenario; rota: string }[] = TIPOS_CENARIO.map((tipo) => ({
  tipo,
  rota: META_TIPO_CENARIO[tipo].rota,
}));

const fmtValor = (v: number, f?: "eur" | "pct") => (f === "pct" ? pct(v) : fmt(v));
const dataPt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Exportação (CSV) — preserva todos os dados (instantâneo completo) ───────
// As duas linhas de título e a linha em branco que existiam por cima do
// cabeçalho faziam com que nenhuma ferramenta importasse o ficheiro. Um CSV é
// uma tabela: um cabeçalho, nada por cima dele.
function exportarCenariosCSV(cenarios: Cenario[], dialeto: DialetoCSV = "humano"): void {
  const tabela: TabelaCSV = {
    colunas: [
      { codigo: "tipo", rotulo: "Tipo" },
      { codigo: "nome", rotulo: "Nome" },
      { codigo: "criado_em", rotulo: "Criado em" },
      { codigo: "destaque_rotulo", rotulo: "Destaque" },
      { codigo: "destaque_valor", rotulo: "Valor" },
      { codigo: "destaque_unidade", rotulo: "Unidade" },
      { codigo: "dados_json", rotulo: "Dados (instantâneo completo, JSON)" },
    ],
    linhas: cenarios.map((c) => [
      texto(META_TIPO_CENARIO[c.tipo].label),
      texto(c.nome),
      celulaData(c.criadoEm),
      texto(c.resumo.destaqueLabel),
      // O valor vai sempre como número — a unidade tem coluna própria. Assim a
      // coluna soma no Excel em vez de ser texto por causa do «%» ou do «€».
      numero(c.resumo.destaque),
      texto(c.resumo.destaqueFmt === "pct" ? "fração" : "EUR"),
      texto(JSON.stringify(c.dados)),
    ]),
  };
  descarregar(escreverCSV(tabela, { dialeto }), `cenarios-recibocerto.csv`, MIME.csv);
}

export default function CenariosPage() {
  const router = useRouter();
  const {
    cenarios, carregado, naNuvem, limite, limiteAtingido, excedentesLegado, remover,
    erroCarregamento, locaisPorImportar, importarLocais, adiarImportacao,
  } = useCenarios();
  const { pode } = useSubscricao();
  // O CSV de cenários é uma exportação: exige a permissão de exportação, como
  // as outras (RC-P1-10). Antes passava sem gate nenhum.
  const podeExportar = pode(permissaoDe("exportar-csv"));

  const [aRemover, setARemover] = useState<Cenario | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Eliminar passa a pedir confirmação: com gravação otimista e erros
  // silenciosos, um toque sem rede de segurança era perda de dados (RC-P2-06).
  const confirmarRemocao = useCallback(async () => {
    if (!aRemover) return;
    const r = await remover(aRemover.id);
    setARemover(null);
    if (!r.ok) setAviso(r.erro.mensagem);
  }, [aRemover, remover]);

  const porTipo = useMemo(() => {
    const grupos = Object.fromEntries(TIPOS_CENARIO.map((t) => [t, [] as Cenario[]])) as Record<TipoCenario, Cenario[]>;
    for (const c of cenarios) grupos[c.tipo]?.push(c);
    return grupos;
  }, [cenarios]);

  const abrir = (c: Cenario) => {
    marcarReabertura(c);
    router.push(META_TIPO_CENARIO[c.tipo].rota);
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Cabeçalho */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="eyebrow mb-2 text-brand">Principal</div>
          {/* «Cenários» era o nome do OBJETO que a base de dados guarda. O
              que a pessoa tem aqui é trabalho: preços, projetos, planos de
              contratação e simulações. O nome passa a ser o dela. */}
          <h1 className="display-2 font-display font-semibold text-stone-800 dark:text-stone-100">O meu trabalho</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
            Tudo o que guardaste dos simuladores completos — recibos verdes, salário, empresa, contratação, IRS e
            heranças — num só lugar. Cada um conserva os dados que preencheste, para reabrires e continuares de onde
            ficaste. As ferramentas rápidas (comparador, ato isolado, auditoria de recibo) calculam mas não guardam.
          </p>
        </div>
        {cenarios.length > 0 && podeExportar && (
          <button
            type="button"
            onClick={() => exportarCenariosCSV(cenarios)}
            className="group inline-flex flex-shrink-0 items-center gap-2 self-start rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 shadow-card transition-all hover:border-brand hover:text-brand dark:border-stone-700 dark:text-stone-300"
          >
            <Export size={16} /> Exportar CSV
          </button>
        )}
      </header>

      {/* Estado do plano / limite */}
      <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${limiteAtingido ? "border-alert-border bg-alert-bg" : "border-stone-100 bg-white shadow-card dark:border-stone-700 dark:bg-stone-900"}`}>
        <span className={`mt-0.5 flex-shrink-0 ${limiteAtingido ? "text-alert-text" : "text-brand"}`}>
          {naNuvem ? <Sparkle size={16} /> : <Lock size={16} />}
        </span>
        <div className="min-w-0 flex-1 text-sm">
          {naNuvem ? (
            <p className="text-stone-600 dark:text-stone-300">
              <span className="font-semibold text-brand-dark dark:text-brand">Plus</span> — cenários ilimitados, sincronizados na nuvem entre dispositivos.
            </p>
          ) : (
            <p className={limiteAtingido ? "text-alert-text" : "text-stone-600 dark:text-stone-300"}>
              {excedentesLegado > 0 ? (
                <>
                  Tens {cenarios.length} cenários guardados de quando o plano grátis
                  permitia mais — continuam aqui, não apagámos nenhum. O plano grátis
                  guarda {limite}.{" "}
                </>
              ) : (
                <>{cenarios.length}/{limite} cenário guardado no plano grátis.{" "}</>
              )}
              <Link href="/dashboard/upgrade" className="font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand">
                Passa ao Plus
              </Link>{" "}
              para guardares todos e sincronizares na nuvem.
            </p>
          )}
        </div>
      </div>

      {/* Cenários locais por trazer para a conta (RC-P1-07). Nunca se substitui
          uma coleção pela outra em silêncio: a pessoa escolhe. */}
      {locaisPorImportar > 0 && (
        <div className="mb-6 rounded-2xl border border-brand/30 bg-brand-light px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex-shrink-0 text-brand"><History size={18} /></span>
            <p className="text-sm text-brand-dark">
              Tens {locaisPorImportar} {locaisPorImportar === 1 ? "cenário guardado" : "cenários guardados"} neste
              dispositivo que ainda não estão na tua conta.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 pl-[30px]">
            <button
              type="button"
              onClick={async () => {
                const r = await importarLocais();
                if (!r.ok) setAviso(r.erro.mensagem);
              }}
              className="min-h-9 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Trazer para a nuvem
            </button>
            <button
              type="button"
              onClick={adiarImportacao}
              className="min-h-9 rounded-xl px-3 py-2 text-sm font-medium text-brand-dark transition-colors hover:bg-white/40"
            >
              Manter só neste dispositivo
            </button>
          </div>
        </div>
      )}

      {aviso && (
        <p role="alert" className="mb-4 rounded-2xl border border-alert-border bg-alert-bg px-4 py-3 text-sm text-alert-text">
          {aviso}
        </p>
      )}

      {/* Conteúdo */}
      {!carregado ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900" />
          ))}
        </div>
      ) : erroCarregamento ? (
        /* Falhar a ler não é "não tens cenários" — mostrar a lista vazia aqui
           parecia perda de histórico (RC-P0-03). */
        <div className="rounded-4xl border border-alert-border bg-alert-bg p-8 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-alert-text/10 text-alert-text">
            <Warning size={20} />
          </span>
          <h2 className="font-display text-lg font-semibold text-alert-text">Não foi possível carregar os teus cenários</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-alert-text/80">
            {erroCarregamento.mensagem} Os cenários continuam guardados — isto é uma falha a lê-los.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-xl bg-alert-text px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      ) : cenarios.length === 0 ? (
        <EstadoVazio />
      ) : (
        <div className="space-y-8">
          {SIMULADORES.map(({ tipo }) => {
            const lista = porTipo[tipo];
            if (lista.length === 0) return null;
            const meta = META_TIPO_CENARIO[tipo];
            const Icon = ICONES[meta.icone] ?? Calculator;
            return (
              <section key={tipo}>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
                    <Icon size={17} />
                  </span>
                  <div>
                    <h2 className="font-display text-base font-semibold text-stone-800 dark:text-stone-100">{meta.label}</h2>
                    <p className="text-[11px] text-stone-400">{meta.sub}</p>
                  </div>
                  <span className="ml-auto rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">{lista.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {lista.map((c) => (
                    <CartaoCenario key={c.id} cenario={c} onAbrir={() => abrir(c)} onRemover={() => setARemover(c)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Confirmação de eliminação — folha inferior no telemóvel (RC-P2-06). */}
      {aRemover && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remover-titulo"
          onClick={(e) => { if (e.target === e.currentTarget) setARemover(null); }}
        >
          <div
            className="w-full max-w-sm rounded-t-4xl bg-white p-6 shadow-float sm:rounded-4xl dark:bg-stone-900"
            style={{ maxHeight: "90dvh", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            <h2 id="remover-titulo" className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
              Apagar «{aRemover.nome || "Cenário sem nome"}»?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              O cenário e todos os dados que preencheste desaparecem. Não é possível recuperar.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setARemover(null)}
                className="min-h-10 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Manter
              </button>
              <button
                type="button"
                onClick={confirmarRemocao}
                className="min-h-10 rounded-xl bg-alert-text px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Apagar cenário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CartaoCenario({ cenario, onAbrir, onRemover }: { cenario: Cenario; onAbrir: () => void; onRemover: () => void }) {
  const { resumo } = cenario;
  return (
    <div className="flex flex-col rounded-4xl border border-stone-100 bg-white p-5 shadow-card transition-shadow hover:shadow-lift dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{cenario.nome || "Cenário sem nome"}</div>
          <div className="text-[11px] text-stone-400">{dataPt(cenario.criadoEm)}</div>
        </div>
        <button type="button" onClick={onRemover} aria-label="Apagar cenário" className="flex-shrink-0 rounded-lg p-1 text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-stone-600 dark:hover:bg-red-950/30">
          <Trash size={15} />
        </button>
      </div>

      <div className="mt-3">
        <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">{resumo.destaqueLabel}</div>
        <div className="font-display text-2xl font-semibold tabular-nums text-brand">{fmtValor(resumo.destaque, resumo.destaqueFmt)}</div>
      </div>

      {resumo.linhas.length > 0 && (
        <div className="mt-3 space-y-1">
          {resumo.linhas.map((l, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-stone-500 dark:text-stone-400">{l.label}</span>
              <span className="font-medium tabular-nums text-stone-700 dark:text-stone-300">{fmtValor(l.valor, l.fmt)}</span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onAbrir}
        className="group mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand/30 bg-brand-light px-4 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:border-brand"
      >
        Abrir e continuar <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

function EstadoVazio() {
  return (
    <div className="rounded-4xl border border-dashed border-stone-200 bg-white p-8 text-center shadow-card dark:border-stone-700 dark:bg-stone-900">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
        <Calculator size={22} />
      </span>
      <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Ainda não guardaste cenários</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        Em qualquer um dos simuladores completos, no fim, toca em «Guardar cenário» — aparece aqui com todos os
        dados, pronto a reabrir.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {SIMULADORES.map(({ tipo, rota }) => {
          const meta = META_TIPO_CENARIO[tipo];
          const Icon = ICONES[meta.icone] ?? Calculator;
          return (
            <Link key={tipo} href={rota} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-brand hover:text-brand dark:border-stone-700 dark:text-stone-300">
              <Icon size={15} /> {meta.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
