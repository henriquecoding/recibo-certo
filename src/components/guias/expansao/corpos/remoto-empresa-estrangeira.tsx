import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { REGIME_SIMPLIFICADO } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado contra o articulado no Portal das Finanças a 07/08/2026:
// art. 3.º, art. 15.º e art. 31.º do CIRS, e art. 6.º do Código do IVA na
// coleção consolidada (`civa_rep` — a coleção que o pacote citava serve a
// redação anterior ao Pacote IVA de 2010).
//
// O pacote manda ligar ao guia `falsos-recibos-verdes` em vez de duplicar o
// teste de subordinação. É o que se faz: aqui descreve-se o risco e as suas
// consequências para os dois lados, e o teste vive onde já vivia.
export default function CorpoRemotoEmpresaEstrangeira() {
  return (
    <>
      <Seccao titulo="As três estruturas">
        <Paragrafo>
          Trabalhar de Portugal para uma empresa que não está cá pode fazer-se de três maneiras. Não
          são equivalentes: mudam quem paga as contribuições, quem responde perante a AT e onde
          assenta o risco.
        </Paragrafo>
        <Paragrafo>
          · <strong>Prestação de serviços</strong> — abres atividade cá e faturas à empresa. É o mais
          simples de montar e o que te deixa mais exposto.
          <br />· <strong>Contrato de trabalho</strong> com a empresa registada em Portugal para
          efeitos contributivos — és empregado, com tudo o que isso traz.
          <br />· <strong>Employer of Record</strong> — uma entidade terceira emprega-te cá e fatura
          à empresa, que nunca chega a ter presença própria em Portugal.
        </Paragrafo>
        <Nota titulo="Sendo residente cá, o IRS é o mesmo nas três">
          A sede de quem te paga não muda a sujeição: sendo residente, és tributado pela totalidade
          dos teus rendimentos, incluindo os obtidos fora. O que muda entre as estruturas é a{" "}
          <strong>categoria</strong> do rendimento, quem retém, e quem paga a Segurança Social.
        </Nota>
      </Seccao>

      <Seccao titulo="Recibos verdes: o mais simples e o mais exposto">
        <Paragrafo>
          Abres atividade, emites fatura-recibo e recebes o valor cheio. Do lado da empresa, é uma
          fatura de um fornecedor estrangeiro — sem contribuições, sem obrigações laborais, sem nada.
        </Paragrafo>
        <Paragrafo>
          Do teu lado, tudo passa a ser teu. No regime simplificado, o coeficiente aplicável às
          profissões da tabela do art. 151.º leva{" "}
          <strong>{pctExato(REGIME_SIMPLIFICADO.coefServicos151.value)}</strong> do rendimento bruto
          a imposto. As contribuições para a Segurança Social são tuas por inteiro. E não há
          subsídios, nem férias pagas, nem indemnização.
        </Paragrafo>
        <AvisoPrazo titulo="Sem entidade retentora, o imposto aparece todo de uma vez">
          Uma empresa estrangeira não retém IRS em Portugal. O imposto do ano inteiro aparece no
          acerto — e quem nunca teve de o antecipar descobre-o em julho do ano seguinte, com o valor
          já gasto.
        </AvisoPrazo>
        <VaiPara href="/guias/regime-simplificado">
          O regime simplificado, coeficiente a coeficiente
        </VaiPara>
        <VaiPara href="/guias/entidade-contratante">
          O que muda quando um cliente representa a maior parte do teu rendimento
        </VaiPara>
      </Seccao>

      <Seccao titulo="Contrato direto com empresa estrangeira registada cá">
        <Paragrafo>
          A empresa pode registar-se em Portugal para efeitos contributivos sem cá abrir sucursal, e
          empregar-te com contrato de trabalho português. Passas a ser trabalhador por conta de
          outrem, com o regime laboral e contributivo que isso implica.
        </Paragrafo>
        <Paragrafo>
          É a estrutura mais protetora para ti e a mais exigente para a empresa — e é por isso que
          muitas a recusam. Não é falta de vontade: é o custo administrativo de manter obrigações
          num país onde não tem operação.
        </Paragrafo>
        <Nota titulo="Ser empregado não garante retenção de IRS">
          A retenção na fonte da categoria A depende de haver entidade obrigada a retê-la em
          Portugal. Dependendo de como o registo está feito, pode continuar a não haver retenção — e
          o acerto anual volta a ser o teu problema. Confirma isto antes de assinar.
        </Nota>
      </Seccao>

      <Seccao titulo="Employer of Record: o que compras com a margem">
        <Paragrafo>
          Uma entidade terceira, com estrutura em Portugal, emprega-te formalmente e fatura à empresa
          o custo total mais uma margem. Para ti, o resultado é um contrato de trabalho português
          normal.
        </Paragrafo>
        <Paragrafo>
          O que a margem compra é a <strong>eliminação do risco de estabelecimento estável</strong>{" "}
          para a empresa, o cumprimento das obrigações contributivas e declarativas cá, e a certeza
          de que a relação laboral é a que aparenta ser.
        </Paragrafo>
        <AvisoPrazo titulo="Verifica quem é o teu empregador no papel">
          Numa estrutura destas, quem te emprega é o intermediário — e é ele que responde por
          salários, subsídios e cessação. Se a empresa cliente decidir terminar o projeto, a tua
          relação laboral é com quem te contratou, não com quem decidiu.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Segurança Social: onde se desconta em cada caso">
        <Paragrafo>
          Na <strong>prestação de serviços</strong>, contribuis como trabalhador independente, sobre
          o rendimento relevante apurado a partir do que faturaste, com declaração trimestral.
        </Paragrafo>
        <Paragrafo>
          Nas <strong>duas estruturas de contrato de trabalho</strong>, há entidade empregadora com
          obrigações contributivas cá: a tua parte é descontada no vencimento e a dela é paga por
          cima.
        </Paragrafo>
        <Paragrafo>
          Dentro da União Europeia, os regulamentos de coordenação impõem que estejas abrangido pela
          legislação de <strong>um só Estado-Membro de cada vez</strong>. Fora da UE, depende de
          haver acordo bilateral — e, não havendo, pode haver obrigação nos dois países sem qualquer
          compensação entre eles.
        </Paragrafo>
        <VaiPara href="/guias/seguranca-social">
          As contribuições dos independentes, com a base de incidência
        </VaiPara>
        <VaiPara href="/guias/isencao-contribuicoes-ss">
          Quando há dispensa de contribuir
        </VaiPara>
      </Seccao>

      <Seccao titulo="Requalificação: o risco que sobra para os dois lados">
        <Paragrafo>
          Se a relação tem, na substância, as marcas de um contrato de trabalho — horário definido,
          subordinação a instruções, integração na organização, exclusividade, instrumentos fornecidos
          pela empresa —, pode ser requalificada como tal, chame-se ela o que se chamar.
        </Paragrafo>
        <Paragrafo>
          As consequências correm nos dois sentidos: para a empresa, contribuições em falta e
          responsabilidades laborais retroativas; para ti, uma relação que afinal era de trabalho,
          com os direitos que isso implica — e a reclassificação do rendimento.
        </Paragrafo>
        <AvisoPrazo titulo="E há um segundo risco, que é só da empresa">
          O trabalho continuado a partir de um local fixo em Portugal pode fazer a empresa ser
          considerada com <strong>estabelecimento estável</strong> cá — sobretudo se negoceias ou
          concluis contratos em nome dela. Reconhecido o estabelecimento, a empresa passa a ter
          obrigações fiscais em Portugal sobre os lucros que lhe sejam imputáveis. É a razão real
          pela qual tantas empresas exigem intermediário.
        </AvisoPrazo>
        <VaiPara href="/guias/falsos-recibos-verdes">
          Os indícios de subordinação, um a um
        </VaiPara>
        <VaiPara href="/guias/convencao-dupla-tributacao">
          O artigo do estabelecimento estável, nas convenções
        </VaiPara>
      </Seccao>

      <Seccao titulo="IVA nos serviços a clientes fora de Portugal">
        <Paragrafo>
          Este ponto surpreende quem abre atividade pela primeira vez: numa prestação de serviços a
          um <strong>sujeito passivo</strong> estabelecido noutro país, a regra geral do art. 6.º do
          Código do IVA localiza a operação no <strong>país do adquirente</strong> — e não no teu.
        </Paragrafo>
        <Paragrafo>
          Não liquidas IVA português na fatura. O imposto, havendo-o, é devido pelo cliente no país
          dele, pelo mecanismo de autoliquidação. Sendo o cliente da União Europeia, a operação entra
          nas obrigações declarativas próprias das transações intracomunitárias, e há registo prévio
          a fazer.
        </Paragrafo>
        <AvisoPrazo titulo="Sem IVA na fatura não é sem obrigações">
          Não liquidar IVA não te dispensa de nada: continua a haver menção obrigatória na fatura,
          registo para operações intracomunitárias e declaração recapitulativa a entregar. É onde
          quem factura para fora falha mais.
        </AvisoPrazo>
        <Nota titulo="A regra muda se o cliente for um particular">
          A localização das prestações a quem <em>não</em> é sujeito passivo segue regras diferentes,
          com exceções por tipo de serviço. Se vendes a consumidores finais lá fora, confirma o
          enquadramento antes de emitir a primeira fatura.
        </Nota>
        <VaiPara href="/guias/vies">
          O registo para operações intracomunitárias
        </VaiPara>
        <VaiPara href="/guias/declaracao-recapitulativa">
          A declaração que acompanha os serviços prestados a clientes da UE
        </VaiPara>
      </Seccao>

      <Seccao titulo="Como decidir">
        <Passos
          passos={[
            {
              titulo: "Descreve a relação real, não a que o contrato diz",
              texto: "Horário, instruções, ferramentas, exclusividade, integração na equipa. Se a resposta é «igual a um empregado», a estrutura de prestação de serviços está a criar risco aos dois.",
            },
            {
              titulo: "Faz a conta ao custo total, não ao valor bruto",
              texto: "Numa prestação de serviços, tira o IRS e as contribuições que são todas tuas, e junta o que não tens: férias, subsídios e proteção no desemprego.",
            },
            {
              titulo: "Pergunta à empresa qual o risco que ela quer evitar",
              texto: "Se é o estabelecimento estável, um Employer of Record resolve-lho — e a margem que paga costuma ser menor do que o custo que teme.",
            },
            {
              titulo: "Confirma onde ficas abrangido pela segurança social",
              texto: "Antes de assinar, não depois. Corrigir anos de contribuições no país errado é o problema mais caro desta lista.",
            },
            {
              titulo: "Se ficares em recibos verdes, reserva o imposto todos os meses",
              texto: "Não há retenção. O que não separares em cada pagamento aparece de uma vez no acerto do ano seguinte.",
            },
          ]}
        />
        <VaiPara href="/dashboard/simulador">
          Fazer a conta ao teu caso, com as duas hipóteses lado a lado
        </VaiPara>
      </Seccao>
    </>
  );
}
