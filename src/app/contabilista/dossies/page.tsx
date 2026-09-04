"use client";

// ═══════════════════════════════════════════════════════════════════════
//  DOSSIÊS DE GUIA RECEBIDOS (D1)
//  ---------------------------------------------------------------------
//  Um dossiê não é uma simulação, e por isso não vive na página de
//  partilhas: ali o conteúdo é um punhado de campos e uma tabela de
//  chave/valor resolve. Aqui é o CASO de alguém — o que o guia responde, o
//  enquadramento que a pessoa confirmou, os elementos que já tem, os
//  pontos que exigem julgamento e a base legal — e o que se lhe faz é
//  selecionar, extrair e pedir.
//
//  A consola é a mesma dos três destinos. O que muda é quem escreve o
//  pedido: aqui há sessão, e o `contabilista_id` fica preenchido.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import ConsolaDossie from "@/components/guias/dossie/ConsolaDossie";
import { listarPartilhas, marcarPartilhaVista } from "@/lib/contabilistas/fonte/dados";
import type { Partilha } from "@/lib/contabilistas/tipos";
import { criarPedidoDeElementos } from "@/lib/contabilistas/fonte/dossies";
import type { DossieDeGuia, PedidoDeElementos } from "@/lib/guias/dossie";
import Badge from "@/components/ui/Badge";
import { BookOpen, ChevronDown, ChevronUp, Warning } from "@/components/ui/Icons";

interface DossieRecebido {
  partilha: Partilha;
  dossie: DossieDeGuia;
}

/** Uma partilha só entra aqui se o conteúdo tiver mesmo a forma de um dossiê. */
function comoDossie(p: Partilha): DossieRecebido | null {
  if (p.tipo !== "dossie_guia") return null;
  const c = p.conteudo as Partial<DossieDeGuia>;
  if (!c || c.versao !== 1 || !c.guia || !Array.isArray(c.seccoes) || !c.fixado) return null;
  return { partilha: p, dossie: c as DossieDeGuia };
}

export default function DossiesRecebidos() {
  const { ficha, aCarregar } = usarFicha();
  const [lista, setLista] = useState<DossieRecebido[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (id: string) => {
    try {
      const todas = await listarPartilhas({ contabilistaId: id });
      setLista(todas.map(comoDossie).filter((d): d is DossieRecebido => d !== null));
      setErro(null);
    } catch (e) {
      setErro((e as Error).message);
    }
  }, []);

  useEffect(() => { if (ficha) void carregar(ficha.userId); }, [ficha, carregar]);

  async function abrir(d: DossieRecebido) {
    if (aberto === d.partilha.id) { setAberto(null); return; }
    setAberto(d.partilha.id);
    if (d.partilha.estado === "enviada") {
      try {
        await marcarPartilhaVista(d.partilha.id);
        setLista((l) =>
          l.map((x) =>
            x.partilha.id === d.partilha.id
              ? { ...x, partilha: { ...x.partilha, estado: "vista" } }
              : x,
          ),
        );
      } catch {
        // Marcar como vista é conveniência. O que não se pode é pintar
        // «vista» sem ter gravado — o cliente lê esse estado do lado dele.
      }
    }
  }

  if (aCarregar) return <Esqueleto />;
  if (!ficha) return null;

  return (
    <div className="space-y-6">
      <CabecalhoPainel
        titulo="Dossiês de guia"
        descricao="Casos que os teus clientes prepararam a partir de um guia. Cada um traz a versão do guia que a pessoa leu, a base legal citada e o que ela já respondeu — e daqui podes pedir-lhe os elementos que faltam."
      />

      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      {lista.length === 0 ? (
        <EstadoVazio
          Icon={BookOpen}
          titulo="Nenhum dossiê recebido"
          descricao="Quando um cliente preparar um dossiê a partir de um guia do site e to enviar, ele aparece aqui — com o caso em dez linhas logo à cabeça."
        />
      ) : (
        <ul className="space-y-3">
          {lista.map((d) => {
            const expandido = aberto === d.partilha.id;
            return (
              <li
                key={d.partilha.id}
                className="rounded-4xl border border-stone-200 bg-white shadow-card"
              >
                <button
                  type="button"
                  onClick={() => void abrir(d)}
                  aria-expanded={expandido}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-stone-800">
                      {d.dossie.guia.titulo}
                    </span>
                    <span className="mt-0.5 block text-sm text-stone-500">
                      versão de {d.dossie.fixado.revistoEm} ·{" "}
                      {d.dossie.seccoes.reduce((n, s) => n + s.itens.length, 0)} itens
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {d.partilha.estado === "enviada" && <Badge tone="brand">Novo</Badge>}
                    {expandido ? (
                      <ChevronUp size={18} className="text-stone-400" aria-hidden />
                    ) : (
                      <ChevronDown size={18} className="text-stone-400" aria-hidden />
                    )}
                  </span>
                </button>

                {expandido && (
                  <div className="border-t border-stone-100 p-4 sm:p-5">
                    <ConsolaDossie
                      dossie={d.dossie}
                      origem={{
                        referencia: `PARTILHA-${d.partilha.id.slice(0, 8)}`,
                        enviarPedido: (pedido: PedidoDeElementos) =>
                          criarPedidoDeElementos({
                            origem: "partilha",
                            origemId: d.partilha.id,
                            pedido,
                            guiaSlug: d.dossie.guia.slug,
                          }),
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
        <div className="h-9 w-48 animate-pulse rounded-xl bg-stone-100" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-4xl bg-stone-100" />
        ))}
      </div>
    </div>
  );
}
