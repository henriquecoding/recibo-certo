"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import {
  Bank, Receipt, Calculator, ShieldCheck, Coin, User, Briefcase, Globe, FileSign,
  Wallet, Calendar, Clock, Building, Scale, Flag, BookOpen, Search, Filter,
  LayoutGrid, ChevronRight, Check, Star, ArrowRight,
} from "@/components/ui/Icons";

// ─────────────────────────────────────────────────────────────────────────
//  Índice de Guias — protagonista: herói, pesquisa, filtros por categoria,
//  ordenação, vista lista/grelha e marcadores (localStorage). Os dados (tempo
//  de leitura, descrições) descrevem guias reais; nada é inventado.
// ─────────────────────────────────────────────────────────────────────────

type IconType = React.ComponentType<{ size?: number; className?: string }>;
type Categoria = "Independentes" | "Conta de outrem" | "Empresas" | "Transversal";

type Guia = {
  href: string;
  titulo: string;
  descricao: string;
  tempo: number;
  categoria: Categoria;
  icon: IconType;
};

const GUIAS: Guia[] = [
  { href: "/guias/abrir-atividade", titulo: "Como abrir atividade nas Finanças", descricao: "Passo a passo para abrir atividade como trabalhador independente.", tempo: 5, categoria: "Independentes", icon: Bank },
  { href: "/guias/ato-isolado", titulo: "Ato isolado ou recibos verdes?", descricao: "Descobre quando usar ato isolado e quando emitir recibos verdes.", tempo: 4, categoria: "Independentes", icon: Scale },
  { href: "/guias/regime-simplificado", titulo: "Regime simplificado e coeficientes", descricao: "Entende os coeficientes e o que realmente pagas em IRS.", tempo: 6, categoria: "Independentes", icon: Calculator },
  { href: "/guias/despesas-dedutiveis", titulo: "Despesas dedutíveis e a regra dos 15%", descricao: "Que despesas contam no regime simplificado — e quanto tens de justificar.", tempo: 6, categoria: "Independentes", icon: Coin },
  { href: "/guias/contabilidade-organizada", titulo: "Simplificado vs. contabilidade organizada", descricao: "Quando compensa passar ao lucro real e o que muda.", tempo: 6, categoria: "Independentes", icon: Scale },
  { href: "/guias/retencao-na-fonte", titulo: "Retenção na fonte", descricao: "Saiba quando é aplicada e como funciona a retenção na fonte.", tempo: 4, categoria: "Independentes", icon: ShieldCheck },
  { href: "/guias/pagamentos-por-conta", titulo: "Pagamentos por conta do IRS", descricao: "Os adiantamentos de IRS da categoria B: prazos e cálculo.", tempo: 4, categoria: "Independentes", icon: Calculator },
  { href: "/guias/iva-recibos-verdes", titulo: "IVA nos recibos verdes", descricao: "A isenção de 15 000 € e quando deves liquidar IVA.", tempo: 5, categoria: "Independentes", icon: Coin },
  { href: "/guias/seguranca-social", titulo: "Segurança Social", descricao: "Como funcionam as contribuições, a fórmula e as isenções.", tempo: 5, categoria: "Independentes", icon: User },
  { href: "/guias/acumulacao-emprego", titulo: "Acumulação com emprego", descricao: "Tens emprego e passas recibos verdes? Sabe o que muda.", tempo: 4, categoria: "Independentes", icon: Briefcase },
  { href: "/guias/clientes-estrangeiros", titulo: "Clientes estrangeiros", descricao: "IVA e retenção quando faturas para fora de Portugal.", tempo: 5, categoria: "Independentes", icon: Globe },
  { href: "/guias/cessar-atividade", titulo: "Cessar atividade", descricao: "Como fechar atividade e o que acontece se não fechares.", tempo: 3, categoria: "Independentes", icon: FileSign },
  { href: "/guias/fatura-vs-recibo", titulo: "Fatura, recibo e fatura-recibo", descricao: "As diferenças e onde entram os recibos verdes.", tempo: 4, categoria: "Independentes", icon: Receipt },
  { href: "/guias/merchant-of-record", titulo: "Merchant of Record (MoR)", descricao: "Paddle, Lemon Squeezy e como emitir 1 recibo por mês.", tempo: 6, categoria: "Independentes", icon: Wallet },
  { href: "/guias/recibo-vencimento", titulo: "Como ler o recibo de vencimento", descricao: "Bruto, Segurança Social, IRS e líquido explicados linha a linha.", tempo: 5, categoria: "Conta de outrem", icon: Receipt },
  { href: "/guias/subsidios-ferias-natal", titulo: "Subsídio de férias e de Natal", descricao: "Cálculo, descontos e o que muda com os duodécimos.", tempo: 5, categoria: "Conta de outrem", icon: Calendar },
  { href: "/guias/trabalho-suplementar", titulo: "Trabalho suplementar (horas extra)", descricao: "Acréscimos, retenção autónoma e limites legais.", tempo: 5, categoria: "Conta de outrem", icon: Clock },
  { href: "/guias/abrir-empresa", titulo: "Como abrir uma empresa", descricao: "Formas jurídicas, Empresa na Hora e custos reais.", tempo: 7, categoria: "Empresas", icon: Building },
  { href: "/guias/unipessoal-vs-eni", titulo: "Empresa (unipessoal) vs. recibos verdes", descricao: "IRC ou IRS, responsabilidade e custos — qual a estrutura certa.", tempo: 7, categoria: "Empresas", icon: Building },
  { href: "/guias/irc", titulo: "IRC para PME", descricao: "Taxas, derrama e pagamentos por conta sem complicação.", tempo: 7, categoria: "Empresas", icon: Calculator },
  { href: "/guias/tributacao-autonoma", titulo: "Tributação autónoma", descricao: "Viaturas, despesas de representação e agravamento.", tempo: 7, categoria: "Empresas", icon: Scale },
  { href: "/guias/calendario-fiscal", titulo: "Calendário fiscal 2026", descricao: "Todos os prazos de IRS, IVA, Segurança Social e IRC num só sítio.", tempo: 5, categoria: "Transversal", icon: Calendar },
  { href: "/guias/escaloes-irs", titulo: "Escalões de IRS 2026", descricao: "A tabela e os mitos sobre subir de escalão.", tempo: 5, categoria: "Transversal", icon: Calculator },
  { href: "/guias/irs-jovem", titulo: "IRS Jovem 2026", descricao: "Isenção por ano, condições e como pedir.", tempo: 4, categoria: "Transversal", icon: Flag },
  { href: "/guias/ifici-nhr", titulo: "IFICI (NHR 2.0): taxa de 20%", descricao: "O sucessor do Residente Não Habitual — condições e duração.", tempo: 5, categoria: "Transversal", icon: Flag },
  { href: "/guias/deducoes-coleta", titulo: "Deduções à coleta", descricao: "Saúde, educação e despesas gerais no teu IRS.", tempo: 5, categoria: "Transversal", icon: Calculator },
  { href: "/guias/mais-valias", titulo: "Mais-valias: ações, cripto e imóveis", descricao: "Taxas, isenções e englobamento na categoria G.", tempo: 6, categoria: "Transversal", icon: Coin },
  { href: "/guias/tributacao-conjunta", titulo: "Tributação conjunta vs. separada", descricao: "O quociente conjugal e quando cada opção compensa.", tempo: 5, categoria: "Transversal", icon: User },
  { href: "/guias/reembolso-irs", titulo: "Reembolso de IRS: prazos e como acelerar", descricao: "Quando recebes e o que evita atrasos no reembolso.", tempo: 4, categoria: "Transversal", icon: Wallet },
];

