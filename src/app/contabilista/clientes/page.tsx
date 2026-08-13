"use client";

// A lista de clientes.
//
// Deixou de ser um acordeão: a tabela trata da procura, da ordenação e dos
// separadores (`TabelaClientes`), e cada linha leva à ficha do cliente. Esta
// página passa a fazer só o que é dela — carregar os dados e derivar o
// resumo de cada pessoa.
//
// ⚠️ Continua a valer a fronteira da migração 038: nada aqui lê as tabelas
// fiscais de ninguém. Os números por linha vêm de consultas, envios e cartão
// — o que passou por esta plataforma, e mais nada.

import { useCallback, useEffect, useState } from "react";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import TabelaClientes from "@/components/contabilistas/TabelaClientes";
import { useAvisos } from "@/components/ui/Avisos";
import { getSupabase } from "@/lib/supabase/client";
import { listarAgendamentos, listarPartilhas, meusClientes } from "@/lib/contabilistas/dados";
import { resumirClientes, type CartaoDoCliente, type ResumoCliente } from "@/lib/contabilistas/resumo";
import { Lock } from "@/components/ui/Icons";

interface CartaoLinha {
  cliente_id: string; carimbos: number; meta: number;
  desconto_pct: number; preco_base_cents: number;
}

export default function ClientesPage() {
  const { ficha, aCarregar } = usarFicha();
  const avisos = useAvisos();
  const [clientes, setClientes] = useState<ResumoCliente[]>([]);
  const [aLer, setALer] = useState(true);

  const carregar = useCallback(async (contabilistaId: string) => {
    setALer(true);
    try {
      const [vinculos, agendamentos, partilhas] = await Promise.all([
        meusClientes(contabilistaId),
        listarAgendamentos({ contabilistaId }),
        listarPartilhas({ contabilistaId }),
      ]);

      const { data } = await getSupabase()
        .from("fidelidade_cartoes")
        .select("cliente_id, carimbos, meta, desconto_pct, preco_base_cents")
        .eq("contabilista_id", contabilistaId)
        .eq("completo", false);

      const cartoes: Record<string, CartaoDoCliente> = {};
      for (const l of (data ?? []) as unknown as CartaoLinha[]) {
        cartoes[l.cliente_id] = {
          carimbos: l.carimbos,
          meta: l.meta,
          descontoPct: l.desconto_pct,
          precoBaseCents: l.preco_base_cents,
        };
      }

      setClientes(resumirClientes({ vinculos, agendamentos, partilhas, cartoes }));
    } catch (e) {
      avisos.erro((e as Error).message);
    } finally {
      setALer(false);
    }
  }, [avisos]);

  useEffect(() => { if (ficha) void carregar(ficha.userId); }, [ficha, carregar]);

  if (aCarregar || aLer) return <EsqueletoPainel />;
  if (!ficha) return null;

  const porResponder = clientes.filter(
    (r) => r.vinculo.estado === "pendente" || r.vinculo.estado === "convidado"
  ).length;

  return (
    <div className="space-y-6">
      <CabecalhoPainel
        titulo="Clientes"
        descricao={
          porResponder > 0
            ? `${porResponder} ${porResponder === 1 ? "pedido à espera de resposta" : "pedidos à espera de resposta"}.`
            : "Cada linha abre a ficha da pessoa."
        }
      />

      <p className="flex items-start gap-2.5 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-600">
        <Lock size={16} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
        Vês o que cada cliente te enviou, e mais nada. Ter um cliente ligado não te dá
        acesso aos recibos, cenários ou simulações que essa pessoa guardou.
      </p>

      <TabelaClientes clientes={clientes} />
    </div>
  );
}
