"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A CONVERSA DO CASO — direta, dos dois lados
//  ---------------------------------------------------------------------
//  Havia duas conversas escritas à mão, uma em cada painel, e as duas
//  diziam a mesma coisa errada: «passa por revisão», «submeter», «não
//  escrevas aqui o teu contacto». Quando isso deixou de ser verdade,
//  corrigir em dois sítios era garantir que um deles ficava a mentir.
//
//  Passa a haver um componente só. O que muda entre os dois painéis é
//  quem é «eu» e quem é «o outro» — e isso são dois adereços, não duas
//  implementações.
//
//  O QUE ESTE ECRÃ PROMETE, E CUMPRE
//  ---------------------------------
//  Que o que aqui se escreve vai para uma pessoa e não para três. A
//  administração não alcança estas linhas: a política de
//  `20260818210000_fim_da_mediacao` não a inclui, e a única forma de uma
//  mensagem lá chegar é alguém desta conversa a denunciar — o botão está
//  aqui, em cada mensagem do outro, e diz exatamente o que faz.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
import { Flag, Lock, Spinner, Warning } from "@/components/ui/Icons";
import {
  denunciarMensagem, mensagemVisivel, type MensagemDoCaso,
} from "@/lib/contabilistas/fonte/casos";

const MOTIVO_MAX = 1000;

export default function ConversaDoCaso({
  mensagens,
  meuPapel,
  nomeDoOutro,
  podeEscrever,
  aEnviar,
  aoEnviar,
  aoMudar,
}: {
  mensagens: MensagemDoCaso[];
  meuPapel: "cliente" | "contabilista";
  /** Como o outro lado se chama nesta conversa. Ex.: «O contabilista». */
  nomeDoOutro: string;
  podeEscrever: boolean;
  aEnviar: boolean;
  aoEnviar: (texto: string) => Promise<void>;
  /** Chamado depois de uma denúncia, para a página recarregar. */
  aoMudar?: () => void;
}) {
  const [texto, setTexto] = useState("");

  // As antigas — devolvidas ou recusadas pela revisão que já não existe —
  // continuam a ser visíveis a quem as escreveu, e a mais ninguém. Mostrá-las
  // ao outro lado agora seria entregar o que alguém foi informado que não seguia.
  const visiveis = mensagens.filter(
    (m) => mensagemVisivel(m.estado) || m.autorPapel === meuPapel,
  );

  async function enviar() {
    const corpo = texto.trim();
    if (!corpo || aEnviar) return;
    await aoEnviar(corpo);
    setTexto("");
  }

  return (
    <section className="rounded-4xl border border-stone-200 bg-white shadow-card">
      <header className="border-b border-stone-100 px-5 py-4 sm:px-6">
        <h2 className="font-display text-xl text-ink">Mensagens</h2>
        <p className="mt-1 flex items-start gap-2 text-xs leading-relaxed text-stone-500">
          <Lock size={13} className="mt-0.5 shrink-0" aria-hidden />
          Esta conversa é entre vocês os dois. Ninguém do Recibo Certo a lê — só
          chega até nós uma mensagem que um de vocês nos entregue.
        </p>
      </header>

      <ul className="divide-y divide-stone-100">
        {visiveis.length === 0 && (
          <li className="px-5 py-6 text-center text-sm text-stone-400 sm:px-6">
            Ainda não há mensagens neste caso.
          </li>
        )}
        {visiveis.map((m) => (
          <Linha
            key={m.id}
            mensagem={m}
            minha={m.autorPapel === meuPapel}
            nomeDoOutro={nomeDoOutro}
            aoMudar={aoMudar}
          />
        ))}
      </ul>

      {podeEscrever && (
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
            <p className="text-[11px] tabular-nums text-stone-400">
              {texto.length} / 4000
            </p>
            <Button onClick={() => void enviar()} disabled={!texto.trim() || aEnviar}>
              {aEnviar ? <><Spinner size={14} /> A enviar…</> : "Enviar"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Linha({
  mensagem: m,
  minha,
  nomeDoOutro,
  aoMudar,
}: {
  mensagem: MensagemDoCaso;
  minha: boolean;
  nomeDoOutro: string;
  aoMudar?: () => void;
}) {
  const avisos = useAvisos();
  const [aDenunciar, setADenunciar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  // Uma mensagem que ficou para trás na revisão que já não existe. Quem a
  // escreveu tem de saber que ela nunca chegou — senão fica à espera de
  // resposta a algo que o outro lado não leu.
  const presaNoPassado = m.estado === "devolvida" || m.estado === "recusada";

  async function denunciar() {
    setOcupado(true);
    const { erro } = await denunciarMensagem(m.id, motivo);
    setOcupado(false);
    if (erro) { avisos.erro(erro); return; }
    setADenunciar(false);
    setMotivo("");
    avisos.sucesso("Entregue à administração.", {
      detalhe: "Só esta mensagem. O resto da conversa continua a ser vosso.",
    });
    aoMudar?.();
  }

  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-stone-700">
          {minha ? "Tu" : nomeDoOutro}
        </span>
        <span className="text-[11px] tabular-nums text-stone-400">
          {new Date(m.criadoEm).toLocaleDateString("pt-PT", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </span>
        {m.denunciadaEm && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-alert-bg px-1.5 py-0.5 text-[10px] font-semibold text-alert-text">
            <Flag size={10} aria-hidden /> Entregue à administração
          </span>
        )}
      </div>

      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
        {m.corpoEncaminhado ?? m.corpo}
      </p>

      {minha && presaNoPassado && (
        <p className="mt-2 flex items-start gap-2 rounded-2xl bg-alert-bg px-3 py-2 text-[11px] leading-relaxed text-alert-text">
          <Warning size={12} className="mt-0.5 shrink-0" aria-hidden />
          Esta mensagem ficou parada na revisão que existia antes e nunca chegou ao
          outro lado. Se ainda fizer sentido, escreve-a de novo — agora vai direta.
        </p>
      )}

      {!minha && !m.denunciadaEm && (
        <div className="mt-2">
          {!aDenunciar ? (
            <button
              type="button"
              onClick={() => setADenunciar(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px] text-stone-400 transition-colors hover:bg-stone-100 hover:text-clay-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <Flag size={11} aria-hidden /> Denunciar esta mensagem
            </button>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-cream p-3">
              <label
                htmlFor={`motivo-${m.id}`}
                className="block text-[11px] font-semibold text-stone-700"
              >
                O que se passa com esta mensagem?
              </label>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                Ao enviar, <strong>esta mensagem</strong> — e só esta — passa a poder ser
                lida pela administração do Recibo Certo. O resto da conversa continua fora
                do alcance de qualquer pessoa que não sejas tu ou o outro lado.
              </p>
              <textarea
                id={`motivo-${m.id}`}
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value.slice(0, MOTIVO_MAX))}
                className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => { setADenunciar(false); setMotivo(""); }}
                  disabled={ocupado}
                >
                  Afinal não
                </Button>
                <Button onClick={() => void denunciar()} disabled={!motivo.trim() || ocupado}>
                  {ocupado ? <><Spinner size={14} /> A enviar…</> : "Entregar à administração"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
