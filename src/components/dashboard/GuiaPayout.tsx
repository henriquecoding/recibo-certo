"use client";

import { useState } from "react";
import { m, AnimatePresence } from "motion/react";
import { Check, ChevronDown, ExternalLink, ShieldCheck, Warning } from "@/components/ui/Icons";
import { EASE } from "@/lib/motion";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Passo {
  numero: number;
  titulo: string;
  campo?: string;
  valor: string;
  base_legal: string;
  explicacao: string;
  aviso?: string;
}

// ── Dados dos 3 passos fiscais (fonte: Plano Estratégico ReciboCerto 2026) ───

const PASSOS: Passo[] = [
  {
    numero: 1,
    titulo: "Tipo de adquirente",
    campo: "Campo «Adquirente»",
    valor: "Não residente sem estabelecimento estável",
    base_legal: "Art. 6.º CIVA — Inversão do sujeito passivo",
    explicacao:
      "O Lemon Squeezy é uma empresa com sede nos EUA (ou UK), sem estabelecimento estável em Portugal. Ao selecionar este tipo, estás a declarar que o pagador do payout é uma entidade não residente — o que activa o mecanismo de autoliquidação de IVA.",
    aviso:
      "Não selecionar «Pessoa Singular» nem «Empresa residente» — mesmo que o IBAN de payout seja português.",
  },
  {
    numero: 2,
    titulo: "IVA — Autoliquidação",
    campo: "Campo «IVA»",
    valor: "IVA – autoliquidação",
    base_legal: "Art. 6.º CIVA — Prestação de serviços a não residentes",
    explicacao:
      "A inversão do sujeito passivo (\"reverse charge\") significa que é o destinatário do serviço — tu — quem declara e paga o IVA, e não o prestador estrangeiro. Na prática: o IVA é auto-liquidado a 0% porque se anula (declaras e deduzes na mesma declaração), pelo que não há saída real de dinheiro.",
    aviso: undefined,
  },
  {
    numero: 3,
    titulo: "Retenção na Fonte",
    campo: "Campo «Retenção na Fonte»",
    valor: "Sem retenção — Não residente",
    base_legal: "Art. 101.º CIRS — Entidades sem estabelecimento estável",
    explicacao:
      "O Lemon Squeezy, como entidade não residente sem estabelecimento estável em Portugal, não está sujeita ao regime de retenção na fonte português. Ao selecionar esta opção, o payout mensal é recebido a 100% líquido — sem qualquer retenção imediata de IRS.",
    aviso:
      "Isto não elimina o teu imposto de IRS sobre estes rendimentos — apenas adia o pagamento para a declaração anual. Continua a reservar para o IRS.",
  },
];

// ── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    pergunta: "Preciso de fazer uma fatura por cada subscritor?",
    resposta:
      "Não. Com o Lemon Squeezy como MoR, recebes um único payout mensal e fazes apenas 1 fatura para o mês inteiro. O Lemon Squeezy emite as faturas individuais para cada cliente em nome deles mesmos.",
  },
  {
    pergunta: "E o IVA dos clientes estrangeiros?",
    resposta:
      "100% gerido pela LS. Registos IVA MOSS, taxas locais, declarações em 200+ jurisdições — nada disso é problema teu. É a principal razão para usar um MoR.",
  },
  {
    pergunta: "Como declaro este rendimento no IRS?",
    resposta:
      "O payout mensal entra como rendimento de Categoria B (serviços). Na declaração anual de IRS, declaras o total recebido ao longo do ano — tal como qualquer outro recibo verde. O ReciboCerto ajuda-te a estimar o valor ao longo do ano.",
  },
  {
    pergunta: "A taxa de 5% do Lemon Squeezy compensa?",
    resposta:
      "O plano estratégico é claro: a diferença de 2,1% face ao Stripe puro é irrelevante comparada com as +10 horas de trabalho administrativo e risco legal que poupas por ano. O Lemon Squeezy faz sentido logo a partir das primeiras vendas.",
  },
];

// ── Componentes auxiliares ───────────────────────────────────────────────────

