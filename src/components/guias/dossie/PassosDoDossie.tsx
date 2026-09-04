"use client";

// ═══════════════════════════════════════════════════════════════════════
//  OS TRÊS PASSOS DA FOLHA DE COMPOSIÇÃO
//  ---------------------------------------------------------------------
//  1. O QUE SEGUE   — as secções, com contagem e pré-visualização real.
//                     É aqui que a divulgação seletiva vive: quem detém
//                     escolhe, secção a secção, e o que não for escolhido
//                     não é escondido — não é composto.
//  2. O TEU CASO    — as perguntas de enquadramento («não sei» já
//                     escolhido) e os elementos, com o estado que a
//                     checklist do guia já conhece. Nada obrigatório.
//  3. A QUEM        — os três destinos, o consentimento à vista, e o que
//                     acontece a seguir dito em duas linhas.
//
//  Mobile-first, como sempre: alvos ≥ 44 px, nada assume desktop, e a
//  tipografia usa o piso do design system.
// ═══════════════════════════════════════════════════════════════════════

import {
  ROTULO_ESTADO_ELEMENTO, ROTULO_RESPOSTA, TITULO_SECCAO,
  type EstadoElemento, type IdSeccao, type PerguntaDeGuia,
  type ProjecaoDeGuia, type RespostaPergunta, type SeccaoDossie,
} from "@/lib/guias/dossie";
import { Check, Lock, Warning } from "@/components/ui/Icons";

// ─── Peças partilhadas ─────────────────────────────────────────────────

