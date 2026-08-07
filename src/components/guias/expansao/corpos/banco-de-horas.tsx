import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { BANCO_DE_HORAS, HORARIO_SEMANAL_COMPLETO, TRABALHO_SUPLEMENTAR } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra os arts. 208.º, 208.º-A e 208.º-B
// do Código do Trabalho (articulado consolidado, PGD Lisboa). O art.
// 208.º-A — banco de horas individual — está REVOGADO, e é o facto mais
// importante desta página.
export default function CorpoBancoDeHoras() {
  return (
    <>
      <Seccao titulo="O banco de horas individual já não existe">
        <Paragrafo>
          Comece-se pelo que quase toda a informação em circulação ainda erra:{" "}
          <strong>{BANCO_DE_HORAS.individualRevogado.value}</strong>.
        </Paragrafo>
        <Paragrafo>
          Quer dizer que um empregador <strong>não pode</strong> propor a um trabalhador, isoladamente,
          um acordo individual de banco de horas. Se te apresentarem um, o regime que ele invoca foi
          revogado.
        </Paragrafo>
        <AvisoPrazo titulo="Um acordo assinado não ressuscita uma norma revogada">
          A adaptabilidade do tempo de trabalho é matéria de ordem pública laboral: não se cria por
          contrato aquilo que a lei deixou de prever.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que resta: convenção coletiva, ou referendo">
        <Paragrafo>
          O banco de horas continua a existir em duas vias. Por{" "}
          <strong>instrumento de regulamentação coletiva</strong> — e aí é a convenção que o institui e
          fixa os seus termos. Ou <strong>grupalmente</strong>, aplicado ao conjunto dos trabalhadores
          de uma equipa, secção ou unidade económica.
        </Paragrafo>
        <Paragrafo>
          A via grupal exige <strong>referendo</strong>, e o projeto tem de ser publicitado e
          comunicado aos representantes dos trabalhadores e à inspeção do trabalho com a antecedência
          mínima de <strong>{BANCO_DE_HORAS.grupalAntecedenciaReferendoDias.value} dias</strong> em
          relação à data da votação.
        </Paragrafo>
        <Nota titulo="É aprovado por maioria qualificada, não por metade">
          Exige-se aprovação por, pelo menos,{" "}
          {pctExato(BANCO_DE_HORAS.grupalMaioriaReferendo.value)} dos trabalhadores abrangidos — e a
          regra mantém-se ao longo do tempo: havendo alteração na composição da equipa, o regime só
          continua enquanto os que permanecem forem pelo menos essa fração do total.
        </Nota>
      </Seccao>

      <Seccao titulo="Os três limites">
        <Paragrafo>
          · o período normal de trabalho pode ser aumentado até{" "}
          <strong>{BANCO_DE_HORAS.grupalAcrescimoDiario.value} horas diárias</strong>;
          <br />· pode atingir <strong>{BANCO_DE_HORAS.grupalMaximoSemanal.value} horas
          semanais</strong> — contra as {HORARIO_SEMANAL_COMPLETO.value} do horário completo;
          <br />· e o acréscimo tem o limite de{" "}
          <strong>{BANCO_DE_HORAS.grupalMaximoAnual.value} horas por ano</strong>.
        </Paragrafo>
        <Paragrafo>
          O regime é ainda temporário por desenho: o projeto tem de indicar o período de aplicação, que
          não pode ser superior a{" "}
          <strong>{BANCO_DE_HORAS.grupalDuracaoMaximaAnos.value} anos</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="O limite anual é o que travá quase sempre">
          {BANCO_DE_HORAS.grupalMaximoAnual.value} horas por ano são cerca de duas horas e meia por
          semana de trabalho. Uma empresa que use o banco intensamente durante três meses esgota-o.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Banco de horas não é trabalho suplementar">
        <Paragrafo>
          É a confusão que mais dinheiro custa. As horas prestadas dentro do banco{" "}
          <strong>compensam-se</strong> — por redução equivalente do tempo de trabalho, aumento do
          período de férias ou pagamento em dinheiro, conforme o regime instituído. Não são pagas com
          os acréscimos do trabalho suplementar.
        </Paragrafo>
        <Paragrafo>
          O trabalho suplementar, esse, tem acréscimos próprios — a começar em{" "}
          {pctExato(TRABALHO_SUPLEMENTAR.acrescimos.value[0])} na primeira hora em dia útil. Horas
          prestadas <strong>fora</strong> do banco, ou <strong>acima</strong> dos seus limites, são
          trabalho suplementar e pagam-se como tal.
        </Paragrafo>
        <VaiPara href="/guias/trabalho-suplementar">
          Os acréscimos das horas extra, e o que mudou na retenção
        </VaiPara>
      </Seccao>

      <Seccao titulo="Como se sai">
        <Paragrafo>
          O regime grupal não é irreversível. Decorrido metade do período de aplicação,{" "}
          <strong>um terço</strong> dos trabalhadores abrangidos pode solicitar novo referendo — e a
          aplicação do banco cessa se ele não for aprovado pela maioria exigida, ou se não for
          realizado no prazo de 60 dias.
        </Paragrafo>
        <Paragrafo>
          Cessando, o trabalho prestado em acréscimo tem de ser compensado nos 60 dias seguintes ao
          referendo. E, não sendo aprovado à primeira, o empregador só pode realizar novo referendo um
          ano depois.
        </Paragrafo>
        <Nota titulo="Há situações excluídas">
          O Código exceciona a aplicação do regime a determinadas situações pessoais protegidas.
          Confirma-as no articulado se for o teu caso — não são um detalhe menor.
        </Nota>
      </Seccao>

      <Seccao titulo="O que verificar se te propuserem um">
        <Passos
          passos={[
            {
              titulo: "Perguntar qual é a base: convenção coletiva ou referendo",
              texto: "Não sendo nenhuma das duas, não há regime válido — o individual foi revogado.",
            },
            {
              titulo: "Exigir ver o projeto por escrito",
              texto: "Tem de regular o âmbito de aplicação, os grupos excluídos, o período de vigência e os aspetos do art. 208.º. Um projeto que não diga isto não cumpre.",
            },
            {
              titulo: "Confirmar os 20 dias de antecedência",
              texto: "Entre a publicitação e o referendo. Um referendo marcado à pressa é atacável.",
            },
            {
              titulo: "Contar as horas em acréscimo, mês a mês",
              texto: `Contra os limites de ${BANCO_DE_HORAS.grupalAcrescimoDiario.value} horas por dia, ${BANCO_DE_HORAS.grupalMaximoSemanal.value} por semana e ${BANCO_DE_HORAS.grupalMaximoAnual.value} por ano. O que passe disso é trabalho suplementar.`,
            },
            {
              titulo: "Verificar como e quando é feita a compensação",
              texto: "Redução de tempo, férias ou dinheiro. Um banco que acumula sem nunca compensar é um banco que não está a funcionar como a lei prevê.",
            },
            {
              titulo: "Marcar metade do período de aplicação",
              texto: "É a partir daí que um terço dos abrangidos pode pedir novo referendo.",
            },
          ]}
        />
        <VaiPara href="/guias/formacao-40-horas">
          O outro direito que se acumula e caduca
        </VaiPara>
        <VaiPara href="/guias/teletrabalho">
          O regime que também exige acordo escrito
        </VaiPara>
      </Seccao>
    </>
  );
}
