import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { DEDUCAO_ASCENDENTE, DEDUCAO_ASCENDENTE_UNICO, DEDUCAO_LARES, GUARDA_PARTILHADA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 13.º, art. 78.º (n.º 9) e art. 78.º-A do CIRS, e art. 84.º quanto
// aos encargos com lares.
export default function CorpoAscendentesLares() {
  return (
    <>
      <Seccao titulo="Requisitos para ser ascendente a cargo">
        <Paragrafo>
          Um pai, uma mãe, um avô a cargo dá direito a dedução própria — mas não basta a relação de
          parentesco nem ajudar financeiramente. A lei exige duas coisas ao mesmo tempo.
        </Paragrafo>
        <Paragrafo>
          · <strong>Comunhão de habitação</strong> — o ascendente tem de viver efetivamente em
          economia comum contigo.
          <br />· <strong>Rendimento abaixo do limite legal</strong> — tratado na secção seguinte.
        </Paragrafo>
        <AvisoPrazo titulo="Ajudar a pagar a casa dele não conta">
          É a situação mais frequente e a que não cabe. Um filho que sustenta um pai que vive sozinho
          não tem, por isso, direito à dedução por ascendente. O requisito é de habitação comum, não
          de dependência económica.
        </AvisoPrazo>
        <Nota titulo="E o ascendente tem de ter NIF na tua declaração">
          Como acontece com os dependentes, a identificação fiscal é condição — não é um detalhe de
          preenchimento.
        </Nota>
      </Seccao>

      <Seccao titulo="O limite de rendimento">
        <Paragrafo>
          O ascendente não pode auferir rendimento superior ao limite que a lei fixa — indexado, e por
          isso atualizado todos os anos.
        </Paragrafo>
        <Paragrafo>
          É a condição que exclui a maior parte dos casos reais: uma pensão de reforma média
          ultrapassa esse limite com folga. A dedução por ascendente serve, na prática, situações de
          rendimento muito baixo.
        </Paragrafo>
        <AvisoPrazo titulo="Conta o rendimento dele, todo">
          Pensões, rendas, juros. Não é o que sobra depois das despesas dele — é o rendimento bruto
          auferido no ano.
        </AvisoPrazo>
        <Nota titulo="Confirma o limite do ano em causa">
          É indexado e sobe. Um ascendente que cabia no limite há três anos pode já não caber — e a
          verificação faz-se todos os anos, não uma vez.
        </Nota>
      </Seccao>

      <Seccao titulo="A dedução por ascendente">
        <Paragrafo>
          São <strong>{fmt(DEDUCAO_ASCENDENTE.value)}</strong> por cada ascendente que cumpra os
          requisitos. E há uma majoração que muita gente desconhece: havendo{" "}
          <strong>apenas um</strong> ascendente a cargo, a dedução sobe para{" "}
          <strong>{fmt(DEDUCAO_ASCENDENTE_UNICO.value)}</strong>.
        </Paragrafo>
        <Paragrafo>
          É uma dedução à coleta — abate ao imposto, não ao rendimento. Vale o valor inteiro, seja
          qual for o teu escalão.
        </Paragrafo>
        <AvisoPrazo titulo="Constando das declarações de dois filhos, divide-se a meio">
          A regra do art. 78.º, n.º 9 vale para ascendentes exatamente como para dependentes: o mesmo
          ascendente em duas declarações reduz as deduções a{" "}
          {pctExato(GUARDA_PARTILHADA.fracaoPorSujeitoPassivo.value)} em cada uma. Dois irmãos que o
          declarem ambos ficam com metade cada.
        </AvisoPrazo>
        <Nota titulo="Combinem entre irmãos quem declara">
          Se só um cumpre o requisito de comunhão de habitação, é esse que declara — e é o único que
          pode. Se vive alternadamente, a decisão é vossa, e vale a pena tomá-la antes de dois
          declararem.
        </Nota>
      </Seccao>

      <Seccao titulo="Despesas com lares e o seu teto">
        <Paragrafo>
          É uma dedução <strong>separada e independente</strong> da dedução por ascendente — e é a que
          se aplica à maior parte das famílias, porque não exige comunhão de habitação nem limite de
          rendimento do ascendente.
        </Paragrafo>
        <Paragrafo>
          Deduzem-se <strong>{pctExato(DEDUCAO_LARES.value.taxa)}</strong> dos encargos suportados,
          com o teto de <strong>{fmt(DEDUCAO_LARES.value.limite)}</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="O teto é por agregado, não por ascendente">
          É o ponto que mais desilude. Quem tem dois pais em lar não tem o dobro do limite: tem o
          mesmo. O teto aplica-se ao conjunto das despesas do agregado.
        </AvisoPrazo>
        <Nota titulo="Abrange mais do que lares de idosos">
          A dedução abrange apoio domiciliário, lares e instituições de apoio à terceira idade, e
          também encargos com lares e residências para pessoas com deficiência, nas condições da lei.
        </Nota>
        <VaiPara href="/guias/deducoes-coleta">
          As deduções à coleta, e o limite global que as trava
        </VaiPara>
      </Seccao>

      <Seccao titulo="Faturas que contam e faturas que não contam">
        <Passos
          passos={[
            {
              titulo: "Contam: a mensalidade do lar ou do apoio domiciliário",
              texto: "Emitida por instituição com a atividade adequada, com o NIF de quem suporta o encargo.",
            },
            {
              titulo: "Não contam: despesas pessoais faturadas à parte",
              texto: "Cabeleireiro, extras de conforto, produtos de higiene comprados fora. São despesas do ascendente, não encargos com o lar.",
            },
            {
              titulo: "As despesas de saúde são outra categoria",
              texto: "Medicamentos, consultas e tratamentos deduzem-se como despesas de saúde, com a sua própria percentagem e o seu próprio teto — e não gastam o limite dos lares.",
            },
            {
              titulo: "O NIF na fatura é o de quem paga",
              texto: "É quem suporta o encargo que deduz. Uma fatura no NIF do ascendente não entra na tua declaração.",
            },
            {
              titulo: "Classifica no e-Fatura na categoria certa",
              texto: "Instituições com várias atividades geram faturas pendentes. Uma mensalidade de lar classificada como despesa geral perde a dedução própria.",
            },
            {
              titulo: "Verifica se já estás no limite global",
              texto: "Se as tuas deduções já batem no teto global, reunir mais faturas não muda o imposto. É a verificação que poupa mais tempo.",
            },
          ]}
        />
        <AvisoPrazo titulo="Separa as duas coisas na cabeça e na declaração">
          A dedução por ascendente a cargo e a dedução de encargos com lares são independentes: podem
          coexistir, e têm requisitos completamente diferentes. Quem só conhece uma costuma perder a
          outra.
        </AvisoPrazo>
        <VaiPara href="/guias/e-fatura">
          A validação de faturas, e as categorias que importam
        </VaiPara>
        <VaiPara href="/guias/irs-pensionistas">
          O IRS do lado de quem recebe a pensão
        </VaiPara>
      </Seccao>
    </>
  );
}
