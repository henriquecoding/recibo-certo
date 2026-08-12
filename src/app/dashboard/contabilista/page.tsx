"use client";

// A minha contabilista / o meu contabilista.
//
// ⚠️ Nada nesta página verifica o plano. Ligar-se, enviar simulações e marcar
// consultas são gratuitos — ver `PARTILHA_NUNCA_EXIGE_PLUS`, coberto por teste.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import {
  cancelarConsulta, listarAgendamentos, listarPartilhas, meuCartao, meuVinculo,
  meusCupoes, revogarPartilha, terminarVinculo, type CartaoLido, type CupaoLido,
} from "@/lib/contabilistas/dados";
import type { Agendamento, Contabilista, Partilha, Vinculo } from "@/lib/contabilistas/tipos";
import { ROTULO_PARTILHA, ROTULO_VINCULO } from "@/lib/contabilistas/vinculo";
import { diaLocal, horaLocal, rotularDia } from "@/lib/contabilistas/agenda";
import { eurosDeCents, valorComDesconto } from "@/lib/contabilistas/fidelidade";
import CartaoFidelidade from "@/components/contabilistas/CartaoFidelidade";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  Briefcase, Calendar, Check, Clock, Copy, Gift, MapPin, Warning, PaperClip,
} from "@/components/ui/Icons";

