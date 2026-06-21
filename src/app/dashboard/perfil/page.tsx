"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "motion/react";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import { useRecibos, resumir } from "@/lib/store/recibos";
import { useQuizProgresso } from "@/lib/store/quiz-progresso";
import { NIVEIS, type NivelInfo } from "@/lib/quiz-fiscal/progresso";
import { saudeFiscal } from "@/lib/insights";
import { verificarAdmin } from "@/lib/supabase/admin";
import { fadeUp, staggerContainer, staggerItem, EASE } from "@/lib/motion";
import { fmt } from "@/lib/format";
import {
  User,
  Trophy,
  Star,
  Fire,
  Zap,
  ArrowRight,
  ArrowLeft,
  Receipt,
  Calendar,
  ShieldCheck,
  Check,
  Award,
  Target,
  BarChart2,
  ChevronRight,
  Gauge,
  BookOpen,
  Sparkle,
  Clock,
  Lock,
  Mail,
} from "@/components/ui/Icons";
import InfoTip from "@/components/ui/InfoTip";

// ── Helpers ──────────────────────────────────────────────────────────────

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
}

function formatDuration(seg: number): string {
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const agora = new Date();
  const diff = agora.getTime() - d.getTime();
  const dias = Math.floor(diff / 86400000);
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias < 7) return `Há ${dias} dias`;
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}

// ── Level configuration ──────────────────────────────────────────────────

const LEVEL_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  1:  { bg: "bg-stone-100",     text: "text-stone-600",    border: "border-stone-200" },
  2:  { bg: "bg-stone-100",     text: "text-stone-600",    border: "border-stone-200" },
  3:  { bg: "bg-amber-50",      text: "text-amber-700",    border: "border-amber-200" },
  4:  { bg: "bg-amber-50",      text: "text-amber-700",    border: "border-amber-200" },
  5:  { bg: "bg-brand-light",   text: "text-brand-dark",   border: "border-brand/20" },
  6:  { bg: "bg-brand-light",   text: "text-brand-dark",   border: "border-brand/20" },
  7:  { bg: "bg-blue-50",       text: "text-blue-700",     border: "border-blue-200" },
  8:  { bg: "bg-blue-50",       text: "text-blue-700",     border: "border-blue-200" },
  9:  { bg: "bg-purple-50",     text: "text-purple-700",   border: "border-purple-200" },
  10: { bg: "bg-amber-50",      text: "text-amber-800",    border: "border-amber-300" },
};

function levelStyle(nivel: number) {
  return LEVEL_STYLES[nivel] ?? LEVEL_STYLES[1];
}

// ── Stat Card ────────────────────────────────────────────────────────────

function StatCard({
  valor,
  rotulo,
  icon: Icon,
  acento,
}: {
  valor: string;
  rotulo: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  acento?: string;
}) {
  return (
    <div className="flex-1 min-w-[80px] rounded-2xl border border-stone-100 bg-white p-3 text-center shadow-card transition-transform duration-200 hover:-translate-y-0.5">
      <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-stone-50">
        <Icon size={15} className={acento ?? "text-stone-400"} />
      </div>
      <p className="text-lg font-semibold tabular-nums text-stone-800">{valor}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{rotulo}</p>
    </div>
  );
}

// ── Section Tab ──────────────────────────────────────────────────────────

