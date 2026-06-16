"use client";

import { useState } from "react";
import Reveal from "@/components/ui/Reveal";
import { Clock, Sparkle, Check, ArrowRight, LayoutGrid, Fire, Search } from "@/components/ui/Icons";
import { resolveQuizIcon } from "./icon-map";
import {
  META_CATEGORIA_QUIZ,
  TOTAL_PERGUNTAS,
  getEstatisticasBanco,
  type QuizCategoria,
} from "@/lib/quiz-fiscal";
import { ATIVIDADES, efeitoFiscal, type Atividade } from "@/lib/fiscal-data";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import type { QuizFiscalConfig, QuizModo } from "@/hooks/useQuizFiscal";
import type { SessaoHistorico } from "@/lib/store/quiz-progresso";

interface SelecaoModoProps {
  onComecar: (config: QuizFiscalConfig) => void;
  energiaRestante?: number;
  energiaTotal?: number;
  sessoes?: SessaoHistorico[];
}

type QuizTipo = "geral" | "atividade";

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

const CARD_BG = "#F7EDE1";
const CARD_ACTIVE_BG = "#DBDCC4";
const CARD_BORDER = "#E8DBCB";
const CARD_ACTIVE_BORDER = "#4D6243";
const DARK_CARD_BG = "#1e2219";
const DARK_CARD_ACTIVE_BG = "#2a3324";
const DARK_CARD_BORDER = "#2e3327";
const DARK_CARD_ACTIVE_BORDER = "#4D6243";
const TEXT_DARK = "#1C3A22";
const TEXT_MID = "#607757";
const TEXT_LIGHT = "#768771";
const DARK_TEXT_LIGHT = "#c4c2b6";
const DARK_TEXT_MID = "#a8a69c";

export default function SelecaoModo({ onComecar, energiaRestante = 5, energiaTotal = 5 }: SelecaoModoProps) {
  const [modo, setModo] = useState<QuizModo | null>(null);
  const [tipoQuiz, setTipoQuiz] = useState<QuizTipo>("geral");
  const [categoria, setCategoria] = useState<QuizCategoria | "todas">("todas");
  const [atividade, setAtividade] = useState<Atividade | null>(null);

  const estatisticas = getEstatisticasBanco();

  const handleComecar = () => {
    if (!modo) return;
    if (tipoQuiz === "atividade" && atividade) {
      onComecar({
        modo,
        atividade,
        quantidade: 10,
      });
    } else {
      onComecar({
        modo,
        categoria: categoria === "todas" ? undefined : categoria,
        quantidade: 10,
      });
    }
  };

  const podeIniciar = modo && (tipoQuiz === "geral" || atividade) && energiaRestante > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <Reveal>
        <div className="text-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: CARD_ACTIVE_BG, color: TEXT_DARK, border: `1px solid ${CARD_ACTIVE_BORDER}` }}
          >
            <Sparkle size={13} />
            {TOTAL_PERGUNTAS}+ perguntas · baseado no sistema fiscal portugues
          </span>
          <h1
            className="mt-4 font-display text-3xl font-semibold sm:text-4xl"
            style={{ color: "var(--quiz-heading, #1C3A22)" }}
          >
            Quiz Fiscal
          </h1>
          <p
            className="mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base"
            style={{ color: "var(--quiz-muted, #768771)" }}
          >
            Testa os teus conhecimentos sobre IRS, IVA, Seguranca Social e o regime
            de trabalhador independente em Portugal — com referencias legais reais.
          </p>
        </div>
      </Reveal>

      {/* Step 1: Mode */}
      <Reveal delay={0.05}>
        <div className="mt-10">
          <SectionTitle number={1} text="Escolhe o modo" />
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

      {/* Step 2: Quiz Type */}
      <Reveal delay={0.1}>
        <div className="mt-10">
          <SectionTitle number={2} text="Tipo de quiz" />
          <div className="grid gap-4 sm:grid-cols-2">
            <QuizTipoCard
              ativo={tipoQuiz === "geral"}
              onClick={() => setTipoQuiz("geral")}
              icon={<LayoutGrid size={22} />}
              titulo="Quiz por Categoria"
              descricao="Escolhe um tema fiscal — IRS, IVA, Seg. Social, etc. — ou joga todas as categorias misturadas."
            />
            <QuizTipoCard
              ativo={tipoQuiz === "atividade"}
              onClick={() => setTipoQuiz("atividade")}
              icon={<Search size={22} />}
              titulo="Quiz por Atividade"
              descricao="Seleciona a tua atividade profissional e recebe perguntas especificas para o teu enquadramento fiscal."
            />
          </div>
        </div>
      </Reveal>

      {/* Step 3: Category or Activity selection */}
      <Reveal delay={0.15}>
        <div className="mt-10">
          {tipoQuiz === "geral" ? (
            <>
              <SectionTitle number={3} text="Escolhe um tema" />
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
            </>
          ) : (
            <>
              <SectionTitle number={3} text="Seleciona a tua atividade" />
              <div
                className="rounded-2xl p-5 shadow-md"
                style={{
                  backgroundColor: "var(--quiz-card-bg, #F7EDE1)",
                  border: `1px solid var(--quiz-card-border, #E8DBCB)`,
                }}
              >
                <ActivityCombobox value={atividade} onChange={setAtividade} />
                {atividade && (
                  <AtividadeResumo atividade={atividade} />
                )}
              </div>
            </>
          )}
        </div>
      </Reveal>

      {/* Energy + Start */}
      <Reveal delay={0.2}>
        <div className="mt-10 flex flex-col items-center gap-4">
          <div
            className="flex items-center gap-3 rounded-2xl px-5 py-3 shadow-sm"
            style={{
              backgroundColor: "var(--quiz-card-bg, #F7EDE1)",
              border: `1px solid var(--quiz-card-border, #E8DBCB)`,
            }}
          >
            <Fire size={18} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--quiz-muted, #768771)" }}>
                Energia diaria
              </span>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: energiaTotal }).map((_, i) => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5 rounded-full transition-colors"
                    style={{ backgroundColor: i < energiaRestante ? "#F59E0B" : "var(--quiz-dot-empty, #d4c4b0)" }}
                  />
                ))}
                <span className="ml-1 text-xs font-semibold tabular-nums" style={{ color: "var(--quiz-muted, #768771)" }}>
                  {energiaRestante}/{energiaTotal}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!podeIniciar}
            onClick={handleComecar}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-10 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            style={{ backgroundColor: "#3a5232" }}
          >
            Comecar Quiz
            <ArrowRight size={18} />
          </button>
          {!modo && energiaRestante > 0 && (
            <p className="text-xs" style={{ color: "var(--quiz-muted, #768771)" }}>Escolhe um modo para continuar.</p>
          )}
          {tipoQuiz === "atividade" && !atividade && modo && (
            <p className="text-xs" style={{ color: "var(--quiz-muted, #768771)" }}>Seleciona uma atividade para continuar.</p>
          )}
          {energiaRestante <= 0 && (
            <p className="text-xs font-semibold" style={{ color: "#D97706" }}>
              Sem energia hoje. Volta amanha para continuar!
            </p>
          )}
        </div>
      </Reveal>
    </div>
  );
}

