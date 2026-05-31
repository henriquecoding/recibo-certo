"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PartnerInput, PartnerRow } from "@/lib/supabase/admin";

const ICONES = [
  { value: "bank", label: "Banco / Conta" },
  { value: "building", label: "Empresa / Contabilidade" },
  { value: "file-sign", label: "Documento / Certificado" },
  { value: "heart", label: "Saúde / Seguro" },
  { value: "invoice", label: "Fatura / Recibo" },
] as const;

const CONTEXTOS_OPCOES = [
  { value: "dashboard", label: "Dashboard (visão geral)" },
  { value: "receitas", label: "Receitas" },
  { value: "recibos", label: "Recibos" },
  { value: "prazos", label: "Prazos fiscais" },
  { value: "simulador", label: "Simulador IRS" },
];

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
};

const campo = "w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all";
const rotulo = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-500";

export default function PartnerForm({
  inicial,
  onGravar,
  modoEdicao = false,
}: {
  inicial?: PartnerRow;
  onGravar: (dados: PartnerInput) => Promise<string | undefined>;
  modoEdicao?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<PartnerInput>(
    inicial
      ? { id: inicial.id, nome: inicial.nome, descricao: inicial.descricao, url: inicial.url, cta: inicial.cta, contextos: inicial.contextos, icone: inicial.icone, ativo: inicial.ativo, ordem: inicial.ordem }
      : VAZIO
  );
  const [erro, setErro] = useState("");
  const [gravando, setGravando] = useState(false);

  const set = <K extends keyof PartnerInput>(chave: K, valor: PartnerInput[K]) =>
    setForm((prev) => ({ ...prev, [chave]: valor }));

  const toggleContexto = (ctx: string) => {
    set("contextos", form.contextos.includes(ctx)
      ? form.contextos.filter((c) => c !== ctx)
      : [...form.contextos, ctx]
    );
  };

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim()) { setErro("O ID é obrigatório."); return; }
    if (!form.nome.trim()) { setErro("O nome é obrigatório."); return; }
    if (!form.url.trim()) { setErro("O URL é obrigatório."); return; }
    if (form.contextos.length === 0) { setErro("Seleciona pelo menos um contexto."); return; }

    setErro("");
    setGravando(true);
    const e2 = await onGravar(form);
    if (e2) { setErro(e2); setGravando(false); }
  };

  return (
    <form onSubmit={submeter} className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card space-y-5">

      {/* ID + Ordem */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="p-id" className={rotulo}>ID único <span className="text-stone-400 normal-case tracking-normal">(sem espaços)</span></label>
          <input
            id="p-id"
            type="text"
            required
            disabled={modoEdicao}
            value={form.id}
            onChange={(e) => set("id", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            placeholder="conta-pj"
            className={`${campo} ${modoEdicao ? "opacity-60 cursor-not-allowed" : ""}`}
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

      {/* Nome */}
      <div>
        <label htmlFor="p-nome" className={rotulo}>Nome do parceiro</label>
        <input
          id="p-nome"
          type="text"
          required
          value={form.nome}
          onChange={(e) => set("nome", e.target.value)}
          placeholder="Conta profissional online"
          className={campo}
        />
      </div>

      {/* Descrição */}
      <div>
        <label htmlFor="p-descricao" className={rotulo}>Descrição <span className="text-stone-400 normal-case tracking-normal">(visível no card)</span></label>
        <textarea
          id="p-descricao"
          required
          rows={3}
          value={form.descricao}
          onChange={(e) => set("descricao", e.target.value)}
          placeholder="Breve descrição do parceiro e o que oferece ao utilizador."
          className={`${campo} resize-none leading-relaxed`}
        />
      </div>

      {/* URL + CTA */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-url" className={rotulo}>URL de afiliado / destino</label>
          <input
            id="p-url"
            type="url"
            required
            value={form.url}
            onChange={(e) => set("url", e.target.value)}
            placeholder="https://parceiro.exemplo.pt?ref=recibocerto"
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="p-cta" className={rotulo}>Texto do botão (CTA)</label>
          <input
            id="p-cta"
            type="text"
            required
            value={form.cta}
            onChange={(e) => set("cta", e.target.value)}
            placeholder="Saber mais"
            className={campo}
          />
        </div>
      </div>

      {/* Ícone */}
      <div>
        <span className={rotulo}>Ícone</span>
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
                  : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contextos */}
      <div>
        <span className={rotulo}>Contextos <span className="text-stone-400 normal-case tracking-normal">(onde aparece)</span></span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {CONTEXTOS_OPCOES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={form.contextos.includes(value)}
              onClick={() => toggleContexto(value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                form.contextos.includes(value)
                  ? "border-brand bg-brand text-white"
                  : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Activo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={form.ativo}
          onClick={() => set("ativo", !form.ativo)}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${form.ativo ? "bg-brand" : "bg-stone-200"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.ativo ? "left-[1.375rem]" : "left-0.5"}`} />
        </button>
        <span className="text-sm font-medium text-stone-700">
          {form.ativo ? "Activo — aparece no site" : "Inactivo — não aparece no site"}
        </span>
      </div>

      {erro && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{erro}</p>
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
