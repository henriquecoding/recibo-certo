"use client";

// ═══════════════════════════════════════════════════════════════════════
//  PROPOSTAS DE DESBLOQUEIO — o que chega do outro lado
//  ---------------------------------------------------------------------
//  Um contabilista acha que o preço de tabela não faz sentido no caso
//  dele, diz qual faz e porquê. Este ecrã é onde essa proposta aterra.
//
//  TRÊS DECISÕES, E NENHUMA DELAS É «EDITAR»
//  -----------------------------------------
//  Aceitar, contrapor ou recusar. Não há um campo que reescreva o número
//  que a pessoa propôs: o que a administração acha que devia ser é uma
//  CONTRAPROPOSTA, que ela aceita ou não. Reescrever o valor dela e
//  chamar-lhe «aceite» era decidir por ela e chamar-lhe acordo.
//
//  E recusar exige uma razão. Uma recusa sem razão deixa alguém a
//  adivinhar o que corrigir, e a próxima proposta vem igual.
//
//  ⚠️ O QUE ESTE ECRÃ NÃO PODE VIRAR
//  ---------------------------------
//  Um sítio onde se compra tratamento. `DESBLOQUEIO_NAO_COMPRA` está
//  impresso na página, e não como decoração: é a lista que quem decide
//  tem de ter à frente quando alguém escrever «e em troca podiam
//  destacar-me no diretório». A resposta a isso é não, e está escrita.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import Button from "@/components/ui/Button";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import { Check, Clock, Handshake, Info, Spinner, Warning } from "@/components/ui/Icons";
import {
  decidirProposta, filaDePropostas,
} from "@/lib/contabilistas/progressao/dados";
import { formatarEuros } from "@/lib/contabilistas/progressao/catalogo";
import { DESBLOQUEIO_NAO_COMPRA } from "@/lib/contabilistas/progressao/fronteiras";
import type { PropostaDesbloqueio } from "@/lib/contabilistas/progressao/fundadores";

