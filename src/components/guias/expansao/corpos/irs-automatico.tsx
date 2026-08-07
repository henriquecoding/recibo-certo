import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { IRS_AUTOMATICO } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 58.º-A do CIRS (n.os 1 a 12), art. 57.º e art. 60.º do CIRS.
//
// O pacote dá a página deste artigo como não verificada neste levantamento.
// Abre — em `cirs_rep/Pages/irs58a.aspx` — e responde a duas perguntas que
// nenhuma fonte de terceiros costuma responder bem: o que acontece a quem
// não faz nada, e com que regime de tributação.
export default function CorpoIrsAutomatico() {
  return (
    <>
      <Seccao titulo="Quem é abrangido">
        <Paragrafo>
          A pergunta não tem resposta no artigo do Código do IRS, e isso é a primeira coisa a
          perceber: a lei diz expressamente que o universo dos sujeitos passivos abrangidos é fixado
          por <strong>{IRS_AUTOMATICO.universoDefinidoPor.value}</strong>.
        </Paragrafo>
        <Paragrafo>
          É por isto que a resposta muda de ano para ano — o âmbito tem sido alargado — e é por isto
          que nenhuma lista escrita num guia serve por muito tempo. A resposta prática é a mais
          simples: <strong>vês no Portal das Finanças</strong>. Se estiveres abrangido, a declaração
          provisória está lá.
        </Paragrafo>
        <Nota titulo="Há uma exclusão que está no próprio artigo">
          A declaração automática não abrange quem detenha ativos em países, territórios ou regiões
          com regime fiscal claramente mais favorável — os que o art. 57.º manda mencionar. Nesse
          caso não há proposta, e a declaração é sempre manual.
        </Nota>
      </Seccao>

      <Seccao titulo="O que a proposta já inclui">
        <Paragrafo>
          A AT disponibiliza no Portal das Finanças uma <strong>declaração provisória por cada
          regime de tributação</strong> — separada e conjunta, quando aplicável —, a{" "}
          <strong>liquidação provisória</strong> correspondente, e os elementos que serviram de base
          ao cálculo das deduções à coleta.
        </Paragrafo>
        <Paragrafo>
          O conteúdo vem do que as entidades portuguesas comunicaram: rendimentos de trabalho e
          pensões, retenções feitas, e as despesas apuradas a partir das faturas comunicadas ao
          e-Fatura.
        </Paragrafo>
        <Nota titulo="Duas propostas, não uma">
          Sendo casado ou unido de facto, aparecem as duas simulações. Vale a pena compará-las antes
          de confirmar — a diferença entre conjunta e separada pode ser de centenas de euros, e é a
          decisão mais valiosa deste ecrã.
        </Nota>
        <VaiPara href="/guias/tributacao-conjunta">
          Quando compensa a tributação conjunta
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que a proposta não sabe">
        <Paragrafo>
          Tudo o que nunca foi comunicado a uma entidade portuguesa. E é mais do que parece.
        </Paragrafo>
        <Paragrafo>
          · <strong>Rendimentos obtidos no estrangeiro</strong> — trabalho, rendas, dividendos,
          mais-valias — e as contas abertas fora, que têm de ser identificadas.
          <br />· <strong>Mais-valias</strong> de ações, criptoativos ou imóveis, e o reporte de
          perdas de anos anteriores.
          <br />· <strong>Faturas por classificar</strong> no e-Fatura, que não entram nas deduções
          apuradas.
          <br />· <strong>Despesas que não passam por fatura</strong>: juros de crédito à habitação
          em certos casos, pensões de alimentos, donativos sem comunicação.
          <br />· <strong>Opções</strong> que só tu podes exercer — englobamento, regimes especiais,
          reinvestimento de mais-valias.
        </Paragrafo>
        <AvisoPrazo titulo="Confirmar uma proposta incompleta é entregar uma declaração incompleta">
          A partir do momento em que confirmas, a declaração{" "}
          <strong>considera-se entregue por ti</strong>, nos termos legais. A omissão passa a ser
          tua, não da AT — e responde-se por ela como por qualquer outra.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Tributação conjunta ou separada na proposta">
        <Paragrafo>
          A proposta traz as duas, mas há um passo anterior que decide se ela sabe sequer que és
          casado: a comunicação dos <strong>elementos pessoais</strong>.
        </Paragrafo>
        <Paragrafo>
          Podes indicar no Portal das Finanças a composição do agregado familiar no último dia do ano{" "}
          <strong>{IRS_AUTOMATICO.prazoElementosPessoais.value}</strong> — mediante autenticação de{" "}
          <em>todos</em> os membros do agregado.
        </Paragrafo>
        <AvisoPrazo titulo="Sem essa comunicação, a AT assume o que sabe — e pode assumir mal">
          Não havendo comunicação, {IRS_AUTOMATICO.semComunicacaoDeAgregado.value}. Para quem casou,
          teve um filho ou mudou de agregado nesse ano, o pré-preenchido pode partir de uma
          composição familiar que já não existe.
        </AvisoPrazo>
        <Nota titulo="A autenticação de todos os membros é o passo que trava as pessoas">
          Cada membro do agregado tem de autenticar-se com as suas próprias credenciais. Não é uma
          formalidade que um dos cônjuges possa cumprir sozinho — e é por isso que convém não deixar
          para o último dia de fevereiro.
        </Nota>
      </Seccao>

      <Seccao titulo="Casos em que recusar compensa">
        <Paragrafo>
          Sempre que tenhas algo que a AT não sabe — e a lista da terceira secção é o guião. Em
          concreto, os quatro casos que mais aparecem:
        </Paragrafo>
        <Paragrafo>
          · Tens <strong>rendimentos ou contas no estrangeiro</strong>. A proposta não os tem, e a
          obrigação existe na mesma.
          <br />· Vendeste <strong>ações, cripto ou um imóvel</strong>, ou queres reportar perdas de
          anos anteriores.
          <br />· Tens <strong>faturas por classificar</strong> ou despesas que não passaram pelo
          e-Fatura.
          <br />· A <strong>composição do agregado</strong> mudou e não foi comunicada a tempo.
        </Paragrafo>
        <Nota titulo="Recusar não é desconfiar da AT">
          A proposta é exatamente o que a lei diz que é: o cálculo feito com{" "}
          <em>os elementos informativos de que a AT dispõe</em>. Quando esses elementos não são a tua
          situação inteira, a proposta não está errada — está incompleta, e completá-la é tarefa
          tua.
        </Nota>
        <VaiPara href="/guias/anexo-j">
          O anexo do estrangeiro, que nunca vem pré-preenchido
        </VaiPara>
        <VaiPara href="/guias/reporte-menos-valias">
          O reporte de perdas, que se perde se não for declarado
        </VaiPara>
      </Seccao>

      <Seccao titulo="Como recusar e declarar manualmente">
        <Passos
          passos={[
            {
              titulo: "Comunicar os elementos pessoais até ao fim de fevereiro",
              texto: "Com autenticação de todos os membros do agregado. É o que faz a proposta partir da composição familiar certa — e vale mesmo que venhas a declarar manualmente.",
            },
            {
              titulo: "Validar as faturas no e-Fatura",
              texto: "As faturas por classificar não entram nas deduções apuradas, e essa parte da proposta não se corrige depois sem trabalho.",
            },
            {
              titulo: "Comparar a proposta com o que sabes",
              texto: "Rendimentos, retenções, deduções, agregado. Se bater tudo, confirma. Se faltar alguma coisa, não confirmes.",
            },
            {
              titulo: "Entregar a Modelo 3 dentro do prazo legal",
              texto: "A lei é expressa: quem não está abrangido, e quem tem uma proposta que não corresponde à sua concreta situação tributária, deve apresentar a declaração do art. 57.º dentro do prazo.",
            },
            {
              titulo: "Juntar os anexos que a proposta não tinha",
              texto: "Anexo do estrangeiro, mais-valias, categoria B, prediais. Cada um tem as suas regras, e é aí que está o trabalho real.",
            },
          ]}
        />
        <VaiPara href="/guias/reembolso-irs">O que acontece depois de entregar, e quando chega o reembolso</VaiPara>
      </Seccao>

      <Seccao titulo="O que acontece se não fizeres nada">
        <Paragrafo>
          É a pergunta com a resposta mais surpreendente, e a que quase toda a gente erra. Não fazer
          nada <strong>não é não entregar</strong>.
        </Paragrafo>
        <Paragrafo>
          Terminado o prazo sem confirmação e sem entrega de qualquer declaração,{" "}
          <strong>{IRS_AUTOMATICO.seNadaForFeito.value}</strong>. Não há coima por falta de entrega,
          porque houve entrega — feita por omissão, mas entrega.
        </Paragrafo>
        <AvisoPrazo titulo="Mas o regime de tributação passa a ser o separado">
          Nesse caso, tratando-se de sujeitos passivos casados ou unidos de facto, observa-se o
          regime de <strong>{IRS_AUTOMATICO.regimeSeNadaForFeito.value}</strong>. Quem beneficiaria
          da tributação conjunta perde-a por inação — e ninguém lhe diz. É a consequência mais cara
          de deixar passar o prazo sem olhar.
        </AvisoPrazo>
        <Nota titulo="Há uma janela para emendar, e é generosa">
          Nesses casos podes entregar uma declaração de substituição nos{" "}
          <strong>{IRS_AUTOMATICO.substituicaoSemPenalidadeDias.value} dias posteriores à
          liquidação</strong>, sem qualquer penalidade. É o melhor prazo de todo o IRS — e o menos
          conhecido.
        </Nota>
        <VaiPara href="/guias/declaracao-substituicao">
          A declaração de substituição, e os três relógios que a rodeiam
        </VaiPara>
      </Seccao>
    </>
  );
}
