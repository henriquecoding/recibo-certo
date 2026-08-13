"use client";

// Clientes — aceitar pedidos, ver o cartão de cada um e o que partilhou.
//
// ⚠️ Este ecrã NÃO mostra os dados fiscais dos clientes. Mostra o que cada um
// enviou de propósito. A migração 038 fechou o acesso ao conteúdo fiscal
// alheio até para a administração, e um contabilista não herda o que nem ela
// tem — ver `docs/PLATAFORMA-CONTABILISTAS.md`.

import { useCallback, useEffect, useState } from "react";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import CartaoFidelidade from "@/components/contabilistas/CartaoFidelidade";
import {
  decidirVinculo, listarAgendamentos, listarPartilhas, meusClientes,
} from "@/lib/contabilistas/dados";
import { getSupabase } from "@/lib/supabase/client";
import type { Agendamento, Partilha, Vinculo } from "@/lib/contabilistas/tipos";
import { ROTULO_VINCULO, ROTULO_PARTILHA } from "@/lib/contabilistas/vinculo";
import { tratamentoDoCliente } from "@/lib/contabilistas/tipos";
import { diaLocal, rotularDia } from "@/lib/contabilistas/agenda";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar, type PedidoConfirmacao } from "@/components/ui/Confirmar";
import { Check, Close, User, Warning, ChevronDown, ChevronUp, Lock, Mail } from "@/components/ui/Icons";

interface CartaoLinha {
  cliente_id: string; carimbos: number; meta: number;
  desconto_pct: number; preco_base_cents: number;
}

type EstadoDecidido = "ativo" | "pausado" | "terminado";

/**
 * Aceitar e reativar abrem portas — não se pergunta nada.
 *
 * Recusar, pausar e terminar fecham-nas, e a diferença entre as três não é
 * de tom: é de consequência. Terminar corta o acesso a tudo o que a pessoa
 * já tinha enviado, e isso tem de estar escrito antes do clique, não
 * descoberto depois.
 */
function perguntaVinculo(de: Vinculo["estado"], para: EstadoDecidido): PedidoConfirmacao | null {
  if (para === "terminado" && de === "pendente") {
    return {
      titulo: "Recusar este pedido?",
      descricao: "A pessoa deixa de aparecer na tua lista e pode voltar a pedir mais tarde.",
      confirmar: "Recusar pedido",
      tom: "perigo",
    };
  }
  if (para === "terminado") {
    return {
      titulo: "Terminar o acompanhamento?",
      descricao: "É a decisão mais definitiva deste ecrã.",
      consequencias: [
        "Deixas de conseguir abrir o que este cliente te enviou.",
        "As consultas já realizadas e o cartão ficam no histórico.",
        "A pessoa pode voltar a pedir para ser tua cliente.",
      ],
      confirmar: "Terminar acompanhamento",
      tom: "perigo",
    };
  }
  if (para === "pausado") {
    return {
      titulo: "Pausar este acompanhamento?",
      descricao: "Continuas a ver o que te enviou, mas o cliente não marca consultas novas enquanto estiver em pausa.",
      confirmar: "Pausar",
    };
  }
  return null;
}

const FEITO_VINCULO: Record<EstadoDecidido, string> = {
  ativo: "Cliente ativo.",
  pausado: "Acompanhamento em pausa.",
  terminado: "Acompanhamento terminado.",
};

