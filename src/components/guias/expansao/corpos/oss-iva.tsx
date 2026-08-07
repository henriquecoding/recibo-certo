import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { FATURACAO_PRAZOS, IVA_TAXAS } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado na coleção consolidada:
// arts. 6.º, 18.º e 29.º do CIVA.
//
// O pacote avisa: «confirmar o limiar comunitário em vigor antes de
// publicar valores» e «distinguir OSS União de OSS não-União». O limiar não
// foi possível verificar em fonte oficial legível nesta revisão — o
// articulado que o fixa vive no Regime do IVA nas Transações
// Intracomunitárias e na Diretiva, e o Diário da República serve um shell
// vazio. Pelo que NÃO é publicado: o guia explica o mecanismo do limiar e
// manda confirmá-lo. A distinção entre os regimes está na secção final.
export default function CorpoOssIva() {
  return (
    <>
      <Seccao titulo="Onde é devido o IVA nas vendas B2C">
        <Paragrafo>
          Vender a um <strong>consumidor final</strong> noutro Estado-Membro segue regras diferentes
          das de vender a uma empresa. Não há autoliquidação: o particular não é sujeito passivo e não
          liquida nada.
        </Paragrafo>
        <Paragrafo>
          Abaixo de um limiar comunitário, as vendas continuam a ser tributadas no{" "}
          <strong>país do vendedor</strong> — em Portugal, à taxa portuguesa. Ultrapassado o limiar, o
          IVA passa a ser devido no <strong>país do consumidor</strong>, à taxa desse país.
        </Paragrafo>
        <AvisoPrazo titulo="O limiar deste guia não está aqui, de propósito">
          É um valor único para toda a União, aplicável ao conjunto das vendas à distância e dos
          serviços prestados por via eletrónica a consumidores de outros Estados-Membros. Não foi
          possível confirmá-lo em fonte oficial legível nesta revisão — confirma-o no Portal das
          Finanças ou com um contabilista certificado antes de decidires se já te aplica.
        </AvisoPrazo>
        <Nota titulo="É um limiar da União, não um por país">
          Ao contrário do regime antigo, que tinha um limiar por Estado-Membro, hoje há um valor único
          que soma tudo. Ultrapassá-lo muda o tratamento de todas as vendas B2C intracomunitárias ao
          mesmo tempo.
        </Nota>
      </Seccao>

      <Seccao titulo="O limiar comunitário e o que conta para ele">
        <Paragrafo>
          Contam as <strong>vendas à distância de bens</strong> a consumidores de outros
          Estados-Membros e os <strong>serviços prestados por via eletrónica</strong>, de
          telecomunicações e de radiodifusão a esses mesmos consumidores.
        </Paragrafo>
        <Paragrafo>
          <em>Não</em> contam as vendas a sujeitos passivos, que seguem a regra da autoliquidação, nem
          as vendas a consumidores portugueses.
        </Paragrafo>
        <AvisoPrazo titulo="Ultrapassar a meio do ano tem efeito imediato">
          Como quase tudo no IVA, a ultrapassagem produz efeitos a partir da operação que a provoca —
          não do ano seguinte. Quem vende regularmente para fora deve acompanhar o acumulado, não
          conferi-lo em dezembro.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Registar-se no OSS">
        <Paragrafo>
          O balcão único existe para resolver um problema que, sem ele, seria proibitivo: ter IVA
          devido em vários Estados-Membros significaria registar-se, declarar e pagar em cada um.
        </Paragrafo>
        <Paragrafo>
          Com o OSS, registas-te <strong>uma vez</strong>, no Portal das Finanças, declaras{" "}
          <strong>numa só declaração</strong> as operações de todos os países e pagas{" "}
          <strong>num só sítio</strong>. A AT portuguesa encarrega-se de distribuir o imposto pelas
          administrações de destino.
        </Paragrafo>
        <Nota titulo="É opcional, mas a alternativa é pior">
          Nada obriga a usar o OSS. A alternativa é o registo direto em cada Estado-Membro onde haja
          imposto devido — com as declarações e os prazos de cada um, na língua de cada um.
        </Nota>
      </Seccao>

      <Seccao titulo="O que se declara e com que periodicidade">
        <Paragrafo>
          Declaram-se as operações abrangidas, <strong>separadas por Estado-Membro de consumo e por
          taxa</strong>. É uma declaração autónoma: não substitui nem se mistura com a declaração
          periódica de IVA das operações internas.
        </Paragrafo>
        <Paragrafo>
          A periodicidade é <strong>trimestral</strong> no regime da União, com prazo próprio de
          entrega e de pagamento. Confirma as datas no Portal das Finanças — como todos os
          calendários, é matéria que se verifica no ano em causa.
        </Paragrafo>
        <AvisoPrazo titulo="Sem compensação entre países">
          A declaração do OSS não permite deduzir IVA suportado. O imposto suportado noutro
          Estado-Membro recupera-se pelo procedimento de reembolso a sujeitos passivos não
          estabelecidos, que é outro processo e tem os seus prazos.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Taxas de cada país">
        <Paragrafo>
          É o trabalho real do OSS, e a parte que mais se subestima. O imposto é devido{" "}
          <strong>à taxa do país do consumidor</strong> — e cada Estado-Membro tem as suas taxas
          normal, intermédia e reduzida, com listas de bens e serviços diferentes.
        </Paragrafo>
        <Paragrafo>
          Para dar a escala do problema dentro do próprio país: em Portugal a taxa normal é de{" "}
          <strong>{pctExato(IVA_TAXAS.continente.value.normal)}</strong> no continente,{" "}
          <strong>{pctExato(IVA_TAXAS.madeira.value.normal)}</strong> na Madeira e{" "}
          <strong>{pctExato(IVA_TAXAS.acores.value.normal)}</strong> nos Açores. Multiplica isso por
          vinte e sete jurisdições.
        </Paragrafo>
        <AvisoPrazo titulo="A taxa afeta o preço, e o preço é anunciado antes da venda">
          Num site que vende a toda a Europa, o mesmo produto tem margens diferentes conforme o país
          do comprador — a menos que o preço varie. É uma decisão comercial que a fiscalidade impõe, e
          convém tomá-la antes de o problema aparecer na declaração.
        </AvisoPrazo>
        <Nota titulo="A Comissão Europeia publica as taxas em vigor">
          É a fonte a usar, e é atualizada. Confiar numa tabela copiada há um ano é o erro que produz
          declarações com imposto a menos.
        </Nota>
      </Seccao>

      <Seccao titulo="Faturação e conservação de registos">
        <Paragrafo>
          As regras de faturação seguem as do <strong>Estado-Membro de identificação</strong> — no teu
          caso, Portugal. Os prazos de emissão são os do art. 36.º: o{" "}
          {FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil na regra geral, e{" "}
          {FATURACAO_PRAZOS.adiantamentos.value} nos adiantamentos.
        </Paragrafo>
        <Paragrafo>
          A obrigação de conservação é <strong>mais longa do que a habitual</strong> nas operações do
          balcão único, e os registos têm de permitir determinar, operação a operação, o
          Estado-Membro de consumo e a taxa aplicada.
        </Paragrafo>
        <Nota titulo="Guarda a prova da localização do consumidor">
          É o elemento que sustenta a taxa aplicada. Morada de faturação, endereço IP, indicativo
          telefónico, dados bancários — a lei exige elementos concordantes, e é o que se pede numa
          verificação.
        </Nota>
      </Seccao>

      <Seccao titulo="Quando o OSS não serve">
        <Passos
          passos={[
            {
              titulo: "Vendas a sujeitos passivos",
              texto: "Seguem a autoliquidação e a declaração recapitulativa, não o OSS. O balcão único é para consumidores finais.",
            },
            {
              titulo: "Importações de fora da União",
              texto: "Têm regime próprio — o IOSS — com o seu limiar de valor intrínseco e as suas regras.",
            },
            {
              titulo: "Quando tens estabelecimento no país de destino",
              texto: "Havendo estabelecimento estável nesse Estado-Membro, as operações que lhe sejam imputáveis não cabem no OSS: declaram-se lá.",
            },
            {
              titulo: "Quando ainda estás abaixo do limiar",
              texto: "Aí o IVA é devido em Portugal, à taxa portuguesa, e não há nada a declarar no OSS. Aderir por antecipação só acrescenta obrigações.",
            },
            {
              titulo: "Quando cabes no regime de isenção transfronteiriço",
              texto: "É o oposto do OSS: em vez de pagar imposto de forma centralizada, não o pagas. Serve pequenas empresas abaixo dos limiares.",
            },
          ]}
        />
        <Nota titulo="OSS União e OSS não-União são regimes distintos">
          O que este guia descreve é o regime da <strong>União</strong>, para sujeitos passivos
          estabelecidos num Estado-Membro. Existe um regime <strong>não-União</strong>, para
          prestadores estabelecidos fora da União que prestam serviços a consumidores europeus — com
          âmbito e regras próprias, que não são as deste guia.
        </Nota>
        <VaiPara href="/guias/ioss">
          O IOSS, para importações de pequeno valor
        </VaiPara>
        <VaiPara href="/guias/regime-isencao-ue">
          O regime de isenção noutros Estados-Membros
        </VaiPara>
      </Seccao>
    </>
  );
}
