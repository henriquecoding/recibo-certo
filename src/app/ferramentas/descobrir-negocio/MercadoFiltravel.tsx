"use client";

// ═══════════════════════════════════════════════════════════════════════
//  EXPLORAR MERCADO — a mesma matéria, deixada de ser uma muralha
//  ---------------------------------------------------------------------
//  ┌────────────────────────────────────────────────────────────────────┐
//  │ O QUE ESTAVA MAL                                                    │
//  │                                                                    │
//  │ Vinte e quatro dossiers, sete campos cada, todos abertos ao mesmo  │
//  │ tempo: cento e sessenta e oito parágrafos numa página. Cada campo  │
//  │ é útil — o problema é que nenhum é encontrável. Sem procura, sem   │
//  │ filtro e sem dobra, a resposta a «o que há para o meu caso?» era   │
//  │ ler tudo.                                                           │
//  │                                                                    │
//  │ A ferramenta já tinha a resposta noutra secção: `ListaFiltravel`,  │
//  │ em «o que sabes fazer», organiza 28 competências com procura sem   │
//  │ acentos, categorias somáveis, contagem anunciada e limpeza dos     │
//  │ filtros. É esse vocabulário que aqui se repete — não um novo.      │
//  └────────────────────────────────────────────────────────────────────┘
//
//  ── PORQUE ISTO É CLIENTE E MESMO ASSIM ESTÁ NO HTML ────────────────
//  A checklist editorial exige que estes dossiers existam sem
//  JavaScript, para quem navega sem ele e para um motor de busca. Um
//  Client Component no App Router é renderizado no servidor na mesma —
//  só a hidratação é que acontece no browser. O estado inicial não
//  esconde nada (sem filtros, todos os grupos abertos), e o corpo de
//  cada ficha vive dentro de um `<details>`, que é HTML: está no
//  documento, fechado, e abre sem uma linha de JavaScript.
//
//  A consequência a respeitar: nada aqui pode depender de `useEffect`
//  para aparecer. O que a primeira pintura não mostrar, não existe para
//  o rastreador.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Check, Close, Filter, Search } from "@/components/ui/Icons";
import { Chip, semAcentos } from "@/components/negocio/descoberta/atomos";

/** Um dossier reduzido ao que o ecrã mostra. Sem tipos do motor. */
export interface DossierDeMercado {
  id: string;
  titulo: string;
  promessa: string;
  problema: string;
  cliente: string;
  setor: string;
  setorRotulo: string;
  modeloDeReceita: string;
  requisitos: readonly string[];
  primeiroTeste: readonly string[];
  testeQueMata: string;
  notaDeEvidencia: string;
  /** Fontes oficiais com ingestão a correr. Vazio = ainda por ligar. */
  fontesLigadas: readonly string[];
  capital: string;
  capitalRotulo: string;
  entrega: readonly string[];
  entregaRotulo: string;
  hrefPreco: string;
}

export interface GrupoDeFiltro {
  id: string;
  rotulo: string;
}

const chipFiltro = (ativo: boolean) =>
  `inline-flex min-h-[36px] items-center gap-1 rounded-xl border px-2.5 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
    ativo
      ? "border-brand bg-brand text-white"
      : "border-stone-200 bg-white text-stone-600 hover:border-brand/60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
  }`;

/**
 * O texto sobre o qual a procura corre.
 *
 * Inclui os campos longos de propósito: quem procura «seguro» ou
 * «entrevistar» está a procurar dentro da ficha, não no título. Procurar
 * só em títulos daria zero resultados para as perguntas reais.
 */
const textoDe = (dossier: DossierDeMercado) =>
  semAcentos(
    [
      dossier.titulo,
      dossier.promessa,
      dossier.problema,
      dossier.cliente,
      dossier.modeloDeReceita,
      dossier.requisitos.join(" "),
      dossier.primeiroTeste.join(" "),
      dossier.testeQueMata,
      dossier.notaDeEvidencia,
      dossier.setorRotulo,
    ].join(" "),
  );

