"use client";

// Barra inferior do Quiz Fiscal no TELEMÓVEL (peça responsiva do Quiz — não é
// uma versão à parte). Estatísticas por cima (mesmo design da barra do desktop)
// e header: logótipo→home · nível · histórico · configurações.

import { useState } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "motion/react";
import {
  Settings, LogoMark, Close, Target, Zap, Star, Fire, History as HistoryIcon,
  User, Trophy, ChevronRight,
} from "@/components/ui/Icons";
import { useQuizProgresso, type SessaoHistorico } from "@/lib/store/quiz-progresso";
import { NIVEIS } from "@/lib/quiz-fiscal/progresso";
import { useAuth } from "@/lib/supabase/auth";

const HEX = "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)";

interface Props {
  /** Valores já formatados (iguais aos da barra do desktop). */
  acertos: string;
  tempo: string;
  pontos: string;
  erros: string;
  /** Abre o modal de definições (o mesmo do desktop). */
  onConfiguracoes: () => void;
}

/** Mesma estrutura da FooterStat do desktop (ícone + rótulo + valor, dourado). */
function FStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-semibold" style={{ color: "#ebd4a4", opacity: 0.6 }}>{label}</span>
        <span className="text-[14px] font-bold tabular-nums" style={{ color: "#ebd4a4" }}>{value}</span>
      </div>
    </div>
  );
}
const Sep = () => <div className="h-5 w-px opacity-30" style={{ backgroundColor: "#ebd4a4" }} aria-hidden />;

const btnIcon =
  "flex h-12 w-12 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800";

export default function QuizBarraInferior({ acertos, tempo, pontos, erros, onConfiguracoes }: Props) {
  const prog = useQuizProgresso();
  const { user, abrirModal } = useAuth();
  const [modal, setModal] = useState<null | "nivel" | "historico">(null);

  const nivel = prog.nivel;
  const xpPct = prog.xpNivelPct;
  const xpRestante = nivel.xpProximo != null ? nivel.xpProximo - prog.xp : 0;

  return (
    <>
      {/* Espaço para o conteúdo não ficar tapado */}
      <div className="h-36 lg:hidden" aria-hidden />

      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        {/* Estatísticas — mesmo design da barra do desktop */}
        <div className="flex items-center justify-center gap-5 px-4 py-3" style={{ backgroundColor: "#1d2218" }}>
          <FStat icon={<Target size={16} className="text-[#ebd4a4]" />} label="Acertos" value={acertos} />
          <Sep />
          <FStat icon={<Zap size={16} className="text-[#ebd4a4]" />} label="Tempo" value={tempo} />
          <Sep />
          <FStat icon={<Star size={16} className="text-[#ebd4a4]" />} label="Pontos" value={pontos} />
          <Sep />
          <FStat icon={<Close size={16} className="text-[#ebd4a4]" />} label="Erros" value={erros} />
        </div>

        {/* Header: logótipo · nível · histórico · configurações */}
        <nav className="flex items-center gap-2 border-t border-stone-200 bg-white px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 dark:border-stone-800 dark:bg-stone-900" aria-label="Navegação do quiz">
          {/* Logótipo → home (maior) */}
          <Link href="/" aria-label="Início — ReciboCerto" className="flex h-12 items-center justify-center rounded-xl px-1.5 text-brand transition-colors hover:bg-brand/10">
            <LogoMark size={36} />
          </Link>

          {/* Nível (abre modal de nível + perfil) */}
          <button type="button" onClick={() => setModal("nivel")} aria-label="Ver nível e perfil" className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800">
            <span className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center text-base font-bold text-white" style={{ background: "#1D9E75", clipPath: HEX }}>{nivel.nivel}</span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-[13px] font-bold text-stone-800 dark:text-stone-100">{nivel.titulo}</span>
              <span className="mt-1 block h-1.5 w-24 max-w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(100, xpPct)}%` }} />
              </span>
            </span>
          </button>

          {/* Histórico */}
          <button type="button" onClick={() => setModal("historico")} aria-haspopup="dialog" aria-label="Ver histórico" className={btnIcon}>
            <HistoryIcon size={24} />
          </button>

          {/* Configurações */}
          <button type="button" onClick={onConfiguracoes} aria-label="Configurações" className={btnIcon}>
            <Settings size={24} />
          </button>
        </nav>
      </div>

      {/* ── Modal de nível + perfil ── */}
      <AnimatePresence>
        {modal === "nivel" && (
          <ModalBase titulo="O teu nível" onClose={() => setModal(null)}>
            <div className="flex items-center gap-4">
              <span className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center font-display text-2xl font-bold text-white" style={{ background: "#1D9E75", clipPath: HEX }}>{nivel.nivel}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">{nivel.titulo}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{prog.xp.toLocaleString("pt-PT")} XP acumulados</p>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"><span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(100, xpPct)}%` }} /></span>
                <p className="mt-1 text-[11px] text-stone-400">{nivel.xpProximo != null ? `Faltam ${xpRestante.toLocaleString("pt-PT")} XP para o nível ${nivel.nivel + 1}` : "Nível máximo atingido"}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Indicador icon={<Fire size={15} />} label="Melhor streak" valor={String(prog.streakRecord)} />
              <Indicador icon={<Zap size={15} />} label="Energia" valor={`${prog.energiaRestante}/${prog.energiaTotal}`} />
            </div>

            <div className="mt-5 rounded-xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/40">
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400"><User size={12} /> Perfil</p>
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-white">{(user.email ?? "?").charAt(0).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{user.email ?? "A minha conta"}</p>
                    <p className="truncate text-xs text-stone-500 dark:text-stone-400">{prog.sessoes.length} {prog.sessoes.length === 1 ? "sessão" : "sessões"} · {prog.naNuvem ? "guardado na nuvem" : "só neste dispositivo"}</p>
                  </div>
                  <Link href="/dashboard/conta" onClick={() => setModal(null)} className="flex h-9 items-center gap-1 rounded-lg bg-white px-3 text-xs font-semibold text-stone-700 shadow-card dark:bg-stone-900 dark:text-stone-200">Conta <ChevronRight size={13} /></Link>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-stone-500 dark:text-stone-400">Entra para guardares o teu nível e histórico na nuvem.</p>
                  <button type="button" onClick={() => { setModal(null); abrirModal("entrar"); }} className="flex h-9 flex-shrink-0 items-center rounded-lg bg-brand px-3.5 text-xs font-bold text-white shadow-glow">Entrar</button>
                </div>
              )}
            </div>

            <p className="mb-2 mt-5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400"><Trophy size={12} /> Níveis</p>
            <ul className="space-y-1">
              {NIVEIS.map((n) => {
                const atual = n.nivel === nivel.nivel;
                const alcancado = prog.xp >= n.xpMinimo;
                return (
                  <li key={n.nivel} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${atual ? "bg-brand-light" : ""}`}>
                    <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center text-xs font-bold ${alcancado ? "text-white" : "text-stone-400"}`} style={{ background: alcancado ? "#1D9E75" : "transparent", border: alcancado ? "none" : "1.5px solid #d6d3d1", clipPath: HEX }}>{n.nivel}</span>
                    <span className={`flex-1 truncate text-sm ${atual ? "font-bold text-brand-dark dark:text-brand" : alcancado ? "font-medium text-stone-700 dark:text-stone-200" : "text-stone-400"}`}>{n.titulo}</span>
                    <span className="flex-shrink-0 text-[11px] tabular-nums text-stone-400">{n.xpMinimo.toLocaleString("pt-PT")} XP</span>
                  </li>
                );
              })}
            </ul>
          </ModalBase>
        )}
      </AnimatePresence>

      {/* ── Modal de histórico ── */}
      <AnimatePresence>
        {modal === "historico" && (
          <ModalBase titulo="Histórico de sessões" onClose={() => setModal(null)}>
            {prog.sessoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 py-10 text-center dark:border-stone-700">
                <Target size={28} className="mb-2 text-stone-300" />
                <p className="text-sm text-stone-500 dark:text-stone-400">Ainda não tens sessões.</p>
                <p className="text-xs text-stone-400">Termina um quiz para o veres aqui.</p>
              </div>
            ) : (
              <ul className="space-y-1.5">{prog.sessoes.map((s) => <SessaoRow key={s.id} s={s} />)}</ul>
            )}
          </ModalBase>
        )}
      </AnimatePresence>
    </>
  );
}

