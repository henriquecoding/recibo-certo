import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { REPRESENTANTE_FISCAL } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 07/08/2026:
// art. 19.º da Lei Geral Tributária, n.os 4 a 10 e 15 a 16, e art. 30.º do
// Código do IVA.
//
// O pacote manda «confirmar a lista de países dispensados na redação em
// vigor do art. 19.º LGT». A confirmação dá outra resposta: a lei NÃO tem
// lista de países — tem um critério. E tem, desde o Decreto-Lei n.º 44/2022,
// uma segunda dispensa que o pacote não mencionava e que vale para qualquer
// país: aderir às notificações eletrónicas.
export default function CorpoRepresentanteFiscal() {
  return (
    <>
      <Seccao titulo="Quando a nomeação é obrigatória">
        <Paragrafo>
          A obrigação abrange dois grupos, e o segundo é o que apanha as pessoas de surpresa: os
          sujeitos passivos <strong>residentes no estrangeiro</strong>, e também os que, residindo
          cá, se <strong>ausentem por período superior a{" "}
          {REPRESENTANTE_FISCAL.ausenciaMeses.value} meses</strong>.
        </Paragrafo>
        <Paragrafo>
          O representante tem de ter residência em território nacional, e a sua função é
          representar-te perante a administração tributária em tudo o que respeite às tuas relações
          com ela.
        </Paragrafo>
        <AvisoPrazo titulo="Uma ausência longa não é uma mudança de residência">
          Ir seis meses e um dia para outro país sem deixar de ser residente fiscal cá basta para
          ativar a obrigação. É a situação típica de quem vai numa comissão de serviço, num
          destacamento ou num projeto longo — e continua a ser residente, com todas as obrigações de
          um residente.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A dispensa para residentes na UE e EEE">
        <Paragrafo>
          Aqui está o ponto que a informação em circulação erra mais. A lei{" "}
          <strong>não tem uma lista de países</strong> dispensados: tem um critério. A designação é{" "}
          <em>meramente facultativa</em> em relação a não residentes de — ou residentes que se
          ausentem para — <strong>Estados membros da União Europeia ou do Espaço Económico
          Europeu</strong>, neste último caso desde que vinculados a cooperação administrativa no
          domínio da fiscalidade equivalente à estabelecida na União Europeia.
        </Paragrafo>
        <Paragrafo>
          Na prática, o Espaço Económico Europeu que interessa aqui são a Noruega, a Islândia e o
          Listenstaine. Mas o que a lei exige é o vínculo de cooperação, não a pertença a uma lista —
          e é por isso que a formulação legal sobrevive a alterações que uma lista não sobreviveria.
        </Paragrafo>
        <Nota titulo="Facultativa não é inútil">
          Quem está dispensado pode nomear na mesma, e há razões para o fazer: alguém cá que receba
          e reencaminhe notificações resolve na semana o que de longe demoraria um mês. A dispensa
          tira a obrigação, não a utilidade.
        </Nota>
      </Seccao>

      <Seccao titulo="O que o representante faz">
        <Paragrafo>
          Recebe as <strong>notificações e citações</strong> da administração tributária dirigidas ao
          representado, e assegura o cumprimento dos deveres de natureza formal na relação com ela.
          É um canal de contacto com responsabilidade, e não um procurador com poderes gerais.
        </Paragrafo>
        <Paragrafo>
          Há também um representante próprio para efeitos de <strong>IVA</strong>, com regime no
          Código do IVA: quem não tenha sede, estabelecimento estável ou domicílio no território
          nacional e cá pratique operações tributáveis pode ou deve — conforme o caso — nomear um
          representante para cumprir as obrigações do imposto.
        </Paragrafo>
        <AvisoPrazo titulo="O representante não substitui as tuas obrigações">
          Ter representante não transfere para ele a entrega das tuas declarações nem o pagamento
          dos teus impostos. A declaração continua a ser tua, e a dívida também. O que ele garante é
          que o que a AT te envia chega a alguém.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que o representante arrisca">
        <Paragrafo>
          Do lado do representado, a sanção é dupla e a segunda é a que dói. Além das sanções
          aplicáveis pela falta em si, o <strong>exercício dos direitos perante a administração
          tributária</strong> — incluindo reclamar, recorrer e impugnar — depende da designação de
          representante.
        </Paragrafo>
        <Paragrafo>
          Ficar sem representante quando ele é obrigatório não é ficar apenas em incumprimento: é
          ficar sem poder contestar o que a AT decidir.
        </Paragrafo>
        <Nota titulo="Do lado de quem aceita">
          Aceitar ser representante fiscal de alguém é assumir que as notificações dessa pessoa
          passam a chegar a tua casa — e que os prazos de resposta começam a correr com a entrega
          nessa morada. Se a pessoa não te responder, o prazo corre na mesma. É uma relação de
          confiança com consequências reais, e não um favor administrativo.
        </Nota>
      </Seccao>

      <Seccao titulo="Como se nomeia e como se cessa">
        <Passos
          passos={[
            {
              titulo: "Obter a aceitação de quem vai representar",
              texto: "Tem de ter residência em território nacional e tem de aceitar. Não se nomeia alguém sem lho dizer.",
            },
            {
              titulo: "Comunicar a designação à AT",
              texto: "Faz-se no Portal das Finanças ou num serviço de finanças, junto com a alteração do domicílio fiscal — os dois passos andam quase sempre juntos.",
            },
            {
              titulo: "Confirmar que o cadastro ficou atualizado",
              texto: "Uma designação comunicada e não registada tem o mesmo efeito que nenhuma. Verifica no teu cadastro depois de comunicar.",
            },
            {
              titulo: "Para cessar: comunicar a renúncia ou nomear outro",
              texto: `A renúncia é eficaz perante a AT quando lhe for comunicada, e a AT dispõe de ${REPRESENTANTE_FISCAL.renunciaPrazoDias.value} dias para proceder às alterações — desde que tenha decorrido pelo menos um ano sobre a nomeação, ou tenha sido nomeado novo representante.`,
            },
          ]}
        />
        <AvisoPrazo titulo="Um ano de carência para a renúncia">
          Quem aceita representar não se liberta no mês seguinte por vontade própria: ou passou um
          ano sobre a nomeação, ou há um novo representante nomeado. Vale a pena saber isto{" "}
          <em>antes</em> de aceitar.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Alternativa: adesão às notificações eletrónicas">
        <Paragrafo>
          É a novidade que muda o guia todo, e vale para{" "}
          <strong>qualquer país</strong> — não só para a UE e o EEE. A obrigatoriedade de designar
          representante <strong>não é aplicável</strong> a quem adira ao serviço público de
          notificações eletrónicas associado à morada única digital, ao regime de notificações e
          citações eletrónicas no Portal das Finanças, ou à caixa postal eletrónica.
        </Paragrafo>
        <Paragrafo>
          A lógica é evidente assim que se diz: o representante existia para haver onde entregar uma
          notificação. Havendo um canal eletrónico ao qual aderiste, o problema que ele resolvia
          deixou de existir.
        </Paragrafo>
        <AvisoPrazo titulo="Mas não se sai da adesão sem porta de saída">
          Para quem reside fora da UE e do EEE, o cancelamento da adesão{" "}
          <strong>só produz efeitos</strong> depois de designado representante fiscal. Não dá para
          desativar as notificações eletrónicas e ficar sem nenhuma das duas coisas.
        </AvisoPrazo>
        <Nota titulo="Aderir tem uma consequência que convém perceber">
          A partir da adesão, as notificações consideram-se feitas no canal eletrónico — e os prazos
          contam a partir daí, quer tenhas entrado a ver, quer não. Aderir é assumir o hábito de
          consultar.
        </Nota>
        <VaiPara href="/guias/sair-de-portugal">
          Onde este passo encaixa na lista de quem está de saída
        </VaiPara>
        <VaiPara href="/guias/nao-residentes-irs">
          O que a AT te vai notificar, sendo não residente
        </VaiPara>
      </Seccao>
    </>
  );
}
