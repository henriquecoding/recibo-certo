"use client";

// ═══════════════════════════════════════════════════════════════════════
//  REFINAR RESULTADOS — o mesmo painel, duas superfícies
//  ---------------------------------------------------------------------
//  No desktop é uma coluna à esquerda dos resultados; no telemóvel é uma
//  folha inferior que se abre a pedido (§24, §25). O conteúdo é escrito
//  uma vez: dois painéis diferentes seriam dois sítios para esquecer de
//  acrescentar um filtro.
//
//  O grupo «Confiança» só usa factos verificáveis — a OCC confirmada pela
//  administração e a ligação ao LinkedIn. Não há «melhor avaliado» nem
//  «top profissional»: não existe sistema nenhum por trás disso, e um
//  filtro que ordena por uma coisa que não medimos é uma mentira com
//  caixa de seleção (§24, §148).
// ═══════════════════════════════════════════════════════════════════════

import { ESPECIALIDADES } from "@/lib/contabilistas/catalogo";
import { IDIOMAS } from "@/lib/contabilistas/perfil";
import type { FiltroDiretorio, ModalidadeFiltro } from "@/lib/contabilistas/diretorio";
import { SuperficieModal } from "@/components/overlays/SuperficieModal";
import { Check, Close } from "@/components/ui/Icons";

const MODALIDADES: readonly { valor: ModalidadeFiltro; label: string }[] = [
  { valor: "online", label: "Online" },
  { valor: "presencial", label: "Presencial" },
  { valor: "ambos", label: "Online e presencial" },
];

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-stone-100 py-4 last:border-b-0 dark:border-stone-800">
      <legend className="text-[0.625rem] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
        {titulo}
      </legend>
      <div className="mt-2.5">{children}</div>
    </fieldset>
  );
}