function Indicador({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 dark:border-stone-800 dark:bg-stone-800/40">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
        <p className="text-sm font-bold tabular-nums text-stone-800 dark:text-stone-100">{valor}</p>
      </div>
    </div>
  );
}

export function SessaoRow({ s }: { s: SessaoHistorico }) {
  const pct = s.totalPerguntas > 0 ? Math.round((s.acertos / s.totalPerguntas) * 100) : 0;
  const data = new Date(s.criadoEm).toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
  const cor = pct >= 70 ? "text-brand" : pct >= 40 ? "text-alert-text" : "text-clay-text";
  return (
    <li className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white px-3 py-2.5 dark:border-stone-800 dark:bg-stone-900">
      <span className={`flex h-9 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-stone-50 text-sm font-bold tabular-nums dark:bg-stone-800 ${cor}`}>{pct}%</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{s.acertos}/{s.totalPerguntas} certas · <span className="capitalize">{s.modo}</span></p>
        <p className="truncate text-[11px] text-stone-400">{data} · {s.pontos} pts · +{s.xpGanho} XP · streak {s.streakMaximo}</p>
      </div>
    </li>
  );
}

function ModalBase({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[95] lg:hidden" role="dialog" aria-modal="true" aria-label={titulo}>
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="absolute inset-0 bg-stone-900/50 backdrop-blur-md" onClick={onClose} aria-hidden />
      <m.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 330 }} className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-stone-200/80 bg-white shadow-float dark:border-stone-800 dark:bg-stone-900">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-stone-800">
          <p className="font-display text-base font-semibold text-stone-800 dark:text-stone-100">{titulo}</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"><Close size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
      </m.div>
    </div>
  );
}
