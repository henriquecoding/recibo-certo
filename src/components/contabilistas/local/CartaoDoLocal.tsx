"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «COMO CHEGO LÁ?» — a resposta, em cartão
//  ---------------------------------------------------------------------
//  O mesmo componente serve os dois lados da relação, e isso é de
//  propósito: o contabilista tem de ver EXATAMENTE o que o cliente vai ver.
//  Um compositor que mostra uma coisa a quem escreve e outra a quem lê é um
//  compositor que produz enganos.
//
//  Três formas, conforme o canal:
//
//   · videochamada — a plataforma tem nome, o botão diz «entrar», e o
//     endereço fica visível e copiável para quem entra de outro aparelho;
//   · telefone — o número marca-se com um toque e copia-se com outro;
//   · presencial — a morada, o mapa com o pino onde ele foi mesmo posto, e
//     as ligações para as aplicações que dão direções a sério.
//
//  Quando não há ponto (consultas anteriores à migração do local
//  verificado), diz-se: as ligações passam a ser uma PESQUISA pela morada,
//  e a interface não finge que sabe onde é.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  Check, Copy, ExternalLink, Laptop, MapPin, Smartphone, ShieldCheck,
} from "@/components/ui/Icons";
import {
  ligacoesDeMapa, nomeDoCanal, type LocalDaConsulta,
} from "@/lib/contabilistas/local-consulta";
import { MapaDoLocalLazy } from "./mapas-lazy";

export default function CartaoDoLocal({
  local, comMapa = true, tom = "claro",
}: {
  local: LocalDaConsulta;
  /** O mapa pode ser desligado onde não há espaço (listas, resumos). */
  comMapa?: boolean;
  /** `sobre-cor` para quando o cartão vive sobre um fundo já colorido. */
  tom?: "claro" | "sobre-cor";
}) {
  const caixa =
    tom === "sobre-cor"
      ? "border-white/50 bg-white/70 dark:border-white/10 dark:bg-white/10"
      : "border-stone-200 bg-cream";

  const Icone = local.tipo === "presencial" ? MapPin : local.tipo === "telefone" ? Smartphone : Laptop;

  return (
    <div className={`overflow-hidden rounded-2xl border ${caixa}`}>
      <div className="flex items-start gap-2.5 px-4 py-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
          <Icone size={15} aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-stone-400">
            {nomeDoCanal(local)}
          </p>

          {local.tipo === "presencial" ? (
            <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-stone-800">
              {local.texto}
            </p>
          ) : local.tipo === "telefone" ? (
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-stone-800">{local.texto}</p>
          ) : (
            <p className="mt-0.5 break-all text-xs leading-relaxed text-stone-500">{local.texto}</p>
          )}
        </div>
      </div>

      {local.tipo === "presencial" ? (
        <LocalPresencial local={local} comMapa={comMapa} />
      ) : (
        <LocalRemoto local={local} />
      )}
    </div>
  );
}

// ─── Presencial ────────────────────────────────────────────────────────

function LocalPresencial({ local, comMapa }: { local: LocalDaConsulta; comMapa: boolean }) {
  const ligacoes = ligacoesDeMapa(local.texto, local.ponto);

  return (
    <>
      {comMapa && local.ponto && (
        <div className="border-y border-stone-200/70">
          <MapaDoLocalLazy ponto={local.ponto} morada={local.texto} altura={150} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
        <LigacaoExterna href={ligacoes.google}>Google Maps</LigacaoExterna>
        <LigacaoExterna href={ligacoes.apple}>Apple Maps</LigacaoExterna>
        <LigacaoExterna href={ligacoes.osm}>OpenStreetMap</LigacaoExterna>
        <BotaoCopiar valor={local.texto} rotulo="Copiar morada" />
      </div>

      <p className="flex items-start gap-1.5 px-4 pb-3 text-[0.6875rem] leading-relaxed text-stone-400">
        {ligacoes.exato ? (
          <>
            <ShieldCheck size={12} className="mt-0.5 shrink-0" aria-hidden />
            Ponto marcado no mapa pelo contabilista — as ligações abrem exatamente aqui.
          </>
        ) : (
          <>
            <MapPin size={12} className="mt-0.5 shrink-0" aria-hidden />
            Sem ponto no mapa: as ligações fazem uma pesquisa por esta morada.
          </>
        )}
      </p>
    </>
  );
}

// ─── Online ────────────────────────────────────────────────────────────

function LocalRemoto({ local }: { local: LocalDaConsulta }) {
  if (!local.ligacao) {
    return (
      <p className="px-4 pb-3 text-[0.6875rem] leading-relaxed text-stone-400">
        Endereço guardado como texto. Copia-o para o navegador se não abrir sozinho.
      </p>
    );
  }

  const eTelefone = local.tipo === "telefone";

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
      <a
        href={local.ligacao}
        {...(eTelefone ? {} : { target: "_blank", rel: "noopener noreferrer nofollow" })}
        className="inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-dark"
      >
        {eTelefone ? <Smartphone size={13} aria-hidden /> : <ExternalLink size={13} aria-hidden />}
        {eTelefone ? "Ligar" : "Entrar na chamada"}
      </a>
      <BotaoCopiar valor={eTelefone ? local.texto : local.ligacao} rotulo={eTelefone ? "Copiar número" : "Copiar link"} />
    </div>
  );
}

// ─── Peças ─────────────────────────────────────────────────────────────

function LigacaoExterna({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 transition-colors hover:border-brand/40 hover:text-brand-dark"
    >
      <ExternalLink size={12} aria-hidden />
      {children}
    </a>
  );
}

/**
 * Copiar sem sair do sítio.
 *
 * `navigator.clipboard` não existe fora de contexto seguro e pode ser
 * recusado — o botão diz o que aconteceu em vez de fingir que copiou.
 */
function BotaoCopiar({ valor, rotulo }: { valor: string; rotulo: string }) {
  const [estado, setEstado] = useState<"pronto" | "feito" | "falhou">("pronto");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setEstado("feito");
    } catch {
      setEstado("falhou");
    }
    setTimeout(() => setEstado("pronto"), 2200);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 transition-colors hover:border-brand/40 hover:text-brand-dark"
    >
      {estado === "feito" ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
      <span aria-live="polite">
        {estado === "feito" ? "Copiado" : estado === "falhou" ? "Não deu — copia à mão" : rotulo}
      </span>
    </button>
  );
}
