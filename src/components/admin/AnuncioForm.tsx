"use client";

import { useState, useCallback } from "react";
import type { AnuncioRow, AnuncioInput, TipoAnuncio } from "@/lib/supabase/admin";
import {
  Bank, Building, FileSign, Heart, Invoice, Laptop, ShoppingBag, Briefcase,
  Monitor, Smartphone, Eye, GoogleAds, ImageIcon, Link, Check, Warning,
  Megaphone, ChevronDown,
} from "@/components/ui/Icons";

// ── Constantes ────────────────────────────────────────────────

const TIPOS: { id: TipoAnuncio; label: string; desc: string }[] = [
  { id: "parceiro", label: "Parceiro nativo", desc: "Card integrado no dashboard com nome, descrição e CTA" },
  { id: "google_ads", label: "Google Ads", desc: "Unidade de anúncio do Google AdSense com ID e slot" },
  { id: "banner", label: "Banner personalizado", desc: "Banner com imagem, texto e cores configuráveis" },
  { id: "nativo", label: "Anúncio nativo", desc: "Anúncio com aparência de conteúdo orgânico" },
];

const POSICOES = [
  { id: "dashboard", label: "Dashboard", desc: "Página principal do painel" },
  { id: "receitas", label: "Receitas", desc: "Página de receitas" },
  { id: "recibos", label: "Recibos", desc: "Página de recibos" },
  { id: "prazos", label: "Prazos", desc: "Calendário de prazos fiscais" },
  { id: "simulador", label: "Simulador", desc: "Simulador de IRS" },
  { id: "comparador", label: "Comparador", desc: "Comparador de regimes" },
  { id: "landing_hero", label: "Landing — Hero", desc: "Topo da página pública" },
  { id: "landing_pricing", label: "Landing — Preços", desc: "Secção de planos" },
];

const ICONES = [
  { id: "bank", label: "Banco", Icon: Bank },
  { id: "building", label: "Empresa", Icon: Building },
  { id: "file-sign", label: "Documento", Icon: FileSign },
  { id: "heart", label: "Saúde", Icon: Heart },
  { id: "invoice", label: "Fatura", Icon: Invoice },
  { id: "laptop", label: "Tech", Icon: Laptop },
  { id: "shopping-bag", label: "Compras", Icon: ShoppingBag },
  { id: "briefcase", label: "Trabalho", Icon: Briefcase },
];

const GOOGLE_FORMATS = [
  { id: "auto", label: "Automático (recomendado)" },
  { id: "rectangle", label: "Retângulo (300×250)" },
  { id: "banner", label: "Banner horizontal (728×90)" },
  { id: "leaderboard", label: "Leaderboard (970×90)" },
];

// ── Defaults ─────────────────────────────────────────────────

function defaultAnuncio(tipo: TipoAnuncio): Partial<AnuncioInput> {
  const base = {
    tipo,
    ativo: true,
    ordem: 0,
    posicoes: [],
    mostrar_desktop: true,
    mostrar_mobile: true,
    descricao: "",
    url: null,
    cta: null,
    icone: null,
    logo_url: null,
    google_client_id: null,
    google_slot_id: null,
    google_format: "auto",
    google_responsive: true,
    banner_titulo: null,
    banner_texto: null,
    banner_url: null,
    banner_cor_fundo: "#f5f5f4",
    banner_cor_texto: "#292524",
    banner_imagem_url: null,
  };
  if (tipo === "parceiro") return { ...base, cta: "Saber mais", icone: "bank" };
  if (tipo === "google_ads") return { ...base, google_format: "auto", google_responsive: true };
  if (tipo === "banner") return { ...base, banner_cor_fundo: "#f5f5f4", banner_cor_texto: "#292524" };
  return base;
}

// ── Componente Preview ────────────────────────────────────────

function PartnerPreview({ a }: { a: Partial<AnuncioInput> }) {
  const IconComp = ICONES.find((i) => i.id === a.icone)?.Icon ?? Bank;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
          <IconComp size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
            {a.nome || "Nome do parceiro"}
          </p>
          <p className="mt-0.5 text-xs text-stone-400">Parceiro</p>
        </div>
      </div>
      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        {a.descricao || "Descrição do parceiro aparece aqui com até duas linhas de texto."}
      </p>
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
      >
        {a.cta || "Saber mais"}
      </a>
    </div>
  );
}

