import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";

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
          acordado e não for manifestamente abusivo para o credor. Com entidades públicas os prazos
          são, em regra, mais curtos.
        </Paragrafo>
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

      <Seccao titulo="Os 40 € que quase ninguém cobra">
        <Paragrafo>
          Além dos juros, o credor tem direito a um montante mínimo de 40 € a título de indemnização
          pelos custos de cobrança — também sem necessidade de interpelação. É um valor fixo,
          devido por cada fatura em mora, e acresce aos juros.
        </Paragrafo>
        <Nota titulo="E se os custos forem maiores">
          Os 40 € são um mínimo. Se tiveres despesas superiores e comprovadas com a cobrança do
          crédito, podes exigir o que exceder aquele valor.
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