function SectionTitle({ number, text }: { number: number; text: string }) {
  return (
    <h2
      className="mb-3 font-display text-lg font-semibold"
      style={{ color: "var(--quiz-heading, #1C3A22)" }}
    >
      {number}. {text}
    </h2>
  );
}

function AtividadeResumo({ atividade }: { atividade: Atividade }) {
  const ef = efeitoFiscal(atividade);
  return (
    <div
      className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      <ResumoStat label="Retencao" value={ef.retencao > 0 ? `${(ef.retencao * 100).toFixed(1)}%` : "Isenta"} />
      <ResumoStat label="Coeficiente" value={ef.coef.toFixed(2)} />
      <ResumoStat label="Base SS" value={ef.baseSS === "servicos" ? "70%" : "20%"} />
      <ResumoStat label="Regra 15%" value={ef.regra15 ? "Sim" : "Nao"} />
    </div>
  );
}

function ResumoStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{
        backgroundColor: "var(--quiz-stat-bg, #FAF4EC)",
        border: "1px solid var(--quiz-card-border, #E8DBCB)",
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--quiz-muted, #768771)" }}>
        {label}
      </p>
      <p className="mt-0.5 font-display text-base font-bold" style={{ color: "var(--quiz-heading, #1C3A22)" }}>
        {value}
      </p>
    </div>
  );
}

function QuizTipoCard({
  ativo,
  onClick,
  icon,
  titulo,
  descricao,
}: {
  ativo: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition-all duration-200"
      style={{
        backgroundColor: ativo ? "var(--quiz-card-active-bg, #DBDCC4)" : "var(--quiz-card-bg, #F7EDE1)",
        borderColor: ativo ? "var(--quiz-card-active-border, #4D6243)" : "var(--quiz-card-border, #E8DBCB)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: ativo ? "#3a5232" : "#8a7355" }}
        >
          {icon}
        </span>
        {ativo && (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: "#3a5232" }}
          >
            <Check size={12} />
          </span>
        )}
      </div>
      <div>
        <h3 className="font-display text-base font-semibold" style={{ color: "var(--quiz-heading, #1C3A22)" }}>{titulo}</h3>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--quiz-muted, #768771)" }}>{descricao}</p>
      </div>
    </button>
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
      className="group relative flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition-all duration-200"
      style={{
        backgroundColor: ativo ? "var(--quiz-card-active-bg, #DBDCC4)" : "var(--quiz-card-bg, #F7EDE1)",
        borderColor: ativo ? "var(--quiz-card-active-border, #4D6243)" : "var(--quiz-card-border, #E8DBCB)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: ativo ? "#3a5232" : "#8a7355" }}
        >
          {icon}
        </span>
        {ativo && (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: "#3a5232" }}
          >
            <Check size={12} />
          </span>
        )}
      </div>
      <div>
        <h3 className="font-display text-base font-semibold" style={{ color: "var(--quiz-heading, #1C3A22)" }}>{titulo}</h3>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--quiz-muted, #768771)" }}>{descricao}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{
              backgroundColor: ativo ? "rgba(58,82,50,0.12)" : "var(--quiz-tag-bg, #FAF4EC)",
              color: ativo ? "#3a5232" : "var(--quiz-muted, #768771)",
            }}
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
      className="flex flex-col items-start gap-2 rounded-2xl border-2 p-3.5 text-left transition-all duration-200"
      style={{
        backgroundColor: ativo ? "var(--quiz-card-active-bg, #DBDCC4)" : "var(--quiz-card-bg, #F7EDE1)",
        borderColor: ativo ? "var(--quiz-card-active-border, #4D6243)" : "var(--quiz-card-border, #E8DBCB)",
      }}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: ativo ? "#3a5232" : "#8a7355" }}
      >
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-semibold leading-tight" style={{ color: "var(--quiz-heading, #1C3A22)" }}>{titulo}</h3>
        <p className="mt-0.5 text-[11px]" style={{ color: "var(--quiz-muted, #768771)" }}>{total} perguntas</p>
      </div>
    </button>
  );
}
