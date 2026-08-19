"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Átomos do simulador de preço.
//  ---------------------------------------------------------------------
//  Não são componentes novos do design system — são composições dos que já
//  existem, com os rótulos e os alvos de toque que esta ferramenta precisa
//  de repetir dezenas de vezes. Viverem aqui evita que a mesma marcação
//  seja copiada em seis sítios e depois divirja em três.
//
//  Regras herdadas do `CLAUDE.md` e do `DESIGN.md` e que estes átomos
//  garantem por construção: alvos ≥ 36 px, foco visível, `tabular-nums`
//  nos números, e nenhuma cor que só exista no modo claro.
//
//  ── DUAS CORREÇÕES QUE VALEM POR TODAS AS OUTRAS ────────────────────
//
//  ① A ajuda deixou de viver SÓ dentro do tooltip. O `InfoTip` esconde o
//    texto atrás de um clique e — pior — não estava ligado ao campo por
//    `aria-describedby`, por isso para quem usa leitor de ecrã a descrição
//    simplesmente não existia. Agora um campo pode ter `descricao`
//    (visível, ligada, para o que evita o erro) e `ajuda` (no tooltip,
//    para a base legal e o detalhe). A NN/g diz a mesma coisa por outras
//    palavras: dar âncoras de valor razoável AO LADO do campo é o que faz
//    a diferença entre uma estimativa e um palpite.
//
//  ② O `Segmentado` dizia neste comentário ser «um radiogroup a sério —
//    com setas do teclado — e não uma fila de botões que só parece um».
//    Não era: não havia `onKeyDown` nem `tabIndex` móvel, as setas não
//    faziam nada e todos os botões eram tabuláveis. O axe não o apanha
//    (a estrutura `radiogroup`/`radio` está formalmente correta), e por
//    isso passou o «zero violações» estando partido para teclado. Agora
//    cumpre o padrão WAI-ARIA: um só ponto de tabulação, setas a mover e
//    a selecionar, Home/End nos extremos.
// ═══════════════════════════════════════════════════════════════════════

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import LocalizedNumberInput from "@/components/ui/LocalizedNumberInput";
import InfoTip from "@/components/ui/InfoTip";
import { RotateCcw } from "@/components/ui/Icons";

export function Campo({
  rotulo,
  ajuda,
  descricao,
  idDescricao,
  sufixo,
  children,
  htmlFor,
}: {
  rotulo: string;
  /** Detalhe e base legal. Fica no tooltip. */
  ajuda?: ReactNode;
  /** O que evita o erro. Fica VISÍVEL e ligado por `aria-describedby`. */
  descricao?: ReactNode;
  idDescricao?: string;
  sufixo?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400"
      >
        {rotulo}
        {ajuda ? <InfoTip>{ajuda}</InfoTip> : null}
        {sufixo ? (
          <span className="ml-auto text-[11px] font-normal text-stone-500 dark:text-stone-400">{sufixo}</span>
        ) : null}
      </label>
      {children}
      {descricao ? (
        <p
          id={idDescricao}
          className="mt-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400"
        >
          {descricao}
        </p>
      ) : null}
    </div>
  );
}

const CLASSE_INPUT =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-medium tabular-nums text-stone-800 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100";

export function CampoEuros({
  id,
  rotulo,
  ajuda,
  descricao,
  valor,
  aoMudar,
  max = 1_000_000,
  passo,
}: {
  id: string;
  rotulo: string;
  ajuda?: ReactNode;
  descricao?: ReactNode;
  valor: number;
  aoMudar: (v: number) => void;
  max?: number;
  passo?: number;
}) {
  const idDesc = descricao ? `${id}-desc` : undefined;
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} descricao={descricao} idDescricao={idDesc} htmlFor={id}>
      <div className="relative">
        <LocalizedNumberInput
          id={id}
          value={valor}
          onValueChange={aoMudar}
          min={0}
          max={max}
          step={passo}
          inputMode="decimal"
          aria-describedby={idDesc}
          className={`${CLASSE_INPUT} pr-8`}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 dark:text-stone-400"
        >
          €
        </span>
      </div>
    </Campo>
  );
}

