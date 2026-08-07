import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { AJUSTE_BASE_SS, SS_COEFICIENTE, SS_ISENCAO_PRIMEIRO_ANO_MESES, SS_MIN_MENSAL, SS_TAXA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 quanto à base de incidência, à taxa e ao
// ajuste voluntário (Código dos Regimes Contributivos, via motor).
//
// O pacote avisa: «não publicar fórmulas de cálculo de pensão sem as
// validar na regulamentação em vigor — a taxa de formação e o fator de
// sustentabilidade mudam». Nenhuma fórmula é publicada aqui. O guia explica
// o que ENTRA no cálculo — que é o que o leitor controla — e manda ver a
// simulação oficial para o resultado.
export default function CorpoReformaIndependentes() {
  return (
    <>
      <Seccao titulo="Como se forma o direito à pensão">
        <Paragrafo>
          A pensão não se compra nem se poupa: <strong>forma-se</strong>, ao longo da carreira, a
          partir de dois elementos — o <strong>tempo</strong> com registo de remunerações e o{" "}
          <strong>valor</strong> dessas remunerações.
        </Paragrafo>
        <Paragrafo>
          Para quem trabalha por conta de outrem, o valor registado é o salário, e o registo é
          automático. Para um independente, o valor registado é a <strong>base de incidência</strong>{" "}
          que ele próprio declarou — e o registo depende de ele ter declarado e pago.
        </Paragrafo>
        <AvisoPrazo titulo="É a diferença estrutural entre os dois mundos">
          Um trabalhador por conta de outrem não decide a sua remuneração registada. Um independente
          decide-a todos os trimestres, muitas vezes sem perceber que a está a decidir.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Prazo de garantia">
        <Paragrafo>
          Antes de haver direito a pensão de velhice é preciso um número mínimo de{" "}
          <strong>anos civis com registo de remunerações</strong>. Sem esse mínimo não há pensão,
          por muito que se tenha contribuído em cada um dos anos que existem.
        </Paragrafo>
        <Paragrafo>
          O prazo concreto consta da regulamentação e é um dos números que este guia não fixa —
          confirma-o na Segurança Social Direta, que também te diz quantos anos já tens.
        </Paragrafo>
        <Nota titulo="Anos civis, não meses de atividade">
          Contam-se anos em que houve registo de remunerações em número suficiente de meses. Um ano
          de atividade com contribuições esporádicas pode não contar como ano civil completo.
        </Nota>
      </Seccao>

      <Seccao titulo="O que conta como remuneração registada">
        <Paragrafo>
          Só o que gerou contribuição. E, num independente, isso significa a{" "}
          <strong>base de incidência</strong> —{" "}
          {pctExato(SS_COEFICIENTE.servicos.value)} do rendimento declarado nas prestações de
          serviços, ou {pctExato(SS_COEFICIENTE.bens.value)} na venda de bens — depois do ajuste
          voluntário que tiveres escolhido.
        </Paragrafo>
        <Paragrafo>
          Não conta a faturação. Não conta o lucro. Não conta o que o negócio vale. Conta o número
          que escreveste na declaração trimestral, trimestre a trimestre, durante décadas.
        </Paragrafo>
        <AvisoPrazo titulo="Quem contribui pelo mínimo forma pensão pelo mínimo">
          A contribuição mínima mensal é de <strong>{fmt(SS_MIN_MENSAL.value)}</strong>, à taxa de{" "}
          {pctExato(SS_TAXA.value)}. Uma carreira inteira construída nesse patamar produz uma pensão
          no patamar correspondente — independentemente de o negócio ter faturado muito.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O efeito do ajuste voluntário da base">
        <Paragrafo>
          O ajuste voluntário de <strong>±{pctExato(AJUSTE_BASE_SS.amplitude.value)}</strong>, em
          degraus de {pctExato(AJUSTE_BASE_SS.degrau.value)}, é a única alavanca que tens — e é aqui
          que o seu efeito é maior e mais duradouro.
        </Paragrafo>
        <Paragrafo>
          Baixar a base num trimestre poupa alguns euros nesse trimestre. Baixar a base durante dez
          anos reduz a remuneração registada de dez anos da tua carreira — permanentemente, porque
          não há forma de a corrigir retroativamente.
        </Paragrafo>
        <Paragrafo>
          Subir tem o efeito inverso, e é uma opção real: para quem tem tesouraria e uma carreira
          curta, ajustar para cima é a forma mais direta de melhorar a pensão futura.
        </Paragrafo>
        <Nota titulo="A assimetria é o problema">
          A poupança de baixar é imediata, visível e mensal. O custo é distante, invisível e
          vitalício. É uma estrutura de decisão que leva quase toda a gente a escolher mal — e
          perceber isso é metade da solução.
        </Nota>
        <VaiPara href="/guias/declaracao-trimestral-ss">
          Onde se faz o ajuste, e o que ele troca
        </VaiPara>
      </Seccao>

      <Seccao titulo="Períodos de isenção e o seu custo futuro">
        <Paragrafo>
          Um período isento de contribuições é um período <strong>sem remuneração registada</strong>.
          Não é um período neutro na carreira: é um buraco.
        </Paragrafo>
        <Paragrafo>
          A isenção do início de atividade dura{" "}
          <strong>{SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses</strong> e é a mais comum. Para quem
          não tem outro vínculo nesse período, é um ano inteiro que não conta — nem para o prazo de
          garantia, nem para o valor.
        </Paragrafo>
        <AvisoPrazo titulo="A isenção por acumulação é diferente">
          Quem está isento por acumular com trabalho dependente continua a ter remuneração registada
          — a do emprego. Não há buraco nenhum. É a distinção que decide se um período de isenção é
          um alívio ou um custo.
        </AvisoPrazo>
        <VaiPara href="/guias/isencao-contribuicoes-ss">
          As situações de isenção, uma a uma
        </VaiPara>
      </Seccao>

      <Seccao titulo="Onde consultar a tua carreira contributiva">
        <Passos
          passos={[
            {
              titulo: "Segurança Social Direta, área da carreira contributiva",
              texto: "Mostra os anos e os meses com registo de remunerações, e os valores registados. É o documento que decide a tua pensão — e quase ninguém o abre antes dos cinquenta.",
            },
            {
              titulo: "Verificar se há períodos em falta",
              texto: "Trimestres não declarados, contribuições não pagas, períodos de trabalho antigo que não aparecem. Corrigir agora é possível; corrigir daqui a vinte anos, muito menos.",
            },
            {
              titulo: "Usar o simulador oficial de pensão",
              texto: "A Segurança Social disponibiliza simulação com base na tua carreira real. É a única fonte fiável do valor — as fórmulas em circulação envelhecem depressa.",
            },
            {
              titulo: "Repetir a verificação todos os anos",
              texto: "Uma vez por ano, depois de fechado o ano anterior. É meia hora que evita descobrir tarde demais que faltam anos.",
            },
            {
              titulo: "Decidir o ajuste com esta informação à frente",
              texto: "O ajuste da declaração trimestral faz-se de outra maneira quando se acabou de ver a carreira. É a razão pela qual vale a pena olhar.",
            },
          ]}
        />
        <AvisoPrazo titulo="Este guia não publica fórmulas de cálculo, de propósito">
          A taxa de formação da pensão e o fator de sustentabilidade são fixados por regulamentação e
          mudam. Uma fórmula escrita aqui estaria errada dentro de um ano — e uma pensão calculada
          com uma fórmula errada é pior do que uma pensão por calcular. Para o valor, o simulador
          oficial.
        </AvisoPrazo>
        <VaiPara href="/guias/reforma-antecipada">
          Antecipar a reforma: o que custa
        </VaiPara>
      </Seccao>
    </>
  );
}
