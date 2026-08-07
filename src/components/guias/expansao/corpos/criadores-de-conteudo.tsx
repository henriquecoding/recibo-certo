import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { IVA_ISENCAO_LIMITE } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026: arts. 3.º, 15.º, 31.º, 101.º e 151.º do
// CIRS e arts. 6.º e 53.º do CIVA (coleção consolidada `civa_rep`).
export default function CorpoCriadoresDeConteudo() {
  return (
    <>
      <Seccao titulo="Abrir atividade: que código usar">
        <Paragrafo>
          Monetizar conteúdo é <strong>atividade económica</strong>, e a partir do momento em que há
          receita com carácter de habitualidade há atividade a abrir. Um vídeo pago uma vez pode ser
          ato isolado; um canal que rende todos os meses não é.
        </Paragrafo>
        <Paragrafo>
          O enquadramento faz-se por <strong>profissão da tabela do art. 151.º</strong> ou por{" "}
          <strong>CAE</strong>, e determina o coeficiente e a retenção — os dois cenários estão na
          tabela de dados aqui em baixo. Muitos criadores exercem, na prática, mais do que uma
          atividade: produção de conteúdo, publicidade, formação, venda de produtos. Podem coexistir
          na mesma abertura, e é isso que evita ter de forçar tudo num código só.
        </Paragrafo>
        <AvisoPrazo titulo="Não se generaliza por nome de profissão">
          «Criador de conteúdo» não é uma entrada da tabela do art. 151.º. O enquadramento faz-se
          pelo que efetivamente fazes, e confirma-se caso a caso com um contabilista certificado.
        </AvisoPrazo>
        <VaiPara href="/dashboard/classificar-atividade">
          Ferramenta para classificar a tua atividade
        </VaiPara>
      </Seccao>

      <Seccao titulo="Rendimento de plataformas estrangeiras">
        <Paragrafo>
          A monetização das grandes plataformas é paga por entidades sediadas fora de Portugal. Isso
          muda duas coisas — e não muda a terceira, que é a que interessa.
        </Paragrafo>
        <Paragrafo>
          Não há <strong>retenção na fonte</strong> em Portugal, e não há{" "}
          <strong>pré-preenchimento</strong> da declaração. Mas o rendimento é tributado na mesma:
          sendo residente, o IRS incide sobre a totalidade dos teus rendimentos, incluindo os obtidos
          fora do território.
        </Paragrafo>
        <AvisoPrazo titulo="Sem retenção, o imposto acumula em silêncio">
          Recebes o valor cheio durante o ano inteiro e o imposto aparece todo de uma vez no acerto.
          Quem não separa uma reserva mensal descobre a conta um ano depois, com o dinheiro gasto.
        </AvisoPrazo>
        <Nota titulo="E há retenção do outro lado que não é tua">
          Algumas plataformas retêm imposto na origem sobre a parte da audiência do país delas. Essa
          retenção pode dar direito a crédito de imposto cá — mas só se a declarares, e só até aos
          limites do art. 81.º.
        </Nota>
        <VaiPara href="/guias/credito-imposto-estrangeiro">
          O crédito por imposto pago no estrangeiro, com o duplo limite
        </VaiPara>
        <VaiPara href="/guias/anexo-j">
          O anexo do estrangeiro, e a identificação de contas
        </VaiPara>
      </Seccao>

      <Seccao titulo="Patrocínios e conteúdos pagos">
        <Paragrafo>
          Um conteúdo patrocinado é uma <strong>prestação de serviços</strong> como qualquer outra:
          emite-se fatura à marca ou à agência, com o valor acordado, e o rendimento é da categoria
          B.
        </Paragrafo>
        <Paragrafo>
          Sendo o cliente uma entidade portuguesa com contabilidade organizada, há retenção na fonte
          à taxa do teu enquadramento. Sendo estrangeiro, não há — e vale o que se disse na secção
          anterior.
        </Paragrafo>
        <Nota titulo="A fatura é tua obrigação, não um pedido do cliente">
          A obrigação de emitir a fatura nasce da prestação, não de o cliente a pedir. Marcas que
          «não precisam de fatura» continuam a deixar-te com a obrigação por cumprir.
        </Nota>
      </Seccao>

      <Seccao titulo="Permutas e ofertas: o valor de mercado">
        <Paragrafo>
          É o ponto que mais gente desconhece e o que mais divergências gera. Receber um produto,
          uma estadia ou um serviço <em>em troca</em> de conteúdo é uma{" "}
          <strong>permuta</strong> — e a permuta é rendimento.
        </Paragrafo>
        <Paragrafo>
          Valoriza-se ao <strong>preço de mercado</strong> do que recebeste e declara-se como
          qualquer outra receita. Do lado do IVA, a operação existe nos dois sentidos: cada parte
          presta algo à outra.
        </Paragrafo>
        <AvisoPrazo titulo="A diferença está em haver ou não contrapartida">
          Um produto enviado sem qualquer obrigação da tua parte é uma oferta. Um produto enviado
          com a expectativa acordada de publicação é pagamento em espécie — e a prova de qual dos
          dois é está nas mensagens trocadas.
        </AvisoPrazo>
        <Nota titulo="Guarda a avaliação que fizeste">
          Regista o valor de mercado atribuído e como lá chegaste — preço de tabela, tarifário
          público, fatura do parceiro. Um valor sem justificação é um valor discutível.
        </Nota>
      </Seccao>

      <Seccao titulo="IVA: localização do serviço e o cliente fora de Portugal">
        <Paragrafo>
          Abaixo de <strong>{fmt(IVA_ISENCAO_LIMITE.value)}</strong> de volume de negócios anual há
          isenção. Acima disso, entra a regra da <strong>localização</strong> — e é ela que decide se
          liquidas IVA português.
        </Paragrafo>
        <Paragrafo>
          Numa prestação a um <strong>sujeito passivo</strong> estabelecido noutro país, a regra
          geral do art. 6.º do Código do IVA localiza a operação no país do adquirente: não liquidas
          IVA português, e o imposto é devido lá pelo cliente. Sendo o cliente da União Europeia, há
          registo prévio e declaração recapitulativa a entregar.
        </Paragrafo>
        <AvisoPrazo titulo="Não liquidar IVA não é não ter obrigações">
          Continua a haver menção obrigatória na fatura, registo para operações intracomunitárias e
          declaração a entregar. É onde quem fatura para fora falha mais.
        </AvisoPrazo>
        <VaiPara href="/guias/vies">O registo para operações intracomunitárias</VaiPara>
        <VaiPara href="/guias/declaracao-recapitulativa">
          A declaração que acompanha os serviços prestados na UE
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que guardar como prova">
        <Paragrafo>
          · <strong>Relatórios de monetização</strong> de cada plataforma, mês a mês, com o bruto e o
          imposto retido na origem.
          <br />· <strong>Contratos e briefings</strong> dos patrocínios, que provam a contrapartida.
          <br />· <strong>Faturas emitidas</strong> a marcas e agências.
          <br />· <strong>Avaliação das permutas</strong>, com a fonte do valor de mercado.
          <br />· <strong>Despesas da atividade</strong> com fatura e NIF: equipamento, software,
          deslocações, cenários.
          <br />· <strong>Extratos das contas</strong> onde a receita entra, incluindo carteiras
          eletrónicas e contas no estrangeiro.
        </Paragrafo>
        <Nota titulo="As plataformas apagam histórico">
          Exporta os relatórios de cada ano no início do ano seguinte. Contas encerradas e políticas
          alteradas fazem desaparecer exatamente a prova de que precisas anos depois.
        </Nota>
      </Seccao>

      <Seccao titulo="Quando compensa passar a sociedade">
        <Paragrafo>
          A pergunta não é «a partir de que valor», é «o que faço com o dinheiro». A sociedade só
          compensa quando o rendimento fica{" "}
          <strong>dentro dela</strong> — reinvestido em equipamento, equipa ou produção — em vez de
          sair todo para a tua conta pessoal.
        </Paragrafo>
        <Paragrafo>
          Saindo todo, há dupla camada: o imposto sobre o lucro da sociedade e depois o imposto sobre
          o que retiras. E há custos fixos que não existem em nome individual: contabilidade
          certificada obrigatória, contas anuais, obrigações societárias.
        </Paragrafo>
        <Nota titulo="O que a estrutura não muda">
          Sendo residente, és tributado pela totalidade dos teus rendimentos, venha a receita de onde
          vier. A estrutura muda quem declara e a que taxa — não muda a obrigação de declarar.
        </Nota>
        <VaiPara href="/guias/unipessoal-vs-eni">
          Sociedade ou nome individual: a comparação completa
        </VaiPara>
        <VaiPara href="/guias/plataformas-subscricao">
          Se a receita vem de subscrições, há uma camada de IVA a mais
        </VaiPara>
      </Seccao>
    </>
  );
}
