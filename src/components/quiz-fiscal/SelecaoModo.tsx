"use client";

import { useState } from "react";
import { Clock, Sparkle, Check, ArrowRight, LayoutGrid, Fire, Search, Target, Gauge, BookOpen, Briefcase, Receipt, Building } from "@/components/ui/Icons";
import { resolveQuizIcon } from "./icon-map";
import {
  META_CATEGORIA_QUIZ,
  META_GRUPO_QUIZ,
  TOTAL_PERGUNTAS,
  getEstatisticasBanco,
  type QuizCategoria,
  type QuizGrupo,
} from "@/lib/quiz-fiscal";
import { ATIVIDADES, efeitoFiscal, type Atividade } from "@/lib/fiscal-data";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import { useQuizConfig, DEFAULT_QUIZ_CONFIG } from "@/hooks/useQuizConfig";
import type { QuizFiscalConfig, QuizModo } from "@/hooks/useQuizFiscal";
import type { SessaoHistorico } from "@/lib/store/quiz-progresso";

interface SelecaoModoProps {
  onComecar: (config: QuizFiscalConfig) => void;
  energiaRestante?: number;
  energiaTotal?: number;
  sessoes?: SessaoHistorico[];
}

type QuizTipo = "geral" | "atividade";

// Categorias organizadas por grupo temático (Independente · Dependente · Empresas).
const GRUPOS_ORDEM: QuizGrupo[] = ["independente", "dependente", "empresa"];

const CATEGORIAS_POR_GRUPO: Record<QuizGrupo, QuizCategoria[]> = {
  independente: [
    "retencao", "iva", "seguranca_social", "regime_simplificado",
    "irs_jovem", "escaloes_deducoes", "atividades", "categoria_f", "prazos", "geral",
  ],
  dependente: ["dep_irs", "dep_ss", "dep_subsidios"],
  empresa: ["empresa_criacao", "empresa_legislacao", "empresa_fiscalidade"],
};

const ICON_GRUPO: Record<QuizGrupo, React.ReactNode> = {
  independente: <Briefcase size={13} />,
  dependente: <Receipt size={13} />,
  empresa: <Building size={13} />,
};

const QD = "#3a5232";
const PARCHMENT = "#F7EDE1";
const BORDER = "#E8DBCB";
const ACTIVE_BG = "#e4ede0";
const ACTIVE_BORDER = "#4D6243";
const TEXT_HEAD = "#1C3A22";
const TEXT_MID = "#607757";
const TEXT_MUTED = "#8a7a6a";

