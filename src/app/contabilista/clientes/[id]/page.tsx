"use client";

// ═══════════════════════════════════════════════════════════════════════
//  FICHA DE CLIENTE — tudo sobre uma pessoa, numa página
//  ---------------------------------------------------------------------
//  Antes, o que se sabia de um cliente estava espalhado por três ecrãs: o
//  cartão de fidelidade em «Clientes», os envios em «Partilhas», as
//  consultas em «Agenda». Para responder a «como vai isto com o João?» era
//  preciso abrir os três e cruzá-los de cabeça.
//
//  ⚠️ Continua a valer a fronteira da migração 038: esta página mostra o
//  que ESTE cliente enviou, e nada mais. Não há aqui nenhuma leitura das
//  tabelas fiscais dele.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import CartaoFidelidade from "@/components/contabilistas/CartaoFidelidade";
import Conversa from "@/components/contabilistas/Conversa";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar, type PedidoConfirmacao } from "@/components/ui/Confirmar";
import {
  cartoesAbertos, decidirVinculo, listarAgendamentos, listarPartilhas, meusClientes,
  meusCupoes, type CupaoLido,
} from "@/lib/contabilistas/fonte/dados";
import { usarPainel } from "@/components/contabilistas/usarPainel";
import { resumirClientes, type CartaoDoCliente, type ResumoCliente } from "@/lib/contabilistas/resumo";
import { ROTULO_PARTILHA, ROTULO_VINCULO } from "@/lib/contabilistas/vinculo";
import { eurosDeCents } from "@/lib/contabilistas/fidelidade";
import { diaLocal, horaLocal, rotularDia } from "@/lib/contabilistas/agenda";
import type { Agendamento, Partilha } from "@/lib/contabilistas/tipos";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  ArrowLeft, Calendar, Clock, Gift, Lock, Mail, PaperClip, User,
} from "@/components/ui/Icons";

type Decisao = "aceitar" | "pausar" | "reativar" | "terminar";

