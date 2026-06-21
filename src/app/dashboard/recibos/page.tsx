"use client";

import { useState, type FormEvent } from "react";
import { useRecibos, calcularRecibo, type NovoRecibo, type Recibo } from "@/lib/store/recibos";
import { downloadCSV, printRecibosPDF } from "@/lib/export";
import { fmt, pct } from "@/lib/format";
import { Trash, Pencil, Receipt, Check, Export } from "@/components/ui/Icons";
import InfoTip from "@/components/ui/InfoTip";
import ProHint from "@/components/ui/ProHint";
import ProGate from "@/components/ui/ProGate";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import type { RegimeIVA } from "@/lib/fiscal";
import {
  ATIVIDADES,
  efeitoFiscal,
  META_TIPO,
  META_REGIAO,
  META_BASE_SS,
  type Atividade,
  type Regiao,
  type BaseSS,
} from "@/lib/fiscal-data";

const hoje = () => new Date().toISOString().slice(0, 10);
const ATIVIDADE_DEFAULT = ATIVIDADES.find((a) => a.label.includes("Programador")) ?? ATIVIDADES[0];

const REGIME_IVA_OPCOES: { id: RegimeIVA; label: string }[] = [
  { id: "isento", label: "Isento (Art. 53.º)" },
  { id: "reduzida", label: "Reduzida" },
  { id: "intermedia", label: "Intermédia" },
  { id: "normal", label: "Normal" },
];

const inicial: NovoRecibo = {
  data: hoje(),
  cliente: "",
  valor: 0,
  tipo: ATIVIDADE_DEFAULT.tipo,
  atividade: ATIVIDADE_DEFAULT.label,
  regiao: "continente",
  regimeIVA: "isento",
  baseSS: efeitoFiscal(ATIVIDADE_DEFAULT).baseSS,
  dispensaRetencao: false,
};

