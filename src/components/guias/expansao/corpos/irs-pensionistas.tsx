import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { DEDUCAO_ESPECIFICA_PENSOES, MINIMO_EXISTENCIA } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 53.º do CIRS (n.os 1, 2 e 4), art. 11.º, art. 70.º e art. 99.º.
//
// Achado relevante: na redação da Lei n.º 45-A/2024, o art. 53.º JÁ NÃO TEM
// VALOR PRÓPRIO. Remete para «o previsto na alínea a) do n.º 1 do artigo
// 25.º» — a dedução do trabalho dependente. O valor fixo que o pacote
// trazia está desatualizado; o motor passa a derivá-lo. Ver `correcoes.ts`.
export default function CorpoIrsPensionistas() {
  return (
    <>
      <Seccao titulo="O que é Categoria H">
        <Paragrafo>
          É a categoria das <strong>pensões</strong> — de velhice, de invalidez, de sobrevivência —,
          e também das rendas temporárias ou vitalícias e das prestações a título de pensões de
          alimentos.
        </Paragrafo>
        <Paragrafo>
          Ao contrário do que muita gente assume, a pensão <strong>é rendimento tributável</strong> e
          entra no englobamento como qualquer outro. O que a distingue é ter uma dedução específica
          própria, generosa, que faz com que muitas pensões acabem por não pagar imposto nenhum.
        </Paragrafo>
        <Nota titulo="Não pagar imposto não é o mesmo que não declarar">
          A obrigação declarativa e a existência de imposto a pagar são coisas diferentes. Há
          situações de dispensa de declaração, mas resultam de regras próprias — não do facto de a
          conta dar zero.
        </Nota>
      </Seccao>

      <Seccao titulo="A dedução específica">
        <Paragrafo>
          Aqui está o achado deste guia, e muda o que se pode escrever. Na redação em vigor, o art.
          53.º <strong>já não fixa um valor próprio</strong>: manda deduzir «o previsto na alínea a)
          do n.º 1 do artigo 25.º» — a dedução específica do trabalho dependente.
        </Paragrafo>
        <Paragrafo>
          Ou seja: a dedução das pensões é <em>a mesma</em> do trabalho dependente, e acompanha-a
          quando ela mudar. O valor do ano está na tabela de dados aqui em baixo —{" "}
          <strong>{fmt(DEDUCAO_ESPECIFICA_PENSOES.value)}</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="Valores fixos que circulam por aí estão desatualizados">
          Durante anos o artigo teve um montante escrito na própria norma, e é esse que se continua a
          ver repetido. Deixou de ser assim. Se encontrares um número diferente do desta tabela, o
          mais provável é que venha de uma redação antiga.
        </AvisoPrazo>
        <Nota titulo="Rendimentos abaixo da dedução não pagam nada">
          A lei diz que aos rendimentos brutos de valor anual igual ou inferior a esse montante se
          deduz <strong>a totalidade do seu quantitativo</strong>, por titular. Abaixo do limiar, a
          matéria coletável da categoria H é zero.
        </Nota>
      </Seccao>

      <Seccao titulo="Retenção na fonte sobre pensões">
        <Paragrafo>
          As pensões sofrem retenção na fonte mensal, por tabelas próprias, distintas das do trabalho
          dependente. A entidade que paga — a Segurança Social, a Caixa Geral de Aposentações, um
          fundo de pensões — retém e entrega ao Estado.
        </Paragrafo>
        <Paragrafo>
          A retenção é um <strong>adiantamento</strong>, não o imposto final. O acerto faz-se na
          declaração: quem reteve a mais recebe reembolso, quem reteve a menos paga a diferença.
        </Paragrafo>
        <AvisoPrazo titulo="Duas pensões retêm cada uma como se fosse a única">
          É a causa mais comum de acertos desagradáveis. Cada entidade retém sobre o que paga, sem
          saber da outra — e a soma das duas, no englobamento, cai num escalão mais alto do que
          qualquer uma isoladamente. Quem recebe duas pensões deve contar com isso.
        </AvisoPrazo>
        <VaiPara href="/guias/retencao-na-fonte">
          Como funciona a retenção, e porque é só um adiantamento
        </VaiPara>
      </Seccao>

      <Seccao titulo="Mínimo de existência">
        <Paragrafo>
          É a garantia de que a tributação não empurra ninguém abaixo de um patamar de subsistência.
          O valor de referência está na tabela de dados —{" "}
          <strong>{fmt(MINIMO_EXISTENCIA.value)}</strong> — e funciona como um travão sobre o imposto
          apurado.
        </Paragrafo>
        <Paragrafo>
          Para as pensões, na prática, o efeito combinado da dedução específica com o mínimo de
          existência faz com que uma parte substancial dos pensionistas não tenha imposto a pagar.
        </Paragrafo>
        <Nota titulo="É um travão, não uma isenção">
          O mecanismo não retira o rendimento da tributação: limita o imposto resultante. A diferença
          nota-se quando há outros rendimentos a somar.
        </Nota>
        <VaiPara href="/dashboard/simulador">
          Simular o IRS com a pensão e os restantes rendimentos
        </VaiPara>
      </Seccao>

      <Seccao titulo="Pensões do estrangeiro">
        <Paragrafo>
          Sendo residente em Portugal, declaras a pensão estrangeira cá — a sujeição é pela totalidade
          dos rendimentos, incluindo os obtidos fora. A categoria é a mesma, e a dedução específica
          aplica-se igualmente.
        </Paragrafo>
        <Paragrafo>
          O que muda é o mecanismo de eliminação da dupla tributação, que depende da convenção com o
          país de origem — e as <strong>pensões públicas</strong> seguem, na generalidade das
          convenções, uma regra própria e diferente das privadas.
        </Paragrafo>
        <AvisoPrazo titulo="Não vem pré-preenchida, e a obrigação existe na mesma">
          Nenhuma entidade estrangeira comunica nada à AT portuguesa. A pensão declara-se no anexo do
          estrangeiro, pelo bruto, com o país da fonte e o imposto aí retido.
        </AvisoPrazo>
        <VaiPara href="/guias/pensao-estrangeira">
          Pensão do estrangeiro: qual país tributa, e como se elimina a dupla tributação
        </VaiPara>
      </Seccao>

      <Seccao titulo="Acumulação com trabalho">
        <Paragrafo>
          Um pensionista pode trabalhar — por conta de outrem ou por conta própria. E os rendimentos{" "}
          <strong>somam-se</strong> no englobamento: a pensão da categoria H, o salário da A, os
          recibos verdes da B.
        </Paragrafo>
        <Paragrafo>
          A consequência é a mesma das duas pensões, amplificada: cada fonte retém como se fosse a
          única, e o escalão final é o da soma. É a origem da maior parte dos acertos altos de quem
          acumula.
        </Paragrafo>
        <Nota titulo="A dedução específica não se acumula livremente">
          Havendo rendimentos das categorias A e H, as deduções específicas de cada uma não se somam
          sem limite — há regras próprias de articulação. Vale a pena simular antes de assumir.
        </Nota>
        <VaiPara href="/guias/reformado-recibos-verdes">
          Reformado a passar recibos verdes: o quadro completo
        </VaiPara>
      </Seccao>
    </>
  );
}
