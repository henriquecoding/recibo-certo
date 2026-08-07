import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { REDUCAO_COIMA, REVISAO_E_RECLAMACAO } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026: art. 63.º e art. 59.º da LGT, art. 45.º da
// LGT (caducidade), art. 30.º do RGIT e art. 70.º do CPPT.
//
// O pacote avisa que o Regime Complementar do Procedimento de Inspeção
// Tributária e Aduaneira (RCPITA, Decreto-Lei n.º 413/98) é a fonte
// principal e que não conseguiu localizar página verificável do diploma.
// Não se conseguiu verificar aqui também — pelo que os prazos e as fases
// que vivem exclusivamente no RCPITA são descritos SEM número, com a
// indicação de onde os confirmar. O que tem número neste guia vem da LGT,
// do RGIT e do CPPT, verificados.
export default function CorpoInspecaoTributaria() {
  return (
    <>
      <Seccao titulo="Carta-aviso e ordem de serviço: o que definem">
        <Paragrafo>
          Uma inspeção não começa com uma visita: começa com papel. A{" "}
          <strong>carta-aviso</strong> anuncia que vai haver procedimento; a{" "}
          <strong>ordem de serviço</strong> é o documento que o habilita, identifica os
          inspetores e delimita o que pode ser inspecionado.
        </Paragrafo>
        <Paragrafo>
          A ordem de serviço é o documento mais importante do processo do teu lado, porque é ela que
          fixa a fronteira. O que estiver fora do âmbito e do período nela indicados não faz parte
          daquela inspeção.
        </Paragrafo>
        <AvisoPrazo titulo="Pede e guarda cópia da ordem de serviço">
          É o que te permite saber — e demonstrar — o que está e o que não está em causa. Sem ela,
          discutir o âmbito é discutir de memória.
        </AvisoPrazo>
        <Nota titulo="Ser inspecionado não significa ser suspeito">
          Boa parte das ações de inspeção resulta de cruzamento automático de dados, de amostragem
          setorial ou de divergências entre declarações. Receber uma carta é o começo de um
          procedimento, não uma acusação.
        </Nota>
      </Seccao>

      <Seccao titulo="Âmbito e extensão da inspeção">
        <Paragrafo>
          São duas coisas diferentes, e ambas constam da ordem de serviço. O <strong>âmbito</strong>{" "}
          diz <em>o que</em> se inspeciona — um imposto em concreto, ou a situação tributária geral.
          A <strong>extensão</strong> diz <em>que períodos</em>.
        </Paragrafo>
        <Paragrafo>
          Alterar qualquer uma delas a meio não é uma decisão informal: exige despacho fundamentado
          da entidade competente, notificado ao inspecionado.
        </Paragrafo>
        <Nota titulo="O limite de fundo é a caducidade">
          Por muito que se alargue a extensão, há um horizonte além do qual a AT já não pode liquidar
          — é o prazo de caducidade do direito à liquidação, na Lei Geral Tributária. Períodos fora
          desse prazo não geram liquidação, mesmo que sejam analisados.
        </Nota>
      </Seccao>

      <Seccao titulo="O prazo do procedimento e as suas prorrogações">
        <Paragrafo>
          O procedimento de inspeção tem um <strong>prazo máximo</strong> de conclusão, contado da
          notificação do seu início, e admite prorrogações em circunstâncias tipificadas — cada uma
          com fundamentação e notificação próprias.
        </Paragrafo>
        <Paragrafo>
          Os prazos concretos e as causas de prorrogação constam do Regime Complementar do
          Procedimento de Inspeção Tributária e Aduaneira. Este guia não os fixa em número porque não
          foi possível verificá-los em fonte oficial nesta revisão — confirma-os com um contabilista
          certificado ou com um advogado, que é também quem te dirá se algum já foi excedido.
        </Paragrafo>
        <AvisoPrazo titulo="O prazo tem efeitos, e por isso vale a pena contá-lo">
          Marca a data de notificação do início e guarda todas as notificações de prorrogação. É a
          partir desses documentos que se verifica se o procedimento se manteve dentro do prazo — e o
          incumprimento tem consequências que só se invocam se se souber a data.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Deveres de colaboração — e os seus limites">
        <Paragrafo>
          A lei impõe um dever de <strong>colaboração recíproco</strong>: tu prestas os
          esclarecimentos e exibes os elementos que legalmente devem existir; a administração atua
          segundo o princípio do inquisitório e da proporcionalidade, e tem de fundamentar o que
          pede.
        </Paragrafo>
        <Paragrafo>
          Os limites existem e são concretos. O acesso a informações protegidas por sigilo tem regime
          próprio; o que é pedido tem de caber no âmbito da ordem de serviço; e o que é irrelevante
          para esse âmbito não tem de ser entregue.
        </Paragrafo>
        <Nota titulo="Responder por escrito é sempre melhor">
          Pede que os pedidos sejam feitos por escrito e responde por escrito, com data. Uma
          conversa não deixa rasto, e o processo vive de rasto — sobretudo se mais tarde for preciso
          demonstrar o que foi pedido e o que foi entregue.
        </Nota>
        <AvisoPrazo titulo="Recusar sem fundamento tem consequências">
          A recusa de colaboração legítima pode legitimar métodos indiretos de determinação da
          matéria tributável — e aí a base de tributação deixa de sair dos teus documentos e passa a
          sair de indicadores. É quase sempre pior.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Projeto de relatório e audição prévia">
        <Paragrafo>
          É a fase decisiva, e a que mais gente desperdiça. Antes de concluir, a inspeção notifica-te
          de um <strong>projeto de relatório</strong> com as correções que tenciona propor — e
          abre-te um prazo para te pronunciares.
        </Paragrafo>
        <Paragrafo>
          É o exercício do <strong>direito de audição</strong>, e não uma formalidade: o que
          responderes tem de ser apreciado, e o relatório final tem de tomar posição sobre isso. É o
          último momento em que ainda se muda o desfecho sem entrar em contencioso.
        </Paragrafo>
        <AvisoPrazo titulo="E é a última janela de redução da coima">
          Até ao termo do prazo de audição prévia, regularizar reduz a coima a{" "}
          <strong>{pctExato(REDUCAO_COIMA.ateAudicaoPrevia.value)}</strong> do montante mínimo legal.
          Depois disso, não há redução nenhuma. Duas coisas correm no mesmo prazo — a defesa e a
          regularização — e podem ser feitas ao mesmo tempo, em partes diferentes do relatório.
        </AvisoPrazo>
        <Nota titulo="Responder bem é responder por pontos">
          Cada correção proposta é um ponto autónomo. Aceitar duas e contestar a terceira é
          perfeitamente possível, e costuma ser a estratégia certa — concentra o esforço onde há
          razão e regulariza cedo o resto.
        </Nota>
      </Seccao>

      <Seccao titulo="Relatório final e liquidação">
        <Paragrafo>
          Concluída a audição, sai o <strong>relatório final</strong>, que tem de apreciar o que
          respondeste. É dele que resultam as correções à matéria tributável — e é a partir delas que
          a AT emite as <strong>liquidações adicionais</strong>.
        </Paragrafo>
        <Paragrafo>
          O relatório não é, em si, o ato que se contesta. O que se impugna é a{" "}
          <strong>liquidação</strong> — e é a partir dela que correm os prazos de reação.
        </Paragrafo>
        <AvisoPrazo titulo="Da liquidação contam-se os prazos de reação">
          A reclamação graciosa apresenta-se no prazo de{" "}
          <strong>{REVISAO_E_RECLAMACAO.reclamacaoGraciosaDias.value} dias</strong>. Há ainda a
          revisão do ato tributário, com prazos próprios, e a impugnação judicial. Perder o primeiro
          prazo não fecha necessariamente todas as portas — mas fecha a mais simples.
        </AvisoPrazo>
        <VaiPara href="/guias/declaracao-substituicao">
          Os três relógios de quem quer corrigir depois da liquidação
        </VaiPara>
      </Seccao>

      <Seccao titulo="Regularizar durante a inspeção">
        <Passos
          passos={[
            {
              titulo: "Separar o que é indiscutível do que é discutível",
              texto: "Quase todo o projeto de correções tem das duas coisas. Regularizar o indiscutível cedo baixa a coima e concentra a discussão onde ela interessa.",
            },
            {
              titulo: "Regularizar até ao termo do prazo de audição prévia",
              texto: `É a última janela de redução: ${pctExato(REDUCAO_COIMA.ateAudicaoPrevia.value)} do montante mínimo legal. A redução maior já não está disponível a partir do momento em que a inspeção começou.`,
            },
            {
              titulo: "Pagar dentro do prazo da coima reduzida",
              texto: `O direito à redução depende do pagamento nos ${REDUCAO_COIMA.prazoPagamentoDias.value} dias posteriores à notificação — e da regularização da situação tributária no mesmo prazo.`,
            },
            {
              titulo: "Responder ao projeto por escrito, ponto a ponto",
              texto: "Com os documentos anexos. O que não for junto agora dificilmente entra depois, e a resposta tem de ser apreciada no relatório final.",
            },
            {
              titulo: "Levar um profissional a partir do projeto de relatório",
              texto: "É matéria que exige revisão especializada e a fase em que o acompanhamento mais rende. Um contabilista certificado ou um advogado fiscalista, conforme a natureza das correções.",
            },
          ]}
        />
        <VaiPara href="/guias/regularizacao-voluntaria">
          As duas janelas de redução, e o que fecha cada uma
        </VaiPara>
        <VaiPara href="/guias/coimas-fiscais">
          Molduras, pisos e a diferença entre dispensa e redução
        </VaiPara>
      </Seccao>
    </>
  );
}