export default function ClientesPage() {
  const { ficha, aCarregar } = usarFicha();
  const avisos = useAvisos();
  const confirmar = useConfirmar();
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [cartoes, setCartoes] = useState<Record<string, CartaoLinha>>({});
  const [partilhas, setPartilhas] = useState<Partilha[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async (id: string) => {
    try {
      const [v, p, a] = await Promise.all([
        meusClientes(id),
        listarPartilhas({ contabilistaId: id }),
        listarAgendamentos({ contabilistaId: id }),
      ]);
      setVinculos(v); setPartilhas(p); setAgendamentos(a);

      const { data } = await getSupabase()
        .from("fidelidade_cartoes")
        .select("cliente_id, carimbos, meta, desconto_pct, preco_base_cents")
        .eq("contabilista_id", id)
        .eq("completo", false);
      const mapa: Record<string, CartaoLinha> = {};
      for (const l of (data ?? []) as unknown as CartaoLinha[]) mapa[l.cliente_id] = l;
      setCartoes(mapa);
    } catch (e) { setErro((e as Error).message); }
  }, []);

  useEffect(() => { if (ficha) void carregar(ficha.userId); }, [ficha, carregar]);

  async function decidir(v: Vinculo, estado: EstadoDecidido) {
    if (!ficha) return;

    const pergunta = perguntaVinculo(v.estado, estado);
    if (pergunta && !(await confirmar(pergunta))) return;

    setOcupado(v.id); setErro(null);
    const { erro: e } = await decidirVinculo(v.id, estado);
    if (e) avisos.erro(e);
    else {
      avisos.sucesso(
        v.estado === "pendente" && estado === "ativo" ? "Pedido aceite." : FEITO_VINCULO[estado],
      );
      await carregar(ficha.userId);
    }
    setOcupado(null);
  }

  if (aCarregar) return <EsqueletoPainel forma="lista" />;
  if (!ficha) return null;

  const pendentes = vinculos.filter((v) => v.estado === "pendente");
  const ativos = vinculos.filter((v) => v.estado === "ativo" || v.estado === "pausado");
  const antigos = vinculos.filter((v) => v.estado === "terminado");

  return (
    <div className="space-y-6">
      <CabecalhoPainel
        titulo="Clientes"
        descricao="Quem te pediu para ser cliente, quem já é, e o que cada um te enviou."
      />

      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      <p className="flex items-start gap-2.5 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-600">
        <Lock size={16} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
        Vês o que cada cliente te enviou, e mais nada. Ligar-te a alguém não dá
        acesso aos recibos, cenários ou simulações que essa pessoa guardou.
      </p>

      {pendentes.length > 0 && (
        <section aria-labelledby="pendentes-titulo">
          <h2 id="pendentes-titulo" className="font-display text-xl text-ink">
            Pedidos por responder ({pendentes.length})
          </h2>
          <ul className="mt-3 space-y-3">
            {pendentes.map((v) => (
              <li key={v.id} className="rounded-4xl border border-stone-200 bg-white p-4 shadow-card sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-stone-800">Novo pedido</p>
                  <Badge tone="alert">{ROTULO_VINCULO[v.estado]}</Badge>
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  Recebido a {new Intl.DateTimeFormat("pt-PT", { dateStyle: "long" }).format(new Date(v.criadoEm))}
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <Button size="sm" disabled={ocupado === v.id} onClick={() => decidir(v, "ativo")}>
                    <Check size={15} aria-hidden /> Aceitar
                  </Button>
                  <Button size="sm" variant="ghost" disabled={ocupado === v.id} onClick={() => decidir(v, "terminado")}>
                    <Close size={15} aria-hidden /> Recusar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="ativos-titulo">
        <h2 id="ativos-titulo" className="font-display text-xl text-ink">
          Os teus clientes ({ativos.length})
        </h2>
        {ativos.length === 0 ? (
          <div className="mt-3">
            <EstadoVazio
              Icon={User}
              titulo="Ainda não tens clientes"
              descricao="Partilha o teu perfil público. Quem se ligar a ti aparece aqui para aceitares."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {ativos.map((v) => {
              const expandido = aberto === v.id;
              const cartao = cartoes[v.clienteId];
              const dele = partilhas.filter((p) => p.clienteId === v.clienteId);
              const consultas = agendamentos.filter(
                (a) => a.clienteId === v.clienteId && a.estado === "realizada"
              );
              return (
                <li key={v.id} className="rounded-4xl border border-stone-200 bg-white shadow-card">
                  <button
                    type="button"
                    onClick={() => setAberto(expandido ? null : v.id)}
                    aria-expanded={expandido}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {/* Monograma, não fotografia: não recolhemos fotografias
                          de ninguém, e passar a recolhê-las por estética seria
                          uma decisão de dados pessoais sem justificação. */}
                      <span
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-sm font-semibold text-brand-dark"
                      >
                        {monograma(tratamentoDoCliente(v))}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-stone-800">
                          {tratamentoDoCliente(v)}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-stone-500">
                          Desde {new Intl.DateTimeFormat("pt-PT", { month: "short", year: "numeric" }).format(new Date(v.criadoEm))}
                          {" · "}
                          {consultas.length} {consultas.length === 1 ? "consulta" : "consultas"}
                          {" · "}
                          {dele.length} {dele.length === 1 ? "partilha" : "partilhas"}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge tone={v.estado === "ativo" ? "brand" : "neutral"}>{ROTULO_VINCULO[v.estado]}</Badge>
                      {expandido ? <ChevronUp size={18} className="text-stone-400" aria-hidden /> : <ChevronDown size={18} className="text-stone-400" aria-hidden />}
                    </span>
                  </button>

                  {expandido && (
                    <div className="space-y-4 border-t border-stone-100 p-4 sm:p-5">
                      {cartao ? (
                        <CartaoFidelidade
                          carimbos={cartao.carimbos}
                          meta={cartao.meta}
                          descontoPct={cartao.desconto_pct}
                          precoBaseCents={cartao.preco_base_cents}
                          titulo="Cartão deste cliente"
                          perspetiva="contabilista"
                        />
                      ) : (
                        <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-stone-500">
                          Ainda não há cartão. Abre-se na primeira consulta que marcares como realizada
                          {ficha.fidelidadeAtiva ? "." : ", depois de ligares o cartão de fidelidade."}
                        </p>
                      )}

                      {v.emailCliente && (
                        <p className="flex items-center gap-2 text-sm text-stone-600">
                          <Mail size={15} className="shrink-0 text-stone-400" aria-hidden />
                          <a href={`mailto:${v.emailCliente}`} className="min-w-0 truncate underline underline-offset-2">
                            {v.emailCliente}
                          </a>
                        </p>
                      )}

                      <div>
                        <h3 className="text-sm font-semibold text-stone-700">O que este cliente te enviou</h3>
                        {dele.length === 0 ? (
                          <p className="mt-1.5 text-sm text-stone-400">Nada, para já.</p>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {dele.slice(0, 8).map((p) => (
                              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream px-3.5 py-2.5 text-sm">
                                <span className="min-w-0 truncate text-stone-700">{p.titulo}</span>
                                <span className="shrink-0 text-xs text-stone-400">{ROTULO_PARTILHA[p.tipo]}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {v.estado === "ativo" ? (
                          <Button size="sm" variant="secondary" disabled={ocupado === v.id} onClick={() => decidir(v, "pausado")}>
                            Pausar
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" disabled={ocupado === v.id} onClick={() => decidir(v, "ativo")}>
                            Reativar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" disabled={ocupado === v.id} onClick={() => decidir(v, "terminado")}>
                          Terminar acompanhamento
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {antigos.length > 0 && (
        <p className="text-sm text-stone-400">
          {antigos.length} {antigos.length === 1 ? "acompanhamento terminado" : "acompanhamentos terminados"}.
          O que te tinham enviado deixou de estar acessível.
        </p>
      )}
    </div>
  );
}


/**
 * Duas letras a partir do tratamento. «Bruno Costa» → «BC»; «Cliente 4F2A»
 * → «C4». Serve para distinguir linhas de relance, não para identificar.
 */
function monograma(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