export default function FichaClientePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ficha, aCarregar } = usarFicha();
  const painel = usarPainel();
  const avisos = useAvisos();
  const confirmar = useConfirmar();

  const [resumo, setResumo] = useState<ResumoCliente | null>(null);
  const [consultas, setConsultas] = useState<Agendamento[]>([]);
  const [envios, setEnvios] = useState<Partilha[]>([]);
  const [cupoes, setCupoes] = useState<CupaoLido[]>([]);
  const [aLer, setALer] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  const carregar = useCallback(async (contabilistaId: string) => {
    setALer(true);
    try {
      const [vinculos, ags, pts, cps] = await Promise.all([
        meusClientes(contabilistaId),
        listarAgendamentos({ contabilistaId }),
        listarPartilhas({ contabilistaId }),
        meusCupoes({ contabilistaId }),
      ]);

      const vinculo = vinculos.find((v) => v.id === id);
      if (!vinculo) { setNaoEncontrado(true); return; }

      const cartoes: Record<string, CartaoDoCliente> = {};
      for (const c of await cartoesAbertos(contabilistaId, vinculo.clienteId)) {
        cartoes[c.clienteId] = {
          carimbos: c.carimbos,
          meta: c.meta,
          descontoPct: c.descontoPct,
          precoBaseCents: c.precoBaseCents,
        };
      }

      const [r] = resumirClientes({
        vinculos: [vinculo], agendamentos: ags, partilhas: pts, cartoes,
      });
      setResumo(r);
      setConsultas(ags.filter((a) => a.clienteId === vinculo.clienteId));
      setEnvios(pts.filter((p) => p.clienteId === vinculo.clienteId));
      setCupoes(cps.filter((c) => c.contabilistaId === contabilistaId));
    } catch (e) {
      avisos.erro((e as Error).message);
    } finally {
      setALer(false);
    }
  }, [id, avisos]);

  useEffect(() => { if (ficha) void carregar(ficha.userId); }, [ficha, carregar]);

  const porOrdem = useMemo(
    () => [...consultas].sort((a, b) => b.inicio.localeCompare(a.inicio)),
    [consultas]
  );

  async function decidir(para: Decisao) {
    if (!resumo || !ficha) return;
    const pergunta = perguntaVinculo(para);
    if (pergunta && !(await confirmar(pergunta))) return;

    setOcupado(true);
    const { erro } = await decidirVinculo(resumo.vinculo.id, para);
    setOcupado(false);
    if (erro) { avisos.erro(erro); return; }

    if (para === "terminar") {
      avisos.sucesso("Acompanhamento terminado.", {
        detalhe: "Deixaste de ver o que este cliente te tinha enviado.",
      });
      router.push(painel.href("/contabilista/clientes"));
      return;
    }
    avisos.sucesso(para === "pausar" ? "Acompanhamento em pausa." : "Cliente ativo.");
        await carregar(ficha.userId);
  }

  if (aCarregar || aLer) return <EsqueletoPainel />;
  if (!ficha) return null;

  if (naoEncontrado || !resumo) {
    return (
      <div className="space-y-6">
        <Voltar href={painel.href("/contabilista/clientes")} />
        <EstadoVazio
          Icon={User}
          titulo="Cliente não encontrado"
          descricao="Este vínculo não existe, ou já não é teu."
          acao={<Link href={painel.href("/contabilista/clientes")}><Button variant="secondary">Ver todos</Button></Link>}
        />
      </div>
    );
  }

  const v = resumo.vinculo;
  const cupoesDele = cupoes.filter((c) => c.clienteId === v.clienteId);
  const disponiveis = cupoesDele.filter((c) => c.estado === "disponivel");

  return (
    <div className="space-y-6">
      <Voltar href={painel.href("/contabilista/clientes")} />

      <CabecalhoPainel
        rotulo="Ficha de cliente"
        titulo={resumo.tratamento}
        descricao={
          <>
            Cliente desde{" "}
            {new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(new Date(v.criadoEm))}
            {" · "}
            {resumo.consultasRealizadas} {resumo.consultasRealizadas === 1 ? "consulta realizada" : "consultas realizadas"}
          </>
        }
        acao={<Badge tone={v.estado === "ativo" ? "brand" : v.estado === "pausado" ? "neutral" : "alert"}>
          {ROTULO_VINCULO[v.estado]}
        </Badge>}
      />

      {v.emailCliente && (
        <p className="flex items-center gap-2 text-sm text-stone-600">
          <Mail size={15} className="shrink-0 text-stone-400" aria-hidden />
          <a href={`mailto:${v.emailCliente}`} className="min-w-0 truncate underline underline-offset-2">
            {v.emailCliente}
          </a>
        </p>
      )}

      {v.mensagem && (
        <p className="rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-stone-700">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">
            Recado ao pedir o vínculo
          </span>
          {v.mensagem}
        </p>
      )}

      <p className="flex items-start gap-2.5 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-600">
        <Lock size={15} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
        Esta página mostra o que este cliente te enviou. Os recibos, cenários e
        simulações que ele guardou continuam só dele.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* A conversa fica em primeiro: é o que muda de dia para dia. As
              consultas e os envios são o registo; isto é o que está vivo. */}
          <Conversa
            vinculoId={v.id}
            meuId={ficha.userId}
            estadoVinculo={v.estado}
            tratamentoDoOutro={resumo.tratamento}
          />

          {/* Consultas */}
          <section aria-labelledby="consultas-titulo" className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
            <h2 id="consultas-titulo" className="font-display text-xl text-ink">Consultas</h2>
            {porOrdem.length === 0 ? (
              <p className="mt-3 text-sm text-stone-400">Ainda não houve nenhuma.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-100">
                {porOrdem.slice(0, 20).map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold capitalize text-stone-800">
                        {rotularDia(diaLocal(new Date(a.inicio)))}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm tabular-nums text-stone-500">
                        <Clock size={13} aria-hidden />
                        {horaLocal(new Date(a.inicio))}
                        <span className="text-stone-300" aria-hidden>·</span>
                        {a.modalidade === "online" ? "Online" : "Presencial"}
                      </p>
                    </div>
                    <Badge tone={a.estado === "realizada" ? "brand" : a.estado === "confirmado" ? "brand" : "neutral"}>
                      {a.estado === "realizada" ? "Realizada"
                        : a.estado === "confirmado" ? "Confirmada"
                        : a.estado === "pedido" ? "Por confirmar"
                        : a.estado === "nao_compareceu" ? "Não compareceu" : "Cancelada"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Envios */}
          <section aria-labelledby="envios-titulo" className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
            <h2 id="envios-titulo" className="font-display text-xl text-ink">
              O que te enviou
              {resumo.partilhasPorLer > 0 && (
                <span className="ml-2 align-middle text-sm font-normal text-brand-dark">
                  {resumo.partilhasPorLer} por ler
                </span>
              )}
            </h2>
            {envios.length === 0 ? (
              <p className="mt-3 text-sm text-stone-400">Nada, para já.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {envios.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream px-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-stone-800">{p.titulo}</span>
                      <span className="block text-xs text-stone-500">
                        {ROTULO_PARTILHA[p.tipo]} ·{" "}
                        {new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(p.criadoEm))}
                      </span>
                    </span>
                    {p.estado === "enviada" && <Badge tone="brand">Nova</Badge>}
                    {p.estado === "revogada" && <Badge tone="neutral">Revogada</Badge>}
                  </li>
                ))}
              </ul>
            )}
            <Link href={painel.href("/contabilista/partilhas")} className="mt-4 inline-block text-sm font-semibold text-brand-dark underline underline-offset-2">
              Abrir em Partilhas
            </Link>
          </section>
        </div>

        {/* Coluna lateral */}
        <aside className="space-y-4">
          {resumo.cartao ? (
            <CartaoFidelidade
              carimbos={resumo.cartao.carimbos}
              meta={resumo.cartao.meta}
              descontoPct={resumo.cartao.descontoPct}
              precoBaseCents={resumo.cartao.precoBaseCents}
              titulo="Cartão deste cliente"
              perspetiva="contabilista"
            />
          ) : (
            <p className="rounded-4xl border border-dashed border-stone-200 px-4 py-5 text-sm leading-relaxed text-stone-500">
              Ainda não há cartão. Abre-se na primeira consulta que marcares como
              realizada{ficha.fidelidadeAtiva ? "." : ", depois de ligares o cartão de fidelidade."}
            </p>
          )}

          {cupoesDele.length > 0 && (
            <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card">
              <h2 className="flex items-center gap-2 font-display text-lg text-ink">
                <Gift size={17} className="text-brand" aria-hidden /> Cupões
              </h2>
              <p className="mt-1.5 text-sm text-stone-500">
                {disponiveis.length} por usar, de {cupoesDele.length} emitidos.
              </p>
              <ul className="mt-3 space-y-1.5">
                {cupoesDele.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-mono text-stone-700">{c.codigo}</span>
                    <span className={c.estado === "disponivel" ? "font-semibold text-brand-dark" : "text-stone-400"}>
                      {c.percentagem}% · {c.estado === "disponivel" ? eurosDeCents(c.valorBaseCents) : "usado"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card">
            <h2 className="font-display text-lg text-ink">Acompanhamento</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {v.estado === "pendente" || v.estado === "convidado" ? (
                <>
                  <Button size="sm" disabled={ocupado} onClick={() => decidir("aceitar")}>Aceitar</Button>
                  <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => decidir("terminar")}>Recusar</Button>
                </>
              ) : v.estado === "ativo" ? (
                <>
                  <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => decidir("pausar")}>Pausar</Button>
                  <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => decidir("terminar")}>Terminar</Button>
                </>
              ) : v.estado === "pausado" ? (
                <>
                  <Button size="sm" disabled={ocupado} onClick={() => decidir("aceitar")}>Reativar</Button>
                  <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => decidir("terminar")}>Terminar</Button>
                </>
              ) : (
                <p className="text-sm text-stone-400">Acompanhamento terminado.</p>
              )}
            </div>
          </section>

          {resumo.proxima && (
            <p className="flex items-start gap-2 rounded-2xl bg-brand-light/50 px-4 py-3 text-sm leading-relaxed text-stone-700">
              <Calendar size={15} className="mt-0.5 shrink-0 text-brand-dark" aria-hidden />
              Próxima consulta a {new Intl.DateTimeFormat("pt-PT", { dateStyle: "long" }).format(new Date(resumo.proxima))}.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Voltar({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800"
    >
      <ArrowLeft size={15} aria-hidden /> Clientes
    </Link>
  );
}

function perguntaVinculo(para: Decisao): PedidoConfirmacao | null {
  if (para === "terminar") {
    return {
      titulo: "Terminar o acompanhamento?",
      descricao: "Não há volta a dar.",
      consequencias: [
        "Deixas de conseguir abrir o que este cliente te enviou.",
        "O nome e o email que ele deu são apagados.",
        "As consultas realizadas e o cartão ficam no histórico.",
        "A pessoa pode voltar a pedir para ser tua cliente.",
      ],
      confirmar: "Terminar acompanhamento",
      tom: "perigo",
    };
  }
  if (para === "pausar") {
    return {
      titulo: "Pausar este acompanhamento?",
      descricao: "Continuas a ver o que te enviou, mas ele não marca consultas novas enquanto estiver em pausa.",
      confirmar: "Pausar",
    };
  }
  return null;
}
