import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
// Regra 1: os limiares vêm do motor. A unidade de conta pode ser atualizada em
// cada Orçamento do Estado — escrita no texto, ficaria desatualizada em silêncio.
import { PLANO_PRESTACOES, PRESTACOES_ALARGAMENTO_LIMIAR_EUR, UNIDADE_CONTA } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("plano-prestacoes");

export default function PlanoPrestacoesPage() {
  return (
    <GuiaLayout slug="plano-prestacoes">
      {/* Vem primeiro de propósito: para a esmagadora maioria de quem chega a
          esta página — dívidas abaixo de 5 000 € — o plano já existe e não é
          preciso pedir nada. O guia dizia o contrário, e desencorajava a única
          ação que resolve o problema. */}
      <Seccao titulo="Se a dívida é pequena, o plano já está feito">
        <Paragrafo>
          Instaurada a execução por dívida até{" "}
          <strong>{fmt(PLANO_PRESTACOES.automaticoSingulares.value)}</strong> (pessoas singulares) ou{" "}
          <strong>{fmt(PLANO_PRESTACOES.automaticoColetivas.value)}</strong> (pessoas coletivas), a
          Autoridade Tributária cria <strong>oficiosamente</strong> um plano de pagamento em
          prestações. Sem pedido. Sem garantia. Sem teres de demonstrar seja o que for.
        </Paragrafo>
        <Paragrafo>
          O plano fica disponível na tua área reservada do Portal das Finanças, com os documentos de
          pagamento já emitidos. A primeira prestação vence-se no mês seguinte ao da notificação.
        </Paragrafo>
        <Nota titulo="O que continua a ser preciso da tua parte">
          Pagar. O plano oficioso caduca com a falta de pagamento da primeira prestação ou com a
          falta de três prestações — e aí a execução retoma o curso normal.
        </Nota>
      </Seccao>

      <Seccao titulo="Acima desses valores: o regime geral">
        <Paragrafo>
          Fora do plano oficioso, o pagamento em prestações é autorizado, em regra, até ao limite
          máximo de <strong>{PLANO_PRESTACOES.maximoGeral.value} prestações mensais</strong>, quando
          se demonstre que a situação económica do devedor não lhe permite solver a dívida de uma só
          vez. Cada prestação tem um valor mínimo legal, indexado à unidade de conta —{" "}
          {fmt(UNIDADE_CONTA.value)} em 2026.
        </Paragrafo>
        <TabelaPrazos
          colunas={["Situação", "Prestações", "Condição"]}
          linhas={[
            [
              "Plano oficioso",
              `Até ${PLANO_PRESTACOES.maximoGeral.value}`,
              `Dívida até ${fmt(PLANO_PRESTACOES.automaticoSingulares.value)} (singulares) ou ${fmt(PLANO_PRESTACOES.automaticoColetivas.value)} (coletivas) — criado pela AT, sem pedido nem garantia`,
            ],
            [
              "Regra geral",
              `Até ${PLANO_PRESTACOES.maximoGeral.value}`,
              "Demonstrando que a situação económica não permite pagar de uma vez",
            ],
            [
              "Dificuldade financeira notória",
              `Até ${PLANO_PRESTACOES.alargamentoAnos.value} anos`,
              `Previsíveis consequências económicas gravosas e dívida superior a ${PLANO_PRESTACOES.alargamentoLimiarUC.value} unidades de conta — ${fmt(PRESTACOES_ALARGAMENTO_LIMIAR_EUR)}`,
            ],
          ]}
        />
        <Nota titulo="Há casos mais longos">
          A lei prevê ainda períodos mais extensos em contextos de insolvência ou de processos de
          recuperação de empresas, quando a administração o considere necessário. São situações
          específicas e não a regra.
        </Nota>
      </Seccao>

      {/* A omissão mais séria do guia anterior: não dizia QUEM EXCLUI. */}
      <Seccao titulo="As dívidas que ficam de fora">
        <AvisoPrazo titulo="IVA e retenções na fonte não entram no regime geral">
          O regime geral não abrange as quantias <strong>retidas na fonte</strong> nem as{" "}
          <strong>legalmente repercutidas a terceiros</strong>. Por outras palavras: dívidas de IVA e
          de retenções na fonte — precisamente as que um trabalhador independente ou uma pequena
          sociedade acumulam — ficam fora do regime geral de prestações.
        </AvisoPrazo>
        <Paragrafo>
          Só a título excecional podem ser pagas em prestações, e aí exige-se a demonstração de uma
          dificuldade financeira <em>excecional</em> e de consequências económicas gravosas, com um
          número de prestações mais curto do que o do regime geral.
        </Paragrafo>
        <Nota titulo="Porque é que isto tem de estar aqui">
          Quem tem 8 000 € de IVA em atraso e lê apenas «até 36 prestações» faz o pedido e é
          indeferido — perdendo tempo que a execução não perdoa. Saber que a via é outra, desde o
          início, muda a decisão.
        </Nota>
      </Seccao>

      <Seccao titulo="O que é preciso demonstrar no regime geral">
        <Paragrafo>
          Fora do plano oficioso, o plano não é automático: depende de demonstrares que não consegues
          pagar de uma só vez. É essa a razão pela qual o pedido deve vir acompanhado de elementos
          concretos sobre a tua situação económica, e não apenas da vontade de pagar mais devagar.
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
        <VaiPara href="/guias/penhora-limites">O que me podem penhorar entretanto</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
