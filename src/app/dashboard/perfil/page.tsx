"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { m, AnimatePresence } from "motion/react";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import { useRecibos, resumir } from "@/lib/store/recibos";
import { useQuizProgresso } from "@/lib/store/quiz-progresso";
import { NIVEIS } from "@/lib/quiz-fiscal/progresso";
import { saudeFiscal } from "@/lib/insights";
import { verificarAdmin } from "@/lib/supabase/admin";
import { obterPerfil, guardarPerfil, uploadAvatar, removerAvatar, type DadosPerfil } from "@/lib/supabase/profile";
import {
  obterCupoesUtilizador,
  ativarCupao,
  type CupaoQuiz,
} from "@/lib/supabase/quiz-achievements";
import { fadeUp, staggerContainer, staggerItem, EASE } from "@/lib/motion";
import ProGate from "@/components/ui/ProGate";
import InfoTip from "@/components/ui/InfoTip";
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
  Pencil,
  Gift,
  Copy,
  ImageIcon,
  Trash,
  Close,
} from "@/components/ui/Icons";

// ── Helpers ──────────────────────────────────────────────────────────────

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("pt-PT").format(n);
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Level styles ─────────────────────────────────────────────────────────

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
    <div className="flex-1 min-w-[80px] rounded-2xl border border-stone-100 bg-white p-3 text-center shadow-card transition-transform duration-200 hover:-translate-y-0.5 dark:border-stone-800 dark:bg-stone-900">
      <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-stone-50 dark:bg-stone-800">
        <Icon size={15} className={acento ?? "text-stone-400"} />
      </div>
      <p className="text-lg font-semibold tabular-nums text-stone-800 dark:text-stone-100">{valor}</p>
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
          : "border border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
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
          : "border-stone-100 bg-stone-50 opacity-50 dark:border-stone-800 dark:bg-stone-900"
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
            {fmtNum(xpMinimo)} XP
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
    <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5 last:border-0 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/40">
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
          <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
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

// ── Coupon Card ──────────────────────────────────────────────────────────

