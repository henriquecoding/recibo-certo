"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
            <Sparkle size={13} />
            {TOTAL_PERGUNTAS} perguntas · baseado no sistema fiscal portugues
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold text-ink dark:text-stone-100 sm:text-4xl">
            Quiz Fiscal
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-500 dark:text-stone-400 sm:text-base">
            Testa os teus conhecimentos sobre IRS, IVA, Seguranca Social e o regime
            de trabalhador independente em Portugal — com referencias legais reais.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink dark:text-stone-100">1. Escolhe o modo</h2>
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
          <h2 className="mb-3 font-display text-lg font-semibold text-ink dark:text-stone-100">2. Escolhe um tema</h2>
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
          <Button
            variant="primary"
            size="lg"
            disabled={!modo}
            onClick={handleComecar}
            className="w-full sm:w-auto sm:px-10"
          >
            Comecar Quiz
            <ArrowRight size={16} />
          </Button>
          {!modo && (
            <p className="text-xs text-stone-400">Escolhe um modo para continuar.</p>
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
      className={`group relative flex flex-col gap-3 rounded-3xl border p-5 text-left transition-all duration-200 ${
        ativo
          ? "border-brand bg-brand-light shadow-glow dark:bg-brand-light/10"
          : "border-stone-200 bg-white shadow-card hover:border-brand/40 hover:shadow-lift dark:border-stone-700 dark:bg-stone-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            ativo ? "bg-brand text-white" : "bg-cream text-brand-dark dark:bg-stone-800"
          }`}
        >
          {icon}
        </span>
        {ativo && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
            <Check size={12} />
          </span>
        )}
      </div>
      <div>
        <h3 className="font-display text-base font-semibold text-ink dark:text-stone-100">{titulo}</h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{descricao}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              ativo ? "bg-white/70 text-brand-dark dark:bg-white/20 dark:text-brand-light" : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
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
      className={`flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all duration-200 ${
        ativo
          ? "border-brand bg-brand-light shadow-glow dark:bg-brand-light/10"
          : destaque
          ? "border-brand/30 bg-white shadow-card hover:border-brand/50 dark:border-brand/20 dark:bg-stone-900"
          : "border-stone-200 bg-white shadow-card hover:border-brand/30 hover:shadow-lift dark:border-stone-700 dark:bg-stone-900"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-xl ${
          ativo ? "bg-brand text-white" : "bg-cream text-brand-dark dark:bg-stone-800"
        }`}
      >
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-semibold leading-tight text-ink dark:text-stone-100">{titulo}</h3>
        <p className="mt-0.5 text-[11px] text-stone-400">{total} perguntas</p>
      </div>
    </button>
  );
}
