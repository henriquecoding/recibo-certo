// ═══════════════════════════════════════════════════════════════════════
//  EXPLORAR MERCADO — os dossiers curados, no HTML e encontráveis
//  ---------------------------------------------------------------------
//  Ponto 28 do pedido separa «recomendado para ti» de «explorar mercado».
//  A primeira é, por natureza, dinâmica: depende de um contexto que só
//  existe no browser de quem responde. A segunda não — e é ela que
//  resolve dois problemas ao mesmo tempo:
//
//   · a checklist editorial exige conteúdo essencial renderizado no
//     servidor, legível sem JavaScript e por um motor de busca;
//   · os dossiers curados continuam a ter valor como leitura, mesmo
//     para quem não quer responder a um formulário.
//
//  Este ficheiro continua a ser Server Component e continua a não ter
//  estado. O que mudou foi a apresentação: vinte e quatro fichas com
//  sete campos cada, todas abertas, eram uma muralha de texto sem uma
//  única forma de procurar lá dentro. A organização passou para
//  `MercadoFiltravel`, que é cliente — e que o servidor renderiza na
//  mesma, pelo que o HTML sem JavaScript não perde uma palavra.
// ═══════════════════════════════════════════════════════════════════════

import {
  OPPORTUNITY_SECTORS,
  OPPORTUNITY_TEMPLATES,
  templateHasLiveEvidence,
} from "@/lib/negocio/market/opportunities";
import MercadoFiltravel, { type DossierDeMercado } from "./MercadoFiltravel";

/** As faixas de capital, com o rótulo que vai ao ecrã. */
const CAPITAIS = [
  { id: "ate-500", rotulo: "Até 500 €" },
  { id: "500-3000", rotulo: "500–3 000 €" },
  { id: "mais-3000", rotulo: "Mais de 3 000 €" },
] as const;

const ENTREGAS = [
  { id: "local", rotulo: "Presencial" },
  { id: "hibrido", rotulo: "Híbrido" },
  { id: "remoto", rotulo: "Remoto" },
] as const;

const rotuloDe = (lista: readonly { id: string; rotulo: string }[], id: string) =>
  lista.find((item) => item.id === id)?.rotulo ?? id;

export default function ExplorarMercado() {
  const dossiers: DossierDeMercado[] = OPPORTUNITY_TEMPLATES.map((template) => ({
    id: template.id,
    titulo: template.title,
    promessa: template.promise,
    problema: template.problem,
    cliente: template.customer,
    setor: template.sector,
    setorRotulo:
      OPPORTUNITY_SECTORS.find((item) => item.id === template.sector)?.label ?? template.sector,
    modeloDeReceita: template.revenueModel,
    requisitos: template.criticalRequirements,
    primeiroTeste: template.firstCustomerPath,
    testeQueMata: template.falsificationTest,
    notaDeEvidencia: template.evidenceNote,
    fontesLigadas: templateHasLiveEvidence(template)
      ? template.evidencePlan.filter((item) => item.status === "live").map((item) => item.source)
      : [],
    capital: template.capital,
    capitalRotulo: rotuloDe(CAPITAIS, template.capital),
    entrega: template.delivery,
    entregaRotulo: template.delivery.map((forma) => rotuloDe(ENTREGAS, forma)).join(" ou "),
    hrefPreco: `/ferramentas/recibos-verdes?modo=preco&cenario=${template.pricingScenario}&h=${encodeURIComponent(template.id)}`,
  }));

  const comIngestao = dossiers.filter((item) => item.fontesLigadas.length > 0).length;

  return (
    <section aria-labelledby="explorar-mercado" className="space-y-4">
      <div>
        <h2 id="explorar-mercado" className="font-display text-2xl font-semibold text-ink">
          Explorar mercado
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-500">
          Os {dossiers.length} dossiers curados que servem de referência ao motor — {comIngestao}{" "}
          deles com fontes oficiais ligadas. Não são o universo de respostas: o motor compõe
          hipóteses a partir do que sabes fazer, e a maior parte do que devolve não está escrita aqui.
          Estes existem porque foram revistos por uma pessoa, e é por isso que valem como padrão de
          comparação.
        </p>
      </div>

      <MercadoFiltravel
        dossiers={dossiers}
        setores={OPPORTUNITY_SECTORS.map((item) => ({ id: item.id, rotulo: item.label }))}
        capitais={[...CAPITAIS]}
        entregas={[...ENTREGAS]}
      />
    </section>
  );
}
