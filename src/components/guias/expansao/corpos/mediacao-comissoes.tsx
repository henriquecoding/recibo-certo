import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado a 07/08/2026 contra o articulado na coleção consolidada:
// art. 36.º, n.º 1 do CIVA (prazo de emissão), art. 53.º do CIVA, e arts.
// 3.º, 31.º e 101.º do CIRS.
export default function CorpoMediacaoComissoes() {
  return (
    <>
      <Seccao titulo="Enquadramento e coeficiente">
        <Paragrafo>
          O rendimento da mediação é <strong>comissão</strong>, e tributa-se na categoria B como
          qualquer outra prestação de serviços. O que a distingue não é a natureza do rendimento — é
          o desencontro entre o momento em que o serviço se conclui e o momento em que o dinheiro
          chega.
        </Paragrafo>
        <Paragrafo>
          O enquadramento faz-se por profissão da tabela do art. 151.º ou por CAE, com os
          coeficientes e retenções da tabela de dados aqui em baixo. Confirma o teu caso concreto: a
          mediação imobiliária e a agência comercial não têm necessariamente o mesmo enquadramento.
        </Paragrafo>
        <VaiPara href="/dashboard/classificar-atividade">
          Ferramenta para classificar a tua atividade
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quando emitir a fatura">
        <Paragrafo>
          É o ponto crítico deste guia. A fatura deve ser emitida{" "}
          <strong>o mais tardar no 5.º dia útil seguinte</strong> ao momento em que o imposto é
          devido — e não quando recebes.
        </Paragrafo>
        <Paragrafo>
          Há uma regra que apanha o caso mais frequente da mediação: recebendo um{" "}
          <strong>adiantamento</strong> por um serviço ainda não prestado, a fatura emite-se{" "}
          <strong>na data do recebimento</strong>. Um sinal recebido antes da escritura obriga a
          faturar nesse momento, ainda que o negócio venha a não se concretizar.
        </Paragrafo>
        <AvisoPrazo titulo="Faturar em dezembro põe o rendimento nesse ano">
          Na categoria B, a obrigação nasce com a emissão da fatura, não com o recebimento. Uma
          comissão faturada a 30 de dezembro e paga em março é rendimento do ano da fatura — e o
          imposto sobre ela vence-se antes de o dinheiro entrar.
        </AvisoPrazo>
        <VaiPara href="/guias/fatura-vs-recibo">
          A diferença entre faturar e receber, e o que cada documento faz
        </VaiPara>
        <VaiPara href="/guias/fatura-nao-paga">
          O que fazer quando a comissão faturada não é paga
        </VaiPara>
      </Seccao>

      <Seccao titulo="IVA sobre comissões">
        <Paragrafo>
          A mediação é uma prestação de serviços tributável. Abaixo do limiar de isenção do art.
          53.º — o valor está na tabela de dados — não liquidas IVA; acima dele, liquidas à taxa
          normal.
        </Paragrafo>
        <Paragrafo>
          Há duas situações que compensa conhecer. A mediação de <strong>serviços financeiros e de
          seguros</strong> tem isenções próprias no art. 9.º, que não se aplicam à mediação
          imobiliária comum. E a mediação relacionada com um <strong>imóvel</strong> situado noutro
          país localiza-se onde o imóvel está — não onde tu estás.
        </Paragrafo>
        <AvisoPrazo titulo="No regime normal, o IVA da comissão não é receita tua">
          Recebes o valor com imposto incluído e entregas-o na declaração periódica. Quem o trata
          como parte da comissão gasta dinheiro que estava só de passagem.
        </AvisoPrazo>
        <VaiPara href="/guias/declaracao-periodica-iva">A declaração periódica de IVA</VaiPara>
      </Seccao>

      <Seccao titulo="Retenção na fonte">
        <Paragrafo>
          Há retenção quando quem paga a comissão é entidade com contabilidade organizada — uma
          agência, uma promotora, uma empresa. A taxa segue o teu enquadramento, e os dois cenários
          estão na tabela de dados.
        </Paragrafo>
        <Paragrafo>
          Não há retenção quando quem paga é particular. Na mediação isso é comum, e significa que o
          imposto dessas comissões não é adiantado ao longo do ano: aparece todo no acerto.
        </Paragrafo>
        <Nota titulo="A retenção incide sobre a comissão, não sobre o valor do negócio">
          Parece óbvio e é fonte de erro real quando a fatura mistura a comissão com montantes que
          apenas passam por ti. Separa sempre o que é comissão do que é reembolso ou trânsito.
        </Nota>
      </Seccao>

      <Seccao titulo="Seguro de responsabilidade civil obrigatório">
        <Paragrafo>
          A mediação imobiliária está sujeita a licenciamento e a seguro de responsabilidade civil
          obrigatório, com requisitos definidos pela legislação do setor e verificados pelo
          regulador competente.
        </Paragrafo>
        <Paragrafo>
          Os capitais mínimos e as coberturas exigidas confirmam-se junto do regulador. Este guia
          trata do enquadramento fiscal e contributivo; o licenciamento e o seguro obrigatório
          seguem regras próprias que mudam por diploma setorial.
        </Paragrafo>
        <Nota titulo="O prémio é despesa da atividade">
          Conta para a regra das despesas a justificar no regime simplificado e deduz-se pelo valor
          efetivo na
          contabilidade organizada.
        </Nota>
      </Seccao>

      <Seccao titulo="Comissões partilhadas e subcontratação">
        <Paragrafo>
          Quando a comissão é partilhada com outro mediador, o tratamento correto é o mais simples:
          cada um fatura a sua parte a quem lha deve. Não é uma dedução na tua fatura — é uma
          operação entre dois sujeitos passivos.
        </Paragrafo>
        <Paragrafo>
          Se recebes a comissão toda e depois pagas parte a outro, tens{" "}
          <strong>receita pelo total</strong> e <strong>despesa pela parte paga</strong>, com fatura
          dele para ti. Sem essa fatura, ficas com a receita inteira e sem o custo — e pagas imposto
          sobre dinheiro que não é teu.
        </Paragrafo>
        <AvisoPrazo titulo="Um acordo verbal de partilha não substitui documento">
          É o erro mais caro desta atividade, e o mais frequente. O que a AT vê é o que está
          documentado: a tua fatura pelo total e nada do lado da despesa.
        </AvisoPrazo>
        <Nota titulo="A subcontratação é a mesma lógica">
          Quem te presta serviços — angariação, fotografia, home staging — emite-te fatura, e essa
          fatura é a tua despesa. Sem ela, o custo existiu e não conta para nada.
        </Nota>
      </Seccao>
    </>
  );
}
