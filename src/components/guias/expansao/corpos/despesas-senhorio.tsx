import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 8.º, 41.º e 51.º do CIRS.
export default function CorpoDespesasSenhorio() {
  return (
    <>
      <Seccao titulo="A regra geral do art. 41.º CIRS">
        <Paragrafo>
          Aos rendimentos brutos das rendas deduzem-se, <strong>prédio a prédio</strong>, todos os
          gastos efetivamente suportados <em>e pagos</em> para obter ou garantir esses rendimentos.
          As duas palavras contam: um gasto faturado mas não pago não deduz, e um gasto de um imóvel
          não abate à renda de outro.
        </Paragrafo>
        <Paragrafo>
          A lei nomeia expressamente os <strong>seguros de renda</strong> como dedutíveis. E fixa
          uma janela retroativa que quase ninguém usa: gastos com{" "}
          <strong>obras de conservação e manutenção suportados nos 24 meses anteriores</strong> ao
          início do arrendamento também deduzem, desde que entretanto o imóvel não tenha sido usado
          para outro fim que não o arrendamento.
        </Paragrafo>
        <Nota titulo="Se arrendas parte de um prédio, ou várias frações do mesmo">
          Os encargos de condomínio de frações autónomas imputam-se pela{" "}
          <strong>permilagem</strong> do título constitutivo. Se arrendas parte de um prédio com
          utilização independente, a imputação faz-se pelo valor patrimonial tributário dessa parte
          ou, na falta dele, pela proporção da área utilizável.
        </Nota>
      </Seccao>

      <Seccao titulo="IMI, condomínio e seguros">
        <Paragrafo>
          O <strong>IMI</strong> e o <strong>imposto do selo</strong> pagos num ano só são
          dedutíveis quando respeitem a prédio cujo rendimento seja tributado{" "}
          <em>nesse mesmo ano fiscal</em>. Um imóvel que esteve vago o ano inteiro não gera renda —
          e o IMI desse ano não deduz a lado nenhum.
        </Paragrafo>
        <Paragrafo>
          Os encargos de condomínio que o condómino esteja obrigado por lei a suportar são
          dedutíveis, desde que efetivamente pagos por ti. Os seguros de renda também.
        </Paragrafo>
        <AvisoPrazo titulo="O AIMI está expressamente excluído">
          A Lei n.º 56/2023 acrescentou o adicional ao IMI à lista de exceções do art. 41.º. É uma
          distinção fácil de falhar precisamente por o IMI deduzir: pagas os dois, deduzes um.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Conservação e manutenção vs. valorização">
        <Paragrafo>
          É a linha que separa este guia do seguinte. <strong>Conservar</strong> é manter o imóvel
          apto a ser arrendado — pintar, reparar uma canalização, substituir um esquentador
          avariado. Isso é gasto do ano e deduz aqui.
        </Paragrafo>
        <Paragrafo>
          <strong>Valorizar</strong> é outra coisa: uma obra que aumenta o valor do imóvel não é um
          custo de obter a renda, é investimento no bem. Não deduz na categoria F — mas não se
          perde. Vai acrescer ao valor de aquisição quando calculares a mais-valia da venda.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="O que fica de fora">
        <Paragrafo>
          A lista de exceções do art. 41.º é curta e é fechada. Não deduzem:
        </Paragrafo>
        <Paragrafo>
          · <strong>Gastos de natureza financeira</strong> — os juros do crédito à habitação do
          imóvel arrendado não abatem à renda.
          <br />· <strong>Depreciações</strong> — ao contrário da categoria B, aqui não se amortiza
          o imóvel.
          <br />· <strong>Mobiliário, eletrodomésticos e artigos de conforto ou decoração</strong> —
          equipar um apartamento para arrendar mobilado não gera dedução.
          <br />· O <strong>AIMI</strong>.
        </Paragrafo>
        <Nota titulo="Sublocação não deduz nada">
          Quem subloca é tributado pela diferença entre a renda que recebe e a que paga — e essa
          diferença <strong>não beneficia de dedução nenhuma</strong>. É um caso à parte, e o único
          em que a categoria F não admite gastos.
        </Nota>
      </Seccao>

      <Seccao titulo="Onde vão as obras que não deduzes aqui">
        <Paragrafo>
          Para a mais-valia. Ao valor de aquisição acrescem os{" "}
          <strong>encargos com a valorização do imóvel comprovadamente realizados nos últimos 12
          anos</strong>, mais as despesas necessárias e efetivamente praticadas inerentes à
          aquisição e à alienação.
        </Paragrafo>
        <Paragrafo>
          Doze anos é uma janela longa, e é por isso que vale a pena guardar as faturas das obras
          mesmo quando não deduzem nada no ano em que são feitas. Há uma exclusão a conhecer: não
          contam os encargos de valorização realizados durante o período em que o imóvel esteve
          afeto a atividade empresarial ou profissional.
        </Paragrafo>
        <VaiPara href="/guias/mais-valias-imoveis">
          Como a obra de hoje reduz o imposto da venda de amanhã
        </VaiPara>
      </Seccao>

      <Seccao titulo="Prova documental exigida">
        <Paragrafo>
          «Efetivamente suportados e pagos» é uma exigência de prova, não uma figura de estilo. Na
          prática significa fatura em nome do sujeito passivo, com o NIF, identificando o imóvel — e
          comprovativo de pagamento. Uma fatura sem prova de pagamento cumpre metade do requisito.
        </Paragrafo>
        <Paragrafo>
          Guarda tudo organizado por prédio e por ano, porque é assim que a dedução é feita e é
          assim que será pedida numa eventual verificação. E guarda as faturas de obras muito para
          lá do ano fiscal: a janela dos 12 anos da mais-valia é bastante mais longa do que o prazo
          que costuma levar as pessoas a deitar papéis fora.
        </Paragrafo>
        <VaiPara href="/guias/arrendamento-categoria-f">
          A taxa que se aplica depois de deduzires isto tudo
        </VaiPara>
        <VaiPara href="/guias/recibo-renda-modelo-44">
          O documento que tens de emitir por cada renda recebida
        </VaiPara>
      </Seccao>
    </>
  );
}
