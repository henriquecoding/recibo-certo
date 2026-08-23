"use client";

// Perfil público + marcação de consulta.
//
// ⚠️ Marcar consulta e enviar simulações NÃO verificam o plano, e não podem
// passar a verificar — ver `PARTILHA_NUNCA_EXIGE_PLUS` em
// `src/lib/contabilistas/vinculo.ts`, coberto por teste.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import {
  marcarConsulta, meuVinculo, obterContabilistaPorSlug, obterDisponibilidade,
  obterExcecoes, ocupadosDe, pedirVinculo,
} from "@/lib/contabilistas/dados";
import type { Contabilista, Modalidade } from "@/lib/contabilistas/tipos";
import {
  agruparPorDia, diaLocal, gerarSlots,
  type Excecao, type RegraDisponibilidade, type Slot,
} from "@/lib/contabilistas/agenda";
import { podeAgendar, podePedirVinculo, vinculoAtivo } from "@/lib/contabilistas/vinculo";
import { estadoOcc } from "@/lib/contabilistas/diretorio";
import { eurosDeCents, valorComDesconto } from "@/lib/contabilistas/fidelidade";
import { comoOClienteVe } from "@/lib/contabilistas/stripe/estado";
import {
  descreverBagagem, lerBagagem, limparBagagem, type Bagagem,
} from "@/lib/contabilistas/bagagem";
import Button from "@/components/ui/Button";
import EnviarAoContabilista from "@/components/contabilistas/EnviarAoContabilista";
import BlocosDoPerfil from "@/components/contabilistas/BlocosDoPerfil";
import { lerTermos } from "@/lib/contabilistas/personalizacao/taxonomia";
import {
  descreverCobertura, lerCobertura,
} from "@/lib/contabilistas/personalizacao/cobertura";
import Badge from "@/components/ui/Badge";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import LinkedInPublico from "@/components/contabilistas/LinkedInPublico";
import { primeiroNome } from "@/components/contabilistas/hub";
import Marcacao from "@/components/contabilistas/Marcacao";
import { useAvisos } from "@/components/ui/Avisos";
import {
  Calendar, Gift, Lock, MapPin, PaperClip, ShieldCheck, Warning,
} from "@/components/ui/Icons";

const JANELA_DIAS = 30;

