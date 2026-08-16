"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A SALA DE ACOMPANHAMENTO
//  ---------------------------------------------------------------------
//  O mesmo componente nos dois lados da relação. `papel` decide quem pede
//  e quem responde; tudo o resto — o próximo passo, as pendências, a linha
//  do tempo — é literalmente o mesmo código a correr.
//
//  Porque é que isto importa: a queixa que fez esta peça existir é que as
//  duas pessoas viam produtos diferentes e não conseguiam falar sobre o
//  mesmo ecrã. Dois componentes com o mesmo desenho voltavam a divergir na
//  primeira alteração, e a divergência não daria erro nenhum — só voltava a
//  pôr uma delas a perguntar «onde é que isso te aparece?».
//
//  A sala NÃO carrega a conversa. A conversa já existe (`Conversa.tsx`),
//  já tem Realtime e já tem anexos endurecidos; duplicá-la aqui era
//  reescrever a parte mais delicada do produto para ganhar um cabeçalho.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  criarPedido, decidirPedido, escutarPedidos, listarPedidos, listarTimeline,
  responderPedido, type DecisaoPedido,
} from "@/lib/contabilistas/fonte/sala";
import {
  contarPendencias, proximoPasso, type Papel, type RetratoDaRelacao,
} from "@/lib/contabilistas/sala/proximo-passo";
import {
  pedidoPorFechar, type EventoTimeline, type PedidoCliente, type TipoPedido,
} from "@/lib/contabilistas/sala/tipos";
import { pedidosPorTratar } from "@/lib/contabilistas/sala/proximo-passo";
import type { EstadoVinculo } from "@/lib/contabilistas/tipos";
import BlocoProximoPasso from "./BlocoProximoPasso";
import CartaoPedido from "./CartaoPedido";
import NovoPedido from "./NovoPedido";
import TimelineRelacao from "./TimelineRelacao";
import { useAvisos } from "@/components/ui/Avisos";
import { Lock } from "@/components/ui/Icons";

const POR_PAGINA = 25;

export interface SalaProps {
  vinculoId: string;
  papel: Papel;
  meuId: string;
  /** Como se chama o outro lado, do ponto de vista de quem está a ver. */
  nomeDoOutro: string;
  estadoVinculo: EstadoVinculo;
  consultas: { id: string; inicio: string; estado: string }[];
  partilhasPorLer?: number;
  porPagarCents?: number;
  /**
   * O que fazer quando o botão do próximo passo é carregado.
   *
   * A sala não sabe marcar consultas nem abrir pagamentos — isso vive nas
   * páginas, que já o faziam antes de ela existir. Recebe o destino e
   * devolve a decisão a quem a montou.
   */
  aoAgir?: (destino: string) => void;
  /** Chamado depois de qualquer escrita, para a página recarregar o resto. */
  aoMudar?: () => void;
}

