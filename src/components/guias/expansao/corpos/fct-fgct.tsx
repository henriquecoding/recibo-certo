import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { COMPENSACAO_DESPEDIMENTO, COMPENSACAO_TETO_GLOBAL } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026 quanto ao art. 366.º, n.º 3 do Código do
// Trabalho, que é a norma que liga a compensação ao FGCT. As taxas de
// contribuição e as regras de acionamento constam da Lei n.º 70/2013 e
// respetiva regulamentação, que NÃO foi possível ler em fonte oficial
// legível nesta revisão — e por isso não são publicadas aqui.
export default function CorpoFctFgct() {
  return (
    <>
      <Seccao titulo="Dois fundos, e a confusão entre eles">
        <Paragrafo>
          O <strong>FCT</strong> — Fundo de Compensação do Trabalho — e o <strong>FGCT</strong> — Fundo
          de Garantia de Compensação do Trabalho — nasceram juntos e são frequentemente tratados como
          um só. Não são.
        </Paragrafo>
        <Paragrafo>
          · O <strong>FCT</strong> é um fundo de <strong>capitalização</strong>: a empresa entrega
          contribuições que ficam <strong>tituladas por ela</strong>, para financiar parte da
          compensação que venha a dever.
          <br />· O <strong>FGCT</strong> é um fundo de <strong>garantia</strong>: existe para{" "}
          <strong>o trabalhador</strong> receber parte da compensação quando o empregador não a paga.
        </Paragrafo>
        <Nota titulo="Um serve a empresa, o outro serve-te a ti">
          É a distinção que resolve quase todas as dúvidas práticas — a começar por quem pode acionar
          cada um.
        </Nota>
      </Seccao>

      <Seccao titulo="A norma que os liga à compensação">
        <Paragrafo>
          O Código do Trabalho diz, a propósito da compensação por despedimento, que{" "}
          <strong>o empregador é responsável pelo pagamento da totalidade</strong> da compensação — sem
          prejuízo do <strong>direito do trabalhador a acionar o FGCT</strong>, nos termos previstos em
          legislação específica.
        </Paragrafo>
        <Paragrafo>
          Duas coisas importantes ficam ditas nessa frase. A primeira: a existência dos fundos{" "}
          <strong>não reduz</strong> o que o empregador deve. A segunda: quem aciona o FGCT é{" "}
          <strong>o trabalhador</strong>, e é um direito seu.
        </Paragrafo>
        <AvisoPrazo titulo="«O fundo paga» não é resposta a quem exige a compensação">
          A obrigação continua a ser integralmente da empresa. O fundo é uma garantia adicional, não
          uma transferência de responsabilidade.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Que compensação é esta">
        <Paragrafo>
          A dos despedimentos por motivos da empresa e da caducidade de contratos:{" "}
          <strong>{COMPENSACAO_DESPEDIMENTO.diasPorAno.value} dias</strong> de retribuição base e
          diuturnidades por cada ano completo de antiguidade, com os tetos do Código — o global não
          pode exceder {COMPENSACAO_DESPEDIMENTO.tetoGlobalEmSmn.value} vezes o salário mínimo, hoje{" "}
          <strong>{fmt(COMPENSACAO_TETO_GLOBAL)}</strong>.
        </Paragrafo>
        <Paragrafo>
          É esse o valor de referência a que os fundos se reportam — e é por isso que qualquer conversa
          sobre eles começa por saber quanto é a compensação devida.
        </Paragrafo>
        <VaiPara href="/guias/despedimento">
          Como se calcula a compensação, com os dois tetos
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que este guia não publica, e porquê">
        <Paragrafo>
          As <strong>taxas de contribuição</strong> para cada fundo, a <strong>percentagem</strong> da
          compensação que o FGCT assegura e as <strong>condições e prazos de acionamento</strong>{" "}
          constam da Lei n.º 70/2013 e da sua regulamentação.
        </Paragrafo>
        <Paragrafo>
          Não foi possível ler esse diploma em fonte oficial com texto consolidado nesta revisão, e
          estes são exatamente os números que não se publicam por aproximação: uma percentagem errada
          leva um trabalhador a aceitar menos do que lhe cabe, e uma taxa errada leva uma empresa a
          contribuir a menos durante anos.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma-os no portal dos fundos de compensação">
          É onde vivem as taxas em vigor, o histórico de contribuições da tua entidade empregadora e os
          formulários de acionamento. E confirma também se a tua relação laboral está abrangida — o
          regime aplica-se a contratos celebrados a partir de certa data.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Como se verifica se a empresa contribuiu">
        <Paragrafo>
          É a verificação que ninguém faz e que decide o que se recebe no fim. As contribuições são
          mensais e ficam registadas — e é possível consultar o histórico associado ao teu vínculo.
        </Paragrafo>
        <Paragrafo>
          Uma empresa que não contribuiu não deixa de dever a compensação; deixa é de ter meio de a
          financiar, o que costuma coincidir com não a conseguir pagar.
        </Paragrafo>
        <Nota titulo="Verifica no início, não no fim">
          Descobrir na semana da cessação que não há contribuições registadas há três anos não muda
          nada. Descobri-lo enquanto se trabalha permite reclamar.
        </Nota>
      </Seccao>

      <Seccao titulo="Passo a passo, quando o contrato acaba">
        <Passos
          passos={[
            {
              titulo: "Calcular a compensação devida, com os tetos do Código",
              texto: "É o número contra o qual tudo o resto se compara. Sem ele, não é possível saber se o que foi oferecido está certo.",
            },
            {
              titulo: "Exigir o pagamento integral ao empregador",
              texto: "A responsabilidade é dele pela totalidade. O fundo não é o primeiro sítio a bater à porta.",
            },
            {
              titulo: "Não aceitar a compensação sem reservas se pretenderes contestar",
              texto: "Recebê-la na íntegra presume aceitação do despedimento, e a presunção só se ilide devolvendo tudo em simultâneo.",
            },
            {
              titulo: "Consultar o histórico de contribuições do teu vínculo",
              texto: "Antes de acionar seja o que for. É o que mostra se há fundo capitalizado e desde quando.",
            },
            {
              titulo: "Não sendo paga, acionar o FGCT",
              texto: "É um direito do trabalhador, expressamente ressalvado no Código. As condições e prazos constam da legislação específica — confirma-os no portal dos fundos.",
            },
            {
              titulo: "Guardar o comprovativo da cessação e do valor devido",
              texto: "Carta de despedimento, declaração de situação de desemprego, recibos finais. É a base documental de qualquer pedido.",
            },
          ]}
        />
        <VaiPara href="/guias/fim-do-contrato">
          Todas as contas finais, e por que ordem se conferem
        </VaiPara>
        <VaiPara href="/guias/subsidio-desemprego">
          O passo seguinte, e o prazo de inscrição
        </VaiPara>
      </Seccao>
    </>
  );
}
