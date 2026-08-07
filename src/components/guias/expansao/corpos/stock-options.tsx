import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { IAS, STOCK_OPTIONS_STARTUP, STOCK_OPTIONS_TAXA_EFETIVA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra dois articulados no Portal das
// Finanças: o art. 43.º-C do EBF (Lei das Startups, n.os 1 a 11) e o art.
// 72.º, n.º 1, al. f) do CIRS, que dá a taxa. A taxa efetiva não está
// escrita em nenhum dos dois — sai do encontro dos dois, e é derivada.
export default function CorpoStockOptions() {
  return (
    <>
      <Seccao titulo="A taxa efetiva sai de dois artigos, não de um">
        <Paragrafo>
          Ao abrigo do regime das startups, os ganhos de planos de opções são considerados em{" "}
          <strong>{pctExato(STOCK_OPTIONS_STARTUP.fracaoTributada.value)}</strong> do seu valor. O que
          resta é tributado à taxa autónoma de{" "}
          <strong>{pctExato(STOCK_OPTIONS_STARTUP.taxa.value)}</strong>.
        </Paragrafo>
        <Paragrafo>
          Multiplicando as duas coisas, a taxa efetiva é de{" "}
          <strong>{pctExato(STOCK_OPTIONS_TAXA_EFETIVA)}</strong> — e não está escrita em artigo
          nenhum. É o resultado do encontro de dois, e é a razão pela qual aparece com valores
          diferentes consoante quem escreve.
        </Paragrafo>
        <Nota titulo="Continuam a ser rendimentos de trabalho dependente">
          O artigo di-lo expressamente. O regime muda o momento e a medida da tributação, não a
          natureza do rendimento.
        </Nota>
      </Seccao>

      <Seccao titulo="Quando é que o imposto nasce">
        <Paragrafo>
          É a parte que torna este regime valioso: <strong>exercer as opções não paga imposto</strong>.
          A tributação ocorre no primeiro de três momentos —{" "}
          {STOCK_OPTIONS_STARTUP.momentosDeTributacao.value}.
        </Paragrafo>
        <AvisoPrazo titulo="Sair de Portugal é um facto tributário">
          É o ponto que apanha mais gente de surpresa. Perder a qualidade de residente aciona a
          tributação dos ganhos, reportada ao momento do exercício da opção — mesmo sem ter vendido
          nada, mesmo sem ter recebido um euro.
        </AvisoPrazo>
        <Paragrafo>
          Há, nesse caso, uma isenção parcial: até{" "}
          <strong>{fmt(STOCK_OPTIONS_STARTUP.isencaoSaidaEmIas.value * IAS.value)}</strong> (
          {STOCK_OPTIONS_STARTUP.isencaoSaidaEmIas.value} × IAS), sendo os rendimentos englobados para
          determinar a taxa a aplicar aos restantes. E{" "}
          {STOCK_OPTIONS_STARTUP.isencaoSaidaUmaVez.value}.
        </Paragrafo>
        <VaiPara href="/guias/sair-de-portugal">
          O que muda quando se deixa de ser residente
        </VaiPara>
      </Seccao>

      <Seccao titulo="O ano de espera">
        <Paragrafo>
          O regime depende da <strong>manutenção dos direitos subjacentes</strong> aos títulos, ou de
          direitos equivalentes, por um período mínimo de{" "}
          <strong>{STOCK_OPTIONS_STARTUP.retencaoMinimaAnos.value} ano</strong>.
        </Paragrafo>
        <Paragrafo>
          Vender antes disso tira o caso de dentro do regime — e o ganho passa a ser tributado pelas
          regras gerais do trabalho dependente, que é precisamente o que este regime existe para
          evitar.
        </Paragrafo>
        <Nota titulo="É uma data a marcar no calendário">
          Numa aquisição da empresa, o calendário é ditado por terceiros. Saber a data em que o ano se
          completa é o que permite negociar o momento do fecho — ou pelo menos saber quanto é que a
          pressa vai custar.
        </Nota>
      </Seccao>

      <Seccao titulo="Que empresas contam">
        <Paragrafo>
          A entidade tem de ser reconhecida como <strong>startup</strong> no ano anterior à aprovação
          do plano — ou no próprio ano, sendo o primeiro de atividade — e preencher pelo menos uma de
          duas condições alternativas.
        </Paragrafo>
        <Paragrafo>
          · ser <strong>micro, pequena ou média empresa</strong>, ou empresa de pequena-média
          capitalização, segundo os critérios do anexo ao Decreto-Lei n.º 372/2007;
          <br />· ou <strong>desenvolver atividade de inovação</strong>, o que a lei quantifica:
          despesas em investigação e desenvolvimento, patentes, desenhos ou modelos industriais ou
          programas de computador equivalentes a pelo menos{" "}
          <strong>{pctExato(STOCK_OPTIONS_STARTUP.limiarInovacao.value)}</strong> dos gastos ou do
          volume de negócios.
        </Paragrafo>
        <AvisoPrazo titulo="Ter mais do que uma quinta parte da empresa exclui-te">
          Quem detenha, direta ou indiretamente, participação não inferior a{" "}
          {pctExato(STOCK_OPTIONS_STARTUP.participacaoQueExclui.value)} do capital ou dos direitos de
          voto está fora do benefício. A exclusão não se aplica, porém, em startups nem em micro e
          pequenas empresas — o que devolve o regime à maioria dos fundadores.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Pede a confirmação por escrito — e guarda a resposta">
        <Passos
          passos={[
            {
              titulo: "Pedir à empresa, por escrito, que confirme as condições",
              texto: "É um direito expresso dos trabalhadores e membros de órgãos sociais. Bastam duas linhas por email.",
            },
            {
              titulo: `Marcar ${STOCK_OPTIONS_STARTUP.prazoRespostaEntidadeDias.value} dias no calendário`,
              texto: "Confirmando, ou não respondendo nesse prazo, a empresa fica subsidiariamente responsável pelo imposto em falta se as condições afinal não se verificarem. O silêncio dela protege-te.",
            },
            {
              titulo: "Guardar o plano, a data de aprovação e a data de exercício",
              texto: "São os três elementos de que o apuramento depende — e os que ninguém consegue reconstituir cinco anos depois, quando a empresa já mudou de mãos.",
            },
            {
              titulo: "Confirmar o reconhecimento como startup no ano relevante",
              texto: "É o ano anterior à aprovação do plano, não o ano do exercício nem o da venda.",
            },
            {
              titulo: "Antes de mudar de país, fazer as contas",
              texto: "A saída antecipa o imposto. Saber quanto, e quanto da isenção ainda está por usar, é o que permite decidir com informação.",
            },
            {
              titulo: "Declarar no ano do facto tributário, não no da venda",
              texto: "Quando o facto é a perda de residência, o ano é esse — e é o erro de declaração mais frequente neste regime.",
            },
          ]}
        />
        <VaiPara href="/guias/salario-gerente-ou-dividendos">
          As outras formas de retirar valor de uma empresa
        </VaiPara>
        <VaiPara href="/guias/mais-valias">
          O regime geral das mais-valias, para comparar
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que a empresa tem de declarar">
        <Paragrafo>
          O plano gera obrigações do lado de quem o atribui, e não apenas de quem o recebe. Os ganhos
          são rendimentos de trabalho dependente, e como tal entram nas obrigações declarativas da
          entidade patronal relativas aos rendimentos pagos ou colocados à disposição.
        </Paragrafo>
        <Paragrafo>
          A empresa deve ainda estar em condições de <strong>responder por escrito</strong> ao pedido
          de confirmação das condições — e sabe que o silêncio a responsabiliza subsidiariamente.
        </Paragrafo>
        <Nota titulo="Do lado do trabalhador, declara-se no ano do facto">
          E o facto pode não ser a venda. Sendo a perda de residência, o ano de declaração é esse.
        </Nota>
        <VaiPara href="/guias/modelo-10">
          A declaração dos rendimentos pagos, do lado da entidade
        </VaiPara>
      </Seccao>

      <Seccao titulo="Se o plano não for elegível">
        <Paragrafo>
          Fora deste regime, os ganhos de planos de opções são <strong>rendimento de trabalho
          dependente pelas regras gerais</strong>: englobados, sujeitos às taxas progressivas e à
          retenção que lhes corresponder — sem a fração de metade e sem o diferimento.
        </Paragrafo>
        <Paragrafo>
          A diferença não é de detalhe. Um ganho tributado a uma taxa marginal alta, no momento do
          exercício e sem liquidez para o pagar, é o cenário que este regime existe para evitar.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma a elegibilidade ANTES de exercer">
          Depois de exercido, o facto está feito. É por isso que o pedido de confirmação por escrito à
          empresa vale mais antes do que depois — e é gratuito.
        </AvisoPrazo>
        <VaiPara href="/guias/escaloes-irs">
          As taxas progressivas que se aplicam fora do regime
        </VaiPara>
      </Seccao>
    </>
  );
}
