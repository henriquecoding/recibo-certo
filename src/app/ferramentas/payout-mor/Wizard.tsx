"use client";

import { useState } from "react";
import { SS_TAXA, SS_COEFICIENTE, REGIME_SIMPLIFICADO } from "@/lib/fiscal-data";
import { irsProgressivo } from "@/lib/fiscal";
import { fmt } from "@/lib/format";
import { Check, Warning, ArrowRight, ChevronDown } from "@/components/ui/Icons";

// ── Barra de progresso ────────────────────────────────────────────────────────

function BarraProgresso({ passo, total }: { passo: number; total: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-1.5 mb-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < passo ? "bg-brand" : "bg-stone-100 dark:bg-stone-800"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-stone-400">
        Passo {passo} de {total}
      </p>
    </div>
  );
}

// ── Checklist item ────────────────────────────────────────────────────────────

function CheckItem({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-150 hover:border-brand/30"
      style={{
        borderColor: checked ? "rgba(29,158,117,0.3)" : undefined,
        background:  checked ? "rgba(29,158,117,0.05)" : undefined,
      }}
    >
      <span
        className={`mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-md border transition-all ${
          checked
            ? "border-brand bg-brand text-white"
            : "border-stone-300 dark:border-stone-600"
        }`}
      >
        {checked && <Check size={10} />}
      </span>
      <span className="text-sm text-stone-700 dark:text-stone-300">{label}</span>
    </button>
  );
}

// ── Tabela de instrução ───────────────────────────────────────────────────────