export function CampoPercentagem({
  id,
  rotulo,
  ajuda,
  descricao,
  /** Fração (0,35), não percentagem. A conversão vive aqui e só aqui. */
  valor,
  aoMudar,
  max = 95,
}: {
  id: string;
  rotulo: string;
  ajuda?: ReactNode;
  descricao?: ReactNode;
  valor: number;
  aoMudar: (fracao: number) => void;
  max?: number;
}) {
  const idDesc = descricao ? `${id}-desc` : undefined;
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} descricao={descricao} idDescricao={idDesc} htmlFor={id}>
      <div className="relative">
        <LocalizedNumberInput
          id={id}
          value={Math.round(valor * 1000) / 10}
          onValueChange={(v) => aoMudar(v / 100)}
          min={0}
          max={max}
          maxDecimals={1}
          inputMode="decimal"
          aria-describedby={idDesc}
          className={`${CLASSE_INPUT} pr-8`}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 dark:text-stone-400"
        >
          %
        </span>
      </div>
    </Campo>
  );
}

export function CampoNumero({
  id,
  rotulo,
  ajuda,
  descricao,
  valor,
  aoMudar,
  sufixo,
  max = 100_000,
  decimais = 0,
}: {
  id: string;
  rotulo: string;
  ajuda?: ReactNode;
  descricao?: ReactNode;
  valor: number;
  aoMudar: (v: number) => void;
  sufixo?: string;
  max?: number;
  decimais?: number;
}) {
  const idDesc = descricao ? `${id}-desc` : undefined;
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} descricao={descricao} idDescricao={idDesc} htmlFor={id}>
      <div className="relative">
        <LocalizedNumberInput
          id={id}
          value={valor}
          onValueChange={aoMudar}
          min={0}
          max={max}
          maxDecimals={decimais}
          inputMode="numeric"
          aria-describedby={idDesc}
          className={`${CLASSE_INPUT} ${sufixo ? "pr-12" : ""}`}
        />
        {sufixo ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 dark:text-stone-400"
          >
            {sufixo}
          </span>
        ) : null}
      </div>
    </Campo>
  );
}

/**
 * Grupo de opções mutuamente exclusivas, com o padrão WAI-ARIA completo:
 * um só ponto de tabulação (`tabIndex` móvel), setas a mover e a
 * selecionar, `Home`/`End` nos extremos, e o foco a acompanhar a seleção.
 *
 * A seleção segue o foco de propósito — é o comportamento de um grupo de
 * rádios nativo, e aqui cada mudança recalcula o preço, o que torna a
 * exploração com as setas a forma mais rápida de comparar as opções.
 */
