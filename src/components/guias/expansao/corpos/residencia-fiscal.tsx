import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { RESIDENCIA_FISCAL } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 07/08/2026:
// art. 16.º do CIRS (n.os 1 a 7 e 13 a 16), art. 15.º do CIRS e art. 19.º da
// Lei Geral Tributária.
//
// O pacote de expansão avisa: distinguir residência fiscal (art. 16.º CIRS)
// de domicílio fiscal (art. 19.º LGT) e de autorização de residência — são
// três coisas diferentes e confundem-se sempre. É a primeira secção.
export default function CorpoResidenciaFiscal() {
  return (
    <>
      <Seccao titulo="Os critérios do art. 16.º CIRS">
        <Paragrafo>
          A lei enumera quatro situações, e <strong>basta uma</strong>. Não é uma escada de
          requisitos: é uma lista de portas, e quem entra por qualquer delas é residente.
        </Paragrafo>
        <Paragrafo>
          · <strong>Permanência</strong> — os dias, que a secção seguinte conta.
          <br />· <strong>Habitação</strong> — dispor cá de casa em condições que revelem a intenção
          de a manter como residência habitual.
          <br />· <strong>Tripulantes</strong> de navios ou aeronaves ao serviço de entidades com
          residência, sede ou direção efetiva cá, a 31 de dezembro.
          <br />· <strong>Funções públicas</strong> exercidas no estrangeiro ao serviço do Estado
          Português — onde a lei inclui expressamente os deputados ao Parlamento Europeu.
        </Paragrafo>
        <Nota titulo="Três coisas com nomes parecidos e efeitos diferentes">
          A <strong>residência fiscal</strong> é a do art. 16.º e decide o que Portugal tributa. O{" "}
          <strong>domicílio fiscal</strong> é a morada que consta no cadastro da AT, do art. 19.º da
          Lei Geral Tributária, e serve para te notificarem. A <strong>autorização de residência</strong>{" "}
          é um título de imigração. Ter uma não determina as outras — dá para ser residente fiscal
          sem autorização de residência, e para ter autorização de residência sem ser residente
          fiscal.
        </Nota>
      </Seccao>

      <Seccao titulo="Contar 183 dias: qual o período de referência">
        <Paragrafo>
          É aqui que quase toda a gente erra, e o erro não está no número — está na janela. A lei não
          diz «no ano civil»: diz <strong>em qualquer período de {RESIDENCIA_FISCAL.janelaMeses.value}{" "}
          meses com início ou fim no ano em causa</strong>.
        </Paragrafo>
        <Paragrafo>
          É uma janela deslizante. Quem esteve cá de setembro a dezembro de um ano e de janeiro a
          abril do seguinte não tem 183 dias em nenhum dos dois anos civis — mas tem-nos no período
          de doze meses a cavalo dos dois. E esse período tem início num ano e fim no outro, o que é
          precisamente o que a lei manda considerar.
        </Paragrafo>
        <Paragrafo>
          Os dias podem ser <strong>seguidos ou interpolados</strong>: quem entra e sai várias vezes
          soma tudo. E conta-se como dia de presença{" "}
          <strong>{RESIDENCIA_FISCAL.contaComoDia.value}</strong>.
        </Paragrafo>
        <Nota titulo="A dormida é o que conta, e conta duas vezes">
          Chegar de manhã e dormir cá faz o dia contar. Dormir cá e partir no dia seguinte faz esse
          dia contar também. Numa ida e volta de fim de semana, contam os dois dias — a regra da
          dormida é generosa a somar.
        </Nota>
        <AvisoPrazo titulo="São MAIS de 183, não 183">
          No dia 183 ainda não és residente por esta via. É no 184.º que o critério se preenche. A
          diferença parece pedante e não é: quem planeia a permanência ao limite decide-se por um dia.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O critério da habitação">
        <Paragrafo>
          Este dispensa a contagem por completo. Quem permaneceu menos tempo é ainda assim residente
          se, <strong>num qualquer dia</strong> daquele período de doze meses, dispuser cá de{" "}
          {RESIDENCIA_FISCAL.criterioHabitacao.value}.
        </Paragrafo>
        <Paragrafo>
          Repara na formulação. Não é «ter casa»: é ter casa <em>em condições que façam supor
          intenção atual de a manter e ocupar como residência habitual</em>. O que a lei procura não
          é a propriedade — é o sinal de que aquela casa é a tua vida, e não um investimento ou uma
          casa de férias.
        </Paragrafo>
        <Nota titulo="Não depende de ser tua">
          Uma casa arrendada preenche o critério tão bem como uma comprada. E ter um apartamento
          arrendado a terceiros, ou fechado e sem uso, aponta no sentido contrário: não está em
          condições de ser ocupado como residência habitual por ti.
        </Nota>
      </Seccao>

      <Seccao titulo="Residência parcial: o ano dividido em dois">
        <Paragrafo>
          Portugal admite que o mesmo ano tenha dois estatutos. Quem preenche os critérios torna-se
          residente desde o <strong>{RESIDENCIA_FISCAL.inicioResidencia.value}</strong> — e não desde
          1 de janeiro, nem desde o dia em que passou o 183.º dia.
        </Paragrafo>
        <Paragrafo>
          Há uma exceção que apanha quem vai e volta: se tiveres sido residente em{" "}
          <em>qualquer dia do ano anterior</em>, és residente desde 1 de janeiro do ano em que se
          verifique qualquer dos critérios. Do outro lado, a perda da qualidade de residente ocorre
          a partir do <strong>{RESIDENCIA_FISCAL.fimResidencia.value}</strong>.
        </Paragrafo>
        <Paragrafo>
          Em cada um dos dois períodos aplica-se a regra do respetivo estatuto: no período de
          residente, o rendimento mundial; no de não residente, só o obtido em Portugal.
        </Paragrafo>
        <AvisoPrazo titulo="A residência é de cada pessoa, não do casal">
          A lei diz que a residência fiscal é aferida em relação a{" "}
          <strong>cada sujeito passivo do agregado</strong>. Um cônjuge pode ser residente e o outro
          não, no mesmo ano e na mesma casa. É frequente em mudanças escalonadas, quando um vai à
          frente e o outro fica a fechar a vida no país de origem.
        </AvisoPrazo>
        <VaiPara href="/guias/primeiro-ano-fiscal-portugal">
          O primeiro ano de quem chega, passo a passo
        </VaiPara>
        <VaiPara href="/guias/sair-de-portugal">
          O ano da saída — e as regras que o podem tornar inteiro
        </VaiPara>
      </Seccao>

      <Seccao titulo="Dupla residência e a regra de desempate da convenção">
        <Paragrafo>
          Nada impede que dois países te considerem residente ao mesmo tempo: cada um aplica a sua
          lei interna, e as leis não combinam entre si. Quando isso acontece, e existe convenção para
          evitar a dupla tributação entre os dois, é a <strong>convenção</strong> que desempata.
        </Paragrafo>
        <Paragrafo>
          As convenções seguem uma ordem de critérios, aplicados por degraus até um deles resolver: a
          habitação permanente, depois o centro de interesses vitais, depois a permanência habitual,
          depois a nacionalidade — e, se nenhum resolver, o acordo entre as autoridades dos dois
          Estados. Desempatar não é escolher: é seguir a escada.
        </Paragrafo>
        <Nota titulo="A convenção não te tira do cadastro cá">
          Ser desempatado a favor do outro Estado resolve a dupla tributação, mas não substitui a
          comunicação da alteração à AT. Enquanto o cadastro disser que resides cá, a AT trata-te
          como residente.
        </Nota>
        <VaiPara href="/guias/convencao-dupla-tributacao">
          Como ler uma convenção, artigo a artigo
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que muda em concreto quando és residente">
        <Paragrafo>
          Muda a base de incidência, que é a coisa maior. Sendo residente, o IRS incide sobre a{" "}
          <strong>totalidade</strong> dos teus rendimentos, incluindo os obtidos fora de Portugal.
          Sendo não residente, incide unicamente sobre os obtidos em território português.
        </Paragrafo>
        <Paragrafo>
          Com isso vêm as taxas progressivas e as deduções à coleta, que os não residentes não têm; a
          obrigação de declarar o que se recebeu lá fora, com o crédito de imposto correspondente; e
          a obrigação de identificar contas abertas em instituições financeiras não residentes.
        </Paragrafo>
        <AvisoPrazo titulo="Comunicar a alteração tem prazo">
          Sempre que se altere o estatuto de residência, a comunicação à administração tributária
          faz-se em <strong>{RESIDENCIA_FISCAL.prazoComunicarDias.value} dias</strong>. E a mudança de
          domicílio é <em>ineficaz</em> enquanto não for comunicada — não basta ter mudado de vida,
          é preciso que o cadastro saiba.
        </AvisoPrazo>
        <Nota titulo="Mudar-se para um regime fiscal mais favorável não corta já">
          Os nacionais portugueses que deslocalizem a residência para um país, território ou região
          constante da lista aprovada por portaria continuam havidos como residentes no ano da
          mudança e nos {RESIDENCIA_FISCAL.paraisoFiscalAnos.value} anos seguintes — salvo prova de
          razões atendíveis, como uma atividade temporária por conta de entidade patronal
          domiciliada cá.
        </Nota>
        <VaiPara href="/guias/nao-residentes-irs">
          Como Portugal tributa quem cá não reside
        </VaiPara>
        <VaiPara href="/guias/anexo-j">
          O anexo do estrangeiro, que só existe para residentes
        </VaiPara>
      </Seccao>
    </>
  );
}
