import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado a 07/08/2026: art. 15.º, art. 71.º (n.os 4 e 11 a 13) e
// art. 101.º do CIRS, e a página oficial de formulários da AT para as
// convenções — «Modelos 21-RFI a 24-RFI», Mod. 2-RFI e Modelo 30.
//
// O pacote pede que se indique qual dos quatro formulários se aplica a cada
// caso. A tabela que faz essa correspondência é servida por JavaScript na
// página da AT e não é legível no corpo da resposta; escrevê-la de memória
// era inventar. O guia diz o que a página oficial afirma em texto — que são
// quatro e que a escolha depende do tipo de rendimento — e manda lá.
export default function CorpoModelo21Rfi() {
  return (
    <>
      <Seccao titulo="O que o formulário faz">
        <Paragrafo>
          Serve para um <strong>não residente</strong> pedir que Portugal não retenha, ou retenha
          menos, sobre um rendimento de fonte portuguesa — ao abrigo da convenção para evitar a dupla
          tributação celebrada entre Portugal e o país onde reside.
        </Paragrafo>
        <Paragrafo>
          Sem ele, a entidade portuguesa que paga aplica a <strong>taxa interna</strong>: a que
          consta da tabela de dados aqui em baixo, conforme a categoria. Com ele, e desde que
          devidamente instruído, aplica o limite da convenção — que é quase sempre inferior, e às
          vezes zero.
        </Paragrafo>
        <Nota titulo="A convenção não se aplica sozinha">
          Existir convenção entre os dois países não basta. A entidade que paga não tem como saber
          onde resides nem que convenção invocar: é o formulário, com o certificado anexo, que lho
          diz e que a protege se um dia lhe perguntarem porque reteve menos.
        </Nota>
      </Seccao>

      <Seccao titulo="Quem preenche o quê">
        <Paragrafo>
          O formulário tem partes de origens diferentes, e é aí que os processos encravam.
        </Paragrafo>
        <Paragrafo>
          · O <strong>beneficiário</strong> — quem recebe o rendimento — identifica-se, identifica o
          rendimento e declara a residência.
          <br />· A <strong>autoridade fiscal do país de residência</strong> certifica essa
          residência, ou emite um certificado autónomo que vai anexo.
          <br />· A <strong>entidade portuguesa</strong> que paga é a destinatária: é ela que fica
          com o formulário, que aplica a taxa reduzida e que responde perante a AT por o ter feito.
        </Paragrafo>
        <Paragrafo>
          A AT publica quatro modelos — <strong>21-RFI a 24-RFI</strong> — e qual deles se usa
          depende do <strong>tipo de rendimento</strong>. Há ainda o{" "}
          <strong>Mod. 2-RFI</strong>, que serve a direção contrária: é o pedido de{" "}
          <em>certificado de residência fiscal em Portugal</em>, para quem é residente cá e precisa
          de o provar lá fora.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma o modelo na página da AT, não pelo número que alguém te disse">
          A correspondência entre modelo e tipo de rendimento consta da tabela publicada pela AT na
          página dos formulários das convenções, e os formulários são revistos. Escolher o modelo
          errado devolve o processo ao início — com a retenção pela taxa interna já feita entretanto.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O certificado de residência: o documento decisivo">
        <Paragrafo>
          O formulário sozinho não vale nada. O que faz a convenção funcionar é a{" "}
          <strong>certificação da residência fiscal</strong> pela autoridade competente do outro
          Estado — porque é o único documento que a AT aceita como prova de que aquela convenção se
          aplica àquela pessoa.
        </Paragrafo>
        <Paragrafo>
          Há países cuja administração certifica no próprio formulário. Há outros que não o fazem e
          emitem um certificado próprio, que segue anexo. As duas vias são aceites — o que não é
          aceite é a ausência de qualquer uma.
        </Paragrafo>
        <Nota titulo="Há Estados que comunicaram não poder certificar os formulários">
          A AT publica a lista desses Estados na mesma página. Se o teu país estiver lá, o caminho é
          o certificado autónomo emitido pela autoridade local, anexo ao formulário — e vale a pena
          confirmar a lista, porque é periodicamente atualizada.
        </Nota>
      </Seccao>

      <Seccao titulo="Validade e renovação anual">
        <Paragrafo>
          A certificação vale para o <strong>ano</strong> a que respeita. Não é um estatuto que se
          adquire: é uma prova datada, e um certificado do ano passado não sustenta a retenção
          reduzida deste ano.
        </Paragrafo>
        <Paragrafo>
          Quem recebe rendimentos recorrentes de Portugal — juros, dividendos, royalties, honorários
          continuados — tem de repetir o processo todos os anos, e antes do primeiro pagamento do
          ano, não depois.
        </Paragrafo>
        <AvisoPrazo titulo="Pede o certificado antes de precisares dele">
          A emissão depende da administração do outro país e demora semanas em vários deles. Quem só
          se lembra quando o pagamento está agendado chega tarde para esse pagamento — e passa a ter
          de recuperar o excesso em vez de o evitar.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que acontece se chegar tarde">
        <Paragrafo>
          A entidade portuguesa retém à <strong>taxa interna</strong>. Não é uma penalização: é o
          que a lei lhe manda fazer quando não tem em mãos a prova que autoriza a redução — e é ela
          que responde pelo imposto que deixasse de reter sem base.
        </Paragrafo>
        <Paragrafo>
          O rendimento não fica perdido nem duplamente tributado para sempre; fica com imposto pago a
          mais em Portugal, que se recupera pela via da secção seguinte.
        </Paragrafo>
        <Nota titulo="Prevenir custa um formulário; corrigir custa um processo">
          A diferença entre entregar o formulário a tempo e não o entregar é a diferença entre não
          pagar e pagar-e-pedir-de-volta, com prazos, formulários próprios e meses de espera. É a
          razão pela qual este guia insiste tanto no calendário.
        </Nota>
      </Seccao>

      <Seccao titulo="Reembolso quando a retenção já foi feita">
        <Paragrafo>
          Há duas vias, e não se confundem.
        </Paragrafo>
        <Paragrafo>
          A primeira é o <strong>pedido de reembolso do imposto retido em excesso</strong> face ao
          que a convenção permitia, feito à AT com o formulário próprio e o certificado de
          residência do ano em causa.
        </Paragrafo>
        <Paragrafo>
          A segunda existe só para quem reside na <strong>União Europeia ou no Espaço Económico
          Europeu</strong> com cooperação administrativa: o pedido de devolução da parte do imposto
          retido que exceda o que resultaria das taxas progressivas portuguesas. O prazo está na
          tabela de dados aqui em baixo — conta-se do{" "}
          <strong>final do ano civil seguinte</strong> àquele em que se verificou o facto tributário,
          e não da data do pagamento.
        </Paragrafo>
        <AvisoPrazo titulo="O excesso acima da convenção não se recupera cá">
          Se a retenção foi feita à taxa interna quando a convenção permitia menos, é a Portugal que
          se pede. Mas se foi <em>outro país</em> a reter acima do que a convenção lhe permitia, esse
          excesso não é creditável em Portugal — recupera-se lá.
        </AvisoPrazo>
        <VaiPara href="/guias/credito-imposto-estrangeiro">
          O duplo limite do crédito, do lado de quem é residente cá
        </VaiPara>
        <VaiPara href="/guias/nao-residentes-irs">
          As taxas internas que o formulário serve para evitar
        </VaiPara>
      </Seccao>

      <Seccao titulo="Checklist antes do primeiro pagamento do ano">
        <Passos
          passos={[
            {
              titulo: "Confirmar que existe convenção com o país de residência",
              texto: "A lista das convenções em vigor é publicada pela AT. Sem convenção, não há formulário a preencher — aplica-se a taxa interna.",
            },
            {
              titulo: "Identificar o tipo de rendimento e o modelo correspondente",
              texto: "Na tabela publicada pela AT na página dos formulários das convenções. É por aí que se escolhe entre os modelos 21-RFI a 24-RFI.",
            },
            {
              titulo: "Pedir o certificado de residência do ano em curso",
              texto: "À autoridade fiscal do país onde resides. Um certificado do ano anterior não serve.",
            },
            {
              titulo: "Entregar à entidade portuguesa antes do pagamento",
              texto: "A entidade tem de o ter em mãos no momento em que retém. Depois do pagamento a taxa interna já foi aplicada, e o caminho passa a ser o do reembolso.",
            },
            {
              titulo: "Guardar cópia de tudo",
              texto: "Formulário, certificado e comprovativo de entrega. É o que sustenta a retenção reduzida se a AT vier perguntar à entidade que pagou.",
            },
            {
              titulo: "Repetir no início de cada ano",
              texto: "A certificação é anual. O calendário é a parte difícil deste processo, não o formulário.",
            },
          ]}
        />
      </Seccao>
    </>
  );
}