function Ficha({ dossier }: { dossier: DossierDeMercado }) {
  return (
    <article className="rounded-2xl border border-stone-100 bg-cream/40 p-3 dark:border-stone-800 dark:bg-stone-950/40">
      <h4 className="text-[14px] font-semibold leading-snug text-stone-800 dark:text-stone-100">
        {dossier.titulo}
      </h4>
      <p className="mt-1 text-[13px] leading-relaxed text-stone-500">{dossier.promessa}</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip>{dossier.capitalRotulo}</Chip>
        <Chip>{dossier.entregaRotulo}</Chip>
        {dossier.fontesLigadas.length > 0 ? (
          <Chip tom="marca">
            <Check size={11} /> Fontes oficiais ligadas
          </Chip>
        ) : (
          <Chip>Por investigar</Chip>
        )}
      </div>

      {/* O corpo da ficha: no HTML desde a primeira pintura, dobrado.
          `<details>` abre sem JavaScript — é o que mantém a página
          legível para um rastreador e curta para uma pessoa. */}
      <details className="group mt-2">
        <summary className="inline-flex min-h-[36px] cursor-pointer list-none items-center gap-1 text-[12px] font-semibold text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-brand-mint">
          <span className="group-open:hidden">Ver a ficha completa</span>
          <span className="hidden group-open:inline">Fechar a ficha</span>
        </summary>
        <dl className="mt-2 space-y-1 text-[13px] leading-relaxed">
          {(
            [
              ["Problema", dossier.problema],
              ["Quem compra", dossier.cliente],
              ["Como ganha dinheiro", dossier.modeloDeReceita],
              ["Requisitos críticos", `${dossier.requisitos.join("; ")}.`],
              ["Primeiro teste comercial", dossier.primeiroTeste.join(" ")],
              ["Teste que pode matar a ideia", dossier.testeQueMata],
              ["Evidência", dossier.notaDeEvidencia],
            ] as const
          ).map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt className="inline font-semibold text-stone-700 dark:text-stone-200">{rotulo}: </dt>
              <dd className="inline text-stone-500">{valor}</dd>
            </div>
          ))}
        </dl>
        {dossier.fontesLigadas.length > 0 ? (
          <p className="mt-1.5 text-[12px] text-stone-400">
            Fontes oficiais ligadas: {dossier.fontesLigadas.join("; ")}.
          </p>
        ) : null}
      </details>

      <p className="mt-2">
        <Link
          href={dossier.hrefPreco}
          className="text-[13px] font-semibold text-brand-dark underline-offset-4 hover:underline dark:text-brand-mint"
        >
          Formar o preço desta hipótese
        </Link>
      </p>
    </article>
  );
}