export default function SelecaoModo({ onComecar, energiaRestante = 5, energiaTotal = 5 }: SelecaoModoProps) {
  const { config, updateConfig } = useQuizConfig();
  const [modo, setModo] = useState<QuizModo | null>(null);
  const [tipoQuiz, setTipoQuiz] = useState<QuizTipo>("geral");
  const [categoria, setCategoria] = useState<QuizCategoria | "todas">("todas");
  const [atividade, setAtividade] = useState<Atividade | null>(null);
  const estatisticas = getEstatisticasBanco();

  // Dificuldade da config (facil/normal/dificil) → nível das perguntas (1/2/3).
  const DIF_NIVEL = { facil: 1, normal: 2, dificil: 3 } as const;

  const handleComecar = () => {
    if (!modo) return;
    const dificuldade = DIF_NIVEL[config.dificuldade];
    const cfg: QuizFiscalConfig = tipoQuiz === "atividade" && atividade
      ? { modo, atividade, quantidade: config.perguntasPorSessao, dificuldade }
      : { modo, categoria: categoria === "todas" ? undefined : categoria, quantidade: config.perguntasPorSessao, dificuldade };
    onComecar(cfg);
  };

  const podeIniciar = !!modo && (tipoQuiz === "geral" || !!atividade) && energiaRestante > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">

      {/* Cabeçalho compacto */}
      <div className="mb-6 text-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: ACTIVE_BG, color: TEXT_HEAD, border: `1px solid ${ACTIVE_BORDER}` }}
        >
          <Sparkle size={12} />
          {TOTAL_PERGUNTAS}+ perguntas · sistema fiscal português
        </span>
        <h1 className="mt-3 font-display text-2xl font-semibold sm:text-3xl" style={{ color: TEXT_HEAD }}>
          Quiz Fiscal
        </h1>
      </div>

      {/* Layout 2 colunas: seleções à esquerda, configurações à direita */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-5">

        {/* ── Coluna esquerda: Modo + Tema + Categoria/Atividade ── */}
        <div className="flex flex-col gap-4">

          {/* Modo */}
          <Section title="Modo de jogo">
            <div className="grid grid-cols-2 gap-2.5">
              <ModoCard
                ativo={modo === "normal"}
                onClick={() => setModo("normal")}
                icon={<Clock size={18} />}
                titulo="Normal"
                tags={["Cronómetro", "Rápido"]}
                descricao="Resposta certa/errada na hora"
              />
              <ModoCard
                ativo={modo === "guiado"}
                onClick={() => setModo("guiado")}
                icon={<Sparkle size={18} />}
                titulo="Guiado"
                tags={["Sem tempo", "Explicações"]}
                descricao="Explicação completa com base legal"
              />
            </div>
          </Section>

          {/* Tipo */}
          <Section title="Tipo de quiz">
            <div className="grid grid-cols-2 gap-2.5">
              <PillCard
                ativo={tipoQuiz === "geral"}
                onClick={() => setTipoQuiz("geral")}
                icon={<LayoutGrid size={17} />}
                label="Por categoria"
              />
              <PillCard
                ativo={tipoQuiz === "atividade"}
                onClick={() => setTipoQuiz("atividade")}
                icon={<Search size={17} />}
                label="Por atividade"
              />
            </div>
          </Section>

          {/* Categoria ou Atividade */}
          {tipoQuiz === "geral" ? (
            <Section title="Tema">
              <div className="flex flex-col gap-4">
                {/* Atalho: todas as categorias */}
                <CategoriaChip
                  ativo={categoria === "todas"}
                  onClick={() => setCategoria("todas")}
                  icon={<LayoutGrid size={15} />}
                  label="Todas as categorias"
                  total={TOTAL_PERGUNTAS}
                  destaque
                />

                {/* Grupos temáticos */}
                {GRUPOS_ORDEM.map((grupo) => {
                  const meta = META_GRUPO_QUIZ[grupo];
                  const cats = CATEGORIAS_POR_GRUPO[grupo];
                  const totalGrupo = cats.reduce((s, c) => s + estatisticas[c].total, 0);
                  return (
                    <div key={grupo}>
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-lg"
                          style={{ backgroundColor: ACTIVE_BG, color: QD }}
                        >
                          {ICON_GRUPO[grupo]}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[12px] font-bold leading-tight" style={{ color: TEXT_HEAD }}>
                            {meta.label}
                          </div>
                          <div className="text-[10px] leading-tight" style={{ color: TEXT_MUTED }}>
                            {meta.descricao}
                          </div>
                        </div>
                        <span
                          className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
                          style={{ backgroundColor: "#ece4d8", color: TEXT_MID }}
                        >
                          {totalGrupo}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {cats.map((cat) => {
                          const cMeta = META_CATEGORIA_QUIZ[cat];
                          const Icon = resolveQuizIcon(cMeta.icon);
                          return (
                            <CategoriaChip
                              key={cat}
                              ativo={categoria === cat}
                              onClick={() => setCategoria(cat)}
                              icon={<Icon size={15} />}
                              label={cMeta.label}
                              total={estatisticas[cat].total}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          ) : (
            <Section title="Atividade profissional">
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: PARCHMENT, border: `1px solid ${BORDER}` }}
              >
                <ActivityCombobox value={atividade} onChange={setAtividade} />
                {atividade && <AtividadeResumo atividade={atividade} />}
              </div>
            </Section>
          )}
        </div>

        {/* ── Coluna direita: Configurações + Energia + Botão ── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">

          {/* Configurações */}
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: PARCHMENT, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: ACTIVE_BG, color: QD }}>
                <Gauge size={14} />
              </span>
              <span className="text-[13px] font-bold" style={{ color: TEXT_HEAD }}>Configurações</span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Dificuldade */}
              <ConfigRow label="Dificuldade" icon={<Target size={13} />}>
                <div className="flex gap-1.5">
                  {(["facil", "normal", "dificil"] as const).map((d) => (
                    <OptionChip
                      key={d}
                      ativo={config.dificuldade === d}
                      onClick={() => updateConfig({ dificuldade: d })}
                      label={d === "facil" ? "Fácil" : d === "normal" ? "Médio" : "Difícil"}
                    />
                  ))}
                </div>
              </ConfigRow>

              {/* Perguntas */}
              <ConfigRow label="Perguntas" icon={<BookOpen size={13} />}>
                <div className="flex gap-1.5">
                  {([5, 10, 15, 20] as const).map((n) => (
                    <OptionChip
                      key={n}
                      ativo={config.perguntasPorSessao === n}
                      onClick={() => updateConfig({ perguntasPorSessao: n })}
                      label={String(n)}
                    />
                  ))}
                </div>
              </ConfigRow>

              {/* Tempo */}
              <ConfigRow label="Tempo/pergunta" icon={<Clock size={13} />}>
                <div className="flex gap-1.5 flex-wrap">
                  {([0, 30, 60, 90] as const).map((t) => (
                    <OptionChip
                      key={t}
                      ativo={config.tempoPorPergunta === t}
                      onClick={() => updateConfig({ tempoPorPergunta: t })}
                      label={t === 0 ? "Livre" : `${t}s`}
                    />
                  ))}
                </div>
              </ConfigRow>

              {/* Preferências rápidas */}
              <ConfigRow label="Sons" icon={<Sparkle size={13} />}>
                <button
                  type="button"
                  onClick={() => updateConfig({ somAtivo: !config.somAtivo })}
                  className="relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#3a5232]"
                  style={{ backgroundColor: config.somAtivo ? QD : "#d4c4b0" }}
                  role="switch"
                  aria-checked={config.somAtivo}
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
                    style={{ left: config.somAtivo ? "calc(100% - 18px)" : "2px" }}
                  />
                </button>
              </ConfigRow>

              {/* Reset */}
              {JSON.stringify(config) !== JSON.stringify(DEFAULT_QUIZ_CONFIG) && (
                <button
                  type="button"
                  onClick={() => updateConfig(DEFAULT_QUIZ_CONFIG)}
                  className="text-[11px] font-medium transition-colors hover:underline self-start"
                  style={{ color: TEXT_MUTED }}
                >
                  Repor predefinições
                </button>
              )}
            </div>
          </div>

          {/* Energia */}
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ backgroundColor: PARCHMENT, border: `1px solid ${BORDER}` }}
          >
            <span style={{ color: energiaRestante > 0 ? "#C07828" : "#aaa" }}>
              <Fire size={18} />
            </span>
            <div className="flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: TEXT_MUTED }}>
                Energia diária
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: energiaTotal }).map((_, i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: i < energiaRestante ? "#C07828" : "#d4c4b0" }}
                  />
                ))}
                <span className="ml-1 text-[11px] font-bold tabular-nums" style={{ color: TEXT_MID }}>
                  {energiaRestante}/{energiaTotal}
                </span>
              </div>
            </div>
          </div>

          {/* Botão iniciar */}
          <button
            type="button"
            disabled={!podeIniciar}
            onClick={handleComecar}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-[15px] font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: QD }}
          >
            Começar Quiz
            <ArrowRight size={17} />
          </button>

          {/* Mensagens de ajuda */}
          {!modo && energiaRestante > 0 && (
            <p className="text-center text-xs" style={{ color: TEXT_MUTED }}>
              Escolhe um modo para continuar.
            </p>
          )}
          {tipoQuiz === "atividade" && !atividade && modo && (
            <p className="text-center text-xs" style={{ color: TEXT_MUTED }}>
              Seleciona uma atividade para continuar.
            </p>
          )}
          {energiaRestante <= 0 && (
            <p className="text-center text-xs font-semibold" style={{ color: "#C07828" }}>
              Sem energia hoje. Volta amanhã!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: TEXT_MUTED }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function ConfigRow({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span style={{ color: TEXT_MID }}>{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT_MUTED }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function OptionChip({ ativo, onClick, label }: { ativo: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#3a5232]"
      style={{
        backgroundColor: ativo ? QD : "#ece4d8",
        color: ativo ? "#fff" : TEXT_MID,
        border: `1px solid ${ativo ? QD : BORDER}`,
      }}
    >
      {label}
    </button>
  );
}

function ModoCard({
  ativo, onClick, icon, titulo, tags, descricao,
}: {
  ativo: boolean; onClick: () => void; icon: React.ReactNode;
  titulo: string; tags: string[]; descricao: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col gap-2 rounded-xl border-2 p-3.5 text-left transition-all"
      style={{
        backgroundColor: ativo ? ACTIVE_BG : PARCHMENT,
        borderColor: ativo ? ACTIVE_BORDER : BORDER,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: ativo ? QD : "#8a7355" }}
        >
          {icon}
        </span>
        {ativo && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: QD }}>
            <Check size={10} />
          </span>
        )}
      </div>
      <div>
        <h3 className="text-[13px] font-bold" style={{ color: TEXT_HEAD }}>{titulo}</h3>
        <p className="mt-0.5 text-[11px] leading-snug" style={{ color: TEXT_MUTED }}>{descricao}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: ativo ? "rgba(58,82,50,0.12)" : "#ece4d8",
              color: ativo ? QD : TEXT_MUTED,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

function PillCard({
  ativo, onClick, icon, label,
}: {
  ativo: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-3 text-left transition-all"
      style={{
        backgroundColor: ativo ? ACTIVE_BG : PARCHMENT,
        borderColor: ativo ? ACTIVE_BORDER : BORDER,
      }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: ativo ? QD : "#8a7355" }}
      >
        {icon}
      </span>
      <span className="text-[13px] font-semibold" style={{ color: ativo ? TEXT_HEAD : TEXT_MID }}>
        {label}
      </span>
      {ativo && (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: QD }}>
          <Check size={10} />
        </span>
      )}
    </button>
  );
}

