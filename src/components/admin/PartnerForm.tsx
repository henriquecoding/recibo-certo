"use client";

// ═══════════════════════════════════════════════════════════════════════
//  FORMULÁRIO DE PARCERIA — seis secções
//  ---------------------------------------------------------------------
//  O formulário anterior tinha 9 campos e assumia um cartão de parceiro
//  genérico: `url` era texto livre, sem validação de domínio, e não havia
//  qualquer noção de modo, divulgação ou janela de atribuição.
//
//  Duas regras deste ecrã existem por causa do Contrato de Afiliado:
//
//   · A DIVULGAÇÃO é obrigatória quando há link. Cl. 11.2 — identificar o
//     conteúdo como publicidade E divulgar que se recebe comissão. Validado
//     aqui E por `CHECK` na base de dados: um formulário não é uma garantia.
//
//   · O DESTINO nunca é uma URL arbitrária. Sem domínios permitidos, o campo
//     do link é um redirecionador aberto para quem consiga escrever na linha.
//
//  Os modos de handoff e conta ligada ficam DESATIVADOS COM EXPLICAÇÃO
//  VISÍVEL enquanto não houver adaptador com credenciais. Não se escondem:
//  mostram o que falta. Quem abrir este ecrã daqui a três meses percebe onde
//  está a parceria sem ler o código.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PartnerInput, PartnerRow } from "@/lib/supabase/admin";
import { MODOS_PARCERIA, type ModoParceria } from "@/lib/parcerias/modos";
import {
  SUPERFICIES,
  ROTULO_SUPERFICIE,
  type Superficie,
} from "@/content/parcerias-destinos";

const ICONES = [
  { value: "bank", label: "Banco / Conta" },
  { value: "building", label: "Empresa / Contabilidade" },
  { value: "file-sign", label: "Documento / Certificado" },
  { value: "heart", label: "Saúde / Seguro" },
  { value: "invoice", label: "Fatura / Recibo" },
] as const;

const META_MODO: Record<
  ModoParceria,
  { titulo: string; descricao: string; preRequisito?: string }
> = {
  LIGACAO: {
    titulo: "Ligação simples",
    descricao:
      "Um botão que abre o site do parceiro. Sem dados, sem conta, sem consentimento.",
  },
  HANDOFF_CONSENTIDO: {
    titulo: "Handoff consentido",
    descricao:
      "O utilizador escolhe campo a campo o que leva da simulação. Abre o diálogo de consentimento e gera um token temporário.",
    preRequisito: "Exige API do parceiro (FIZ_CLIENT_ID / FIZ_CLIENT_SECRET).",
  },
  CONTA_LIGADA: {
    titulo: "Conta ligada",
    descricao: "O utilizador liga a conta. Estados e prazos regressam por webhook.",
    preRequisito: "Exige OAuth do parceiro, além das credenciais de cliente.",
  },
};

const VAZIO: PartnerInput = {
  id: "",
  nome: "",
  descricao: "",
  url: "",
  cta: "Saber mais",
  contextos: [],
  icone: "bank",
  ativo: true,
  ordem: 0,
  parceiro_key: null,
  modo: "LIGACAO",
  link_afiliado: null,
  link_afiliado_registo: null,
  dominios_permitidos: [],
  subid_param: null,
  caminho_suportado: false,
  divulgacao: "",
  logo_url: null,
  cor_marca: null,
  comissao_descricao: null,
  atribuicao_janela_dias: null,
  validacao_dias: null,
  atribuicao_nota: null,
  inicio_em: null,
  fim_em: null,
};

const campo =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all";
const rotulo = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-500";
const seccaoCls = "space-y-4 rounded-2xl border border-stone-100 bg-stone-50/60 p-4";

