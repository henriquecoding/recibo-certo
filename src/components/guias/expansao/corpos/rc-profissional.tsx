import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { RC_PROFISSIONAL } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026 contra os arts. 8.º, 27.º, 31.º e 38.º da
// Lei n.º 2/2013 — a lei-quadro das associações públicas profissionais —
// no articulado consolidado da PGD Lisboa, na redação da Lei n.º 12/2023.
//
// NENHUM capital mínimo é publicado: vivem nos estatutos de cada ordem,
// aprovados por lei própria, e variam de profissão para profissão. O guia
// dá a arquitetura legal, que é comum, e manda ao estatuto certo.
export default function CorpoRcProfissional() {
  return (
    <>
      <Seccao titulo="Quando o seguro é obrigatório">
        <Paragrafo>
          A resposta curta é a que menos se espera: <strong>a lei geral não obriga ninguém</strong>. A
          lei-quadro das ordens profissionais diz que{" "}
          {RC_PROFISSIONAL.naoEObrigatorioPorLeiGeral.value}.
        </Paragrafo>
        <Paragrafo>
          <strong>Podem</strong> — não «devem». A obrigatoriedade não é universal e não decorre da lei
          que organiza as profissões: decorre do <em>estatuto</em> de cada ordem, que é uma lei
          própria.
        </Paragrafo>
        <AvisoPrazo titulo="E a faculdade tem um travão">
          Mesmo podendo, os estatutos {RC_PROFISSIONAL.testeDeRisco.value}.
        </AvisoPrazo>
        <Nota titulo="É esse teste que explica a assimetria">
          Porque é que umas profissões exigem seguro e outras não? Porque a lei só permite exigi-lo
          onde há risco direto e específico para a saúde, para a segurança ou para o dinheiro de quem
          contrata. Não é arbitrariedade de cada ordem — é o critério legal a filtrar.
        </Nota>
      </Seccao>

      <Seccao titulo="Profissões reguladas e os respetivos regimes">
        <Paragrafo>
          {RC_PROFISSIONAL.ondeVemAObrigacao.value}.
        </Paragrafo>
        <Paragrafo>
          Este guia <strong>não publica capitais mínimos nem coberturas</strong> por profissão. São
          fixados estatuto a estatuto, revistos com as alterações a cada estatuto, e um valor
          desatualizado aqui levaria alguém a segurar-se abaixo do exigido — que é o pior resultado
          possível desta página. Confirma-os no estatuto da tua ordem, ou junto dela.
        </Paragrafo>
        <AvisoPrazo titulo="Não sendo profissão regulada, não há obrigação — mas pode haver contrato">
          Um freelancer sem ordem profissional não tem esta obrigação legal. Pode ter uma obrigação{" "}
          <strong>contratual</strong>: muitos clientes empresariais e concursos públicos exigem apólice
          e comprovativo antes de assinar.
        </AvisoPrazo>
        <VaiPara href="/guias/abrir-atividade">
          O enquadramento da atividade, e onde a profissão se declara
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que a apólice deve cobrir">
        <Paragrafo>
          A regra legal é de <strong>proporcionalidade</strong>:{" "}
          {RC_PROFISSIONAL.proporcionalidade.value}.
        </Paragrafo>
        <Paragrafo>
          Traduzido para a prática: o que se segura é o <strong>dano causado a terceiro no exercício
          da profissão</strong> — o erro, a omissão, o conselho errado, o prazo perdido. Não é o teu
          património, não é o teu equipamento, não é a tua saúde.
        </Paragrafo>
        <Nota titulo="Pode ser garantia ou instrumento equivalente">
          A lei não impõe a forma «apólice de seguro». Admite garantia ou instrumento equivalente — o
          que interessa é a cobertura efetiva do risco.
        </Nota>
      </Seccao>

      <Seccao titulo="Limites de capital e franquias">
        <Paragrafo>
          Duas grandezas decidem se uma apólice serve, e são independentes uma da outra: o{" "}
          <strong>capital seguro</strong> — o máximo que a seguradora paga — e a{" "}
          <strong>franquia</strong> — a parte de cada sinistro que fica contigo.
        </Paragrafo>
        <Paragrafo>
          O capital costuma ter dois tetos: <strong>por sinistro</strong> e{" "}
          <strong>por anuidade</strong>. Uma apólice com capital generoso por sinistro mas anuidade
          curta esgota-se ao segundo caso do mesmo ano.
        </Paragrafo>
        <AvisoPrazo titulo="Uma franquia alta baixa o prémio e desprotege o comum">
          A maior parte das reclamações reais é de valor moderado. Uma franquia acima desse valor
          significa pagar prémio todos os anos para nunca acionar o seguro.
        </AvisoPrazo>
        <Nota titulo="Cumprir o mínimo do estatuto é o chão, não o teto">
          O capital mínimo exigido pela ordem é o que permite exercer. Se um erro teu pode custar ao
          cliente muito mais do que isso, o mínimo protege a inscrição — não protege o teu património.
        </Nota>
      </Seccao>

      <Seccao titulo="Reclamações e período de cobertura">
        <Paragrafo>
          É o ponto técnico que mais gente descobre tarde. Quase todas as apólices de responsabilidade
          civil profissional funcionam na base <strong>«claims made»</strong> — cobrem a{" "}
          <strong>reclamação apresentada durante a vigência</strong>, e não o trabalho feito durante a
          vigência.
        </Paragrafo>
        <Paragrafo>
          Duas consequências, e são as duas que decidem casos:
        </Paragrafo>
        <Paragrafo>
          · <strong>Retroatividade</strong> — a apólice tem de cobrir trabalhos anteriores ao seu
          início, ou os teus anos passados ficam a descoberto ao mudar de seguradora.
          <br />· <strong>Período posterior</strong> — deixando de ter apólice, reclamações que
          cheguem depois não são cobertas, ainda que o trabalho tenha sido feito enquanto estavas
          segurado.
        </Paragrafo>
        <AvisoPrazo titulo="Cessar atividade não fecha a exposição">
          O prazo para te reclamarem responsabilidade não termina no dia em que deixas de exercer. Sem
          um período posterior contratado, esse intervalo fica descoberto — e é o erro mais caro de
          quem se reforma ou muda de profissão.
        </AvisoPrazo>
        <VaiPara href="/guias/cessar-atividade">
          O que fica em aberto quando se cessa atividade
        </VaiPara>
      </Seccao>

      <Seccao titulo="Já tens seguro noutro Estado-Membro?">
        <Paragrafo>
          A lei resolve isso de forma expressa, e é uma proteção que quase ninguém invoca:{" "}
          {RC_PROFISSIONAL.seguroDoutroEstadoMembro.value}.
        </Paragrafo>
        <Paragrafo>
          Cobrindo apenas parte, {RC_PROFISSIONAL.coberturaParcialComplementaSe.value} — não é preciso
          duplicar tudo, só preencher o que falta.
        </Paragrafo>
        <Nota titulo="E a prova é simples">
          {RC_PROFISSIONAL.certidaoBasta.value}. Não é preciso subscrever apólice portuguesa para
          entregar à ordem.
        </Nota>
        <VaiPara href="/guias/remoto-empresa-estrangeira">
          Exercer em Portugal a partir de outro país
        </VaiPara>
      </Seccao>

      <Seccao titulo="Não confundir com o seguro de acidentes de trabalho">
        <Paragrafo>
          São seguros diferentes, com finalidades opostas, e ter um não dispensa o outro.
        </Paragrafo>
        <Paragrafo>
          · <strong>Responsabilidade civil profissional</strong> — protege <em>terceiros</em> do dano
          que o teu trabalho lhes causa. Nasce, quando nasce, do estatuto da tua ordem.
          <br />· <strong>Acidentes de trabalho</strong> — protege-te <em>a ti</em>, ou aos teus
          trabalhadores, do acidente sofrido no trabalho. Para trabalhadores por conta de outrem é
          obrigação da entidade empregadora; para independentes, tem regime próprio.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "Confirmar no estatuto da tua ordem se é condição de exercício",
              texto: "É a primeira pergunta, e a única cuja resposta muda tudo o resto. Não havendo ordem, não há obrigação legal — pode haver contratual.",
            },
            {
              titulo: "Ler os dois tetos do capital, e a franquia",
              texto: "Por sinistro e por anuidade. Uma apólice que cumpre o mínimo e tem anuidade curta cumpre a formalidade e pouco mais.",
            },
            {
              titulo: "Verificar a data de retroatividade",
              texto: "É o que cobre o trabalho já feito. Ao mudar de seguradora, é o campo que mais desprotege sem se dar por isso.",
            },
            {
              titulo: "Perguntar pelo período posterior à cessação",
              texto: "Antes de deixar de exercer, não depois. Contratado a tempo, é barato; depois, não existe.",
            },
            {
              titulo: "Guardar o comprovativo para clientes e concursos",
              texto: "Muitos contratos e procedimentos públicos exigem-no anexo à proposta, com data de validade dentro do prazo.",
            },
            {
              titulo: "Rever o capital quando a dimensão dos trabalhos mudar",
              texto: "O capital adequado a projetos pequenos deixa de o ser quando os projetos crescem. A apólice não se ajusta sozinha.",
            },
          ]}
        />
        <VaiPara href="/guias/seguro-acidentes-independentes">
          O seguro de acidentes de trabalho de quem trabalha por conta própria
        </VaiPara>
        <VaiPara href="/guias/despesas-dedutiveis">
          Se o prémio é gasto dedutível da atividade
        </VaiPara>
      </Seccao>
    </>
  );
}