function CategoriaChip({
  ativo, onClick, icon, label, total, destaque = false,
}: {
  ativo: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; total: number; destaque?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all"
      style={{
        backgroundColor: ativo ? ACTIVE_BG : PARCHMENT,
        borderColor: ativo ? ACTIVE_BORDER : BORDER,
        gridColumn: destaque ? "1 / -1" : undefined,
      }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: ativo ? QD : "#8a7355" }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold truncate" style={{ color: ativo ? TEXT_HEAD : TEXT_MID }}>
          {label}
        </div>
        <div className="text-[10px]" style={{ color: TEXT_MUTED }}>{total} perguntas</div>
      </div>
      {ativo && (
        <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: QD }}>
          <Check size={10} />
        </span>
      )}
    </button>
  );
}

function AtividadeResumo({ atividade }: { atividade: Atividade }) {
  const ef = efeitoFiscal(atividade);
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      <ResumoStat label="Retenção" value={ef.retencao > 0 ? `${(ef.retencao * 100).toFixed(0)}%` : "Isenta"} />
      <ResumoStat label="Coef." value={ef.coef.toFixed(2)} />
      <ResumoStat label="Base SS" value={ef.baseSS === "servicos" ? "70%" : "20%"} />
      <ResumoStat label="Regra 15%" value={ef.regra15 ? "Sim" : "Não"} />
    </div>
  );
}

function ResumoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "#FAF4EC", border: `1px solid ${BORDER}` }}>
      <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{label}</p>
      <p className="mt-0.5 text-[13px] font-bold" style={{ color: TEXT_HEAD }}>{value}</p>
    </div>
  );
}