export default function PropostasDeDesbloqueio() {
  const avisos = useAvisos();
  const [fila, setFila] = useState<PropostaDesbloqueio[]>([]);
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(async () => {
    try { setFila(await filaDePropostas()); }
    finally { setACarregar(false); }
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
        titulo="Propostas de desbloqueio"
        descricao="Contabilistas que propõem outro valor para subir de patamar, e porquê."
      />

      <div className="rounded-2xl border border-stone-200 bg-cream/60 px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
          <Info size={13} aria-hidden /> Um valor acordado compra a percentagem e mais nada
        </p>
        <ul className="mt-2 space-y-1">
          {DESBLOQUEIO_NAO_COMPRA.map((linha) => (
            <li key={linha} className="flex items-start gap-2 text-xs leading-relaxed text-stone-500">
              <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-300" />
              {linha}
            </li>
          ))}
        </ul>
      </div>

      {fila.length === 0 ? (
        <div className="rounded-4xl border border-stone-200 bg-white px-5 py-10 text-center shadow-card">
          <Handshake size={22} className="mx-auto text-stone-300" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-stone-700">Nada por decidir</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-stone-500">
            Quando alguém propuser um valor, aparece aqui — a mais antiga primeiro.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {fila.map((p) => (
            <Cartao key={p.id} proposta={p} avisos={avisos} aoDecidir={() => void carregar()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Cartao({
  proposta: p, avisos, aoDecidir,
}: {
  proposta: PropostaDesbloqueio;
  avisos: ReturnType<typeof useAvisos>;
  aoDecidir: () => void;
}) {
  const [modo, setModo] = useState<"nada" | "contrapor" | "recusar">("nada");
  const [valor, setValor] = useState("");
  const [nota, setNota] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const dias = Math.floor((Date.now() - new Date(p.criadoEm).getTime()) / 86_400_000);
  const poupanca = p.precoCatalogoCents - p.valorPropostoCents;
  const pctAbaixo = p.precoCatalogoCents > 0
    ? Math.round((poupanca / p.precoCatalogoCents) * 100)
    : 0;

  async function decidir(
    decisao: "aceitar" | "contrapor" | "recusar",
  ) {
    setOcupado(true);
    const cents = decisao === "contrapor"
      ? Math.round(Number(valor.replace(",", ".")) * 100)
      : undefined;
    const { erro } = await decidirProposta(p.id, decisao, cents, nota);
    setOcupado(false);
    if (erro) { avisos.erro(erro); return; }
    setModo("nada"); setValor(""); setNota("");
    avisos.sucesso(
      decisao === "aceitar" ? "Aceite."
        : decisao === "contrapor" ? "Contraproposta enviada."
        : "Recusada.",
    );
    aoDecidir();
  }

  return (
    <li className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
          Patamar {p.patamarAlvo}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] tabular-nums ${
            dias >= 3 ? "text-alert-text" : "text-stone-400"
          }`}
        >
          {dias >= 3 ? <Warning size={12} aria-hidden /> : <Clock size={12} aria-hidden />}
          {dias === 0 ? "hoje" : dias === 1 ? "há 1 dia" : `há ${dias} dias`}
        </span>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <dt className="text-[11px] text-stone-500">Preço de tabela</dt>
          <dd className="text-sm tabular-nums text-stone-500 line-through">
            {formatarEuros(p.precoCatalogoCents)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-stone-500">Propõe</dt>
          <dd className="font-display text-xl tabular-nums text-ink">
            {formatarEuros(p.valorPropostoCents)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-stone-500">Diferença</dt>
          <dd className="text-sm tabular-nums text-clay-text">
            −{formatarEuros(poupanca)} ({pctAbaixo}%)
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-2xl bg-cream px-4 py-3">
        <p className="eyebrow">A justificação</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
          {p.justificacao}
        </p>
      </div>

      {modo === "nada" ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => void decidir("aceitar")}
            disabled={ocupado}
            className="w-full sm:w-auto"
          >
            {ocupado ? <><Spinner size={14} /> …</> : <><Check size={14} aria-hidden /> Aceitar</>}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setModo("contrapor")}
            disabled={ocupado}
            className="w-full sm:w-auto"
          >
            <Handshake size={14} aria-hidden /> Contrapor
          </Button>
          <Button
            variant="ghost"
            onClick={() => setModo("recusar")}
            disabled={ocupado}
            className="w-full sm:w-auto"
          >
            Recusar
          </Button>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-cream/50 p-4">
          {modo === "contrapor" && (
            <>
              <label
                htmlFor={`contra-${p.id}`}
                className="block text-sm font-semibold text-stone-700"
              >
                O valor que contrapões
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id={`contra-${p.id}`}
                  type="text"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 10))}
                  className="w-32 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                />
                <span className="text-sm text-stone-500">€</span>
              </div>
            </>
          )}

          <label
            htmlFor={`nota-${p.id}`}
            className={`block text-sm font-semibold text-stone-700 ${modo === "contrapor" ? "mt-4" : ""}`}
          >
            {modo === "recusar" ? "Porque é que não" : "Uma nota, se quiseres"}
          </label>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
            {modo === "recusar"
              ? "Obrigatória. Recusar sem dizer porquê faz a próxima proposta vir igual."
              : "Vai aparecer junto da contraproposta."}
          </p>
          <textarea
            id={`nota-${p.id}`}
            rows={3}
            value={nota}
            onChange={(e) => setNota(e.target.value.slice(0, 1000))}
            className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          />

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => void decidir(modo === "contrapor" ? "contrapor" : "recusar")}
              disabled={
                ocupado
                || (modo === "contrapor" && !valor.trim())
                || (modo === "recusar" && nota.trim().length < 10)
              }
              className="w-full sm:w-auto"
            >
              {ocupado
                ? <><Spinner size={14} /> …</>
                : modo === "contrapor" ? "Enviar contraproposta" : "Recusar"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setModo("nada")}
              disabled={ocupado}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