function TabelaInstrucao({ rows }: { rows: { campo: string; valor: string; legal?: string }[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800">
      {rows.map((r, i) => (
        <div
          key={i}
          className={`grid grid-cols-[1fr_1.5fr] gap-4 px-4 py-3 text-sm ${
            i > 0 ? "border-t border-stone-50 dark:border-stone-800/50" : ""
          }`}
        >
          <span className="text-stone-400">{r.campo}</span>
          <div>
            <span className="font-semibold text-stone-800 dark:text-stone-100">{r.valor}</span>
            {r.legal && (
              <p className="mt-0.5 text-[11px] text-stone-400">{r.legal}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Callout ───────────────────────────────────────────────────────────────────

function Callout({ tipo, children }: { tipo: "aviso" | "erro" | "ok"; children: React.ReactNode }) {
  const styles = {
    aviso: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-300",
    erro:  "border-clay-text/30 bg-clay-bg text-clay-text dark:bg-red-950/20",
    ok:    "border-brand/20 bg-brand-light text-brand-dark dark:bg-brand/10 dark:text-brand-mint",
  }[tipo];
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${styles}`}>
      {children}
    </div>
  );
}

// ── Passos ────────────────────────────────────────────────────────────────────

const TOTAL_PASSOS = 5;

function Passo0({ onProximo }: { onProximo: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">
          Porquê usar um Merchant of Record?
        </h2>
        <p className="text-sm text-stone-500">
          Antes de emitir o recibo, percebe o que o MoR faz por ti.
        </p>
      </div>

      {/* Glossário */}
      <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3">
        {[
          { termo: "MoR (Merchant of Record)", def: "Entidade que assume a responsabilidade legal pela venda. Ao usar um MoR, ficas isento de te registar no Balcão Único de IVA (OSS)." },
          { termo: "Autoliquidação (Reverse Charge)", def: "O IVA é liquidado pelo adquirente (o MoR), não por ti. Emites a fatura sem cobrar IVA." },
          { termo: "Webhooks", def: "Notificações automáticas do MoR para o teu SaaS quando um pagamento ocorre." },
        ].map((g) => (
          <div key={g.termo}>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{g.termo}</p>
            <p className="text-xs text-stone-500 mt-0.5">{g.def}</p>
          </div>
        ))}
      </div>

      {/* Tabela comparativa */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">Comparação</p>
        <div className="overflow-x-auto rounded-3xl border border-stone-100 dark:border-stone-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500">Critério</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500">Rota Tradicional</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-dark dark:text-brand-mint">MoR</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Papel legal", "Freelancer é o vendedor", "MoR é o vendedor"],
                ["Gestão de IVA", "Manual — registo MOSS/OSS global", "Automatizada em 200+ jurisdições"],
                ["Faturação AT", "1 fatura por cada venda", "1 fatura mensal (payout)"],
                ["Risco fiscal", "Assumido por ti", "Transferido para o MoR"],
                ["Estornos", "Manual — nota de crédito", "Tratados pelo MoR"],
                ["Afiliados", "Não disponível", "Sistema integrado"],
                ["Setup", "Semanas", "Minutos"],
              ].map(([c, t, m], i) => (
                <tr key={i} className="border-t border-stone-50 dark:border-stone-800/50">
                  <td className="px-4 py-2.5 text-xs text-stone-500">{c}</td>
                  <td className="px-4 py-2.5 text-xs text-stone-400 line-through">{t}</td>
                  <td className="px-4 py-2.5 text-xs font-medium text-brand-dark dark:text-brand-mint">{m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="button"
        onClick={onProximo}
        className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
      >
        Percebo — vamos ao recibo <ArrowRight size={14} />
      </button>
    </div>
  );
}

function Passo1({ mor, onSelectMor, onProximo }: {
  mor: string;
  onSelectMor: (m: string) => void;
  onProximo: () => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
        Escolhe o teu MoR
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { id: "paddle",   label: "Paddle",          sub: "Reino Unido" },
          { id: "lemonsqueezy", label: "Lemon Squeezy", sub: "EUA — propriedade da Stripe desde 2023" },
        ].map((m) => (
          <button
            type="button"
            key={m.id}
            onClick={() => onSelectMor(m.id)}
            className={`rounded-3xl border p-5 text-left transition-all ${
              mor === m.id
                ? "border-brand bg-brand-light dark:bg-brand/10"
                : "border-stone-100 dark:border-stone-800 hover:border-stone-300"
            }`}
          >
            <p className="font-semibold text-stone-800 dark:text-stone-100">{m.label}</p>
            <p className="text-xs text-stone-400 mt-1">{m.sub}</p>
            {mor === m.id && (
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                <Check size={11} /> Selecionado
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-stone-400">
        Se usas outro MoR estrangeiro sem estabelecimento estável em Portugal, o princípio é o mesmo.
      </p>
      <button
        type="button"
        onClick={onProximo}
        disabled={!mor}
        className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-all"
      >
        Próximo passo <ArrowRight size={14} />
      </button>
    </div>
  );
}

function Passo2({ mor, checks, onToggle, onProximo }: {
  mor: string;
  checks: boolean[];
  onToggle: (i: number) => void;
  onProximo: () => void;
}) {
  const nomes = { paddle: "Paddle.com Market Ltd", lemonsqueezy: "Lemon Squeezy LLC" };
  const paises = { paddle: "Reino Unido", lemonsqueezy: "Estados Unidos" };
  const nome  = nomes[mor as keyof typeof nomes] ?? "Nome do MoR";
  const pais  = paises[mor as keyof typeof paises] ?? "País do MoR";

  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
        Configurar o adquirente no Portal das Finanças
      </h2>
      <TabelaInstrucao rows={[
        { campo: "Tipo de adquirente", valor: "Não residente sem estabelecimento estável" },
        { campo: "Nome",               valor: nome },
        { campo: "País",               valor: pais },
      ]} />
      <Callout tipo="aviso">
        Nunca uses a opção "Empresa residente em Portugal". O MoR é sempre entidade estrangeira.
      </Callout>
      <div className="space-y-2">
        {[
          `Selecionei "Não residente sem estabelecimento estável"`,
          `Preenchi o nome correto do MoR (${nome})`,
          `Selecionei o país correto (${pais})`,
        ].map((label, i) => (
          <CheckItem key={i} label={label} checked={checks[i]} onToggle={() => onToggle(i)} />
        ))}
      </div>
      <button
        type="button"
        onClick={onProximo}
        disabled={!checks.every(Boolean)}
        className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-all"
      >
        Próximo passo <ArrowRight size={14} />
      </button>
    </div>
  );
}

function Passo3({ checks, onToggle, onProximo }: {
  checks: boolean[];
  onToggle: (i: number) => void;
  onProximo: () => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
        Configurar IVA e Retenção na Fonte
      </h2>
      <TabelaInstrucao rows={[
        { campo: "IVA",                valor: "IVA – autoliquidação",           legal: "Art. 6.º CIVA — inversão do sujeito passivo" },
        { campo: "Retenção na Fonte",  valor: "Sem retenção — Não residente",   legal: "Art. 101.º CIRS" },
      ]} />
      <Callout tipo="erro">
        <strong>Atenção:</strong> Nunca uses o Art. 101.º-B do CIRS (dispensa entre nacionais) para
        entidades estrangeiras. A opção correta para não residentes é{" "}
        <strong>"Sem retenção — Não residente"</strong>, sem qualquer artigo nacional associado.
      </Callout>
      <div className="space-y-2">
        {[
          `Selecionei "IVA – autoliquidação"`,
          `Selecionei "Sem retenção — Não residente"`,
          `Confirmei que NÃO selecionei o Art. 101.º-B`,
        ].map((label, i) => (
          <CheckItem key={i} label={label} checked={checks[i]} onToggle={() => onToggle(i)} />
        ))}
      </div>
      <button
        type="button"
        onClick={onProximo}
        disabled={!checks.every(Boolean)}
        className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-all"
      >
        Próximo passo <ArrowRight size={14} />
      </button>
    </div>
  );
}

function Passo4({ valor, setValor, onProximo }: {
  valor: string;
  setValor: (v: string) => void;
  onProximo: () => void;
}) {
  const num = parseFloat(valor.replace(",", ".")) || 0;
  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
        Calcular e confirmar o montante
      </h2>
      <div>
        <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
          Valor do payout recebido (€)
        </label>
        <input
          type="number"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0,00"
          className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>
      {num > 0 && (
        <>
          <div className="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800">
            {[
              { label: "Valor do payout (base do recibo)", valor: fmt(num) },
              { label: "IVA (autoliquidação — liquidado pelo MoR)", valor: "€ 0,00" },
              { label: "Retenção na fonte", valor: "€ 0,00" },
            ].map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 text-sm border-t border-stone-50 dark:border-stone-800/50 first:border-0">
                <span className="text-stone-500">{r.label}</span>
                <span className="font-medium text-stone-700 dark:text-stone-300">{r.valor}</span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-stone-200 dark:border-stone-700 bg-brand-light dark:bg-brand/10 px-4 py-3 text-sm">
              <span className="font-semibold text-brand-dark dark:text-brand-mint">Valor que entra na tua conta</span>
              <span className="font-bold text-brand-dark dark:text-brand-mint">{fmt(num)} (100 %)</span>
            </div>
          </div>
          <Callout tipo="ok">
            Recibo emitido corretamente. 100 % do payout é líquido — sem IVA a entregar ao Estado, sem retenção imediata.
          </Callout>
        </>
      )}
      <button
        type="button"
        onClick={onProximo}
        disabled={num <= 0}
        className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-all"
      >
        Ver próximos passos <ArrowRight size={14} />
      </button>
    </div>
  );
}

function Passo5({ valor }: { valor: string }) {
  const num    = parseFloat(valor.replace(",", ".")) || 0;
  const ss     = num * SS_COEFICIENTE.servicos.value * SS_TAXA.value;
  // IRS estimado via escalões progressivos sobre o rendimento coletável anualizado
  // Regime simplificado: rendimento coletável = payout anual × coeficiente Art. 151.º (0,75)
  const payoutAnual = num * 12;
  const coletavel   = payoutAnual * REGIME_SIMPLIFICADO.coefServicos151.value;
  const irsAnual    = irsProgressivo(coletavel);
  const irsEst      = irsAnual / 12;

  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
        Próximos passos
      </h2>
      <div className="space-y-3">
        {[
          "Guarda o comprovativo do recibo emitido.",
          "Declara este rendimento no IRS de abril/maio do ano seguinte como rendimentos da Categoria B.",
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-3 text-sm text-stone-600 dark:text-stone-400">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white text-[10px] font-bold mt-0.5">{i + 1}</span>
            {t}
          </div>
        ))}
      </div>
      {num > 0 && (
        <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 p-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Reserva obrigatória</p>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Segurança Social (estimativa)</span>
            <span className="font-semibold text-stone-700 dark:text-stone-300">{fmt(ss)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">IRS (estimativa — Regime Simplificado)</span>
            <span className="font-semibold text-stone-700 dark:text-stone-300">{fmt(irsEst)}</span>
          </div>
          <p className="pt-1 text-[10px] text-stone-400">
            IRS calculado via escalões progressivos (Art. 68.º CIRS) sobre o rendimento coletável
            anualizado com coeficiente {(REGIME_SIMPLIFICADO.coefServicos151.value * 100).toFixed(0)} %
            (Art. 31.º CIRS). Estimativa — confirma com contabilista.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <a href="/guias/clientes-estrangeiros" className="text-sm font-semibold text-brand hover:underline">
          Guia clientes estrangeiros →
        </a>
        <a href="/ferramentas/regime-simplificado" className="text-sm font-semibold text-brand hover:underline">
          Calculadora regime simplificado →
        </a>
      </div>
      <Callout tipo="ok">
        Concluído! O teu recibo ao MoR está configurado corretamente para 100 % de payout líquido.
      </Callout>
    </div>
  );
}

// ── Wizard principal ──────────────────────────────────────────────────────────

export default function Wizard() {
  const [passo, setPasso]       = useState(0);
  const [mor,   setMor]         = useState("");
  const [valor, setValor]       = useState("");
  const [checks2, setChecks2]   = useState([false, false, false]);
  const [checks3, setChecks3]   = useState([false, false, false]);

  const toggleChecks2 = (i: number) =>
    setChecks2((c) => c.map((v, j) => (j === i ? !v : v)));
  const toggleChecks3 = (i: number) =>
    setChecks3((c) => c.map((v, j) => (j === i ? !v : v)));

  return (
    <div className="rounded-4xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 shadow-card">
      <BarraProgresso passo={passo + 1} total={TOTAL_PASSOS} />
      {passo === 0 && <Passo0 onProximo={() => setPasso(1)} />}
      {passo === 1 && <Passo1 mor={mor} onSelectMor={setMor} onProximo={() => setPasso(2)} />}
      {passo === 2 && <Passo2 mor={mor} checks={checks2} onToggle={toggleChecks2} onProximo={() => setPasso(3)} />}
      {passo === 3 && <Passo3 checks={checks3} onToggle={toggleChecks3} onProximo={() => setPasso(4)} />}
      {passo === 4 && <Passo4 valor={valor} setValor={setValor} onProximo={() => setPasso(5)} />}
      {passo === 5 && <Passo5 valor={valor} />}
      {passo > 0 && passo < 5 && (
        <button
          type="button"
          onClick={() => setPasso((p) => p - 1)}
          className="mt-6 text-xs text-stone-400 hover:text-stone-600"
        >
          ← Voltar
        </button>
      )}
    </div>
  );
}
