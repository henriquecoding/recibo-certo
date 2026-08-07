import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import {
  RFAI_LIMITE_COLETA,
  RFAI_LIMITE_INVESTIMENTO_INTERIOR,
  RFAI_REPORTE_ANOS,
  RFAI_TAXA_INTERIOR,
  RFAI_TAXA_INTERIOR_EXCEDENTE,
  RFAI_TAXA_LITORAL,
} from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026. Taxas e limites vêm do motor (arts. 22.º
// a 26.º do Código Fiscal do Investimento).
export default function CorpoRfai() {
  return (
    <>
      <Seccao titulo="A geografia decide quase tudo">
        <Paragrafo>
          O RFAI deduz à coleta de IRC uma parte do investimento em ativos produtivos. Mas a
          percentagem não é uma só — depende de <strong>onde</strong> o investimento é feito, e a
          diferença é enorme.
        </Paragrafo>
        <Paragrafo>
          · <strong>{pctExato(RFAI_TAXA_INTERIOR.value)}</strong> nas regiões Norte, Centro,
          Alentejo, Açores e Madeira, até ao limiar de{" "}
          {fmt(RFAI_LIMITE_INVESTIMENTO_INTERIOR.value)};
          <br />· <strong>{pctExato(RFAI_TAXA_INTERIOR_EXCEDENTE.value)}</strong> sobre a parcela que
          exceda esse limiar;
          <br />· <strong>{pctExato(RFAI_TAXA_LITORAL.value)}</strong> em Lisboa e no Algarve.
        </Paragrafo>
        <AvisoPrazo titulo="É a localização do investimento, não a da sede">
          Uma empresa com sede em Lisboa que instala uma linha de produção no interior avalia-se pela
          localização do ativo. E o contrário também é verdade — o que faz desta uma decisão a tomar
          antes de escolher o sítio, não depois.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A contrapartida: criar emprego, e mantê-lo">
        <Paragrafo>
          É a condição que distingue o RFAI de um desconto no investimento: exige{" "}
          <strong>criação de postos de trabalho</strong> e a sua manutenção durante um período
          mínimo.
        </Paragrafo>
        <Paragrafo>
          Não é uma formalidade. É a obrigação que, não sendo cumprida, obriga a{" "}
          <strong>devolver o benefício</strong> — com juros. Um investimento feito num ano de
          expansão que é seguido de uma reestruturação pode acabar a custar mais do que se não tivesse
          havido benefício nenhum.
        </Paragrafo>
        <Nota titulo="Conta o número de postos, não as pessoas">
          Substituir quem sai mantém o posto criado. O que não pode é o número total descer abaixo do
          nível a que o benefício ficou condicionado.
        </Nota>
      </Seccao>

      <Seccao titulo="Quanto se pode deduzir por ano">
        <Paragrafo>
          A dedução está limitada a <strong>{pctExato(RFAI_LIMITE_COLETA.value)}</strong> da coleta
          de IRC do período — e a totalidade da coleta nos primeiros exercícios de atividade, o que
          torna este benefício especialmente potente para quem está a começar.
        </Paragrafo>
        <Paragrafo>
          O saldo que não couber reporta-se por <strong>{RFAI_REPORTE_ANOS.value} exercícios</strong>.
          Um investimento grande num ano de coleta pequena não se perde: espalha-se.
        </Paragrafo>
        <VaiPara href="/guias/irc">
          Como se apura a coleta a que estes limites se aplicam
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que conta como investimento elegível">
        <Paragrafo>
          Ativos <strong>produtivos</strong>, afetos à exploração. É aqui que a maior parte das
          candidaturas encolhe face ao que a empresa esperava.
        </Paragrafo>
        <Paragrafo>
          Ficam tipicamente de fora as viaturas ligeiras de passageiros, o mobiliário e os artigos de
          conforto, os terrenos e os ativos que não sejam afetos à produção. Um investimento de{" "}
          {fmt(200_000)} em que metade é obra de conforto vale metade do que parecia valer.
        </Paragrafo>
        <AvisoPrazo titulo="Não acumula livremente com outros apoios">
          Há regras de não cumulação com outros auxílios de Estado sobre as mesmas despesas
          elegíveis. Antes de somar RFAI a um apoio comunitário, confirma-as — é um dos pontos que
          mais surge em correções.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A ordem por que se faz">
        <Passos
          passos={[
            {
              titulo: "Decidir a localização com o benefício em cima da mesa",
              texto: "A diferença entre as taxas das duas geografias pode superar o que se pouparia em renda ou em logística. É a decisão que mais vale, e a que se toma cedo demais para se pensar em impostos.",
            },
            {
              titulo: "Separar o investimento elegível do resto, na fatura e na conta",
              texto: "Uma empreitada única que inclui produção e conforto obriga a repartir depois. Pedir a separação ao fornecedor, à partida, é gratuito.",
            },
            {
              titulo: "Quantificar o compromisso de emprego antes de assinar",
              texto: "Quantos postos, e durante quanto tempo. É o que fica preso ao benefício — e o que, mais tarde, condiciona decisões de gestão.",
            },
            {
              titulo: "Documentar a afetação dos ativos à exploração",
              texto: "Onde estão, o que fazem, desde quando. Um ativo elegível sem prova de afetação é um ativo que se discute.",
            },
            {
              titulo: "Verificar as regras de não cumulação com outros apoios",
              texto: "Antes de candidatar, não depois de receber os dois.",
            },
            {
              titulo: "Planear o reporte",
              texto: "Sabendo que a dedução tem teto anual e horizonte de reporte, distribuir o investimento por dois exercícios chega, às vezes, para aproveitar tudo.",
            },
          ]}
        />
        <VaiPara href="/guias/sifide">
          O benefício irmão, do lado da investigação e desenvolvimento
        </VaiPara>
        <VaiPara href="/guias/amortizacoes-equipamento">
          O mesmo ativo do outro lado: como se deprecia
        </VaiPara>
      </Seccao>

      <Seccao titulo="Setores e o período de manutenção">
        <Paragrafo>
          O RFAI não está aberto a toda a atividade económica: há setores excluídos por força das
          regras europeias de auxílios de Estado — e a exclusão é por setor, não por empresa.
        </Paragrafo>
        <Paragrafo>
          Ao investimento associa-se ainda um <strong>período mínimo de manutenção dos ativos</strong>{" "}
          na empresa e na região. Vender ou transferir o ativo antes desse prazo obriga a devolver o
          benefício na parte correspondente.
        </Paragrafo>
        <AvisoPrazo titulo="São dois compromissos, com prazos próprios">
          Um sobre os postos de trabalho, outro sobre os ativos. Cumprir um não dispensa o outro, e
          quase todas as devoluções nascem de se ter esquecido o segundo.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A documentação de suporte">
        <Paragrafo>
          O RFAI é apurado pela própria empresa na declaração e não depende de aprovação prévia. Em
          troca, exige um <strong>dossier</strong> que sustente tudo o que foi deduzido — e que só é
          pedido mais tarde, quando já não é possível construí-lo.
        </Paragrafo>
        <Paragrafo>
          Faturas e comprovativos de pagamento dos ativos; prova da entrada em funcionamento e da
          localização; mapa dos postos de trabalho criados e mantidos, mês a mês; e a demonstração de
          que o investimento se enquadra numa aplicação relevante.
        </Paragrafo>
        <Nota titulo="Guardar não é arquivar">
          O dossier tem de responder a uma pergunta concreta — «mostre-me o ativo X, onde está e desde
          quando». Uma pasta com faturas por ordem cronológica não responde a isso.
        </Nota>
        <VaiPara href="/guias/inspecao-tributaria">
          O que acontece quando o dossier é pedido
        </VaiPara>
      </Seccao>
    </>
  );
}
