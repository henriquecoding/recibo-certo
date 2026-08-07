import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado a 07/08/2026 quanto ao enquadramento tributário: art.
// 30.º, n.º 2 da LGT (indisponibilidade dos créditos tributários), art.
// 36.º, n.º 2 da LGT e o regime dos planos prestacionais do CPPT.
//
// O pacote dá dois avisos e ambos são seguidos aqui: (1) é matéria
// judicial, a enquadrar como informação e a remeter para advogado; (2) há
// jurisprudência divergente quanto à exoneração de créditos tributários, a
// apresentar como questão em aberto e não como regra fechada. Os prazos e
// as fases do processo de insolvência vivem no CIRE, cuja redação em vigor
// não foi verificada nesta revisão — pelo que não se fixam em número.
export default function CorpoInsolvenciaPessoal() {
  return (
    <>
      <Seccao titulo="O que é a exoneração do passivo restante">
        <Paragrafo>
          É o mecanismo que permite a uma pessoa singular ficar libertada das dívidas que sobrarem
          depois de um processo de insolvência — as que não foram pagas com o património nem durante
          o período que se lhe segue.
        </Paragrafo>
        <Paragrafo>
          Não é automático. Pede-se ao tribunal, no processo de insolvência, e depende de uma decisão
          judicial que aprecia a conduta do devedor. Também não é para toda a gente: há causas de
          indeferimento ligadas à ocultação de bens, à prestação de informação falsa e ao
          agravamento culposo da situação.
        </Paragrafo>
        <AvisoPrazo titulo="Este guia é informação, não aconselhamento">
          A insolvência e a exoneração são matéria judicial, com prazos processuais e efeitos que
          dependem do caso concreto. Nada aqui substitui um advogado — e neste tema, ao contrário de
          quase todos os outros do site, avançar sem um é um erro em si mesmo.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O período de cessão">
        <Paragrafo>
          Concedido o benefício a título provisório, segue-se um período durante o qual o rendimento
          disponível do devedor é <strong>cedido a um fiduciário</strong>, que o afeta ao pagamento
          dos credores segundo a ordem legal.
        </Paragrafo>
        <Paragrafo>
          Durante esse período há deveres a cumprir — exercer profissão remunerada quando possível,
          informar sobre mudanças de rendimento ou de residência, não ocultar rendimentos. O
          incumprimento pode levar à cessação antecipada, e com ela ao fim do benefício.
        </Paragrafo>
        <Nota titulo="A duração do período é fixada no Código da Insolvência">
          O prazo foi objeto de alterações legislativas e não foi verificado em fonte oficial nesta
          revisão. Confirma-o com o teu advogado para o processo concreto — é o número que estrutura
          toda a decisão e não deve ser lido de segunda mão.
        </Nota>
      </Seccao>

      <Seccao titulo="Rendimento indisponível e o que fica para ti">
        <Paragrafo>
          Nem tudo o que ganhas é cedido. A lei distingue o <strong>rendimento disponível</strong> —
          que vai para o fiduciário — do que fica excluído dessa cessão, para garantir o sustento do
          devedor e do seu agregado.
        </Paragrafo>
        <Paragrafo>
          O montante excluído é fixado pelo tribunal, dentro dos limites legais, tendo em conta as
          necessidades concretas. É por isso que dois processos com o mesmo rendimento podem ter
          resultados diferentes: o agregado, a habitação e os encargos entram na conta.
        </Paragrafo>
        <Nota titulo="É o mesmo princípio das penhoras, com outra medida">
          Também na penhora de vencimento existe uma parte impenhorável, para garantir um mínimo de
          subsistência. A lógica é comum — o que muda é a norma que a concretiza.
        </Nota>
        <VaiPara href="/guias/penhora-limites">
          A parte impenhorável do vencimento
        </VaiPara>
      </Seccao>

      <Seccao titulo="Dívidas fiscais e à Segurança Social">
        <Paragrafo>
          É o ponto que mais interessa a quem lê este site, e é também aquele em que a resposta
          honesta é <strong>«está em aberto»</strong>.
        </Paragrafo>
        <Paragrafo>
          O ponto de partida é a <strong>indisponibilidade dos créditos tributários</strong>: a Lei
          Geral Tributária estabelece que o crédito tributário é indisponível, só podendo fixar-se
          condições para a sua redução ou extinção com respeito pelo princípio da igualdade e da
          legalidade tributária. É desta norma que nasce a tese de que os créditos fiscais e
          contributivos não são abrangidos pela exoneração.
        </Paragrafo>
        <AvisoPrazo titulo="Mas a jurisprudência não é unânime">
          Há decisões judiciais em sentidos diferentes sobre se — e em que medida — a exoneração
          abrange créditos tributários e da Segurança Social. Quem te disser que a resposta é
          simples, em qualquer dos dois sentidos, está a simplificar uma questão que os tribunais não
          fecharam. É exatamente por isto que este caso se leva a um advogado.
        </AvisoPrazo>
        <Nota titulo="Na prática, planeia contando com elas">
          Enquanto a questão não estiver estabilizada, a hipótese prudente é a de que as dívidas
          fiscais e contributivas sobrevivem à exoneração. Planear ao contrário é apostar num
          resultado que pode não vir.
        </Nota>
      </Seccao>

      <Seccao titulo="Efeito nas execuções em curso">
        <Paragrafo>
          A declaração de insolvência tem efeito sobre as execuções pendentes contra o devedor:
          suspende-as e atrai-as para o processo de insolvência, para que os credores sejam pagos de
          forma concursal e não por ordem de chegada.
        </Paragrafo>
        <Paragrafo>
          A execução fiscal tem regime próprio e é onde as particularidades mais aparecem. Como em
          tudo neste guia, o efeito concreto sobre cada execução depende da sua fase e da natureza da
          dívida.
        </Paragrafo>
        <VaiPara href="/guias/suspender-execucao">
          Como se suspende uma execução fiscal fora deste contexto
        </VaiPara>
      </Seccao>

      <Seccao titulo="Alternativas antes de chegar aqui">
        <Paragrafo>
          A insolvência é o último instrumento, e há três que costumam resolver antes — e sem
          processo judicial.
        </Paragrafo>
        <Paragrafo>
          · <strong>Plano prestacional</strong> junto da AT ou da Segurança Social, que permite pagar
          a dívida em prestações e recuperar a situação regularizada.
          <br />· <strong>Regularização voluntária</strong> das faltas declarativas, que reduz as
          coimas a uma fração do mínimo enquanto a janela estiver aberta.
          <br />· <strong>Renegociação com credores privados</strong>, que quase sempre preferem um
          acordo a um processo em que recebem menos e mais tarde.
        </Paragrafo>
        <AvisoPrazo titulo="Agir cedo é o que mais muda o resultado">
          Cada um destes instrumentos vale mais quanto mais cedo se usa. Um plano prestacional pedido
          antes da execução é mais fácil do que depois; uma regularização feita antes da inspeção
          custa uma fração da que é feita depois.
        </AvisoPrazo>
        <VaiPara href="/guias/plano-prestacoes">
          Como se pede o pagamento em prestações
        </VaiPara>
        <VaiPara href="/guias/regularizacao-voluntaria">
          A janela da regularização voluntária, e o que a fecha
        </VaiPara>
      </Seccao>
    </>
  );
}
