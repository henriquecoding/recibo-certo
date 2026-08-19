"use client";

// ═══════════════════════════════════════════════════════════════════════
//  CASOS — o que sobra do trabalho da administração
//  ---------------------------------------------------------------------
//  Este ecrã tinha dois separadores: rever mensagens e encaminhar casos.
//  Os dois obrigavam a mesma coisa — ler a conversa de duas pessoas que
//  não a escreveram para ninguém aqui. Um contabilista e o seu cliente
//  falam de dívidas, de divórcios e de dinheiro que não chegou; ter isso a
//  passar por um ecrã de administração todos os dias não é uma
//  salvaguarda, é uma pessoa a ler o que não devia.
//
//  Ficaram duas coisas, e nenhuma é leitura de conversa alheia:
//
//   · O QUE ESTÁ PARADO. Casos que ainda não foram entregues a ninguém.
//     Serve para saber que existem — a área, a data, quanto tempo estão à
//     espera. A situação escrita pela pessoa NÃO se abre aqui.
//
//   · O QUE NOS FOI ENTREGUE. Mensagens que uma das partes denunciou. É a
//     única forma de uma linha de `caso_mensagens` chegar à administração,
//     e não é uma regra deste ecrã: é a política da migração
//     `20260818210000`, que devolve zero linhas para tudo o resto.
//
//  Se um dia alguém abrir este ficheiro à procura de onde se leem as
//  conversas: não se leem. Não há aqui um filtro escondido — não há
//  caminho.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { Briefcase, Clock, Flag, Warning, Lock } from "@/components/ui/Icons";
import {
  casosPorEntregar, filaDeDenuncias,
  AREAS, URGENCIAS, euros,
  type Caso, type MensagemDenunciada,
} from "@/lib/contabilistas/casos";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";

type Separador = "denuncias" | "parados";

export default function CasosNaAdministracao() {
  const [separador, setSeparador] = useState<Separador>("denuncias");
  const [casos, setCasos] = useState<Caso[]>([]);
  const [denuncias, setDenuncias] = useState<MensagemDenunciada[]>([]);
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(async () => {
    const [c, d] = await Promise.all([casosPorEntregar(), filaDeDenuncias()]);
    setCasos(c); setDenuncias(d); setACarregar(false);
  }, []);

  useEffect(() => { carregar().catch(() => setACarregar(false)); }, [carregar]);

  if (aCarregar) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-64 animate-pulse rounded-2xl bg-stone-100" />
        <div className="h-32 animate-pulse rounded-4xl bg-stone-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CabecalhoAdmin
        titulo="Casos"
        descricao="O que nos foi entregue, e o que está à espera de alguém."
      />

      <p className="flex items-start gap-2.5 rounded-2xl bg-brand-light px-4 py-3 text-xs leading-relaxed text-brand-dark">
        <Lock size={15} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          As conversas entre clientes e contabilistas não passam por aqui, e não há
          como as abrir. O que aparece nesta página é o que alguém de dentro de um
          caso decidiu entregar-nos.
        </span>
      </p>

      <div role="tablist" aria-label="Separadores" className="flex flex-wrap gap-2">
        <Aba
          ativo={separador === "denuncias"}
          onClick={() => setSeparador("denuncias")}
          rotulo="Entregues a nós"
          contagem={denuncias.length}
        />
        <Aba
          ativo={separador === "parados"}
          onClick={() => setSeparador("parados")}
          rotulo="Sem contabilista"
          contagem={casos.length}
        />
      </div>

      {separador === "denuncias" ? (
        <Denuncias lista={denuncias} />
      ) : (
        <Parados lista={casos} />
      )}
    </div>
  );
}

