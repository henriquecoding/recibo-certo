"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CASO, DO LADO DE QUEM O DESCREVEU
//  ---------------------------------------------------------------------
//  Três coisas, por esta ordem: em que pé está, o que já foi proposto, e
//  o que foi dito.
//
//  A conversa É um chat, e passou a poder chamar-se isso. Era uma caixa
//  de correio com revisão pelo meio, e as mensagens andavam com o estado à
//  vista porque podiam ficar pelo caminho. Deixou de haver caminho onde
//  ficar: escreve-se e chega.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth";
import { useAvisos } from "@/components/ui/Avisos";
import Button from "@/components/ui/Button";
import LeitorDeProposta from "@/components/casos/LeitorDeProposta";
import { ArrowLeft, Warning } from "@/components/ui/Icons";
import Ficheiros from "@/components/casos/Ficheiros";
import ConversaDoCaso from "@/components/casos/ConversaDoCaso";
import EscolherContabilistas from "@/components/casos/EscolherContabilistas";
import { PartilhaDeContactos } from "@/components/casos/Contactos";
import {
  obterCaso, listarMensagensDoCaso, listarPropostas, enviarMensagemDoCaso,
  listarDocumentosDoCaso, escutarCaso,
  estadoDoCasoLegivel, AREAS, URGENCIAS, euros,
  type Caso, type MensagemDoCaso, type Proposta, type DocumentoDoCaso,
} from "@/lib/contabilistas/casos";

export default function DetalheDoCaso() {
  const { id } = useParams<{ id: string }>();
  const { user, carregado } = useAuth();
  const avisos = useAvisos();

  const [caso, setCaso] = useState<Caso | null>(null);
  const [mensagens, setMensagens] = useState<MensagemDoCaso[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoDoCaso[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [aEnviar, setAEnviar] = useState(false);

  const carregar = useCallback(async () => {
    const [c, m, p, d] = await Promise.all([
      obterCaso(id), listarMensagensDoCaso(id), listarPropostas(id),
      listarDocumentosDoCaso(id),
    ]);
    setCaso(c); setMensagens(m); setPropostas(p); setDocumentos(d); setACarregar(false);
  }, [id]);

  useEffect(() => {
    if (!carregado) return;
    carregar().catch(() => setACarregar(false));
  }, [carregado, carregar]);

  // Sem isto, a pessoa fica sem saber se a mensagem foi aprovada e
  // recarrega a página à espera de uma resposta que já lá está.
  useEffect(() => {
    if (!carregado || !user) return;
    return escutarCaso(id, () => { void carregar(); });
  }, [carregado, user, id, carregar]);

  async function enviar(texto: string) {
    if (!user) return;
    setAEnviar(true);
    const { erro } = await enviarMensagemDoCaso(id, user.id, "cliente", texto);
    setAEnviar(false);
    if (erro) { avisos.erro(erro); return; }
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

      {caso.estado !== "fechado" && caso.estado !== "recusado" && caso.estado !== "aceite" && (
        <EscolherContabilistas
          casoId={caso.id}
          area={caso.area}
          aoMudar={() => void carregar()}
        />
      )}

      <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
        <h2 className="font-display text-lg text-ink">Documentos</h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-500">
          Faturas, declarações, o que ajudar a perceber a situação. Seguem para quem
          estiver a tratar do teu caso, e para mais ninguém.
        </p>
        <div className="mt-3">
          <Ficheiros
            contexto="caso"
            alvo={caso.id}
            ficheiros={documentos}
            podeAnexar={caso.estado !== "fechado" && caso.estado !== "recusado"}
            explicaLibertacao
            aoMudar={() => void carregar()}
          />
        </div>
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

      <ConversaDoCaso
        mensagens={mensagens}
        meuPapel="cliente"
        nomeDoOutro="O contabilista"
        podeEscrever={caso.estado !== "fechado" && caso.estado !== "recusado"}
        aEnviar={aEnviar}
        aoEnviar={enviar}
        aoMudar={() => void carregar()}
      />

      {/* Depois da conversa: só faz sentido decidir sobre os contactos
          depois de se perceber com quem se está a falar. */}
      <PartilhaDeContactos
        casoId={caso.id}
        ligado={caso.partilhaContactos}
        aoMudar={() => void carregar()}
      />

    </div>
  );
}
