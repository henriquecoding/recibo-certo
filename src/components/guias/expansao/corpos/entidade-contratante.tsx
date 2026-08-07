import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { ENTIDADE_CONTRATANTE, ENTIDADE_CONTRATANTE_LIMIAR_CALC, IAS, SS_TAXA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o Código dos Regimes Contributivos
// e a informação oficial da Segurança Social sobre entidades contratantes.
export default function CorpoEntidadeContratante() {
  return (
    <>
      <Seccao titulo="O que é dependência económica">
        <Paragrafo>
          A lei olha para o teu ano inteiro e faz uma pergunta simples: houve{" "}
          <strong>uma entidade</strong> que beneficiou de mais de metade do valor total da tua
          atividade? Havendo, essa entidade passa a ser <strong>entidade contratante</strong> — e
          ganha uma obrigação contributiva própria.
        </Paragrafo>
        <Paragrafo>
          Não é uma sanção nem um sinal de irregularidade. É o reconhecimento de que uma relação
          quase exclusiva entre um independente e um cliente se parece, do ponto de vista económico,
          com um vínculo laboral — e de que quem beneficia dela deve participar no financiamento da
          proteção social de quem a presta.
        </Paragrafo>
        <Nota titulo="A conta é anual e faz-se por entidade">
          Não é sobre um mês nem sobre um projeto: é a proporção do teu rendimento anual da atividade
          que veio de cada cliente. Dois clientes com pouco menos de metade cada não geram obrigação nenhuma; um só que passe
          de metade gera.
        </Nota>
      </Seccao>

      <Seccao titulo="As duas percentagens">
        <Paragrafo>
          A taxa varia com o <strong>grau</strong> de dependência, e são dois patamares.
        </Paragrafo>
        <Paragrafo>
          · Dependência superior a {pctExato(ENTIDADE_CONTRATANTE.dependenciaMinima.value)} e até ao
          patamar superior — <strong>{pctExato(ENTIDADE_CONTRATANTE.taxaAte80.value)}</strong>.
          <br />· Dependência acima desse patamar —{" "}
          <strong>{pctExato(ENTIDADE_CONTRATANTE.taxaAcima80.value)}</strong>. Os dois limiares
          estão na tabela de dados aqui em baixo.
        </Paragrafo>
        <Paragrafo>
          A taxa incide sobre o valor dos serviços prestados a essa entidade, e é paga{" "}
          <strong>por ela</strong>, não por ti.
        </Paragrafo>
        <AvisoPrazo titulo="Não sai do teu bolso — e também não te acrescenta proteção">
          É uma contribuição autónoma da entidade. Não te é descontada, não reduz o que recebes, e
          não aumenta a tua remuneração registada nem os teus direitos. Financia o sistema, não a tua
          carreira contributiva.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O limiar de rendimento que ativa a obrigação">
        <Paragrafo>
          A dependência económica não basta: é preciso que o teu rendimento anual da atividade
          independente seja superior a{" "}
          <strong>{ENTIDADE_CONTRATANTE.limiarIAS.value} × IAS</strong>, o que dá{" "}
          <strong>{fmt(ENTIDADE_CONTRATANTE_LIMIAR_CALC)}</strong> com o IAS de{" "}
          {fmt(IAS.value)}.
        </Paragrafo>
        <Paragrafo>
          Abaixo desse valor não há obrigação, por muito concentrada que a atividade esteja. É o que
          evita apanhar quem tem uma colaboração ocasional com um único cliente.
        </Paragrafo>
        <Nota titulo="Como é indexado ao IAS, sobe todos os anos">
          Um rendimento que ficava abaixo do limiar pode passar a ficar acima sem que a atividade
          tenha crescido. É a razão pela qual esta obrigação aparece de repente a clientes que a não
          tinham no ano anterior.
        </Nota>
      </Seccao>

      <Seccao titulo="Como a Segurança Social apura">
        <Paragrafo>
          Não és tu que declaras isto, e a entidade também não. O apuramento é{" "}
          <strong>oficioso</strong>: a Segurança Social cruza as tuas declarações trimestrais, onde
          identificas as entidades a quem prestaste serviços, e calcula a proporção.
        </Paragrafo>
        <Paragrafo>
          Feito o apuramento, a entidade é notificada do valor a pagar. Costuma acontecer no ano
          seguinte àquele a que respeita — o que significa que a fatura chega bastante depois do
          trabalho.
        </Paragrafo>
        <AvisoPrazo titulo="É por isto que a declaração trimestral pede o NIF dos clientes">
          O campo existe precisamente para este apuramento. Preenchê-lo mal, ou não o preencher, não
          te poupa nada — cria divergências que acabam por ser corrigidas, com a notificação a chegar
          ainda mais tarde ao teu cliente.
        </AvisoPrazo>
        <VaiPara href="/guias/declaracao-trimestral-ss">
          A declaração trimestral, campo a campo
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que a empresa recebe e quando">
        <Paragrafo>
          Uma notificação da Segurança Social, no ano seguinte, com o valor apurado e o prazo de
          pagamento. Para muitas empresas é a primeira vez que ouvem falar disto — e a reação inicial
          é quase sempre de surpresa.
        </Paragrafo>
        <Paragrafo>
          Vale a pena antecipares a conversa se és tu o prestador com dependência económica alta.
          Explicar o mecanismo antes de a notificação chegar transforma um problema numa
          previsibilidade — e evita que o teu cliente descubra sozinho um custo que associa a ti.
        </Paragrafo>
        <Nota titulo="Para comparar: a tua taxa é outra">
          A tua contribuição é de <strong>{pctExato(SS_TAXA.value)}</strong> sobre a tua base de
          incidência. A da entidade contratante é autónoma e sobre outra base — não se somam nem se
          substituem.
        </Nota>
      </Seccao>

      <Seccao titulo="A relação com o risco de falsos recibos verdes">
        <Paragrafo>
          É a ligação que dá sentido a tudo o resto. Uma dependência económica muito alta é, ao mesmo
          tempo, o pressuposto desta contribuição e um dos indícios que a lei valoriza na
          requalificação de uma prestação de serviços em contrato de trabalho.
        </Paragrafo>
        <Paragrafo>
          Não são a mesma coisa, e é importante não as confundir: pagar a contribuição de entidade
          contratante <strong>não legaliza</strong> uma relação que é materialmente laboral, nem a
          torna suspeita por si só. A dependência económica é um indício entre vários, e a
          requalificação faz-se pelo conjunto.
        </Paragrafo>
        <AvisoPrazo titulo="Mas é o indício que a Segurança Social vê primeiro">
          O apuramento da entidade contratante é automático e anual. Uma relação no patamar mais alto de
          dependência, com horário, instruções e exclusividade, tem os dois lados visíveis ao mesmo
          tempo — e é aí que a inspeção começa.
        </AvisoPrazo>
        <VaiPara href="/guias/falsos-recibos-verdes">
          Os indícios de subordinação, um a um
        </VaiPara>
        <VaiPara href="/guias/desemprego-independentes">
          Os economicamente dependentes têm regime próprio na proteção no desemprego
        </VaiPara>
      </Seccao>
    </>
  );
}
