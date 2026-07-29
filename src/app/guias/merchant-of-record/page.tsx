import type { Metadata } from "next";
import Link from "next/link";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { ArrowRight, Warning, Info } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";

// ═══════════════════════════════════════════════════════════════════════
//  Reescrito integralmente na sequência da auditoria de 26/07/2026 (P0 3.8).
//
//  A versão anterior era o único Guia sem qualquer fonte e afirmava, como
//  regra geral, que o MoR "elimina o SAF-T", que basta "1 recibo por mês" e
//  que o resultado é "100 % do payout líquido". Nenhuma destas afirmações é
//  universal: dependem do contrato, de quem é juridicamente o vendedor, do
//  fluxo financeiro, da localização e do tipo de cliente.
//
//  Regras editoriais desta página:
//    · separar o funcionamento COMERCIAL do tratamento FISCAL;
//    · nenhum exemplo de faturação concreto sem revisão especializada;
//    · preços e funcionalidades das plataformas apenas como referência
//      comercial datada, nunca como regra;
//    · "MOSS" substituído por OSS (o MOSS foi substituído em julho de 2021).
// ═══════════════════════════════════════════════════════════════════════

export const metadata: Metadata = metadataDoGuia("merchant-of-record");

const REFERENCIA_COMERCIAL = "julho de 2026";

// Só características estruturais, verificáveis no contrato de cada
// plataforma. Comissões e funcionalidades mudam sem aviso e não são
// reproduzidas aqui como se fossem estáveis.
const COMPARACAO: { criterio: string; direta: string; mor: string }[] = [
  {
    criterio: "Quem é o vendedor perante o cliente final",
    direta: "És tu. O teu nome e o teu NIF aparecem no documento.",
    mor: "A plataforma. É o nome dela que aparece no documento ao cliente.",
  },
  {
    criterio: "Quem cobra e entrega o IVA de cada país",
    direta: "Tu, segundo as regras de localização aplicáveis.",
    mor: "A plataforma, no âmbito do contrato que assinaste com ela.",
  },
  {
    criterio: "Quem suporta estornos e disputas",
    direta: "Tu.",
    mor: "Tipicamente a plataforma — confirma no contrato.",
  },
  {
    criterio: "O que recebes",
    direta: "O pagamento de cada cliente.",
    mor: "Um pagamento agregado da plataforma, já líquido das comissões dela.",
  },
  {
    criterio: "A quem prestas o serviço, do ponto de vista contratual",
    direta: "A cada cliente final.",
    mor: "Depende do contrato. É esta a pergunta que determina tudo o resto.",
  },
];

const PERGUNTAS = [
  "Quem é identificado no contrato como vendedor perante o cliente final?",
  "Quem emite o documento ao cliente final, e em nome de quem?",
  "Qual é a sede da entidade que te paga, e o que diz o contrato sobre a natureza dessa relação?",
  "O que estás efetivamente a ceder ou a prestar: uma licença, um serviço, um direito?",
  "O fluxo financeiro passa por ti em algum momento, ou só recebes o agregado?",
];

export default function GuiaMoRPage() {
  return (
    <GuiaLayout
      slug="merchant-of-record"
      descricaoHero="O que muda comercialmente quando uma plataforma passa a ser o vendedor legal — e por que razão o tratamento fiscal depende do teu contrato, não de uma regra geral."
    >
      <section className="mb-10">
        <h2 className="mb-4 font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
          O que é um Merchant of Record
        </h2>
        <p className="leading-relaxed text-stone-600 dark:text-stone-400">
          Um <strong className="text-stone-800 dark:text-stone-200">Merchant of Record (MoR)</strong> é
          uma plataforma que assume, perante o cliente final, o papel de vendedor. É o nome dela que
          aparece no documento do cliente, é ela que cobra, e é com ela que o cliente reclama. Tu
          deixas de ter uma relação comercial com cada comprador e passas a ter uma relação com a
          plataforma.
        </p>
        <p className="mt-3 leading-relaxed text-stone-600 dark:text-stone-400">
          Essa mudança é comercial e contratual. O que ela significa em termos fiscais{" "}
          <strong className="text-stone-800 dark:text-stone-200">não é automático</strong> — e é aí
          que quase toda a informação disponível online se atrapalha.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
          Como funciona comercialmente
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-stone-100 dark:border-stone-800">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">
              Comparação entre vender diretamente e vender através de um Merchant of Record
            </caption>
            <thead className="bg-stone-50 dark:bg-stone-800/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500 dark:text-stone-400">
                  Critério
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500 dark:text-stone-400">
                  Venda direta
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500 dark:text-stone-400">
                  Através de um MoR
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARACAO.map((l) => (
                <tr key={l.criterio} className="border-t border-stone-50 dark:border-stone-800/50">
                  <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-stone-600 dark:text-stone-400">
                    {l.criterio}
                  </th>
                  <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400">{l.direta}</td>
                  <td className="px-4 py-3 text-xs text-stone-600 dark:text-stone-300">{l.mor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-stone-400">
          <Info size={12} className="mt-0.5 flex-shrink-0" />
          Comissões, funcionalidades e cobertura geográfica das plataformas mudam sem aviso.
          Confirma na documentação de cada uma antes de decidir — qualquer valor reproduzido aqui
          seria apenas uma referência comercial datada de {REFERENCIA_COMERCIAL}.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
          Como pode ser tratado fiscalmente
        </h2>

        <div className="rounded-3xl border border-clay-text/30 bg-clay-bg px-5 py-4 dark:bg-red-950/30">
          <div className="mb-2 flex items-center gap-2">
            <Warning size={15} className="text-clay-text" />
            <Badge tone="danger">Não há resposta única</Badge>
          </div>
          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            É frequente ler que, com um MoR, passas a emitir «um recibo por mês» e que o SAF-T
            deixa de existir. Pode ser verdade na tua situação — ou não. O tratamento correto
            depende do contrato, de quem é o verdadeiro adquirente do teu serviço, do fluxo
            financeiro, da localização das partes e do papel jurídico que a plataforma assume.
          </p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-stone-800 dark:text-stone-100">
            Não fixes um procedimento de faturação sem validar estes pontos com um contabilista.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-stone-100 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <p className="mb-3 text-sm font-semibold text-stone-800 dark:text-stone-100">
            As perguntas que determinam o enquadramento
          </p>
          <ol className="space-y-2">
            {PERGUNTAS.map((p, i) => (
              <li key={p} className="flex items-start gap-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-stone-100 text-[11px] font-semibold text-stone-500 dark:bg-stone-800">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            As regras de localização das prestações de serviços constam do Art. 6.º do CIVA. Quando
            o caso envolve vendas à distância ou serviços eletrónicos dentro da União Europeia, o
            regime aplicável é o Balcão Único (OSS), que substituiu o MOSS em 1 de julho de 2021 —
            terminologia que ainda aparece em muita documentação desatualizada.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
          Antes de configurares o documento
        </h2>
        <p className="mb-4 leading-relaxed text-stone-600 dark:text-stone-400">
          O assistente abaixo ajuda-te a organizar os dados do payout e a perceber que decisões
          existem. Não decide o teu enquadramento nem emite nada: o resultado é uma preparação para
          levares a quem te acompanha fiscalmente.
        </p>
        <Link
          href="/ferramentas/payout-mor"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
        >
          Abrir o assistente de payout
          <ArrowRight size={14} />
        </Link>
      </section>
    </GuiaLayout>
  );
}