function Aba({
  ativo, onClick, rotulo, contagem,
}: { ativo: boolean; onClick: () => void; rotulo: string; contagem: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ativo}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        ativo
          ? "bg-ink text-white"
          : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300"
      }`}
    >
      {rotulo}
      <span
        className={`rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${
          ativo ? "bg-white/15" : "bg-stone-100 text-stone-500"
        }`}
      >
        {contagem}
      </span>
    </button>
  );
}

/* ── O que nos foi entregue ────────────────────────────────────────── */

function Denuncias({ lista }: { lista: MensagemDenunciada[] }) {
  if (lista.length === 0) {
    return (
      <div className="rounded-4xl border border-stone-200 bg-white px-5 py-10 text-center shadow-card">
        <Flag size={22} className="mx-auto text-stone-300" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-stone-700">Nada nos foi entregue</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-stone-500">
          É o estado normal. Uma mensagem só chega aqui quando alguém que estava na
          conversa a denuncia.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {lista.map((m) => (
        <li key={m.id} className="rounded-4xl border border-alert-border bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs tabular-nums text-stone-400">{m.referencia}</span>
            <span className="rounded-lg bg-alert-bg px-2 py-0.5 text-[11px] font-semibold text-alert-text">
              Escrita {m.autorPapel === "cliente" ? "pelo cliente" : "pelo contabilista"}
            </span>
            <span className="text-[11px] tabular-nums text-stone-400">
              Entregue a {new Date(m.denunciadaEm).toLocaleDateString("pt-PT", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>

          {m.denunciaMotivo && (
            <div className="mt-3 rounded-2xl bg-cream px-4 py-3">
              <p className="eyebrow">O que nos disseram</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                {m.denunciaMotivo}
              </p>
            </div>
          )}

          <div className="mt-3 rounded-2xl border border-stone-200 px-4 py-3">
            <p className="eyebrow">A mensagem</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
              {m.corpo}
            </p>
            <p className="mt-2 text-[11px] tabular-nums text-stone-400">
              Escrita a {new Date(m.criadoEm).toLocaleDateString("pt-PT", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
            É só esta mensagem. O resto da conversa deste caso continua fora do alcance
            desta página.
          </p>
        </li>
      ))}
    </ul>
  );
}

/* ── O que está parado ─────────────────────────────────────────────── */

function Parados({ lista }: { lista: Caso[] }) {
  if (lista.length === 0) {
    return (
      <div className="rounded-4xl border border-stone-200 bg-white px-5 py-10 text-center shadow-card">
        <Briefcase size={22} className="mx-auto text-stone-300" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-stone-700">Nenhum caso à espera</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-stone-500">
          Todos os casos abertos já foram entregues a pelo menos um contabilista.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm leading-relaxed text-stone-500">
        Casos descritos e ainda não entregues a ninguém. Quem escolhe é a pessoa, no
        diretório — isto serve para sabermos que há gente à espera, não para decidirmos
        por ela.
      </p>
      <ul className="mt-3 space-y-2">
        {lista.map((c) => {
          const area = AREAS.find((a) => a.id === c.area);
          const urgencia = URGENCIAS.find((u) => u.id === c.urgencia);
          const dias = Math.floor(
            (Date.now() - new Date(c.submetidoEm ?? c.criadoEm).getTime()) / 86_400_000,
          );
          return (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-3xl border border-stone-200 bg-white px-4 py-3 shadow-card"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="font-mono text-xs tabular-nums text-stone-400">
                  {c.referencia}
                </span>
                {area && (
                  <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                    {area.titulo}
                  </span>
                )}
                {urgencia && c.urgencia !== "normal" && (
                  <span className="rounded-lg bg-alert-bg px-2 py-0.5 text-[11px] font-semibold text-alert-text">
                    {urgencia.titulo}
                  </span>
                )}
                {c.orcamentoCents !== null && (
                  <span className="text-[11px] tabular-nums text-stone-500">
                    até {euros(c.orcamentoCents)}
                  </span>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] tabular-nums ${
                  dias >= 3 ? "text-alert-text" : "text-stone-400"
                }`}
              >
                {dias >= 3 ? <Warning size={12} aria-hidden /> : <Clock size={12} aria-hidden />}
                {dias === 0 ? "hoje" : dias === 1 ? "há 1 dia" : `há ${dias} dias`}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