export function Segmentado<T extends string>({
  rotulo,
  ajuda,
  descricao,
  opcoes,
  valor,
  aoMudar,
  colunas,
}: {
  rotulo?: string;
  ajuda?: ReactNode;
  descricao?: ReactNode;
  opcoes: { valor: T; rotulo: string; sub?: string }[];
  valor: T;
  aoMudar: (v: T) => void;
  colunas?: number;
}) {
  // Mapa explícito, não interpolação: o Tailwind analisa o ficheiro em
  // texto e `grid-cols-${n}` nunca chega ao CSS produzido.
  const GRELHAS: Record<number, string> = {
    2: "grid grid-cols-2 gap-2",
    3: "grid grid-cols-3 gap-2",
    4: "grid grid-cols-2 gap-2 sm:grid-cols-4",
  };
  const grelha = (colunas && GRELHAS[colunas]) || "flex flex-wrap gap-2";

  const idBase = useId();
  const idDesc = descricao ? `${idBase}-desc` : undefined;
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);

  const indiceAtivo = Math.max(
    0,
    opcoes.findIndex((o) => o.valor === valor),
  );

  const irPara = (i: number) => {
    const destino = (i + opcoes.length) % opcoes.length;
    aoMudar(opcoes[destino].valor);
    botoes.current[destino]?.focus();
  };

  const aoTeclar = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        irPara(i + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        irPara(i - 1);
        break;
      case "Home":
        e.preventDefault();
        irPara(0);
        break;
      case "End":
        e.preventDefault();
        irPara(opcoes.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-w-0">
      {rotulo ? (
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400">
          {rotulo}
          {ajuda ? <InfoTip>{ajuda}</InfoTip> : null}
        </span>
      ) : null}
      <div role="radiogroup" aria-label={rotulo} aria-describedby={idDesc} className={grelha}>
        {opcoes.map((o, i) => {
          const ativo = o.valor === valor;
          return (
            <button
              key={o.valor}
              ref={(el) => {
                botoes.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={ativo}
              tabIndex={i === indiceAtivo ? 0 : -1}
              onClick={() => aoMudar(o.valor)}
              onKeyDown={(e) => aoTeclar(e, i)}
              className={`min-h-[38px] flex-1 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                ativo
                  ? "border-brand-dark bg-brand-dark text-white shadow-glow"
                  : "border-stone-200 bg-white text-stone-600 hover:border-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
              }`}
            >
              <span className="block">{o.rotulo}</span>
              {o.sub ? (
                <span
                  className={`mt-0.5 block text-[10px] font-normal ${ativo ? "text-brand-light" : "text-stone-500 dark:text-stone-400"}`}
                >
                  {o.sub}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {descricao ? (
        <p id={idDesc} className="mt-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          {descricao}
        </p>
      ) : null}
    </div>
  );
}

export function Seletor<T extends string>({
  id,
  rotulo,
  ajuda,
  descricao,
  opcoes,
  valor,
  aoMudar,
}: {
  id: string;
  rotulo: string;
  ajuda?: ReactNode;
  descricao?: ReactNode;
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  aoMudar: (v: T) => void;
}) {
  const idDesc = descricao ? `${id}-desc` : undefined;
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} descricao={descricao} idDescricao={idDesc} htmlFor={id}>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value as T)}
        aria-describedby={idDesc}
        className={`${CLASSE_INPUT} cursor-pointer appearance-none bg-[length:14px] bg-[right_0.75rem_center] bg-no-repeat pr-9`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23a8a29e' stroke-width='2'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
        }}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </Campo>
  );
}

/**
 * Secção dobrável do modo preciso.
 *
 * `estado` e `impacto` existem porque um acordeão fechado e anónimo é
 * indistinguível de um que não interessa: dez destes, todos iguais, e a
 * pessoa ou os abre todos (e desiste) ou não abre nenhum (e leva um preço
 * calculado com zero custos fixos, apresentado como recomendação).
 */
export function Bloco({
  id,
  titulo,
  descricao,
  estado,
  impacto,
  destacado,
  aberto,
  alternar,
  aoRepor,
  children,
}: {
  id?: string;
  titulo: string;
  descricao?: string;
  /** «Por preencher» ou o resumo do que já lá está: «3 itens · 320 €/mês». */
  estado?: string;
  /** O que este bloco muda no resultado. Uma frase de três palavras. */
  impacto?: string;
  /** `true` quando um aviso do motor aponta este bloco como em falta. */
  destacado?: boolean;
  aberto: boolean;
  alternar: () => void;
  aoRepor?: () => void;
  children: ReactNode;
}) {
  const idGerado = useId();
  const idPainel = `${id ?? idGerado}-painel`;
  const idBotao = `${id ?? idGerado}-botao`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white dark:bg-stone-900 ${
        destacado
          ? "border-alert-border dark:border-alert-border/40"
          : "border-stone-200 dark:border-stone-800"
      }`}
    >
      <button
        id={idBotao}
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls={idPainel}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-stone-800/50"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{titulo}</span>
          {descricao ? (
            <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{descricao}</span>
          ) : null}
          {estado || impacto ? (
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {estado ? (
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    destacado
                      ? "bg-alert-bg text-alert-text"
                      : "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
                  }`}
                >
                  {estado}
                </span>
              ) : null}
              {impacto ? (
                <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">{impacto}</span>
              ) : null}
            </span>
          ) : null}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className={`flex-shrink-0 text-stone-500 dark:text-stone-400 transition-transform ${aberto ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {aberto ? (
        <div
          id={idPainel}
          role="region"
          aria-labelledby={idBotao}
          className="border-t border-stone-100 p-4 dark:border-stone-800"
        >
          {children}
          {aoRepor ? (
            <button
              type="button"
              onClick={aoRepor}
              className="mt-4 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-stone-500 underline-offset-2 transition-colors hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-400 dark:hover:text-brand-mint"
            >
              <RotateCcw size={12} />
              Repor este bloco
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
