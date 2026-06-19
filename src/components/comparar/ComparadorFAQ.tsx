"use client";

// FAQ do comparador — separada por cenário (por conta de outrem · recibos
// verdes · empresa). Responde às dúvidas típicas de quem está a decidir o
// caminho, complementando os números do comparador. pt-PT, sem dados inventados.

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Plus, User, Receipt, Building } from "@/components/ui/Icons";
import { EASE } from "@/lib/motion";

type Cenario = { titulo: string; sub: string; Icone: typeof User; itens: { q: string; a: string }[] };

const CENARIOS: Cenario[] = [
  {
    titulo: "Por conta de outrem",
    sub: "Categoria A · contrato de trabalho",
    Icone: User,
    itens: [
      {
        q: "O que desconto ao salário?",
        a: "Ao salário bruto descontam-se 11% para a Segurança Social e a retenção na fonte de IRS, segundo a tabela da tua situação familiar. Em 2026, salários mensais até 920 € (o salário mínimo) estão isentos de retenção de IRS — descontas apenas os 11% da Segurança Social.",
      },
      {
        q: "Que proteção social ganho que um independente não tem?",
        a: "Subsídio de desemprego, baixa por doença mais cedo e com cálculo mais favorável, férias e subsídios de férias e de Natal pagos, e a Segurança Social paga em grande parte pela entidade (Taxa Social Única de 23,75%). É o caminho de maior estabilidade e menor carga administrativa.",
      },
      {
        q: "Posso deduzir despesas da minha atividade?",
        a: "Não. Ao contrário dos recibos verdes e da empresa, um trabalhador por conta de outrem não deduz despesas de atividade ao rendimento. Por isso, no comparador, o campo de despesas não altera este cenário.",
      },
    ],
  },
  {
    titulo: "Recibos verdes",
    sub: "Categoria B · regime simplificado",
    Icone: Receipt,
    itens: [
      {
        q: "Como é tributado o meu rendimento?",
        a: "No regime simplificado, o IRS incide sobre uma percentagem da faturação dada pelo coeficiente da atividade (0,75 nas prestações de serviços do Art. 151.º). À parte, pagas Segurança Social de 21,4% sobre 70% da faturação de serviços. O comparador usa estes pressupostos.",
      },
      {
        q: "Quando tenho de cobrar IVA?",
        a: "Se o teu volume de negócios anual ultrapassar 15.000 € (2026), ficas obrigado a cobrar IVA e a entregar declarações periódicas. Abaixo desse valor aplica-se a isenção do Art. 53.º do CIVA.",
      },
      {
        q: "Tenho custos fixos como nos recibos verdes?",
        a: "Praticamente nenhuns: a abertura de atividade é gratuita no Portal das Finanças e não há contabilista obrigatório nem custos de estrutura. É o caminho mais simples e barato de arrancar — daí compensar até faturações mais altas.",
      },
      {
        q: "E a Segurança Social no primeiro ano?",
        a: "Existe isenção total de contribuições durante os primeiros 12 meses de atividade. Mesmo assim, é obrigatório entregar as declarações trimestrais. No 13.º mês, as contribuições começam automaticamente.",
      },
    ],
  },
  {
    titulo: "Empresa (Lda)",
    sub: "Sociedade · IRC + dividendos",
    Icone: Building,
    itens: [
      {
        q: "Porque é que a empresa só compensa em faturações altas?",
        a: "O lucro da sociedade paga IRC (15% até 50.000 € e 19% no excedente, regime PME) e, ao distribuir, os dividendos pagam 28%. Acresce a estrutura obrigatória (contabilista, constituição). Só quando a poupança fiscal sobre rendimentos elevados supera esses custos fixos é que a empresa ultrapassa os recibos verdes — o ponto de equilíbrio aparece marcado no slider.",
      },
      {
        q: "Que custos fixos tem uma empresa?",
        a: "Constituição na ordem de ~1.200 € (registo + contabilista certificado) e contabilidade organizada obrigatória, tipicamente 150–300 €/mês. Há ainda obrigações declarativas mais exigentes. O comparador permite somar estas despesas no campo respetivo.",
      },
      {
        q: "O comparador modela tudo o que uma empresa permite?",
        a: "Não. É uma estimativa de ordem de grandeza: assume distribuição integral de dividendos e não modela salário/Segurança Social do gerente, tributação autónoma, englobamento de dividendos nem otimizações de salário vs. dividendos. Para uma decisão real, fala com um contabilista.",
      },
    ],
  },
];

export default function ComparadorFAQ() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section aria-labelledby="comparador-faq" className="mt-12">
      <h2 id="comparador-faq" className="font-display text-2xl font-semibold text-ink mb-2">
        Dúvidas por cenário
      </h2>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-8 max-w-xl">
        As perguntas que decidem o caminho — respondidas separadamente para cada opção.
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        {CENARIOS.map((cenario) => (
          <div key={cenario.titulo}>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light">
                <cenario.Icone size={17} className="text-brand-dark" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100">{cenario.titulo}</h3>
                <p className="text-[11px] text-stone-400">{cenario.sub}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {cenario.itens.map((faq) => {
                const id = `${cenario.titulo}::${faq.q}`;
                const isOpen = open === id;
                return (
                  <div
                    key={faq.q}
                    className={`overflow-hidden rounded-2xl border bg-white dark:bg-stone-800 transition-colors ${
                      isOpen ? "border-brand shadow-card" : "border-stone-200 dark:border-stone-700"
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : id)}
                      className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    >
                      <span className={`text-sm font-semibold ${isOpen ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>
                        {faq.q}
                      </span>
                      <m.div
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${isOpen ? "bg-brand" : "bg-stone-100 dark:bg-stone-700"}`}
                      >
                        <Plus size={11} className={isOpen ? "text-white" : "text-stone-500 dark:text-stone-300"} />
                      </m.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <m.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <p className="px-4 pb-4 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{faq.a}</p>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