export default function MercadoFiltravel({
  dossiers,
  setores,
  capitais,
  entregas,
}: {
  dossiers: readonly DossierDeMercado[];
  setores: readonly GrupoDeFiltro[];
  capitais: readonly GrupoDeFiltro[];
  entregas: readonly GrupoDeFiltro[];
}) {
  const [procura, setProcura] = useState("");
  const [setoresEscolhidos, setSetores] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [capitaisEscolhidos, setCapitais] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [entregasEscolhidas, setEntregas] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [soComFontes, setSoComFontes] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);
  const idBase = useId().replace(/:/g, "");

  const consulta = semAcentos(procura.trim());
  const indice = useMemo(
    () => new Map(dossiers.map((item) => [item.id, textoDe(item)])),
    [dossiers],
  );

  const encontrados = useMemo(
    () =>
      dossiers.filter(
        (item) =>
          (consulta.length === 0 || (indice.get(item.id) ?? "").includes(consulta)) &&
          (setoresEscolhidos.size === 0 || setoresEscolhidos.has(item.setor)) &&
          (capitaisEscolhidos.size === 0 || capitaisEscolhidos.has(item.capital)) &&
          (entregasEscolhidas.size === 0 ||
            item.entrega.some((forma) => entregasEscolhidas.has(forma))) &&
          (!soComFontes || item.fontesLigadas.length > 0),
      ),
    [dossiers, indice, consulta, setoresEscolhidos, capitaisEscolhidos, entregasEscolhidas, soComFontes],
  );

  const nFiltros =
    (consulta.length > 0 ? 1 : 0) +
    setoresEscolhidos.size +
    capitaisEscolhidos.size +
    entregasEscolhidas.size +
    (soComFontes ? 1 : 0);

  const limpar = () => {
    setProcura("");
    setSetores(new Set<string>());
    setCapitais(new Set<string>());
    setEntregas(new Set<string>());
    setSoComFontes(false);
  };

  const alternar =
    (aplicar: (proximo: ReadonlySet<string>) => void, atual: ReadonlySet<string>) => (id: string) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      aplicar(proximo);
    };

  const contar = (predicado: (item: DossierDeMercado) => boolean) =>
    dossiers.filter(predicado).length;

  const comFontes = contar((item) => item.fontesLigadas.length > 0);

  return (
    <div data-lista="mercado">
      {/* ── Procura ──────────────────────────────────────────────── */}
      <label htmlFor={`${idBase}-procura`} className="sr-only">
        Procurar entre os dossiers de mercado
      </label>
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
        <input
          id={`${idBase}-procura`}
          type="search"
          value={procura}
          onChange={(evento) => setProcura(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Escape" && procura) {
              evento.preventDefault();
              setProcura("");
            }
          }}
          placeholder={`Procurar entre ${dossiers.length} dossiers…`}
          aria-describedby={`${idBase}-contagem`}
          className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-10 text-[12px] text-ink placeholder:text-stone-400 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
        />
        {procura ? (
          <button
            type="button"
            onClick={() => setProcura("")}
            aria-label="Limpar a procura nos dossiers"
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-stone-800"
          >
            <Close size={14} />
          </button>
        ) : null}
      </div>

      {/* ── Porta dos filtros + o atalho que mais se usa ─────────── */}
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar os dossiers">
        <button
          type="button"
          onClick={() => setPainelAberto((anterior) => !anterior)}
          aria-expanded={painelAberto}
          aria-controls={`${idBase}-filtros`}
          className={chipFiltro(false)}
        >
          <Filter size={13} />
          Filtros
          {nFiltros > 0 ? (
            <span className="rounded-full bg-brand px-1.5 text-[10px] font-bold tabular-nums text-white">
              {nFiltros}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          aria-pressed={soComFontes}
          onClick={() => setSoComFontes((anterior) => !anterior)}
          className={chipFiltro(soComFontes)}
        >
          Só com fontes oficiais ligadas{" "}
          <span className="font-normal tabular-nums opacity-60">{comFontes}</span>
        </button>
      </div>

      <div
        id={`${idBase}-filtros`}
        hidden={!painelAberto}
        className="mt-2 space-y-3 rounded-2xl border border-stone-100 bg-cream/70 p-3 dark:border-stone-800 dark:bg-stone-950/40"
      >
        {(
          [
            ["Setor", setores, setoresEscolhidos, alternar(setSetores, setoresEscolhidos),
              (grupo: GrupoDeFiltro) => contar((item) => item.setor === grupo.id)],
            ["Capital para arrancar", capitais, capitaisEscolhidos, alternar(setCapitais, capitaisEscolhidos),
              (grupo: GrupoDeFiltro) => contar((item) => item.capital === grupo.id)],
            ["Forma de entrega", entregas, entregasEscolhidas, alternar(setEntregas, entregasEscolhidas),
              (grupo: GrupoDeFiltro) => contar((item) => item.entrega.includes(grupo.id))],
          ] as const
        ).map(([rotulo, grupos, escolhidos, onAlternar, contagem]) => (
          <div key={rotulo}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">
              {rotulo} — podes somar mais do que um
            </p>
            <div className="flex flex-wrap gap-1.5">
              {grupos.map((grupo) => (
                <button
                  key={grupo.id}
                  type="button"
                  aria-pressed={escolhidos.has(grupo.id)}
                  onClick={() => onAlternar(grupo.id)}
                  className={chipFiltro(escolhidos.has(grupo.id))}
                >
                  {grupo.rotulo}{" "}
                  <span className="font-normal tabular-nums opacity-60">{contagem(grupo)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Contagem anunciada + limpar ──────────────────────────── */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p id={`${idBase}-contagem`} aria-live="polite" className="text-[11px] text-stone-500">
          {nFiltros === 0
            ? `${dossiers.length} dossiers, em ${setores.length} setores`
            : `${encontrados.length} de ${dossiers.length} ${encontrados.length === 1 ? "dossier" : "dossiers"}`}
        </p>
        {nFiltros > 0 ? (
          <button
            type="button"
            onClick={limpar}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-xl px-2 text-[11px] font-semibold text-brand-dark transition-colors hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-brand-mint dark:hover:bg-brand/10"
          >
            <Close size={12} /> Limpar filtros
          </button>
        ) : null}
      </div>

      {/* ── Os dossiers, por setor ───────────────────────────────── */}
      <div className="mt-3 space-y-3">
        {setores.map((setor) => {
          const deste = encontrados.filter((item) => item.setor === setor.id);
          if (deste.length === 0) return null;
          return (
            <details
              key={setor.id}
              open
              className="group rounded-3xl border border-stone-100 bg-white p-3 shadow-card dark:border-stone-800 dark:bg-stone-900"
            >
              <summary className="flex min-h-[40px] cursor-pointer list-none items-center justify-between gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <h3 className="font-display text-[15px] font-semibold text-ink">{setor.rotulo}</h3>
                <span className="flex items-center gap-1.5">
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    {deste.length}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    aria-hidden="true"
                    className="text-stone-400 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <div className="mt-2 grid gap-2 lg:grid-cols-2">
                {deste.map((dossier) => (
                  <Ficha key={dossier.id} dossier={dossier} />
                ))}
              </div>
            </details>
          );
        })}

        {encontrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 px-3 py-5 text-center dark:border-stone-700">
            <p className="text-[12px] font-semibold text-stone-700 dark:text-stone-200">
              Nenhum dossier corresponde a esta procura.
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[11px] leading-snug text-stone-500">
              São {dossiers.length} hipóteses curadas, não o universo de respostas — o motor compõe
              muitas mais a partir do que sabes fazer. Limpa os filtros, ou responde ao configurador.
            </p>
            <button
              type="button"
              onClick={limpar}
              className="mt-2.5 inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Limpar filtros <Close size={12} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
