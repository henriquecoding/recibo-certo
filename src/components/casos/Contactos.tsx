"use client";

// ═══════════════════════════════════════════════════════════════════════
//  OS CONTACTOS — dados de quem os dá, entregues por quem os deu
//  ---------------------------------------------------------------------
//  Durante um tempo, a plataforma guardava o email e o telefone do cliente
//  e não os deixava chegar ao contabilista de maneira nenhuma. Nem
//  escritos à mão numa mensagem: havia um gatilho a recusar o texto.
//
//  A intenção era proteger a relação. O efeito era outro: duas pessoas que
//  queriam falar tinham uma parede pelo meio, e a plataforma ficava com a
//  obrigação de ler tudo para a manter de pé.
//
//  Agora a decisão é de quem os contactos são. Um interruptor, ligado por
//  omissão — descrever um caso é pedir para ser contactado —, desligável a
//  qualquer momento, e com o efeito imediato: a política lê a coluna.
//
//  Dois componentes, um por lado da mesma coluna:
//   · `PartilhaDeContactos` — o cliente decide.
//   · `ContactosDoCliente`  — o contabilista vê o que lhe foi dado.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import { Lock, Mail, Phone, MapPin, Spinner } from "@/components/ui/Icons";
import {
  definirPartilhaDeContactos, obterContactos,
} from "@/lib/contabilistas/fonte/casos";

/* ── O lado do cliente ─────────────────────────────────────────────── */

export function PartilhaDeContactos({
  casoId,
  ligado,
  aoMudar,
}: {
  casoId: string;
  ligado: boolean;
  aoMudar?: (novo: boolean) => void;
}) {
  const avisos = useAvisos();
  const [estado, setEstado] = useState(ligado);
  const [ocupado, setOcupado] = useState(false);

  // O adereço manda quando a página recarrega: sem isto, desligar num
  // separador e recarregar noutro deixava dois ecrãs a discordar.
  useEffect(() => { setEstado(ligado); }, [ligado]);

  async function alternar() {
    const novo = !estado;
    setOcupado(true);
    const { erro } = await definirPartilhaDeContactos(casoId, novo);
    setOcupado(false);
    if (erro) { avisos.erro(erro); return; }
    setEstado(novo);
    aoMudar?.(novo);
    avisos.sucesso(
      novo ? "Os teus contactos ficam visíveis." : "Os teus contactos deixaram de estar visíveis.",
      {
        detalhe: novo
          ? "Quem estiver a tratar do teu caso pode ligar-te ou escrever-te fora daqui."
          : "A partir de agora só te chegam pelas mensagens deste caso.",
      },
    );
  }

  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="font-display text-lg text-ink">Os teus contactos</h2>
      <p className="mt-1 text-sm leading-relaxed text-stone-500">
        Enquanto isto estiver ligado, quem estiver a tratar do teu caso vê o teu email e
        o teu telefone, e pode falar contigo por fora. Desliga quando quiseres — deixam
        de estar ao alcance dele no instante em que desligas.
      </p>

      <button
        type="button"
        role="switch"
        aria-checked={estado}
        onClick={() => void alternar()}
        disabled={ocupado}
        className="mt-4 flex w-full items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-cream px-4 py-3 text-left transition-colors hover:border-stone-300 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-stone-800">
            Partilhar os meus contactos
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">
            {estado
              ? "Ligado — pode contactar-te por fora."
              : "Desligado — só falam pelas mensagens daqui."}
          </span>
        </span>
        <span
          aria-hidden
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            estado ? "bg-brand" : "bg-stone-300"
          }`}
        >
          {ocupado ? (
            <Spinner size={12} className="mx-auto text-white" />
          ) : (
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                estado ? "translate-x-[1.375rem]" : "translate-x-0.5"
              }`}
            />
          )}
        </span>
      </button>
    </section>
  );
}

/* ── O lado do contabilista ────────────────────────────────────────── */

interface Contactos {
  email: string;
  telefone: string | null;
  morada: string | null;
}

export function ContactosDoCliente({ casoId }: { casoId: string }) {
  const [contactos, setContactos] = useState<Contactos | null>(null);
  const [aCarregar, setACarregar] = useState(true);

  useEffect(() => {
    let vivo = true;
    obterContactos(casoId)
      .then((c) => { if (vivo) { setContactos(c); setACarregar(false); } })
      // Sem partilha, a política devolve zero linhas e isto cai aqui. Não é
      // um erro: é a resposta certa a uma pergunta que não tinha de ter
      // resposta.
      .catch(() => { if (vivo) setACarregar(false); });
    return () => { vivo = false; };
  }, [casoId]);

  if (aCarregar) {
    return <div className="h-24 animate-pulse rounded-3xl bg-stone-100" />;
  }

  if (!contactos) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-cream px-4 py-3">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-stone-500">
          <Lock size={13} className="mt-0.5 shrink-0" aria-hidden />
          Esta pessoa não está a partilhar os contactos. Falem pelas mensagens do caso —
          e se ela mudar de ideias, aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white px-4 py-3">
      <p className="eyebrow">Como falar com esta pessoa</p>
      <ul className="mt-2 space-y-1.5">
        <li className="flex items-center gap-2 text-sm text-stone-700">
          <Mail size={14} className="shrink-0 text-stone-400" aria-hidden />
          <a
            href={`mailto:${contactos.email}`}
            className="break-all underline decoration-stone-300 underline-offset-2 hover:text-brand-dark"
          >
            {contactos.email}
          </a>
        </li>
        {contactos.telefone && (
          <li className="flex items-center gap-2 text-sm text-stone-700">
            <Phone size={14} className="shrink-0 text-stone-400" aria-hidden />
            <a
              href={`tel:${contactos.telefone.replace(/\s/g, "")}`}
              className="tabular-nums underline decoration-stone-300 underline-offset-2 hover:text-brand-dark"
            >
              {contactos.telefone}
            </a>
          </li>
        )}
        {contactos.morada && (
          <li className="flex items-start gap-2 text-sm text-stone-700">
            <MapPin size={14} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
            <span>{contactos.morada}</span>
          </li>
        )}
      </ul>
      <p className="mt-2.5 text-[11px] leading-relaxed text-stone-400">
        Foi esta pessoa que decidiu partilhar isto contigo, e pode voltar atrás quando
        quiser. Usa para tratar deste caso — não para outra coisa.
      </p>
    </div>
  );
}
