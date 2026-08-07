import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { ASSEDIO_TRABALHO } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026 contra o art. 29.º do Código do Trabalho
// (articulado consolidado, PGD Lisboa), na redação da Lei n.º 73/2017 e
// alterações posteriores.
export default function CorpoAssedioTrabalho() {
  return (
    <>
      <Seccao titulo="A definição legal, e a palavra que a torna útil">
        <Paragrafo>
          A lei começa por uma proibição seca — <strong>é proibida a prática de assédio</strong> — e
          define-o como {ASSEDIO_TRABALHO.definicao.value}.
        </Paragrafo>
        <Paragrafo>
          A palavra decisiva é <strong>«ou o efeito»</strong>. Não é preciso provar que quem o praticou
          quis humilhar: basta que o comportamento tenha tido esse efeito. É o que torna a norma
          aplicável a situações reais, em que a intenção é sempre negada.
        </Paragrafo>
        <Nota titulo="Assédio sexual tem definição própria">
          {ASSEDIO_TRABALHO.assedioSexual.value}.
        </Nota>
      </Seccao>

      <Seccao titulo="Não é preciso ser o chefe, nem ser no emprego">
        <Paragrafo>
          A norma abrange o assédio praticado <strong>aquando do acesso ao emprego</strong> — numa
          entrevista, num processo de recrutamento — e também no trabalho e na formação profissional.
        </Paragrafo>
        <Paragrafo>
          E nada nela exige uma relação hierárquica: entre colegas, de baixo para cima, de um cliente
          para um trabalhador. O que a lei descreve é o comportamento e o seu efeito, não a posição de
          quem o pratica.
        </Paragrafo>
        <AvisoPrazo titulo="Um episódio isolado pode não chegar; um padrão chega">
          A avaliação é do comportamento no seu conjunto. É por isso que o registo cronológico — datas,
          o que aconteceu, quem estava presente — vale mais do que a memória de um caso grave.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que a lei dá à vítima">
        <Paragrafo>
          {ASSEDIO_TRABALHO.direitoAIndemnizacao.value}, nos termos gerais da responsabilidade por
          discriminação — o que abrange danos patrimoniais e não patrimoniais.
        </Paragrafo>
        <Paragrafo>
          E {ASSEDIO_TRABALHO.contraordenacao.value}. São duas vias distintas: a indemnização
          discute-se no tribunal do trabalho; a contraordenação é matéria da inspeção do trabalho, e
          corre independentemente.
        </Paragrafo>
        <Nota titulo="Pode haver ainda justa causa de resolução">
          A ofensa à integridade física ou moral, à liberdade, à honra ou à dignidade do trabalhador é
          um dos comportamentos que a lei enumera como justa causa de resolução do contrato pelo
          trabalhador, com direito a indemnização.
        </Nota>
        <VaiPara href="/guias/fim-do-contrato">
          A resolução com justa causa, e o que dá direito a
        </VaiPara>
      </Seccao>

      <Seccao titulo="A proteção de quem denuncia">
        <Paragrafo>
          É a norma que muda a decisão de falar, e vale a pena lê-la devagar:{" "}
          {ASSEDIO_TRABALHO.protecaoDoDenunciante.value}.
        </Paragrafo>
        <Paragrafo>
          Abrange o <strong>denunciante e as testemunhas por si indicadas</strong>. Estende-se até{" "}
          <strong>decisão final transitada em julgado</strong> — não até ao fim do processo interno. E
          só cede havendo <strong>dolo</strong>, que tem de ser provado por quem o invoca.
        </Paragrafo>
        <AvisoPrazo titulo="Um processo disciplinar aberto logo depois da queixa">
          É exatamente a situação que esta norma existe para travar. A empresa tem de o justificar por
          factos alheios à denúncia — e a coincidência temporal joga contra ela.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A empresa tem obrigações próprias">
        <Paragrafo>
          Empresas com um número mínimo de trabalhadores devem adotar <strong>código de boa
          conduta</strong> para a prevenção e combate ao assédio, e instaurar{" "}
          <strong>procedimento disciplinar</strong> sempre que tenham conhecimento de alegadas
          situações de assédio.
        </Paragrafo>
        <Paragrafo>
          Não é discricionário: tendo conhecimento, a empresa tem de agir. Não agir é, ela própria, uma
          falha sancionável.
        </Paragrafo>
        <Nota titulo="Denunciar por escrito muda o processo">
          Uma queixa verbal permite à empresa dizer que nunca soube. Um email datado torna o
          conhecimento indiscutível — e é a partir dele que as obrigações da empresa nascem.
        </Nota>
      </Seccao>

      <Seccao titulo="O que fazer, pela ordem que protege">
        <Passos
          passos={[
            {
              titulo: "Começar o registo hoje, mesmo sem decidir avançar",
              texto: "Data, hora, local, o que foi dito ou feito, quem presenciou. Escrito no próprio dia vale muito mais do que reconstruído meses depois.",
            },
            {
              titulo: "Guardar tudo fora dos sistemas da empresa",
              texto: "Emails, mensagens, avaliações. O acesso ao correio profissional termina no dia em que o contrato termina.",
            },
            {
              titulo: "Denunciar por escrito, internamente",
              texto: "É o que faz nascer a obrigação de instaurar procedimento disciplinar, e o que ativa a proteção contra sanções.",
            },
            {
              titulo: "Identificar as testemunhas na própria denúncia",
              texto: "A proteção legal abrange as testemunhas POR TI INDICADAS. Nomeá-las na denúncia é o que as cobre.",
            },
            {
              titulo: "Queixa à ACT, em paralelo",
              texto: "A contraordenação é muito grave e corre independentemente de qualquer processo interno ou judicial.",
            },
            {
              titulo: "Falar com advogado antes de resolver o contrato",
              texto: "A resolução com justa causa tem prazo e forma próprios, e uma resolução mal fundamentada perde a indemnização. É a decisão a não tomar sozinho.",
            },
          ]}
        />
        <VaiPara href="/guias/despedimento">
          Se o processo disciplinar se virar contra ti
        </VaiPara>
        <VaiPara href="/guias/teletrabalho">
          A monitorização à distância, e o que é proibido
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que não é assédio, e porque é que isso importa">
        <Paragrafo>
          Nem todo o conflito no trabalho é assédio. Exigir cumprimento de objetivos, avaliar
          negativamente, instaurar um processo disciplinar fundado em factos, ou dar ordens
          desagradáveis dentro dos poderes de direção não é, por si só, assédio.
        </Paragrafo>
        <Paragrafo>
          A distinção importa nos dois sentidos: qualificar mal enfraquece a queixa, e é frequente uma
          situação real de assédio perder-se por vir misturada com desacordos de gestão que não o são.
        </Paragrafo>
        <Nota titulo="O que costuma marcar a diferença">
          A repetição, o desvio do exercício normal dos poderes de direção, e o efeito de isolamento ou
          esvaziamento de funções. É isso que o registo deve tornar visível.
        </Nota>
      </Seccao>
    </>
  );
}
