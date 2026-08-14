"use client";

// ═══════════════════════════════════════════════════════════════════════
//  LER ATÉ AO FIM, E SÓ DEPOIS DECIDIR
//  ---------------------------------------------------------------------
//  Aceitar uma proposta é aceitar um contrato. A regra é que ninguém o
//  faça sem ter chegado ao fim do documento e confirmado que leu.
//
//  O que este componente faz é TORNAR ISSO VISÍVEL — o botão que se
//  desbloqueia, a barra que enche, a caixa que se marca. A garantia não
//  está aqui: está em `decidir_proposta`, que recusa enquanto as duas
//  colunas forem nulas. Isto é a parte que se vê; a outra é a que segura.
//
//  Acessibilidade: quem navega por teclado ou com leitor de ecrã não rola
//  a página da mesma maneira, e um marcador que só se ativa a olhar seria
//  uma barreira. O fim do documento é um elemento focável que se anuncia
//  ao receber foco — chega-se lá com Tab, e conta na mesma.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import Button from "@/components/ui/Button";
import { Check, Warning, Spinner, PaperClip, Clock } from "@/components/ui/Icons";
import { useAvisos } from "@/components/ui/Avisos";
import {
  euros, marcarPropostaLida, confirmarLeitura, decidirProposta,
  type Proposta,
} from "@/lib/contabilistas/casos";

