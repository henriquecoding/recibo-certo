import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Merchant of Record para freelancers em Portugal 2026 | ReciboCerto",
  description: "O que é um MoR, como funciona o payout mensal e como emitir o recibo verde ao Paddle ou Lemon Squeezy com zero burocracia fiscal.",
  alternates: { canonical: "https://www.recibocerto.pt/guias/merchant-of-record" },
};

const TABELA_COLS = ["Critério", "Rota Tradicional (Stripe + InvoiceXpress)", "Paddle", "Lemon Squeezy"];

const TABELA_LINHAS: [string, string, string, string][] = [
  ["Papel legal", "Freelancer é o vendedor direto", "MoR — vendedor legal", "MoR — vendedor legal"],
  ["Taxa base", "2,9 % + €0,30 + 0,5 % (Tax)", "5 % + €0,50/transação", "5 % + €0,50/transação"],
  ["Gestão de IVA", "Manual — registos MOSS/OSS globais", "Automatizada em 200+ países", "Automatizada em 200+ países"],
  ["Faturação AT", "1 fatura certificada por venda (SAF-T)", "1 fatura mensal ao MoR", "1 fatura mensal ao MoR"],
  ["Risco fiscal", "Assumido pelo freelancer", "Transferido para o MoR", "Transferido para o MoR"],
  ["Estornos", "Manual — nota de crédito", "Tratados autonomamente", "Tratados autonomamente"],
  ["Assinaturas", "Integração webhook complexa", "Dunning, pausas, prorrogação", "Dunning básico + portal cliente"],
  ["B2B / Faturação empresarial", "Não disponível", "Suportado", "Limitado"],
  ["Sistema de afiliados", "Não disponível", "Integrado", "Integrado (+ email marketing)"],
  ["Setup", "Semanas de desenvolvimento", "Dias (aprovação manual)", "Minutos (ativação imediata)"],
];

const FLUXO = ["Cliente", "paga ao MoR", "MoR liquida IVA global", "MoR envia payout mensal", "Freelancer emite 1 recibo verde"];

export default function GuiaMoRPage() {
  return (
    <>
      <GuiaHero
        eyebrow="Faturação Internacional"
        titulo="Merchant of Record para freelancers em Portugal"
        descricao="O que é um MoR, como funciona o payout mensal e como emitir um único recibo verde ao Paddle ou Lemon Squeezy — com zero burocracia fiscal internacional."
        tempoLeitura={5}
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          O que é um Merchant of Record
        </h2>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
          Um <strong className="text-stone-800 dark:text-stone-200">Merchant of Record (MoR)</strong> é a entidade que atua como vendedor legal perante
          o cliente final. Ao subscreveres o Paddle ou o Lemon Squeezy como MoR do teu SaaS, é o MoR
          — não tu — que aparece na fatura do cliente, que liquida o IVA em cada país e que suporta o risco
          de estornos e disputas. Tu recebes apenas um único <em>payout</em> mensal consolidado, limpo
          de qualquer complexidade fiscal internacional.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Porquê o MoR elimina a burocracia SAF-T
        </h2>
        <p className="mb-3 text-stone-600 dark:text-stone-400 leading-relaxed">
          A legislação da Autoridade Tributária (AT) exige que cada transação gere uma fatura
          certificada com SAF-T PT. Se venderes diretamente via Stripe, cada subscrição — independentemente
          do país do cliente — gera uma obrigação de faturação individual. Com 500 subscritores, são 500
          faturas por mês, cada uma com implicações de IVA MOSS diferentes consoante o país do comprador.
        </p>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
          Com o MoR, o fluxo inverte: o MoR emite as faturas individuais para cada cliente em nome próprio.
          Tu emites apenas <strong className="text-stone-800 dark:text-stone-200">1 recibo verde por mês</strong> ao MoR, referente ao payout recebido.
          O SAF-T passa de 500 documentos para 1.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Tabela comparativa
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-stone-100 dark:border-stone-800">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-stone-50 dark:bg-stone-800/50">
              <tr>
                {TABELA_COLS.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 dark:text-stone-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABELA_LINHAS.map(([c, t, p, ls], i) => (
                <tr key={i} className="border-t border-stone-50 dark:border-stone-800/50">
                  <td className="px-4 py-2.5 text-xs font-medium text-stone-600 dark:text-stone-400">{c}</td>
                  <td className="px-4 py-2.5 text-xs text-stone-400">{t}</td>
                  <td className="px-4 py-2.5 text-xs font-medium text-brand-dark dark:text-brand-mint">{p}</td>
                  <td className="px-4 py-2.5 text-xs font-medium text-brand-dark dark:text-brand-mint">{ls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs italic text-stone-400">
          A diferença de ~2,1 % entre a Rota Tradicional e o MoR é irrelevante comparada com as +10 horas
          anuais de labor administrativo eliminadas. Foca-te em escalar o produto, não em gerir impostos.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Fluxo de pagamento com MoR
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-600 dark:text-stone-400">
          {FLUXO.map((s, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <span className="rounded-xl bg-stone-100 dark:bg-stone-800 px-3 py-1.5 text-xs">{s}</span>
              {i < arr.length - 1 && <ArrowRight size={13} className="text-stone-300 dark:text-stone-600" />}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Configuração do recibo verde
        </h2>
        <p className="mb-4 text-stone-600 dark:text-stone-400 leading-relaxed">
          O recibo ao MoR segue três regras fiscais simples: tipo de adquirente &laquo;não residente sem
          estabelecimento estável&raquo;, IVA em autoliquidação (Art. 6.º CIVA) e sem retenção na fonte
          (Art. 101.º CIRS). O resultado é 100&nbsp;% do payout líquido, sem IVA a entregar ao Estado
          e sem retenção imediata.
        </p>
        <Link
          href="/ferramentas/payout-mor"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
        >
          Wizard passo-a-passo para configurar o recibo
          <ArrowRight size={14} />
        </Link>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Lemon Squeezy vs. Paddle em 2026
        </h2>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
          A <strong className="text-stone-800 dark:text-stone-200">Lemon Squeezy</strong> é propriedade da Stripe desde 2023, oferecendo uma infraestrutura
          híbrida que combina a simplicidade do MoR com a solidez da maior rede de pagamentos global —
          incluindo suporte nativo a MB WAY e Multibanco em Portugal. O{" "}
          <strong className="text-stone-800 dark:text-stone-200">Paddle</strong> tem funcionalidades B2B mais avançadas: faturação empresarial com NIF,
          checkout personalizado e dunning configurável — ideal se o teu produto serve empresas.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Sistema de afiliados via MoR
        </h2>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
          Ambas as plataformas oferecem sistemas de afiliados integrados sem infraestrutura adicional. O
          Paddle e o Lemon Squeezy rastreiam conversões, calculam comissões e processam pagamentos aos
          afiliados automaticamente — permitindo crescimento orgânico a partir do momento em que o produto
          tem tração, sem código extra.
        </p>
      </section>
    </>
  );
}
