"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import type { ItemDePedido } from "@/lib/guias/dossie/tipos";
import { Check, LayoutGrid } from "@/components/ui/Icons";

// ─────────────────────────────────────────────────────────────────────────
//  Checklist do Guia (ponto 6.3/6 da auditoria): documentos, decisões e
//  dependências a preparar antes de agir.
//
//  O progresso fica em localStorage por Guia — sem conta, sem sincronização
//  e sem bloqueio: é uma ajuda, não uma funcionalidade paga.
//
//  ⚠️ A VOLTA (§8.4 do motor de dossiê). Quando o contabilista pede
//  elementos a partir do dossiê deste guia, os itens pedidos aparecem AQUI,
//  na linha certa, com o prazo. É a continuidade que fecha o ciclo: a
//  pessoa volta ao mesmo sítio onde marcou os itens e encontra lá o
//  trabalho, em vez de o ir procurar a um painel que não sabe que existe.
//
//  Sem conta — que é a maior parte de quem lê isto — o componente comporta-se
//  exatamente como antes: não faz pedido nenhum e não muda um pixel.
// ─────────────────────────────────────────────────────────────────────────

const chaveDe = (slug: string) => `recibocerto:guias:checklist:${slug}`;

const dataCurta = (iso: string) => {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return dia && mes && ano ? `${dia}/${mes}` : iso;
};

export default function ChecklistGuia({ slug, itens }: { slug: string; itens: string[] }) {
  const [feitos, setFeitos] = useState<number[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const [pedidos, setPedidos] = useState<Map<number, ItemDePedido>>(new Map());
  const { user, disponivel } = useAuth();

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chaveDe(slug));
      if (bruto) {
        const guardado = JSON.parse(bruto) as unknown;
        if (Array.isArray(guardado)) setFeitos(guardado.filter((n): n is number => typeof n === "number"));
      }
    } catch {
      /* localStorage indisponível — a checklist funciona na mesma */
    }
    setHidratado(true);
  }, [slug]);

  // Importado dinamicamente: quem não tem conta não paga o custo de uma
  // camada de dados que nunca vai usar.
  useEffect(() => {
    if (!user || !disponivel) return;
    let vivo = true;
    void (async () => {
      try {
        const [{ meusPedidos }, { pedidosPorPosicao }] = await Promise.all([
          import("@/lib/guias/dossie/dados"),
          import("@/lib/guias/dossie/pedido"),
        ]);
        const abertos = (await meusPedidos(slug)).filter((p) => p.estado !== "fechado");
        if (vivo) setPedidos(pedidosPorPosicao(abertos));
      } catch {
        // Uma falha de rede não pode partir a checklist. Fica como estava.
      }
    })();
    return () => { vivo = false; };
  }, [slug, user, disponivel]);

  const alternar = (indice: number) => {
    setFeitos((atual) => {
      const proximo = atual.includes(indice) ? atual.filter((i) => i !== indice) : [...atual, indice];
      try {
        localStorage.setItem(chaveDe(slug), JSON.stringify(proximo));
      } catch {
        /* ignora */
      }
      return proximo;
    });
  };

  if (itens.length === 0) return null;
  const concluidos = feitos.filter((i) => i < itens.length).length;

  return (
    <section aria-labelledby={`checklist-${slug}`} className="mt-10">
      <div className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id={`checklist-${slug}`} className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <LayoutGrid size={16} className="text-brand" />
            O que preparar
          </h2>
          {/* Só depois de hidratar, para o servidor e o cliente coincidirem. */}
          {hidratado && (
            <span className="text-xs tabular-nums text-stone-400">
              {concluidos} de {itens.length}
            </span>
          )}
        </div>

        <ul className="space-y-1.5">
          {itens.map((item, indice) => {
            const feito = feitos.includes(indice);
            const pedido = pedidos.get(indice);
            return (
              <li key={item}>
                <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50">
                  <input
                    type="checkbox"
                    checked={feito}
                    onChange={() => alternar(indice)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                      feito ? "border-brand bg-brand text-white" : "border-stone-300 dark:border-stone-600"
                    }`}
                  >
                    {feito && <Check size={12} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm leading-relaxed transition-colors ${
                        feito ? "text-stone-400 line-through" : "text-stone-700 dark:text-stone-300"
                      }`}
                    >
                      {item}
                    </span>
                    {pedido && pedido.estado === "pedido" && (
                      <span className="texto-mini mt-1 block font-medium text-brand-dark dark:text-brand">
                        Pedido pelo teu contabilista
                        {pedido.prazo ? ` · até ${dataCurta(pedido.prazo)}` : ""}
                      </span>
                    )}
                    {pedido && pedido.estado === "entregue" && (
                      <span className="texto-mini mt-1 block text-stone-400">
                        Já entregaste isto ao teu contabilista.
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
