import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("plano-prestacoes");

export default function PlanoPrestacoesPage() {
  return (
    <GuiaLayout slug="plano-prestacoes">
      <Seccao titulo="Quantas prestações dá">
        <Paragrafo>
          O pagamento em prestações é autorizado, em regra, até ao limite máximo de{" "}
          <strong>36 prestações mensais</strong>, quando se demonstre que a situação económica do
          devedor não lhe permite solver a dívida de uma só vez. Cada prestação tem um valor mínimo
          legal.
        </Paragrafo>
        <TabelaPrazos
          colunas={["Situação", "Prestações", "Condição"]}
          linhas={[
            ["Regra geral", "Até 36", "Situação económica não permite pagar de uma vez"],
            [
              "Dificuldade financeira notória",
              "Até 5 anos",
              "Previsíveis consequências económicas gravosas e dívida superior a 500 unidades de conta",
            ],
          ]}
        />
        <Nota titulo="Há casos mais longos">
          A lei prevê ainda períodos mais extensos em contextos de insolvência ou de processos de
          recuperação de empresas, quando a administração o considere necessário. São situações
          específicas e não a regra.
        </Nota>
      </Seccao>

      <Seccao titulo="O que é preciso demonstrar">
        <Paragrafo>
          O plano não é automático: depende de demonstrares que não consegues pagar de uma só vez. É
          essa a razão pela qual o pedido deve vir acompanhado de elementos concretos sobre a tua
          situação económica, e não apenas da vontade de pagar mais devagar.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="O risco de falhar uma prestação">
        <AvisoPrazo titulo="O plano cai">
          O incumprimento das prestações tem consequências: o plano deixa de proteger e a execução
          retoma o seu curso normal, com os atos de penhora que estavam suspensos. Antes de aceitar
          um plano, confirma que o valor mensal é sustentável no pior mês do ano, não no melhor.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Prestações não é o mesmo que contestar">
        <Paragrafo>
          Pedir prestações é assumir a dívida e organizar o pagamento. Se o que discutes é a
          legalidade do imposto, o caminho é outro — e os dois não se confundem.
        </Paragrafo>
        <VaiPara href="/guias/contestar-liquidacao">Discordo do valor: contestar</VaiPara>
        <VaiPara href="/guias/suspender-execucao">Suspender a execução com garantia</VaiPara>
        <VaiPara href="/guias/execucao-fiscal">Onde estou no processo</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