function Caixa({
  rotulo,
  nota,
  marcada,
  onMudar,
}: {
  rotulo: string;
  nota?: string;
  marcada: boolean;
  onMudar: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-[2.25rem] cursor-pointer items-start gap-2.5 py-1">
      <input
        type="checkbox"
        checked={marcada}
        onChange={(e) => onMudar(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="mt-0.5 flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-[0.35rem] border border-stone-300 bg-white transition-colors peer-checked:border-brand peer-checked:bg-brand peer-checked:[&>svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 peer-focus-visible:ring-offset-2 dark:border-stone-600 dark:bg-stone-950 dark:peer-focus-visible:ring-offset-stone-900"
      >
        <Check size={11} className="text-white opacity-0 transition-opacity" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-stone-700 dark:text-stone-200">{rotulo}</span>
        {nota && (
          <span className="mt-0.5 block text-xs leading-snug text-stone-400 dark:text-stone-500">
            {nota}
          </span>
        )}
      </span>
    </label>
  );
}

function Etiqueta({
  rotulo,
  ativa,
  onClick,
}: {
  rotulo: string;
  ativa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativa}
      onClick={onClick}
      className={`focus-marca min-h-[2.25rem] rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        ativa
          ? "border-brand/30 bg-brand-light text-brand-dark dark:border-brand/40 dark:bg-brand/20 dark:text-brand-mint"
          : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
      }`}
    >
      {rotulo}
    </button>
  );
}

export interface PropsFiltros {
  filtro: FiltroDiretorio;
  onMudar: (mudanca: Partial<FiltroDiretorio>) => void;
}

export function PainelDeFiltros({ filtro, onMudar }: PropsFiltros) {
  return (
    <div>
      <Grupo titulo="Disponibilidade">
        <Caixa
          rotulo="Aceita novos clientes"
          marcada={filtro.soAceitaNovos}
          onMudar={(v) => onMudar({ soAceitaNovos: v })}
        />
      </Grupo>

      <Grupo titulo="Atendimento">
        <div className="flex flex-wrap gap-1.5">
          {MODALIDADES.map((m) => (
            <Etiqueta
              key={m.valor}
              rotulo={m.label}
              ativa={filtro.modalidade === m.valor}
              onClick={() => onMudar({ modalidade: filtro.modalidade === m.valor ? "" : m.valor })}
            />
          ))}
        </div>
      </Grupo>

      <Grupo titulo="Áreas de trabalho">
        <div className="flex flex-wrap gap-1.5">
          {ESPECIALIDADES.map((e) => (
            <Etiqueta
              key={e}
              rotulo={e}
              ativa={filtro.especialidade === e}
              onClick={() => onMudar({ especialidade: filtro.especialidade === e ? "" : e })}
            />
          ))}
        </div>
      </Grupo>

      <Grupo titulo="Idiomas">
        <div className="flex flex-wrap gap-1.5">
          {IDIOMAS.map((i) => (
            <Etiqueta
              key={i.codigo}
              rotulo={i.nome}
              ativa={filtro.idioma === i.codigo}
              onClick={() => onMudar({ idioma: filtro.idioma === i.codigo ? "" : i.codigo })}
            />
          ))}
        </div>
      </Grupo>

      <Grupo titulo="Confiança">
        <Caixa
          rotulo="OCC verificada"
          nota="Número confirmado pela administração, não apenas escrito no perfil."
          marcada={filtro.soOccVerificada}
          onMudar={(v) => onMudar({ soOccVerificada: v })}
        />
        <Caixa
          rotulo="LinkedIn ligado"
          nota="A conta do Recibo Certo está ligada a um perfil profissional do LinkedIn."
          marcada={filtro.soLinkedIn}
          onMudar={(v) => onMudar({ soLinkedIn: v })}
        />
      </Grupo>
    </div>
  );
}

/** A coluna do desktop. Fica escondida no telemóvel — lá abre a folha. */
export function ColunaDeFiltros({
  filtro,
  onMudar,
  onLimpar,
  temFiltros,
}: PropsFiltros & { onLimpar: () => void; temFiltros: boolean }) {
  // Fixa ao topo, mas com scroll próprio: uma coluna mais alta do que o
  // ecrã e presa com `sticky` esconde os últimos filtros para sempre.
  return (
    <aside
      aria-label="Refinar resultados"
      className="hidden self-start rounded-4xl border border-stone-200 bg-white/70 p-4 shadow-card lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain dark:border-stone-800 dark:bg-stone-900/60"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
          Refinar resultados
        </h3>
        {temFiltros && (
          <button
            type="button"
            onClick={onLimpar}
            className="focus-marca rounded-lg px-1 py-0.5 text-xs font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-mint"
          >
            Limpar
          </button>
        )}
      </div>
      <PainelDeFiltros filtro={filtro} onMudar={onMudar} />
    </aside>
  );
}

/**
 * A folha inferior do telemóvel.
 *
 * A `SuperficieModal` trata do que se esquece sempre: prender o Tab,
 * tornar o resto da página inerte, bloquear o scroll do corpo, devolver o
 * foco ao botão que a abriu e fechar com Esc. O corpo tem `min-h-0` para
 * poder rolar dentro do `max-h-[90dvh]`, e o rodapé respeita a área
 * segura — sem isso o botão fica debaixo da barra do sistema (§25, §61).
 */
export function FolhaDeFiltros({
  aberta,
  onFechar,
  filtro,
  onMudar,
  onLimpar,
  total,
  aLer,
}: PropsFiltros & {
  aberta: boolean;
  onFechar: () => void;
  onLimpar: () => void;
  total: number;
  aLer: boolean;
}) {
  return (
    <SuperficieModal
      aberto={aberta}
      aoFechar={onFechar}
      rotulo="Refinar resultados"
      className="fixed inset-0 z-[120] flex items-end lg:hidden"
    >
      <div
        className="absolute inset-0 bg-stone-900/45 backdrop-blur-md"
        onClick={onFechar}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[90dvh] w-full flex-col rounded-t-4xl border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 dark:border-stone-800">
          <h2 className="font-display text-lg text-ink dark:text-stone-50">Refinar resultados</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onLimpar}
              className="focus-marca min-h-[2.25rem] rounded-xl px-3 text-sm font-semibold text-brand-dark dark:text-brand-mint"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar filtros"
              className="focus-marca flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <Close size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
          <PainelDeFiltros filtro={filtro} onMudar={onMudar} />
        </div>

        <div className="shrink-0 border-t border-stone-100 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 dark:border-stone-800">
          <button
            type="button"
            onClick={onFechar}
            className="btn-shine focus-marca min-h-[3rem] w-full rounded-2xl bg-brand px-5 text-sm font-semibold text-white shadow-glow"
          >
            {aLer
              ? "A procurar…"
              : total === 0
                ? "Sem resultados"
                : `Ver ${total} ${total === 1 ? "resultado" : "resultados"}`}
          </button>
        </div>
      </div>
    </SuperficieModal>
  );
}
