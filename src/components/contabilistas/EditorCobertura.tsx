"use client";

// ═══════════════════════════════════════════════════════════════════════
//  EDITOR DE COBERTURA — onde é que a pessoa atende
//  ---------------------------------------------------------------------
//  Um distrito e um concelho descreviam bem quem tem escritório e não sai
//  de lá, e mal toda a gente. Quatro modos, e a frase resultante mostrada
//  em baixo — a mesma que vai aparecer no perfil e no cartão, vinda da
//  mesma função, para não haver surpresa depois de guardar.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import SelectMenu, { type OpcaoSelectMenu } from "@/components/ui/SelectMenu";
import Button from "@/components/ui/Button";
import { Close, MapPin, Plus, Warning } from "@/components/ui/Icons";
import { DISTRITOS } from "@/lib/contabilistas/catalogo";
import {
  MAX_CONCELHOS, MAX_NOTA, MODOS, descreverCobertura, validarCobertura,
  type Cobertura, type ModoCobertura,
} from "@/lib/contabilistas/personalizacao/cobertura";

const ROTULO_MODO: Record<ModoCobertura, { nome: string; ajuda: string }> = {
  local: { nome: "Um só sítio", ajuda: "O escritório, e é aí que atendes." },
  concelhos: { nome: "Vários concelhos", ajuda: "Deslocas-te, ou atendes numa zona." },
  distritos: { nome: "Distritos inteiros", ajuda: "Cobres um ou mais distritos." },
  pais: { nome: "Todo o país", ajuda: "Só faz sentido com atendimento online." },
};

const OPCOES_DISTRITO: readonly OpcaoSelectMenu[] = [
  { value: "", label: "Sem distrito" },
  ...DISTRITOS.map((d) => ({ value: d, label: d })),
];

export interface EditorCoberturaProps {
  cobertura: Cobertura;
  modalidades: string[];
  aoMudar: (c: Cobertura) => void;
}

export default function EditorCobertura({
  cobertura, modalidades, aoMudar,
}: EditorCoberturaProps) {
  const [novoConcelho, setNovoConcelho] = useState("");

  const problemas = useMemo(
    () => validarCobertura(cobertura, modalidades),
    [cobertura, modalidades]
  );
  const frase = useMemo(
    () => descreverCobertura(cobertura, modalidades),
    [cobertura, modalidades]
  );

  function acrescentarConcelho() {
    const limpo = novoConcelho.replace(/\s+/g, " ").trim();
    if (!limpo || cobertura.concelhos.length >= MAX_CONCELHOS) return;
    if (cobertura.concelhos.some((c) => c.toLowerCase() === limpo.toLowerCase())) return;
    aoMudar({ ...cobertura, concelhos: [...cobertura.concelhos, limpo] });
    setNovoConcelho("");
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-ink">Onde atendes</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {MODOS.map((m) => (
            <li key={m}>
              <button
                type="button"
                aria-pressed={cobertura.modo === m}
                onClick={() => aoMudar({ ...cobertura, modo: m })}
                className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                  cobertura.modo === m
                    ? "border-brand bg-brand-light dark:bg-brand/10"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <span className="block text-sm font-semibold text-ink">
                  {ROTULO_MODO[m].nome}
                </span>
                <span className="mt-0.5 block text-xs text-stone-500">
                  {ROTULO_MODO[m].ajuda}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* O escritório. Existe em todos os modos menos «todo o país» —
          quem se desloca também tem de dizer de onde parte. */}
      {cobertura.modo !== "pais" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Distrito
            </span>
            <SelectMenu
              id="cobertura-distrito"
              value={cobertura.distrito ?? ""}
              onChange={(v) => aoMudar({ ...cobertura, distrito: v || null })}
              options={OPCOES_DISTRITO}
              ariaLabel="Distrito"
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Concelho
            </span>
            <input
              type="text"
              value={cobertura.concelho ?? ""}
              maxLength={60}
              onChange={(e) => aoMudar({ ...cobertura, concelho: e.target.value || null })}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
        </div>
      )}

      {cobertura.modo === "concelhos" && (
        <div>
          <p className="text-sm font-medium text-stone-700">
            Concelhos que serves
          </p>
          {cobertura.concelhos.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {cobertura.concelhos.map((c, i) => (
                <li
                  key={`${c}-${i}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-stone-100 py-1 pl-3 pr-1 text-sm text-stone-700"
                >
                  {c}
                  <button
                    type="button"
                    aria-label={`Remover ${c}`}
                    onClick={() =>
                      aoMudar({ ...cobertura, concelhos: cobertura.concelhos.filter((_, k) => k !== i) })
                    }
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:text-stone-600"
                  >
                    <Close size={13} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {cobertura.concelhos.length < MAX_CONCELHOS && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={novoConcelho}
                maxLength={60}
                onChange={(e) => setNovoConcelho(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); acrescentarConcelho(); }
                }}
                placeholder="Ex.: Vila Nova de Gaia"
                aria-label="Concelho a acrescentar"
                className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <Button variant="secondary" size="sm" onClick={acrescentarConcelho} disabled={!novoConcelho.trim()}>
                <Plus size={14} aria-hidden />
                <span className="sr-only">Acrescentar concelho</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {cobertura.modo === "distritos" && (
        <div>
          <p className="text-sm font-medium text-stone-700">
            Distritos que cobres
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {DISTRITOS.map((d) => {
              const escolhido = cobertura.distritos.includes(d);
              return (
                <li key={d}>
                  <button
                    type="button"
                    aria-pressed={escolhido}
                    onClick={() =>
                      aoMudar({
                        ...cobertura,
                        distritos: escolhido
                          ? cobertura.distritos.filter((x) => x !== d)
                          : [...cobertura.distritos, d],
                      })
                    }
                    className={`inline-flex min-h-9 items-center rounded-xl px-3 text-sm font-medium transition-colors ${
                      escolhido
                        ? "bg-brand text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {d}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Nota sobre deslocações <span className="font-normal text-stone-400">(opcional)</span>
        </span>
        <input
          type="text"
          value={cobertura.nota ?? ""}
          maxLength={MAX_NOTA}
          onChange={(e) => aoMudar({ ...cobertura, nota: e.target.value || null })}
          placeholder="Ex.: desloco-me a partir de meio dia de trabalho."
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>

      {problemas.length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-alert-bg px-3 py-2.5 text-sm text-alert-text">
          {problemas.map((p, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <Warning size={14} className="mt-0.5 shrink-0" aria-hidden />
              {p.mensagem}
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1.5 rounded-2xl bg-stone-50 px-3 py-2 text-sm text-stone-600">
        <MapPin size={14} className="shrink-0 text-stone-400" aria-hidden />
        No perfil vai aparecer: <strong className="font-semibold">{frase}</strong>
      </p>
    </div>
  );
}
