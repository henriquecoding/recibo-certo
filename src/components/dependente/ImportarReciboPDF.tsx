"use client";

// Importação de recibo em PDF (funcionalidade PRO). Lê o PDF 100% no browser
// (pdf.js), extrai os dados não-sensíveis e mostra-os num formulário EDITÁVEL
// para o utilizador confirmar/corrigir antes de aplicar ao simulador. O ficheiro
// nunca é enviado nem guardado. Não-Pro vê o bloqueio com CTA.
//
// Desenho: entrada principal do simulador — banda destacada (brand) com
// arrastar-e-largar bem visível. Ao aplicar, os dados sincronizam o simulador
// e a auditoria abaixo, e a confirmação recolhe-se.

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { useSubscricao } from "@/lib/stripe/subscription";
import { extrairReciboPDF, type ReciboExtraido } from "@/lib/recibo-pdf";
import { FileSign, Lock, Sparkle, Check, Spinner, Warning, ShieldCheck } from "@/components/ui/Icons";
import { cx } from "@/components/dependente/ui";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");
const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

type Estado = "idle" | "a-ler" | "lido" | "erro" | "aplicado";

export function ImportarReciboPDF({ onAplicar }: { onAplicar: (e: ReciboExtraido) => void }) {
  const { plano, carregado } = useSubscricao();
  const ehPro = plano === "pro";
  const fileRef = useRef<HTMLInputElement>(null);

  const [estado, setEstado] = useState<Estado>("idle");
  const [erro, setErro] = useState("");
  const [arrastar, setArrastar] = useState(false);
  const [nomeFicheiro, setNomeFicheiro] = useState("");
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
  const [subRefDia, setSubRefDia] = useState("");
  const [subRefDias, setSubRefDias] = useState("");
  const [subRefTotal, setSubRefTotal] = useState("");
  const [premio, setPremio] = useState("");

  async function aoEscolher(file: File | undefined) {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") {
      setEstado("erro");
      setErro("O ficheiro tem de ser um PDF. Arrasta o teu recibo em PDF ou escolhe-o no botão.");
      return;
    }
    setNomeFicheiro(file.name);
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
      setSubRefDia(e.subsidioRefeicaoDia !== undefined ? String(e.subsidioRefeicaoDia).replace(".", ",") : "");
      setSubRefDias(e.subsidioRefeicaoDias !== undefined ? String(e.subsidioRefeicaoDias) : "");
      setSubRefTotal(e.subsidioRefeicaoTotal !== undefined ? String(e.subsidioRefeicaoTotal).replace(".", ",") : "");
      setPremio(e.premio !== undefined ? String(e.premio).replace(".", ",") : "");
      setEstado("lido");
    } catch {
      setEstado("erro");
      setErro("Não foi possível ler este PDF (pode ser digitalizado/imagem). Preenche os campos manualmente.");
    }
  }

  const totalSubsidio =
    subRefDia && subRefDias
      ? Math.round(num(subRefDia) * Math.round(num(subRefDias)) * 100) / 100
      : subRefTotal
        ? num(subRefTotal)
        : undefined;

  // Feriados / outros rendimentos sujeitos = remuneração sujeita − base − prémio.
  const outrosSujeitos = Math.max(
    0,
    Math.round(((sujeita ? num(sujeita) : 0) - (salarioBase ? num(salarioBase) : 0) - (premio ? num(premio) : 0)) * 100) / 100
  );

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
      subsidioRefeicaoDia: subRefDia ? num(subRefDia) : undefined,
      subsidioRefeicaoDias: subRefDias ? Math.round(num(subRefDias)) : undefined,
      subsidioRefeicaoTotal: totalSubsidio,
      premio: premio ? num(premio) : undefined,
      feriados: outrosSujeitos > 0 ? outrosSujeitos : undefined,
      porPreencher: [],
    });
    // Os dados já estão refletidos no simulador abaixo — recolhe a confirmação.
    setEstado("aplicado");
  }

  // Drag-and-drop do PDF sobre a zona de carregamento.
  function aoLargar(e: DragEvent) {
    e.preventDefault();
    setArrastar(false);
    aoEscolher(e.dataTransfer.files?.[0]);
  }

  // Recomeça a leitura (ler outro recibo).
  function lerOutro() {
    setEstado("idle");
    setErro("");
    setNomeFicheiro("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const campo =
    "w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand";
  const lbl = "mb-1 block text-[11px] font-medium text-stone-500 dark:text-stone-400";
  const grupo = "text-[10px] font-semibold uppercase tracking-wide text-brand-dark/70 dark:text-brand";

  // Enquanto o estado da subscrição não resolve, mostra um esqueleto neutro.
  if (!carregado) {
    return (
      <div className="rounded-4xl border border-brand/15 bg-brand/5 p-6">
        <div className="h-5 w-48 animate-pulse rounded bg-brand/10" />
        <div className="mt-4 h-28 animate-pulse rounded-2xl bg-brand/10" />
      </div>
    );
  }

  // Cabeçalho comum (título + privacidade + Pro).
  const Cabecalho = (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
        <FileSign size={20} />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Preencher a partir do recibo</h2>
          <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">Pro</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          Arrasta o teu recibo em PDF e preenchemos o simulador <span className="font-medium text-stone-600 dark:text-stone-300">e a auditoria</span> por
          ti. Lido no teu dispositivo — nunca enviado nem guardado. Não extraímos morada, IBAN, NIF, nº de beneficiário nem dados de seguro.
        </p>
      </div>
    </div>
  );

  // ── Bloqueio Pro ──
  if (!ehPro) {
    return (
      <div className="rounded-4xl border border-brand/20 bg-gradient-to-br from-brand-light to-white dark:from-brand/10 dark:to-stone-900/40 p-6 shadow-card">
        {Cabecalho}
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-brand/30 bg-white/60 dark:bg-stone-900/30 px-4 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand"><Lock size={20} /></span>
          <p className="max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Com o plano <span className="font-semibold">Pro</span> carregas o recibo e preenchemos tudo automaticamente — poupas tempo e
            confirmas se os descontos estão certos num instante.
          </p>
          <Link
            href="/precos"
            className="btn-shine mt-1 inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5"
          >
            <Sparkle size={14} /> Desbloquear com Pro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-4xl border border-brand/20 bg-gradient-to-br from-brand-light to-white dark:from-brand/10 dark:to-stone-900/40 p-6 shadow-card">
      {Cabecalho}

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => aoEscolher(e.target.files?.[0])}
      />

      {estado === "aplicado" ? (
        // Depois de aplicar, recolhe a confirmação — os dados já estão no simulador abaixo.
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-white/70 dark:bg-stone-900/30 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"><Check size={15} /></span>
            Recibo aplicado — o simulador e a auditoria abaixo já refletem os teus valores.
          </span>
          <button type="button" onClick={lerOutro} className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand-light px-3.5 py-2 text-xs font-semibold text-brand-dark transition-all hover:bg-brand/15">
            <FileSign size={13} /> Ler outro recibo
          </button>
        </div>
      ) : estado !== "lido" ? (
        // Zona de carregamento com arrastar-e-largar (drag & drop).
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastar(true);
          }}
          onDragLeave={() => setArrastar(false)}
          onDrop={aoLargar}
          onClick={() => estado !== "a-ler" && fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && estado !== "a-ler") {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          aria-label="Arrasta o teu recibo em PDF para aqui ou clica para escolher"
          aria-busy={estado === "a-ler"}
          className={cx(
            "flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-4 py-9 text-center transition-colors",
            arrastar
              ? "border-brand bg-brand-light"
              : "border-brand/30 bg-white/60 dark:bg-stone-900/30 hover:border-brand/60 hover:bg-brand-light/50"
          )}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand">
            {estado === "a-ler" ? <Spinner size={22} className="animate-spin" /> : <FileSign size={22} />}
          </span>
          <div>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              {estado === "a-ler" ? `A ler ${nomeFicheiro || "o PDF"}…` : arrastar ? "Larga o ficheiro para ler" : "Arrasta o teu recibo em PDF para aqui"}
            </p>
            <p className="mt-0.5 text-[11px] text-stone-400">{estado === "a-ler" ? "Processado no teu dispositivo" : "ou clica para escolher um ficheiro"}</p>
          </div>
          {estado !== "a-ler" && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-glow">
              <FileSign size={13} /> Escolher recibo em PDF
            </span>
          )}
        </div>
      ) : null}

      {estado === "erro" && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">
          <span className="mt-0.5 flex-shrink-0"><Warning size={13} /></span>
          {erro}
        </p>
      )}

      {estado === "lido" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-brand/20 bg-white/70 dark:bg-stone-900/30 px-3 py-2">
            <ShieldCheck size={14} className="flex-shrink-0 text-brand" />
            <p className="text-[11px] leading-snug text-stone-600 dark:text-stone-300">
              Lemos <span className="font-medium">{nomeFicheiro || "o teu recibo"}</span>. Confirma ou corrige os valores antes de aplicar.
            </p>
          </div>

          {/* Identificação */}
          <div>
            <p className={cx(grupo, "mb-2")}>Identificação</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className={lbl}>Empresa</label>
                <input value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} className={campo} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={lbl}>NIF da empresa</label>
                <input value={empresaNif} onChange={(e) => setEmpresaNif(e.target.value)} className={campo} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={lbl}>Função / categoria</label>
                <input value={funcao} onChange={(e) => setFuncao(e.target.value)} className={campo} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={lbl}>Mês</label>
                <select value={mes} onChange={(e) => setMes(e.target.value === "" ? "" : Number(e.target.value))} className={campo}>
                  <option value="">—</option>
                  {MESES.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Valores principais */}
          <div>
            <p className={cx(grupo, "mb-2")}>Valores do recibo</p>
            <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* Subsídio & extras */}
          <div>
            <p className={cx(grupo, "mb-2")}>Subsídio de refeição e rendimentos adicionais</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Subsídio refeição / dia (€)</label>
                <input value={subRefDia} onChange={(e) => setSubRefDia(soDecimal(e.target.value))} placeholder="0" className={campo} />
              </div>
              <div>
                <label className={lbl}>Dias de subsídio</label>
                <input value={subRefDias} onChange={(e) => setSubRefDias(soDecimal(e.target.value))} placeholder="0" className={campo} />
              </div>
              <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700">
                <input type="checkbox" checked={cartao} onChange={(e) => setCartao(e.target.checked)} className="h-4 w-4 accent-brand" />
                <span className="text-xs text-stone-600 dark:text-stone-300">Subsídio pago em cartão/vale (pago à parte)</span>
                {totalSubsidio !== undefined && totalSubsidio > 0 && (
                  <span className="ml-auto text-[11px] font-semibold tabular-nums text-stone-500 dark:text-stone-400">
                    Total {totalSubsidio.toFixed(2).replace(".", ",")} €
                  </span>
                )}
              </label>
              <div>
                <label className={lbl}>Prémio (€)</label>
                <input value={premio} onChange={(e) => setPremio(soDecimal(e.target.value))} placeholder="0" className={campo} />
              </div>
              <div>
                <label className={lbl}>Feriados / outros sujeitos (€)</label>
                <input
                  value={outrosSujeitos > 0 ? outrosSujeitos.toFixed(2).replace(".", ",") : "0"}
                  readOnly
                  aria-readonly
                  title="Calculado: remuneração sujeita − salário base − prémio"
                  className={cx(campo, "cursor-not-allowed opacity-70")}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={aplicar}
              className="btn-shine inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float"
            >
              <Check size={15} /> Aplicar ao simulador
            </button>
            <button type="button" onClick={lerOutro} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 px-3.5 py-2.5 text-xs font-semibold text-stone-500 dark:text-stone-400 transition-all hover:border-brand hover:text-brand">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
