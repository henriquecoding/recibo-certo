import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { MAIS_VALIAS_EXCLUSAO_DETENCAO, MAIS_VALIAS_REPORTE, OIC_NACIONAIS } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado contra o articulado no Portal das Finanças a 07/08/2026.
//
// O pacote de expansão trazia um aviso explícito neste guia: «o regime dos
// organismos de investimento coletivo tem especificidades (DL 7/2015) —
// confirmar antes de afirmar o tratamento de fundos nacionais». Foi
// confirmado, e são dois artigos que o pacote não incluía na base legal:
// art. 22.º do EBF (tributação do fundo) e art. 22.º-A (tributação do
// participante, na redação da Lei n.º 31/2024).
//
// Pelo caminho apareceu o que este guia não podia mesmo omitir: o n.º 5 do
// art. 43.º do CIRS, aditado pela Lei n.º 31/2024, que exclui parte do
// rendimento consoante o tempo de detenção — e que se aplica precisamente a
// ETFs, por serem valores mobiliários admitidos à negociação e partes de
// organismos de investimento coletivo abertos.
export default function CorpoEtfIrs() {
  return (
    <>
      <Seccao titulo="Acumulação vs. distribuição">
        <Paragrafo>
          A diferença é uma só, e não é fiscal — é de mecânica do fundo. Um ETF de{" "}
          <strong>distribuição</strong> entrega-te periodicamente os dividendos e juros que a
          carteira recebeu. Um ETF de <strong>acumulação</strong> reinveste-os dentro do próprio
          fundo, e o que cresce é o valor da tua unidade de participação.
        </Paragrafo>
        <Paragrafo>
          A consequência fiscal segue daí sem mais nada: <strong>só há rendimento quando algo te é
          pago</strong>. Na distribuição, cada pagamento é um facto tributário. Na acumulação, não
          há pagamento nenhum durante anos — e por isso não há nada a tributar até venderes.
        </Paragrafo>
        <Nota titulo="Não é isenção, é adiamento">
          O ETF de acumulação não paga menos imposto sobre o mesmo ganho. Paga <em>mais tarde</em>,
          e de uma vez. Quem o descreve como «não tributado» está a confundir a ausência de facto
          tributário anual com uma vantagem definitiva — que não existe.
        </Nota>
      </Seccao>

      <Seccao titulo="Fundos domiciliados em Portugal">
        <Paragrafo>
          Aqui há uma arquitetura que vale a pena perceber, porque explica tudo o resto. O fundo
          português <em>é</em> sujeito passivo de IRC. Mas a lei manda não considerar, no apuramento
          do seu lucro tributável, os rendimentos de capitais, prediais e mais-valias — isto é,
          exatamente aquilo de que uma carteira vive. O fundo está ainda isento de derrama municipal
          e estadual.
        </Paragrafo>
        <Paragrafo>
          O resultado é <strong>tributação à saída</strong>: o fundo acumula sem imposto sobre o
          retorno da carteira, e o imposto aparece quando o dinheiro chega ao participante. Não é
          isenção — é adiamento com mudança de sujeito.
        </Paragrafo>
        <Paragrafo>
          Do teu lado, o imposto chega já retido, e por duas vias distintas. Nos rendimentos{" "}
          <strong>distribuídos</strong>, por retenção na fonte com caráter definitivo. No{" "}
          <strong>resgate</strong> das unidades de participação, também por retenção a título
          definitivo — e é aqui que está o detalhe que quase ninguém conta: a norma do resgate manda
          ter em conta a exclusão por tempo de detenção, pelo que a escada da secção seguinte já vem
          aplicada na retenção.
        </Paragrafo>
        <Paragrafo>
          Em qualquer dos dois casos podes optar pelo <strong>englobamento</strong>. Fazendo-o, o que
          foi retido deixa de ser imposto definitivo e passa a ser imposto por conta — abatido à
          coleta no acerto final.
        </Paragrafo>
        <AvisoPrazo titulo="Se compraste as unidades a outra pessoa, tens de comunicar">
          Quem adquire unidades de participação em <strong>mercado secundário</strong> ou{" "}
          <strong>a título gratuito</strong> tem de comunicar à entidade registadora ou depositária a
          data e o valor de aquisição. Não o fazendo, a retenção no resgate incide sobre o{" "}
          <strong>montante bruto</strong> — ou seja, sobre o capital todo, e não apenas sobre o ganho.
          É o erro mais caro deste guia, e resolve-se com um formulário.
        </AvisoPrazo>
        <Nota titulo="Fundos imobiliários seguem outra porta">
          Nos fundos de investimento imobiliário, os rendimentos das unidades de participação —
          incluindo as mais-valias da transmissão, resgate ou liquidação — são considerados{" "}
          <strong>rendimentos de bens imóveis</strong>. A qualificação muda, e com ela mudam as
          regras que se lhes aplicam.
        </Nota>
      </Seccao>

      <Seccao titulo="Fundos domiciliados fora">
        <Paragrafo>
          A maior parte dos ETFs que se compram em Portugal está domiciliada na Irlanda ou no
          Luxemburgo. Não há entidade portuguesa no circuito, e portanto{" "}
          <strong>não há retenção cá</strong> — o que não é uma vantagem, é uma transferência de
          trabalho para ti.
        </Paragrafo>
        <Paragrafo>
          Sendo residente, és tributado pela totalidade dos teus rendimentos, incluindo os obtidos
          fora. As distribuições de um fundo estrangeiro são rendimentos de capitais e declaram-se
          pelo <strong>bruto</strong>, no anexo do estrangeiro, com o país da fonte e o imposto aí
          retido. As mais-valias da alienação declaram-se no mesmo anexo.
        </Paragrafo>
        <AvisoPrazo titulo="Nada disto vem pré-preenchido">
          O pré-preenchido alimenta-se do que as entidades portuguesas comunicam à AT, e uma gestora
          irlandesa não tem essa obrigação. A declaração fica em branco — a obrigação de a preencher
          não.
        </AvisoPrazo>
        <Nota titulo="A retenção que o fundo sofre lá dentro não é tua">
          Um ETF irlandês que investe em ações americanas sofre retenção nos EUA sobre os dividendos
          que recebe. Essa retenção é do <em>fundo</em>, não tua: não aparece em nenhum documento em
          teu nome e não dá direito a crédito de imposto no teu IRS. O que pode dar crédito é o
          imposto retido sobre o que o fundo te paga a ti.
        </Nota>
        <VaiPara href="/guias/anexo-j">
          O anexo do estrangeiro, campo a campo — e a identificação de contas
        </VaiPara>
        <VaiPara href="/guias/credito-imposto-estrangeiro">
          O duplo limite do crédito, quando houve imposto retido lá fora
        </VaiPara>
      </Seccao>

      <Seccao titulo="Mais-valias na alienação">
        <Paragrafo>
          Vender é sempre facto tributário, em fundo de acumulação como em fundo de distribuição. O
          que se tributa é o <strong>saldo</strong> entre mais-valias e menos-valias do ano, à taxa
          especial que consta da tabela de dados aqui em baixo, com opção de englobamento.
        </Paragrafo>
        <Paragrafo>
          E há uma escada que muda a conta e que é recente: quando os ativos são{" "}
          <strong>{MAIS_VALIAS_EXCLUSAO_DETENCAO.ambito.value}</strong> — o que descreve exatamente
          um ETF —, parte do rendimento fica <em>excluída</em> de tributação em função do tempo que o
          tiveste. A percentagem sobe por degraus, dos dois aos oito anos, e os valores estão na
          tabela de dados.
        </Paragrafo>
        <Nota titulo="Exclui-se rendimento, não se reduz a taxa">
          É a distinção que faz a conta bater certo. Excluir{" "}
          {pctExato(MAIS_VALIAS_EXCLUSAO_DETENCAO.mais8Anos.value)} do rendimento não baixa a taxa —
          faz a taxa incidir sobre a parte restante do ganho. O imposto desce na mesma proporção; a
          taxa que consta da declaração não muda.
        </Nota>
        <AvisoPrazo titulo="A escada corta nos dois sentidos">
          A lei aplica a exclusão ao saldo «quando positivo <strong>ou negativo</strong>». Um ETF
          detido há mais de oito anos que se vende a perder leva também parte da menos-valia
          excluída — e o que sobra é o que entra no saldo do ano.
        </AvisoPrazo>
        <Paragrafo>
          Duas notas práticas comuns a qualquer carteira: quando se compraram unidades em datas e
          preços diferentes, é preciso saber <strong>que lotes</strong> foram vendidos, porque disso
          dependem o custo de aquisição e a contagem dos anos; e cada operação converte-se ao{" "}
          <strong>câmbio da sua própria data</strong>, não ao câmbio de fim de ano.
        </Paragrafo>
        <VaiPara href="/guias/corretoras-estrangeiras-irs">
          Imputação de lotes, câmbios e o relatório da corretora
        </VaiPara>
      </Seccao>

      <Seccao titulo="Onde entra cada caso na declaração">
        <Passos
          passos={[
            {
              titulo: "Fundo português, distribuição recebida",
              texto: "Retenção definitiva feita na origem. Nada a acrescentar — a menos que optes pelo englobamento, e aí o retido conta como imposto por conta.",
            },
            {
              titulo: "Fundo português, unidades resgatadas",
              texto: "Retenção definitiva no resgate, já com a exclusão por tempo de detenção aplicada. Confirma que comunicaste a data e o valor de aquisição se as compraste a outra pessoa.",
            },
            {
              titulo: "Fundo estrangeiro, distribuição recebida",
              texto: "Rendimento de capitais no anexo do estrangeiro, pelo bruto, com país da fonte e imposto aí retido em campo próprio.",
            },
            {
              titulo: "Fundo estrangeiro, unidades vendidas",
              texto: "Mais-valia no anexo do estrangeiro: datas e valores de aquisição e de alienação, convertidos ao câmbio de cada data.",
            },
            {
              titulo: "Conta de corretora estrangeira",
              texto: "Identificação da conta, obrigação autónoma que existe mesmo num ano sem rendimentos nem vendas.",
            },
            {
              titulo: "Ano fechado a perder",
              texto: `Decide sobre o englobamento antes de submeter: o reporte para os ${MAIS_VALIAS_REPORTE.anos.value} anos seguintes depende dele, e a opção não se recupera depois.`,
            },
          ]}
        />
        <Nota titulo="Confirma a numeração dos quadros no formulário do ano">
          Os quadros dos anexos de mais-valias e do estrangeiro mudam com frequência. Trabalha pelo
          tipo de rendimento — distribuição ou alienação, fundo nacional ou estrangeiro — e confirma
          o mapeamento no formulário publicado pela AT para o ano em causa.
        </Nota>
        <VaiPara href="/guias/reporte-menos-valias">
          O que fazer com um ano negativo, e porque é que a decisão é nesse ano
        </VaiPara>
      </Seccao>

      <Seccao titulo="O efeito do diferimento">
        <Paragrafo>
          É o argumento mais repetido a favor da acumulação, e é real — mas é mais pequeno do que
          parece, e vale a pena perceber porquê.
        </Paragrafo>
        <Paragrafo>
          Num fundo de distribuição, cada pagamento é tributado no ano em que ocorre. O que
          reinvestes é o líquido. Num fundo de acumulação, o valor bruto continua a render dentro do
          fundo, e o imposto só sai no fim: durante todo esse tempo, o capital que trabalha por ti
          inclui a parte que acabará por ser imposto. É juro composto sobre dinheiro que ainda não é
          teu.
        </Paragrafo>
        <Paragrafo>
          A esse efeito junta-se, no fim, a escada da exclusão por tempo de detenção — que premeia
          exatamente o comportamento que a acumulação incentiva. Mas nenhum dos dois transforma o
          diferimento numa isenção.
        </Paragrafo>
        <AvisoPrazo titulo="O diferimento não sobrevive a vender e recomprar">
          Cada venda fecha o ciclo, realiza o ganho e reinicia a contagem dos anos. Uma carteira de
          acumulação rebalanceada todos os anos perde as duas vantagens ao mesmo tempo — e paga o
          mesmo que pagaria a distribuir.
        </AvisoPrazo>
        <Nota titulo="A escolha entre os dois raramente se decide no IRS">
          Comissões, tracking difference, liquidez, moeda e o que fazes com o dinheiro que recebes
          pesam tanto ou mais. O diferimento é um argumento a somar aos outros, não uma resposta
          sozinha — e quem escolhe um fundo só pela fiscalidade costuma pagar a diferença noutro
          sítio.
        </Nota>
        <VaiPara href="/guias/dividendos-irs">
          A decisão de englobar, vista do lado dos dividendos
        </VaiPara>
        <VaiPara href="/guias/ppr-irs">
          O outro produto com benefício fiscal — e com contrapartida à saída
        </VaiPara>
      </Seccao>
    </>
  );
}