export default function Sala({
  vinculoId, papel, meuId, nomeDoOutro, estadoVinculo,
  consultas, partilhasPorLer = 0, porPagarCents = 0,
  aoAgir, aoMudar,
}: SalaProps) {
  const avisos = useAvisos();
  const [pedidos, setPedidos] = useState<PedidoCliente[]>([]);
  const [eventos, setEventos] = useState<EventoTimeline[]>([]);
  const [haMais, setHaMais] = useState(false);
  const [aLer, setALer] = useState(true);
  const [aCarregarMais, setACarregarMais] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [ps, evs] = await Promise.all([
        listarPedidos(vinculoId),
        listarTimeline({ vinculoId, limite: POR_PAGINA }),
      ]);
      setPedidos(ps);
      setEventos(evs);
      setHaMais(evs.length === POR_PAGINA);
    } catch (e) {
      avisos.erro((e as Error).message);
    } finally {
      setALer(false);
    }
  }, [vinculoId, avisos]);

  useEffect(() => { void carregar(); }, [carregar]);

  // A escuta TEM de ser cancelada na limpeza: um canal por montagem que
  // nunca fecha esgota as ligações simultâneas do plano, e o sintoma
  // aparece longe da causa.
  useEffect(() => escutarPedidos(vinculoId, () => { void carregar(); }), [vinculoId, carregar]);

  /**
   * As mensagens por ler saem da própria linha do tempo, e não de uma
   * contagem passada pela página.
   *
   * Duas páginas a calcular o mesmo número por caminhos diferentes é duas
   * páginas a discordarem mais cedo ou mais tarde — e a discordância
   * apareceria como «diz que tenho uma mensagem nova e não tenho».
   *
   * Conta na janela carregada e não na relação inteira. É deliberado: uma
   * mensagem por ler de há mais de vinte e cinco acontecimentos atrás já
   * não é um aviso, é arqueologia.
   */
  const mensagensPorLer = useMemo(
    () => eventos.filter(
      (e) => e.tipo === "mensagem" && e.autorId !== meuId && e.meta.lida === false,
    ).length,
    [eventos, meuId],
  );

  const retrato: RetratoDaRelacao = useMemo(
    () => ({
      papel, estadoVinculo, pedidos, consultas,
      mensagensPorLer, partilhasPorLer, porPagarCents,
      agora: new Date(),
    }),
    [papel, estadoVinculo, pedidos, consultas, mensagensPorLer, partilhasPorLer, porPagarCents],
  );

  const passo = useMemo(() => proximoPasso(retrato), [retrato]);
  const pendentes = useMemo(() => pedidosPorTratar(pedidos, new Date()), [pedidos]);
  const fechados = useMemo(() => pedidos.filter((p) => !pedidoPorFechar(p)), [pedidos]);

  async function comOcupado(f: () => Promise<{ erro?: string }>, sucesso?: string) {
    setOcupado(true);
    const { erro } = await f();
    setOcupado(false);
    if (erro) { avisos.erro(erro); return; }
    if (sucesso) avisos.sucesso(sucesso);
    await carregar();
    aoMudar?.();
  }

  /**
   * O botão do próximo passo.
   *
   * `pedido:<id>` é tratado aqui — é a sala que tem os pedidos. Tudo o
   * resto sobe para a página, que é quem sabe marcar, pagar e confirmar.
   */
  function agir(destino: string) {
    if (destino.startsWith("pedido:")) {
      const alvo = document.getElementById(`pedido-${destino.slice(7)}`);
      alvo?.scrollIntoView({ behavior: "smooth", block: "center" });
      alvo?.querySelector<HTMLButtonElement>("button")?.focus();
      return;
    }
    aoAgir?.(destino);
  }

  async function maisAntigos() {
    const ultimo = eventos.at(-1);
    if (!ultimo) return;
    setACarregarMais(true);
    try {
      const mais = await listarTimeline({ vinculoId, ate: ultimo.quando, limite: POR_PAGINA });
      setEventos((atuais) => [...atuais, ...mais]);
      setHaMais(mais.length === POR_PAGINA);
    } catch (e) {
      avisos.erro((e as Error).message);
    } finally {
      setACarregarMais(false);
    }
  }

  if (aLer) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-32 animate-pulse rounded-4xl bg-stone-100" />
        <div className="h-48 animate-pulse rounded-4xl bg-stone-100" />
      </div>
    );
  }

  const pendencias = contarPendencias(retrato);

  return (
    <div className="space-y-6">
      <BlocoProximoPasso passo={passo} ocupado={ocupado} aoAgir={agir} />

      {/* ── O que falta ─────────────────────────────────────────── */}
      <section aria-labelledby="pendencias-titulo" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="pendencias-titulo" className="font-display text-xl text-ink">
            O que falta
            {pendencias > 0 && (
              <span className="ml-2 align-middle text-sm font-normal text-stone-500">
                {pendencias} por tratar
              </span>
            )}
          </h2>

          {papel === "contabilista" && estadoVinculo === "ativo" && (
            <NovoPedido
              ocupado={ocupado}
              aoCriar={(p) =>
                comOcupado(
                  () => criarPedido({ vinculoId, tipo: p.tipo as TipoPedido, titulo: p.titulo,
                                      descricao: p.descricao, prazo: p.prazo }),
                  "Pedido enviado.",
                )
              }
            />
          )}
        </div>

        {pendentes.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-stone-200 px-4 py-5 text-sm leading-relaxed text-stone-500">
            {papel === "cliente"
              ? "Não há nada à tua espera. Quando o teu contabilista precisar de alguma coisa, aparece aqui."
              : "Nada por pedir. Quando precisares de um documento ou de uma confirmação, o pedido fica registado — e deixa de depender de alguém se lembrar."}
          </p>
        ) : (
          <ul className="space-y-3">
            {pendentes.map((p) => (
              <CartaoPedido
                key={p.id}
                id={`pedido-${p.id}`}
                pedido={p}
                papel={papel}
                ocupado={ocupado}
                aoResponder={(texto) =>
                  comOcupado(
                    () => responderPedido({ pedidoId: p.id, texto }),
                    "Resposta enviada.",
                  )
                }
                aoDecidir={(d: DecisaoPedido) =>
                  comOcupado(
                    () => decidirPedido(p.id, d),
                    d === "concluir" ? "Dado por tratado." : undefined,
                  )
                }
              />
            ))}
          </ul>
        )}

        {fechados.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none rounded-xl px-1 py-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand/40">
              {fechados.length === 1
                ? "Ver 1 pedido já tratado"
                : `Ver ${fechados.length} pedidos já tratados`}
            </summary>
            <ul className="mt-3 space-y-3">
              {fechados.map((p) => (
                <CartaoPedido
                  key={p.id}
                  pedido={p}
                  papel={papel}
                  ocupado={ocupado}
                  aoDecidir={(d: DecisaoPedido) => comOcupado(() => decidirPedido(p.id, d))}
                />
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* ── O que aconteceu ─────────────────────────────────────── */}
      <section aria-labelledby="timeline-titulo">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="timeline-titulo" className="font-display text-xl text-ink">Atividade</h2>
          <p className="text-sm text-stone-500">Uma linha do tempo comum aos dois lados.</p>
        </div>
        <div className="mt-3.5">
          <TimelineRelacao
            eventos={eventos}
            meuId={meuId}
            nomeDoOutro={nomeDoOutro}
            haMais={haMais}
            aCarregar={aCarregarMais}
            aoCarregarMais={() => void maisAntigos()}
          />
        </div>
      </section>

      <p className="flex items-start gap-2.5 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-600">
        <Lock size={15} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
        {papel === "cliente"
          ? "O acompanhamento acontece todo aqui. O teu email e o teu telemóvel não são partilhados — o que enviares fica registado, e podes revogá-lo quando quiseres."
          : "Esta sala mostra o que esta pessoa te enviou. Os contactos pessoais dela não são partilhados, e os recibos e simulações que ela guardou continuam só dela."}
      </p>
    </div>
  );
}
