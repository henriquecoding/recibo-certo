import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import {
  COMPENSACAO_DESPEDIMENTO,
  COMPENSACAO_TETO_GLOBAL,
  COMPENSACAO_TETO_RETRIBUICAO,
  SMN,
} from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o Código do Trabalho (articulado
// consolidado, PGD Lisboa), com destaque para o art. 366.º. Os prazos
// procedimentais de cada modalidade NÃO são publicados sem confirmação
// artigo a artigo — variam com a modalidade e com a fase.
export default function CorpoDespedimento() {
  return (
    <>
      <Seccao titulo="Não há despedimento sem causa, e isso é o essencial">
        <Paragrafo>
          O ponto de partida do direito português é o oposto do que se assume: o empregador{" "}
          <strong>não pode</strong> fazer cessar o contrato quando quer. O despedimento sem justa causa
          é proibido pela Constituição, e o Código organiza-se à volta disso.
        </Paragrafo>
        <Paragrafo>
          Há quatro modalidades lícitas — por <strong>facto imputável ao trabalhador</strong>,{" "}
          <strong>coletivo</strong>, por <strong>extinção do posto de trabalho</strong> e por{" "}
          <strong>inadaptação</strong> — e cada uma tem pressupostos e um procedimento próprios. Fora
          delas, e sem cumprir o procedimento, o despedimento é ilícito.
        </Paragrafo>
        <Nota titulo="«Estás despedido» não é uma forma de despedir">
          Todas as modalidades exigem forma escrita e procedimento. Uma comunicação verbal, ou um email
          a dizer que não voltes, é um despedimento ilícito — não uma cessação irregular.
        </Nota>
      </Seccao>

      <Seccao titulo="O despedimento por facto imputável: o processo disciplinar">
        <Paragrafo>
          Exige <strong>justa causa</strong>: um comportamento culposo do trabalhador que, pela sua
          gravidade e consequências, torne imediata e praticamente impossível a subsistência da relação
          de trabalho. É um patamar alto, e é intencionalmente alto.
        </Paragrafo>
        <Paragrafo>
          E exige processo: <strong>nota de culpa</strong> escrita com a descrição circunstanciada dos
          factos, direito de <strong>resposta</strong>, possibilidade de requerer diligências
          probatórias, e <strong>decisão fundamentada</strong>, também escrita.
        </Paragrafo>
        <AvisoPrazo titulo="Os prazos deste processo não são publicados aqui">
          Cada fase tem o seu, e variam com a existência de comissão de trabalhadores e com as
          diligências requeridas. São prazos curtos e perentórios — confirma-os no articulado ou com um
          advogado assim que receberes a nota de culpa. Perder um prazo aqui custa o caso.
        </AvisoPrazo>
        <Nota titulo="Factos não descritos na nota de culpa não contam">
          A decisão só pode assentar nos factos que dela constem. É por isso que a nota de culpa é o
          documento a ler com mais atenção de todo o processo.
        </Nota>
      </Seccao>

      <Seccao titulo="As modalidades por motivos da empresa">
        <Paragrafo>
          O <strong>despedimento coletivo</strong> e o <strong>por extinção do posto de trabalho</strong>{" "}
          não assentam em culpa nenhuma: assentam em motivos de mercado, estruturais ou tecnológicos.
          Distinguem-se, sobretudo, pelo número de trabalhadores abrangidos num certo período.
        </Paragrafo>
        <Paragrafo>
          Ambos exigem comunicação escrita e fundamentada, fase de <strong>informações e
          negociação</strong> com os representantes dos trabalhadores, e intervenção do serviço
          competente do ministério do trabalho.
        </Paragrafo>
        <AvisoPrazo titulo="Extinguir o posto e contratar para as mesmas funções é contraditório">
          A extinção tem de ser real. Um posto «extinto» cujas funções passam a ser feitas por alguém
          admitido a seguir é a prova mais direta de que o motivo invocado não existia.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A compensação, e os dois tetos que a limitam">
        <Paragrafo>
          Nas modalidades por motivos da empresa, o trabalhador tem direito a compensação de{" "}
          <strong>{COMPENSACAO_DESPEDIMENTO.diasPorAno.value} dias</strong> de retribuição base e
          diuturnidades por cada ano completo de antiguidade. O valor diário obtém-se dividindo a
          retribuição base mensal e diuturnidades por{" "}
          {COMPENSACAO_DESPEDIMENTO.divisorDiario.value}, e{" "}
          {COMPENSACAO_DESPEDIMENTO.fracaoProporcional.value}.
        </Paragrafo>
        <Paragrafo>
          Sobre isso incidem <strong>dois tetos</strong>, ambos ancorados no salário mínimo — hoje{" "}
          {fmt(SMN.value)}:
        </Paragrafo>
        <Paragrafo>
          · a retribuição a considerar no cálculo não pode exceder{" "}
          <strong>{COMPENSACAO_DESPEDIMENTO.tetoRetribuicaoEmSmn.value} vezes</strong> o salário
          mínimo — hoje <strong>{fmt(COMPENSACAO_TETO_RETRIBUICAO)}</strong>;
          <br />· e o montante global não pode exceder{" "}
          <strong>{COMPENSACAO_DESPEDIMENTO.tetoGlobalEmMeses.value} vezes</strong> a retribuição base
          e diuturnidades ou, aplicando-se o teto anterior,{" "}
          <strong>{COMPENSACAO_DESPEDIMENTO.tetoGlobalEmSmn.value} vezes</strong> o salário mínimo —
          hoje <strong>{fmt(COMPENSACAO_TETO_GLOBAL)}</strong>.
        </Paragrafo>
        <Nota titulo="Sobem sozinhos, com o salário mínimo">
          Nenhum destes valores está fixado em euros na lei: são múltiplos da retribuição mínima mensal
          garantida. Tabelas copiadas de artigos antigos estão sempre erradas por defeito.
        </Nota>
      </Seccao>

      <Seccao titulo="Receber a compensação sem reservas fecha a porta">
        <Paragrafo>
          É a armadilha mais silenciosa de todo o Código:{" "}
          {COMPENSACAO_DESPEDIMENTO.presuncaoDeAceitacao.value}.
        </Paragrafo>
        <Paragrafo>
          Quer dizer: aceitar a transferência e ficar com o dinheiro presume-se aceitação do
          despedimento. Para o contestar, é preciso <strong>devolver a totalidade</strong> — em
          simultâneo, não depois.
        </Paragrafo>
        <AvisoPrazo titulo="Antes de tocar no dinheiro, fala com um advogado">
          É a decisão irreversível desta matéria, e toma-se sem se perceber que se está a tomá-la.
        </AvisoPrazo>
        <VaiPara href="/guias/fct-fgct">
          O fundo que pode pagar parte da compensação
        </VaiPara>
      </Seccao>

      <Seccao titulo="Se for ilícito">
        <Paragrafo>
          Sendo o despedimento declarado ilícito, o trabalhador tem direito à{" "}
          <strong>indemnização pelos danos</strong> sofridos, às{" "}
          <strong>retribuições que deixou de auferir</strong> desde o despedimento até ao trânsito em
          julgado, e à <strong>reintegração</strong> — ou, optando por ela, a uma indemnização em
          substituição.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "Guardar tudo, e depressa",
              texto: "Nota de culpa, comunicações, emails, avaliações, testemunhas. O acesso ao correio profissional acaba no dia em que o contrato acaba.",
            },
            {
              titulo: "Responder à nota de culpa dentro do prazo",
              texto: "É a única oportunidade de contraditório dentro do processo. Não responder não é neutro.",
            },
            {
              titulo: "Não assinar declarações de acordo no calor do momento",
              texto: "Uma revogação por mútuo acordo assinada no dia fecha quase todas as portas — e há prazo legal para a fazer cessar.",
            },
            {
              titulo: "Não receber a compensação antes de decidir",
              texto: "A presunção de aceitação só se ilide devolvendo tudo em simultâneo.",
            },
            {
              titulo: "Marcar o prazo para impugnar judicialmente",
              texto: "É curto, e é perentório. Confirma-o com advogado no primeiro dia, não no último.",
            },
            {
              titulo: "Inscrever-se no centro de emprego",
              texto: "A elegibilidade para o subsídio de desemprego depende da forma de cessação e do prazo de inscrição.",
            },
          ]}
        />
        <VaiPara href="/guias/subsidio-desemprego">
          O subsídio de desemprego, e o que o condiciona
        </VaiPara>
        <VaiPara href="/guias/fim-do-contrato">
          As contas finais, seja qual for a forma de cessação
        </VaiPara>
      </Seccao>

      <Seccao titulo="As cessações que não são despedimento">
        <Paragrafo>
          Nem toda a cessação por iniciativa da empresa é despedimento, e a diferença muda tudo o que
          se recebe a seguir.
        </Paragrafo>
        <Paragrafo>
          · <strong>Revogação por mútuo acordo</strong> — cessa por vontade das duas partes, com
          documento escrito. Tem prazo legal para o trabalhador a fazer cessar depois de assinada.
          <br />· <strong>Caducidade</strong> — do contrato a termo, no fim do prazo, com aviso prévio.
          <br />· <strong>Denúncia pelo trabalhador</strong> — com aviso prévio, sem indemnização.
          <br />· <strong>Resolução com justa causa pelo trabalhador</strong> — por comportamento do
          empregador, com direito a indemnização.
        </Paragrafo>
        <AvisoPrazo titulo="A forma de cessação condiciona o subsídio de desemprego">
          É a razão prática pela qual assinar uma «revogação por mútuo acordo» apresentada como
          formalidade é uma decisão séria. Confirma o enquadramento antes de assinar.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Suspensão preventiva, e o que ela não significa">
        <Paragrafo>
          O empregador pode suspender preventivamente o trabalhador durante o processo disciplinar{" "}
          <strong>sem perda de retribuição</strong>. É uma medida cautelar, não uma sanção.
        </Paragrafo>
        <Paragrafo>
          Não antecipa a decisão nem a torna mais provável, e não dispensa nenhuma das fases do
          processo. Continuar a receber é o sinal de que ainda há contrato.
        </Paragrafo>
        <Nota titulo="Deixar de receber durante a suspensão é ilegal">
          E é, por si só, matéria de queixa à inspeção do trabalho.
        </Nota>
      </Seccao>
    </>
  );
}
