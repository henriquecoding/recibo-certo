import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { PROPRIEDADE_INTELECTUAL_EBF } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026 contra o articulado na coleção consolidada:
// art. 36.º, n.º 1 do CIVA, arts. 3.º, 31.º, 101.º e 151.º do CIRS, e art.
// 58.º, n.º 2 do EBF quanto à exclusão das obras de arquitetura.
export default function CorpoArquitetosEngenheiros() {
  return (
    <>
      <Seccao titulo="Enquadramento no art. 151.º CIRS">
        <Paragrafo>
          Arquitetos, engenheiros e projetistas constam tipicamente da tabela de atividades do art.
          151.º do Código do IRS — a das profissões liberais. Isso traz o coeficiente e a taxa de
          retenção próprios dessas profissões, que estão na tabela de dados aqui em baixo.
        </Paragrafo>
        <Paragrafo>
          «Tipicamente» é palavra deliberada. O enquadramento faz-se pela atividade concretamente
          exercida, e há trabalho de projeto que é enquadrado por CAE fora da tabela — com
          coeficiente e retenção diferentes.
        </Paragrafo>
        <AvisoPrazo titulo="Nunca por nome de profissão">
          Confirma o teu enquadramento com um contabilista certificado na abertura de atividade. A
          diferença entre os dois cenários da tabela é de mais de metade da matéria coletável.
        </AvisoPrazo>
        <VaiPara href="/dashboard/classificar-atividade">
          Ferramenta para classificar a tua atividade
        </VaiPara>
      </Seccao>

      <Seccao titulo="Coeficiente e retenção">
        <Paragrafo>
          No regime simplificado, o coeficiente é a fração do rendimento bruto que vai a imposto; a
          restante é a presunção legal de despesas. Não se somam despesas por cima — mas há a regra
          das despesas a justificar, que exige comprovar uma fração do bruto — a da tabela de dados —,
          sob pena de a parte não
          justificada ser acrescida ao rendimento tributável.
        </Paragrafo>
        <Paragrafo>
          A retenção existe quando o cliente é entidade com contabilidade organizada. Projetos para
          particulares não têm retenção, o que concentra o imposto todo no acerto do ano seguinte.
        </Paragrafo>
        <Nota titulo="Software e licenças são a despesa que mais se esquece">
          Licenças de CAD e BIM, formação, seguros profissionais, quotas da ordem e equipamento
          contam para a regra das despesas a justificar — com fatura e NIF. Sem NIF, não contam para
          nada.
        </Nota>
        <VaiPara href="/guias/regime-simplificado">
          O regime simplificado e a regra das despesas a justificar
        </VaiPara>
      </Seccao>

      <Seccao titulo="Faturação por fases e adiantamentos">
        <Paragrafo>
          É a particularidade desta atividade. Um projeto entregue por fases — estudo prévio,
          licenciamento, execução — costuma ser pago por tranches, e cada tranche levanta a mesma
          pergunta: quando é que se emite a fatura?
        </Paragrafo>
        <Paragrafo>
          A regra do art. 36.º do Código do IVA é clara nas duas situações. Concluída a fase, a
          fatura emite-se <strong>o mais tardar no 5.º dia útil seguinte</strong> ao momento em que o
          imposto é devido. Recebido um <strong>adiantamento</strong> por serviço ainda não prestado,
          emite-se <strong>na data do recebimento</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="Um sinal recebido em dezembro é rendimento de dezembro">
          A obrigação de faturar nasce com o recebimento do adiantamento, e o rendimento fica no ano
          da fatura. Um adiantamento recebido no fim do ano por trabalho que só farás no seguinte
          antecipa o imposto — e vale a pena saber isso quando se negoceia o calendário de
          pagamentos.
        </AvisoPrazo>
        <VaiPara href="/guias/fatura-vs-recibo">
          A diferença entre faturar e receber
        </VaiPara>
      </Seccao>

      <Seccao titulo="IVA nos projetos">
        <Paragrafo>
          Os serviços de arquitetura e engenharia são tributáveis à taxa normal, acima do limiar de
          isenção do art. 53.º que consta da tabela de dados.
        </Paragrafo>
        <Paragrafo>
          Há uma regra de localização que muda tudo em trabalho internacional: as prestações de
          serviços <strong>relacionadas com um imóvel</strong> localizam-se onde o imóvel está — e
          não onde está o prestador nem o cliente. Um projeto para um edifício noutro país segue as
          regras de IVA desse país, mesmo que trabalhes de Lisboa e o cliente também seja português.
        </Paragrafo>
        <AvisoPrazo titulo="É a exceção à regra geral dos serviços">
          A regra do país do adquirente, que vale para a generalidade dos serviços entre sujeitos
          passivos, não se aplica aqui. Antes de faturar um projeto no estrangeiro, confirma o
          enquadramento — pode implicar registo nesse país.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Seguro de responsabilidade civil profissional">
        <Paragrafo>
          O exercício destas profissões está sujeito a inscrição na ordem respetiva e a seguro de
          responsabilidade civil profissional, com requisitos definidos pela legislação do setor e
          pelos regulamentos de cada ordem.
        </Paragrafo>
        <Paragrafo>
          Coberturas e capitais mínimos confirmam-se junto da ordem profissional. Do lado fiscal, o
          prémio é despesa afeta à atividade, tal como as quotas.
        </Paragrafo>
        <Nota titulo="A responsabilidade sobrevive à entrega do projeto">
          As apólices têm regras próprias sobre o período coberto e sobre reclamações posteriores ao
          fim do contrato. Confirma-as ao mudar de seguradora ou ao cessar atividade — é onde as
          lacunas de cobertura aparecem.
        </Nota>
      </Seccao>

      <Seccao titulo="Trabalhos para entidades públicas">
        <Paragrafo>
          Contratar com entidades públicas traz três coisas que o setor privado não tem: procedimento
          de contratação pública, exigência de <strong>situação tributária e contributiva
          regularizada</strong>, e prazos de pagamento próprios.
        </Paragrafo>
        <Paragrafo>
          A regularidade fiscal e contributiva é verificada no momento da adjudicação e pode ser
          reverificada. Uma dívida pequena e esquecida — uma coima, um trimestre em atraso — chega
          para travar uma adjudicação já ganha.
        </Paragrafo>
        <AvisoPrazo titulo="A fatura eletrónica é obrigatória com o Estado">
          A faturação a entidades públicas segue o regime da fatura eletrónica, com formato e canal
          próprios. Enviar um PDF por email não cumpre a obrigação, e a fatura não entra para
          pagamento.
        </AvisoPrazo>
        <VaiPara href="/guias/faturacao-eletronica">
          A fatura eletrónica, e o que ela exige
        </VaiPara>
        <VaiPara href="/guias/situacao-regularizada">
          Como se obtém e se mantém a situação regularizada
        </VaiPara>
      </Seccao>

      <Seccao titulo="Uma nota sobre direitos de autor">
        <Paragrafo>
          Um projeto de arquitetura é obra protegida, e é natural perguntar se o benefício da
          propriedade intelectual se lhe aplica. Não se aplica: a lei exclui expressamente as{" "}
          <strong>obras de arquitetura</strong> do regime do art. 58.º do Estatuto dos Benefícios
          Fiscais.
        </Paragrafo>
        <Paragrafo>
          A exclusão está na mesma norma que retira{" "}
          {PROPRIEDADE_INTELECTUAL_EBF.excluidas.value}. É uma opção do legislador, e não uma lacuna
          — pelo que não há aqui interpretação a fazer.
        </Paragrafo>
        <VaiPara href="/guias/artistas-direitos-autor">
          O regime da propriedade intelectual, e a quem se aplica
        </VaiPara>
      </Seccao>
    </>
  );
}
