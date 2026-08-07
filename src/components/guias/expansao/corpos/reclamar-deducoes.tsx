import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { IRS_AUTOMATICO, REVISAO_E_RECLAMACAO } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026: arts. 78.º e 78.º-A a 78.º-E do CIRS,
// art. 70.º do CPPT, art. 78.º da LGT e art. 58.º-A, n.º 3 do CIRS.
//
// Como no guia do e-Fatura, as datas da janela anual de reclamação NÃO se
// fixam aqui: mudam todos os anos e podem ser prorrogadas por despacho. O
// que se fixa são os prazos que estão na lei.
export default function CorpoReclamarDeducoes() {
  return (
    <>
      <Seccao titulo="Onde se consultam as deduções apuradas">
        <Paragrafo>
          Fechada a validação de faturas, a AT publica no Portal das Finanças o{" "}
          <strong>montante de deduções apurado</strong> para cada categoria — e é esse valor, e não
          as tuas faturas, que entra na liquidação.
        </Paragrafo>
        <Paragrafo>
          Vale a pena olhar categoria a categoria em vez de olhar para o total. Um total plausível
          pode esconder uma categoria a zero, e é a categoria que revela o erro.
        </Paragrafo>
        <Nota titulo="Compara com o ano anterior, não com a tua expectativa">
          A memória do que se gastou é má conselheira. O ano anterior é a referência útil: uma
          categoria que caiu para metade sem razão aparente é o sinal a investigar.
        </Nota>
        <VaiPara href="/guias/deducoes-coleta">
          As deduções à coleta, com as regras e os limites de cada categoria
        </VaiPara>
      </Seccao>

      <Seccao titulo="O prazo de reclamação">
        <Paragrafo>
          Há uma <strong>janela anual curta</strong> para contestar o valor apurado, anunciada no
          Portal das Finanças. Este guia não fixa as datas de propósito: mudam todos os anos e podem
          ser prorrogadas por despacho, e uma data errada escrita aqui é pior do que nenhuma.
        </Paragrafo>
        <Paragrafo>
          O que interessa saber é a <em>ordem</em>: a janela abre depois de fechada a validação de
          faturas, e fecha <strong>antes</strong> do fim do prazo de entrega da declaração. É curta
          por construção — não é um prazo que se descubra por acaso.
        </Paragrafo>
        <AvisoPrazo titulo="Marca a data no ano em que a vires anunciada">
          É o único prazo do IRS que não tem um mês fixo na cabeça das pessoas, e é por isso que se
          perde. Quando consultares as deduções apuradas, verifica logo até quando podes reclamar.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Como se reclama">
        <Passos
          passos={[
            {
              titulo: "Identificar a categoria e o valor que discordas",
              texto: "A reclamação é por categoria, não pelo total. Ter claro qual é e quanto devia ser poupa metade do trabalho.",
            },
            {
              titulo: "Reunir os documentos que sustentam o valor",
              texto: "Faturas, recibos, contratos. Sem documento não há reclamação — há discordância.",
            },
            {
              titulo: "Submeter a reclamação no Portal das Finanças",
              texto: "Na área das deduções apuradas, dentro da janela anunciada. É um procedimento próprio, distinto da reclamação graciosa.",
            },
            {
              titulo: "Guardar o comprovativo de submissão",
              texto: "Com data. É o que demonstra que estiveste dentro do prazo, e o prazo é o que aqui se discute.",
            },
            {
              titulo: "Verificar o resultado antes de entregar a declaração",
              texto: "A decisão pode alterar o valor apurado — e é com o valor final que a declaração deve ser feita.",
            },
          ]}
        />
        <Nota titulo="Esta reclamação não é a reclamação graciosa">
          São dois procedimentos diferentes. Este contesta o <em>apuramento das deduções</em>, antes
          de haver liquidação. A reclamação graciosa contesta a <em>liquidação</em>, depois de ela
          existir — e tem outro prazo.
        </Nota>
      </Seccao>

      <Seccao titulo="O que fazer se o prazo passou">
        <Paragrafo>
          Não se perde a dedução: perde-se o caminho mais simples. Restam três vias, por ordem de
          facilidade.
        </Paragrafo>
        <Paragrafo>
          · <strong>Declarar manualmente na Modelo 3</strong>, nos campos próprios de cada categoria.
          É o caminho normal, e faz-se dentro do prazo de entrega.
          <br />· <strong>Reclamação graciosa</strong> da liquidação, no prazo de{" "}
          {REVISAO_E_RECLAMACAO.reclamacaoGraciosaDias.value} dias, se a liquidação já saiu.
          <br />· <strong>Revisão do ato tributário</strong>, com fundamento em erro imputável aos
          serviços, no prazo de {REVISAO_E_RECLAMACAO.revisaoPorErroDosServicosAnos.value} anos após
          a liquidação — e o pedido do contribuinte interrompe esse prazo.
        </Paragrafo>
        <AvisoPrazo titulo="Declarar manualmente transfere-te o ónus da prova">
          Quando a dedução vem apurada pela AT, os documentos estão do lado dela. Declarando
          manualmente, passam a estar do teu — e podem ser pedidos anos depois. Guarda tudo.
        </AvisoPrazo>
        <Nota titulo="E há uma janela sem penalidade que muita gente não conhece">
          Quem ficou com a declaração automática convertida por não ter feito nada pode substituí-la
          nos <strong>{IRS_AUTOMATICO.substituicaoSemPenalidadeDias.value} dias posteriores à
          liquidação</strong>, sem qualquer penalidade — e é aí que as deduções em falta ainda entram
          sem custo.
        </Nota>
        <VaiPara href="/guias/declaracao-substituicao">
          Os três relógios de quem quer corrigir
        </VaiPara>
      </Seccao>

      <Seccao titulo="Despesas que se declaram sempre manualmente">
        <Paragrafo>
          Há despesas que nunca aparecem no apuramento da AT — não por erro, mas porque não passam
          por fatura comunicada ao e-Fatura. Estas declaram-se sempre à mão, todos os anos.
        </Paragrafo>
        <Paragrafo>
          · <strong>Pensões de alimentos</strong> pagas por decisão judicial ou acordo homologado.
          <br />· <strong>Juros de crédito à habitação</strong>, nas situações em que ainda são
          dedutíveis, quando a instituição não os comunique.
          <br />· <strong>Despesas de saúde fora do e-Fatura</strong>, incluindo as feitas no
          estrangeiro.
          <br />· <strong>Prémios de seguros</strong> e contribuições em condições próprias.
          <br />· <strong>Donativos</strong> a entidades que não comuniquem.
        </Paragrafo>
        <Nota titulo="Recibos do estrangeiro não entram no e-Fatura de todo">
          Uma consulta ou um tratamento feitos noutro país nunca serão comunicados ao sistema
          português. Existem, são dedutíveis nas condições da lei — e só entram se as declarares.
        </Nota>
      </Seccao>

      <Seccao titulo="Efeito na liquidação">
        <Paragrafo>
          As deduções à coleta abatem ao imposto, não ao rendimento. É uma distinção que muda a
          leitura do resultado: 100 € de dedução valem 100 € de imposto, e não uma fração deles.
        </Paragrafo>
        <Paragrafo>
          Há um limite que trava tudo, e é ele que explica o caso mais frustrante deste guia: o{" "}
          <strong>limite global</strong> das deduções, em função do rendimento coletável. Quem já
          está no teto não ganha nada com faturas adicionais — reclamar não muda o imposto a pagar.
        </Paragrafo>
        <AvisoPrazo titulo="Antes de reclamar, verifica se estás no limite global">
          É a verificação que poupa mais tempo. Se as tuas deduções já batem no teto, a diferença que
          querias corrigir não tem efeito nenhum na liquidação — e o esforço é melhor gasto noutro
          sítio.
        </AvisoPrazo>
        <VaiPara href="/dashboard/simulador">
          Ver o efeito das deduções na tua liquidação, com o limite global aplicado
        </VaiPara>
      </Seccao>
    </>
  );
}
