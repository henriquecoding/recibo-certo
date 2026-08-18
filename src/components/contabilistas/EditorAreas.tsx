"use client";

// ═══════════════════════════════════════════════════════════════════════
//  EDITOR DE ÁREAS — os dez chips continuam, mas deixam de ser tudo
//  ---------------------------------------------------------------------
//  Em cima, o eixo canónico: as áreas por que o diretório filtra. Em
//  baixo, os termos próprios — o que a pessoa escreve com as suas
//  palavras.
//
//  A parte que faz isto funcionar é a linha que aparece quando um termo
//  cai numa área: «entra também no filtro X». Sem essa frase, ninguém
//  percebe porque é que escrever «nómadas digitais» a faz aparecer em
//  «Clientes internacionais» — e a magia por explicar lê-se como erro.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { Check, Close, Plus } from "@/components/ui/Icons";
import {
  AREAS, MAX_CARACTERES_TERMO, MAX_TERMOS, acrescentarTermo, areasEfetivas,
  sugerirAreas, type TermoProprio,
} from "@/lib/contabilistas/personalizacao/taxonomia";

export interface EditorAreasProps {
  areas: string[];
  termos: TermoProprio[];
  aoMudarAreas: (areas: string[]) => void;
  aoMudarTermos: (termos: TermoProprio[]) => void;
}

export default function EditorAreas({
  areas, termos, aoMudarAreas, aoMudarTermos,
}: EditorAreasProps) {
  const [rascunho, setRascunho] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const efetivas = useMemo(() => areasEfetivas(areas, termos), [areas, termos]);
  const sugestoes = useMemo(() => sugerirAreas(rascunho, areas), [rascunho, areas]);
  // As áreas que o perfil ganha só por causa dos termos escritos.
  const implicitas = efetivas.filter((a) => !areas.includes(a));

  function acrescentar() {
    const r = acrescentarTermo(termos, rascunho);
    if (!r.ok || !r.termo) { setErro(r.mensagem); return; }
    aoMudarTermos([...termos, r.termo]);
    setRascunho("");
    setErro(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-stone-600">
          São estas as áreas por que os clientes filtram no diretório.
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {AREAS.map((a) => {
            const escolhida = areas.includes(a);
            const implicita = !escolhida && implicitas.includes(a);
            return (
              <li key={a}>
                <button
                  type="button"
                  aria-pressed={escolhida}
                  onClick={() =>
                    aoMudarAreas(escolhida ? areas.filter((x) => x !== a) : [...areas, a])
                  }
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors ${
                    escolhida
                      ? "bg-brand text-white"
                      : implicita
                        ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:hover:bg-stone-700"
                  }`}
                >
                  {a}
                  {escolhida && <Check size={14} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
        {implicitas.length > 0 && (
          <p className="mt-2 text-xs text-stone-500">
            {implicitas.length === 1 ? "A área" : "As áreas"}{" "}
            <strong className="font-semibold">{implicitas.join(", ")}</strong>{" "}
            {implicitas.length === 1
              ? "vem dos teus termos e já conta no filtro, mesmo sem estar marcada."
              : "vêm dos teus termos e já contam no filtro, mesmo sem estarem marcadas."}
          </p>
        )}
      </div>

      <div className="border-t border-stone-100 pt-4">
        <p className="text-sm font-medium text-ink">Nas tuas palavras</p>
        <p className="mt-0.5 text-sm text-stone-500">
          Escreve o que fazes como o dirias a um cliente. Fica no teu perfil, e
          quando corresponder a uma das áreas acima entras também nesse filtro.
        </p>

        {termos.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {termos.map((t, i) => (
              <li
                key={`${t.texto}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white py-1 pl-3 pr-1 text-sm text-stone-700"
              >
                <span>
                  {t.texto}
                  {t.area && (
                    <span className="ml-1.5 text-xs text-stone-400">→ {t.area}</span>
                  )}
                </span>
                <button
                  type="button"
                  aria-label={`Remover «${t.texto}»`}
                  onClick={() => aoMudarTermos(termos.filter((_, k) => k !== i))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                >
                  <Close size={13} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        {termos.length < MAX_TERMOS && (
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="termo-novo">Termo novo</label>
              <input
                id="termo-novo"
                type="text"
                value={rascunho}
                maxLength={MAX_CARACTERES_TERMO}
                onChange={(e) => { setRascunho(e.target.value); setErro(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); acrescentar(); }
                }}
                placeholder="Ex.: nómadas digitais, criadores de conteúdo, clínicas"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              {erro && <p className="mt-1 text-xs text-clay-text">{erro}</p>}
              {!erro && sugestoes.length > 0 && (
                <p className="mt-1 text-xs text-stone-500">
                  Isto parece ser {sugestoes.join(" ou ")} — podes marcar a área acima.
                </p>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={acrescentar} disabled={!rascunho.trim()}>
              <Plus size={14} className="mr-1.5" aria-hidden /> Acrescentar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
