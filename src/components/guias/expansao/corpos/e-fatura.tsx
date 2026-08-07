import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { IRS_AUTOMATICO, REVISAO_E_RECLAMACAO } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026: arts. 78.º, 78.º-A a 78.º-E do CIRS, art.
// 57.º e art. 58.º-A, n.º 6 do CIRS, e art. 70.º do CPPT.
//
// O pacote avisa: «as datas exatas mudam todos os anos e podem ser
// prorrogadas por despacho — gerar a partir de tabela anual, nunca fixar
// no texto». É seguido à risca: este guia descreve a SEQUÊNCIA do
// calendário e não fixa nenhuma data de validação de faturas. O único
// prazo com número é o do art. 58.º-A, n.º 6, que está na lei.
export default function CorpoEFatura() {
  return (
    <>
      <Seccao titulo="O que o e-Fatura faz e o que não faz">
        <Paragrafo>
          O e-Fatura recolhe as faturas que os comerciantes comunicam à AT com o teu número de
          contribuinte, e é a partir delas que a administração apura as{" "}
          <strong>deduções à coleta</strong> a que tens direito.
        </Paragrafo>
        <Paragrafo>
          O que ele <em>não</em> faz: não decide sozinho a que categoria pertence cada despesa quando
          o comerciante tem atividades de vários tipos, não conhece despesas que não passaram por
          fatura com NIF, e não substitui a tua declaração.
        </Paragrafo>
        <AvisoPrazo titulo="Faturas por classificar não contam">
          É a regra central deste guia. Uma fatura que fique pendente à espera de decisão{" "}
          <strong>não entra</strong> nas deduções apuradas pela AT. Não é rejeitada nem contestada —
          simplesmente não conta, e ninguém te avisa.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Categorias de despesa e o que muda entre elas">
        <Paragrafo>
          Cada categoria de dedução tem a sua regra, a sua percentagem e o seu teto — e é por isso
          que classificar bem importa mais do que classificar depressa.
        </Paragrafo>
        <Paragrafo>
          · <strong>Despesas gerais familiares</strong> — a categoria que apanha o consumo corrente.
          <br />· <strong>Saúde</strong> — com regras próprias para o que é e não é dedutível.
          <br />· <strong>Educação e formação</strong>.
          <br />· <strong>Encargos com imóveis</strong> — rendas e juros, em condições definidas.
          <br />· <strong>Lares</strong>.
          <br />· E as deduções por <strong>exigência de fatura</strong> em setores determinados —
          restauração, cabeleireiros, oficinas, ginásios, veterinários —, que têm regra autónoma.
        </Paragrafo>
        <Nota titulo="A mesma fatura pode caber em mais do que um sítio">
          Uma farmácia vende medicamentos e cosmética; uma clínica pode faturar consultas e produtos.
          É por isso que o sistema te pergunta: quando o comerciante tem várias atividades, a
          classificação é tua.
        </Nota>
        <VaiPara href="/guias/deducoes-coleta">
          As deduções à coleta, categoria a categoria, com os limites
        </VaiPara>
      </Seccao>

      <Seccao titulo="Faturas pendentes: porque aparecem">
        <Paragrafo>
          Três razões, e nenhuma é erro teu.
        </Paragrafo>
        <Paragrafo>
          · O <strong>comerciante tem vários códigos de atividade</strong> e o sistema não consegue
          decidir a que categoria pertence a despesa.
          <br />· A fatura foi emitida com o teu NIF numa atividade que pode ser{" "}
          <strong>pessoal ou profissional</strong>, e só tu sabes qual foi.
          <br />· A fatura foi <strong>comunicada tarde</strong> pelo comerciante e entrou depois de
          teres validado o resto.
        </Paragrafo>
        <AvisoPrazo titulo="Verifica outra vez perto do fim do prazo">
          Faturas comunicadas com atraso aparecem depois da tua primeira passagem. Quem valida em
          janeiro e não volta lá em fevereiro deixa pendentes as que chegaram entretanto.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O calendário anual de validação">
        <Paragrafo>
          A sequência é sempre a mesma, e é ela que interessa reter — porque{" "}
          <strong>as datas exatas mudam todos os anos</strong> e podem ser prorrogadas por despacho.
        </Paragrafo>
        <Paragrafo>
          1. <strong>Comunicar o agregado familiar</strong> —{" "}
          {IRS_AUTOMATICO.prazoElementosPessoais.value}, no Portal das Finanças, com autenticação de
          todos os membros. É o único prazo desta lista que está fixado na lei, e é o primeiro a
          fechar.
          <br />
          2. <strong>Validar as faturas pendentes</strong> do ano anterior, no início do ano.
          <br />
          3. <strong>Consultar as deduções apuradas</strong> pela AT, publicadas depois de fechada a
          validação.
          <br />
          4. <strong>Reclamar</strong>, se o valor apurado não corresponder.
          <br />
          5. <strong>Entregar a declaração</strong>, no prazo legal.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma as datas no Portal das Finanças, todos os anos">
          Este guia não as fixa de propósito: uma data escrita aqui hoje estaria errada no próximo
          ano, e uma data errada num guia é pior do que nenhuma. A sequência é estável; o calendário
          não é.
        </AvisoPrazo>
        <Nota titulo="O primeiro prazo é o que mais gente perde">
          A comunicação do agregado exige autenticação de <em>todos</em> os membros, cada um com as
          suas credenciais. Não é coisa que um dos cônjuges resolva sozinho no último dia.
        </Nota>
        <VaiPara href="/guias/irs-automatico">
          A declaração automática, que parte destes mesmos elementos
        </VaiPara>
      </Seccao>

      <Seccao titulo="Depois do prazo: o que ainda se pode declarar manualmente">
        <Paragrafo>
          Perder o prazo de validação não é perder a dedução. É perder o <em>caminho fácil</em> para
          ela.
        </Paragrafo>
        <Paragrafo>
          As despesas que não entraram no apuramento da AT podem ser declaradas{" "}
          <strong>manualmente na Modelo 3</strong>, nos campos próprios de cada categoria. O que
          muda é o ónus: passas a ter de guardar os documentos e a poder ser chamado a comprová-los.
        </Paragrafo>
        <AvisoPrazo titulo="E se a liquidação já saiu, o instrumento é outro">
          Havendo já liquidação, a via é a reclamação graciosa, no prazo de{" "}
          <strong>{REVISAO_E_RECLAMACAO.reclamacaoGraciosaDias.value} dias</strong>. Passado esse
          prazo, resta a revisão do ato tributário, que é mais estreita.
        </AvisoPrazo>
        <VaiPara href="/guias/reclamar-deducoes">
          Reclamar das deduções apuradas, passo a passo
        </VaiPara>
        <VaiPara href="/guias/declaracao-substituicao">
          Corrigir depois de entregar
        </VaiPara>
      </Seccao>

      <Seccao titulo="Despesas de atividade vs. despesas pessoais">
        <Paragrafo>
          Quem tem atividade aberta vê no e-Fatura uma pergunta a mais: se a despesa é da{" "}
          <strong>atividade</strong> ou <strong>pessoal</strong>. E a resposta muda o destino da
          fatura por completo.
        </Paragrafo>
        <Paragrafo>
          Classificada como <strong>pessoal</strong>, a fatura vai para as deduções à coleta do teu
          IRS. Classificada como <strong>da atividade</strong>, vai para o outro lado da conta: serve
          a regra das despesas a justificar no regime simplificado, ou deduz-se pelo valor efetivo na
          contabilidade organizada.
        </Paragrafo>
        <AvisoPrazo titulo="Não é a mesma despesa a contar duas vezes">
          Uma fatura serve um lado ou o outro, não os dois. Classificá-la mal não é neutro — pode
          tirar-te uma dedução à coleta ou pôr no lado profissional uma despesa que é claramente
          pessoal.
        </AvisoPrazo>
        <Nota titulo="Há despesas mistas, e a lei prevê afetação parcial">
          Comunicações, eletricidade, água e renda de um espaço usado para viver e trabalhar podem
          ser afetas parcialmente à atividade. A percentagem tem de ser razoável e justificável — não
          é um número à escolha.
        </Nota>
        <VaiPara href="/guias/regime-simplificado">
          A regra das despesas a justificar, no regime simplificado
        </VaiPara>
      </Seccao>

      <Seccao titulo="Faturas em falta: como reclamar">
        <Passos
          passos={[
            {
              titulo: "Confirmar que a fatura tem mesmo o teu NIF",
              texto: "Uma compra em que não pediste NIF não gera fatura no e-Fatura, e não há nada a reclamar. É a causa mais comum de faturas «em falta».",
            },
            {
              titulo: "Verificar se está pendente em vez de ausente",
              texto: "Uma fatura pendente existe — só não está classificada. Aparece numa lista própria, e resolve-se com um clique.",
            },
            {
              titulo: "Registar a fatura em falta no e-Fatura",
              texto: "O portal permite inserir manualmente faturas que o comerciante não comunicou, com os dados do documento. Guarda o original.",
            },
            {
              titulo: "Guardar o documento original",
              texto: "É o que sustenta a despesa se for pedida comprovação. Uma fatura registada manualmente sem documento é uma despesa sem prova.",
            },
            {
              titulo: "Se o valor apurado não corresponder, reclamar na janela própria",
              texto: "Há um período específico para contestar as deduções apuradas, anunciado no Portal das Finanças. Perder essa janela remete-te para a declaração manual.",
            },
            {
              titulo: "Em último caso, declarar manualmente na Modelo 3",
              texto: "É sempre possível, e é o que garante que a despesa real acaba por contar. Mas o ónus da prova passa a ser inteiramente teu.",
            },
          ]}
        />
        <Nota titulo="Pedir NIF é a única parte que não se corrige depois">
          Todo o resto tem remédio. Uma compra feita sem NIF não tem: não existe fatura em teu nome
          para reclamar, registar ou declarar.
        </Nota>
      </Seccao>
    </>
  );
}
