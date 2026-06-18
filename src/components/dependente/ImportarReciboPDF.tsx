"use client";

// Importação de recibo em PDF (funcionalidade PRO). Lê o PDF 100% no browser
// (pdf.js), extrai os dados não-sensíveis e mostra-os num formulário EDITÁVEL
// para o utilizador confirmar/corrigir antes de aplicar ao simulador. O ficheiro
// nunca é enviado nem guardado. Não-Pro vê o bloqueio com CTA.

import { useRef, useState } from "react";
import Link from "next/link";
import { useSubscricao } from "@/lib/stripe/subscription";
import { extrairReciboPDF, type ReciboExtraido } from "@/lib/recibo-pdf";
import { FileSign, Lock, Sparkle, Check } from "@/components/ui/Icons";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");
const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

type Estado = "idle" | "a-ler" | "lido" | "erro";

export function ImportarReciboPDF({ onAplicar }: { onAplicar: (e: ReciboExtraido) => void }) {
  const { plano, carregado } = useSubscricao();
  const ehPro = plano === "pro";
  const fileRef = useRef<HTMLInputElement>(null);

  const [estado, setEstado] = useState<Estado>("idle");
  const [erro, setErro] = useState("");
  // Campos editáveis (seeds da extração; tudo corrigível manualmente).
  const [empresaNome, setEmpresaNome] = useState("");
  const [empresaNif, setEmpresaNif] = useState("");
  const [funcao, setFuncao] = useState("");
  const [mes, setMes] = useState<number | "">("");
  const [salarioBase, setSalarioBase] = useState("");
  const [sujeita, setSujeita] = useState("");
  const [irs, setIrs] = useState("");
  const [ss, setSs] = useState("");
  const [cartao, setCartao] = useState(true);

  async function aoEscolher(file: File | undefined) {
    if (!file) return;
    setEstado("a-ler");
    setErro("");
    try {
      const e = await extrairReciboPDF(file);
      setEmpresaNome(e.empresaNome ?? "");
      setEmpresaNif(e.empresaNif ?? "");
      setFuncao(e.funcao ?? "");
      setMes(e.mes ?? "");
      setSalarioBase(e.salarioBase !== undefined ? String(e.salarioBase).replace(".", ",") : "");
      setSujeita(e.remuneracaoSujeita !== undefined ? String(e.remuneracaoSujeita).replace(".", ",") : "");
      setIrs(e.irsRetido !== undefined ? String(e.irsRetido).replace(".", ",") : "");
      setSs(e.ssDesconto !== undefined ? String(e.ssDesconto).replace(".", ",") : "");
      setCartao(e.subsidioRefeicaoCartao ?? true);
      setEstado("lido");
    } catch {
      setEstado("erro");
      setErro("Não foi possível ler este PDF (pode ser digitalizado/imagem). Preenche os campos manualmente.");
    }
  }

  function aplicar() {
    onAplicar({
      empresaNome: empresaNome.trim() || undefined,
      empresaNif: empresaNif.trim() || undefined,
      funcao: funcao.trim() || undefined,
      mes: mes === "" ? undefined : Number(mes),
      salarioBase: salarioBase ? num(salarioBase) : undefined,
      remuneracaoSujeita: sujeita ? num(sujeita) : undefined,
      irsRetido: irs ? num(irs) : undefined,
      ssDesconto: ss ? num(ss) : undefined,
      subsidioRefeicaoCartao: cartao,
      porPreencher: [],
    });
  }

  const subCard = "rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-800/40 p-4";
  const campo =
    "w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand";
  const lbl = "mb-1 block text-[11px] font-medium text-stone-500 dark:text-stone-400";

  // Enquanto o estado da subscrição não resolve, mostra um esqueleto neutro
  // (evita mostrar o conteúdo errado e a piscar entre carregamento e Pro).
  if (!carregado) {
    return (
      <div className={subCard}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">A preparar…</p>
      </div>
    );
  }

  // ── Bloqueio Pro ──
  if (!ehPro) {
    return (
      <div className={subCard}>
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-light text-brand"><Lock size={18} /></span>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Preencher a partir do recibo em PDF</p>
          <p className="max-w-md text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Funcionalidade Pro: carrega o teu recibo e preenchemos o simulador automaticamente. O ficheiro é lido no teu
            dispositivo e nunca é enviado nem guardado.
          </p>
          <Link
            href="/precos"
            className="btn-shine mt-1 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5"
          >
            <Sparkle size={13} /> Desbloquear com Pro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={subCard}>
      <div className="mb-2 flex items-center gap-1.5">
        <FileSign size={15} className="text-brand" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Preencher a partir do recibo (PDF)</p>
        <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand-dark">Pro</span>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-stone-400">
        Lido no teu dispositivo — o ficheiro nunca é enviado nem guardado. Não extraímos morada, IBAN, o teu NIF, nº de
        beneficiário nem dados de seguro.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => aoEscolher(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={estado === "a-ler"}
        className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand-light px-3.5 py-2 text-xs font-semibold text-brand-dark transition-all hover:bg-brand/15 disabled:opacity-60"
      >
        <FileSign size={14} /> {estado === "a-ler" ? "A ler o PDF…" : "Escolher recibo em PDF"}
      </button>

      {estado === "erro" && (
        <p className="mt-3 rounded-xl border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">{erro}</p>
      )}

      {estado === "lido" && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">Confirma os dados extraídos</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Empresa</label>
              <input value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} className={campo} />
            </div>
            <div>
              <label className={lbl}>NIF da empresa</label>
              <input value={empresaNif} onChange={(e) => setEmpresaNif(e.target.value)} className={campo} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Função / categoria</label>
              <input value={funcao} onChange={(e) => setFuncao(e.target.value)} className={campo} />
            </div>
            <div>
              <label className={lbl}>Mês</label>
              <select value={mes} onChange={(e) => setMes(e.target.value === "" ? "" : Number(e.target.value))} className={campo}>
                <option value="">—</option>
                {MESES.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Salário base (€)</label>
              <input value={salarioBase} onChange={(e) => setSalarioBase(soDecimal(e.target.value))} className={campo} />
            </div>
            <div>
              <label className={lbl}>Remuneração sujeita (€)</label>
              <input value={sujeita} onChange={(e) => setSujeita(soDecimal(e.target.value))} className={campo} />
            </div>
            <div>
              <label className={lbl}>IRS retido (€)</label>
              <input value={irs} onChange={(e) => setIrs(soDecimal(e.target.value))} className={campo} />
            </div>
            <div>
              <label className={lbl}>Segurança Social (€)</label>
              <input value={ss} onChange={(e) => setSs(soDecimal(e.target.value))} className={campo} />
            </div>
          </div>
          <button
            type="button"
            onClick={aplicar}
            className="btn-shine inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float"
          >
            <Check size={15} /> Aplicar ao simulador
          </button>
        </div>
      )}
    </div>
  );
}
