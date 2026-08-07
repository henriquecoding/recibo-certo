import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { COIMAS_RGIT, FATURACAO_PRAZOS } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026 quanto aos prazos e às coimas: art. 36.º do
// CIVA na coleção consolidada e art. 117.º do RGIT.
//
// O pacote avisa: «os limiares de volume de negócios e de número de faturas
// foram alterados várias vezes — confirmar no DL 28/2019 em vigor». Não foi
// possível verificá-los nesta revisão (o Diário da República serve um shell
// vazio), pelo que NÃO são publicados. O guia descreve os critérios e manda
// confirmar os valores.
export default function CorpoProgramaFaturacaoCertificado() {
  return (
    <>
      <Seccao titulo="Os critérios de obrigatoriedade">
        <Paragrafo>
          A obrigação de usar programa certificado não depende de teres atividade aberta: depende de{" "}
          <strong>dois critérios alternativos</strong> — o <strong>volume de negócios</strong> do ano
          anterior e o <strong>número de documentos</strong> emitidos.
        </Paragrafo>
        <Paragrafo>
          Basta ultrapassar um deles. E há um terceiro caminho, independente dos dois: quem já{" "}
          <strong>usa</strong> um programa informático de faturação está obrigado a usar um
          certificado, seja qual for a sua dimensão.
        </Paragrafo>
        <AvisoPrazo titulo="Os valores concretos não estão aqui, e a razão é a de sempre">
          Os limiares foram alterados várias vezes e constam do Decreto-Lei n.º 28/2019 na redação em
          vigor, que não foi possível verificar em fonte legível nesta revisão. Confirma-os no Portal
          das Finanças ou com um contabilista certificado antes de decidires — é uma decisão de
          investimento, e um número errado custa dinheiro nos dois sentidos.
        </AvisoPrazo>
        <Nota titulo="O terceiro critério é o que apanha mais gente">
          Usar uma folha de cálculo ou um documento de texto para «passar recibos» conta como usar um
          programa informático — e obriga a que ele seja certificado. Na prática, quem não está
          abrangido pelos limiares tem de faturar no Portal das Finanças ou com programa certificado,
          não com uma folha própria.
        </Nota>
      </Seccao>

      <Seccao titulo="Faturar no Portal das Finanças: quando ainda dá">
        <Paragrafo>
          A AT disponibiliza um serviço gratuito de emissão de faturas e faturas-recibo no Portal das
          Finanças. Para quem está abaixo dos limiares, é uma solução completa e sem custo.
        </Paragrafo>
        <Paragrafo>
          Faz tudo o que é preciso: emite documentos com ATCUD e QR, comunica-os automaticamente e
          conserva-os. E como é a própria AT a emitir, não há série a comunicar nem certificação a
          verificar.
        </Paragrafo>
        <Nota titulo="Tem limites de conveniência, não de legalidade">
          Não integra com contabilidade, não emite documentos em série a partir de ficheiros, não faz
          gestão de clientes. Para quem emite meia dúzia de faturas por mês, nada disso importa.
        </Nota>
        <VaiPara href="/dashboard/recibos">
          Ferramenta para organizar os teus recibos e o mapa anual
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que muda quando passas o limiar">
        <Paragrafo>
          Passa a haver <strong>obrigação</strong> de emitir por programa certificado — com o número
          de certificação da AT impresso em todos os documentos —, e o programa passa a ter deveres
          próprios: gerar o SAF-T da faturação, assegurar a sequencialidade, impedir a alteração de
          documentos emitidos.
        </Paragrafo>
        <Paragrafo>
          E há um efeito prático que se sente antes de tudo o resto: <strong>custo mensal</strong>.
          Quase todo o software certificado é vendido por subscrição.
        </Paragrafo>
        <AvisoPrazo titulo="A obrigação nasce no ano seguinte, mas prepara-se antes">
          Quem passa o limiar num ano fica obrigado no seguinte. Escolher o programa, migrar dados e
          comunicar séries em dezembro é mau planeamento — e janeiro é o mês em que ninguém tem tempo
          para isso.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Escolher software certificado">
        <Passos
          passos={[
            {
              titulo: "Confirmar que está na lista oficial da AT",
              texto: "A AT publica a lista de programas certificados, com o número de certificação. Se não está na lista, não é certificado — por muito que o anúncio o diga.",
            },
            {
              titulo: "Verificar se emite os documentos de que precisas",
              texto: "Faturas, faturas-recibo, notas de crédito e de débito, guias de transporte. Nem todos emitem tudo, e descobri-lo depois de migrar é caro.",
            },
            {
              titulo: "Confirmar a exportação do SAF-T e dos dados",
              texto: "É o que te permite mudar de programa mais tarde. Um programa que dificulta a exportação é uma prisão com mensalidade.",
            },
            {
              titulo: "Verificar o suporte a formato estruturado",
              texto: "Se faturas ao Estado, ou se antecipas vir a precisar, pergunta ao fornecedor antes de assinar.",
            },
            {
              titulo: "Comparar o custo total, não o preço de entrada",
              texto: "Muitas subscrições limitam o número de documentos, de utilizadores ou de séries no escalão mais barato.",
            },
          ]}
        />
        <VaiPara href="/guias/faturacao-eletronica">
          As três obrigações que se confundem, e o que fazer com cada uma
        </VaiPara>
      </Seccao>

      <Seccao titulo="Mudar de programa a meio do ano">
        <Paragrafo>
          É possível e é comum — o que não é possível é fazê-lo em silêncio. As{" "}
          <strong>séries do programa antigo não migram</strong>: no programa novo criam-se séries
          próprias, que são comunicadas à AT e recebem os seus códigos de validação.
        </Paragrafo>
        <Paragrafo>
          O histórico do programa antigo tem de ser conservado, e o SAF-T de cada mês em que ele foi
          usado tem de continuar disponível. Cancelar a subscrição antes de exportar tudo é o erro
          que se paga mais tarde.
        </Paragrafo>
        <AvisoPrazo titulo="Exporta antes de cancelar, sempre">
          Alguns fornecedores cortam o acesso no fim do período pago. O que não exportaste até lá pode
          simplesmente deixar de estar acessível — e a obrigação de conservação continua a ser tua.
        </AvisoPrazo>
        <VaiPara href="/guias/atcud-qr-code">
          O ATCUD, as séries e o que muda ao trocar de programa
        </VaiPara>
      </Seccao>

      <Seccao titulo="Conservação de documentos">
        <Paragrafo>
          Os documentos e os ficheiros que os suportam têm de ser conservados durante o prazo legal,
          em condições que garantam a sua legibilidade, integridade e acessibilidade — e têm de poder
          ser exibidos à AT quando pedidos.
        </Paragrafo>
        <Paragrafo>
          Estando em suporte eletrónico, isso significa cópias de segurança próprias. A obrigação é
          tua, não do fornecedor do programa: «estava na nuvem do meu software» não é resposta quando
          o serviço fecha.
        </Paragrafo>
        <Nota titulo="Uma pasta por ano, exportada em janeiro">
          É o hábito mais barato e o que mais problemas evita. SAF-T de cada mês, PDF de cada
          documento, extrato do programa. Meia hora por ano.
        </Nota>
        <AvisoPrazo titulo="A moldura da coima, para dimensionar">
          A falta ou atraso na apresentação ou exibição de documentos vai de{" "}
          {fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a{" "}
          {fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}. E o prazo de emissão continua a ser o do art.
          36.º: o {FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil seguinte ao momento em que o
          imposto é devido.
        </AvisoPrazo>
        <VaiPara href="/guias/saf-t-faturacao">O SAF-T da faturação, mês a mês</VaiPara>
      </Seccao>
    </>
  );
}
