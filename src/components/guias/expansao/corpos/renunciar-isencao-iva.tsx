import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { ISENCAO_IVA_REGIME, IVA_TAXAS } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado na coleção consolidada:
// arts. 18.º, 32.º, 53.º, 54.º e 55.º do CIVA, já com a redação do
// Decreto-Lei n.º 35/2025.
export default function CorpoRenunciarIsencaoIva() {
  return (
    <>
      <Seccao titulo="O que a isenção do art. 53.º custa">
        <Paragrafo>
          A isenção parece só ter vantagens: não liquidas IVA, não entregas declarações periódicas,
          não tens imposto a pagar. Mas a lei é expressa quanto ao preço, e ele é grande:
        </Paragrafo>
        <Paragrafo>
          os sujeitos passivos isentos estão <strong>excluídos do direito à dedução</strong> previsto
          nos artigos 19.º e 20.º, e do direito ao reembolso do imposto.
        </Paragrafo>
        <Paragrafo>
          Ou seja: todo o IVA que suportas nas compras — equipamento, software, matérias-primas,
          serviços — é <strong>custo teu</strong>. À taxa normal do continente, de{" "}
          <strong>{pctExato(IVA_TAXAS.continente.value.normal)}</strong>, isso significa que um
          computador de mil euros te custa mil e duzentos e trinta.
        </Paragrafo>
        <Nota titulo="É uma isenção incompleta, no vocabulário do imposto">
          Isenta a operação de saída e corta o direito à dedução na entrada. Não é ficar fora do IVA:
          é ficar fora dele só de um lado — o lado que te beneficiaria menos, se compras muito.
        </Nota>
      </Seccao>

      <Seccao titulo="Quem beneficia da renúncia">
        <Paragrafo>
          Duas situações, e ambas dependem menos do que faturas do que de <em>a quem</em> faturas e{" "}
          <em>quanto</em> compras.
        </Paragrafo>
        <Paragrafo>
          · <strong>Vais investir.</strong> Quem está a montar um estúdio, uma oficina, um consultório
          ou a comprar equipamento pesado suporta IVA que, no regime normal, deduziria por inteiro.
          Nalguns casos há mesmo reembolso a receber.
          <br />· <strong>Os teus clientes são empresas.</strong> Um cliente sujeito passivo deduz o
          IVA que lhe cobras — para ele, o preço com imposto é o mesmo preço. Liquidar IVA não te
          torna mais caro, e permite-te deduzir o teu.
        </Paragrafo>
        <AvisoPrazo titulo="Se vendes a consumidores finais, a conta inverte-se">
          Um particular não deduz nada. Passar a liquidar{" "}
          {pctExato(IVA_TAXAS.continente.value.normal)} é subir o preço em{" "}
          {pctExato(IVA_TAXAS.continente.value.normal)} — ou absorver a diferença na margem. Para quem
          vende a consumidores finais, a isenção é quase sempre a melhor posição.
        </AvisoPrazo>
        <VaiPara href="/dashboard/comparar">
          Comparar os dois cenários com os teus números
        </VaiPara>
      </Seccao>

      <Seccao titulo="Como se opta">
        <Paragrafo>
          Pela <strong>declaração de alterações</strong> do art. 32.º, entregue no Portal das
          Finanças. Não é um pedido sujeito a autorização: é uma opção que se exerce, e produz efeitos
          a partir do momento que a lei fixa.
        </Paragrafo>
        <Paragrafo>
          Quem está a <strong>iniciar atividade</strong> exerce a opção na própria declaração de
          início — e é o momento mais simples de o fazer, porque não há histórico a acertar.
        </Paragrafo>
        <Nota titulo="A partir daí, mudam as obrigações">
          Passas a liquidar IVA nas faturas, a entregar declarações periódicas — mensais ou
          trimestrais, conforme o volume de negócios — e a poder deduzir o imposto suportado. É mais
          trabalho de gestão, e é o outro lado da conta.
        </Nota>
        <VaiPara href="/guias/declaracao-periodica-iva">
          A declaração periódica, e os prazos
        </VaiPara>
      </Seccao>

      <Seccao titulo="O período mínimo de permanência">
        <Paragrafo>
          É a parte que torna a decisão séria: quem opta pelo regime normal fica{" "}
          <strong>obrigado a permanecer nele durante um período mínimo</strong>, fixado no art. 55.º
          do Código do IVA.
        </Paragrafo>
        <Paragrafo>
          Não é uma escolha reversível no mês seguinte. É por isso que a conta se faz{" "}
          <em>antes</em> — com o investimento previsto, o perfil de clientes e o horizonte de alguns
          anos à frente, não de alguns meses.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma o período em vigor antes de optar">
          Consta do art. 55.º do CIVA, e o Código foi alterado pelo Decreto-Lei n.º 35/2025.
          Confirma-o com um contabilista certificado — é a variável que decide se a opção compensa,
          mais do que a percentagem do IVA.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Voltar atrás">
        <Paragrafo>
          Decorrido o período mínimo, pode voltar-se ao regime de isenção — desde que se{" "}
          <strong>continue a reunir as condições</strong> do art. 53.º, o que significa, antes de
          tudo, ter volume de negócios abaixo de{" "}
          <strong>{fmt(ISENCAO_IVA_REGIME.limiarNacional.value)}</strong>.
        </Paragrafo>
        <Paragrafo>
          O regresso faz-se também por declaração de alterações, no prazo próprio — e não é
          automático: quem não a entrega continua no regime normal.
        </Paragrafo>
        <Nota titulo="E há um acerto a fazer na saída">
          Ao sair do regime normal pode haver regularizações a fazer quanto ao IVA deduzido em bens do
          ativo ainda em uso. É o espelho da regularização a favor de quem entra — e vale a pena
          contá-la na decisão de voltar.
        </Nota>
        <VaiPara href="/guias/mudar-regime-iva">
          A mudança de regime quando é obrigatória, e não opcional
        </VaiPara>
      </Seccao>

      <Seccao titulo="Fazer a conta antes de decidir">
        <Passos
          passos={[
            {
              titulo: "Somar o IVA que suportas num ano típico",
              texto: "Todas as compras afetas à atividade, com fatura e NIF. É o valor que, no regime normal, deixarias de perder.",
            },
            {
              titulo: "Somar o investimento previsto para os próximos anos",
              texto: "Equipamento, obras, software. É aqui que a decisão se ganha ou se perde — e é a razão pela qual quem vai investir deve decidir antes de comprar.",
            },
            {
              titulo: "Classificar os teus clientes",
              texto: "Empresas deduzem e não sentem a diferença; consumidores finais sentem-na toda. A proporção entre uns e outros é o segundo fator.",
            },
            {
              titulo: "Contar o custo de gestão",
              texto: "Declarações periódicas, mais rigor na documentação, provavelmente mais horas de contabilista. Não é grande, mas não é zero.",
            },
            {
              titulo: "Confirmar o período mínimo de permanência",
              texto: "É o que transforma uma boa decisão para este ano numa má decisão para os seguintes, se o cenário mudar.",
            },
            {
              titulo: "Decidir com um contabilista certificado",
              texto: "É uma das poucas decisões deste site em que a conta depende de tantas variáveis que vale mesmo a pena o parecer.",
            },
          ]}
        />
        <VaiPara href="/guias/regime-isencao-ue">
          A isenção noutros países da UE, que segue outra lógica
        </VaiPara>
      </Seccao>
    </>
  );
}
