import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { RESIDENCIA_FISCAL, REPRESENTANTE_FISCAL } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado contra o articulado no Portal das Finanças a 07/08/2026:
// art. 16.º do CIRS (n.os 4, 6, 14, 15 e 16), art. 15.º e art. 57.º do CIRS,
// e art. 19.º da LGT (n.os 4 a 8 e 15).
//
// O pacote avisa que a perda de residência como facto tributário em planos de
// opções resulta da Lei n.º 21/2023 e manda confirmar o regime do plano
// concreto. O corpo descreve o mecanismo e remete a qualificação do plano
// para quem o tem à frente — que é o que a lei permite afirmar.
export default function CorpoSairDePortugal() {
  return (
    <>
      <Seccao titulo="Comunicar a alteração de domicílio fiscal">
        <Paragrafo>
          É o primeiro passo e é o que mais gente salta, porque não parece um passo — parece
          burocracia. Não é: sem a comunicação, continuas residente aos olhos da AT, com tudo o que
          isso implica.
        </Paragrafo>
        <Paragrafo>
          A lei é direta nos dois sentidos. É <strong>ineficaz a mudança de domicílio</strong>{" "}
          enquanto não for comunicada à administração tributária; e sempre que se altere o estatuto
          de residência, a comunicação faz-se no prazo de{" "}
          <strong>{RESIDENCIA_FISCAL.prazoComunicarDias.value} dias</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="Não comunicar não te poupa imposto — cria-te um problema">
          Enquanto o cadastro disser que resides cá, a AT espera de ti a declaração de um residente:
          rendimento mundial, contas no estrangeiro, tudo. As notificações continuam a seguir para a
          morada antiga, e a falta de resposta a uma notificação que nunca leste conta como falta de
          resposta.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Residência parcial no ano da saída">
        <Paragrafo>
          A regra geral é boa: a perda da qualidade de residente ocorre a partir do{" "}
          <strong>{RESIDENCIA_FISCAL.fimResidencia.value}</strong>. O ano parte-se ao meio, e cada
          metade segue o seu estatuto — rendimento mundial até lá, só o obtido em Portugal depois.
        </Paragrafo>
        <Paragrafo>
          Mas há duas regras que fecham o ano inteiro, e são elas que apanham quem sai tarde.
        </Paragrafo>
        <AvisoPrazo titulo="A regra que torna o ano da saída um ano inteiro de residente">
          Consideras-te residente durante <strong>a totalidade do ano</strong> em que perdeste essa
          qualidade quando, cumulativamente, permaneceste cá{" "}
          {RESIDENCIA_FISCAL.residenteTodoOAnoDaSaida.value}. Cai se demonstrares que esses
          rendimentos foram tributados noutro Estado da UE ou do EEE com cooperação administrativa —
          ou noutro Estado qualquer, desde que a taxa aplicável lá não seja inferior a{" "}
          {pctExato(RESIDENCIA_FISCAL.limiarTributacaoNoEstrangeiro.value)} da que cá se aplicaria.
        </AvisoPrazo>
        <Nota titulo="E a que apanha quem volta">
          Quem volte a adquirir a qualidade de residente <em>no ano subsequente</em> àquele em que a
          perdeu considera-se {RESIDENCIA_FISCAL.regressoNoAnoSeguinte.value} desse ano. Uma saída de
          dezembro seguida de um regresso em fevereiro não parte o ano nenhum: apaga a saída.
        </Nota>
        <Paragrafo>
          As duas regras têm a mesma lógica — impedir que uma saída de calendário, tratada como um
          ato de planeamento, tire da tributação rendimentos que pertencem a um ano em que a vida foi
          cá.
        </Paragrafo>
        <VaiPara href="/guias/residencia-fiscal">
          Os critérios de residência, e como se contam os dias
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que continua a ser tributado em Portugal">
        <Paragrafo>
          Deixar de ser residente não corta o vínculo com o que cá fica. Passas a ser tributado
          unicamente pelos rendimentos <strong>obtidos em território português</strong> — e isso
          continua a ser bastante.
        </Paragrafo>
        <Paragrafo>
          Rendas de um imóvel que ficou cá. Mais-valias da venda desse imóvel. Rendimentos de
          trabalho ou de serviços prestados cá. Rendimentos de capitais pagos por entidades
          portuguesas. E os impostos sobre o património — IMI, e AIMI se houver — que nunca
          dependeram da residência de ninguém.
        </Paragrafo>
        <Paragrafo>
          O que muda são as taxas: passam a ser as dos não residentes, sobre o rendimento ilíquido e
          sem deduções à coleta.
        </Paragrafo>
        <Nota titulo="Mudar-se para um regime fiscal mais favorável tem carência">
          Os nacionais portugueses que deslocalizem a residência para um país, território ou região
          constante da lista aprovada por portaria continuam havidos como residentes no ano da
          mudança e nos {RESIDENCIA_FISCAL.paraisoFiscalAnos.value} anos seguintes — salvo prova de
          razões atendíveis, designadamente uma atividade temporária por conta de entidade patronal
          domiciliada cá.
        </Nota>
        <VaiPara href="/guias/nao-residentes-irs">
          As taxas dos não residentes, categoria a categoria
        </VaiPara>
      </Seccao>

      <Seccao titulo="Representante fiscal: quando é preciso">
        <Paragrafo>
          A obrigação de designar representante vale para os residentes no estrangeiro — e também
          para quem, residindo cá, se ausente por período superior a{" "}
          <strong>{REPRESENTANTE_FISCAL.ausenciaMeses.value} meses</strong>.
        </Paragrafo>
        <Paragrafo>
          Mas é <em>facultativa</em> para quem vai para a União Europeia ou para o Espaço Económico
          Europeu com cooperação administrativa equivalente. E há uma segunda porta, que vale para
          qualquer destino: <strong>aderir às notificações eletrónicas</strong> dispensa a nomeação.
        </Paragrafo>
        <VaiPara href="/guias/representante-fiscal">
          O que o representante faz, o que arrisca e como se cessa
        </VaiPara>
      </Seccao>

      <Seccao titulo="Planos de ações e o efeito da saída">
        <Paragrafo>
          É o ponto mais técnico deste guia e o que mais depende do plano concreto. A ideia é esta:
          num plano de opções ou de atribuição de ações, o ganho não nasce todo no mesmo momento —
          há a atribuição, há a maturação ao longo do tempo, há o exercício e há a venda.
        </Paragrafo>
        <Paragrafo>
          Sair de Portugal no meio dessa linha temporal levanta duas perguntas ao mesmo tempo:{" "}
          <em>quando</em> se considera obtido o rendimento, e <em>que Estado</em> o pode tributar.
          Há regimes em que a própria perda da qualidade de residente é tratada como momento
          relevante — e planos em que não é.
        </Paragrafo>
        <AvisoPrazo titulo="Aqui não se decide por analogia">
          O tratamento depende do regime concreto do plano e da data em que foi constituído, e a
          diferença entre dois planos parecidos pode ser toda. Antes de marcar a saída, leva o
          regulamento do plano a um contabilista certificado ou a um advogado fiscalista — é uma das
          poucas situações em que o custo do parecer é claramente menor do que o erro.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Obrigações que ficam pendentes">
        <Passos
          passos={[
            {
              titulo: "A declaração do ano da saída, entregue no ano seguinte",
              texto: "Com os dois estatutos, se houve residência parcial — e com o ano inteiro, se alguma das regras do art. 16.º o fechou.",
            },
            {
              titulo: "Alteração do domicílio fiscal comunicada",
              texto: `Em ${RESIDENCIA_FISCAL.prazoComunicarDias.value} dias. Sem isto, nada do resto produz o efeito que devia.`,
            },
            {
              titulo: "Representante fiscal designado, ou notificações eletrónicas ativas",
              texto: "Uma das duas. Sair sem nenhuma deixa-te sem canal para receber o que a AT te enviar.",
            },
            {
              titulo: "Atividade cessada, se tinhas atividade aberta",
              texto: "Uma atividade aberta continua a gerar obrigações declarativas — trimestrais na Segurança Social, periódicas no IVA — mesmo sem faturar nada.",
            },
            {
              titulo: "IBAN de reembolso atualizado",
              texto: "Fechar a conta portuguesa antes de receber o reembolso do último ano transforma um reembolso automático numa diligência a fazer de longe.",
            },
            {
              titulo: "Situação tributária regularizada antes de sair",
              texto: "É muito mais fácil resolver uma pendência com a AT enquanto cá estás. E é condição de vários regimes, se um dia voltares.",
            },
          ]}
        />
        <VaiPara href="/guias/programa-regressar">
          Se um dia voltares: o regime dos ex-residentes tem condições que começam agora
        </VaiPara>
        <VaiPara href="/guias/cessar-atividade">Como se cessa a atividade</VaiPara>
      </Seccao>
    </>
  );
}
