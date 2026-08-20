"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O PERFIL DE QUEM GERE — §43, §45
//  ---------------------------------------------------------------------
//  O motor de empresa recebia quatro campos sobre a pessoa: dependentes,
//  «conjunta», região e IFICI. Enquanto isso, o motor de vencimento sabe
//  estado civil, incapacidade do próprio, dos dependentes e do cônjuge,
//  IRS Jovem e região — e o resultado é que a MESMA pessoa era simulada
//  com perfis diferentes conforme o ecrã em que estava.
//
//  ── A CONFUSÃO QUE ISTO DESFAZ ─────────────────────────────────────
//  «Tributação conjunta» é uma opção da declaração anual de IRS
//  (Art. 13.º, n.º 2 do CIRS). «Casado, único titular» é uma TABELA DE
//  RETENÇÃO, e só se aplica quando um dos cônjuges não aufere
//  rendimentos. O código antigo tratava-as como a mesma coisa:
//
//      maritalStatus: perfil.conjunta ? "casadoUnico" : "naoCasado"
//
//  Um casal com dois rendimentos que opta pela conjunta retém à tabela de
//  DOIS titulares — e recebia a de único titular, que retém menos. O
//  líquido do gerente saía acima do real, só desse lado da comparação.
//
//  ── E AS PREFERÊNCIAS JÁ GUARDADAS (§45) ───────────────────────────
//  São oferecidas, com o que preenchem e o que NÃO preenchem à vista.
//  Nunca aplicadas em silêncio: um número personalizado que a pessoa não
//  pediu, feito com dados que ela não sabe quais são, é pior do que um
//  número genérico assumido em voz alta.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { META_REGIAO, type EstadoCivilRet, type Regiao } from "@/lib/fiscal-data";
import {
  ESTADOS_CIVIS,
  EXPLICACAO_ESTADO_CIVIL,
  ROTULO_ESTADO_CIVIL,
  camposRespondidos,
  type PerfilFiscalPessoa,
} from "@/lib/perfil-pessoa";
import { ofertaDePreferencias, pendentesDaImportacao } from "@/lib/empresa/preferencias";
import { lerPreferenciasFiscais } from "@/lib/store/preferencias-fiscais";
import { Check, Info } from "@/components/ui/Icons";

const REGIOES: Regiao[] = ["continente", "madeira", "acores"];