const CATEGORIAS: Array<"Todos" | Categoria> = ["Todos", "Independentes", "Conta de outrem", "Empresas", "Transversal"];

const FEATURES: Array<{ icon: IconType; titulo: string; sub: string }> = [
  { icon: BookOpen, titulo: "Conteúdo verificado", sub: "Dados atualizados e base legal." },
  { icon: Check, titulo: "Simples e prático", sub: "Explicações claras e diretas." },
  { icon: Scale, titulo: "100% Portugal", sub: "Leis e regras fiscais portuguesas." },
  { icon: Clock, titulo: "Sempre atualizado", sub: "Acompanhamos as mudanças por ti." },
];

const FAVORITOS_KEY = "recibocerto:guias:favoritos";
type Ordem = "relevancia" | "alfabetica" | "tempo";

export default function GuiasIndex() {
  const [categoria, setCategoria] = useState<"Todos" | Categoria>("Todos");
  const [pesquisa, setPesquisa] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("relevancia");
  const [vista, setVista] = useState<"lista" | "grelha">("lista");
  const [favoritos, setFavoritos] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITOS_KEY);
      if (raw) setFavoritos(JSON.parse(raw));
    } catch { /* ignora */ }
  }, []);

  const alternarFavorito = (href: string) => {
    setFavoritos((prev) => {
      const next = prev.includes(href) ? prev.filter((x) => x !== href) : [...prev, href];
      try { localStorage.setItem(FAVORITOS_KEY, JSON.stringify(next)); } catch { /* ignora */ }
      return next;
    });
  };

  const filtrados = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    let lista = GUIAS.filter((g) => {
      const okCat = categoria === "Todos" || g.categoria === categoria;
      const okQ = q === "" || g.titulo.toLowerCase().includes(q) || g.descricao.toLowerCase().includes(q);
      return okCat && okQ;
    });
    if (ordem === "alfabetica") lista = [...lista].sort((a, b) => a.titulo.localeCompare(b.titulo, "pt"));
    else if (ordem === "tempo") lista = [...lista].sort((a, b) => a.tempo - b.tempo);
    return lista;
  }, [categoria, pesquisa, ordem]);

  const contagemPorCat = (c: "Todos" | Categoria) =>
    c === "Todos" ? GUIAS.length : GUIAS.filter((g) => g.categoria === c).length;

  return (
    <div>
      {/* ── Herói ──────────────────────────────────────────────────────────── */}
      <m.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-10 overflow-hidden rounded-4xl border border-stone-200/70 bg-white shadow-card dark:border-stone-700 dark:bg-stone-900"
      >
        <div className="grid items-stretch gap-0 lg:grid-cols-[1.3fr_1fr]">
          {/* Texto */}
          <div className="p-7 sm:p-9">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-cream dark:border-stone-700 dark:bg-stone-800">
                <BookOpen size={13} className="text-brand" />
              </span>
              <span className="text-brand">Recursos fiscais</span>
              <span aria-hidden>·</span>
              <span>Portugal</span>
            </div>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl">
              Guias fiscais e laborais para <span className="text-brand">2026</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-500 dark:text-stone-400">
              Para trabalhadores independentes, por conta de outrem e empresas. Sem jargão, com dados
              verificados e base legal.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.titulo}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15">
                      <Icon size={18} />
                    </span>
                    <p className="mt-2.5 text-xs font-semibold text-stone-700 dark:text-stone-200">{f.titulo}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-stone-400">{f.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Painel: Rio Douro e Ponte D. Luís I, Porto (fotografia real, Pexels) */}
          <div className="relative hidden min-h-[280px] overflow-hidden lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/guias-douro.jpg"
              alt="Ponte Dom Luís I sobre o Rio Douro, no Porto"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-deep/75 via-brand-dark/25 to-transparent" />
            <span className="absolute right-6 top-6 rounded-full bg-black/25 px-2.5 py-1 text-sm font-semibold tracking-widest text-white backdrop-blur-sm">2026</span>
            <span className="absolute bottom-4 left-6 text-[11px] font-medium tracking-wide text-white/85">Porto · Rio Douro</span>
          </div>
        </div>
      </m.section>

      {/* ── Controlo ───────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow text-brand">Guias</div>
          <p className="mt-0.5 text-sm text-stone-400">{filtrados.length} de {GUIAS.length} guias</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pesquisa */}
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar guias…"
              aria-label="Pesquisar guias"
              className="w-44 rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-700 transition-all focus:w-56 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 sm:w-56 sm:focus:w-64"
            />
          </div>
          {/* Ordenação */}
          <div className="relative hidden sm:block">
            <Filter size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as Ordem)}
              aria-label="Ordenar guias"
              className="appearance-none rounded-xl border border-stone-200 bg-white py-2 pl-8 pr-8 text-sm text-stone-600 transition-colors focus:border-brand focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            >
              <option value="relevancia">Mais relevantes</option>
              <option value="alfabetica">Ordem alfabética</option>
              <option value="tempo">Leitura mais curta</option>
            </select>
            <ChevronRight size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-stone-400" />
          </div>
          {/* Vista */}
          <div className="hidden items-center gap-0.5 rounded-xl border border-stone-200 bg-white p-0.5 dark:border-stone-700 dark:bg-stone-900 sm:flex">
            <button
              type="button"
              onClick={() => setVista("lista")}
              aria-pressed={vista === "lista"}
              aria-label="Vista de lista"
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${vista === "lista" ? "bg-brand text-white" : "text-stone-400 hover:text-stone-600"}`}
            >
              <Filter size={14} className="rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => setVista("grelha")}
              aria-pressed={vista === "grelha"}
              aria-label="Vista de grelha"
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${vista === "grelha" ? "bg-brand text-white" : "text-stone-400 hover:text-stone-600"}`}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Separadores de categoria ───────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap gap-2">
        {CATEGORIAS.map((c) => {
          const active = categoria === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategoria(c)}
              aria-pressed={active}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand text-white shadow-card"
                  : "border border-stone-200 bg-white text-stone-600 hover:border-brand/40 hover:text-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
              }`}
            >
              {c} <span className={active ? "text-white/70" : "text-stone-400"}>· {contagemPorCat(c)}</span>
            </button>
          );
        })}
      </div>

      {/* ── Lista / grelha ─────────────────────────────────────────────────── */}
      {filtrados.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50 px-6 py-14 text-center dark:border-stone-700 dark:bg-stone-900/40">
          <Search size={22} className="mx-auto mb-2 text-stone-300" />
          <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Sem guias para «{pesquisa}»</p>
          <button type="button" onClick={() => { setPesquisa(""); setCategoria("Todos"); }} className="mt-2 text-sm font-semibold text-brand hover:underline">
            Limpar filtros
          </button>
        </div>
      ) : vista === "grelha" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtrados.map((g) => (
            <CartaoGuia key={g.href} g={g} favorito={favoritos.includes(g.href)} onFav={() => alternarFavorito(g.href)} grelha />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-stone-200/70 bg-white dark:border-stone-700 dark:bg-stone-900">
          {filtrados.map((g, i) => (
            <div key={g.href} className={i > 0 ? "border-t border-stone-100 dark:border-stone-800" : ""}>
              <CartaoGuia g={g} favorito={favoritos.includes(g.href)} onFav={() => alternarFavorito(g.href)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CartaoGuia({ g, favorito, onFav, grelha = false }: { g: Guia; favorito: boolean; onFav: () => void; grelha?: boolean }) {
  const Icon = g.icon;
  return (
    <div
      className={`group relative flex items-center gap-4 transition-colors ${
        grelha
          ? "rounded-2xl border border-stone-200/70 bg-white p-4 hover:border-brand/40 hover:shadow-lift dark:border-stone-700 dark:bg-stone-900"
          : "px-4 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/40 sm:px-5"
      }`}
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand-light group-hover:text-brand-dark dark:bg-stone-800 dark:text-stone-400">
        <Icon size={18} />
      </span>

      <Link href={g.href} className="min-w-0 flex-1 after:absolute after:inset-0 after:content-['']">
        <p className="truncate text-sm font-semibold text-stone-800 group-hover:text-brand dark:text-stone-100">{g.titulo}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-stone-500 dark:text-stone-400">{g.descricao}</p>
      </Link>

      <div className="relative z-10 flex flex-shrink-0 items-center gap-2.5">
        <span className="hidden rounded-lg bg-brand-light/70 px-2 py-0.5 text-[10px] font-semibold text-brand-dark dark:bg-brand/15 dark:text-brand sm:inline">
          {g.categoria}
        </span>
        <span className="hidden items-center gap-1 text-[11px] text-stone-400 sm:flex">
          <Clock size={12} /> {g.tempo} min
        </span>
        <button
          type="button"
          onClick={onFav}
          aria-pressed={favorito}
          aria-label={favorito ? "Remover dos marcadores" : "Guardar nos marcadores"}
          className={`rounded-lg p-1.5 transition-colors ${favorito ? "text-brand" : "text-stone-300 hover:text-stone-500 dark:text-stone-600"}`}
        >
          <Star size={15} />
        </button>
        <ArrowRight size={15} className="text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand" />
      </div>
    </div>
  );
}

