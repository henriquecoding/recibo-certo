import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { IAS, ICE, SMN, SS_DEPENDENTE } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 quanto aos valores de referência (IAS,
// SMN, taxas contributivas), que vêm do motor. Os montantes e as condições
// de CADA medida do IEFP são fixados por portaria e por aviso de abertura,
// mudam durante o ano e NÃO são publicados aqui. O guia dá a mecânica —
// que é estável — e manda ao aviso em vigor.
export default function CorpoApoiosContratacaoIefp() {
  return (
    <>
      <Seccao titulo="Estão indexados ao IAS, e é isso que os torna previsíveis">
        <Paragrafo>
          Os apoios à contratação não são valores em euros escritos numa lei permanente: são{" "}
          <strong>múltiplos do Indexante dos Apoios Sociais</strong>, hoje em{" "}
          <strong>{fmt(IAS.value)}</strong>.
        </Paragrafo>
        <Paragrafo>
          Ou seja: sobem todos os anos com o IAS, sozinhos. Um artigo de há três anos com valores em
          euros está necessariamente desatualizado — mas o número de IAS de cada medida costuma
          manter-se.
        </Paragrafo>
        <Nota titulo="Este guia não publica os montantes de cada medida">
          São fixados por portaria e concretizados em avisos de abertura, com condições que mudam de
          candidatura para candidatura. Publicá-los aqui seria dar por fixo o que é, por desenho,
          variável. O que se dá é a mecânica — e essa não muda.
        </Nota>
      </Seccao>

      <Seccao titulo="Não são concursos, mas têm janelas">
        <Paragrafo>
          É a confusão mais frequente: não há pontuação nem seriação competitiva à maneira dos fundos
          comunitários. Cumprindo as condições, o apoio é atribuído.
        </Paragrafo>
        <Paragrafo>
          Mas há <strong>janelas de candidatura</strong>, que abrem e fecham durante o ano, e há{" "}
          <strong>dotação</strong>. Uma medida com dotação esgotada deixa de aceitar candidaturas
          mesmo que a empresa cumpra tudo.
        </Paragrafo>
        <AvisoPrazo titulo="A candidatura é ANTES da contratação">
          É o erro que inviabiliza mais processos, e não tem recuperação possível: contratar primeiro
          e candidatar depois deixa o posto de trabalho fora do apoio. Quem já assinou o contrato
          perdeu a medida.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A contrapartida: manter o posto">
        <Paragrafo>
          Todos os apoios à contratação exigem <strong>manutenção do posto de trabalho</strong>{" "}
          durante um período mínimo, e frequentemente também a manutenção do <strong>nível global de
          emprego</strong> da empresa.
        </Paragrafo>
        <Paragrafo>
          Incumprindo, há <strong>devolução</strong> — total ou proporcional ao tempo em falta. É o
          que transforma um apoio numa dívida, e costuma acontecer em reestruturações feitas sem
          olhar ao histórico de apoios.
        </Paragrafo>
        <Nota titulo="Substituir quem sai costuma salvar o compromisso">
          O que se exige é normalmente a manutenção do posto, não da pessoa. Antes de assumir que o
          apoio se perdeu, confirma as condições concretas do aviso.
        </Nota>
      </Seccao>

      <Seccao titulo="O custo real de um posto de trabalho">
        <Paragrafo>
          Para dimensionar o que o apoio vale, é preciso saber contra o que se compara. A retribuição
          mínima mensal garantida está em <strong>{fmt(SMN.value)}</strong>, e sobre a remuneração
          incidem <strong>{pctExato(SS_DEPENDENTE.entidade.value)}</strong> de contribuições da
          entidade empregadora — mais{" "}
          {pctExato(SS_DEPENDENTE.trabalhador.value)} descontados ao trabalhador.
        </Paragrafo>
        <Paragrafo>
          Há medidas que apoiam por <strong>comparticipação direta</strong> e outras que operam por{" "}
          <strong>isenção ou redução da taxa contributiva</strong> da entidade. A segunda forma é
          menos visível mas frequentemente mais valiosa, porque se estende no tempo.
        </Paragrafo>
        <AvisoPrazo titulo="Não acumulam livremente">
          Um mesmo posto de trabalho não costuma poder somar comparticipação e isenção contributiva. É
          uma das primeiras coisas a confirmar quando duas medidas parecem aplicáveis.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A ordem certa">
        <Passos
          passos={[
            {
              titulo: `Confirmar a situação regularizada primeiro: ${ICE.exigeSituacaoRegularizada.value}`,
              texto: "É condição transversal aos apoios públicos, e o motivo mais comum de chumbo. Uma coima antiga de cem euros chega para bloquear uma candidatura de milhares.",
            },
            {
              titulo: "Ler o aviso de abertura em vigor, não um resumo",
              texto: "Cada aviso concretiza montantes, públicos elegíveis, durações e obrigações. É o documento que vale, e muda.",
            },
            {
              titulo: "Registar a oferta de emprego antes de contratar",
              texto: "A maior parte das medidas parte de uma oferta registada e de um encaminhamento. Contratar por fora do circuito costuma excluir a candidatura.",
            },
            {
              titulo: "Candidatar antes de assinar o contrato de trabalho",
              texto: "É a regra que não tem exceção prática. Depois de assinado, o posto está fora.",
            },
            {
              titulo: "Escrever o compromisso de manutenção no plano de tesouraria",
              texto: "Durante quantos meses, e o que custa devolver. É informação de gestão, não papelada — e evita decisões que saem caras dois anos depois.",
            },
            {
              titulo: "Guardar tudo o que comprova o posto apoiado",
              texto: "Contrato, recibos de vencimento, declarações à Segurança Social. A verificação acontece depois, e às vezes muito depois.",
            },
          ]}
        />
        <VaiPara href="/guias/contratar-primeiro-trabalhador">
          O que muda na empresa ao contratar o primeiro trabalhador
        </VaiPara>
        <VaiPara href="/guias/situacao-regularizada">
          As certidões que os apoios exigem
        </VaiPara>
      </Seccao>

      <Seccao titulo="Requisitos do vínculo e do trabalhador">
        <Paragrafo>
          As medidas distinguem-se por <strong>público-alvo</strong> — jovens à procura do primeiro
          emprego, desempregados de longa duração, pessoas com deficiência, maiores de certa idade — e
          por <strong>tipo de vínculo</strong>, com apoios reforçados para contratos sem termo.
        </Paragrafo>
        <Paragrafo>
          É a combinação das duas coisas que determina o valor. O mesmo posto de trabalho pode valer o
          dobro consoante o perfil de quem é contratado e a duração do contrato.
        </Paragrafo>
        <Nota titulo="A inscrição do candidato tem de ser anterior">
          O estatuto que dá acesso à medida — desempregado inscrito, por exemplo — verifica-se à data
          da candidatura, não à data em que a empresa se lembra de o pedir.
        </Nota>
      </Seccao>

      <Seccao titulo="Devolução em caso de incumprimento">
        <Paragrafo>
          Não cumprir o compromisso de manutenção obriga a <strong>restituir</strong> o apoio. Consoante
          a medida e o momento, a restituição pode ser total ou proporcional ao período em falta.
        </Paragrafo>
        <Paragrafo>
          Há causas de cessação que não são imputáveis à empresa — despedimento com justa causa
          promovido pelo trabalhador, denúncia por iniciativa dele, caducidade em certas condições — e
          que normalmente permitem substituir o posto sem perder o apoio. Confirma-as no aviso antes de
          assumir o pior.
        </Paragrafo>
        <AvisoPrazo titulo="Comunicar depressa é o que salva o apoio">
          A substituição costuma ter prazo. Uma saída comunicada tarde transforma um problema resolúvel
          numa devolução.
        </AvisoPrazo>
        <VaiPara href="/guias/fim-do-contrato">
          As formas de cessação do contrato, e o que cada uma implica
        </VaiPara>
      </Seccao>
    </>
  );
}