export default function PerfilGerenteEditor({
  perfil,
  aoMudar,
}: {
  perfil: PerfilFiscalPessoa | undefined;
  aoMudar: (p: PerfilFiscalPessoa) => void;
}) {
  const p = perfil ?? {};
  const [importado, setImportado] = useState(false);
  const [dispensado, setDispensado] = useState(false);

  // Lido uma vez: o cofre não muda enquanto este ecrã está aberto, e um
  // `useState` inicial evita reler o armazenamento a cada tecla.
  const oferta = useMemo(() => ofertaDePreferencias(lerPreferenciasFiscais()), []);
  const respondidos = camposRespondidos(p);

  return (
    <div className="rounded-2xl border border-stone-200 p-3 dark:border-stone-700">
      <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
        A situação pessoal de quem gere
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
        Decide a retenção de IRS sobre o salário da gerência. Sem isto, assumimos Continente, não casado e sem
        dependentes — e dizemos que assumimos.
      </p>

      {/* ── §45 — a oferta, nunca a aplicação silenciosa ─────────── */}
      {oferta.temAlgoUtil && !importado && !dispensado ? (
        <div className="mt-3 rounded-xl border border-brand/25 bg-brand-light/40 p-3 dark:border-brand/25 dark:bg-brand/10">
          <p className="text-xs font-semibold text-brand-deep dark:text-brand-mint">
            Encontrámos preferências fiscais que já configuraste
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {oferta.linhas.map((l) => (
              <li
                key={l}
                className="flex items-start gap-1.5 text-[11px] leading-relaxed text-stone-700 dark:text-stone-200"
              >
                <Check size={11} className="mt-0.5 flex-shrink-0" aria-hidden />
                {l}
              </li>
            ))}
          </ul>
          {pendentesDaImportacao(oferta.perfil).length > 0 ? (
            <ul className="mt-2 space-y-0.5 border-t border-brand/20 pt-2">
              {pendentesDaImportacao(oferta.perfil).map((l) => (
                <li
                  key={l}
                  className="flex items-start gap-1.5 text-[10px] leading-relaxed text-stone-600 dark:text-stone-300"
                >
                  <Info size={10} className="mt-0.5 flex-shrink-0" aria-hidden />
                  Continua por responder: {l}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                aoMudar({ ...p, ...oferta.perfil });
                setImportado(true);
              }}
              className="inline-flex min-h-[36px] items-center rounded-full bg-brand px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Usar estas respostas
            </button>
            <button
              type="button"
              onClick={() => setDispensado(true)}
              className="inline-flex min-h-[36px] items-center rounded-full px-3 text-xs font-semibold text-stone-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-300"
            >
              Prefiro rever aqui
            </button>
          </div>
        </div>
      ) : null}

      {importado ? (
        <p className="mt-2 text-[11px] text-brand-dark dark:text-brand-mint" role="status">
          Importado do teu perfil fiscal. Podes mudar tudo aqui — nada fica fechado.
        </p>
      ) : null}

      {/* ── A tabela de retenção, explícita ─────────────────────── */}
      <fieldset className="mt-3">
        <legend className="text-[11px] font-semibold text-stone-700 dark:text-stone-200">
          Tabela de retenção
        </legend>
        <div className="mt-1.5 space-y-1.5">
          {ESTADOS_CIVIS.map((e: EstadoCivilRet) => {
            const ativo = p.estadoCivil === e;
            return (
              <button
                key={e}
                type="button"
                aria-pressed={ativo}
                onClick={() => aoMudar({ ...p, estadoCivil: e })}
                className={`block w-full rounded-xl border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  ativo
                    ? "border-brand bg-brand-light/60 dark:bg-brand/10"
                    : "border-stone-200 hover:border-stone-300 dark:border-stone-700 dark:hover:border-stone-600"
                }`}
              >
                <span
                  className={`block text-xs font-semibold ${
                    ativo ? "text-brand-deep dark:text-brand-mint" : "text-stone-800 dark:text-stone-100"
                  }`}
                >
                  {ROTULO_ESTADO_CIVIL[e]}
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-stone-500 dark:text-stone-400">
                  {EXPLICACAO_ESTADO_CIVIL[e]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">
          Não é o mesmo que optar pela tributação conjunta: essa é uma escolha da declaração anual, esta é a tabela
          que a empresa aplica ao reter todos os meses.
        </p>
      </fieldset>

      {/* ── Dependentes, região e IRS Jovem ─────────────────────── */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="gerente-dependentes"
            className="block text-[11px] font-semibold text-stone-700 dark:text-stone-200"
          >
            Dependentes
          </label>
          <input
            id="gerente-dependentes"
            type="number"
            inputMode="numeric"
            min={0}
            max={12}
            value={p.dependentes ?? 0}
            onChange={(e) => aoMudar({ ...p, dependentes: Math.max(0, Number(e.target.value) || 0) })}
            className="mt-1 min-h-[40px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm tabular-nums text-stone-800 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </div>

        <div>
          <label
            htmlFor="gerente-regiao"
            className="block text-[11px] font-semibold text-stone-700 dark:text-stone-200"
          >
            Residência fiscal
          </label>
          <select
            id="gerente-regiao"
            value={p.regiao ?? ""}
            onChange={(e) =>
              aoMudar({ ...p, regiao: (e.target.value || undefined) as Regiao | undefined })
            }
            className="mt-1 min-h-[40px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          >
            <option value="">A assumir Continente</option>
            {REGIOES.map((r) => (
              <option key={r} value={r}>
                {META_REGIAO[r]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="gerente-jovem"
            className="block text-[11px] font-semibold text-stone-700 dark:text-stone-200"
          >
            IRS Jovem
          </label>
          <select
            id="gerente-jovem"
            value={p.irsJovemAno ?? 0}
            onChange={(e) => aoMudar({ ...p, irsJovemAno: Number(e.target.value) || undefined })}
            className="mt-1 min-h-[40px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          >
            <option value={0}>Não aplicável</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((a) => (
              <option key={a} value={a}>
                {a}.º ano
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">
        {respondidos.length > 0
          ? `Personalizado com ${respondidos.length} ${respondidos.length === 1 ? "resposta tua" : "respostas tuas"}.`
          : "Ainda sem respostas tuas — a estimativa de IRS é genérica."}
      </p>
    </div>
  );
}
