"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A LISTA DE CLIENTES — tabela no ecrã grande, cartões no telemóvel
//  ---------------------------------------------------------------------
//  Era um acordeão de cartões sem procura e sem ordem. Com dez clientes
//  passava; com oitenta deixava de se conseguir encontrar ninguém.
//
//  A tabela NÃO desce para o telemóvel. Sete colunas a 360px não se leem, e
//  as soluções habituais — deixar rolar na horizontal, encolher a letra —
//  trocam «ilegível» por «ilegível e desconfortável». No telemóvel a mesma
//  informação vem em cartões, com a mesma ordem e a mesma procura.
//
//  A ordenação é por cabeçalho clicável, com `aria-sort` — que é o que faz
//  um leitor de ecrã anunciar «ordenado por nome, ascendente» em vez de
//  ler uma seta que não significa nada para quem não a vê.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  filtrarPorTexto, ordenarClientes,
  type ColunaCliente, type ResumoCliente, type Sentido,
} from "@/lib/contabilistas/resumo";
import { ROTULO_VINCULO } from "@/lib/contabilistas/vinculo";
import type { EstadoVinculo } from "@/lib/contabilistas/tipos";
import Badge from "@/components/ui/Badge";
import Separadores, { PainelDoSeparador } from "@/components/contabilistas/Separadores";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import { usarPainel } from "@/components/contabilistas/usarPainel";
import { ChevronDown, ChevronUp, Search, User } from "@/components/ui/Icons";

type Separador = "todos" | "ativo" | "pendente" | "pausado";

const SEPARADORES: { id: Separador; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "ativo", rotulo: "Ativos" },
  { id: "pendente", rotulo: "Pendentes" },
  { id: "pausado", rotulo: "Em pausa" },
];

const COLUNAS: { id: ColunaCliente; rotulo: string; classe?: string }[] = [
  { id: "nome", rotulo: "Cliente" },
  { id: "desde", rotulo: "Desde", classe: "hidden lg:table-cell" },
  { id: "ultima", rotulo: "Última consulta" },
  { id: "proxima", rotulo: "Próxima", classe: "hidden xl:table-cell" },
  { id: "envios", rotulo: "Envios" },
];

