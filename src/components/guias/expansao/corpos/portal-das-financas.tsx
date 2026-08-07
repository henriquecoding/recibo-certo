import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { REPRESENTANTE_FISCAL, RESIDENCIA_FISCAL, REVISAO_E_RECLAMACAO } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 19.º da LGT (n.os 4, 5, 15 e 16), art. 70.º do CPPT e art. 78.º do
// CPPT quanto às notificações.
//
// O pacote manda «explicar com precisão a regra de presunção de notificação
// eletrónica — é o ponto de maior impacto prático». É a quarta secção, e é
// o eixo do guia.
export default function CorpoPortalDasFinancas() {
  return (
    <>
      <Seccao titulo="Recuperar ou pedir nova senha">
        <Paragrafo>
          A senha do Portal das Finanças é a chave de tudo o resto: sem ela não entregas declarações,
          não consultas notificações, não pedes certidões e não autorizas ninguém a fazê-lo por ti.
        </Paragrafo>
        <Paragrafo>
          A recuperação faz-se no próprio portal, e a nova senha é enviada por{" "}
          <strong>correio, para o domicílio fiscal registado</strong>. É aqui que a primeira secção
          deste guia se liga à segunda: uma morada desatualizada torna a recuperação impossível.
        </Paragrafo>
        <AvisoPrazo titulo="É o problema mais comum de quem se mudou e não comunicou">
          A senha vai para a morada antiga. E como a alteração de morada exige, em regra, autenticação
          no portal, cria-se um bloqueio circular que se resolve presencialmente num serviço de
          finanças.
        </AvisoPrazo>
        <Nota titulo="Há alternativas de autenticação">
          A Chave Móvel Digital e o Cartão de Cidadão permitem entrar sem a senha do portal — e são a
          saída mais simples quando ela se perde. Vale a pena ativar uma delas antes de precisares.
        </Nota>
      </Seccao>

      <Seccao titulo="Alterar o domicílio fiscal e o prazo legal">
        <Paragrafo>
          O domicílio fiscal é a morada que consta no cadastro da AT, e é para ela que tudo é enviado.
          Não é a tua morada real — é a que está registada.
        </Paragrafo>
        <Paragrafo>
          A lei é direta nos dois sentidos: <strong>é ineficaz a mudança de domicílio enquanto não
          for comunicada</strong>, e sempre que se altere o estatuto de residência a comunicação
          faz-se no prazo de{" "}
          <strong>{RESIDENCIA_FISCAL.prazoComunicarDias.value} dias</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="Não comunicar não te protege de nada">
          As notificações continuam a seguir para a morada antiga e consideram-se feitas. A falta de
          resposta a uma notificação que nunca leste conta exatamente como falta de resposta.
        </AvisoPrazo>
        <VaiPara href="/guias/residencia-fiscal">
          Domicílio fiscal, residência fiscal e autorização de residência: três coisas diferentes
        </VaiPara>
      </Seccao>

      <Seccao titulo="Notificações eletrónicas: a adesão e os seus efeitos">
        <Paragrafo>
          Aderir ao serviço de notificações e citações eletrónicas — no Portal das Finanças, ou pela
          via da morada única digital — substitui o correio pelo canal eletrónico.
        </Paragrafo>
        <Paragrafo>
          Traz uma vantagem concreta que muita gente desconhece: a adesão{" "}
          <strong>dispensa a obrigação de designar representante fiscal</strong> para quem reside
          fora — e vale para qualquer país, não só para a União Europeia.
        </Paragrafo>
        <AvisoPrazo titulo="Mas cancelar a adesão tem porta condicionada">
          Para quem reside fora da União Europeia e do Espaço Económico Europeu, o cancelamento{" "}
          <strong>só produz efeitos depois de designado representante fiscal</strong>. Não dá para
          ficar sem nenhuma das duas coisas.
        </AvisoPrazo>
        <VaiPara href="/guias/representante-fiscal">
          O representante fiscal, e a dispensa que as notificações eletrónicas trazem
        </VaiPara>
      </Seccao>

      <Seccao titulo="A contagem de prazos nas notificações eletrónicas">
        <Paragrafo>
          É o ponto de maior impacto prático de todo este guia, e o que mais prejudica quem o ignora.
        </Paragrafo>
        <Paragrafo>
          A notificação eletrónica considera-se feita <strong>no momento em que a acedes</strong>. Mas
          se não acederes, a lei não deixa o prazo suspenso indefinidamente: considera-a feita{" "}
          <strong>ao fim de um número de dias contado da disponibilização</strong> na tua área
          reservada — quer a tenhas aberto, quer não.
        </Paragrafo>
        <AvisoPrazo titulo="O prazo corre mesmo que nunca entres no portal">
          É esta a consequência que apanha as pessoas. Aderir às notificações eletrónicas é assumir o
          hábito de consultar — porque o silêncio não adia nada. Quem adere e não consulta fica em
          pior posição do que quem recebia por correio.
        </AvisoPrazo>
        <Nota titulo="Confirma o número de dias da presunção">
          Consta do Código de Procedimento e de Processo Tributário e tem sido objeto de alterações.
          Confirma-o no Portal das Finanças — e, mais importante do que sabê-lo, cria o hábito de
          entrar de duas em duas semanas.
        </Nota>
        <Paragrafo>
          E a razão pela qual isto importa tanto: os prazos de reação contam-se{" "}
          <strong>da notificação</strong>. A reclamação graciosa de uma liquidação, por exemplo, tem{" "}
          <strong>{REVISAO_E_RECLAMACAO.reclamacaoGraciosaDias.value} dias</strong> — e o relógio
          começou a andar no dia em que a notificação se considerou feita, não no dia em que a leste.
        </Paragrafo>
        <VaiPara href="/guias/declaracao-substituicao">
          Os três relógios de quem quer corrigir depois da liquidação
        </VaiPara>
      </Seccao>

      <Seccao titulo="Autorizar um contabilista">
        <Paragrafo>
          Podes autorizar um contabilista certificado a aceder à tua área e a cumprir obrigações em
          teu nome. A autorização é feita no portal, é revogável, e pode ser limitada a serviços
          determinados.
        </Paragrafo>
        <Paragrafo>
          É a forma correta — e é o oposto de partilhar a senha, que é o que muita gente faz. A senha
          é pessoal, dá acesso a tudo, e não deixa registo de quem fez o quê.
        </Paragrafo>
        <AvisoPrazo titulo="Autorizar não transfere a responsabilidade">
          As obrigações declarativas continuam a ser tuas, e as consequências do incumprimento
          também. O contabilista responde perante ti; tu respondes perante a AT.
        </AvisoPrazo>
        <Nota titulo="Revoga quando a relação terminar">
          Um contabilista com quem já não trabalhas continua a ter acesso enquanto a autorização
          existir. É uma limpeza de cinco minutos que quase ninguém faz.
        </Nota>
      </Seccao>

      <Seccao titulo="Consultar a situação fiscal">
        <Passos
          passos={[
            {
              titulo: "Verificar notificações por ler, de duas em duas semanas",
              texto: "É o hábito mais importante deste guia, e o mais barato. Os prazos correm com ou sem leitura.",
            },
            {
              titulo: "Confirmar que o domicílio fiscal está certo",
              texto: "É a morada para onde vai tudo o que não é eletrónico — incluindo a senha nova, no dia em que precisares dela.",
            },
            {
              titulo: "Consultar a situação tributária",
              texto: "Dívidas, processos, planos de pagamento. É onde uma pendência esquecida aparece antes de bloquear um apoio ou um concurso.",
            },
            {
              titulo: "Confirmar o IBAN de reembolso",
              texto: "Uma conta encerrada trava o reembolso depois de todo o resto estar resolvido.",
            },
            {
              titulo: "Verificar as obrigações declarativas em falta",
              texto: "O portal mostra-as. Regularizar por iniciativa própria, antes de qualquer ação da AT, é o que reduz a coima ao mínimo legal.",
            },
            {
              titulo: "E, residindo fora, confirmar o canal de contacto",
              texto: `Ou representante fiscal designado, ou notificações eletrónicas ativas — a obrigação abrange residentes no estrangeiro e quem se ausente por mais de ${REPRESENTANTE_FISCAL.ausenciaMeses.value} meses.`,
            },
          ]}
        />
        <VaiPara href="/guias/situacao-regularizada">
          As certidões de situação regularizada, e o que as bloqueia
        </VaiPara>
        <VaiPara href="/guias/regularizacao-voluntaria">
          Regularizar obrigações em falta, com a coima reduzida
        </VaiPara>
      </Seccao>
    </>
  );
}
