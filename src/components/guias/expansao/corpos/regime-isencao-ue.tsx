import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { ISENCAO_IVA_REGIME } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado na coleção CONSOLIDADA,
// já com a redação do Decreto-Lei n.º 35/2025: art. 53.º (n.os 1 a 6) e art.
// 58.º (n.os 2 a 6) do CIVA.
//
// O pacote nota que as páginas .aspx dos arts. 52.º-A e 58.º-A não existem
// no Portal das Finanças — confirmado, devolvem 404. Mas o art. 53.º, n.º 2
// descreve o regime pelo lado de quem o recebe, e remete expressamente para
// «procedimento equivalente ao previsto no artigo 58.º-A». É a partir desse
// texto, verificado, que este guia é escrito; para o articulado dos artigos
// sem página, o PDF oficial do Código.
export default function CorpoRegimeIsencaoUe() {
  return (
    <>
      <Seccao titulo="O que mudou em 2025">
        <Paragrafo>
          Até aqui, a isenção de IVA das pequenas empresas era estritamente{" "}
          <strong>nacional</strong>: valia no país onde estavas estabelecido e em mais nenhum. Quem
          vendia noutro Estado-Membro entrava no regime normal desse país à primeira operação.
        </Paragrafo>
        <Paragrafo>
          O Decreto-Lei n.º 35/2025 transpôs a alteração europeia que abre o regime além-fronteiras —
          e mudou até a epígrafe do art. 53.º, que passou a chamar-se{" "}
          <em>«Âmbito de aplicação no território nacional»</em>, precisamente porque deixou de ser o
          único âmbito que existe.
        </Paragrafo>
        <Nota titulo="O Código descreve o regime pelo lado de quem o recebe">
          O art. 53.º, n.º 2 diz em que condições um sujeito passivo de <em>outro</em> Estado-Membro
          beneficia da isenção <em>em Portugal</em>. O caminho inverso — o português que quer
          beneficiar da isenção noutro país — segue procedimento equivalente, no artigo para que essa
          norma remete.
        </Nota>
      </Seccao>

      <Seccao titulo="O limiar de volume de negócios na União">
        <Paragrafo>
          São dois limiares, e é preciso cumprir os dois ao mesmo tempo.
        </Paragrafo>
        <Paragrafo>
          · O <strong>limiar do país onde queres a isenção</strong> — em Portugal,{" "}
          <strong>{fmt(ISENCAO_IVA_REGIME.limiarNacional.value)}</strong> de volume de negócios anual
          em território nacional. Cada Estado-Membro tem o seu.
          <br />· O <strong>limiar da União</strong>:{" "}
          <strong>{fmt(ISENCAO_IVA_REGIME.limiarUniao.value)}</strong> de volume de negócios anual em
          toda a União Europeia.
        </Paragrafo>
        <AvisoPrazo titulo="O limiar da União conta tudo, incluindo o teu país">
          Não é «vendas ao estrangeiro»: é o volume de negócios anual na União, somado. Uma empresa
          portuguesa com faturação nacional alta pode passar o limiar da União sem ter vendido nada
          lá fora — e ficar de fora do regime por isso.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A notificação prévia ao Estado de estabelecimento">
        <Paragrafo>
          O regime não se ativa por se cumprirem os limiares: exige um ato teu. Tens de{" "}
          <strong>notificar previamente</strong> o Estado-Membro onde estás estabelecido de que
          pretendes beneficiar da isenção no outro território.
        </Paragrafo>
        <Paragrafo>
          Sendo português, notificas Portugal — não o país onde queres a isenção. É a tua
          administração que comunica com a de lá, e é isso que torna o regime praticável: um só
          interlocutor.
        </Paragrafo>
        <Nota titulo="É a mesma arquitetura do balcão único">
          Um ponto de contacto no país de estabelecimento, que trata com os outros. A diferença é que
          aqui o objetivo é <em>não</em> pagar IVA, e no balcão único é pagá-lo de forma centralizada.
        </Nota>
      </Seccao>

      <Seccao titulo="O número individual com sufixo EX">
        <Paragrafo>
          Feita a notificação, o Estado-Membro de estabelecimento atribui um{" "}
          <strong>número individual de identificação com o sufixo «{ISENCAO_IVA_REGIME.sufixoIdentificacao.value}»</strong>.
          É o identificador do regime, e é o que o distingue do teu número de IVA normal.
        </Paragrafo>
        <Paragrafo>
          A isenção aplica-se <strong>a partir da data em que és informado</strong> do número — ou, em
          caso de atualização de notificação anterior, da data em que ele é confirmado pelo
          Estado-Membro de estabelecimento.
        </Paragrafo>
        <AvisoPrazo titulo="Antes do número, não há isenção">
          Operações feitas noutro Estado-Membro antes de teres o número seguem as regras normais desse
          país. Não há efeito retroativo — e é o erro que se comete por antecipar vendas à
          formalização.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Obrigações declarativas do regime">
        <Paragrafo>
          A isenção dispensa a liquidação de imposto, não a informação. O regime assenta em{" "}
          <strong>reporte periódico do volume de negócios</strong> ao Estado-Membro de
          estabelecimento — que é o que permite verificar, em tempo útil, se os limiares continuam
          cumpridos.
        </Paragrafo>
        <Paragrafo>
          E mantém-se o preço de sempre da isenção:{" "}
          <strong>não há direito à dedução</strong> do IVA suportado nas operações abrangidas, nem
          direito ao reembolso.
        </Paragrafo>
        <Nota titulo="Confirma a periodicidade e o formato do reporte">
          Os pormenores procedimentais constam dos artigos que não têm página própria no Portal das
          Finanças — o PDF oficial do Código do IVA é a fonte. Confirma-os com um contabilista
          certificado antes de aderir.
        </Nota>
      </Seccao>

      <Seccao titulo="Quando deixa de se aplicar">
        <Paragrafo>
          O art. 58.º trata a cessação, e para este regime há duas causas próprias: teres atingido, no
          ano civil anterior <em>ou</em> no ano em curso, um volume de negócios anual na União
          superior ao limiar.
        </Paragrafo>
        <Paragrafo>
          No caso do ano em curso, o regime normal produz efeitos{" "}
          <strong>a partir desse momento</strong> — não do ano seguinte. E os sujeitos passivos não
          estabelecidos em território nacional comunicam as alterações{" "}
          <strong>ao Estado-Membro de estabelecimento</strong>, nos termos da legislação interna dele.
        </Paragrafo>
        <AvisoPrazo titulo="Vigia o acumulado da União, não o de cada país">
          É o número que decide, e é o menos visível: exige somar faturação de vários países ao longo
          do ano. Quem não o acompanha descobre a ultrapassagem depois de ter emitido faturas sem IVA
          que já o deviam ter.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Diferença face ao OSS">
        <Paragrafo>
          São regimes com finalidades <strong>opostas</strong>, e confundi-los leva a escolher o
          errado.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "Este regime serve para NÃO pagar IVA noutro país",
              texto: "É para pequenas empresas abaixo dos limiares. O resultado é não liquidar imposto nesse Estado-Membro — e não deduzir o suportado.",
            },
            {
              titulo: "O OSS serve para PAGAR IVA noutro país, de forma simples",
              texto: "É para quem já ultrapassou os limiares e tem imposto devido em vários Estados-Membros. Centraliza a declaração e o pagamento num só sítio.",
            },
            {
              titulo: "Um exclui o outro, na mesma operação",
              texto: "Se a operação está isenta ao abrigo deste regime, não há IVA para declarar no OSS. Se há IVA devido, este regime não se aplica àquela operação.",
            },
            {
              titulo: "A ordem natural é crescer de um para o outro",
              texto: "Começa-se pequeno e isento; passa-se o limiar e entra-se no OSS. Quem antecipa o segundo passo perde a simplicidade do primeiro sem ganhar nada.",
            },
          ]}
        />
        <VaiPara href="/guias/oss-iva">
          O balcão único: vender na UE sem registar IVA em cada país
        </VaiPara>
        <VaiPara href="/guias/mudar-regime-iva">
          A mudança de regime em Portugal, quando o limiar nacional é ultrapassado
        </VaiPara>
      </Seccao>
    </>
  );
}
