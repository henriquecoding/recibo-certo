import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { PROPRIEDADE_INTELECTUAL_EBF, REGIME_SIMPLIFICADO } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 58.º do EBF (n.os 1 a 3), art. 3.º do EBF (caducidade), e arts. 3.º,
// 31.º, 101.º e 151.º do CIRS.
//
// Nota de vigência, que o guia repete ao leitor: o art. 58.º está sujeito ao
// prazo de caducidade do art. 3.º, n.º 1 do EBF e NÃO consta da lista de
// exceções do n.º 3 desse artigo. A última prorrogação que a AT anota na
// própria página do artigo é a da Lei n.º 21/2021, até 31/12/2021. O texto
// continua publicado na coleção consolidada sem marca de revogação — mas a
// vigência para um ano concreto tem de ser confirmada, e não se afirma aqui.
export default function CorpoArtistasDireitosAutor() {
  return (
    <>
      <Seccao titulo="O que é propriedade intelectual para o art. 58.º EBF">
        <Paragrafo>
          O benefício abrange os rendimentos provenientes da{" "}
          <strong>{PROPRIEDADE_INTELECTUAL_EBF.incluidas.value}</strong>.
        </Paragrafo>
        <Paragrafo>
          Os rendimentos abrangidos são considerados no englobamento, para efeitos de IRS, apenas por
          uma fração do seu valor — a fração está na tabela de dados aqui em baixo, e é{" "}
          <em>líquida de outros benefícios</em>.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma a vigência do artigo antes de contar com ele">
          O art. 58.º está sujeito ao prazo de caducidade dos benefícios fiscais do art. 3.º do EBF,
          e não consta da lista de artigos excecionados. A última prorrogação anotada pela AT na
          própria página do artigo é a de 2021. O texto continua publicado sem marca de revogação,
          mas a vigência para o ano em causa confirma-se — no Portal das Finanças ou com um
          contabilista certificado — antes de se contar com o benefício na declaração.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Titular originário: o requisito que exclui cessionários">
        <Paragrafo>
          É a condição mais restritiva e a que decide a maior parte dos casos. O benefício vale a{" "}
          <strong>titulares de direitos de autor ou conexos residentes em território português,
          desde que sejam os titulares originários</strong>.
        </Paragrafo>
        <Paragrafo>
          Titular originário é quem criou. Quem adquiriu os direitos por cessão, quem os recebeu por
          herança e quem os explora por licença não são titulares originários — e não têm direito ao
          benefício, por muito que o rendimento venha da mesma obra.
        </Paragrafo>
        <Nota titulo="Uma editora ou uma produtora nunca é titular originário">
          O benefício foi desenhado para o criador, não para a cadeia que explora a criação. É por
          isso que a mesma receita pode ser beneficiada num ano e não no seguinte, se os direitos
          entretanto mudaram de mãos.
        </Nota>
      </Seccao>

      <Seccao titulo="O que fica de fora (obras publicitárias, arquitetura)">
        <Paragrafo>
          A lei exclui expressamente:{" "}
          <strong>{PROPRIEDADE_INTELECTUAL_EBF.excluidas.value}</strong>.
        </Paragrafo>
        <Paragrafo>
          As duas exclusões nomeadas apanham profissões inteiras. Um arquiteto não beneficia do
          artigo pelos seus projetos, por mais autoral que a obra seja. E o trabalho criativo feito
          para publicidade — texto, imagem, música, vídeo — está fora, independentemente do seu valor
          artístico.
        </Paragrafo>
        <AvisoPrazo titulo="A primeira exclusão é a mais difícil de aplicar">
          «Obras escritas sem carácter literário, artístico ou científico» é uma categoria que se
          define por exclusão de partes, e é onde cabem manuais técnicos, conteúdos comerciais e
          documentação. Se a tua obra está na fronteira, a qualificação faz-se caso a caso e vale a
          pena pedir apoio antes de a assumir.
        </AvisoPrazo>
        <VaiPara href="/guias/arquitetos-engenheiros">
          O enquadramento de quem faz projetos
        </VaiPara>
      </Seccao>

      <Seccao titulo="O limite do benefício">
        <Paragrafo>
          A importância a excluir do englobamento não pode exceder{" "}
          <strong>{fmt(PROPRIEDADE_INTELECTUAL_EBF.limiteExclusao.value)}</strong>.
        </Paragrafo>
        <Paragrafo>
          O teto morde no <strong>montante excluído</strong>, não no rendimento. Não é «o benefício
          só existe até este valor de receita»: é «não podes deixar de fora do englobamento mais do
          que isto». Acima desse ponto, o rendimento adicional entra por inteiro.
        </Paragrafo>
        <Nota titulo="A conta é simples de fazer">
          Enquanto a fração excluída for inferior ao teto, o benefício aplica-se por inteiro. A
          partir do momento em que o excederia, a exclusão fica congelada no teto e cada euro
          adicional é tributado integralmente.
        </Nota>
      </Seccao>

      <Seccao titulo="Coeficiente aplicável na Categoria B">
        <Paragrafo>
          Os rendimentos da cessão ou utilização temporária de propriedade intelectual têm
          coeficiente próprio no regime simplificado —{" "}
          <strong>{pctExato(REGIME_SIMPLIFICADO.coefPropIntelectual.value)}</strong>, o mais alto de
          todos. A lei presume pouquíssima despesa nesta atividade, e a presunção faz sentido: os
          custos foram suportados antes, na criação.
        </Paragrafo>
        <Paragrafo>
          O benefício do art. 58.º e o coeficiente são coisas diferentes que atuam em momentos
          diferentes — um sobre o que entra no englobamento, o outro sobre a determinação do
          rendimento da categoria B. Não se substituem.
        </Paragrafo>
        <AvisoPrazo titulo="Distingue o direito de autor da prestação de serviços">
          Um músico que dá um concerto está a prestar um serviço; um músico que recebe royalties da
          gravação está a receber rendimento de propriedade intelectual. A mesma pessoa pode ter os
          dois no mesmo ano, com enquadramentos distintos — e declarar tudo num só é o erro comum.
        </AvisoPrazo>
        <VaiPara href="/guias/regime-simplificado">
          Os coeficientes do regime simplificado, um a um
        </VaiPara>
      </Seccao>

      <Seccao titulo="Retenção na fonte específica">
        <Paragrafo>
          Os direitos de autor têm taxa de retenção própria, distinta da das profissões liberais e da
          das outras prestações de serviços. O valor está na tabela de dados aqui em baixo.
        </Paragrafo>
        <Paragrafo>
          Aplica-se quando quem paga é entidade com contabilidade organizada em Portugal — uma
          editora, uma produtora, uma entidade de gestão coletiva. Pagamentos vindos do estrangeiro
          não têm retenção cá, e o imposto aparece todo no acerto.
        </Paragrafo>
        <Nota titulo="Royalties do estrangeiro trazem duas coisas">
          Costumam vir com imposto retido na origem — que pode dar crédito cá, dentro dos limites do
          art. 81.º — e declaram-se no anexo do estrangeiro, pelo bruto, com o país da fonte
          identificado.
        </Nota>
        <VaiPara href="/guias/credito-imposto-estrangeiro">
          O crédito por imposto pago lá fora
        </VaiPara>
        <VaiPara href="/guias/anexo-j">O anexo do estrangeiro</VaiPara>
      </Seccao>
    </>
  );
}