export default function TabelaClientes({ clientes }: { clientes: readonly ResumoCliente[] }) {
  const painel = usarPainel();
  const [separador, setSeparador] = useState<Separador>("todos");
  const [procura, setProcura] = useState("");
  const [coluna, setColuna] = useState<ColunaCliente>("nome");
  const [sentido, setSentido] = useState<Sentido>("asc");

  const contagens = useMemo(() => {
    const c: Record<Separador, number> = { todos: 0, ativo: 0, pendente: 0, pausado: 0 };
    for (const r of clientes) {
      if (r.vinculo.estado === "terminado") continue;
      c.todos++;
      if (r.vinculo.estado === "ativo") c.ativo++;
      if (r.vinculo.estado === "pendente" || r.vinculo.estado === "convidado") c.pendente++;
      if (r.vinculo.estado === "pausado") c.pausado++;
    }
    return c;
  }, [clientes]);

  const visiveis = useMemo(() => {
    const vivos = clientes.filter((r) => r.vinculo.estado !== "terminado");
    const doSeparador =
      separador === "todos"
        ? vivos
        : separador === "pendente"
          ? vivos.filter((r) => r.vinculo.estado === "pendente" || r.vinculo.estado === "convidado")
          : vivos.filter((r) => r.vinculo.estado === separador);
    return ordenarClientes(filtrarPorTexto(doSeparador, procura), coluna, sentido);
  }, [clientes, separador, procura, coluna, sentido]);

  function ordenarPor(id: ColunaCliente) {
    if (id === coluna) {
      setSentido((s) => (s === "asc" ? "desc" : "asc"));
    } else {
      setColuna(id);
      // Nomes começam de A a Z; datas e contagens começam pelo mais recente
      // e pelo maior, que é o que se procura quando se clica nelas.
      setSentido(id === "nome" ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-4">
      {/* Separadores e procura */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Separadores
          itens={SEPARADORES.map((s) => ({
            id: s.id, rotulo: s.rotulo, contagem: contagens[s.id],
          }))}
          ativo={separador}
          onEscolher={setSeparador}
          etiqueta="Filtrar clientes"
          painelId="clientes-lista"
        />

        <div className="relative sm:w-64">
          <label htmlFor="procurar-cliente" className="sr-only">Procurar cliente</label>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden />
          <input
            id="procurar-cliente"
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
            placeholder="Nome ou email"
            className="min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white py-2 pl-10 pr-3.5 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
      </div>

      <p role="status" className="text-sm text-stone-500">
        {visiveis.length === 0
          ? "Nenhum cliente com estes filtros."
          : `${visiveis.length} ${visiveis.length === 1 ? "cliente" : "clientes"}.`}
      </p>

      {visiveis.length === 0 ? (
        <EstadoVazio
          Icon={User}
          titulo={contagens.todos === 0 ? "Ainda não tens clientes" : "Sem resultados"}
          descricao={
            contagens.todos === 0
              ? "Partilha o teu perfil público. Quem se ligar a ti aparece aqui para aceitares."
              : "Tenta outro termo, ou volta a «Todos»."
          }
        />
      ) : (
        <>
          {/* ── Ecrã grande: tabela ─────────────────────────────── */}
          <PainelDoSeparador id="clientes-lista">
        <div className="hidden overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-card md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Clientes, ordenados por {COLUNAS.find((c) => c.id === coluna)?.rotulo},
                {sentido === "asc" ? " ascendente" : " descendente"}
              </caption>
              <thead>
                <tr className="border-b border-stone-200 bg-cream/60">
                  {COLUNAS.map((c) => {
                    const ativa = coluna === c.id;
                    return (
                      <th
                        key={c.id}
                        scope="col"
                        aria-sort={ativa ? (sentido === "asc" ? "ascending" : "descending") : "none"}
                        className={`px-4 py-3 text-left ${c.classe ?? ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => ordenarPor(c.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-800"
                        >
                          {c.rotulo}
                          <span aria-hidden className={ativa ? "text-brand" : "text-stone-300"}>
                            {ativa && sentido === "desc"
                              ? <ChevronDown size={13} />
                              : <ChevronUp size={13} />}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  <th scope="col" className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((r) => (
                  <tr key={r.vinculo.id} className="border-b border-stone-100 last:border-0 hover:bg-cream/50">
                    <td className="px-4 py-3">
                      <Link
                        href={painel.href(`/contabilista/clientes/${r.vinculo.id}`)}
                        className="flex items-center gap-3 font-semibold text-stone-800 hover:text-brand-dark"
                      >
                        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-xs font-semibold text-brand-dark">
                          {monograma(r.tratamento)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate">{r.tratamento}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-stone-500 lg:table-cell">{mes(r.vinculo.criadoEm)}</td>
                    <td className="px-4 py-3 text-stone-500">{dataOuTraco(r.ultima)}</td>
                    <td className="hidden px-4 py-3 text-stone-500 xl:table-cell">{dataOuTraco(r.proxima)}</td>
                    <td className="px-4 py-3">
                      <span className="tabular-nums text-stone-700">{r.partilhas}</span>
                      {r.partilhasPorLer > 0 && (
                        <span className="ml-2 rounded-lg bg-brand-light px-1.5 py-0.5 text-xs font-semibold tabular-nums text-brand-dark">
                          {r.partilhasPorLer} novo{r.partilhasPorLer > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone={tom(r.vinculo.estado)}>{ROTULO_VINCULO[r.vinculo.estado]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Telemóvel: cartões ──────────────────────────────── */}
          <ul className="space-y-2.5 md:hidden">
            {visiveis.map((r) => (
              <li key={r.vinculo.id}>
                <Link
                  href={painel.href(`/contabilista/clientes/${r.vinculo.id}`)}
                  className="flex items-center gap-3 rounded-4xl border border-stone-200 bg-white p-4 shadow-card transition-shadow hover:shadow-lift"
                >
                  <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-sm font-semibold text-brand-dark">
                    {monograma(r.tratamento)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-stone-800">{r.tratamento}</span>
                      <Badge tone={tom(r.vinculo.estado)}>{ROTULO_VINCULO[r.vinculo.estado]}</Badge>
                    </span>
                    <span className="mt-1 block truncate text-sm text-stone-500">
                      {r.ultima ? `Última: ${dataOuTraco(r.ultima)}` : "Sem consultas"}
                      {" · "}
                      {r.partilhas} {r.partilhas === 1 ? "envio" : "envios"}
                      {r.partilhasPorLer > 0 && (
                        <span className="ml-1.5 font-semibold text-brand-dark">
                          {r.partilhasPorLer} por ler
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          </PainelDoSeparador>
        </>
      )}
    </div>
  );
}

function tom(e: EstadoVinculo): "brand" | "alert" | "neutral" {
  if (e === "ativo") return "brand";
  if (e === "pendente" || e === "convidado") return "alert";
  return "neutral";
}

function mes(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { month: "short", year: "numeric" }).format(new Date(iso));
}

/** Um traço, e não «—» nem «nunca»: a informação não existe, e é só isso. */
function dataOuTraco(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

function monograma(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
