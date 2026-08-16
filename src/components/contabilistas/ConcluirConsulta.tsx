"use client";

/**
 * O diálogo de concluir uma consulta — com o PREÇO REAL e o benefício.
 *
 * Existe porque a Fidelidade V2 mudou o contrato: `concluir_consulta`
 * recusa com `preco_obrigatorio` se o preço não vier. Não é uma
 * formalidade — é a §14.1 levada ao fim. O preço global do perfil deixou
 * de ser a fonte de verdade da fidelidade, e o valor sobre o qual a
 * percentagem incide passou a ser o desta consulta.
 *
 * Duas coisas que o diálogo faz e que valem a pena dizer:
 *
 *  · Preenche com o valor SUGERIDO do perfil, mas deixa mudar. Sugerir e
 *    impor são coisas diferentes, e a etiqueta di-lo.
 *
 *  · Se o cliente tem um benefício por usar, oferece aplicá-lo AQUI, e
 *    mostra a conta feita antes de confirmar. Aplicar gasta o benefício e
 *    não o devolve — por isso a conta aparece antes, e não depois.
 *
 * ⚠️ Concluir com presença carimba o cartão, e um carimbo não se
 * descarimba. É por isso que isto é um diálogo e não um botão direto.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { eurosDeCents } from "@/lib/contabilistas/fidelidade";
import type { CupaoLido } from "@/lib/contabilistas/fonte/dados";
import Button from "@/components/ui/Button";
import { Gift, Info, Warning } from "@/components/ui/Icons";

export interface ConclusaoEscolhida {
  precoCents: number;
  cupaoId: string | null;
}

export default function ConcluirConsulta({
  nomeCliente, precoSugeridoCents, beneficios, aGuardar, onCancelar, onConfirmar,
}: {
  nomeCliente: string;
  /** O valor sugerido do perfil. Zero significa «sem sugestão». */
  precoSugeridoCents: number;
  /** Benefícios por usar deste cliente. Vazio esconde a secção. */
  beneficios: CupaoLido[];
  aGuardar: boolean;
  onCancelar: () => void;
  onConfirmar: (escolha: ConclusaoEscolhida) => void;
}) {
  const [texto, setTexto] = useState(
    precoSugeridoCents > 0 ? (precoSugeridoCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [cupaoId, setCupaoId] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => { campo.current?.focus(); }, []);

  // Fechar com Escape: o diálogo é modal e tem de se poder sair dele.
  useEffect(() => {
    function tecla(e: KeyboardEvent) { if (e.key === "Escape") onCancelar(); }
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [onCancelar]);

  const precoCents = useMemo(() => {
    const n = Number(texto.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : Number.NaN;
  }, [texto]);

  const valido = Number.isFinite(precoCents);
  const escolhido = beneficios.find((b) => b.id === cupaoId) ?? null;
  const descontoCents = escolhido && valido
    ? Math.round((precoCents * escolhido.percentagem) / 100)
    : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Concluir a consulta de ${nomeCliente}`}
      className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center"
    >
      <button type="button" aria-label="Cancelar" onClick={onCancelar}
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" />

      {/* Folha inferior no telemóvel, como o design system manda. */}
      <div
        className="relative flex max-h-[90dvh] w-full min-h-0 flex-col rounded-t-4xl bg-white shadow-float sm:max-w-md sm:rounded-4xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex-none border-b border-stone-100 px-5 pb-3 pt-5">
          <h2 className="font-display text-xl text-ink">Concluir a consulta</h2>
          <p className="mt-1 text-sm text-stone-500">
            {nomeCliente} — indica o valor real desta consulta.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label htmlFor="preco-consulta" className="text-sm font-semibold text-ink">
              Valor cobrado
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                ref={campo}
                id="preco-consulta"
                type="text"
                inputMode="decimal"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="0,00"
                aria-describedby="preco-nota"
                className="min-h-11 w-full rounded-xl border border-stone-200 px-3 text-right font-display text-lg tabular-nums"
              />
              <span className="shrink-0 font-display text-lg text-stone-400">€</span>
            </div>
            <p id="preco-nota" className="mt-1.5 text-xs leading-relaxed text-stone-500">
              {precoSugeridoCents > 0 ? (
                <>
                  Vem preenchido com o valor sugerido no teu perfil
                  ({eurosDeCents(precoSugeridoCents)}), e podes mudá-lo.
                </>
              ) : (
                <>Não tens valor sugerido no perfil — escreve o que cobraste.</>
              )}{" "}
              É sobre este valor que o desconto incide.
            </p>
            {!valido && texto.trim() !== "" && (
              <p role="alert" className="mt-1.5 text-xs font-semibold text-clay-text">
                Escreve um valor válido, por exemplo 65,00.
              </p>
            )}
          </div>

          {beneficios.length > 0 && (
            <fieldset className="rounded-2xl border border-stone-200 p-3.5">
              <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-ink">
                <Gift size={14} className="text-brand-dark dark:text-brand-mint" aria-hidden />
                Aplicar um benefício
              </legend>
              <div className="mt-1 space-y-1.5">
                <Opcao
                  nome="beneficio" marcado={cupaoId === null}
                  onSelect={() => setCupaoId(null)}
                  titulo="Não aplicar nada agora"
                  nota="O benefício continua disponível para outra consulta."
                />
                {beneficios.map((b) => (
                  <Opcao
                    key={b.id} nome="beneficio" marcado={cupaoId === b.id}
                    onSelect={() => setCupaoId(b.id)}
                    titulo={`${b.percentagem}% de desconto`}
                    nota={`Código ${b.codigo}. Aplicar gasta-o e não volta.`}
                  />
                ))}
              </div>

              {escolhido && valido && (
                <dl className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
                  <Linha rotulo="Valor" valor={eurosDeCents(precoCents)} />
                  <Linha
                    rotulo={`Desconto (${escolhido.percentagem}%)`}
                    valor={`−${eurosDeCents(descontoCents)}`}
                    destaque
                  />
                  <Linha rotulo="A cobrar" valor={eurosDeCents(precoCents - descontoCents)} forte />
                </dl>
              )}
            </fieldset>
          )}

          <p className="flex items-start gap-2 rounded-2xl bg-alert-bg px-3.5 py-3 text-xs leading-relaxed text-alert-text">
            <Warning size={14} className="mt-0.5 shrink-0" aria-hidden />
            Dar por realizada carimba o cartão de fidelidade deste cliente, e um carimbo
            não se descarimba.
          </p>
        </div>

        <div className="flex flex-none flex-wrap items-center justify-end gap-2 border-t border-stone-100 px-5 py-3.5">
          <button
            type="button"
            onClick={onCancelar}
            className="focus-marca min-h-10 rounded-xl px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100 dark:hover:bg-white/5"
          >
            Cancelar
          </button>
          <Button
            onClick={() => valido && onConfirmar({ precoCents, cupaoId })}
            disabled={!valido || aGuardar}
          >
            {aGuardar ? "A registar…" : "Dar por realizada"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Opcao({
  nome, marcado, onSelect, titulo, nota,
}: {
  nome: string; marcado: boolean; onSelect: () => void; titulo: string; nota: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl p-2 hover:bg-stone-50 dark:hover:bg-white/[0.03]">
      <input
        type="radio" name={nome} checked={marcado} onChange={onSelect}
        className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{titulo}</span>
        <span className="block text-xs leading-relaxed text-stone-500">{nota}</span>
      </span>
    </label>
  );
}

function Linha({
  rotulo, valor, destaque, forte,
}: { rotulo: string; valor: string; destaque?: boolean; forte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-stone-500">{rotulo}</dt>
      <dd className={`tabular-nums ${
        forte ? "font-display text-lg text-ink"
          : destaque ? "font-medium text-brand-dark dark:text-brand-mint"
            : "text-stone-700"
      }`}>
        {valor}
      </dd>
    </div>
  );
}