function CupaoCard({
  cupao,
  onAtivar,
  ativando,
}: {
  cupao: CupaoQuiz;
  onAtivar: (id: string) => void;
  ativando: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiarCodigo = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cupao.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* fallback silencioso */
    }
  }, [cupao.codigo]);

  const expirado = cupao.estado === "expirado" || new Date(cupao.expiraEm) < new Date();
  const disponivel = cupao.estado === "disponivel" && !expirado;
  const ativado = cupao.estado === "ativado";

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        disponivel
          ? "border-brand/20 bg-brand-light"
          : ativado
            ? "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
            : "border-stone-100 bg-stone-50 opacity-60 dark:border-stone-800 dark:bg-stone-900"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
              disponivel
                ? "bg-brand text-white"
                : ativado
                  ? "bg-stone-100 text-stone-500 dark:bg-stone-800"
                  : "bg-stone-100 text-stone-300"
            }`}
          >
            <Gift size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              {cupao.meses} meses Pro grátis
            </p>
            <p className="text-[11px] text-stone-500">
              Caminho {cupao.caminho === "medio" ? "médio" : "difícil"}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            disponivel
              ? "bg-brand/10 text-brand-dark"
              : ativado
                ? "bg-stone-100 text-stone-500"
                : "bg-stone-100 text-stone-400"
          }`}
        >
          {disponivel && <Sparkle size={9} />}
          {ativado && <Check size={9} />}
          {expirado && !ativado && <Clock size={9} />}
          {disponivel ? "Disponível" : ativado ? "Ativado" : "Expirado"}
        </span>
      </div>

      {/* Code */}
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 font-mono text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
          {cupao.codigo}
        </code>
        <button
          type="button"
          onClick={copiarCodigo}
          aria-label="Copiar código"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-400 transition-colors hover:text-stone-700 dark:border-stone-700 dark:bg-stone-800"
        >
          {copiado ? <Check size={13} className="text-brand" /> : <Copy size={13} />}
        </button>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-stone-400">
          {disponivel
            ? `Expira em ${formatDate(cupao.expiraEm)}`
            : ativado && cupao.ativadoEm
              ? `Ativado em ${formatDate(cupao.ativadoEm)}`
              : `Expirou em ${formatDate(cupao.expiraEm)}`}
        </span>

        {disponivel && (
          <button
            type="button"
            onClick={() => onAtivar(cupao.id)}
            disabled={ativando}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:shadow-glow disabled:opacity-50"
          >
            <Zap size={11} />
            {ativando ? "A ativar..." : "Ativar cupão"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Profile Completeness ─────────────────────────────────────────────────

function CompletenessWidget({
  user,
  quizXp,
  recibosCount,
  perfilPreenchido,
}: {
  user: { email?: string | null } | null;
  quizXp: number;
  recibosCount: number;
  perfilPreenchido: boolean;
}) {
  const items = [
    { label: "Conta criada", done: !!user, icon: User },
    { label: "Perfil preenchido", done: perfilPreenchido, icon: Pencil },
    { label: "Primeiro recibo", done: recibosCount > 0, icon: Receipt },
    { label: "Quiz Fiscal jogado", done: quizXp > 0, icon: Trophy },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  if (done === items.length) return null;

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light text-brand">
            <Sparkle size={14} />
          </div>
          <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">Completar Perfil</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-brand">{pct}%</span>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
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
              className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-3.5 py-2.5 dark:border-stone-800 dark:bg-stone-800/40"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
                <item.icon size={13} className="text-stone-400" />
              </div>
              <span className="flex-1 text-xs font-medium text-stone-600 dark:text-stone-300">{item.label}</span>
              <ArrowRight size={12} className="flex-shrink-0 text-stone-300" />
            </div>
          ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN — PERFIL
// ══════════════════════════════════════════════════════════════════════════

export default function PerfilPage() {
  const { user, carregado: authCarregado } = useAuth();
  const { plano } = useSubscricao();
  const { recibos, carregado: recibosCarregado } = useRecibos();
  const quiz = useQuizProgresso();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState<"progresso" | "conquistas" | "historico">("progresso");

  // ── Supabase profile state ──
  const [perfil, setPerfil] = useState<DadosPerfil>({ nome: "", telefone: "", nif: "", avatarUrl: "" });
  const [perfilCarregado, setPerfilCarregado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<DadosPerfil>({ nome: "", telefone: "", nif: "", avatarUrl: "" });
  const [guardando, setGuardando] = useState(false);
  const [msgGuardar, setMsgGuardar] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // ── Coupons state ──
  const [cupoes, setCupoes] = useState<CupaoQuiz[]>([]);
  const [cupoesCarregado, setCupoesCarregado] = useState(false);
  const [cupaoAtivando, setCupaoAtivando] = useState<string | null>(null);

  // ── Avatar state ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [avatarDragOver, setAvatarDragOver] = useState(false);

  // ── Load profile from Supabase ──
  useEffect(() => {
    if (!user) {
      setPerfilCarregado(true);
      return;
    }
    obterPerfil(user.id).then((dados) => {
      setPerfil(dados);
      setRascunho(dados);
      setPerfilCarregado(true);
    });
  }, [user]);

  // ── Load coupons ──
  useEffect(() => {
    if (!user) {
      setCupoesCarregado(true);
      return;
    }
    obterCupoesUtilizador(user.id).then((c) => {
      setCupoes(c);
      setCupoesCarregado(true);
    });
  }, [user]);

  // ── Admin check ──
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    verificarAdmin(user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [user]);

  // ── Save profile ──
  const salvarPerfil = useCallback(async () => {
    if (!user) return;
    setGuardando(true);
    setMsgGuardar(null);
    const { erro } = await guardarPerfil(user.id, rascunho);
    setGuardando(false);
    if (erro) {
      setMsgGuardar({ tipo: "erro", texto: erro });
    } else {
      setPerfil(rascunho);
      setEditando(false);
      setMsgGuardar({ tipo: "ok", texto: "Perfil guardado com sucesso." });
      setTimeout(() => setMsgGuardar(null), 3000);
    }
  }, [user, rascunho]);

  // ── Activate coupon ──
  const handleAtivarCupao = useCallback(async (cupaoId: string) => {
    if (!user) return;
    setCupaoAtivando(cupaoId);
    const { erro } = await ativarCupao(cupaoId, user.id);
    setCupaoAtivando(null);
    if (!erro) {
      setCupoes((prev) =>
        prev.map((c) =>
          c.id === cupaoId
            ? { ...c, estado: "ativado" as const, ativadoEm: new Date().toISOString() }
            : c,
        ),
      );
    }
  }, [user]);

  // ── Avatar upload ──
  const processAvatarFile = useCallback(async (file: File) => {
    if (!user) return;
    setAvatarUploading(true);
    setAvatarMsg(null);
    setAvatarMenuOpen(false);
    setAvatarDragOver(false);
    const { url, erro } = await uploadAvatar(user.id, file);
    setAvatarUploading(false);
    if (erro) {
      setAvatarMsg({ tipo: "erro", texto: erro });
      setTimeout(() => setAvatarMsg(null), 4000);
    } else if (url) {
      setPerfil((p) => ({ ...p, avatarUrl: url }));
      setRascunho((r) => ({ ...r, avatarUrl: url }));
      setAvatarMsg({ tipo: "ok", texto: "Foto atualizada." });
      setTimeout(() => setAvatarMsg(null), 3000);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [user]);

  const handleAvatarFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAvatarFile(file);
  }, [processAvatarFile]);

  const handleAvatarDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setAvatarDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) processAvatarFile(file);
  }, [processAvatarFile]);

  const handleRemoveAvatar = useCallback(async () => {
    if (!user) return;
    setAvatarUploading(true);
    setAvatarMsg(null);
    setAvatarMenuOpen(false);
    const { erro } = await removerAvatar(user.id);
    setAvatarUploading(false);
    if (erro) {
      setAvatarMsg({ tipo: "erro", texto: erro });
      setTimeout(() => setAvatarMsg(null), 4000);
    } else {
      setPerfil((p) => ({ ...p, avatarUrl: "" }));
      setRascunho((r) => ({ ...r, avatarUrl: "" }));
      setAvatarMsg({ tipo: "ok", texto: "Foto removida." });
      setTimeout(() => setAvatarMsg(null), 3000);
    }
  }, [user]);

  const saude = useMemo(
    () => (recibosCarregado ? saudeFiscal(recibos) : { score: 0, estado: "Tranquilo" as const, fatores: [] }),
    [recibosCarregado, recibos],
  );

  const totalRecibos = recibos.length;
  const isGuru = quiz.nivel.nivel === 10;
  const nivelAtualIdx = NIVEIS.findIndex((n) => n.nivel === quiz.nivel.nivel);
  const totalSessoes = quiz.sessoes.length;
  const mediaAcertos =
    totalSessoes > 0
      ? Math.round(
          quiz.sessoes.reduce((s, x) => s + (x.totalPerguntas > 0 ? x.acertos / x.totalPerguntas : 0), 0) /
            totalSessoes * 100,
        )
      : 0;

  const perfilPreenchido = !!(perfil.nome && perfil.telefone);
  const nomeDisplay = perfil.nome || user?.email?.split("@")[0] || "Utilizador";

  const cupoesDisponiveis = cupoes.filter((c) => c.estado === "disponivel" && new Date(c.expiraEm) > new Date());

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
          className="relative rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900"
        >
          <div className="absolute inset-x-0 top-0 h-32 rounded-t-4xl bg-gradient-to-br from-brand/8 via-brand-light/40 to-transparent dark:from-brand/10 dark:via-brand/5" />

          <div className="relative flex flex-col gap-5 px-5 pb-6 pt-7 sm:flex-row sm:items-start sm:gap-6 sm:px-8 sm:pt-8">
            {/* Avatar */}
            <div
              className="relative flex-shrink-0 self-center sm:self-auto"
              onDragOver={(e) => { if (user && plano === "pro") { e.preventDefault(); setAvatarDragOver(true); } }}
              onDragLeave={() => setAvatarDragOver(false)}
              onDrop={user && plano === "pro" ? handleAvatarDrop : undefined}
            >
              <div className={`relative h-24 w-24 rounded-3xl transition-all ${avatarDragOver ? "ring-3 ring-brand ring-offset-2" : ""}`}>
                {perfil.avatarUrl ? (
                  <Image
                    src={perfil.avatarUrl}
                    alt="Foto de perfil"
                    fill
                    className="rounded-3xl border-2 border-brand/20 object-cover shadow-lift"
                    sizes="96px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-3xl border-2 border-brand/20 bg-gradient-to-br from-brand to-brand-dark shadow-lift">
                    <span className="font-display text-4xl font-semibold text-white">
                      {(perfil.nome || user?.email || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/40">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}

                {avatarDragOver && !avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-brand/30 backdrop-blur-sm">
                    <ImageIcon size={20} className="text-white" />
                  </div>
                )}

                {/* Pro-only: photo upload button */}
                {user && plano === "pro" && !avatarUploading && (
                  <div className="absolute -bottom-1.5 -right-1.5 z-10">
                    <button
                      type="button"
                      onClick={() => setAvatarMenuOpen((v) => !v)}
                      aria-label="Alterar foto de perfil"
                      aria-haspopup="menu"
                      aria-expanded={avatarMenuOpen}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-brand text-white shadow-sm transition-colors hover:bg-brand-dark dark:border-stone-900"
                    >
                      <ImageIcon size={14} />
                    </button>

                    <AnimatePresence>
                      {avatarMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setAvatarMenuOpen(false)} aria-hidden />
                          <m.div
                            initial={{ opacity: 0, scale: 0.9, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.15, ease: EASE }}
                            className="absolute left-0 top-full z-30 mt-1.5 w-48 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lift sm:left-auto sm:right-0 dark:border-stone-700 dark:bg-stone-800"
                          >
                            <button
                              type="button"
                              onClick={() => { setAvatarMenuOpen(false); fileInputRef.current?.click(); }}
                              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-700"
                            >
                              <ImageIcon size={13} className="text-brand" />
                              {perfil.avatarUrl ? "Trocar foto" : "Carregar foto"}
                            </button>
                            {perfil.avatarUrl && (
                              <button
                                type="button"
                                onClick={handleRemoveAvatar}
                                className="flex w-full items-center gap-2.5 border-t border-stone-100 px-3.5 py-2.5 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-stone-700 dark:hover:bg-red-900/20"
                              >
                                <Trash size={13} />
                                Remover foto
                              </button>
                            )}
                          </m.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Pro badge overlay for free users */}
                {user && plano !== "pro" && (
                  <Link
                    href="/dashboard/upgrade"
                    aria-label="Fazer upgrade para adicionar foto"
                    className="absolute -bottom-1.5 -right-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-stone-200 text-stone-400 shadow-sm transition-colors hover:bg-stone-300 dark:border-stone-900 dark:bg-stone-700"
                  >
                    <Lock size={12} />
                  </Link>
                )}

                {/* Guru badge */}
                {isGuru && (
                  <div className="absolute -bottom-1.5 -left-1.5 flex h-7 w-7 items-center justify-center rounded-lg border-2 border-white bg-amber-400 shadow-sm dark:border-stone-900">
                    <Trophy size={12} className="text-amber-900" />
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarFile}
                className="hidden"
                aria-label="Selecionar foto de perfil"
              />

              {/* Drag hint */}
              {user && plano === "pro" && (
                <p className="mt-2 text-center text-[10px] text-stone-400 dark:text-stone-500 hidden sm:block">
                  Arrasta uma foto
                </p>
              )}
            </div>

            {/* Avatar feedback */}
            <AnimatePresence>
              {avatarMsg && (
                <m.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`absolute left-5 top-2 z-20 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium shadow-sm sm:left-8 ${
                    avatarMsg.tipo === "ok"
                      ? "bg-brand-light text-brand-dark"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {avatarMsg.tipo === "ok" ? <Check size={11} /> : <Target size={11} />}
                  {avatarMsg.texto}
                </m.div>
              )}
            </AnimatePresence>

            {/* Info */}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2.5 mb-1 sm:justify-start">
                <h1 className="font-display text-2xl font-semibold text-stone-800 sm:text-3xl dark:text-stone-100">
                  {saudacao()}, {nomeDisplay}
                </h1>
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

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
                <StatCard
                  valor={quiz.carregado ? fmtNum(quiz.xp) : "—"}
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
            DADOS PESSOAIS — Editable form (saved to Supabase)
        ════════════════════════════════════════════════════════ */}
        <m.section variants={staggerItem} className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand">
                <User size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Dados pessoais</h2>
                <p className="text-[11px] text-stone-400">Informações guardadas na tua conta</p>
              </div>
            </div>
            {user && !editando && (
              <button
                type="button"
                onClick={() => { setRascunho(perfil); setEditando(true); setMsgGuardar(null); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-800 dark:border-stone-700 dark:text-stone-300"
              >
                <Pencil size={12} />
                Editar
              </button>
            )}
          </div>

          {!user ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-8 text-center dark:border-stone-700 dark:bg-stone-800/40">
              <Lock size={20} className="mb-2 text-stone-300" />
              <p className="text-sm font-medium text-stone-500">Inicia sessão para editar o teu perfil</p>
              <p className="mt-1 text-xs text-stone-400">Os teus dados ficam guardados na nuvem</p>
            </div>
          ) : editando ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="perfil-nome" className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-300">
                    Nome
                  </label>
                  <input
                    id="perfil-nome"
                    type="text"
                    value={rascunho.nome}
                    onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))}
                    placeholder="O teu nome"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-300 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label htmlFor="perfil-telefone" className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-300">
                    Telefone
                  </label>
                  <input
                    id="perfil-telefone"
                    type="tel"
                    value={rascunho.telefone}
                    onChange={(e) => setRascunho((r) => ({ ...r, telefone: e.target.value }))}
                    placeholder="+351 912 345 678"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-300 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  />
                </div>
              </div>
              <div className="max-w-sm">
                <label htmlFor="perfil-nif" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300">
                  NIF
                  <InfoTip>Número de Identificação Fiscal. Usado para pré-preencher campos nos simuladores.</InfoTip>
                </label>
                <input
                  id="perfil-nif"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={rascunho.nif}
                  onChange={(e) => setRascunho((r) => ({ ...r, nif: e.target.value.replace(/\D/g, "").slice(0, 9) }))}
                  placeholder="123456789"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-300 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={salvarPerfil}
                  disabled={guardando}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-glow disabled:opacity-50"
                >
                  {guardando ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      A guardar...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Guardar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditando(false); setRascunho(perfil); setMsgGuardar(null); }}
                  disabled={guardando}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-700 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/40">
                <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Nome</p>
                <p className="mt-0.5 text-sm font-medium text-stone-700 dark:text-stone-200">
                  {perfil.nome || <span className="text-stone-300 italic">Não definido</span>}
                </p>
              </div>
              <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/40">
                <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Telefone</p>
                <p className="mt-0.5 text-sm font-medium text-stone-700 dark:text-stone-200">
                  {perfil.telefone || <span className="text-stone-300 italic">Não definido</span>}
                </p>
              </div>
              <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/40">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">NIF</p>
                  <InfoTip>Número de Identificação Fiscal</InfoTip>
                </div>
                <p className="mt-0.5 text-sm font-medium text-stone-700 dark:text-stone-200">
                  {perfil.nif || <span className="text-stone-300 italic">Não definido</span>}
                </p>
              </div>
            </div>
          )}

          {/* Save feedback */}
          <AnimatePresence>
            {msgGuardar && (
              <m.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium ${
                  msgGuardar.tipo === "ok"
                    ? "bg-brand-light text-brand-dark"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {msgGuardar.tipo === "ok" ? <Check size={13} /> : <Target size={13} />}
                {msgGuardar.texto}
              </m.div>
            )}
          </AnimatePresence>
        </m.section>

        {/* ════════════════════════════════════════════════════════
            ACTION BANNERS
        ════════════════════════════════════════════════════════ */}
        <m.div variants={staggerItem} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                  {quiz.carregado ? quiz.nivel.titulo : "Testa os teus conhecimentos"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="flex-shrink-0 text-brand transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/dashboard/upgrade"
            className="group flex items-center justify-between rounded-4xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:shadow-lift sm:p-5 dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500 dark:bg-stone-800">
                <Star size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Plano e subscrição</p>
                <p className="text-[11px] text-stone-500">
                  {plano === "pro" ? "Plano Pro ativo" : "Fazer upgrade"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/dashboard/conta"
            className="group flex items-center justify-between rounded-4xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:shadow-lift sm:p-5 dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500 dark:bg-stone-800">
                <Lock size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Conta e segurança</p>
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
                  <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
                    <div className="mb-1 flex items-center justify-between">
                      <div>
                        <p className="eyebrow text-stone-400">Progressão</p>
                        <h2 className="mt-1 text-lg font-display font-semibold text-stone-800 dark:text-stone-100">
                          {quiz.carregado ? quiz.nivel.titulo : "A carregar..."}
                        </h2>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold tabular-nums text-brand">{quiz.carregado ? fmtNum(quiz.xp) : "—"}</p>
                        <p className="text-[10px] font-medium text-stone-400">XP total</p>
                      </div>
                    </div>

                    {quiz.carregado && (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-stone-500">
                          <span>Nível {quiz.nivel.nivel}</span>
                          <span>
                            {quiz.nivel.xpProximo
                              ? `${fmtNum(quiz.xp - quiz.nivel.xpMinimo)} / ${fmtNum(quiz.nivel.xpProximo - quiz.nivel.xpMinimo)} XP`
                              : "Nível máximo"}
                          </span>
                          {quiz.nivel.xpProximo && <span>Nível {quiz.nivel.nivel + 1}</span>}
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                          <m.div
                            initial={{ width: 0 }}
                            animate={{ width: `${quiz.xpNivelPct}%` }}
                            transition={{ duration: 1, ease: EASE }}
                            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark"
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex items-center gap-4 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/40">
                      <div className="flex items-center gap-1.5">
                        <Zap size={15} className="text-amber-500" />
                        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">Energia</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: quiz.energiaTotal }, (_, i) => (
                          <div
                            key={i}
                            className={`h-2.5 w-5 rounded-full transition-colors ${
                              i < quiz.energiaRestante ? "bg-amber-400" : "bg-stone-200 dark:bg-stone-700"
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

                  {/* Quiz Stats — Pro gets detailed view, Free gets summary */}
                  <ProGate
                    title="Estatísticas detalhadas"
                    description="Acede a estatísticas avançadas do teu desempenho no Quiz Fiscal com o plano Pro."
                    className="rounded-4xl"
                  >
                    <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
                      <p className="eyebrow text-stone-400">Estatísticas do Quiz</p>
                      <h2 className="mt-1 mb-5 text-lg font-display font-semibold text-stone-800 dark:text-stone-100">Desempenho detalhado</h2>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-center dark:border-stone-800 dark:bg-stone-800/40">
                          <p className="text-xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">{totalSessoes}</p>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Sessões</p>
                        </div>
                        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-center dark:border-stone-800 dark:bg-stone-800/40">
                          <p className="text-xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">{mediaAcertos}%</p>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Média acerto</p>
                        </div>
                        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-center dark:border-stone-800 dark:bg-stone-800/40">
                          <p className="text-xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">{quiz.streakRecord}</p>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Melhor streak</p>
                        </div>
                        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-center dark:border-stone-800 dark:bg-stone-800/40">
                          <p className="text-xl font-semibold tabular-nums text-brand">{quiz.carregado ? quiz.nivel.titulo.split(" ")[0] : "—"}</p>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Título</p>
                        </div>
                      </div>
                    </div>
                  </ProGate>
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
                  <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
                    <p className="eyebrow text-stone-400">Jornada fiscal</p>
                    <h2 className="mt-1 mb-2 text-lg font-display font-semibold text-stone-800 dark:text-stone-100">Conquistas</h2>
                    <p className="mb-5 text-sm text-stone-500">
                      {quiz.carregado
                        ? `Desbloqueaste ${nivelAtualIdx + 1} de ${NIVEIS.length} níveis. ${
                            isGuru
                              ? "Parabéns, és um Guru do IRS!"
                              : `Faltam ${fmtNum((quiz.nivel.xpProximo ?? quiz.xp) - quiz.xp)} XP para o próximo nível.`
                          }`
                        : "A carregar..."}
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
                  <div className="rounded-4xl border border-stone-100 bg-white shadow-card overflow-hidden dark:border-stone-800 dark:bg-stone-900">
                    <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5 dark:border-stone-800">
                      <div>
                        <p className="eyebrow text-stone-400">Quiz Fiscal</p>
                        <h2 className="mt-1 text-base font-display font-semibold text-stone-800 dark:text-stone-100">
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
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-100 bg-stone-50 dark:border-stone-800">
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
                          <div className="border-t border-stone-100 px-5 py-3 text-center dark:border-stone-800">
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

            {/* ── MEUS CUPÕES ── */}
            <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Gift size={16} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">Meus Cupões</span>
                    {cupoesDisponiveis.length > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        {cupoesDisponiveis.length}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href="/quiz-fiscal"
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 hover:text-stone-600"
                >
                  Quiz <ArrowRight size={10} />
                </Link>
              </div>

              {!user ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-6 text-center dark:border-stone-700 dark:bg-stone-800/40">
                  <Lock size={18} className="mb-2 text-stone-300" />
                  <p className="text-xs font-medium text-stone-500">Inicia sessão para ver os teus cupões</p>
                </div>
              ) : !cupoesCarregado ? (
                <div className="flex items-center justify-center py-6">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                </div>
              ) : cupoes.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-6 text-center dark:border-stone-700 dark:bg-stone-800/40">
                  <Trophy size={18} className="mb-2 text-stone-300" />
                  <p className="text-xs font-medium text-stone-500">Sem cupões ainda</p>
                  <p className="mt-1 max-w-[200px] text-[11px] text-stone-400">
                    Completa desafios no Quiz Fiscal para ganhar meses Pro grátis
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cupoes.map((c) => (
                    <CupaoCard
                      key={c.id}
                      cupao={c}
                      onAtivar={handleAtivarCupao}
                      ativando={cupaoAtivando === c.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Saúde Fiscal — Pro feature */}
            <ProGate
              title="Saúde Fiscal"
              description="Analisa a saúde da tua situação fiscal com indicadores detalhados. Disponível no plano Pro."
              className="rounded-4xl"
            >
              <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand">
                      <Gauge size={16} />
                    </div>
                    <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">Saúde Fiscal</span>
                  </div>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 hover:text-stone-600"
                  >
                    Ver <ArrowRight size={10} />
                  </Link>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center">
                    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18" cy="18" r="15.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-stone-100 dark:text-stone-800"
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
                    <span className="absolute text-base font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                      {saude.score}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{saude.estado}</p>
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
                        <span className="text-stone-600 dark:text-stone-400">{f.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ProGate>

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
                  Atingiste o nível máximo no Quiz Fiscal com {fmtNum(quiz.xp)} XP.
                  Este badge representa o teu domínio fiscal.
                </p>
              </div>
            )}

            {/* Profile completeness */}
            <CompletenessWidget
              user={user}
              quizXp={quiz.xp}
              recibosCount={totalRecibos}
              perfilPreenchido={perfilPreenchido}
            />
          </div>
        </m.div>
      </m.div>
    </div>
  );
}