function GoogleAdsPreview({ a }: { a: Partial<AnuncioInput> }) {
  const fmt = a.google_format ?? "auto";
  const dims: Record<string, string> = {
    auto: "w-full h-24",
    rectangle: "w-[180px] h-[120px]",
    banner: "w-full h-16",
    leaderboard: "w-full h-14",
  };
  return (
    <div className="overflow-hidden rounded-xl border border-dashed border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800/50">
      <div className="flex items-center justify-between border-b border-stone-200 px-3 py-1.5 dark:border-stone-700">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-stone-400">
          <GoogleAds size={12} />
          Anúncio Google Ads
        </div>
        {a.google_client_id && (
          <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[9px] text-stone-400 dark:bg-stone-700">
            {a.google_client_id}
          </span>
        )}
      </div>
      <div className={`flex items-center justify-center ${dims[fmt] ?? dims.auto} p-4`}>
        <div className="text-center">
          <GoogleAds size={24} className="mx-auto mb-1 text-stone-300" />
          <p className="text-[10px] text-stone-400">
            {GOOGLE_FORMATS.find((f) => f.id === fmt)?.label ?? "Formato automático"}
          </p>
          {a.google_slot_id && (
            <p className="mt-0.5 font-mono text-[9px] text-stone-300">slot: {a.google_slot_id}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function BannerPreview({ a }: { a: Partial<AnuncioInput> }) {
  const bg = a.banner_cor_fundo || "#f5f5f4";
  const fg = a.banner_cor_texto || "#292524";
  return (
    <div
      className="overflow-hidden rounded-2xl p-5"
      style={{ backgroundColor: bg, color: fg }}
    >
      {a.banner_imagem_url && (
        <div className="mb-3 h-24 w-full overflow-hidden rounded-xl bg-stone-200">
          <img
            src={a.banner_imagem_url}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      <p className="mb-1 text-base font-bold leading-snug" style={{ color: fg }}>
        {a.banner_titulo || "Título do banner"}
      </p>
      <p className="mb-3 text-sm leading-relaxed opacity-80">
        {a.banner_texto || "Texto descritivo do banner aparece aqui."}
      </p>
      {a.banner_url && (
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: fg, color: bg }}
        >
          {a.cta || "Saber mais"}
        </a>
      )}
    </div>
  );
}

function NativoPreview({ a }: { a: Partial<AnuncioInput> }) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-stone-400 dark:bg-stone-700">
          Patrocinado
        </span>
      </div>
      <p className="mb-1 text-sm font-semibold text-stone-800 dark:text-stone-100">
        {a.nome || "Título do anúncio nativo"}
      </p>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        {a.descricao || "Descrição curta do conteúdo patrocinado."}
      </p>
      {a.url && (
        <p className="mt-2 text-[10px] text-stone-300">{a.url}</p>
      )}
    </div>
  );
}

function AdPreview({ anuncio, device }: { anuncio: Partial<AnuncioInput>; device: "desktop" | "mobile" }) {
  const label = POSICOES.find((p) => (anuncio.posicoes ?? []).includes(p.id))?.label ?? "Dashboard";

  return (
    <div className={`${device === "mobile" ? "mx-auto max-w-[375px]" : "w-full"}`}>
      {/* Wireframe da página */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900">
        {/* Header da página simulado */}
        <div className="border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-800">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-md bg-brand" />
            <div className="h-2 w-20 rounded bg-stone-200 dark:bg-stone-600" />
            <div className="ml-auto h-2 w-12 rounded bg-stone-100 dark:bg-stone-700" />
          </div>
        </div>
        <div className="p-4">
          {/* Título da página */}
          <div className="mb-1 h-3 w-32 rounded bg-stone-300 dark:bg-stone-600" />
          <div className="mb-4 h-2 w-20 rounded bg-stone-200 dark:bg-stone-700" />
          {/* Cards de conteúdo simulados */}
          <div className={`grid gap-3 ${device === "desktop" ? "grid-cols-3" : "grid-cols-1"} mb-4`}>
            {[1, 2, 3].slice(0, device === "desktop" ? 3 : 2).map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white shadow-sm dark:bg-stone-800">
                <div className="p-3">
                  <div className="mb-1.5 h-2 w-12 rounded bg-stone-200 dark:bg-stone-600" />
                  <div className="h-4 w-16 rounded bg-stone-100 dark:bg-stone-700" />
                </div>
              </div>
            ))}
          </div>
          {/* Posição do anúncio */}
          <div className="mb-2">
            <div className="mb-1.5 flex items-center gap-1.5">
              <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
              <span className="text-[9px] font-medium text-stone-400">
                Anúncio em &quot;{label}&quot;
              </span>
              <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
            </div>
            <div className="scale-90 origin-top">
              {anuncio.tipo === "parceiro" && <PartnerPreview a={anuncio} />}
              {anuncio.tipo === "google_ads" && <GoogleAdsPreview a={anuncio} />}
              {anuncio.tipo === "banner" && <BannerPreview a={anuncio} />}
              {anuncio.tipo === "nativo" && <NativoPreview a={anuncio} />}
            </div>
          </div>
          {/* Resto da página */}
          <div className="space-y-2">
            <div className="h-2 w-full rounded bg-stone-200 dark:bg-stone-700" />
            <div className="h-2 w-4/5 rounded bg-stone-100 dark:bg-stone-800" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Formulários por tipo ──────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-300">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-600";

function FormParceiro({
  data,
  onChange,
}: {
  data: Partial<AnuncioInput>;
  onChange: (patch: Partial<AnuncioInput>) => void;
}) {
  return (
    <div className="space-y-4">
      <FieldGroup label="URL de destino *">
        <input
          type="url"
          placeholder="https://parceiro.exemplo.pt/ref"
          value={data.url ?? ""}
          onChange={(e) => onChange({ url: e.target.value })}
          className={inputCls}
        />
      </FieldGroup>
      <FieldGroup label="Texto do botão (CTA) *">
        <input
          type="text"
          placeholder="ex: Saber mais"
          value={data.cta ?? ""}
          onChange={(e) => onChange({ cta: e.target.value })}
          className={inputCls}
        />
      </FieldGroup>
      <FieldGroup label="Ícone">
        <div className="grid grid-cols-4 gap-2">
          {ICONES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ icone: id })}
              title={label}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-[10px] font-medium transition-all ${
                data.icone === id
                  ? "border-brand bg-brand-light text-brand"
                  : "border-stone-200 bg-white text-stone-500 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-stone-500"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}

function FormGoogleAds({
  data,
  onChange,
}: {
  data: Partial<AnuncioInput>;
  onChange: (patch: Partial<AnuncioInput>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-900/20">
        <div className="flex gap-2">
          <Warning size={14} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            O script do AdSense deve estar instalado globalmente no site. Aqui configura apenas as unidades de anúncio individuais.
          </p>
        </div>
      </div>
      <FieldGroup label="Publisher ID (ca-pub-XXXXXXXX) *">
        <input
          type="text"
          placeholder="ca-pub-1234567890123456"
          value={data.google_client_id ?? ""}
          onChange={(e) => onChange({ google_client_id: e.target.value })}
          className={inputCls}
        />
      </FieldGroup>
      <FieldGroup label="Slot ID *">
        <input
          type="text"
          placeholder="1234567890"
          value={data.google_slot_id ?? ""}
          onChange={(e) => onChange({ google_slot_id: e.target.value })}
          className={inputCls}
        />
      </FieldGroup>
      <FieldGroup label="Formato">
        <div className="grid grid-cols-2 gap-2">
          {GOOGLE_FORMATS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ google_format: id })}
              className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all ${
                (data.google_format ?? "auto") === id
                  ? "border-brand bg-brand-light text-brand"
                  : "border-stone-200 bg-white text-stone-500 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label="Responsivo">
        <label className="flex cursor-pointer items-center gap-3">
          <div
            onClick={() => onChange({ google_responsive: !(data.google_responsive ?? true) })}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              (data.google_responsive ?? true) ? "bg-brand" : "bg-stone-200 dark:bg-stone-700"
            }`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                (data.google_responsive ?? true) ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
          <span className="text-sm text-stone-600 dark:text-stone-300">
            Dimensões responsivas (recomendado)
          </span>
        </label>
      </FieldGroup>
    </div>
  );
}

function FormBanner({
  data,
  onChange,
}: {
  data: Partial<AnuncioInput>;
  onChange: (patch: Partial<AnuncioInput>) => void;
}) {
  return (
    <div className="space-y-4">
      <FieldGroup label="Título do banner *">
        <input
          type="text"
          placeholder="Título chamativo"
          value={data.banner_titulo ?? ""}
          onChange={(e) => onChange({ banner_titulo: e.target.value })}
          className={inputCls}
        />
      </FieldGroup>
      <FieldGroup label="Texto descritivo">
        <textarea
          placeholder="Texto do banner..."
          rows={2}
          value={data.banner_texto ?? ""}
          onChange={(e) => onChange({ banner_texto: e.target.value })}
          className={`${inputCls} resize-none`}
        />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="URL de destino">
          <input
            type="url"
            placeholder="https://..."
            value={data.banner_url ?? ""}
            onChange={(e) => onChange({ banner_url: e.target.value })}
            className={inputCls}
          />
        </FieldGroup>
        <FieldGroup label="Texto do botão (CTA)">
          <input
            type="text"
            placeholder="ex: Ver mais"
            value={data.cta ?? ""}
            onChange={(e) => onChange({ cta: e.target.value })}
            className={inputCls}
          />
        </FieldGroup>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="Cor de fundo">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={data.banner_cor_fundo ?? "#f5f5f4"}
              onChange={(e) => onChange({ banner_cor_fundo: e.target.value })}
              className="h-10 w-10 cursor-pointer rounded-lg border border-stone-200 bg-white p-0.5 dark:border-stone-700"
            />
            <input
              type="text"
              value={data.banner_cor_fundo ?? "#f5f5f4"}
              onChange={(e) => onChange({ banner_cor_fundo: e.target.value })}
              className={`${inputCls} flex-1 font-mono text-xs`}
            />
          </div>
        </FieldGroup>
        <FieldGroup label="Cor do texto">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={data.banner_cor_texto ?? "#292524"}
              onChange={(e) => onChange({ banner_cor_texto: e.target.value })}
              className="h-10 w-10 cursor-pointer rounded-lg border border-stone-200 bg-white p-0.5 dark:border-stone-700"
            />
            <input
              type="text"
              value={data.banner_cor_texto ?? "#292524"}
              onChange={(e) => onChange({ banner_cor_texto: e.target.value })}
              className={`${inputCls} flex-1 font-mono text-xs`}
            />
          </div>
        </FieldGroup>
      </div>
      <FieldGroup label="URL da imagem (opcional)">
        <input
          type="url"
          placeholder="https://cdn.exemplo.pt/imagem.jpg"
          value={data.banner_imagem_url ?? ""}
          onChange={(e) => onChange({ banner_imagem_url: e.target.value })}
          className={inputCls}
        />
        <p className="mt-1 text-[11px] text-stone-400">
          Imagem de topo opcional. Dimensão recomendada: 800×200px.
        </p>
      </FieldGroup>
    </div>
  );
}

function FormNativo({
  data,
  onChange,
}: {
  data: Partial<AnuncioInput>;
  onChange: (patch: Partial<AnuncioInput>) => void;
}) {
  return (
    <div className="space-y-4">
      <FieldGroup label="URL de destino *">
        <input
          type="url"
          placeholder="https://..."
          value={data.url ?? ""}
          onChange={(e) => onChange({ url: e.target.value })}
          className={inputCls}
        />
      </FieldGroup>
      <FieldGroup label="URL do logótipo (opcional)">
        <input
          type="url"
          placeholder="https://cdn.exemplo.pt/logo.svg"
          value={data.logo_url ?? ""}
          onChange={(e) => onChange({ logo_url: e.target.value })}
          className={inputCls}
        />
      </FieldGroup>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

interface AnuncioFormProps {
  inicial?: AnuncioRow;
  modoEdicao?: boolean;
  onGravar: (data: AnuncioInput) => Promise<string | undefined>;
}

export default function AnuncioForm({ inicial, modoEdicao = false, onGravar }: AnuncioFormProps) {
  const [tipo, setTipo] = useState<TipoAnuncio>(inicial?.tipo ?? "parceiro");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tipoAberto, setTipoAberto] = useState(!modoEdicao && !inicial);

  const [form, setForm] = useState<Partial<AnuncioInput>>(() => {
    if (inicial) return { ...inicial };
    return {
      tipo,
      nome: "",
      descricao: "",
      ativo: true,
      ordem: 0,
      posicoes: [],
      mostrar_desktop: true,
      mostrar_mobile: true,
      ...defaultAnuncio(tipo),
    };
  });

  const patch = useCallback((p: Partial<AnuncioInput>) => {
    setForm((prev) => ({ ...prev, ...p }));
  }, []);

  function handleTipoChange(t: TipoAnuncio) {
    setTipo(t);
    setForm((prev) => ({
      ...prev,
      tipo: t,
      ...defaultAnuncio(t),
    }));
    setTipoAberto(false);
  }

  function togglePosicao(id: string) {
    patch({
      posicoes: (form.posicoes ?? []).includes(id)
        ? (form.posicoes ?? []).filter((p) => p !== id)
        : [...(form.posicoes ?? []), id],
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!form.id?.trim()) return setErro("O identificador é obrigatório.");
    if (!form.nome?.trim()) return setErro("O nome é obrigatório.");
    if ((form.posicoes ?? []).length === 0) return setErro("Seleciona pelo menos uma posição no site.");

    if (tipo === "parceiro" && !form.url?.trim()) return setErro("O URL de destino é obrigatório.");
    if (tipo === "google_ads" && !form.google_client_id?.trim()) return setErro("O Publisher ID é obrigatório.");
    if (tipo === "google_ads" && !form.google_slot_id?.trim()) return setErro("O Slot ID é obrigatório.");
    if (tipo === "banner" && !form.banner_titulo?.trim()) return setErro("O título do banner é obrigatório.");
    if (tipo === "nativo" && !form.url?.trim()) return setErro("O URL de destino é obrigatório.");

    setGravando(true);
    const e2 = await onGravar(form as AnuncioInput);
    if (e2) setErro(e2);
    setGravando(false);
  }

  const tipoInfo = TIPOS.find((t) => t.id === tipo)!;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* ── Coluna esquerda: Formulário ── */}
      <div className="min-w-0 flex-1 space-y-6">

        {/* Tipo de anúncio */}
        <div className="rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800/50">
          <button
            type="button"
            onClick={() => !modoEdicao && setTipoAberto((v) => !v)}
            className={`flex w-full items-center gap-3 p-4 text-left ${modoEdicao ? "cursor-default" : "cursor-pointer"}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light text-brand">
              <Megaphone size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{tipoInfo.label}</p>
              <p className="text-xs text-stone-400">{tipoInfo.desc}</p>
            </div>
            {!modoEdicao && (
              <ChevronDown size={16} className={`text-stone-400 transition-transform ${tipoAberto ? "rotate-180" : ""}`} />
            )}
          </button>

          {tipoAberto && (
            <div className="border-t border-stone-100 p-3 dark:border-stone-700">
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTipoChange(t.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      tipo === t.id
                        ? "border-brand bg-brand-light"
                        : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-stone-500"
                    }`}
                  >
                    <p className={`text-xs font-semibold ${tipo === t.id ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>
                      {t.label}
                    </p>
                    <p className="mt-0.5 text-[10px] text-stone-400">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Campos base */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800/50">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Configuração base
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Identificador único *">
                <input
                  type="text"
                  placeholder="ex: meu-parceiro"
                  value={form.id ?? ""}
                  disabled={modoEdicao}
                  onChange={(e) =>
                    patch({ id: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })
                  }
                  className={`${inputCls} ${modoEdicao ? "cursor-not-allowed opacity-50" : ""}`}
                />
              </FieldGroup>
              <FieldGroup label="Ordem de exibição">
                <input
                  type="number"
                  min={0}
                  value={form.ordem ?? 0}
                  onChange={(e) => patch({ ordem: Number(e.target.value) })}
                  className={inputCls}
                />
              </FieldGroup>
            </div>
            <FieldGroup label="Nome / título *">
              <input
                type="text"
                placeholder="Nome do anúncio"
                value={form.nome ?? ""}
                onChange={(e) => patch({ nome: e.target.value })}
                className={inputCls}
              />
            </FieldGroup>
            <FieldGroup label="Descrição">
              <textarea
                placeholder="Descrição curta visível no anúncio..."
                rows={2}
                value={form.descricao ?? ""}
                onChange={(e) => patch({ descricao: e.target.value })}
                className={`${inputCls} resize-none`}
              />
            </FieldGroup>
          </div>
        </div>

        {/* Campos específicos por tipo */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800/50">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
            {tipo === "parceiro" && "Configuração do parceiro"}
            {tipo === "google_ads" && "Configuração do Google Ads"}
            {tipo === "banner" && "Configuração do banner"}
            {tipo === "nativo" && "Configuração do anúncio nativo"}
          </h3>
          {tipo === "parceiro" && <FormParceiro data={form} onChange={patch} />}
          {tipo === "google_ads" && <FormGoogleAds data={form} onChange={patch} />}
          {tipo === "banner" && <FormBanner data={form} onChange={patch} />}
          {tipo === "nativo" && <FormNativo data={form} onChange={patch} />}
        </div>

        {/* Posicionamento */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800/50">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Posicionamento no site
          </h3>
          <p className="mb-4 text-xs text-stone-400">
            Seleciona onde este anúncio aparece. O preview atualiza ao vivo.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {POSICOES.map(({ id, label, desc }) => {
              const active = (form.posicoes ?? []).includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => togglePosicao(id)}
                  className={`group relative rounded-xl border p-3 text-left transition-all ${
                    active
                      ? "border-brand bg-brand-light"
                      : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/50"
                  }`}
                >
                  {active && (
                    <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                  <p className={`text-xs font-semibold ${active ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>
                    {label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-stone-400">{desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visibilidade */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800/50">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Visibilidade e estado
          </h3>
          <div className="space-y-3">
            {[
              { key: "ativo", label: "Anúncio ativo", desc: "Exibe o anúncio no site" },
              { key: "mostrar_desktop", label: "Mostrar em desktop", desc: "Ecrãs com largura ≥ 1024px" },
              { key: "mostrar_mobile", label: "Mostrar em mobile", desc: "Ecrãs com largura < 1024px" },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex cursor-pointer items-center gap-3">
                <div
                  onClick={() => patch({ [key]: !form[key as keyof typeof form] } as Partial<AnuncioInput>)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    form[key as keyof typeof form] ? "bg-brand" : "bg-stone-200 dark:bg-stone-700"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      form[key as keyof typeof form] ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700 dark:text-stone-200">{label}</p>
                  <p className="text-[11px] text-stone-400">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Erro + submissão */}
        {erro && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
            <Warning size={14} className="shrink-0" />
            {erro}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={gravando}
            className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {gravando ? "A guardar…" : modoEdicao ? "Guardar alterações" : "Criar anúncio"}
          </button>
        </div>
      </div>

      {/* ── Coluna direita: Preview ── */}
      <div className="w-full lg:sticky lg:top-8 lg:w-[420px] lg:shrink-0">
        <div className="rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800/50">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 dark:border-stone-700">
            <div className="flex items-center gap-2">
              <Eye size={15} className="text-stone-400" />
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Preview</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1 dark:bg-stone-700">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                  device === "desktop"
                    ? "bg-white text-stone-700 shadow-sm dark:bg-stone-600 dark:text-stone-100"
                    : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                }`}
              >
                <Monitor size={12} />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                  device === "mobile"
                    ? "bg-white text-stone-700 shadow-sm dark:bg-stone-600 dark:text-stone-100"
                    : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                }`}
              >
                <Smartphone size={12} />
                Mobile
              </button>
            </div>
          </div>
          <div className="p-4">
            {(form.posicoes ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 py-10 dark:border-stone-700">
                <ImageIcon size={24} className="mb-2 text-stone-300" />
                <p className="text-center text-xs text-stone-400">
                  Seleciona pelo menos uma posição<br />para ver o preview
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(form.posicoes ?? []).map((pos) => {
                  const posLabel = POSICOES.find((p) => p.id === pos)?.label ?? pos;
                  return (
                    <div key={pos}>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                        {posLabel}
                      </p>
                      <AdPreview anuncio={{ ...form, posicoes: [pos] }} device={device} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
