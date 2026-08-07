import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { FATURACAO_PRAZOS, IVA_TAXAS } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado na coleção consolidada:
// arts. 6.º, 29.º, 32.º e 36.º do CIVA.
//
// O pacote sublinha que quem está no regime de isenção do art. 53.º TAMBÉM
// tem de se registar para operações intracomunitárias. É a última secção, e
// é o ponto que mais gente falha.
export default function CorpoVies() {
  return (
    <>
      <Seccao titulo="O que é o VIES">
        <Paragrafo>
          É o sistema europeu que permite a qualquer sujeito passivo{" "}
          <strong>confirmar que o número de IVA de um cliente noutro Estado-Membro é válido</strong>{" "}
          para operações intracomunitárias.
        </Paragrafo>
        <Paragrafo>
          Existe por uma razão prática: numa operação entre sujeitos passivos de países diferentes, o
          IVA não é liquidado por quem vende — é autoliquidado por quem compra. E quem vende precisa
          de saber que quem compra é mesmo um sujeito passivo, ou fica responsável pelo imposto.
        </Paragrafo>
        <Nota titulo="Não é um registo europeu, é uma consulta a registos nacionais">
          Cada Estado-Membro mantém o seu cadastro. O VIES é a janela que permite consultá-los — e é
          por isso que um número pode existir no país e não aparecer no VIES: não foi habilitado para
          operações intracomunitárias.
        </Nota>
      </Seccao>

      <Seccao titulo="Como te registas em Portugal">
        <Paragrafo>
          O registo faz-se por <strong>declaração de alterações</strong> no Portal das Finanças,
          indicando que vais praticar operações intracomunitárias. Não é um pedido a outra entidade
          nem um formulário europeu — é a AT que te inscreve.
        </Paragrafo>
        <Paragrafo>
          Quem já sabe, ao iniciar atividade, que vai ter clientes ou fornecedores noutros
          Estados-Membros pode declará-lo logo na declaração de início.
        </Paragrafo>
        <AvisoPrazo titulo="Regista-te antes da primeira operação, não depois">
          O registo não tem efeito retroativo. Uma operação feita antes de estares registado não é
          intracomunitária para estes efeitos — e o tratamento que lhe deste pode ter de ser corrigido.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Validar o número do cliente e guardar prova">
        <Paragrafo>
          A validação faz-se na página oficial da Comissão Europeia, e devolve uma de duas respostas:
          válido ou inválido. Alguns Estados-Membros devolvem também o nome e a morada associados.
        </Paragrafo>
        <Paragrafo>
          O passo que quase toda a gente salta: <strong>guardar a prova da consulta</strong>. A
          consulta pode ser feita com um número de referência, que fica como comprovativo datado —
          e é esse comprovativo que demonstra que agiste de boa-fé se o número vier a revelar-se
          problemático.
        </Paragrafo>
        <Nota titulo="Valida a cada operação, não uma vez por cliente">
          Um número válido em janeiro pode ter sido cancelado em setembro. Para clientes recorrentes,
          uma validação por período de faturação é a prática razoável.
        </Nota>
      </Seccao>

      <Seccao titulo="O que acontece se o número não for válido">
        <Paragrafo>
          Se o cliente não tem número válido no VIES, não é — para estes efeitos — um sujeito passivo
          registado noutro Estado-Membro. E então a operação segue outras regras.
        </Paragrafo>
        <Paragrafo>
          Numa prestação de serviços, isso significa que deixas de poder tratá-la pela regra geral das
          operações entre sujeitos passivos e passas a ter de liquidar{" "}
          <strong>IVA português</strong> — à taxa normal do continente,{" "}
          {pctExato(IVA_TAXAS.continente.value.normal)}, quando aplicável.
        </Paragrafo>
        <AvisoPrazo titulo="E o imposto é teu, não do cliente">
          Se emitiste sem IVA a quem não tinha número válido, o imposto continua a ser devido — e sai
          do teu bolso, porque a fatura já foi emitida e paga. É a razão pela qual a validação prévia
          não é burocracia: é proteção.
        </AvisoPrazo>
        <Nota titulo="Um número inválido nem sempre é má-fé">
          Empresas novas demoram a ser habilitadas; empresas que cessaram atividade ficam com o número
          cancelado. Antes de assumir o pior, pede ao cliente que confirme com a administração dele.
        </Nota>
      </Seccao>

      <Seccao titulo="Relação com a declaração recapitulativa">
        <Paragrafo>
          As duas coisas andam juntas e são frequentemente confundidas. O <strong>VIES</strong> é
          onde consultas e onde estás inscrito; a <strong>declaração recapitulativa</strong> é o mapa
          periódico em que declaras as operações intracomunitárias que fizeste.
        </Paragrafo>
        <Paragrafo>
          Estar registado sem entregar a recapitulativa é incumprimento. Entregar a recapitulativa sem
          estar registado não é possível. E é a recapitulativa que alimenta o VIES do outro lado — o
          teu cliente é confrontado com o que declaraste.
        </Paragrafo>
        <AvisoPrazo titulo="A fatura tem prazo próprio nestas operações">
          Nas prestações intracomunitárias de serviços tributáveis noutro Estado-Membro, a fatura
          emite-se até ao dia{" "}
          <strong>{FATURACAO_PRAZOS.intracomunitariasAteDiaDoMesSeguinte.value} do mês seguinte</strong>{" "}
          àquele em que o imposto é devido — e não no{" "}
          {FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil da regra geral.
        </AvisoPrazo>
        <VaiPara href="/guias/declaracao-recapitulativa">
          A declaração recapitulativa, campo a campo
        </VaiPara>
        <VaiPara href="/guias/autoliquidacao-iva">
          A menção obrigatória na fatura, e quem liquida
        </VaiPara>
      </Seccao>

      <Seccao titulo="Isento do art. 53.º também precisa">
        <Paragrafo>
          É o ponto que mais gente falha, e vale a pena ser direto: <strong>sim</strong>. Estar no
          regime de isenção do art. 53.º não te dispensa de estares registado para operações
          intracomunitárias.
        </Paragrafo>
        <Paragrafo>
          São duas coisas independentes. A isenção do art. 53.º respeita ao regime interno de
          tributação — se liquidas IVA nas tuas operações em Portugal. O registo para operações
          intracomunitárias respeita ao <em>outro</em> circuito: o das operações com sujeitos passivos
          de outros Estados-Membros.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "Estás isento e vais prestar serviços a uma empresa noutro Estado-Membro",
              texto: "Regista-te para operações intracomunitárias antes da primeira fatura, valida o número do cliente e entrega a declaração recapitulativa.",
            },
            {
              titulo: "Estás isento e vais adquirir serviços a um fornecedor de outro Estado-Membro",
              texto: "Também precisas de registo — e passas a ter de autoliquidar o IVA dessa aquisição, mesmo estando isento nas tuas próprias operações.",
            },
            {
              titulo: "O registo não te tira a isenção interna",
              texto: "Continuas a não liquidar IVA nas faturas a clientes portugueses. Muda o tratamento das operações intracomunitárias, não o teu regime interno.",
            },
            {
              titulo: "Mas cria obrigações declarativas novas",
              texto: "Recapitulativa e, havendo aquisições com autoliquidação, entrega do imposto. É o preço de fazer operações intracomunitárias.",
            },
          ]}
        />
        <AvisoPrazo titulo="É a lacuna mais comum de quem começa a faturar para fora">
          Muita gente assume que, estando isenta, nada disto lhe diz respeito — e emite faturas para
          outro Estado-Membro sem registo e sem recapitulativa durante meses. A correção posterior
          envolve declarações em falta e coimas evitáveis.
        </AvisoPrazo>
        <VaiPara href="/guias/regime-isencao-ue">
          A isenção noutro Estado-Membro, que é outra coisa ainda
        </VaiPara>
      </Seccao>
    </>
  );
}