/** Um seletor segmentado. Alvos altos, sem `select` nativo a meio da folha. */
function Segmentado<T extends string>({
  valor, opcoes, aoEscolher, etiqueta,
}: {
  valor: T;
  opcoes: { id: T; rotulo: string }[];
  aoEscolher: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-1">
      {opcoes.map((o) => {
        const ativo = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => aoEscolher(o.id)}
            className={`min-h-[36px] rounded-xl px-3 text-xs font-medium transition-colors ${
              ativo
                ? "bg-brand text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
            }`}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

const OPCOES_RESPOSTA: { id: RespostaPergunta; rotulo: string }[] = [
  { id: "sim", rotulo: ROTULO_RESPOSTA.sim },
  { id: "nao", rotulo: ROTULO_RESPOSTA.nao },
  { id: "nao_sei", rotulo: ROTULO_RESPOSTA.nao_sei },
];

const OPCOES_ELEMENTO: { id: EstadoElemento; rotulo: string }[] = [
  { id: "tenho", rotulo: ROTULO_ESTADO_ELEMENTO.tenho },
  { id: "por_reunir", rotulo: ROTULO_ESTADO_ELEMENTO.por_reunir },
  { id: "nao_aplica", rotulo: ROTULO_ESTADO_ELEMENTO.nao_aplica },
  { id: "nao_sei", rotulo: ROTULO_ESTADO_ELEMENTO.nao_sei },
];

// ─── Passo 1 · o que segue ─────────────────────────────────────────────

export function PassoSeccoes({
  seccoes, incluidas, alternar, simulacao,
}: {
  seccoes: SeccaoDossie[];
  incluidas: Set<IdSeccao>;
  alternar: (id: IdSeccao) => void;
  /**
   * A última simulação do dispositivo, quando existe.
   *
   * Aparece à parte e NASCE DESLIGADA (§14.4): é a única secção com
   * valores fiscais, e ligá-la tem de ser um ato — não uma omissão de
   * quem não leu a lista.
   */
  simulacao?: { titulo: string; descricao: string } | null;
}) {
  return (
    <>
      <p className="flex items-start gap-2.5 rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-stone-600 dark:bg-stone-800 dark:text-stone-300">
        <Lock size={15} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
        Segue o que está aqui, e mais nada. Sem o teu nome, sem NIF, sem contactos e sem
        documentos — o dossiê é sobre o assunto, não sobre ti.
      </p>

      <ul className="mt-4 space-y-2">
        {seccoes.map((s) => {
          const dentro = incluidas.has(s.id);
          const obrigatoria = s.id === "resumo" || s.id === "base_legal";
          return (
            <li key={s.id}>
              <div
                className={`rounded-2xl border p-3 transition-colors ${
                  dentro
                    ? "border-brand/40 bg-white dark:border-brand/40 dark:bg-stone-900"
                    : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900/40"
                }`}
              >
                <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={dentro}
                    disabled={obrigatoria}
                    onChange={() => alternar(s.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      dentro ? "border-brand bg-brand text-white" : "border-stone-300 dark:border-stone-600"
                    } ${obrigatoria ? "opacity-60" : ""}`}
                  >
                    {dentro && <Check size={12} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold text-ink">{TITULO_SECCAO[s.id]}</span>
                      <span className="texto-mini tabular-nums text-stone-400">
                        {s.itens.length} {s.itens.length === 1 ? "item" : "itens"}
                      </span>
                      {obrigatoria && (
                        <span className="texto-mini text-stone-400">· segue sempre</span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      {s.itens
                        .slice(0, 2)
                        .map((i) => i.texto)
                        .join(" · ")
                        .slice(0, 160)}
                      {s.itens.length > 2 ? "…" : ""}
                    </span>
                  </span>
                </label>
              </div>
            </li>
          );
        })}

        {simulacao && (
          <li>
            <div
              className={`rounded-2xl border p-3 transition-colors ${
                incluidas.has("simulacao")
                  ? "border-brand/40 bg-white dark:border-brand/40 dark:bg-stone-900"
                  : "border-dashed border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-900/40"
              }`}
            >
              <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={incluidas.has("simulacao")}
                  onChange={() => alternar("simulacao")}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    incluidas.has("simulacao")
                      ? "border-brand bg-brand text-white"
                      : "border-stone-300 dark:border-stone-600"
                  }`}
                >
                  {incluidas.has("simulacao") && <Check size={12} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-ink">{TITULO_SECCAO.simulacao}</span>
                    <span className="texto-mini text-stone-400">· desligada por omissão</span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    {simulacao.titulo} — {simulacao.descricao}. É a única parte com valores
                    teus, e só segue se a ligares.
                  </span>
                </span>
              </label>
            </div>
          </li>
        )}
      </ul>
    </>
  );
}

// ─── Passo 2 · o teu caso ──────────────────────────────────────────────

export function PassoCaso({
  projecao, perguntas, responder, elementos, marcarElemento, nota, escreverNota, notaMax, excluidos,
}: {
  projecao: ProjecaoDeGuia;
  perguntas: PerguntaDeGuia[];
  responder: (id: string, r: RespostaPergunta) => void;
  elementos: Record<number, EstadoElemento>;
  marcarElemento: (i: number, e: EstadoElemento) => void;
  nota: string;
  escreverNota: (v: string) => void;
  notaMax: number;
  excluidos: PerguntaDeGuia[];
}) {
  return (
    <>
      <label className="block">
        <span className="text-sm font-medium text-stone-600 dark:text-stone-300">
          O que queres dizer primeiro (opcional)
        </span>
        <textarea
          value={nota}
          onChange={(e) => escreverNota(e.target.value.slice(0, notaMax))}
          rows={3}
          placeholder="Ex.: recebi uma citação de execução fiscal."
          className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        />
        <span className="texto-mini mt-1 block tabular-nums text-stone-400">
          {nota.length} / {notaMax}
        </span>
      </label>

      {excluidos.length > 0 && (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm leading-relaxed text-clay-text"
        >
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Este guia diz que não se aplica a quem respondeu «sim» acima. Podes enviar na
            mesma — mas talvez seja outro o guia certo
            {projecao.relacionados.length > 0
              ? `: ${projecao.relacionados.map((r) => r.titulo).join(", ")}.`
              : "."}
          </span>
        </p>
      )}

      {perguntas.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            O enquadramento
          </h3>
          <p className="texto-mini mt-1 text-stone-500 dark:text-stone-400">
            «Não sei» é uma resposta útil — é por aí que a conversa começa.
          </p>
          <ul className="mt-3 space-y-3">
            {perguntas.map((p) => (
              <li key={p.id} className="rounded-2xl border border-stone-200 p-3 dark:border-stone-700">
                <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-200">
                  <span className="texto-mini mr-1.5 text-stone-400">
                    {p.sentido === "exclui" ? "não se aplica se" : "aplica-se se"}
                  </span>
                  {p.texto}
                </p>
                <div className="mt-2">
                  <Segmentado
                    etiqueta={p.texto}
                    valor={p.resposta}
                    opcoes={OPCOES_RESPOSTA}
                    aoEscolher={(v) => responder(p.id, v)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {projecao.elementos.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            O que já tens
          </h3>
          <p className="texto-mini mt-1 text-stone-500 dark:text-stone-400">
            Vem do que marcaste na checklist deste guia. Podes mudar aqui.
          </p>
          <ul className="mt-3 space-y-3">
            {projecao.elementos.map((texto, i) => (
              <li key={texto} className="rounded-2xl border border-stone-200 p-3 dark:border-stone-700">
                <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-200">
                  <span className="texto-mini mr-1.5 tabular-nums text-stone-400">{i + 1}.</span>
                  {texto}
                </p>
                <div className="mt-2">
                  <Segmentado
                    etiqueta={texto}
                    valor={elementos[i] ?? "nao_sei"}
                    opcoes={OPCOES_ELEMENTO}
                    aoEscolher={(v) => marcarElemento(i, v)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