/** Mesma verificação de `hostPermitido()`, para avisar antes de gravar. */
function linkDentroDosDominios(link: string, dominios: string[]): boolean {
  if (!link.trim()) return true;
  try {
    const u = new URL(link);
    if (u.protocol !== "https:") return false;
    if (dominios.length === 0) return false;
    return dominios.some((d) => u.host === d || u.host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function Seccao({
  numero,
  titulo,
  nota,
  children,
}: {
  numero: number;
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={seccaoCls}>
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-400">
        {numero}. {titulo}
      </legend>
      {nota && <p className="text-xs leading-relaxed text-stone-500">{nota}</p>}
      {children}
    </fieldset>
  );
}

export default function PartnerForm({
  inicial,
  onGravar,
  modoEdicao = false,
  superficiesIniciais = [],
  onGravarSuperficies,
  /** Modos para os quais já existe adaptador com credenciais. */
  modosDisponiveis = ["LIGACAO"],
}: {
  inicial?: PartnerRow;
  onGravar: (dados: PartnerInput) => Promise<string | undefined>;
  modoEdicao?: boolean;
  superficiesIniciais?: Superficie[];
  onGravarSuperficies?: (superficies: Superficie[]) => Promise<string | undefined>;
  modosDisponiveis?: ModoParceria[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<PartnerInput>(() =>
    inicial ? { ...VAZIO, ...inicial } : VAZIO,
  );
  const [superficies, setSuperficies] = useState<Superficie[]>(superficiesIniciais);
  const [dominiosTexto, setDominiosTexto] = useState(
    (inicial?.dominios_permitidos ?? []).join(", "),
  );
  const [erro, setErro] = useState("");
  const [gravando, setGravando] = useState(false);

  const set = <K extends keyof PartnerInput>(chave: K, valor: PartnerInput[K]) =>
    setForm((prev) => ({ ...prev, [chave]: valor }));

  const temLink = !!form.link_afiliado?.trim();
  const linkValido = useMemo(
    () => linkDentroDosDominios(form.link_afiliado ?? "", form.dominios_permitidos),
    [form.link_afiliado, form.dominios_permitidos],
  );

  const alternarSuperficie = (s: Superficie) =>
    setSuperficies((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim()) return setErro("O ID é obrigatório.");
    if (!form.nome.trim()) return setErro("O nome é obrigatório.");
    if (!form.url.trim()) return setErro("O URL é obrigatório.");

    // As duas regras do contrato, verificadas antes de sair do browser.
    if (temLink && form.dominios_permitidos.length === 0) {
      return setErro(
        "Um link de afiliado sem domínios permitidos é um redirecionador aberto. Indica pelo menos um domínio.",
      );
    }
    if (temLink && !linkValido) {
      return setErro("O link de afiliado tem de ser https e pertencer a um dos domínios permitidos.");
    }
    if (temLink && form.divulgacao.trim().length < 20) {
      return setErro(
        "A divulgação é obrigatória quando há link de afiliado (cl. 11.2 do contrato) e precisa de pelo menos 20 caracteres.",
      );
    }

    setErro("");
    setGravando(true);
    const e2 = await onGravar(form);
    if (e2) {
      setErro(e2);
      setGravando(false);
      return;
    }
    if (onGravarSuperficies) {
      const e3 = await onGravarSuperficies(superficies);
      if (e3) {
        setErro(e3);
        setGravando(false);
      }
    }
  };

  return (
    <form onSubmit={submeter} className="space-y-5 rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
      {/* ── 1. Identidade ─────────────────────────────────────────────── */}
      <Seccao numero={1} titulo="Identidade">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="p-id" className={rotulo}>
              ID único{" "}
              <span className="normal-case tracking-normal text-stone-400">(sem espaços)</span>
            </label>
            <input
              id="p-id"
              type="text"
              required
              disabled={modoEdicao}
              value={form.id}
              onChange={(e) => set("id", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              placeholder="fiz"
              className={`${campo} ${modoEdicao ? "cursor-not-allowed opacity-60" : ""}`}
            />
          </div>
          <div>
            <label htmlFor="p-ordem" className={rotulo}>Ordem</label>
            <input
              id="p-ordem"
              type="number"
              min={0}
              value={form.ordem}
              onChange={(e) => set("ordem", parseInt(e.target.value) || 0)}
              className={campo}
            />
          </div>
        </div>

        <div>
          <label htmlFor="p-key" className={rotulo}>
            Chave do adaptador{" "}
            <span className="normal-case tracking-normal text-stone-400">
              (liga esta linha ao código — ex.: «fiz»)
            </span>
          </label>
          <input
            id="p-key"
            type="text"
            value={form.parceiro_key ?? ""}
            onChange={(e) => set("parceiro_key", e.target.value.trim() || null)}
            placeholder="fiz"
            className={campo}
          />
        </div>

        <div>
          <label htmlFor="p-nome" className={rotulo}>Nome do parceiro</label>
          <input
            id="p-nome"
            type="text"
            required
            value={form.nome}
            onChange={(e) => set("nome", e.target.value)}
            className={campo}
          />
        </div>

        <div>
          <label htmlFor="p-descricao" className={rotulo}>
            Descrição{" "}
            <span className="normal-case tracking-normal text-stone-400">(visível no cartão)</span>
          </label>
          <textarea
            id="p-descricao"
            required
            rows={3}
            value={form.descricao}
            onChange={(e) => set("descricao", e.target.value)}
            className={`${campo} resize-none leading-relaxed`}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={form.ativo}
            onClick={() => set("ativo", !form.ativo)}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${form.ativo ? "bg-brand" : "bg-stone-200"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.ativo ? "left-[1.375rem]" : "left-0.5"}`}
            />
          </button>
          <span className="text-sm font-medium text-stone-700">
            {form.ativo ? "Ativo — aparece no site" : "Inativo — não aparece no site"}
          </span>
        </div>
      </Seccao>

      {/* ── 2. Modo da parceria ───────────────────────────────────────── */}
      <Seccao
        numero={2}
        titulo="Modo da parceria"
        nota="O que está contratado hoje. Uma rota nunca corre em modo mais permissivo do que este — uma rota de handoff numa parceria em «ligação simples» degrada para ligação, não desaparece."
      >
        <div role="radiogroup" aria-label="Modo da parceria" className="space-y-2">
          {MODOS_PARCERIA.map((m) => {
            const meta = META_MODO[m];
            const disponivel = modosDisponiveis.includes(m);
            const ativo = form.modo === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={ativo}
                aria-disabled={!disponivel}
                disabled={!disponivel}
                onClick={() => disponivel && set("modo", m)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  !disponivel
                    ? "cursor-not-allowed border-stone-200 bg-stone-100 opacity-70"
                    : ativo
                      ? "border-brand bg-brand-light"
                      : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-stone-800">{meta.titulo}</span>
                  {!disponivel && meta.preRequisito && (
                    <span className="flex-shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                      pré-requisito em falta
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">{meta.descricao}</p>
                {/* Não se esconde o que não está disponível: diz-se o que falta. */}
                {!disponivel && meta.preRequisito && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
                    {meta.preRequisito}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </Seccao>

      {/* ── 3. Destino ────────────────────────────────────────────────── */}
      <Seccao
        numero={3}
        titulo="Destino"
        nota="O destino nunca é uma URL arbitrária: é validado contra a lista de domínios permitidos a cada clique, não só ao gravar."
      >
        <div>
          <label htmlFor="p-dominios" className={rotulo}>
            Domínios permitidos{" "}
            <span className="normal-case tracking-normal text-stone-400">(separados por vírgula)</span>
          </label>
          <input
            id="p-dominios"
            type="text"
            value={dominiosTexto}
            onChange={(e) => setDominiosTexto(e.target.value)}
            onBlur={() =>
              set(
                "dominios_permitidos",
                dominiosTexto
                  .split(",")
                  .map((d) => d.trim().toLowerCase())
                  .filter(Boolean),
              )
            }
            placeholder="fiz.co, app.fiz.co, help.fiz.co"
            className={campo}
          />
        </div>

        <div>
          <label htmlFor="p-link" className={rotulo}>Link de afiliado</label>
          <input
            id="p-link"
            type="url"
            value={form.link_afiliado ?? ""}
            onChange={(e) => set("link_afiliado", e.target.value.trim() || null)}
            placeholder="https://fiz.co/"
            aria-invalid={temLink && !linkValido ? true : undefined}
            aria-describedby={temLink && !linkValido ? "p-link-erro" : undefined}
            className={`${campo} ${temLink && !linkValido ? "border-red-400" : ""}`}
          />
          {temLink && !linkValido && (
            <p id="p-link-erro" className="mt-1 text-[11px] text-red-500">
              Tem de ser https e pertencer a um dos domínios permitidos acima.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="p-link-registo" className={rotulo}>
            Link de registo{" "}
            <span className="normal-case tracking-normal text-stone-400">(alta intenção)</span>
          </label>
          <input
            id="p-link-registo"
            type="url"
            value={form.link_afiliado_registo ?? ""}
            onChange={(e) => set("link_afiliado_registo", e.target.value.trim() || null)}
            placeholder="https://app.fiz.co/auth?ref=…"
            className={campo}
          />
          <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
            Usado no fim dos simuladores, onde a pessoa já decidiu. Sem isto, tudo cai no link
            do site.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-url" className={rotulo}>
              URL de exibição{" "}
              <span className="normal-case tracking-normal text-stone-400">(cartão de parceiro)</span>
            </label>
            <input
              id="p-url"
              type="url"
              required
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="p-cta" className={rotulo}>Texto do botão</label>
            <input
              id="p-cta"
              type="text"
              required
              value={form.cta}
              onChange={(e) => set("cta", e.target.value)}
              className={campo}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-subid" className={rotulo}>
              Parâmetro de sub-id{" "}
              <span className="normal-case tracking-normal text-stone-400">(por confirmar)</span>
            </label>
            <input
              id="p-subid"
              type="text"
              value={form.subid_param ?? ""}
              onChange={(e) => set("subid_param", e.target.value.trim() || null)}
              placeholder="subid"
              className={campo}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-start gap-2.5 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.caminho_suportado}
                onChange={(e) => set("caminho_suportado", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand/30"
              />
              <span>
                O link preserva o caminho de aterragem
                <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-400">
                  Só marcar depois de o parceiro confirmar. Sem isto, nunca se inventa um
                  caminho no site deles.
                </span>
              </span>
            </label>
          </div>
        </div>
      </Seccao>

      {/* ── 4. Marca ──────────────────────────────────────────────────── */}
      <Seccao
        numero={4}
        titulo="Marca"
        nota="Converter formato e comprimir é permitido; recortar, recolorir ou sobrepor texto não é (cl. 15.1). A licença é limitada, revogável e intransmissível."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-logo" className={rotulo}>Logótipo (URL no nosso domínio)</label>
            <input
              id="p-logo"
              type="text"
              value={form.logo_url ?? ""}
              onChange={(e) => set("logo_url", e.target.value.trim() || null)}
              placeholder="/parceiros/fiz/logo.svg"
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="p-cor" className={rotulo}>Cor da marca</label>
            <input
              id="p-cor"
              type="text"
              value={form.cor_marca ?? ""}
              onChange={(e) => set("cor_marca", e.target.value.trim() || null)}
              placeholder="#FAC72B"
              className={campo}
            />
          </div>
        </div>

        <div>
          <span className={rotulo}>Pré-visualização do botão</span>
          <div className="mt-1.5 flex flex-wrap gap-3">
            <span
              className="inline-flex min-h-[44px] items-center rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ backgroundColor: form.cor_marca ?? "#FAC72B", color: "#1C1917" }}
            >
              {form.cta || "Saber mais"}
            </span>
            <span className="inline-flex min-h-[44px] items-center rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700">
              {form.cta || "Saber mais"}
            </span>
          </div>
        </div>

        <div>
          <span className={rotulo}>Ícone do cartão</span>
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {ICONES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={form.icone === value}
                onClick={() => set("icone", value)}
                className={`rounded-xl border px-2.5 py-2 text-center text-xs font-medium transition-all ${
                  form.icone === value
                    ? "border-brand bg-brand-light text-brand-dark"
                    : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Seccao>

      {/* ── 5. Divulgação e condições ─────────────────────────────────── */}
      <Seccao
        numero={5}
        titulo="Divulgação e condições"
        nota="A divulgação é obrigatória quando há link. Não é uma boa prática — é a cl. 11.2, cujo incumprimento é qualificado como violação material."
      >
        <div>
          <label htmlFor="p-divulgacao" className={rotulo}>
            Divulgação{" "}
            {temLink && <span className="normal-case tracking-normal text-red-500">(obrigatória)</span>}
          </label>
          <textarea
            id="p-divulgacao"
            rows={3}
            value={form.divulgacao}
            onChange={(e) => set("divulgacao", e.target.value)}
            placeholder="Ligação de afiliado (#publicidade): se subscreveres através daqui, recebemos uma comissão. Não muda o preço para ti."
            className={`${campo} resize-none leading-relaxed`}
          />
          <p className="mt-1 text-[11px] text-stone-400">
            {form.divulgacao.trim().length} caracteres — mínimo 20 quando há link.
          </p>
        </div>

        <div>
          <label htmlFor="p-comissao" className={rotulo}>Descrição da comissão</label>
          <input
            id="p-comissao"
            type="text"
            value={form.comissao_descricao ?? ""}
            onChange={(e) => set("comissao_descricao", e.target.value.trim() || null)}
            placeholder="30% do valor líquido sem IVA, durante 12 meses"
            className={campo}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="p-janela" className={rotulo}>Janela de atribuição (dias)</label>
            <input
              id="p-janela"
              type="number"
              min={0}
              value={form.atribuicao_janela_dias ?? ""}
              onChange={(e) =>
                set("atribuicao_janela_dias", e.target.value === "" ? null : parseInt(e.target.value))
              }
              placeholder="90"
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="p-validacao" className={rotulo}>Validação (dias)</label>
            <input
              id="p-validacao"
              type="number"
              min={0}
              value={form.validacao_dias ?? ""}
              onChange={(e) =>
                set("validacao_dias", e.target.value === "" ? null : parseInt(e.target.value))
              }
              placeholder="30"
              className={campo}
            />
          </div>
        </div>

        <div>
          <label htmlFor="p-atrib-nota" className={rotulo}>Nota sobre a atribuição</label>
          <input
            id="p-atrib-nota"
            type="text"
            value={form.atribuicao_nota ?? ""}
            onChange={(e) => set("atribuicao_nota", e.target.value.trim() || null)}
            placeholder="Last-click; permanente após o registo"
            className={campo}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="p-inicio" className={rotulo}>Início</label>
            <input
              id="p-inicio"
              type="date"
              value={form.inicio_em ? form.inicio_em.slice(0, 10) : ""}
              onChange={(e) => set("inicio_em", e.target.value ? `${e.target.value}T00:00:00Z` : null)}
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="p-fim" className={rotulo}>Fim</label>
            <input
              id="p-fim"
              type="date"
              value={form.fim_em ? form.fim_em.slice(0, 10) : ""}
              onChange={(e) => set("fim_em", e.target.value ? `${e.target.value}T23:59:59Z` : null)}
              className={campo}
            />
          </div>
        </div>
      </Seccao>

      {/* ── 6. Superfícies ────────────────────────────────────────────── */}
      <Seccao
        numero={6}
        titulo="Superfícies"
        nota="Onde a parceria aparece. Nenhuma começa ativa por ter sido criada — cada uma é uma decisão."
      >
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {SUPERFICIES.map((s) => (
            <label
              key={s}
              className="flex items-start gap-2.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700"
            >
              <input
                type="checkbox"
                checked={superficies.includes(s)}
                onChange={() => alternarSuperficie(s)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-stone-300 text-brand focus:ring-brand/30"
              />
              <span className="min-w-0">
                <span className="block font-medium">{ROTULO_SUPERFICIE[s]}</span>
                <span className="block truncate font-mono text-[10px] text-stone-400">{s}</span>
              </span>
            </label>
          ))}
        </div>
      </Seccao>

      {erro && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          {erro}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-stone-100 pt-5">
        <button
          type="submit"
          disabled={gravando}
          className="btn-shine inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float disabled:opacity-60"
        >
          {gravando ? "A gravar…" : modoEdicao ? "Guardar alterações" : "Criar parceiro"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/parceiros")}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
