import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { SS_ACUMULACAO_LIMITE_IAS, SS_ACUMULACAO_LIMITE_MENSAL, SS_ISENCAO_PRIMEIRO_ANO_MESES, SS_MIN_MENSAL, SS_TAXA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o Código dos Regimes Contributivos
// e a informação oficial da Segurança Social. Os limiares indexados ao IAS
// vêm do motor e acompanham o IAS do ano.
export default function CorpoIsencaoContribuicoesSs() {
  return (
    <>
      <Seccao titulo="Isenção no primeiro ano de atividade">
        <Paragrafo>
          É a mais conhecida e a mais mal compreendida. Nos primeiros{" "}
          <strong>{SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses</strong> de atividade não há
          contribuições a pagar. A isenção é <strong>automática</strong> — não se pede, não se
          renova, e termina sozinha.
        </Paragrafo>
        <Paragrafo>
          O que não termina é a obrigação declarativa: a{" "}
          <strong>declaração trimestral entrega-se na mesma</strong>, durante todo o período de
          isenção. É aí que muita gente ganha o hábito de não declarar — e é esse hábito que cria o
          problema no segundo ano.
        </Paragrafo>
        <AvisoPrazo titulo="O segundo ano é onde as contas rebentam">
          Com exatamente a mesma faturação, aparece um custo fixo que antes não existia. Quem
          calibrou a vida pelo líquido do primeiro ano encontra no décimo terceiro mês uma despesa
          nova e permanente. Simula o segundo ano <em>durante</em> o primeiro.
        </AvisoPrazo>
        <VaiPara href="/dashboard/simulador">Simular o ano completo, com contribuições</VaiPara>
      </Seccao>

      <Seccao titulo="Acumulação com trabalho dependente">
        <Paragrafo>
          Quem trabalha por conta de outrem e tem atividade aberta em paralelo pode estar dispensado
          de contribuir pela atividade independente — mas há condições, e a principal é um{" "}
          <strong>limiar de remuneração</strong> no trabalho dependente.
        </Paragrafo>
        <Paragrafo>
          A remuneração média mensal do trabalho por conta de outrem tem de ser igual ou superior a{" "}
          <strong>{SS_ACUMULACAO_LIMITE_IAS.value} × IAS</strong>, o que dá{" "}
          <strong>{fmt(SS_ACUMULACAO_LIMITE_MENSAL.value)}</strong> com o IAS deste ano. A lógica é
          simples: já estás a contribuir acima de um patamar, e o sistema não te pede duas vezes.
        </Paragrafo>
        <AvisoPrazo titulo="O limiar acompanha o IAS, e o IAS sobe todos os anos">
          Um valor que estava acima do limiar num ano pode ficar abaixo no seguinte sem que o teu
          salário tenha descido. Verifica a condição em cada ano — a isenção não é um estatuto
          adquirido.
        </AvisoPrazo>
        <Nota titulo="Há uma segunda condição que se esquece">
          Além do limiar, a atividade independente e o trabalho dependente têm de ser prestados a
          entidades diferentes — ou a entidades sem relação de domínio ou de grupo entre si. Faturar
          à mesma empresa que te emprega não cabe nesta isenção.
        </Nota>
        <VaiPara href="/guias/acumulacao-emprego">
          Acumular emprego e atividade independente
        </VaiPara>
      </Seccao>

      <Seccao titulo="Pensionistas">
        <Paragrafo>
          Há situações de isenção contributiva para pensionistas que exercem atividade independente,
          e elas <strong>variam com o tipo e o valor da pensão</strong> — não há uma regra única que
          se possa escrever aqui e que sirva a toda a gente.
        </Paragrafo>
        <Paragrafo>
          O que é comum a todas: quem já recebe pensão de velhice ou de invalidez está numa relação
          diferente com o sistema, e a lei reconhece isso. O que muda entre casos é se a isenção é
          total, parcial ou inexistente.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma o teu caso concreto na Segurança Social">
          As condições constam do Código dos Regimes Contributivos e dependem do regime da tua
          pensão. É uma verificação de cinco minutos na Segurança Social Direta, e evita meses de
          contribuições indevidas — ou de dívida por contribuições que afinal eram devidas.
        </AvisoPrazo>
        <VaiPara href="/guias/reformado-recibos-verdes">
          Reformado a passar recibos verdes: o quadro completo
        </VaiPara>
      </Seccao>

      <Seccao titulo="O limiar de rendimento anual">
        <Paragrafo>
          Existe também um patamar de rendimento anual da própria atividade independente abaixo do
          qual não há enquadramento obrigatório no regime dos trabalhadores independentes.
        </Paragrafo>
        <Paragrafo>
          É o que resolve o caso de quem tem uma atividade residual — um trabalho pontual por ano,
          uma colaboração ocasional — e não deve ficar com uma obrigação contributiva mensal por
          causa disso. O limiar é indexado ao <strong>IAS</strong>, e por isso muda todos os anos.
        </Paragrafo>
        <Nota titulo="Indexado ao IAS significa que se verifica todos os anos">
          Como o limiar da acumulação, este acompanha o indexante dos apoios sociais. Uma atividade
          que ficava fora do enquadramento pode passar a ficar dentro sem que a faturação tenha
          mudado.
        </Nota>
      </Seccao>

      <Seccao titulo="O que a isenção custa em proteção social">
        <Paragrafo>
          É o outro lado, e é o que quase nunca se diz. Não contribuir significa{" "}
          <strong>não ter remuneração registada</strong> — e a remuneração registada é o que forma
          todos os direitos.
        </Paragrafo>
        <Paragrafo>
          Um período isento é um período que não conta para o prazo de garantia do subsídio de
          doença, não conta para a parentalidade, não conta para o desemprego e não conta para a
          pensão. Não é um período neutro: é um buraco na carreira.
        </Paragrafo>
        <AvisoPrazo titulo="Na isenção por acumulação, os descontos do emprego cobrem-te">
          É a diferença importante entre as duas situações. Quem está isento por acumulação continua
          a ter remuneração registada — a do trabalho dependente. Quem está isento no primeiro ano de
          atividade, e não tem outro vínculo, não tem nada a registar nesses{" "}
          {SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses.
        </AvisoPrazo>
        <VaiPara href="/guias/reforma-independentes">
          O que os períodos isentos custam na pensão
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quando a isenção cessa">
        <Paragrafo>
          Por três vias, e nenhuma delas te avisa com antecedência.
        </Paragrafo>
        <Paragrafo>
          · <strong>Por decurso do tempo</strong> — a isenção do início de atividade termina ao fim
          dos {SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses, sozinha.
          <br />· <strong>Por deixar de se verificar a condição</strong> — o emprego que sustentava a
          isenção por acumulação acabou, ou a remuneração desceu abaixo do limiar.
          <br />· <strong>Por atualização do IAS</strong>, que sobe os limiares e pode deixar-te de
          fora sem que nada tenha mudado do teu lado.
        </Paragrafo>
        <Paragrafo>
          Cessada a isenção, aplica-se a taxa de <strong>{pctExato(SS_TAXA.value)}</strong> sobre a
          base de incidência, com o mínimo mensal de{" "}
          <strong>{fmt(SS_MIN_MENSAL.value)}</strong> — mesmo em trimestres sem faturação.
        </Paragrafo>
        <AvisoPrazo titulo="Comunicar a alteração é obrigação tua">
          Perder o emprego que sustentava a isenção por acumulação é uma alteração a comunicar à
          Segurança Social. Não comunicar não mantém a isenção: cria dívida retroativa, que aparece
          toda de uma vez.
        </AvisoPrazo>
        <VaiPara href="/guias/declaracao-trimestral-ss">
          A declaração trimestral, que se entrega mesmo durante a isenção
        </VaiPara>
      </Seccao>
    </>
  );
}
