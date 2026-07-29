import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, Passos, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("contestar-liquidacao");

export default function ContestarLiquidacaoPage() {
  return (
    <GuiaLayout slug="contestar-liquidacao">
      <Seccao titulo="Há mais do que aceitar ou pagar">
        <Paragrafo>
          Uma liquidação com que não concordas não tem de ser aceite. Existem vias administrativas e
          judiciais para a contestar, com fundamentos comuns e prazos diferentes. O que não existe é
          margem depois de o prazo passar.
        </Paragrafo>
        <AvisoPrazo titulo="Estes prazos não se recuperam">
          São prazos de caducidade do direito de reagir. Não se suspendem por estares a negociar com
          os serviços, nem por teres pedido esclarecimentos. Se passam, o direito extingue-se — mesmo
          que tenhas razão quanto ao fundo.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Os prazos">
        <TabelaPrazos
          colunas={["Meio", "Prazo", "Onde se apresenta"]}
          linhas={[
            ["Reclamação graciosa", "120 dias", "Serviços da Autoridade Tributária"],
            ["Impugnação judicial", "3 meses", "Tribunal tributário"],
          ]}
        />
        <Paragrafo>
          Ambos os prazos contam a partir dos factos enumerados no n.º 1 do artigo 102.º do CPPT —
          entre eles o termo do prazo de pagamento voluntário do imposto e a notificação dos demais
          atos tributários. A reclamação graciosa pode ser deduzida com os mesmos fundamentos
          previstos para a impugnação judicial.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Como decidir o caminho">
        <Passos
          passos={[
            {
              titulo: "Identifica a data que faz correr o prazo",
              texto: (
                <>
                  Não é a data da carta nem a do teu conhecimento informal. É um dos factos do
                  artigo 102.º, n.º 1 — tipicamente o termo do prazo de pagamento voluntário.
                </>
              ),
              base: "Art. 102.º, n.º 1 CPPT",
            },
            {
              titulo: "Reúne os fundamentos todos de uma vez",
              texto: (
                <>
                  Os fundamentos têm de ser invocados no requerimento. Não é boa ideia guardar
                  argumentos para depois — e em regra não se acrescentam mais tarde.
                </>
              ),
            },
            {
              titulo: "Decide se pagas, garantes ou nenhum dos dois",
              texto: (
                <>
                  Contestar não impede a cobrança por si só. Suspender a execução depende de
                  garantia ou da sua dispensa, e essa é uma decisão com custos que deve ser
                  ponderada com apoio profissional.
                </>
              ),
            },
          ]}
        />
      </Seccao>

      <Seccao titulo="Quando o caminho é outro">
        <Nota titulo="Se o erro foi teu">
          Se apenas queres corrigir um lapso na declaração que entregaste, a via não é a reclamação
          — é a declaração de substituição.
        </Nota>
        <Nota titulo="Se os prazos já passaram">
          Resta ver se existe fundamento para revisão oficiosa do ato tributário, que tem
          pressupostos mais restritos e prazos próprios. Vale a pena confirmar antes de assumir que
          não há nada a fazer.
        </Nota>
        <VaiPara href="/guias/prazos-fiscais-divida">
          Até quando é que a AT pode liquidar e cobrar
        </VaiPara>
        <VaiPara href="/guias/reembolso-irs">
          Perceber o apuramento antes de contestar
        </VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
