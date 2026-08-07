import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { ISENCOES_CIVA_PROFISSOES } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças,
// na coleção consolidada: art. 9.º, n.os 1), 2) e 3) do CIVA, e arts. 3.º,
// 31.º, 101.º e 151.º do CIRS.
//
// O pacote descreve a isenção como sendo «das prestações de serviços de
// saúde». O art. 9.º não funciona por tema: funciona por PROFISSÃO de quem
// presta. A divergência está registada em `correcoes.ts`.
export default function CorpoProfissionaisSaude() {
  return (
    <>
      <Seccao titulo="A isenção do art. 9.º CIVA">
        <Paragrafo>
          O art. 9.º do Código do IVA isenta um conjunto de operações internas, e as primeiras da
          lista são as da saúde. Mas a formulação legal é precisa de uma maneira que muda quem cabe
          lá dentro: a isenção é das prestações de serviços{" "}
          <strong>efetuadas no exercício</strong> de determinadas profissões — não «dos serviços de
          saúde» em abstrato.
        </Paragrafo>
        <Paragrafo>
          É uma <strong>isenção incompleta</strong>. Isenta a operação e, por isso mesmo, retira o
          direito à dedução do IVA suportado nas compras. Não é o melhor dos dois mundos: é ficar
          fora do imposto nos dois sentidos.
        </Paragrafo>
        <AvisoPrazo titulo="O IVA do equipamento fica a teu cargo">
          Comprar uma cadeira, um ecógrafo ou software clínico traz IVA que não recuperas. Quem
          compara o custo de equipar um consultório com o de uma atividade tributada tem de somar
          esse imposto ao preço — porque, para ti, ele é preço.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Quem está abrangido">
        <Paragrafo>
          A lei enumera: <strong>{ISENCOES_CIVA_PROFISSOES.saude.value}</strong>. A esta lista
          juntam-se, em números próprios do mesmo artigo, os serviços médicos e sanitários prestados
          por estabelecimentos hospitalares, clínicas e similares, e os protésicos dentários.
        </Paragrafo>
        <Paragrafo>
          A porta de entrada de quem não consta expressamente é a cláusula{" "}
          <em>outras profissões paramédicas</em> — e o seu alcance é delimitado por regulamentação,
          não por senso comum sobre o que é «saúde».
        </Paragrafo>
        <AvisoPrazo titulo="É aqui que estão as atividades de fronteira">
          Nutrição, osteopatia, terapias diversas, treino e aconselhamento: são as áreas que mais
          crescem e as que mais dúvidas geram. Assumir a isenção pelo tema do serviço, sem confirmar
          o enquadramento da profissão, é assumir o risco de não estar a liquidar imposto devido —
          com liquidação adicional e juros, anos depois.
        </AvisoPrazo>
        <Nota titulo="Confirma antes de emitir a primeira fatura">
          A questão resolve-se uma vez, no início, com um contabilista certificado ou com um pedido
          de informação vinculativa à AT. Resolvê-la depois de três anos de faturação é outro
          problema.
        </Nota>
      </Seccao>

      <Seccao titulo="O que faz cair a isenção">
        <Paragrafo>
          A isenção acompanha o ato de saúde. O que não é ato de saúde não vem com ela, mesmo quando
          é praticado pelo mesmo profissional, no mesmo espaço e no mesmo dia.
        </Paragrafo>
        <Paragrafo>
          Ficam tipicamente de fora: a <strong>venda de produtos</strong> — suplementos, cosmética,
          dispositivos —, a <strong>formação</strong> dada a outros profissionais, as{" "}
          <strong>peritagens e relatórios</strong> pedidos por seguradoras ou tribunais, a{" "}
          <strong>consultoria</strong> a empresas, e a criação de conteúdo ou de produtos digitais.
        </Paragrafo>
        <AvisoPrazo titulo="Uma atividade mista obriga a separar">
          Havendo operações isentas e operações tributadas, é preciso liquidar IVA nas segundas e
          aplicar as regras próprias da dedução parcial — o pro rata ou a afetação real. Não é
          opcional, e não se resolve tratando tudo como isento.
        </AvisoPrazo>
        <VaiPara href="/guias/renunciar-isencao-iva">
          Quando faz sentido renunciar à isenção
        </VaiPara>
      </Seccao>

      <Seccao titulo="Coeficiente e retenção na fonte">
        <Paragrafo>
          Do lado do IRS, a isenção de IVA é irrelevante: o rendimento é da categoria B e segue as
          regras comuns. As profissões de saúde constam tipicamente da tabela do art. 151.º, com o
          coeficiente e a retenção correspondentes — ambos na tabela de dados aqui em baixo.
        </Paragrafo>
        <Paragrafo>
          A retenção só existe quando quem paga é entidade com contabilidade organizada. Consultas a
          particulares não têm retenção; serviços prestados a clínicas, hospitais ou seguradoras
          têm.
        </Paragrafo>
        <Nota titulo="Estar isento de IVA não te dispensa de faturar">
          A fatura é obrigatória na mesma, com a menção do motivo da isenção. O que muda é não haver
          imposto liquidado — não é não haver documento.
        </Nota>
        <VaiPara href="/guias/regime-simplificado">
          O regime simplificado e a regra das despesas a justificar
        </VaiPara>
      </Seccao>

      <Seccao titulo="Seguro de responsabilidade civil obrigatório">
        <Paragrafo>
          O exercício de profissões de saúde está sujeito a obrigações próprias de seguro de
          responsabilidade civil profissional, definidas pela legislação do setor e pelas regras da
          respetiva ordem ou associação profissional.
        </Paragrafo>
        <Paragrafo>
          Os requisitos — coberturas, capitais mínimos, exclusões — variam por profissão e são
          fixados pelo regulador de cada uma. Confirma-os junto da tua ordem profissional: este guia
          trata do enquadramento fiscal e contributivo, não do regulamentar.
        </Paragrafo>
        <Nota titulo="O prémio é despesa da atividade">
          Do lado fiscal, o seguro profissional é despesa afeta à atividade — conta para a regra das despesas a justificar no regime simplificado e deduz-se pelo valor efetivo na
          contabilidade organizada.
        </Nota>
      </Seccao>

      <Seccao titulo="Faturação e sigilo: o que consta da fatura">
        <Paragrafo>
          A fatura tem de conter os elementos que a lei exige — identificação das partes, data,
          descrição da operação, valor e o motivo da isenção quando aplicável. E tem de identificar{" "}
          <strong>a operação</strong>, não o diagnóstico.
        </Paragrafo>
        <Paragrafo>
          «Consulta de especialidade» é descrição suficiente. Detalhar a patologia, o tratamento ou o
          motivo clínico não é exigido pela lei fiscal — e a fatura é um documento que circula, entra
          em plataformas e é comunicado à AT.
        </Paragrafo>
        <AvisoPrazo titulo="O sigilo não cede à conveniência do sistema de faturação">
          Programas configurados com descrições clínicas por defeito espalham informação de saúde por
          onde ela não devia estar. Revê os descritivos padrão do teu programa antes de emitir.
        </AvisoPrazo>
        <Nota titulo="E o NIF do utente serve para outra coisa">
          É o que permite ao doente deduzir a despesa de saúde no IRS dele. Pedi-lo é um serviço que
          prestas; a comunicação da fatura à AT é que faz a dedução aparecer no e-fatura.
        </Nota>
        <VaiPara href="/guias/deducoes-coleta">
          As despesas de saúde do lado de quem as deduz
        </VaiPara>
      </Seccao>
    </>
  );
}
