import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { DEDUCAO_ESPECIFICA_PENSOES, REGIME_SIMPLIFICADO, RETENCAO, SS_ISENCAO_PRIMEIRO_ANO_MESES, SS_TAXA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026: arts. 22.º, 31.º, 53.º e 101.º do CIRS
// (via motor) e o Código dos Regimes Contributivos quanto à isenção.
//
// O pacote manda «confirmar as regras de isenção contributiva de
// pensionistas no Código Contributivo em vigor — variam com o tipo e o
// valor da pensão». Variam mesmo, e não há regra única que se possa
// escrever: o guia descreve o mecanismo e manda confirmar o caso concreto.
export default function CorpoReformadoRecibosVerdes() {
  return (
    <>
      <Seccao titulo="Acumulação: o que a lei permite">
        <Paragrafo>
          Um pensionista <strong>pode</strong> exercer atividade independente. Não há proibição
          geral, e abrir atividade não põe a pensão em causa na generalidade dos casos.
        </Paragrafo>
        <Paragrafo>
          O que muda são três coisas, e é sobre elas que este guia trata: o{" "}
          <strong>regime contributivo</strong>, a <strong>soma dos rendimentos</strong> no
          englobamento, e — só nalgumas pensões — <strong>restrições próprias</strong> ao exercício de
          atividade.
        </Paragrafo>
        <Nota titulo="Abrir atividade é o mesmo processo de sempre">
          Declaração de início de atividade nas Finanças, escolha do enquadramento e do regime de
          IVA. Ser pensionista não muda nenhum desses passos.
        </Nota>
        <VaiPara href="/guias/abrir-atividade">Como se abre atividade</VaiPara>
      </Seccao>

      <Seccao titulo="O regime contributivo do pensionista">
        <Paragrafo>
          Há situações de <strong>isenção contributiva</strong> para pensionistas que exercem
          atividade independente — e há situações em que a contribuição é devida normalmente, à taxa
          de <strong>{pctExato(SS_TAXA.value)}</strong> sobre a base de incidência.
        </Paragrafo>
        <Paragrafo>
          A diferença depende do <strong>tipo</strong> e do <strong>valor</strong> da pensão, e não
          há uma regra única que sirva a todos os casos. É por isso que este guia não te diz se estás
          isento: diz-te que a resposta existe e onde a obter.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma na Segurança Social Direta antes de assumir">
          É uma verificação de minutos e evita dois erros caros e simétricos: pagar contribuições que
          não eram devidas durante anos, ou acumular dívida por contribuições que afinal eram. A
          resposta genérica que ouvires de outro pensionista pode não ser a tua.
        </AvisoPrazo>
        <Nota titulo="A isenção do início de atividade aplica-se na mesma">
          Quem abre atividade já reformado tem, como qualquer outro,{" "}
          {SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses de isenção contributiva desde o início. É uma
          isenção que se soma às regras próprias dos pensionistas, não uma alternativa a elas.
        </Nota>
        <VaiPara href="/guias/isencao-contribuicoes-ss">
          As situações de isenção, e quando cessam
        </VaiPara>
      </Seccao>

      <Seccao titulo="Pensão e Categoria B somam-se no englobamento">
        <Paragrafo>
          É a consequência que mais surpreende, e é aritmética. A pensão é rendimento da categoria H;
          os recibos verdes são categoria B. As duas <strong>somam-se</strong> para determinar o
          rendimento coletável — e o escalão aplicável é o da soma.
        </Paragrafo>
        <Paragrafo>
          Cada uma tem a sua dedução própria: a pensão tem a dedução específica de{" "}
          <strong>{fmt(DEDUCAO_ESPECIFICA_PENSOES.value)}</strong>; a categoria B tem o coeficiente
          do regime simplificado —{" "}
          {pctExato(REGIME_SIMPLIFICADO.coefServicos151.value)} nas profissões da tabela do art.
          151.º, {pctExato(REGIME_SIMPLIFICADO.coefOutrosServicos.value)} nas restantes prestações de
          serviços.
        </Paragrafo>
        <AvisoPrazo titulo="Uma atividade pequena pode custar mais imposto do que rende de líquido">
          Se a pensão já te coloca num escalão alto, cada euro faturado é tributado à taxa marginal
          desse escalão — não à taxa média. Antes de abrir atividade por um valor modesto, vale a
          pena fazer a conta com a pensão incluída.
        </AvisoPrazo>
        <VaiPara href="/dashboard/simulador">
          Simular a pensão e a atividade juntas
        </VaiPara>
      </Seccao>

      <Seccao titulo="Retenção na fonte em cada rendimento">
        <Paragrafo>
          As duas fontes retêm separadamente, e nenhuma delas sabe da outra.
        </Paragrafo>
        <Paragrafo>
          A entidade que paga a pensão retém pelas tabelas próprias das pensões, como se a pensão
          fosse o teu único rendimento. Os clientes com contabilidade organizada retêm sobre as
          faturas à taxa do teu enquadramento —{" "}
          <strong>{pctExato(RETENCAO.art151.value)}</strong> nas profissões do art. 151.º.
        </Paragrafo>
        <AvisoPrazo titulo="A soma das retenções fica quase sempre abaixo do imposto devido">
          Cada uma foi calculada ignorando a outra. No acerto anual aparece a diferença — e para quem
          acumula é sistematicamente a pagar, não a receber. Reserva para isso durante o ano.
        </AvisoPrazo>
        <Nota titulo="Podes pedir retenção mais alta na pensão">
          As entidades que pagam pensões admitem, em regra, retenção a taxa superior à das tabelas, a
          pedido do titular. É a forma mais simples de espalhar pelo ano um acerto que de outro modo
          aparece todo em julho.
        </Nota>
      </Seccao>

      <Seccao titulo="Pensões de invalidez: as restrições">
        <Paragrafo>
          Aqui a resposta é diferente, e é preciso dizê-lo com clareza. As pensões por{" "}
          <strong>invalidez</strong> assentam num pressuposto de incapacidade para o trabalho — e
          exercer atividade pode ser incompatível com esse pressuposto.
        </Paragrafo>
        <Paragrafo>
          As regras variam com o grau de invalidez reconhecido e com o regime da pensão. Há situações
          em que o exercício de atividade é admitido dentro de limites, e há situações em que
          determina a suspensão ou a cessação da pensão.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma ANTES de abrir atividade, não depois">
          Ao contrário de quase tudo neste site, aqui o erro não se corrige com uma declaração de
          substituição: pode implicar a devolução de pensões recebidas. É a única situação deste guia
          em que a verificação prévia não é conselho — é indispensável.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O efeito sobre a própria pensão">
        <Paragrafo>
          Nas pensões de <strong>velhice</strong>, exercer atividade não reduz a pensão já atribuída.
          O valor foi fixado com base na carreira contributiva até à data da atribuição, e não se
          recalcula por causa de rendimentos posteriores.
        </Paragrafo>
        <Paragrafo>
          Contribuindo pela atividade — quando não haja isenção — continuas a gerar registo de
          remunerações. O efeito disso sobre a pensão já atribuída depende do regime aplicável, e é
          matéria a confirmar na Segurança Social.
        </Paragrafo>
        <Nota titulo="O que muda de certeza é o líquido, não a pensão">
          A pensão bruta mantém-se. O que muda é o imposto sobre o conjunto — e é aí, e não na pensão,
          que a acumulação se sente.
        </Nota>
        <VaiPara href="/guias/irs-pensionistas">
          O IRS de quem recebe pensão, em detalhe
        </VaiPara>
        <VaiPara href="/guias/reforma-independentes">
          Como a base declarada se transforma em pensão
        </VaiPara>
      </Seccao>
    </>
  );
}