function SectionTab({
  ativo,
  icon: Icon,
  label,
  onClick,
}: {
  ativo: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
        ativo
          ? "bg-brand text-white shadow-sm"
          : "border border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// ── Quick Action Card ────────────────────────────────────────────────────

function QuickCard({
  icon: Icon,
  label,
  sub,
  href,
  acento,
  badge,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  sub: string;
  href: string;
  acento?: string;
  badge?: string | number;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-4xl border border-stone-100 bg-white p-5 shadow-card transition-all hover:shadow-lift"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${acento ?? "bg-brand-light text-brand"}`}>
          <Icon size={18} />
        </div>
        {badge !== undefined && (
          <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[9px] font-semibold text-white">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-stone-800">{label}</p>
      <p className="mt-0.5 text-xs text-stone-500">{sub}</p>
    </Link>
  );
}

// ── Profile Completeness ─────────────────────────────────────────────────

function CompletenessWidget({
  user,
  quizXp,
  recibosCount,
}: {
  user: { email?: string | null } | null;
  quizXp: number;
  recibosCount: number;
}) {
  const items = [
    { label: "Conta criada", done: !!user, icon: User },
    { label: "Primeiro recibo", done: recibosCount > 0, icon: Receipt },
    { label: "Quiz Fiscal jogado", done: quizXp > 0, icon: Trophy },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  if (done === items.length) return null;

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light text-brand">
            <Sparkle size={14} />
          </div>
          <span className="text-sm font-semibold text-stone-800">Completar Perfil</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-brand">{pct}%</span>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
        <m.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: EASE }}
          className="h-full rounded-full bg-brand"
        />
      </div>

      <div className="space-y-2">
        {items
          .filter((i) => !i.done)
          .map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-3.5 py-2.5"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-stone-200 bg-white">
                <item.icon size={13} className="text-stone-400" />
              </div>
              <span className="flex-1 text-xs font-medium text-stone-600">{item.label}</span>
              <ArrowRight size={12} className="flex-shrink-0 text-stone-300" />
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Achievement Badge ────────────────────────────────────────────────────

function AchievementBadge({
  nivel,
  titulo,
  xpMinimo,
  alcancado,
  atual,
}: {
  nivel: number;
  titulo: string;
  xpMinimo: number;
  alcancado: boolean;
  atual: boolean;
}) {
  const ls = levelStyle(nivel);
  return (
    <div
      className={`relative rounded-2xl border p-4 transition-all ${
        alcancado
          ? `${ls.border} ${ls.bg}`
          : "border-stone-100 bg-stone-50 opacity-50"
      } ${atual ? "ring-2 ring-brand ring-offset-2" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-display text-base font-semibold ${
            alcancado ? `${ls.bg} ${ls.text}` : "bg-stone-100 text-stone-400"
          }`}
        >
          {nivel}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${alcancado ? "text-stone-800" : "text-stone-400"}`}>
            {titulo}
          </p>
          <p className={`text-[10px] font-medium ${alcancado ? "text-stone-500" : "text-stone-300"}`}>
            {fmt(xpMinimo)} XP
          </p>
        </div>
        {alcancado && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
            <Check size={12} />
          </div>
        )}
        {atual && !alcancado && (
          <span className="text-[9px] font-semibold uppercase tracking-wider text-brand">Atual</span>
        )}
      </div>
      {nivel === 10 && alcancado && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-100/60 px-3 py-2 border border-amber-200/60">
          <Award size={14} className="flex-shrink-0 text-amber-700" />
          <span className="text-[11px] font-semibold text-amber-800">
            Badge exclusivo de Guru do IRS desbloqueado
          </span>
        </div>
      )}
    </div>
  );
}

// ── Session History Item ─────────────────────────────────────────────────

function SessionItem({
  acertos,
  total,
  xp,
  streak,
  tempo,
  data,
  categoria,
}: {
  acertos: number;
  total: number;
  xp: number;
  streak: number;
  tempo: number;
  data: string;
  categoria?: string;
}) {
  const pct = total > 0 ? Math.round((acertos / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5 last:border-0 transition-colors hover:bg-stone-50">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${
            pct === 100
              ? "bg-brand-light text-brand"
              : pct >= 70
                ? "bg-blue-50 text-blue-700"
                : "bg-stone-100 text-stone-500"
          }`}
        >
          {pct}%
        </div>
        <div>
          <p className="text-sm font-medium text-stone-700">
            {acertos}/{total} corretas
            {categoria && (
              <span className="ml-1.5 text-[10px] font-medium text-stone-400">
                {categoria}
              </span>
            )}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-stone-400">
            <span className="flex items-center gap-1">
              <Zap size={10} /> +{xp} XP
            </span>
            {streak > 0 && (
              <span className="flex items-center gap-1">
                <Fire size={10} /> {streak}x streak
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={10} /> {formatDuration(tempo)}
            </span>
          </div>
        </div>
      </div>
      <span className="text-[10px] font-medium text-stone-400">{formatRelativeDate(data)}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN — PERFIL
// ══════════════════════════════════════════════════════════════════════════

export default function PerfilPage() {
  const { user, carregado: authCarregado, disponivel } = useAuth();
  const { plano } = useSubscricao();
  const { recibos, carregado: recibosCarregado } = useRecibos();
  const quiz = useQuizProgresso();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState<"progresso" | "conquistas" | "historico">("progresso");

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    verificarAdmin(user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [user]);

  const saude = useMemo(
    () => (recibosCarregado ? saudeFiscal(recibos) : { score: 0, estado: "Tranquilo" as const, fatores: [] }),
    [recibosCarregado, recibos],
  );

  const totalRecibos = recibos.length;
  const totalAno = resumir(recibos);

  // Guru do IRS = level 10 (20000+ XP)
  const isGuru = quiz.nivel.nivel === 10;

  const nivelAtualIdx = NIVEIS.findIndex((n) => n.nivel === quiz.nivel.nivel);

  // Session stats
  const totalSessoes = quiz.sessoes.length;
  const mediaAcertos =
    totalSessoes > 0
      ? Math.round(
          quiz.sessoes.reduce((s, x) => s + (x.totalPerguntas > 0 ? x.acertos / x.totalPerguntas : 0), 0) /
            totalSessoes *
            100,
        )
      : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-700"
      >
        <ArrowLeft size={13} />
        Voltar ao painel
      </Link>

      <m.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-5"
      >
        {/* ════════════════════════════════════════════════════════
            HERO CARD
        ════════════════════════════════════════════════════════ */}
        <m.section
          variants={fadeUp}
          className="relative overflow-hidden rounded-4xl border border-stone-100 bg-white shadow-card"
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-brand/8 via-brand-light/40 to-transparent" />

          <div className="relative flex flex-col gap-5 px-5 pb-6 pt-7 sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:pt-8">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-brand/20 bg-gradient-to-br from-brand to-brand-dark shadow-lift sm:h-24 sm:w-24">
                {user ? (
                  <span className="font-display text-3xl font-semibold text-white sm:text-4xl">
                    {(user.email ?? "U").charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User size={32} className="text-white/80" />
                )}
              </div>
              {isGuru && (
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-amber-400 shadow-sm">
                  <Trophy size={14} className="text-amber-900" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="font-display text-2xl font-semibold text-stone-800 sm:text-3xl">
                  {saudacao()}!
                </h1>
                {/* Plan badge */}
                {plano === "pro" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-semibold text-white">
                    <Star size={10} /> Pro
                  </span>
                ) : (
                  <Link
                    href="/dashboard/upgrade"
                    className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold text-stone-500 transition-colors hover:bg-brand-light hover:text-brand-dark"
                  >
                    Grátis
                  </Link>
                )}
                {/* Level badge */}
                {quiz.carregado && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                      levelStyle(quiz.nivel.nivel).bg
                    } ${levelStyle(quiz.nivel.nivel).text} ${levelStyle(quiz.nivel.nivel).border}`}
                  >
                    <Award size={10} /> Nv. {quiz.nivel.nivel}
                  </span>
                )}
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-2 py-0.5 text-[9px] font-semibold text-white">
                    <ShieldCheck size={10} /> Admin
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-500">{user?.email ?? "Modo local"}</p>

              {/* Stats Row */}
              <div className="mt-4 flex flex-wrap gap-2.5">
                <StatCard
                  valor={quiz.carregado ? fmt(quiz.xp) : "—"}
                  rotulo="XP Total"
                  icon={Zap}
                  acento="text-brand"
                />
                <StatCard
                  valor={quiz.carregado ? `${quiz.nivel.nivel}` : "—"}
                  rotulo="Nível"
                  icon={Award}
                  acento="text-amber-500"
                />
                <StatCard
                  valor={recibosCarregado ? `${totalRecibos}` : "—"}
                  rotulo="Recibos"
                  icon={Receipt}
                  acento="text-blue-500"
                />
                <StatCard
                  valor={quiz.carregado ? `${quiz.streakRecord}` : "—"}
                  rotulo="Melhor streak"
                  icon={Fire}
                  acento="text-orange-500"
                />
              </div>
            </div>
          </div>
        </m.section>

        {/* ════════════════════════════════════════════════════════
            ACTION BANNERS
        ════════════════════════════════════════════════════════ */}
        <m.div variants={staggerItem} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Quiz Fiscal */}
          <Link
            href="/quiz-fiscal"
            className="group flex items-center justify-between rounded-4xl border border-brand/20 bg-brand-light p-4 transition-all hover:shadow-lift sm:p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                <Trophy size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-dark">Quiz Fiscal</p>
                <p className="text-[11px] text-stone-500">
                  {quiz.carregado
                    ? quiz.nivel.titulo
                    : "Testa os teus conhecimentos"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="flex-shrink-0 text-brand transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Plano */}
          <Link
            href="/dashboard/upgrade"
            className="group flex items-center justify-between rounded-4xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:shadow-lift sm:p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
                <Star size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-800">Plano e subscrição</p>
                <p className="text-[11px] text-stone-500">
                  {plano === "pro" ? "Plano Pro ativo" : "Fazer upgrade"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Conta */}
          <Link
            href="/dashboard/conta"
            className="group flex items-center justify-between rounded-4xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:shadow-lift sm:p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
                <Lock size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-800">Conta e segurança</p>
                <p className="text-[11px] text-stone-500">
                  {user ? "Sessão iniciada" : "Entrar ou criar conta"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </m.div>

        {/* ════════════════════════════════════════════════════════
            MAIN CONTENT GRID
        ════════════════════════════════════════════════════════ */}
        <m.div variants={staggerItem} className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* ── LEFT — TABS + CONTENT ── */}
          <div className="space-y-5 lg:col-span-2">

            {/* Tab bar */}
            <div className="flex gap-2 flex-wrap">
              <SectionTab
                ativo={activeSection === "progresso"}
                icon={BarChart2}
                label="Progressão"
                onClick={() => setActiveSection("progresso")}
              />
              <SectionTab
                ativo={activeSection === "conquistas"}
                icon={Award}
                label="Conquistas"
                onClick={() => setActiveSection("conquistas")}
              />
              <SectionTab
                ativo={activeSection === "historico"}
                icon={BookOpen}
                label="Histórico"
                onClick={() => setActiveSection("historico")}
              />
            </div>

            <AnimatePresence mode="wait">

              {/* ── PROGRESSÃO ── */}
              {activeSection === "progresso" && (
                <m.div
                  key="progresso"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="space-y-5"
                >
                  {/* XP + Level Progress */}
                  <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
                    <div className="mb-1 flex items-center justify-between">
                      <div>
                        <p className="eyebrow text-stone-400">Progressão</p>
                        <h2 className="mt-1 text-lg font-display font-semibold text-stone-800">
                          {quiz.carregado ? quiz.nivel.titulo : "Carregando..."}
                        </h2>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold tabular-nums text-brand">{quiz.carregado ? fmt(quiz.xp) : "—"}</p>
                        <p className="text-[10px] font-medium text-stone-400">XP total</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {quiz.carregado && (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-stone-500">
                          <span>Nível {quiz.nivel.nivel}</span>
                          <span>
                            {quiz.nivel.xpProximo
                              ? `${fmt(quiz.xp - quiz.nivel.xpMinimo)} / ${fmt(quiz.nivel.xpProximo - quiz.nivel.xpMinimo)} XP`
                              : "Nível máximo"}
                          </span>
                          {quiz.nivel.xpProximo && <span>Nível {quiz.nivel.nivel + 1}</span>}
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100">
                          <m.div
                            initial={{ width: 0 }}
                            animate={{ width: `${quiz.xpNivelPct}%` }}
                            transition={{ duration: 1, ease: EASE }}
                            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark"
                          />
                        </div>
                      </div>
                    )}

                    {/* Energy */}
                    <div className="mt-5 flex items-center gap-4 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Zap size={15} className="text-amber-500" />
                        <span className="text-sm font-semibold text-stone-700">Energia</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: quiz.energiaTotal }, (_, i) => (
                          <div
                            key={i}
                            className={`h-2.5 w-5 rounded-full transition-colors ${
                              i < quiz.energiaRestante ? "bg-amber-400" : "bg-stone-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs tabular-nums text-stone-500">
                        {quiz.energiaRestante}/{quiz.energiaTotal}
                      </span>
                      <InfoTip>Gastas 1 energia por sessão do Quiz. Repõe automaticamente à meia-noite.</InfoTip>
                    </div>
                  </div>

                  {/* Quiz Stats Summary */}
                  <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
                    <p className="eyebrow text-stone-400">Estatísticas do Quiz</p>
                    <h2 className="mt-1 mb-5 text-lg font-display font-semibold text-stone-800">Desempenho</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-center">
                        <p className="text-xl font-semibold tabular-nums text-stone-800">{totalSessoes}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Sessões</p>
                      </div>
                      <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-center">
                        <p className="text-xl font-semibold tabular-nums text-stone-800">{mediaAcertos}%</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Média acerto</p>
                      </div>
                      <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-center">
                        <p className="text-xl font-semibold tabular-nums text-stone-800">{quiz.streakRecord}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Melhor streak</p>
                      </div>
                      <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-center">
                        <p className="text-xl font-semibold tabular-nums text-brand">{quiz.carregado ? quiz.nivel.titulo.split(" ")[0] : "—"}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Título</p>
                      </div>
                    </div>
                  </div>
                </m.div>
              )}

              {/* ── CONQUISTAS ── */}
              {activeSection === "conquistas" && (
                <m.div
                  key="conquistas"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
                    <p className="eyebrow text-stone-400">Jornada fiscal</p>
                    <h2 className="mt-1 mb-2 text-lg font-display font-semibold text-stone-800">Conquistas</h2>
                    <p className="mb-5 text-sm text-stone-500">
                      {quiz.carregado
                        ? `Desbloqueaste ${nivelAtualIdx + 1} de ${NIVEIS.length} níveis. ${
                            isGuru
                              ? "Parabéns, és um Guru do IRS!"
                              : `Faltam ${fmt((quiz.nivel.xpProximo ?? quiz.xp) - quiz.xp)} XP para o próximo nível.`
                          }`
                        : "Carregando..."}
                    </p>

                    <div className="space-y-3">
                      {NIVEIS.map((n) => (
                        <AchievementBadge
                          key={n.nivel}
                          nivel={n.nivel}
                          titulo={n.titulo}
                          xpMinimo={n.xpMinimo}
                          alcancado={quiz.xp >= n.xpMinimo}
                          atual={n.nivel === quiz.nivel.nivel}
                        />
                      ))}
                    </div>
                  </div>
                </m.div>
              )}

              {/* ── HISTÓRICO ── */}
              {activeSection === "historico" && (
                <m.div
                  key="historico"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  <div className="rounded-4xl border border-stone-100 bg-white shadow-card overflow-hidden">
                    <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
                      <div>
                        <p className="eyebrow text-stone-400">Quiz Fiscal</p>
                        <h2 className="mt-1 text-base font-display font-semibold text-stone-800">
                          Sessões recentes
                        </h2>
                      </div>
                      <Link
                        href="/quiz-fiscal"
                        className="flex items-center gap-1 text-[11px] font-semibold text-brand-dark transition-colors hover:underline"
                      >
                        Jogar <ArrowRight size={11} />
                      </Link>
                    </div>

                    {quiz.sessoes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-100 bg-stone-50">
                          <Trophy size={20} className="text-stone-300" />
                        </div>
                        <p className="text-sm font-medium text-stone-500">Sem sessões ainda</p>
                        <p className="mt-1 text-xs text-stone-400">
                          Joga o Quiz Fiscal para começar a acumular XP
                        </p>
                        <Link
                          href="/quiz-fiscal"
                          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
                        >
                          <Trophy size={13} /> Começar o Quiz
                        </Link>
                      </div>
                    ) : (
                      <div>
                        {quiz.sessoes.slice(0, 10).map((s) => (
                          <SessionItem
                            key={s.id}
                            acertos={s.acertos}
                            total={s.totalPerguntas}
                            xp={s.xpGanho}
                            streak={s.streakMaximo}
                            tempo={s.tempoTotalSeg}
                            data={s.criadoEm}
                            categoria={s.categoria}
                          />
                        ))}
                        {quiz.sessoes.length > 10 && (
                          <div className="border-t border-stone-100 px-5 py-3 text-center">
                            <span className="text-xs text-stone-400">
                              +{quiz.sessoes.length - 10} sessões anteriores
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </m.div>
              )}

            </AnimatePresence>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-4">

            {/* Saúde Fiscal */}
            <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand">
                    <Gauge size={16} />
                  </div>
                  <span className="text-sm font-semibold text-stone-800">Saúde Fiscal</span>
                </div>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 hover:text-stone-600"
                >
                  Ver <ArrowRight size={10} />
                </Link>
              </div>

              {/* Score ring */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18" cy="18" r="15.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-stone-100"
                    />
                    <circle
                      cx="18" cy="18" r="15.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-brand"
                      strokeLinecap="round"
                      strokeDasharray={`${saude.score * 0.975} 97.5`}
                    />
                  </svg>
                  <span className="absolute text-base font-semibold tabular-nums text-stone-800">
                    {saude.score}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800">{saude.estado}</p>
                  <p className="text-xs text-stone-500">
                    {totalRecibos > 0
                      ? `${totalRecibos} recibo${totalRecibos === 1 ? "" : "s"} registados`
                      : "Regista recibos para ver a tua saúde fiscal"}
                  </p>
                </div>
              </div>

              {saude.fatores.length > 0 && (
                <div className="space-y-1.5">
                  {saude.fatores.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className={`mt-0.5 flex-shrink-0 ${f.ok ? "text-brand" : "text-amber-500"}`}>
                        {f.ok ? <Check size={11} /> : <Target size={11} />}
                      </span>
                      <span className="text-stone-600">{f.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Guru do IRS badge card */}
            {isGuru && (
              <div className="rounded-4xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 shadow-sm">
                    <Trophy size={22} className="text-amber-900" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Guru do IRS</p>
                    <p className="text-[10px] font-medium text-amber-700">Badge exclusivo</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-amber-800">
                  Atingiste o nível máximo no Quiz Fiscal com {fmt(quiz.xp)} XP.
                  Este badge representa o teu domínio fiscal.
                </p>
              </div>
            )}

            {/* Quiz quick access */}
            <QuickCard
              icon={Trophy}
              label="Quiz Fiscal"
              sub={quiz.carregado
                ? `Nível ${quiz.nivel.nivel} — ${quiz.nivel.titulo}`
                : "Testa os teus conhecimentos fiscais"}
              href="/quiz-fiscal"
              badge={quiz.carregado ? `${quiz.energiaRestante} energia` : undefined}
            />

            {/* Prazos quick access */}
            <QuickCard
              icon={Calendar}
              label="Prazos fiscais"
              sub="Consultar obrigações e prazos"
              href="/dashboard/prazos"
              acento="bg-blue-50 text-blue-600"
            />

            {/* Profile completeness */}
            <CompletenessWidget
              user={user}
              quizXp={quiz.xp}
              recibosCount={totalRecibos}
            />
          </div>
        </m.div>
      </m.div>
    </div>
  );
}