export default function MeuContabilistaPage() {
  const { user, carregado, abrirModal, disponivel } = useAuth();
  const [vinculo, setVinculo] = useState<(Vinculo & { contabilista: Contabilista | null }) | null>(null);
  const [cartao, setCartao] = useState<CartaoLido | null>(null);
  const [cupoes, setCupoes] = useState<CupaoLido[]>([]);
  const [consultas, setConsultas] = useState<Agendamento[]>([]);
  const [partilhas, setPartilhas] = useState<Partilha[]>([]);
  const [aLer, setALer] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!user) { setALer(false); return; }
    setALer(true);
    try {
      const v = await meuVinculo(user.id);
      setVinculo(v);
      if (v?.contabilista) {
        const [c, cu, ag, pa] = await Promise.all([
          meuCartao(user.id, v.contabilistaId),
          meusCupoes({ clienteId: user.id }),
          listarAgendamentos({ clienteId: user.id }),
          listarPartilhas({ clienteId: user.id }),
        ]);
        setCartao(c); setCupoes(cu); setConsultas(ag); setPartilhas(pa);
      }
    } catch (e) { setErro((e as Error).message); }
    finally { setALer(false); }
  }, [user]);

  useEffect(() => { if (carregado) void carregar(); }, [carregado, carregar]);

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(codigo);
      setTimeout(() => setCopiado(null), 2000);
    } catch { /* sem área de transferência: o código está à vista de qualquer forma */ }
  }

  if (!carregado || aLer) {
    return <div className="h-96 animate-pulse rounded-4xl bg-stone-100" aria-busy="true" />;
  }

  if (!disponivel) {
    return (
      <Envolvente>
        <p className="rounded-2xl bg-alert-bg px-4 py-3 text-sm text-alert-text">
          Esta área precisa da conta na nuvem, que ainda não está configurada.
        </p>
      </Envolvente>
    );
  }

  if (!user) {
    return (
      <Envolvente>
        <EstadoVazio
          Icon={Briefcase}
          titulo="Entra na tua conta"
          descricao="Para te ligares a um contabilista precisas de sessão iniciada. A conta é gratuita."
          acao={<Button onClick={() => abrirModal("criar")}>Criar conta</Button>}
        />
      </Envolvente>
    );
  }

  const disponiveis = cupoes.filter((c) => c.estado === "disponivel");

  // A verificação é sobre o par inteiro para o TypeScript poder estreitar
  // `vinculo` a seguir — `vinculo?.contabilista` não lhe diz nada sobre
  // `vinculo` em si.
  if (!vinculo || !vinculo.contabilista) {
    return (
      <Envolvente>
        <EstadoVazio
          Icon={Briefcase}
          titulo="Ainda não tens contabilista"
          descricao="Liga-te a um contabilista certificado para lhe enviares as tuas simulações e marcares consultas. É gratuito e não precisa de nenhum plano."
          acao={<Link href="/contabilistas"><Button>Ver contabilistas</Button></Link>}
        />
      </Envolvente>
    );
  }

  const cc = vinculo.contabilista;
  const ativo = vinculo.estado === "ativo";

  return (
    <Envolvente>
      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-2xl text-ink">{cc.nome}</h2>
            {(cc.concelho || cc.distrito) && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-500">
                <MapPin size={14} aria-hidden />
                {[cc.concelho, cc.distrito].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <Badge tone={ativo ? "brand" : "alert"}>{ROTULO_VINCULO[vinculo.estado]}</Badge>
        </div>

        {!ativo && (
          <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-stone-600">
            {vinculo.estado === "pendente" || vinculo.estado === "convidado"
              ? "O pedido ainda não foi aceite. Assim que for, podes marcar consultas e enviar simulações."
              : "O acompanhamento está em pausa."}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/contabilistas/${cc.slug}`}>
            <Button variant="secondary" size="sm">Ver perfil e marcar</Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (!vinculo) return;
              const { erro: e } = await terminarVinculo(vinculo.id);
              if (e) setErro(e); else await carregar();
            }}
          >
            Terminar acompanhamento
          </Button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-stone-400">
          Ao terminar, o contabilista deixa de ver tudo o que lhe enviaste. O teu histórico
          fica contigo.
        </p>
      </section>

      {cartao && cc.fidelidadeAtiva && (
        <CartaoFidelidade
          carimbos={cartao.carimbos}
          meta={cartao.meta}
          descontoPct={cartao.descontoPct}
          precoBaseCents={cartao.precoBaseCents}
          titulo={`As tuas consultas com ${cc.nome.split(" ")[0]}`}
        />
      )}

      {disponiveis.length > 0 && (
        <section aria-labelledby="cupoes-titulo" className="rounded-4xl border border-brand/20 bg-brand-light/40 p-5 sm:p-6">
          <h2 id="cupoes-titulo" className="flex items-center gap-2 font-display text-xl text-ink">
            <Gift size={19} className="text-brand-dark" aria-hidden />
            {disponiveis.length === 1 ? "Tens um desconto" : `Tens ${disponiveis.length} descontos`}
          </h2>
          <ul className="mt-4 space-y-2.5">
            {disponiveis.map((c) => {
              const v = valorComDesconto(c.valorBaseCents, c.percentagem);
              return (
                <li key={c.id} className="rounded-2xl bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-lg font-semibold tracking-wide text-ink">{c.codigo}</span>
                    <Button size="sm" variant="secondary" onClick={() => copiar(c.codigo)}>
                      {copiado === c.codigo ? <><Check size={14} aria-hidden /> Copiado</> : <><Copy size={14} aria-hidden /> Copiar</>}
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    <strong className="text-stone-800">{c.percentagem}% de desconto</strong> — {eurosDeCents(v.baseCents)}{" "}
                    passam a {eurosDeCents(v.finalCents)}. Válido até{" "}
                    {new Intl.DateTimeFormat("pt-PT", { dateStyle: "long" }).format(new Date(c.expiraEm))}.
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-stone-500">
            Apresenta o código na próxima consulta. O desconto é aplicado pelo contabilista;
            o ReciboCerto não cobra a consulta nem processa pagamentos.
          </p>
        </section>
      )}

      <section aria-labelledby="consultas-titulo" className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
        <h2 id="consultas-titulo" className="font-display text-xl text-ink">As tuas consultas</h2>
        {consultas.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">Ainda não marcaste nenhuma.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100">
            {consultas.slice(0, 12).map((a) => {
              const futura = new Date(a.inicio).getTime() > Date.now();
              const cancelavel = futura && (a.estado === "pedido" || a.estado === "confirmado");
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold capitalize text-stone-800">
                      {rotularDia(diaLocal(new Date(a.inicio)))}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm tabular-nums text-stone-500">
                      <Clock size={14} aria-hidden />
                      {horaLocal(new Date(a.inicio))}
                      <span className="text-stone-300">·</span>
                      {a.modalidade === "online" ? "Online" : "Presencial"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={a.estado === "confirmado" ? "brand" : a.estado === "realizada" ? "neutral" : "alert"}>
                      {a.estado === "pedido" ? "Por confirmar"
                        : a.estado === "confirmado" ? "Confirmada"
                        : a.estado === "realizada" ? "Realizada"
                        : a.estado === "nao_compareceu" ? "Não compareceste" : "Cancelada"}
                    </Badge>
                    {cancelavel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const { erro: e } = await cancelarConsulta(a.id);
                          if (e) setErro(e); else await carregar();
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="partilhas-titulo" className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
        <h2 id="partilhas-titulo" className="font-display text-xl text-ink">O que já enviaste</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
          Cada envio é uma cópia do que estava no ecrã. Podes revogar o acesso a qualquer
          momento — a partir daí o contabilista deixa de o conseguir abrir.
        </p>
        {partilhas.length === 0 ? (
          <div className="mt-4">
            <EstadoVazio
              Icon={PaperClip}
              titulo="Ainda não enviaste nada"
              descricao="Nas ferramentas e simuladores aparece a opção de enviar o resultado ao teu contabilista."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {partilhas.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-800">{p.titulo}</p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {ROTULO_PARTILHA[p.tipo]} ·{" "}
                    {new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(p.criadoEm))}
                  </p>
                </div>
                {p.estado === "revogada" ? (
                  <Badge tone="neutral">Revogada</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const { erro: e } = await revogarPartilha(p.id);
                      if (e) setErro(e); else await carregar();
                    }}
                  >
                    Revogar acesso
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Envolvente>
  );
}

function Envolvente({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">A minha conta</p>
        <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">O meu contabilista</h1>
      </header>
      {children}
    </div>
  );
}