export default function LeitorDeProposta({
  proposta,
  anexos,
  aoDecidir,
}: {
  proposta: Proposta;
  anexos?: { id: string; nome: string; eContrato: boolean }[];
  aoDecidir: () => void;
}) {
  const avisos = useAvisos();
  const fim = useRef<HTMLDivElement | null>(null);
  const corpo = useRef<HTMLDivElement | null>(null);

  const [chegouAoFim, setChegouAoFim] = useState(!!proposta.lidaAteAoFimEm);
  const [confirmou, setConfirmou] = useState(!!proposta.confirmacaoEm);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [aPedirDesconto, setAPedirDesconto] = useState(false);
  const [valorPedido, setValorPedido] = useState("");
  const [justificacao, setJustificacao] = useState("");

  const decidida = proposta.estado !== "enviada" && proposta.estado !== "lida";

  // Quanto do documento já passou pelo ecrã. Serve de orientação — «falta
  // isto» é mais honesto do que um botão desativado sem explicação.
  useEffect(() => {
    const el = corpo.current;
    if (!el || decidida) return;
    const aoRolar = () => {
      const total = el.scrollHeight - el.clientHeight;
      setProgresso(total <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / total) * 100)));
    };
    aoRolar();
    el.addEventListener("scroll", aoRolar, { passive: true });
    return () => el.removeEventListener("scroll", aoRolar);
  }, [decidida]);

  const marcarFim = useCallback(async () => {
    if (chegouAoFim) return;
    setChegouAoFim(true);
    setProgresso(100);
    const { erro } = await marcarPropostaLida(proposta.id);
    if (erro) { setChegouAoFim(false); avisos.erro(erro); }
  }, [chegouAoFim, proposta.id, avisos]);

  useEffect(() => {
    const alvo = fim.current;
    if (!alvo || chegouAoFim || decidida) return;
    const observador = new IntersectionObserver(
      (entradas) => { if (entradas.some((e) => e.isIntersecting)) void marcarFim(); },
      { threshold: 0.9 },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [chegouAoFim, decidida, marcarFim]);

  async function confirmar(marcado: boolean) {
    if (!marcado) { setConfirmou(false); return; }
    setConfirmou(true);
    const { erro } = await confirmarLeitura(proposta.id);
    if (erro) { setConfirmou(false); avisos.erro(erro); }
  }

  async function decidir(decisao: "aceitar" | "recusar" | "pedir_desconto") {
    setOcupado(decisao);
    const cents = Math.round(Number(valorPedido.replace(",", ".")) * 100);
    const { erro } = await decidirProposta(
      proposta.id, decisao,
      decisao === "pedir_desconto" ? justificacao : undefined,
      decisao === "pedir_desconto" ? cents : undefined,
    );
    setOcupado(null);
    if (erro) { avisos.erro(erro); return; }
    avisos.sucesso(
      decisao === "aceitar" ? "Proposta aceite."
        : decisao === "recusar" ? "Proposta recusada."
        : "Pedido de desconto enviado.",
      { detalhe: decisao === "aceitar" ? "Já podes falar diretamente e marcar consulta." : undefined },
    );
    aoDecidir();
  }

  const pronto = chegouAoFim && confirmou;
  const contrato = anexos?.find((a) => a.eContrato);

  return (
    <article className="overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-card">
      {/* O que está em jogo, antes de qualquer texto. */}
      <header className="border-b border-stone-100 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <div className="min-w-0">
            <p className="eyebrow">Proposta</p>
            <p className="mt-0.5 font-display text-2xl tabular-nums text-ink">
              {euros(proposta.valorCents)}
            </p>
          </div>
          <p className="text-xs text-stone-500">
            {proposta.ivaIncluido ? "IVA incluído" : "Acresce IVA à taxa em vigor"}
          </p>
        </div>

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-stone-500">
          {proposta.prazoExecucao && (
            <div className="flex items-center gap-1.5">
              <Clock size={13} aria-hidden />
              <dt className="sr-only">Prazo</dt>
              <dd>{proposta.prazoExecucao}</dd>
            </div>
          )}
          {proposta.validadeAte && (
            <div>
              <dt className="inline">Válida até </dt>
              <dd className="inline tabular-nums">
                {new Date(proposta.validadeAte).toLocaleDateString("pt-PT")}
              </dd>
            </div>
          )}
        </dl>
      </header>

      {decidida ? (
        <p className="px-5 py-4 text-sm text-stone-500 sm:px-6">
          Esta proposta já foi {ESTADO_DITO[proposta.estado] ?? "decidida"}.
          {proposta.motivo && <> {proposta.motivo}</>}
        </p>
      ) : (
        <>
          {/* Quanto falta. Uma barra é mais honesta do que um botão
              desativado sem explicação nenhuma. */}
          <div className="px-5 pt-4 sm:px-6">
            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <span>{chegouAoFim ? "Leste até ao fim." : "Lê até ao fim para poderes decidir."}</span>
              <span className="tabular-nums">{progresso}%</span>
            </div>
            <div
              className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-100"
              role="progressbar"
              aria-valuenow={progresso}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Quanto da proposta já leste"
            >
              <m.div
                className="h-full rounded-full bg-brand"
                initial={false}
                animate={{ width: `${progresso}%` }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          <div
            ref={corpo}
            tabIndex={0}
            role="region"
            aria-label="Texto da proposta"
            className="mt-3 max-h-[50vh] min-h-0 overflow-y-auto px-5 pb-2 text-sm leading-relaxed text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:px-6"
          >
            {proposta.corpo.split("\n").map((linha, i) =>
              linha.trim() ? <p key={i} className="mb-3">{linha}</p> : <div key={i} className="h-2" />,
            )}

            {contrato && (
              <p className="mb-3 flex items-start gap-2 rounded-2xl bg-alert-bg px-4 py-3 text-xs leading-relaxed text-alert-text">
                <PaperClip size={13} className="mt-0.5 shrink-0" aria-hidden />
                Esta proposta traz um contrato em anexo ({contrato.nome}). Lê-o antes de decidires
                — o que aceitas é o contrato, e não só o resumo aqui em cima.
              </p>
            )}

            {/* O fim do documento. Focável de propósito: quem chega aqui
                com Tab conta tanto como quem chega a rolar. */}
            <div
              ref={fim}
              tabIndex={0}
              onFocus={() => void marcarFim()}
              className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-stone-200 px-4 py-3 text-xs text-stone-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {chegouAoFim ? <Check size={14} className="text-brand" aria-hidden />
                           : <Warning size={14} aria-hidden />}
              {chegouAoFim ? "Fim da proposta." : "Fim da proposta — chegaste ao fim."}
            </div>
          </div>

          <div className="border-t border-stone-100 px-5 py-4 sm:px-6">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={confirmou}
                disabled={!chegouAoFim}
                onChange={(e) => void confirmar(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-brand focus:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
              />
              <span className={`text-sm leading-relaxed ${chegouAoFim ? "text-stone-700" : "text-stone-400"}`}>
                Confirmo que li a proposta até ao fim e que compreendi o que estou a aceitar.
              </span>
            </label>

            {!aPedirDesconto ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => void decidir("aceitar")}
                  disabled={!pronto || ocupado !== null}
                  className="w-full sm:w-auto"
                >
                  {ocupado === "aceitar" ? <><Spinner size={14} /> A aceitar…</> : "Aceitar proposta"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setAPedirDesconto(true)}
                  disabled={!pronto || ocupado !== null}
                  className="w-full sm:w-auto"
                >
                  Pedir desconto
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void decidir("recusar")}
                  disabled={!pronto || ocupado !== null}
                  className="w-full sm:w-auto"
                >
                  {ocupado === "recusar" ? <><Spinner size={14} /> A recusar…</> : "Recusar"}
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-stone-200 bg-cream/60 p-4">
                <p className="text-xs leading-relaxed text-stone-600">
                  Diz que valor propões e porquê. O contabilista responde com uma proposta nova —
                  esta fica no histórico, e nenhuma das duas é reescrita.
                </p>

                <label htmlFor="valor-pedido" className="mt-3 block text-xs font-semibold text-stone-700">
                  Valor que propões
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="valor-pedido"
                    inputMode="decimal"
                    value={valorPedido}
                    onChange={(e) => setValorPedido(e.target.value.replace(/[^\d,.]/g, ""))}
                    placeholder={(proposta.valorCents / 100).toFixed(2).replace(".", ",")}
                    className="w-32 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                  />
                  <span className="text-sm text-stone-500">euros</span>
                </div>

                <label htmlFor="justificacao" className="mt-3 block text-xs font-semibold text-stone-700">
                  Porquê
                </label>
                <textarea
                  id="justificacao"
                  rows={3}
                  value={justificacao}
                  onChange={(e) => setJustificacao(e.target.value.slice(0, 1000))}
                  placeholder="Explica o que te leva a pedir outro valor."
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                />

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={() => void decidir("pedir_desconto")}
                    disabled={!valorPedido || justificacao.trim().length < 10 || ocupado !== null}
                    className="w-full sm:w-auto"
                  >
                    {ocupado === "pedir_desconto"
                      ? <><Spinner size={14} /> A enviar…</> : "Enviar pedido"}
                  </Button>
                  <Button variant="ghost" onClick={() => setAPedirDesconto(false)} className="w-full sm:w-auto">
                    Voltar atrás
                  </Button>
                </div>
              </div>
            )}

            {!pronto && (
              <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
                {!chegouAoFim
                  ? "Os botões abrem quando chegares ao fim do documento acima."
                  : "Falta marcar a confirmação."}
              </p>
            )}
          </div>
        </>
      )}
    </article>
  );
}

const ESTADO_DITO: Record<string, string> = {
  aceite: "aceite",
  recusada: "recusada",
  desconto_pedido: "respondida com um pedido de desconto",
  expirada: "dada como expirada",
  substituida: "substituída por outra",
};
