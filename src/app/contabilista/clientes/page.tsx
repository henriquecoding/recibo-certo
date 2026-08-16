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
import Button from "@/components/ui/Button";
import { resumoDeClientes } from "@/lib/contabilistas/fonte/dados";
import { tratamentoDoCliente } from "@/lib/contabilistas/tipos";
import type { ResumoCliente } from "@/lib/contabilistas/resumo";
import { Lock, Warning } from "@/components/ui/Icons";

export default function ClientesPage() {
  const { ficha, aCarregar } = usarFicha();
  const [clientes, setClientes] = useState<ResumoCliente[]>([]);
  const [aLer, setALer] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * Uma leitura, já agregada pelo servidor.
   *
   * Isto lia três listas e derivava os totais em JavaScript — e como
   * `listarAgendamentos` ordena por `inicio` ASCENDENTE com `limit(300)`,
   * quem tivesse mais consultas do que isso via as MAIS ANTIGAS: «última
   * consulta» e «próxima consulta» ficavam errados sem aviso nenhum, e são
   * as colunas por que a tabela ordena.
   */
  const carregar = useCallback(async (contabilistaId: string) => {
    setALer(true);
    try {
      const linhas = await resumoDeClientes(contabilistaId);
      setClientes(
        linhas.map((l) => ({ ...l, tratamento: tratamentoDoCliente(l.vinculo) })),
      );
      setErro(null);
    } catch (e) {
      setErro((e as Error).message || "Não foi possível carregar os clientes.");
    } finally {
      setALer(false);
    }
  }, []);

  useEffect(() => { if (ficha) void carregar(ficha.userId); }, [ficha, carregar]);

  if (aCarregar || aLer) return <EsqueletoPainel />;
  if (!ficha) return null;

  if (erro) {
    return (
      <div className="space-y-6">
        <CabecalhoPainel titulo="Clientes" />
        <div role="alert" className="rounded-4xl border border-clay-border bg-clay-bg/40 px-5 py-10 text-center">
          <Warning size={22} className="mx-auto text-clay-text" aria-hidden />
          <p className="mt-3 font-semibold text-clay-text">Não foi possível carregar os clientes</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-600">
            Uma lista vazia diria que não tens clientes. Não é isso que sabemos — só
            não conseguimos ler. {erro}
          </p>
          <div className="mt-5 flex justify-center">
            <Button size="sm" variant="secondary" onClick={() => void carregar(ficha.userId)}>
              Tentar outra vez
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