export default function PerfilPublico({ slug }: { slug: string }) {
  const { user, carregado, abrirModal } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const avisos = useAvisos();
  const [cc, setCc] = useState<Contabilista | null>(null);
  const [regras, setRegras] = useState<RegraDisponibilidade[]>([]);
  const [excecoes, setExcecoes] = useState<Excecao[]>([]);
  const [ocupados, setOcupados] = useState<{ inicio: string; fim: string }[]>([]);
  const [estadoVinculo, setEstadoVinculo] = useState<string | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [aLer, setALer] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupadoBotao] = useState(false);
  /**
   * O que o cliente decide dar ao pedir o vínculo.
   *
   * Vazio é um resultado legítimo: o pedido segue à mesma e o contabilista
   * vê um identificador curto. É por isso que isto é um formulário e não um
   * botão — um botão que envia o nome sem perguntar não é uma escolha.
   */
  const [aApresentar, setAApresentar] = useState(false);
  const [nomeParaOContabilista, setNome] = useState("");
  const [recado, setRecado] = useState("");
  /**
   * O que a pessoa trouxe da ferramenta de onde veio.
   *
   * Só existe quando o endereço traz `?de=<ferramenta>` E há, neste
   * dispositivo, uma bagagem daquela ferramenta. Um `?de=` inventado à mão
   * não faz aparecer nada: a bagagem é local, e o endereço é só a chave.
   */
  const [bagagem, setBagagem] = useState<Bagagem | null>(null);

  const veioDe = params.get("de");
  useEffect(() => {
    setBagagem(veioDe ? lerBagagem(veioDe) : null);
  }, [veioDe]);

  const carregar = useCallback(async () => {
    setALer(true);
    try {
      const ficha = await obterContabilistaPorSlug(slug);
      if (!ficha) { setNaoEncontrado(true); return; }
      setCc(ficha);
      // A modalidade por omissão passou a ser escolhida dentro da marcação,
      // que é onde a pergunta se faz.

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
    setOcupadoBotao(true);
    const { erro: e } = await pedirVinculo({
      contabilistaId: cc.userId,
      clienteId: user.id,
      nomeCliente: nomeParaOContabilista,
      mensagem: recado,
    });
    setOcupadoBotao(false);
    if (e) { avisos.erro(e); return; }
    avisos.sucesso("Pedido enviado.", {
      detalhe: "Assim que for aceite, podes marcar consulta e enviar simulações.",
    });
    setEstadoVinculo("pendente");
    setAApresentar(false);
  }

  async function marcar({ slot, modalidade, assunto }: {
    slot: Slot; modalidade: Modalidade; assunto: string;
  }): Promise<boolean> {
    if (!cc || !user) return false;
    setOcupadoBotao(true);
    const { erro: e } = await marcarConsulta({
      contabilistaId: cc.userId,
      inicio: slot.inicio,
      fim: slot.fim,
      modalidade,
      assunto,
    });
    setOcupadoBotao(false);

    if (e) {
      // A colisão de horários é resolvida pela base de dados, não por uma
      // leitura anterior: dois pedidos ao mesmo tempo e o segundo falha a
      // ESCREVER. Recarregar aqui é o que faz o horário desaparecer da
      // grelha em vez de continuar a ser oferecido.
      avisos.erro(e, { detalhe: "A agenda foi atualizada com os horários que ainda estão livres." });
      await carregar();
      return false;
    }

    avisos.sucesso("Consulta pedida.", {
      detalhe: "O contabilista confirma, e a resposta aparece na tua área.",
      acao: { texto: "Ver as minhas consultas", onClick: () => router.push("/dashboard/contabilista") },
      duracaoMs: 9000,
    });
    await carregar();
    return true;
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
  // Os termos e a cobertura passam pelos motores antes de serem lidos: é
  // lá que uma entrada estragada é descartada em silêncio, em vez de
  // deixar a página de alguém em branco.
  const termos = lerTermos(cc.perfilTermos);
  const cobertura = cc.cobertura ? lerCobertura(cc.cobertura) : null;

  return (
    <main className="min-h-[100dvh] bg-cream">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <Link href="/contabilistas" className="text-sm font-medium text-stone-500 underline underline-offset-2">
          Diretório de contabilistas
        </Link>

        {bagagem && (
          <BarraDaBagagem
            bagagem={bagagem}
            nome={primeiroNome(cc.nome)}
            ativo={ativo}
            aceitaNovosClientes={cc.aceitaNovosClientes}
            aoDispensar={() => { limparBagagem(); setBagagem(null); }}
          />
        )}

        <header className="mt-4 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <LinkedInPublico contabilistaId={cc.userId} nome={cc.nome} />
              <div className="min-w-0">
                <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">{cc.nome}</h1>
                {/* O território, dito pelo motor de cobertura — que sabe a
                    diferença entre um escritório, uma zona e o país inteiro.
                    Sem cobertura definida, cai no concelho e no distrito
                    que sempre lá estiveram. */}
                {(cobertura || cc.concelho || cc.distrito) && (
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-stone-500">
                    <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden />
                    <span>
                      {cobertura
                        ? descreverCobertura(cobertura, cc.modalidades)
                        : [cc.concelho, cc.distrito].filter(Boolean).join(", ")}
                      {cobertura?.nota && (
                        <span className="block text-xs text-stone-400">{cobertura.nota}</span>
                      )}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ativo && <Badge tone="brand">És cliente</Badge>}
              {!cc.aceitaNovosClientes && !ativo && <Badge tone="neutral">Sem vagas</Badge>}
            </div>
          </div>

          {/* A mesma frase que o cartão do diretório mostra, vinda da mesma
              função: um perfil que diz «verificada» onde a lista dizia
              «informada» seriam duas verdades sobre a mesma inscrição (§50). */}
          {/* O selo, e o que ele quer dizer. «Verificada» sozinha não
              responde à pergunta seguinte — verificada por quem, e há
              quanto tempo? Um selo que não sabe responder a isso é um
              autocolante. A frase vem de `estadoOcc`, a mesma que o cartão
              do diretório usa (§50). */}
          {(() => {
            const occ = estadoOcc(cc);
            return (
              <div className="mt-3">
                <p className="flex items-center gap-1.5 text-sm text-stone-500">
                  <ShieldCheck
                    size={15}
                    className={occ.tom === "verificada" ? "text-brand" : "text-stone-400"}
                    aria-hidden
                  />
                  {occ.etiqueta}
                </p>
                {occ.detalhe && (
                  <p className="mt-1 pl-[21px] text-xs text-stone-400">{occ.detalhe}</p>
                )}
              </div>
            );
          })()}

          {cc.bio && (
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-stone-700">{cc.bio}</p>
          )}

          {(cc.especialidades.length > 0 || termos.length > 0) && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {cc.especialidades.map((e) => (
                <li key={e} className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">{e}</li>
              ))}
              {/* Os termos próprios, com o desenho trocado: são as palavras
                  da pessoa, e não uma das áreas do diretório. Parecerem
                  iguais faria passar por catálogo o que é texto livre. */}
              {termos.map((t, i) => (
                <li
                  key={`${t.texto}-${i}`}
                  className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-500"
                >
                  {t.texto}
                </li>
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
            {/* Como se paga. A pergunta é de quem está a decidir marcar, e
                até agora não tinha resposta em lado nenhum: marcava-se, e
                descobria-se pelo silêncio se havia botão de pagar.

                O que sai daqui é só o facto. Que a Stripe pediu um
                documento a alguém é informação privada, e das que fazem
                perder um cliente por uma razão que não é dele. */}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Pagamento
              </dt>
              <dd className="mt-0.5 flex items-start gap-1.5 text-stone-800">
                {cc.recebePagamentos ? (
                  <>
                    <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                    <span>{comoOClienteVe(true).rotulo}</span>
                  </>
                ) : (
                  <span className="text-stone-600">{comoOClienteVe(false).rotulo}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">Atendimento</dt>
              <dd className="mt-0.5 capitalize text-stone-800">{cc.modalidades.join(" e ")}</dd>
            </div>
            {/* ⚠️ AQUI ESTAVAM O EMAIL E O SITE, e saíam para quem não
                tinha sessão nenhuma. Saíram com o contrato público novo
                (20260820165708): um canal direto abre-se com a aceitação,
                não com a pesquisa. Quem quiser confirmar quem está do
                outro lado tem o OCC e o LinkedIn, logo acima — e esses
                são públicos de propósito. */}
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Contactos
              </dt>
              <dd className="mt-0.5 flex items-start gap-1.5 text-stone-600">
                <Lock size={14} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  Email, telefone e site ficam disponíveis quando
                  {" "}{primeiroNome(cc.nome)} te aceitar como cliente.
                </span>
              </dd>
            </div>
          </dl>
        </header>

        {/* A página que o contabilista compôs. Vem a seguir ao cabeçalho e
            antes da ação — é o que faz alguém decidir se quer marcar. */}
        <BlocosDoPerfil bruto={cc.perfilBlocos} />

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
              aApresentar && user ? (
                <div className="mt-4 space-y-4 rounded-2xl bg-cream p-4">
                  <p className="text-sm leading-relaxed text-stone-600">
                    Só segue o que escreveres aqui. Podes deixar tudo em branco — o pedido
                    vai na mesma, e {cc.nome.split(" ")[0]} vê um identificador em vez de um nome.
                  </p>

                  <label className="block">
                    <span className="text-sm font-semibold text-stone-700">
                      Como queres ser tratado?
                    </span>
                    <input
                      value={nomeParaOContabilista}
                      onChange={(e) => setNome(e.target.value.slice(0, 80))}
                      placeholder="O nome por que te conhecem"
                      autoComplete="name"
                      className="mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-stone-700">
                      Recado <span className="font-normal text-stone-400">(opcional)</span>
                    </span>
                    <textarea
                      value={recado}
                      onChange={(e) => setRecado(e.target.value.slice(0, 1000))}
                      rows={3}
                      placeholder="Em que precisas de ajuda."
                      className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </label>

                  <p className="text-xs leading-relaxed text-stone-500">
                    O nome fica só neste vínculo — não vem da tua conta, e desaparece
                    no instante em que terminares o acompanhamento. O teu email e o teu
                    telemóvel não seguem: o acompanhamento acontece todo aqui, onde
                    fica registado e onde podes revogar o que enviaste.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={ligar} disabled={ocupado}>
                      {ocupado ? "A enviar…" : "Enviar pedido"}
                    </Button>
                    <Button variant="ghost" onClick={() => setAApresentar(false)} disabled={ocupado}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="mt-4"
                  onClick={() => (user ? setAApresentar(true) : abrirModal("criar"))}
                  disabled={ocupado}
                >
                  {user ? "Pedir para ser cliente" : "Criar conta e pedir"}
                </Button>
              )
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
            <div className="mt-4">
              <Marcacao cc={cc} dias={dias} ocupado={ocupado} onMarcar={marcar} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CHEGAR COM BAGAGEM
//  ---------------------------------------------------------------------
//  Quem vem de uma ferramenta traz uma simulação. O que esta barra faz é
//  dizer-lho — e dizer, sem rodeios, o que acontece a seguir.
//
//  A frase que interessa é a do estado sem vínculo: «nada segue antes de
//  ele aceitar». É a verdade literal do sistema (a partilha exige vínculo
//  ativo, e a base de dados recusa-a sem ele), e é exatamente a dúvida de
//  quem acabou de carregar num botão que dizia «levar a minha simulação».
//  Deixá-la por responder era deixar alguém a pensar que os seus números
//  já tinham sido enviados a um desconhecido.
// ═══════════════════════════════════════════════════════════════════════

function BarraDaBagagem({
  bagagem, nome, ativo, aceitaNovosClientes, aoDispensar,
}: {
  bagagem: Bagagem;
  nome: string;
  ativo: boolean;
  aceitaNovosClientes: boolean;
  aoDispensar: () => void;
}) {
  return (
    <section
      aria-label="A simulação que trouxeste"
      className="mt-4 rounded-4xl border border-brand/25 bg-brand-light/50 p-4 dark:border-brand/30 dark:bg-brand/10 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[0.625rem] font-semibold uppercase tracking-wider text-brand-dark dark:text-brand-mint">
            <PaperClip size={13} aria-hidden /> Trazes uma simulação
          </p>
          <p className="mt-1 font-display text-lg leading-snug text-ink dark:text-stone-50">
            {bagagem.titulo}
          </p>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            {descreverBagagem(bagagem)}
          </p>
        </div>
        <button
          type="button"
          onClick={aoDispensar}
          className="focus-marca inline-flex min-h-[2.25rem] items-center rounded-xl px-3 text-sm font-medium text-stone-500 underline underline-offset-2 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          Não levar
        </button>
      </div>

      {ativo ? (
        <div className="mt-3">
          <EnviarAoContabilista
            tipo={bagagem.tipo}
            conteudo={bagagem.conteudo}
            toolId={bagagem.toolId}
            titulo={bagagem.titulo}
            variante="discreto"
            // A bagagem não se reescreve a si própria a partir do perfil:
            // o que está guardado é o que a ferramenta produziu, e voltar a
            // gravá-lo aqui só serviria para lhe mudar a data de validade.
            guardarComoBagagem={false}
          />
        </div>
      ) : (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-white/70 px-3.5 py-2.5 text-sm leading-relaxed text-stone-600 dark:bg-stone-900/50 dark:text-stone-300">
          <Lock size={14} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
          <span>
            {aceitaNovosClientes
              ? <>Fica guardada só neste dispositivo. Assim que {nome} aceitar o pedido, podes enviá-la — e vês os campos exatos antes de confirmar. <strong className="font-semibold text-stone-800 dark:text-stone-100">Nada segue antes disso.</strong></>
              : <>Fica guardada só neste dispositivo, e nada segue daqui. {nome} não está a aceitar clientes de momento — podes voltar ao diretório e escolher outra pessoa sem perder a simulação.</>}
          </span>
        </p>
      )}
    </section>
  );
}