function PassoCard({ passo, aberto, onToggle }: {
  passo: Passo;
  aberto: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`rounded-3xl border transition-all duration-200 ${
      aberto
        ? "border-brand/30 bg-white shadow-card dark:bg-stone-900"
        : "border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900"
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-bold transition-colors ${
          aberto ? "bg-brand text-white" : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
        }`}>
          {passo.numero}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{passo.titulo}</p>
          {passo.campo && (
            <p className="text-xs text-stone-400 mt-0.5">{passo.campo}</p>
          )}
        </div>
        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
          aberto ? "bg-brand/10 text-brand" : "text-stone-300 dark:text-stone-600"
        }`}>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {aberto && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3">
              {/* Valor a selecionar */}
              <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-light dark:bg-brand/10 p-4">
                <span className="mt-0.5 flex-shrink-0 text-brand">
                  <Check size={16} />
                </span>
                <div>
                  <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-0.5">
                    Selecionar
                  </p>
                  <p className="text-sm font-semibold text-brand-dark dark:text-brand-mint">
                    {passo.valor}
                  </p>
                  <p className="mt-1 text-xs text-brand-dark/70 dark:text-brand-mint/70">
                    {passo.base_legal}
                  </p>
                </div>
              </div>

              {/* Explicação */}
              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                {passo.explicacao}
              </p>

              {/* Aviso */}
              {passo.aviso && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-alert-border bg-alert-bg px-4 py-3 dark:border-amber-700/30 dark:bg-amber-950/20">
                  <span className="mt-0.5 flex-shrink-0 text-alert-text">
                    <Warning size={14} />
                  </span>
                  <p className="text-xs leading-relaxed text-alert-text dark:text-amber-400">
                    {passo.aviso}
                  </p>
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FaqItem({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="border-b border-stone-100 dark:border-stone-800 last:border-0">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{pergunta}</span>
        <ChevronDown
          size={15}
          className={`flex-shrink-0 text-stone-400 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {aberto && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              {resposta}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function GuiaPayout() {
  const [passoAberto, setPassoAberto] = useState<number | null>(1);

  const toggle = (n: number) => setPassoAberto((cur) => (cur === n ? null : n));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Cabeçalho explicativo */}
      <div className="rounded-4xl border border-brand/20 bg-brand-light p-6 dark:bg-brand/10">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink dark:text-stone-100">
              Arbitragem fiscal zero com o Lemon Squeezy
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              Como MoR, o Lemon Squeezy é o vendedor legal perante os teus clientes. Recebes
              um único payout mensal. Para esse payout, crias apenas{" "}
              <strong className="text-ink dark:text-stone-200">1 fatura por mês</strong> no
              Portal das Finanças — em vez de 1 por cada subscritor.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              Seguindo os 3 passos abaixo, o recibo é{" "}
              <strong className="text-ink dark:text-stone-200">
                100% líquido de retenção imediata
              </strong>{" "}
              e cumpre todas as obrigações fiscais portuguesas.
            </p>
          </div>
        </div>
      </div>

      {/* Tabela comparativa */}
      <div className="rounded-4xl border border-stone-100 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-400">
          O que muda com o MoR
        </p>
        <div className="space-y-2.5">
          {[
            { sem: "1 fatura por cada subscritor", com: "1 fatura mensal (payout)" },
            { sem: "Registos IVA MOSS globais", com: "Gerido pelo Lemon Squeezy" },
            { sem: "Risco fiscal assumido por ti", com: "Transferido para o MoR" },
            { sem: "Horas de backoffice por mês", com: "Config uma vez, zero depois" },
          ].map((r) => (
            <div
              key={r.sem}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm"
            >
              <span className="text-right text-stone-400 line-through">{r.sem}</span>
              <span className="text-xs text-stone-300">→</span>
              <span className="font-medium text-brand-dark dark:text-brand-mint">{r.com}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Os 3 passos */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
          Configuração no Portal das Finanças
        </p>
        <div className="space-y-2">
          {PASSOS.map((p) => (
            <PassoCard
              key={p.numero}
              passo={p}
              aberto={passoAberto === p.numero}
              onToggle={() => toggle(p.numero)}
            />
          ))}
        </div>
      </div>

      {/* Link externo */}
      <div className="flex items-center justify-center">
        <a
          href="https://www.portaldasfinancas.gov.pt"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-600 transition-all hover:border-brand/30 hover:text-brand-dark dark:border-stone-700 dark:text-stone-400 dark:hover:text-brand-mint"
        >
          Abrir Portal das Finanças
          <ExternalLink size={13} />
        </a>
      </div>

      {/* FAQ */}
      <div className="rounded-4xl border border-stone-100 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
          Perguntas frequentes
        </p>
        {FAQ.map((f) => (
          <FaqItem key={f.pergunta} pergunta={f.pergunta} resposta={f.resposta} />
        ))}
      </div>
    </div>
  );
}
