import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { RESIDENCIA_FISCAL } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 07/08/2026:
// art. 15.º, art. 16.º (n.os 1 a 3) e art. 3.º do CIRS, e art. 19.º da LGT.
//
// O pacote avisa: «não fazer afirmações sobre requisitos de imigração
// (rendimento mínimo, documentos) sem fonte AIMA — o guia deve ficar no
// perímetro fiscal e contributivo». É o que se faz: nem um requisito de
// visto é afirmado aqui, e a única coisa que se diz sobre imigração é que é
// outra coisa.
export default function CorpoNomadaDigitalD8() {
  return (
    <>
      <Seccao titulo="Visto, autorização de residência e residência fiscal">
        <Paragrafo>
          São três coisas com nomes parecidos, três autoridades diferentes e três efeitos que não se
          tocam. Confundi-las é o erro fundador de quase todos os problemas fiscais de quem se muda.
        </Paragrafo>
        <Paragrafo>
          O <strong>visto</strong> e a <strong>autorização de residência</strong> são títulos de
          imigração: dizem se podes entrar e permanecer legalmente, e quem os trata é a autoridade
          competente para os estrangeiros. Este guia não trata deles, nem afirma requisitos — para
          isso, a fonte é a autoridade de imigração, não a fiscal.
        </Paragrafo>
        <Paragrafo>
          A <strong>residência fiscal</strong> é outra coisa por completo. Decide-se pelos critérios
          do art. 16.º do Código do IRS, e decide o que Portugal tributa. Não depende de teres visto,
          nem de teres autorização de residência, nem de as teres pedido.
        </Paragrafo>
        <AvisoPrazo titulo="Podes tornar-te residente fiscal sem que ninguém to diga">
          Não há um formulário de «tornar-me residente fiscal» que alguém te apresente. Os critérios
          preenchem-se sozinhos, com o tempo e com a vida — e a obrigação de comunicar a alteração é
          tua, com prazo de {RESIDENCIA_FISCAL.prazoComunicarDias.value} dias. É a diferença mais
          cara deste guia.
        </AvisoPrazo>
        <VaiPara href="/guias/residencia-fiscal">
          Os quatro critérios de residência, e como se contam os dias
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quando começas a ser tributado cá">
        <Paragrafo>
          Pelo <strong>critério temporal</strong>, quando passas de{" "}
          {RESIDENCIA_FISCAL.diasPermanencia.value} dias em qualquer período de{" "}
          {RESIDENCIA_FISCAL.janelaMeses.value} meses com início ou fim no ano em causa. A janela é
          deslizante, e não o ano civil: quem entra em setembro e fica até maio passa o limiar sem
          nunca ter passado 183 dias em nenhum dos dois anos civis.
        </Paragrafo>
        <Paragrafo>
          E conta-se como dia de presença{" "}
          <strong>{RESIDENCIA_FISCAL.contaComoDia.value}</strong> — o que faz cada ida e volta somar
          dois dias, não zero.
        </Paragrafo>
        <AvisoPrazo titulo="O critério da habitação pode chegar primeiro">
          Basta dispor cá, num qualquer dia do período, de{" "}
          {RESIDENCIA_FISCAL.criterioHabitacao.value}. Um arrendamento de longa duração assinado à
          chegada é exatamente esse sinal — e torna a contagem de dias irrelevante, porque o critério
          já se preencheu por outra via.
        </AvisoPrazo>
        <Paragrafo>
          A partir do momento em que és residente, o IRS incide sobre a{" "}
          <strong>totalidade dos teus rendimentos, incluindo os obtidos fora</strong>. Não interessa
          onde está o cliente, onde está o banco, nem em que moeda te pagam.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Empregado de empresa estrangeira vs. prestador de serviços">
        <Paragrafo>
          A distinção muda a categoria, a forma de declarar e quem paga o quê — e é independente de
          como o contrato se chama.
        </Paragrafo>
        <Paragrafo>
          Sendo <strong>empregado</strong> de uma empresa estrangeira, o rendimento é de trabalho
          dependente. Não há entidade portuguesa a reter, o que significa que o imposto não sai ao
          longo do ano e aparece todo de uma vez no acerto — uma surpresa desagradável no primeiro
          ano de quem nunca teve de o antecipar.
        </Paragrafo>
        <Paragrafo>
          Sendo <strong>prestador de serviços</strong>, é categoria B: abre-se atividade, emitem-se
          faturas-recibo e aplicam-se as regras do regime simplificado ou da contabilidade
          organizada, com as obrigações de IVA que a atividade implicar.
        </Paragrafo>
        <Nota titulo="O nome do contrato não decide">
          O que decide é a substância da relação: horário, subordinação, integração na organização,
          exclusividade, instrumentos de trabalho. Um contrato intitulado «serviços» com uma relação
          de trabalho por baixo é uma relação de trabalho — e o teste é o mesmo, esteja a empresa em
          Lisboa ou em Berlim.
        </Nota>
        <VaiPara href="/guias/remoto-empresa-estrangeira">
          As três estruturas possíveis, e o que cada uma custa
        </VaiPara>
        <VaiPara href="/guias/falsos-recibos-verdes">
          O teste da subordinação, feito por indícios
        </VaiPara>
      </Seccao>

      <Seccao titulo="Segurança Social: onde descontas">
        <Paragrafo>
          É o capítulo mais esquecido, e o que traz as regularizações mais caras — porque as
          contribuições e o IRS <strong>seguem regras diferentes</strong> e não se decidem juntos.
        </Paragrafo>
        <Paragrafo>
          Dentro da <strong>União Europeia</strong>, os regulamentos de coordenação impõem que se
          esteja abrangido pela legislação de{" "}
          <strong>um só Estado-Membro de cada vez</strong>, e há regras próprias para destacamento e
          para quem exerce atividade em vários Estados. Quem se muda mantendo o vínculo a uma
          entidade de outro Estado precisa de saber qual dessas regras se lhe aplica.
        </Paragrafo>
        <Paragrafo>
          Fora da UE, depende de existir <strong>acordo bilateral de segurança social</strong> entre
          Portugal e esse país. Não existindo, pode haver obrigação contributiva nos dois — sem
          crédito, sem compensação e sem acumulação de direitos.
        </Paragrafo>
        <AvisoPrazo titulo="Descontar num país não dispensa o outro">
          Ao contrário do que acontece no imposto, não há aqui um mecanismo geral de crédito. A
          coordenação resolve-se por <em>atribuição</em> — determina-se qual é a legislação
          aplicável e contribui-se só aí. Determinar mal significa contribuir no sítio errado durante
          anos.
        </AvisoPrazo>
        <VaiPara href="/guias/seguranca-social">
          As contribuições de quem trabalha por conta própria em Portugal
        </VaiPara>
      </Seccao>

      <Seccao titulo="Regimes de que podes beneficiar">
        <Paragrafo>
          Dois, e nenhum é automático.
        </Paragrafo>
        <Paragrafo>
          O <strong>regime dos ex-residentes</strong> exige que já tenhas sido residente fiscal em
          Portugal num período anterior — quem chega pela primeira vez não é elegível.
        </Paragrafo>
        <Paragrafo>
          O <strong>incentivo do art. 58.º-A do Estatuto dos Benefícios Fiscais</strong>, sucessor do
          residente não habitual, depende da atividade exercida e tem prazo de inscrição. Confirma a
          data-limite em vigor logo nas primeiras semanas: é um prazo curto, e perdê-lo custa o
          benefício inteiro.
        </Paragrafo>
        <VaiPara href="/guias/programa-regressar">
          O regime dos ex-residentes, condição a condição
        </VaiPara>
      </Seccao>

      <Seccao titulo="Erros comuns no primeiro ano">
        <Paragrafo>
          · <strong>Assumir que o visto resolve o fiscal.</strong> São autoridades diferentes e
          regras independentes.
          <br />· <strong>Contar os 183 dias por ano civil.</strong> A janela é deslizante, e o
          critério da habitação pode chegar primeiro.
          <br />· <strong>Não comunicar o domicílio fiscal.</strong> A mudança é ineficaz enquanto
          não for comunicada.
          <br />· <strong>Achar que o rendimento estrangeiro não se declara.</strong> Sendo
          residente, declara-se todo — a ausência de retenção não é ausência de imposto.
          <br />· <strong>Não guardar dinheiro para o acerto.</strong> Sem entidade retentora, o
          imposto do ano inteiro aparece de uma vez.
          <br />· <strong>Esquecer a conta bancária do país de origem.</strong> A identificação de
          contas em instituições financeiras não residentes não depende de haver rendimentos.
        </Paragrafo>
        <VaiPara href="/guias/primeiro-ano-fiscal-portugal">
          A ordem certa dos passos, do NIF à primeira declaração
        </VaiPara>
        <VaiPara href="/guias/anexo-j">
          O anexo do estrangeiro, e a identificação de contas
        </VaiPara>
      </Seccao>
    </>
  );
}
