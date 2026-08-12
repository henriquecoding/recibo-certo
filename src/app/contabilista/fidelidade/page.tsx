"use client";

// Configuração do cartão de fidelidade: preço da consulta, quantas consultas
// fecham o cartão, e a percentagem de desconto — de 10% a 50%.
//
// As fronteiras estão em três sítios de propósito: aqui (mensagem legível),
// em `fidelidade.ts` (validação) e em restrições CHECK da migração 042 (a
// garantia). Só a última é que impede mesmo.

import { useEffect, useState } from "react";
import { usarFicha, cabecalhoAuth } from "@/components/contabilistas/usarFicha";
import CartaoFidelidade from "@/components/contabilistas/CartaoFidelidade";
import { atualizarFicha, meusCupoes, type CupaoLido } from "@/lib/contabilistas/dados";
import {
  DESCONTO_MAX_PCT, DESCONTO_MIN_PCT, META_MAX, META_MIN,
  eurosDeCents, normalizarCodigoCupao, valorComDesconto, validarConfigFidelidade,
} from "@/lib/contabilistas/fidelidade";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Gift, Warning, Check } from "@/components/ui/Icons";

export default function FidelidadePage() {
  const { ficha, aCarregar, recarregar } = usarFicha();
  const [preco, setPreco] = useState("");
  const [meta, setMeta] = useState(5);
  const [desconto, setDesconto] = useState(10);
  const [ativa, setAtiva] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [guardado, setGuardado] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    if (!ficha) return;
    setPreco(ficha.precoConsultaCents ? (ficha.precoConsultaCents / 100).toFixed(2).replace(".", ",") : "");
    setMeta(ficha.fidelidadeMeta);
    setDesconto(ficha.fidelidadeDescontoPct);
    setAtiva(ficha.fidelidadeAtiva);
  }, [ficha]);

  const precoCents = Math.round((Number(preco.replace(",", ".")) || 0) * 100);

  async function guardar() {
    if (!ficha) return;
    setGuardado(false);
    const v = validarConfigFidelidade({ descontoPct: desconto, meta, precoConsultaCents: precoCents, ativa });
    setErros(v.erros);
    if (!v.ok) return;

    setAGuardar(true);
    const { erro } = await atualizarFicha(ficha.userId, {
      preco_consulta_cents: precoCents,
      fidelidade_meta: meta,
      fidelidade_desconto_pct: desconto,
      fidelidade_ativa: ativa,
    });
    setAGuardar(false);
    if (erro) { setErros([erro]); return; }
    setGuardado(true);
    recarregar();
  }

  if (aCarregar) return <div className="h-96 animate-pulse rounded-4xl bg-stone-100" aria-busy="true" />;
  if (!ficha) return null;

  const exemplo = valorComDesconto(precoCents, desconto);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Painel de gestão</p>
        <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">Fidelidade</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
          Um carimbo por consulta realizada. Ao completar o cartão, o cliente recebe
          um cupão de desconto sobre o preço que definires aqui.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">Preço da consulta</span>
            <span className="mt-0.5 block text-xs text-stone-400">
              É sobre este valor que a percentagem incide.
            </span>
            <span className="mt-2 flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={preco}
                onChange={(e) => { setPreco(e.target.value); setGuardado(false); }}
                placeholder="120,00"
                aria-describedby="preco-ajuda"
                className="min-h-[2.75rem] w-40 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm tabular-nums text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <span className="text-sm text-stone-500">euros</span>
            </span>
          </label>
          <p id="preco-ajuda" className="sr-only">Valor em euros, com vírgula decimal.</p>

          <div>
            <label htmlFor="meta" className="text-sm font-semibold text-stone-700">
              Consultas para completar o cartão
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="meta"
                type="range"
                min={META_MIN}
                max={META_MAX}
                value={meta}
                onChange={(e) => { setMeta(Number(e.target.value)); setGuardado(false); }}
                className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-stone-200 accent-brand"
              />
              <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-stone-800">{meta}</span>
            </div>
          </div>

          <div>
            <label htmlFor="desconto" className="text-sm font-semibold text-stone-700">
              Desconto ao completar
            </label>
            <span className="mt-0.5 block text-xs text-stone-400">
              De {DESCONTO_MIN_PCT}% a {DESCONTO_MAX_PCT}%.
            </span>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="desconto"
                type="range"
                min={DESCONTO_MIN_PCT}
                max={DESCONTO_MAX_PCT}
                value={desconto}
                onChange={(e) => { setDesconto(Number(e.target.value)); setGuardado(false); }}
                className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-stone-200 accent-brand"
              />
              <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-stone-800">{desconto}%</span>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-cream p-4">
            <input
              type="checkbox"
              checked={ativa}
              onChange={(e) => { setAtiva(e.target.checked); setGuardado(false); }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand"
            />
            <span className="text-sm text-stone-600">
              <strong className="block font-semibold text-stone-800">Cartão ativo</strong>
              Com o cartão desligado, as consultas continuam a ser registadas mas não
              carimbam nada.
            </span>
          </label>

          {erros.length > 0 && (
            <ul role="alert" className="space-y-1.5 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
              {erros.map((e) => (
                <li key={e} className="flex items-start gap-2">
                  <Warning size={15} className="mt-0.5 shrink-0" aria-hidden /> {e}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={guardar} disabled={aGuardar}>
              {aGuardar ? "A guardar…" : "Guardar"}
            </Button>
            {guardado && (
              <span role="status" className="flex items-center gap-1.5 text-sm font-medium text-brand-dark">
                <Check size={15} aria-hidden /> Guardado.
              </span>
            )}
          </div>

          <p className="border-t border-stone-100 pt-4 text-xs leading-relaxed text-stone-400">
            Mudar estes valores afeta os cartões que começarem a partir de agora. Quem
            já tem um cartão a meio mantém a percentagem com que o começou — a promessa
            que lhe foi feita não muda a meio.
          </p>
        </div>

        <aside className="space-y-4">
          <div className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card">
            <p className="eyebrow">Pré-visualização</p>
            <p className="mt-2 text-sm text-stone-600">
              {precoCents > 0 ? (
                <>
                  Ao fim de <strong>{meta}</strong> consultas, o cliente paga{" "}
                  <strong className="text-brand-dark">{eurosDeCents(exemplo.finalCents)}</strong> em vez de{" "}
                  {eurosDeCents(exemplo.baseCents)}.
                </>
              ) : (
                "Define o preço da consulta para veres o efeito."
              )}
            </p>
          </div>
          <CartaoFidelidade
            carimbos={Math.min(2, meta)}
            meta={meta}
            descontoPct={desconto}
            precoBaseCents={precoCents}
            titulo="Como o cliente vê"
            perspetiva="contabilista"
          />
        </aside>
      </div>

      <Resgate />
    </div>
  );
}

/** Validar um código que o cliente apresenta na consulta. */
function Resgate() {
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState<"parado" | "a-validar">("parado");
  const [resposta, setResposta] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cupoes, setCupoes] = useState<CupaoLido[]>([]);
  const { ficha } = usarFicha();

  useEffect(() => {
    if (!ficha) return;
    meusCupoes({ contabilistaId: ficha.userId }).then(setCupoes).catch(() => setCupoes([]));
  }, [ficha]);

  async function validar() {
    const normalizado = normalizarCodigoCupao(codigo);
    if (!normalizado) {
      setResposta({ ok: false, texto: "O código tem oito caracteres, no formato RC-XXXX-XXXX." });
      return;
    }
    setEstado("a-validar"); setResposta(null);
    try {
      const res = await fetch("/api/contabilistas/cupao", {
        method: "POST",
        headers: await cabecalhoAuth(),
        body: JSON.stringify({ codigo: normalizado }),
      });
      const corpo = (await res.json()) as {
        erro?: string; percentagem?: number; finalCents?: number; baseCents?: number;
      };
      if (!res.ok) { setResposta({ ok: false, texto: corpo.erro ?? "Não foi possível validar." }); return; }
      setResposta({
        ok: true,
        texto: `Válido: ${corpo.percentagem}% de desconto. ${eurosDeCents(corpo.baseCents ?? 0)} passam a ${eurosDeCents(corpo.finalCents ?? 0)}.`,
      });
      setCodigo("");
      if (ficha) meusCupoes({ contabilistaId: ficha.userId }).then(setCupoes).catch(() => {});
    } catch { setResposta({ ok: false, texto: "Falha de rede. Tenta outra vez." }); }
    finally { setEstado("parado"); }
  }

  const disponiveis = cupoes.filter((c) => c.estado === "disponivel").length;

  return (
    <section aria-labelledby="resgate-titulo" className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <h2 id="resgate-titulo" className="font-display text-xl text-ink">Usar um cupão</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        Quando um cliente apresentar o código, valida-o aqui. Marcar como usado regista
        que o desconto foi dado — o pagamento continua a ser entre vocês os dois.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2.5">
        <label htmlFor="codigo" className="flex flex-col gap-1 text-xs font-medium text-stone-500">
          Código
          <input
            id="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="RC-XXXX-XXXX"
            autoComplete="off"
            className="min-h-[2.75rem] w-52 rounded-xl border border-stone-200 bg-white px-3.5 py-2 font-mono text-sm uppercase tracking-wide text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <Button onClick={validar} disabled={estado === "a-validar"}>
          {estado === "a-validar" ? "A validar…" : "Validar"}
        </Button>
      </div>

      {resposta && (
        <p
          role={resposta.ok ? "status" : "alert"}
          className={`mt-3 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm ${
            resposta.ok ? "bg-brand-light text-brand-dark" : "bg-clay-bg text-clay-text"
          }`}
        >
          {resposta.ok ? <Gift size={16} className="mt-0.5 shrink-0" aria-hidden /> : <Warning size={16} className="mt-0.5 shrink-0" aria-hidden />}
          {resposta.texto}
        </p>
      )}

      {cupoes.length > 0 && (
        <p className="mt-4 flex items-center gap-2 text-sm text-stone-500">
          <Badge tone={disponiveis > 0 ? "brand" : "neutral"}>{disponiveis} por usar</Badge>
          de {cupoes.length} {cupoes.length === 1 ? "cupão emitido" : "cupões emitidos"}.
        </p>
      )}
    </section>
  );
}
