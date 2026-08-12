"use client";

// Perfil público + marcação de consulta.
//
// ⚠️ Marcar consulta e enviar simulações NÃO verificam o plano, e não podem
// passar a verificar — ver `PARTILHA_NUNCA_EXIGE_PLUS` em
// `src/lib/contabilistas/vinculo.ts`, coberto por teste.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import {
  marcarConsulta, meuVinculo, obterContabilistaPorSlug, obterDisponibilidade,
  obterExcecoes, ocupadosDe, pedirVinculo,
} from "@/lib/contabilistas/dados";
import type { Contabilista, Modalidade } from "@/lib/contabilistas/tipos";
import {
  agruparPorDia, diaLocal, gerarSlots, rotularDia,
  type Excecao, type RegraDisponibilidade, type Slot,
} from "@/lib/contabilistas/agenda";
import { podeAgendar, podePedirVinculo, vinculoAtivo } from "@/lib/contabilistas/vinculo";
import { eurosDeCents, valorComDesconto } from "@/lib/contabilistas/fidelidade";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import {
  Calendar, Check, Gift, Globe, Mail, MapPin, ShieldCheck, Warning, Clock,
} from "@/components/ui/Icons";

const JANELA_DIAS = 30;

export default function PerfilPublico({ slug }: { slug: string }) {
  const { user, carregado, abrirModal } = useAuth();
  const [cc, setCc] = useState<Contabilista | null>(null);
  const [regras, setRegras] = useState<RegraDisponibilidade[]>([]);
  const [excecoes, setExcecoes] = useState<Excecao[]>([]);
  const [ocupados, setOcupados] = useState<{ inicio: string; fim: string }[]>([]);
  const [estadoVinculo, setEstadoVinculo] = useState<string | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [aLer, setALer] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupadoBotao] = useState(false);
  const [slotEscolhido, setSlotEscolhido] = useState<Slot | null>(null);
  const [modalidade, setModalidade] = useState<Modalidade>("online");
  const [assunto, setAssunto] = useState("");

  const carregar = useCallback(async () => {
    setALer(true);
    try {
      const ficha = await obterContabilistaPorSlug(slug);
      if (!ficha) { setNaoEncontrado(true); return; }
      setCc(ficha);
      setModalidade(ficha.modalidades.includes("online") ? "online" : "presencial");

      const de = new Date();
      const ate = new Date(Date.now() + JANELA_DIAS * 86400_000);
      const [r, e, o] = await Promise.all([
        obterDisponibilidade(ficha.userId),
        obterExcecoes(ficha.userId, diaLocal(de)),
        ocupadosDe(ficha.userId, de, ate),
      ]);
      setRegras(r); setExcecoes(e); setOcupados(o);

      if (user) {
        const v = await meuVinculo(user.id);
        setEstadoVinculo(v && v.contabilistaId === ficha.userId ? v.estado : null);
      }
    } catch (e) { setErro((e as Error).message); }
    finally { setALer(false); }
  }, [slug, user]);

  useEffect(() => { if (carregado) void carregar(); }, [carregado, carregar]);

  const slots = useMemo(() => {
    if (regras.length === 0) return [];
    return gerarSlots({
      regras, excecoes, ocupados,
      de: new Date(),
      ate: new Date(Date.now() + JANELA_DIAS * 86400_000),
    });
  }, [regras, excecoes, ocupados]);

  const dias = useMemo(() => agruparPorDia(slots).slice(0, 14), [slots]);

  async function ligar() {
    if (!cc) return;
    if (!user) { abrirModal("criar"); return; }
    setOcupadoBotao(true); setErro(null); setAviso(null);
    const { erro: e } = await pedirVinculo(cc.userId, user.id);
    setOcupadoBotao(false);
    if (e) { setErro(e); return; }
    setAviso("Pedido enviado. Assim que for aceite, podes marcar consulta e enviar simulações.");
    setEstadoVinculo("pendente");
  }

  async function marcar() {
    if (!cc || !user || !slotEscolhido) return;
    setOcupadoBotao(true); setErro(null); setAviso(null);
    const { erro: e } = await marcarConsulta({
      contabilistaId: cc.userId,
      clienteId: user.id,
      inicio: slotEscolhido.inicio,
      fim: slotEscolhido.fim,
      modalidade,
      assunto,
    });
    setOcupadoBotao(false);
    if (e) { setErro(e); await carregar(); return; }
    setAviso("Consulta pedida. O contabilista confirma e recebes a resposta na tua área.");
    setSlotEscolhido(null); setAssunto("");
    await carregar();
  }

  if (naoEncontrado) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20">
        <EstadoVazio
          Icon={Warning}
          titulo="Perfil não encontrado"
          descricao="Este endereço não corresponde a nenhum contabilista aprovado."
          acao={<Link href="/contabilistas"><Button variant="secondary">Ver o diretório</Button></Link>}
        />
      </main>
    );
  }

  if (aLer || !cc) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10" aria-busy="true">
        <div className="h-40 animate-pulse rounded-4xl bg-stone-100" />
        <div className="mt-6 h-64 animate-pulse rounded-4xl bg-stone-100" />
      </main>
    );
  }

  const ativo = vinculoAtivo(estadoVinculo as never);
  const podeMarcar = podeAgendar(estadoVinculo as never);
  const podePedir = podePedirVinculo(estadoVinculo as never) && cc.aceitaNovosClientes;
  const exemplo = valorComDesconto(cc.precoConsultaCents, cc.fidelidadeDescontoPct);

  return (
    <main className="min-h-[100dvh] bg-cream">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <Link href="/contabilistas" className="text-sm font-medium text-stone-500 underline underline-offset-2">
          Diretório de contabilistas
        </Link>

        <header className="mt-4 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">{cc.nome}</h1>
              {(cc.concelho || cc.distrito) && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
                  <MapPin size={15} aria-hidden />
                  {[cc.concelho, cc.distrito].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            {ativo && <Badge tone="brand">És cliente</Badge>}
            {!cc.aceitaNovosClientes && !ativo && <Badge tone="neutral">Sem vagas</Badge>}
          </div>

          {cc.occ && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-stone-500">
              <ShieldCheck size={15} className="text-brand" aria-hidden />
              Inscrição na OCC n.º {cc.occ}
            </p>
          )}

          {cc.bio && (
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-stone-700">{cc.bio}</p>
          )}

          {cc.especialidades.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {cc.especialidades.map((e) => (
                <li key={e} className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">{e}</li>
              ))}
            </ul>
          )}

          <dl className="mt-5 grid gap-3 border-t border-stone-100 pt-5 sm:grid-cols-2">
            {cc.precoConsultaCents > 0 && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">Consulta</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-stone-800">
                  {eurosDeCents(cc.precoConsultaCents)} · {cc.duracaoConsultaMin} min
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">Atendimento</dt>
              <dd className="mt-0.5 capitalize text-stone-800">{cc.modalidades.join(" e ")}</dd>
            </div>
            {cc.emailContacto && (
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">Email</dt>
                <dd className="mt-0.5 truncate">
                  <a href={`mailto:${cc.emailContacto}`} className="inline-flex items-center gap-1.5 text-stone-800 underline underline-offset-2">
                    <Mail size={14} aria-hidden /> {cc.emailContacto}
                  </a>
                </dd>
              </div>
            )}
            {cc.website && (
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">Site</dt>
                <dd className="mt-0.5 truncate">
                  <a href={cc.website} rel="nofollow noopener" target="_blank" className="inline-flex items-center gap-1.5 text-stone-800 underline underline-offset-2">
                    <Globe size={14} aria-hidden /> {cc.website.replace(/^https?:\/\//, "")}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </header>

        {cc.fidelidadeAtiva && cc.precoConsultaCents > 0 && (
          <section className="mt-5 flex items-start gap-3 rounded-4xl border border-brand/20 bg-brand-light/50 p-5">
            <Gift size={20} className="mt-0.5 shrink-0 text-brand-dark" aria-hidden />
            <div>
              <h2 className="font-semibold text-brand-dark">Cartão de fidelidade</h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-700">
                Ao fim de <strong>{cc.fidelidadeMeta} consultas</strong>, ganhas{" "}
                <strong>{cc.fidelidadeDescontoPct}% de desconto</strong> — {eurosDeCents(exemplo.baseCents)}{" "}
                passam a {eurosDeCents(exemplo.finalCents)}. O desconto é acordado e aplicado
                pelo contabilista.
              </p>
            </div>
          </section>
        )}

        {erro && (
          <p role="alert" className="mt-5 flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
            <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
          </p>
        )}
        {aviso && (
          <p role="status" className="mt-5 flex items-start gap-2 rounded-2xl bg-brand-light px-4 py-3 text-sm text-brand-dark">
            <Check size={16} className="mt-0.5 shrink-0" aria-hidden /> {aviso}
          </p>
        )}

        {/* ── Vínculo ─────────────────────────────────────────────── */}
        {!ativo && (
          <section className="mt-5 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
            <h2 className="font-display text-xl text-ink">Ligar-te a este contabilista</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
              Depois de te aceitar, podes marcar consultas e enviar-lhe as simulações que
              fizeste aqui. <strong className="text-stone-800">É gratuito</strong> e não
              exige nenhum plano pago.
            </p>
            {estadoVinculo === "pendente" || estadoVinculo === "convidado" ? (
              <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-stone-600">
                Já enviaste um pedido. Assim que for aceite, aparece na tua área.
              </p>
            ) : estadoVinculo === "pausado" ? (
              <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-stone-600">
                O acompanhamento está em pausa.
              </p>
            ) : podePedir ? (
              <Button className="mt-4" onClick={ligar} disabled={ocupado}>
                {user ? "Pedir para ser cliente" : "Criar conta e pedir"}
              </Button>
            ) : (
              <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-stone-600">
                Este contabilista não está a aceitar novos clientes de momento.
              </p>
            )}
          </section>
        )}

        {/* ── Marcação ────────────────────────────────────────────── */}
        <section aria-labelledby="marcar-titulo" className="mt-5 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
          <h2 id="marcar-titulo" className="font-display text-xl text-ink">Marcar consulta</h2>

          {!podeMarcar ? (
            <p className="mt-3 rounded-2xl bg-cream px-4 py-3 text-sm text-stone-600">
              Para marcares, tens de ser cliente deste contabilista.
            </p>
          ) : dias.length === 0 ? (
            <div className="mt-3">
              <EstadoVazio
                Icon={Calendar}
                titulo="Sem horários disponíveis"
                descricao="Este contabilista ainda não publicou horários, ou os próximos dias estão cheios."
              />
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-4">
                {dias.map(({ dia, slots: doDia }) => (
                  <div key={dia}>
                    <h3 className="text-sm font-semibold capitalize text-stone-700">{rotularDia(dia)}</h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {doDia.map((s) => {
                        const escolhido = slotEscolhido?.inicio === s.inicio;
                        return (
                          <li key={s.inicio}>
                            <button
                              type="button"
                              aria-pressed={escolhido}
                              onClick={() => setSlotEscolhido(escolhido ? null : s)}
                              className={`min-h-[2.5rem] rounded-xl px-3.5 py-2 text-sm font-medium tabular-nums transition-colors ${
                                escolhido
                                  ? "bg-brand text-white"
                                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                              }`}
                            >
                              {s.hora}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              {slotEscolhido && (
                <div className="mt-5 space-y-4 rounded-2xl bg-cream p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                    <Clock size={15} aria-hidden />
                    <span className="capitalize">{rotularDia(slotEscolhido.dia)}</span>, às {slotEscolhido.hora}
                  </p>

                  {cc.modalidades.length > 1 && (
                    <fieldset>
                      <legend className="text-sm font-medium text-stone-600">Modalidade</legend>
                      <div className="mt-2 flex gap-2">
                        {cc.modalidades.map((m) => (
                          <button
                            key={m}
                            type="button"
                            aria-pressed={modalidade === m}
                            onClick={() => setModalidade(m)}
                            className={`min-h-[2.25rem] rounded-xl px-3.5 py-2 text-sm font-medium capitalize transition-colors ${
                              modalidade === m ? "bg-brand text-white" : "bg-white text-stone-700 hover:bg-stone-100"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  <label className="block">
                    <span className="text-sm font-medium text-stone-600">Assunto (opcional)</span>
                    <textarea
                      value={assunto}
                      onChange={(e) => setAssunto(e.target.value.slice(0, 500))}
                      rows={3}
                      placeholder="O que queres tratar nesta consulta."
                      className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </label>

                  <Button onClick={marcar} disabled={ocupado}>
                    {ocupado ? "A marcar…" : "Pedir consulta"}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
