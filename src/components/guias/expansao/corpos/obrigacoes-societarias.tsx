import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { ICE, IRC_TAXA_GERAL, IRC_TAXA_PME, IRC_LIMITE_PME } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026. As obrigações de registo e de depósito de
// contas constam do Código das Sociedades Comerciais e do Registo Comercial,
// que não têm articulado verificável no Portal das Finanças. NENHUMA data de
// calendário é publicada aqui: os prazos concretos variam com o exercício e
// com prorrogações anuais. O guia dá a regra e manda ao calendário do ano.
export default function CorpoObrigacoesSocietarias() {
  return (
    <>
      <Seccao titulo="O calendário que não é do fisco">
        <Paragrafo>
          Uma sociedade tem duas listas de obrigações. Uma é fiscal e toda a gente conhece. A outra é
          de <strong>registo e publicidade</strong>, não passa pelo Portal das Finanças, e é a que
          costuma travar coisas concretas: uma conta bancária, uma candidatura, um concurso.
        </Paragrafo>
        <Paragrafo>
          São três peças: o <strong>RCBE</strong>, a <strong>certidão permanente</strong> e as{" "}
          <strong>contas aprovadas e depositadas</strong>.
        </Paragrafo>
        <Nota titulo="Não pagam imposto — bloqueiam operações">
          É a diferença que faz com que sejam esquecidas: não geram nota de cobrança. Geram uma
          resposta negativa de um banco, meses depois, sem explicação clara do motivo.
        </Nota>
      </Seccao>

      <Seccao titulo="RCBE — o registo do beneficiário efetivo">
        <Paragrafo>
          Declara quem <strong>controla realmente</strong> a sociedade. Não é a lista de sócios do
          pacto: é quem, no fim da cadeia de participações, detém ou controla a entidade.
        </Paragrafo>
        <Paragrafo>
          Tem de estar <strong>atualizado</strong>. Qualquer alteração na estrutura de titularidade
          obriga a atualizar — e há também uma confirmação periódica da informação, mesmo quando nada
          mudou.
        </Paragrafo>
        <AvisoPrazo titulo="É o primeiro sítio onde um banco olha">
          Abertura de conta, alteração de titulares, pedido de crédito. Um RCBE desatualizado trava o
          processo por completo, e a correção não é imediata.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Certidão permanente — a identidade da sociedade">
        <Paragrafo>
          É o registo comercial em forma consultável: capital, sede, gerência, forma de obrigar,
          alterações ao pacto. Contrata-se por um período e <strong>caduca</strong> no fim dele.
        </Paragrafo>
        <Paragrafo>
          A subscrição caducada não apaga o registo — apaga o acesso. E quem precisa de a apresentar
          descobre-o normalmente no dia em que precisa.
        </Paragrafo>
        <Nota titulo="Confere a «forma de obrigar» antes de assinar contratos">
          É onde se lê quem pode vincular a sociedade e com que assinaturas. Um contrato assinado por
          quem não tinha poderes é um problema que se resolve mal e tarde.
        </Nota>
      </Seccao>

      <Seccao titulo="Aprovar e depositar as contas">
        <Paragrafo>
          As contas do exercício são <strong>aprovadas em assembleia geral</strong>, com ata, e depois{" "}
          <strong>depositadas</strong> no registo comercial. São dois atos, não um — e o segundo é o
          que mais falha.
        </Paragrafo>
        <Paragrafo>
          Este guia <strong>não publica as datas</strong>. Os prazos dependem do exercício da
          sociedade e têm sido objeto de prorrogações anuais; publicar um dia concreto seria dar por
          fixo o que muda. Confirma-os no calendário do ano, ou com o teu contabilista certificado.
        </Paragrafo>
        <AvisoPrazo titulo="Depositar não é o mesmo que entregar a IES">
          A IES cumpre várias obrigações de uma vez, incluindo o registo do depósito de contas. Mas
          continua a ser preciso <strong>aprovar</strong> as contas em assembleia e ter a ata — e é
          isso que uma inspeção ou um comprador pedem.
        </AvisoPrazo>
        <VaiPara href="/guias/modelo-22-e-ies">
          A Modelo 22 e a IES, e o que cada uma cumpre
        </VaiPara>
      </Seccao>

      <Seccao titulo="O livro de atas, que existe e é pedido">
        <Paragrafo>
          Deliberações de sócios registam-se em ata: aprovação de contas, distribuição de lucros,
          nomeação e destituição de gerentes, alterações ao pacto, prestações suplementares.
        </Paragrafo>
        <Paragrafo>
          Não é burocracia decorativa. Numa venda da empresa, numa due diligence, num litígio entre
          sócios, é a primeira coisa pedida — e reconstruir atas cinco anos depois não é possível de
          forma credível.
        </Paragrafo>
        <Nota titulo="Uma ata por deliberação, com data e assinaturas">
          A regra prática que evita quase todos os problemas: escrever no dia, não no fim do ano.
        </Nota>
      </Seccao>

      <Seccao titulo="A rotina mínima de uma sociedade">
        <Passos
          passos={[
            {
              titulo: "Confirmar o RCBE hoje, e sempre que a titularidade mudar",
              texto: "Cinco minutos. É a verificação com melhor relação entre esforço e problemas evitados de toda esta lista.",
            },
            {
              titulo: "Renovar a certidão permanente antes de caducar",
              texto: "Anota a data de fim da subscrição no calendário. Renovar depois de precisar dela é sempre pior.",
            },
            {
              titulo: "Marcar a assembleia de aprovação de contas com antecedência",
              texto: "Convocatória, ata, aprovação. Quem só se lembra na semana do prazo faz as três coisas mal.",
            },
            {
              titulo: "Depositar as contas e guardar o comprovativo",
              texto: "O depósito é o ato que fica registado publicamente. É o que um terceiro consegue verificar sobre a tua empresa.",
            },
            {
              titulo: `Manter a situação regularizada: ${ICE.exigeSituacaoRegularizada.value}`,
              texto: "É condição de acesso a benefícios fiscais e a apoios públicos, e o que mais bloqueia candidaturas — muitas vezes por uma coima antiga e pequena.",
            },
            {
              titulo: "Escrever a ata no dia da deliberação",
              texto: "É a única forma de ter um livro de atas que resista a ser lido por terceiros.",
            },
          ]}
        />
        <Paragrafo>
          Para referência, do lado fiscal: o IRC tem taxa geral de{" "}
          {pctExato(IRC_TAXA_GERAL.value)} e taxa reduzida de {pctExato(IRC_TAXA_PME.value)} sobre os
          primeiros {fmt(IRC_LIMITE_PME.value)} de matéria coletável das PME.
        </Paragrafo>
        <VaiPara href="/guias/situacao-regularizada">
          As certidões, o que as bloqueia e como se desbloqueiam
        </VaiPara>
        <VaiPara href="/guias/fechar-empresa">
          O que é preciso ter em dia para poder encerrar
        </VaiPara>
      </Seccao>
    </>
  );
}
