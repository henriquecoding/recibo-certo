import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
// Regra 1: as taxas comerciais são SEMESTRAIS e os 40 € vêm do diploma —
// escritos no corpo do guia, ficariam desatualizados em silêncio.
import { INDEMNIZACAO_CUSTOS_COBRANCA, JUROS_MORA, PRAZO_PAGAMENTO_SUPLETIVO_DIAS } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("juros-de-mora");

export default function JurosDeMoraPage() {
  return (
    <GuiaLayout slug="juros-de-mora">
      <Seccao titulo="Quando é que a fatura se vence">
        <Paragrafo>
          Se o contrato fixa uma data, é essa. Se não fixa nada — o caso mais comum em prestações de
          serviços combinadas por email — a lei supre o silêncio com prazos próprios para as
          transações comerciais.
        </Paragrafo>
        <TabelaPrazos
          colunas={["Situação", "Prazo supletivo"]}
          linhas={[
            ["Regra geral", "30 dias a contar da data em que o devedor recebeu a fatura"],
            ["Data da fatura incerta", "30 dias após a receção efetiva dos bens ou serviços"],
            ["Fatura recebida antes da entrega", "30 dias após a receção efetiva"],
            ["Há processo de aceitação ou verificação", "30 dias após a aceitação ou verificação"],
          ]}
        />
        <Paragrafo>
          As partes podem acordar prazos diferentes, mas não sem limite: entre empresas o prazo não
          deve, em regra, exceder 60 dias, e um prazo superior só vale se tiver sido expressamente
          acordado e não for manifestamente abusivo para o credor.
        </Paragrafo>
        <Nota titulo="Com entidades públicas o prazo é o mesmo">
          A regra supletiva com entidades públicas são os mesmos {PRAZO_PAGAMENTO_SUPLETIVO_DIAS.value}{" "}
          dias. O que muda não é a duração — é a <strong>margem de estipulação</strong>: o prazo não
          pode ser livremente alargado por acordo, e o teto de 60 dias só vale em casos tipificados
          na lei, designadamente entidades do setor da saúde.
        </Nota>
      </Seccao>

      {/* A taxa era o que faltava. O guia explicava quando os juros nascem,
          que nascem sozinhos e os 40 € — e nunca dizia a que taxa se contam.
          A taxa comercial é semestral, fixada por Aviso, por isso vem do
          motor com vigência declarada. */}
      <Seccao titulo="A que taxa se contam">
        <TabelaPrazos
          colunas={["Situação", "Taxa", "Base legal"]}
          linhas={[
            [
              "Transações comerciais (DL 62/2013)",
              pctExato(JUROS_MORA.transacoesComerciais.value),
              "§ 5.º do Art. 102.º do Código Comercial · Aviso n.º 822/2026/2",
            ],
            [
              "Outros créditos comerciais",
              pctExato(JUROS_MORA.outrosCreditosComerciais.value),
              "§ 3.º do Art. 102.º do Código Comercial · mesmo Aviso",
            ],
            [
              "Obrigações civis",
              pctExato(JUROS_MORA.civis.value),
              "Portaria n.º 291/2003",
            ],
          ]}
        />
        <Nota titulo="A diferença entre as duas primeiras linhas é dinheiro">
          Quem cobra uma fatura entre empresas ao abrigo do regime dos atrasos de pagamento tem
          direito à taxa mais alta — e aplica quase sempre a mais baixa. A distinção é subtil e vale
          um ponto percentual em cada ano de atraso.
        </Nota>
        <Nota titulo="As taxas comerciais mudam de seis em seis meses">
          São fixadas por Aviso da Entidade do Tesouro e Finanças em janeiro e em julho. As acima
          valem até {JUROS_MORA.vigenciaComercialAte.split("-").reverse().join("/")} — passada essa
          data, confirma o Aviso do semestre seguinte antes de fechar uma conta.
        </Nota>
      </Seccao>

      <Seccao titulo="Os juros começam sozinhos">
        <Paragrafo>
          Esta é a parte que quase toda a gente desconhece: nas transações comerciais o credor tem
          direito a juros de mora <strong>sem necessidade de interpelação</strong>, a contar do dia
          seguinte à data de vencimento. Não é preciso enviar aviso nenhum para os juros nascerem.
        </Paragrafo>
        <Paragrafo>
          A interpelação escrita continua a valer a pena — mas como prova, não como condição. É ela
          que documenta as diligências de cobrança, e essa documentação é exigida mais à frente,
          quando quiseres recuperar o IVA.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="A indemnização que quase ninguém cobra">
        <Paragrafo>
          Além dos juros, o credor tem direito a um montante mínimo de{" "}
          {fmt(INDEMNIZACAO_CUSTOS_COBRANCA.value)} a título de indemnização
          pelos custos de cobrança — também sem necessidade de interpelação. É um valor fixo,
          devido por cada fatura em mora, e acresce aos juros.
        </Paragrafo>
        <Nota titulo="E se os custos forem maiores">
          Os {fmt(INDEMNIZACAO_CUSTOS_COBRANCA.value)} são um mínimo. Se tiveres despesas
          superiores e comprovadas com a cobrança do crédito, podes exigir o que exceder aquele valor.
        </Nota>
      </Seccao>

      <Seccao titulo="A quem se aplica">
        <Paragrafo>
          O regime das transações comerciais cobre contratos entre empresas e entre empresas e
          entidades públicas. Se o teu devedor é um consumidor particular, este regime não se
          aplica e as regras dos juros são outras.
        </Paragrafo>
        <VaiPara href="/guias/cobrar-divida">
          Já contei os juros — como é que cobro isto?
        </VaiPara>
        <VaiPara href="/guias/fatura-nao-paga">
          Porque é que já paguei imposto desta fatura
        </VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