export default function RecibosPage() {
  const { recibos, carregado, adicionar, atualizar, remover } = useRecibos();
  const [form, setForm] = useState<NovoRecibo>(inicial);
  const [atividadeSel, setAtividadeSel] = useState<Atividade>(ATIVIDADE_DEFAULT);
  const [valorStr, setValorStr] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const ef = efeitoFiscal(atividadeSel);

  const escolherAtividade = (a: Atividade) => {
    setAtividadeSel(a);
    setForm((f) => ({ ...f, tipo: a.tipo, atividade: a.label, baseSS: efeitoFiscal(a).baseSS }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const valor = parseFloat(valorStr.replace(",", "."));
    if (!form.cliente.trim() || isNaN(valor) || valor <= 0) return;
    if (editId) atualizar(editId, { ...form, valor });
    else adicionar({ ...form, valor });
    setForm({ ...inicial, data: form.data });
    setAtividadeSel(ATIVIDADE_DEFAULT);
    setValorStr("");
    setEditId(null);
  };

  const editar = (r: Recibo) => {
    setEditId(r.id);
    const ativ = (r.atividade && ATIVIDADES.find((a) => a.label === r.atividade)) || ATIVIDADES.find((a) => a.tipo === r.tipo) || ATIVIDADE_DEFAULT;
    setAtividadeSel(ativ);
    setForm({
      data: r.data,
      cliente: r.cliente,
      valor: r.valor,
      tipo: r.tipo,
      atividade: r.atividade ?? ativ.label,
      regiao: r.regiao,
      regimeIVA: r.regimeIVA,
      baseSS: r.baseSS,
      dispensaRetencao: r.dispensaRetencao,
    });
    setValorStr(String(r.valor));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicao = () => {
    setEditId(null);
    setForm({ ...inicial, data: hoje() });
    setAtividadeSel(ATIVIDADE_DEFAULT);
    setValorStr("");
  };

  const filtrados = query.trim()
    ? recibos.filter((r) => r.cliente.toLowerCase().includes(query.trim().toLowerCase()))
    : recibos;

  // Agrupa por mês (AAAA-MM) com subtotal do líquido.
  const grupos = filtrados.reduce<Record<string, Recibo[]>>((acc, r) => {
    const k = r.data.slice(0, 7);
    (acc[k] ??= []).push(r);
    return acc;
  }, {});
  const meses = Object.keys(grupos).sort((a, b) => b.localeCompare(a));
  const nomeMes = (k: string) => {
    const [ano, mes] = k.split("-");
    return new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  };

  const campo = "w-full px-3.5 py-2.5 text-[16px] text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100 dark:placeholder-stone-500";
  const rotulo = "text-xs font-medium text-stone-500 uppercase tracking-wider block mb-1.5 dark:text-stone-400";

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-stone-400">Gestão · Recibos verdes</p>
          <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">Recibos</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Regista os teus recibos e acompanha o que fica realmente teu.</p>
        </div>
        {recibos.length > 0 && (
          <ProGate title="Exportação Pro" description="Exporta os teus recibos em CSV ou PDF para enviar ao contabilista.">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadCSV(recibos)}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-600 transition-colors hover:border-stone-300 dark:bg-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-600"
              >
                <Export size={16} /> CSV
              </button>
              <button
                type="button"
                onClick={() => printRecibosPDF(recibos)}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-600 transition-colors hover:border-stone-300 dark:bg-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-600"
              >
                <Export size={16} /> PDF
              </button>
            </div>
          </ProGate>
        )}
      </header>

      {recibos.length > 0 && (
        <ProHint id="export-contabilista" icon={<Export size={18} />} cta="Ver o que o Pro faz" className="mb-6">
          Vais entregar isto ao teu contabilista? No Pro, a exportação vira um relatório anual completo, pronto a
          enviar num clique.
        </ProHint>
      )}

      <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
        {/* Formulário */}
        <form onSubmit={submit} className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card space-y-4 dark:bg-stone-900 dark:border-stone-800">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">{editId ? "Editar recibo" : "Novo recibo"}</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="data" className={rotulo}>Data</label>
              <input id="data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={campo} required />
            </div>
            <div>
              <label htmlFor="valor" className={rotulo}>Valor (€)</label>
              <input
                id="valor"
                type="number"
                inputMode="decimal"
                min={0}
                step={50}
                value={valorStr}
                onChange={(e) => setValorStr(e.target.value)}
                placeholder="1500"
                className={campo}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="cliente" className={rotulo}>Cliente</label>
            <input
              id="cliente"
              type="text"
              value={form.cliente}
              onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              placeholder="Nome do cliente"
              className={campo}
              required
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Tipo de atividade</span>
              <InfoTip>Procura a tua profissão na tabela oficial do Art. 151.º (ou um regime especial). Define a retenção na fonte, o coeficiente e a base de Segurança Social.</InfoTip>
            </div>
            <ActivityCombobox value={atividadeSel} onChange={escolherAtividade} />
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg bg-brand-light px-2.5 py-1 font-semibold text-brand-dark dark:bg-brand/15 dark:text-brand">Retenção {pct(ef.retencao)}</span>
              <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">Coeficiente {pct(ef.coef)}</span>
            </div>
            {ef.nota && <p className="mt-2 text-xs leading-relaxed text-stone-400">{ef.nota}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label htmlFor="regiao" className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Região</label>
                <InfoTip>Determina as taxas de IVA aplicáveis: Continente (6/13/23%), Madeira (4/12/22%) ou Açores (4/9/16%).</InfoTip>
              </div>
              <select id="regiao" value={form.regiao} onChange={(e) => setForm({ ...form, regiao: e.target.value as Regiao })} className={campo}>
                {(Object.keys(META_REGIAO) as Regiao[]).map((r) => (
                  <option key={r} value={r}>{META_REGIAO[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label htmlFor="iva" className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">IVA</label>
                <InfoTip>Isento ao abrigo do Art. 53.º (faturação anual abaixo de 15.000 €) ou a taxa que cobras ao cliente. O IVA cobrado pertence ao Estado.</InfoTip>
              </div>
              <select id="iva" value={form.regimeIVA} onChange={(e) => setForm({ ...form, regimeIVA: e.target.value as RegimeIVA })} className={campo}>
                {REGIME_IVA_OPCOES.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <label htmlFor="baseSS" className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Natureza (Seg. Social)</label>
              <InfoTip>A Segurança Social incide sobre 70% do valor nas prestações de serviços e sobre 20% na venda de bens, restauração e hotelaria.</InfoTip>
            </div>
            <select id="baseSS" value={form.baseSS} onChange={(e) => setForm({ ...form, baseSS: e.target.value as BaseSS })} className={campo}>
              {(Object.keys(META_BASE_SS) as BaseSS[]).map((b) => (
                <option key={b} value={b}>{META_BASE_SS[b].label}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            role="checkbox"
            aria-checked={form.dispensaRetencao}
            onClick={() => setForm({ ...form, dispensaRetencao: !form.dispensaRetencao })}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              form.dispensaRetencao ? "border-brand bg-brand-light dark:bg-brand/15" : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800"
            }`}
          >
            <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${form.dispensaRetencao ? "bg-brand border-brand text-white" : "border-stone-300 text-transparent dark:border-stone-600"}`}>
              <Check size={12} />
            </span>
            <span className={`text-sm font-medium ${form.dispensaRetencao ? "text-brand-dark dark:text-brand" : "text-stone-600 dark:text-stone-300"}`}>
              Dispensa de retenção na fonte
            </span>
          </button>

          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-all hover:opacity-90">
              {editId ? "Guardar alterações" : "Adicionar recibo"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={cancelarEdicao}
                className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600 transition-all hover:border-stone-300 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-600"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        {/* Lista */}
        <div>
          {!carregado ? (
            <div className="p-10 text-center text-sm text-stone-400">A carregar…</div>
          ) : recibos.length === 0 ? (
            <div className="rounded-4xl border border-stone-100 bg-white p-10 text-center shadow-card dark:bg-stone-900 dark:border-stone-800">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand dark:bg-brand/15">
                <Receipt size={22} />
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400">Os recibos que registares aparecem aqui.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Procurar por cliente…"
                aria-label="Procurar recibos por cliente"
                className={campo}
              />
              {meses.length === 0 && <p className="text-sm text-stone-400">Sem recibos para “{query}”.</p>}
              {meses.map((mesKey) => {
                const doMes = grupos[mesKey];
                const subtotal = doMes.reduce((s, r) => s + calcularRecibo(r).liquido, 0);
                return (
                  <div key={mesKey}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 capitalize">{nomeMes(mesKey)}</h3>
                      <span className="text-xs text-stone-400">
                        líquido <span className="font-semibold text-brand">{fmt(subtotal)}</span>
                      </span>
                    </div>
                    <ul className="space-y-2.5">
                      {doMes.map((r) => {
                        const c = calcularRecibo(r);
                        const emEdicao = editId === r.id;
                        return (
                          <li
                            key={r.id}
                            className={`flex items-center gap-3 rounded-3xl border bg-white p-4 transition-all ${emEdicao ? "border-brand shadow-glow" : "border-stone-100 hover:border-stone-200 hover:shadow-card dark:bg-stone-900 dark:border-stone-800 dark:hover:border-stone-700"}`}
                          >
                            {/* Color dot */}
                            <span className="hidden h-2 w-2 flex-shrink-0 rounded-full bg-brand sm:block" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{r.cliente || "Sem nome"}</span>
                                <span className="flex-shrink-0 text-xs text-stone-400">{r.data}</span>
                              </div>
                              <div className="mt-0.5 text-xs text-stone-400">
                                {r.atividade ?? META_TIPO[r.tipo].label} · {fmt(r.valor)}
                                {c.iva > 0 && ` · IVA ${fmt(c.iva)}`}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="font-display text-base font-semibold text-brand">{fmt(c.liquido)}</div>
                              <div className="text-[11px] text-stone-400">líquido</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => editar(r)}
                              aria-label={`Editar recibo de ${r.cliente}`}
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-stone-300 transition-all hover:bg-brand-light hover:text-brand"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => { if (window.confirm(`Remover o recibo de ${r.cliente || "sem nome"} (${fmt(r.valor)})?`)) remover(r.id); }}
                              aria-label={`Remover recibo de ${r.cliente}`}
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-stone-300 transition-all hover:bg-clay-bg hover:text-clay-text"
                            >
                              <Trash size={16} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
