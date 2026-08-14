"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CASO, DO LADO DE QUEM O DESCREVEU
//  ---------------------------------------------------------------------
//  Três coisas, por esta ordem: em que pé está, o que já foi proposto, e
//  o que foi dito.
//
//  A conversa aqui NÃO se parece com um chat, e é de propósito. Um chat
//  promete que se escreve e chega; isto é uma caixa de correio com
//  revisão pelo meio. As mensagens têm estado à vista — «à espera de
//  revisão», «devolvida» — porque esconder isso seria deixar a pessoa a
//  achar que o outro lado a ignorou.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth";
import { useAvisos } from "@/components/ui/Avisos";
import Button from "@/components/ui/Button";
import LeitorDeProposta from "@/components/casos/LeitorDeProposta";
import {
  ArrowLeft, Clock, Check, Warning, Lock, Spinner, ShieldCheck,
} from "@/components/ui/Icons";
import {
  obterCaso, listarMensagensDoCaso, listarPropostas, submeterMensagem,
  estadoDoCasoLegivel, AREAS, URGENCIAS, euros,
  type Caso, type MensagemDoCaso, type Proposta,
} from "@/lib/contabilistas/casos";

export default function DetalheDoCaso() {
  const { id } = useParams<{ id: string }>();
  const { user, carregado } = useAuth();
  const avisos = useAvisos();

  const [caso, setCaso] = useState<Caso | null>(null);
  const [mensagens, setMensagens] = useState<MensagemDoCaso[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [texto, setTexto] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  const carregar = useCallback(async () => {
    const [c, m, p] = await Promise.all([
      obterCaso(id), listarMensagensDoCaso(id), listarPropostas(id),
    ]);
    setCaso(c); setMensagens(m); setPropostas(p); setACarregar(false);
  }, [id]);

  useEffect(() => {
    if (!carregado) return;
    carregar().catch(() => setACarregar(false));
  }, [carregado, carregar]);

  async function enviar() {
    if (!user || !texto.trim()) return;
    setAEnviar(true);
    const { erro } = await submeterMensagem(id, user.id, "cliente", texto);
    setAEnviar(false);
    if (erro) { avisos.erro(erro); return; }
    setTexto("");
    avisos.sucesso("Mensagem submetida.", {
      detalhe: "Vamos lê-la antes de a encaminhar. Avisamos-te se precisar de um ajuste.",
    });
    void carregar();
  }

  if (aCarregar) {
    return <div className="h-96 animate-pulse rounded-4xl bg-stone-100" />;
  }
  if (!caso) {
    return (
      <div className="rounded-4xl border border-stone-200 bg-white p-6 text-center shadow-card">
        <p className="font-display text-lg text-ink">Não encontrámos este caso</p>
        <p className="mt-1.5 text-sm text-stone-500">Talvez já não exista, ou não seja teu.</p>
        <Link href="/dashboard/casos" className="mt-4 inline-block">
          <Button variant="secondary">Voltar aos meus casos</Button>
        </Link>
      </div>
    );
  }

  const { titulo, explicacao } = estadoDoCasoLegivel(caso.estado);
  const area = AREAS.find((a) => a.id === caso.area);
  const urgencia = URGENCIAS.find((u) => u.id === caso.urgencia);
  const porDecidir = propostas.filter((p) => p.estado === "enviada" || p.estado === "lida");
  const historico = propostas.filter((p) => p.estado !== "enviada" && p.estado !== "lida");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/casos"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-800"
        >
          <ArrowLeft size={14} aria-hidden /> Os meus casos
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs tabular-nums text-stone-400">{caso.referencia}</span>
          {area && (
            <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
              {area.titulo}
            </span>
          )}
          {urgencia && caso.urgencia !== "normal" && (
            <span className="rounded-lg bg-alert-bg px-2 py-0.5 text-[11px] font-semibold text-alert-text">
              {urgencia.titulo}
            </span>
          )}
        </div>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">
          {caso.assunto}
        </h1>
      </div>

      {/* Em que pé está. Primeiro, porque é a pergunta com que se abre a página. */}
      <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
        <p className="eyebrow">Estado</p>
        <p className="mt-1 font-display text-xl text-ink">{titulo}</p>
        <p className="mt-1 text-sm leading-relaxed text-stone-500">{explicacao}</p>

        {caso.notaTriagem && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-alert-bg px-4 py-3 text-xs leading-relaxed text-alert-text">
            <Warning size={13} className="mt-0.5 shrink-0" aria-hidden /> {caso.notaTriagem}
          </p>
        )}

        {caso.orcamentoCents !== null && (
          <p className="mt-3 text-xs text-stone-500">
            Disseste que estavas disposto a gastar{" "}
            <strong className="tabular-nums text-stone-700">{euros(caso.orcamentoCents)}</strong>.
          </p>
        )}
      </section>

      {porDecidir.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl text-ink">
            {porDecidir.length === 1 ? "Tens uma proposta" : `Tens ${porDecidir.length} propostas`}
          </h2>
          {porDecidir.length > 1 && (
            <p className="text-sm leading-relaxed text-stone-500">
              Lê as duas antes de decidires. Aceitar uma fecha as outras — ficam no histórico,
              mas deixam de estar em jogo.
            </p>
          )}
          {porDecidir.map((p) => (
            <LeitorDeProposta key={p.id} proposta={p} aoDecidir={() => void carregar()} />
          ))}
        </section>
      )}

      {historico.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-ink">Propostas anteriores</h2>
          <ul className="mt-3 space-y-2">
            {historico.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl border border-stone-200 bg-white/60 px-4 py-3"
              >
                <span className="text-sm tabular-nums text-stone-600">{euros(p.valorCents)}</span>
                <span className="text-xs text-stone-400">
                  {p.estado === "aceite" ? "Aceite"
                    : p.estado === "recusada" ? "Recusada"
                    : p.estado === "substituida" ? "Substituída por outra"
                    : p.estado === "desconto_pedido" ? "Pediste desconto"
                    : "Expirada"}
                  {p.decididaEm && ` · ${new Date(p.decididaEm).toLocaleDateString("pt-PT")}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* A conversa. Não se parece com um chat porque não é um. */}
      <section className="rounded-4xl border border-stone-200 bg-white shadow-card">
        <header className="border-b border-stone-100 px-5 py-4 sm:px-6">
          <h2 className="font-display text-xl text-ink">Mensagens</h2>
          <p className="mt-1 flex items-start gap-2 text-xs leading-relaxed text-stone-500">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden />
            Tudo o que escreveres passa por nós antes de seguir. Não é um canal privado — é o que
            impede que os teus contactos cheguem ao outro lado sem tu quereres.
          </p>
        </header>

        <ul className="divide-y divide-stone-100">
          {mensagens.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-stone-400 sm:px-6">
              Ainda não há mensagens neste caso.
            </li>
          )}
          {mensagens.map((m) => {
            const minha = m.autorPapel === "cliente";
            return (
              <li key={m.id} className="px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-stone-700">
                    {minha ? "Tu" : "O contabilista"}
                  </span>
                  <span className="text-[11px] tabular-nums text-stone-400">
                    {new Date(m.criadoEm).toLocaleDateString("pt-PT", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  {minha && <EstadoDaMensagem estado={m.estado} />}
                </div>

                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                  {m.corpoEncaminhado ?? m.corpo}
                </p>

                {/* Se foi redigida, dizemo-lo. Encaminhar uma versão
                    diferente sem avisar seria pôr palavras na boca de alguém. */}
                {minha && m.corpoEncaminhado && (
                  <p className="mt-2 rounded-2xl bg-stone-50 px-3 py-2 text-[11px] leading-relaxed text-stone-500">
                    Encaminhámos esta mensagem com um ajuste, para não levar contactos consigo.
                    O que escreveste fica guardado tal como o escreveste.
                  </p>
                )}

                {m.notaRevisao && (
                  <p className="mt-2 flex items-start gap-2 rounded-2xl bg-alert-bg px-3 py-2 text-[11px] leading-relaxed text-alert-text">
                    <Warning size={12} className="mt-0.5 shrink-0" aria-hidden /> {m.notaRevisao}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {caso.estado !== "fechado" && caso.estado !== "recusado" && (
          <div className="border-t border-stone-100 p-5 sm:p-6">
            <label htmlFor="nova-mensagem" className="block text-sm font-semibold text-stone-700">
              Escrever
            </label>
            <textarea
              id="nova-mensagem"
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, 4000))}
              placeholder="Uma pergunta, um esclarecimento, o que faltar dizer."
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] text-stone-400">
                <Lock size={12} aria-hidden /> Não escrevas aqui o teu contacto — não segue.
              </p>
              <Button onClick={() => void enviar()} disabled={!texto.trim() || aEnviar}>
                {aEnviar ? <><Spinner size={14} /> A submeter…</> : "Submeter para revisão"}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/** O estado da mensagem, dito a quem a escreveu. */
function EstadoDaMensagem({ estado }: { estado: MensagemDoCaso["estado"] }) {
  const mapa = {
    submetida: { texto: "À espera de revisão", Icon: Clock, cor: "bg-stone-100 text-stone-500" },
    aprovada: { texto: "Encaminhada", Icon: Check, cor: "bg-brand-light text-brand-dark" },
    devolvida: { texto: "Devolvida", Icon: Warning, cor: "bg-alert-bg text-alert-text" },
    recusada: { texto: "Não encaminhada", Icon: Warning, cor: "bg-alert-bg text-alert-text" },
  }[estado];

  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold ${mapa.cor}`}>
      <mapa.Icon size={10} aria-hidden /> {mapa.texto}
    </span>
  );
}
