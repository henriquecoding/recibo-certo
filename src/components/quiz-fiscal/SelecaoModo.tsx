"use client";

import { useState } from "react";
import Reveal from "@/components/ui/Reveal";
import { Clock, Sparkle, Check, ArrowRight, LayoutGrid } from "@/components/ui/Icons";
import { resolveQuizIcon } from "./icon-map";
import {
  META_CATEGORIA_QUIZ,
  TOTAL_PERGUNTAS,
  getEstatisticasBanco,
  type QuizCategoria,
} from "@/lib/quiz-fiscal";
import type { QuizFiscalConfig, QuizModo } from "@/hooks/useQuizFiscal";

interface SelecaoModoProps {
  onComecar: (config: QuizFiscalConfig) => void;
}

const CATEGORIAS_ORDEM: QuizCategoria[] = [
  "retencao",
  "iva",
  "seguranca_social",
  "regime_simplificado",
  "irs_jovem",
  "escaloes_deducoes",
  "atividades",
  "categoria_f",
  "prazos",
  "geral",
];

export default function SelecaoModo({ onComecar }: SelecaoModoProps) {
  const [modo, setModo] = useState<QuizModo | null>(null);
  const [categoria, setCategoria] = useState<QuizCategoria | "todas">("todas");

  const estatisticas = getEstatisticasBanco();

  const handleComecar = () => {
    if (!modo) return;
    onComecar({
      modo,
      categoria: categoria === "todas" ? undefined : categoria,
      quantidade: 10,
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-quiz-sage-border bg-quiz-sage-light px-3 py-1 text-xs font-semibold text-quiz-forest-deep dark:border-quiz-olive dark:bg-quiz-olive/30 dark:text-quiz-sage-light">
            <Sparkle size={13} />
            {TOTAL_PERGUNTAS} perguntas · baseado no sistema fiscal portugues
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold text-quiz-forest-deep dark:text-quiz-parchment sm:text-4xl">
            Quiz Fiscal
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-quiz-sage-dark dark:text-quiz-sage sm:text-base">
            Testa os teus conhecimentos sobre IRS, IVA, Seguranca Social e o regime
            de trabalhador independente em Portugal — com referencias legais reais.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-quiz-forest-deep dark:text-quiz-parchment">
            1. Escolhe o modo
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ModoCard
              ativo={modo === "normal"}
              onClick={() => setModo("normal")}
              icon={<Clock size={22} />}
              titulo="Quiz Normal"
              descricao="10 perguntas, 20 segundos cada. Resposta certa/errada na hora, pontuacao final."
              tags={["Rapido", "Com cronometro"]}
            />
            <ModoCard
              ativo={modo === "guiado"}
              onClick={() => setModo("guiado")}
              icon={<Sparkle size={22} />}
              titulo="Quiz Guiado"
              descricao="Sem pressao de tempo. Cada resposta — certa ou errada — vem com explicacao completa, base legal e fonte."
              tags={["Sem tempo", "Explicacoes detalhadas"]}
            />
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-quiz-forest-deep dark:text-quiz-parchment">
            2. Escolhe um tema
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <CategoriaCard
              ativo={categoria === "todas"}
              onClick={() => setCategoria("todas")}
              icon={<LayoutGrid size={20} />}
              titulo="Todas as categorias"
              total={TOTAL_PERGUNTAS}
              destaque
            />
            {CATEGORIAS_ORDEM.map((cat) => {
              const meta = META_CATEGORIA_QUIZ[cat];
              const Icon = resolveQuizIcon(meta.icon);
              return (
                <CategoriaCard
                  key={cat}
                  ativo={categoria === cat}
                  onClick={() => setCategoria(cat)}
                  icon={<Icon size={20} />}
                  titulo={meta.label}
                  total={estatisticas[cat].total}
                />
              );
            })}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            disabled={!modo}
            onClick={handleComecar}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-quiz-forest px-10 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-quiz-forest-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-quiz-olive dark:hover:bg-quiz-sage-dark sm:w-auto"
          >
            Comecar Quiz
            <ArrowRight size={16} />
          </button>
          {!modo && (
            <p className="text-xs text-quiz-sage dark:text-quiz-sage">Escolhe um modo para continuar.</p>
          )}
        </div>
      </Reveal>
    </div>
  );
}

function ModoCard({
  ativo,
  onClick,
  icon,
  titulo,
  descricao,
  tags,
}: {
  ativo: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  tags: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
        ativo
          ? "border-quiz-olive bg-quiz-sage-light shadow-lg dark:border-quiz-sage-dark dark:bg-quiz-olive/30"
          : "border-quiz-parchment-mid bg-quiz-parchment-warm shadow-md hover:border-quiz-sage hover:shadow-lg dark:border-quiz-olive/40 dark:bg-quiz-forest/60 dark:hover:border-quiz-sage/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            ativo
              ? "bg-quiz-olive text-white dark:bg-quiz-sage-dark"
              : "bg-quiz-parchment-border text-quiz-forest-deep dark:bg-quiz-olive/50 dark:text-quiz-parchment"
          }`}
        >
          {icon}
        </span>
        {ativo && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-quiz-olive text-white dark:bg-quiz-sage-dark">
            <Check size={12} />
          </span>
        )}
      </div>
      <div>
        <h3 className="font-display text-base font-semibold text-quiz-forest-deep dark:text-quiz-parchment">{titulo}</h3>
        <p className="mt-1 text-sm leading-relaxed text-quiz-sage-dark dark:text-quiz-sage">{descricao}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              ativo
                ? "bg-quiz-olive/10 text-quiz-olive dark:bg-quiz-sage-dark/30 dark:text-quiz-sage-light"
                : "bg-quiz-parchment text-quiz-sage-dark dark:bg-quiz-forest/80 dark:text-quiz-sage"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

function CategoriaCard({
  ativo,
  onClick,
  icon,
  titulo,
  total,
  destaque = false,
}: {
  ativo: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  titulo: string;
  total: number;
  destaque?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-3.5 text-left transition-all duration-200 ${
        ativo
          ? "border-quiz-olive bg-quiz-sage-light shadow-lg dark:border-quiz-sage-dark dark:bg-quiz-olive/30"
          : destaque
          ? "border-quiz-sage/40 bg-quiz-parchment-warm shadow-md hover:border-quiz-sage hover:shadow-lg dark:border-quiz-olive/40 dark:bg-quiz-forest/60"
          : "border-quiz-parchment-mid bg-quiz-parchment-warm shadow-md hover:border-quiz-sage/60 hover:shadow-lg dark:border-quiz-olive/30 dark:bg-quiz-forest/60"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-xl ${
          ativo
            ? "bg-quiz-olive text-white dark:bg-quiz-sage-dark"
            : "bg-quiz-parchment-border text-quiz-forest-deep dark:bg-quiz-olive/50 dark:text-quiz-parchment"
        }`}
      >
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-semibold leading-tight text-quiz-forest-deep dark:text-quiz-parchment">{titulo}</h3>
        <p className="mt-0.5 text-[11px] text-quiz-sage dark:text-quiz-sage">{total} perguntas</p>
      </div>
    </button>
  );
}
