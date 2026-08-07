import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado a 06/08/2026 contra os arts. 1.º, 2.º, 6.º, 26.º, 28.º e
// 44.º do CIS, a verba 1.2 da Tabela Geral (PDF consolidado da AT), e os
// arts. 10.º e 45.º do CIRS quanto ao valor de aquisição por herança.
export default function CorpoHerdarImovel() {
  return (
    <>
      <Seccao titulo="Quem está isento e quem não está">
        <Paragrafo>
          Em Portugal não há «imposto sucessório». Há <strong>imposto do selo</strong> sobre as
          transmissões gratuitas, e a taxa está na tabela de dados aqui em baixo — é a{" "}
          <strong>verba 1.2</strong> da Tabela Geral.
        </Paragrafo>
        <Paragrafo>
          A isenção que interessa à maioria das famílias é subjetiva, não objetiva: estão isentos{" "}
          <strong>o cônjuge ou unido de facto, os descendentes e os ascendentes</strong> nas
          transmissões gratuitas de que sejam beneficiários. Filhos, netos, pais e avós não pagam.
        </Paragrafo>
        <AvisoPrazo titulo="Irmãos e sobrinhos não estão na lista">
          A isenção é taxativa. Herdeiros fora daquele círculo — irmãos, sobrinhos, primos, amigos —
          pagam a taxa da verba 1.2 sobre o valor dos bens. É a surpresa mais cara das heranças sem
          descendentes diretos, e a que mais vale a pena antecipar.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A participação à AT e o prazo">
        <Paragrafo>
          A isenção não dispensa a comunicação. O <strong>cabeça-de-casal</strong> e o beneficiário
          de qualquer transmissão gratuita sujeita a imposto são obrigados a participar ao serviço
          de finanças o falecimento do autor da sucessão — ou a doação, a usucapião, ou qualquer
          outro ato que envolva transmissão de bens.
        </Paragrafo>
        <Paragrafo>
          A participação é feita em <strong>modelo oficial</strong> e identifica o autor da
          sucessão, as datas e locais, os sucessores, as relações de parentesco e a respetiva prova,
          com a relação dos bens transmitidos e os valores a declarar. O prazo está na tabela de
          dados aqui em baixo.
        </Paragrafo>
        <AvisoPrazo titulo="O prazo é improrrogável — com uma exceção estreita">
          A lei diz «improrrogáveis», salvo alegando-se e provando-se motivo justificado, caso em
          que o chefe de finanças pode conceder um adiamento até ao limite máximo de{" "}
          <strong>60 dias</strong>. Não é uma prorrogação automática nem se pede por telefone.
        </AvisoPrazo>
        <Nota titulo="Se o cabeça-de-casal identificar toda a gente, os outros ficam desonerados">
          O cabeça-de-casal deve identificar todos os beneficiários, se tiver os elementos para
          isso — e nesse caso os herdeiros ficam desonerados da participação que lhes competiria. É
          por isso que vale a pena centralizar num só, e confirmar que ele o fez.
        </Nota>
      </Seccao>

      <Seccao titulo="O que acontece ao IMI">
        <Paragrafo>
          O IMI segue quem consta das matrizes a <strong>31 de dezembro</strong>. Enquanto a
          herança estiver indivisa, é ela — representada pelo cabeça-de-casal — que figura como
          sujeito passivo; feita a partilha e o registo, o imposto passa a ser liquidado a cada
          herdeiro pela sua parte.
        </Paragrafo>
        <Paragrafo>
          Na prática isto significa que a nota de cobrança do ano seguinte ao óbito costuma chegar
          ainda em nome da herança. Não é erro, e não se resolve ignorando: resolve-se com a
          partilha e com o averbamento na matriz.
        </Paragrafo>
        <VaiPara href="/guias/imi">Como o IMI é calculado e quando se paga</VaiPara>
      </Seccao>

      <Seccao titulo="Herança indivisa: como se declara">
        <Paragrafo>
          Os beneficiários de transmissões gratuitas estão obrigados a prestar declarações e a{" "}
          <strong>relacionar os bens e direitos</strong> — e, mesmo em caso de isenção, essa
          relação tem de abranger os bens do art. 10.º do Código do IRS e outros sujeitos a registo,
          matrícula ou inscrição.
        </Paragrafo>
        <Paragrafo>
          Quer dizer: isento de imposto não é isento de declarar. Os imóveis entram na relação de
          bens ainda que ninguém vá pagar nada por eles.
        </Paragrafo>
        <AvisoPrazo titulo="Não participar não faz o problema desaparecer">
          Se a participação não for apresentada, ou vier com omissões, e o chefe de finanças souber
          da transmissão por outra via, compete-lhe <strong>instaurar oficiosamente o processo de
          liquidação</strong>. Antes disso notifica para suprir as faltas, em prazo entre 10 e 30
          dias — e a lei prevê que, persistindo a recusa, os bens possam ser havidos por sonegados.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Vender depois: qual é o valor de aquisição">
        <Paragrafo>
          É a pergunta que só aparece anos mais tarde, e é onde está o dinheiro. Quem herda não
          pagou nada pelo imóvel — mas isso não faz o valor de aquisição ser zero. O valor de
          aquisição a título gratuito é o que tiver sido{" "}
          <strong>considerado para efeitos de imposto do selo</strong>, ou, não havendo lugar a
          liquidação, o valor patrimonial tributário à data da transmissão.
        </Paragrafo>
        <Paragrafo>
          É por isso que a relação de bens importa mesmo quando há isenção: é dela que sai o número
          que, daqui a dez anos, vai determinar a mais-valia de quem vender. Uma relação de bens
          feita à pressa com valores baixos é uma mais-valia mais alta mais tarde.
        </Paragrafo>
        <Nota titulo="A data de aquisição também é a da transmissão">
          O coeficiente de desvalorização da moeda conta a partir do ano da herança, não do ano em
          que o falecido tinha comprado a casa. Herdar reinicia o relógio.
        </Nota>
      </Seccao>

      <Seccao titulo="Quando entra o Anexo G">
        <Passos
          passos={[
            {
              titulo: "No ano da herança: em regra, não entra",
              texto: "Receber por herança não é uma alienação onerosa. Não há mais-valia a declarar no Anexo G só por se ter herdado.",
            },
            {
              titulo: "Na partilha com tornas, pode entrar",
              texto: "Quando um herdeiro fica com mais do que a sua quota e compensa os outros em dinheiro, há uma componente onerosa. É matéria que depende do caso concreto e merece confirmação por contabilista.",
            },
            {
              titulo: "Na venda do imóvel herdado: entra sempre",
              texto: "Aí sim, Anexo G — com valor de realização, valor de aquisição apurado como acima, data da transmissão por herança e os encargos admitidos.",
            },
          ]}
        />
        <VaiPara href="/guias/mais-valias-imoveis">
          A conta completa da mais-valia, com reinvestimento e encargos
        </VaiPara>
        <VaiPara href="/guias/herancas-imposto-selo">
          O imposto do selo nas heranças, em detalhe
        </VaiPara>
        <VaiPara href="/guias/imt">Se em vez de herdar comprares a parte dos outros herdeiros</VaiPara>
      </Seccao>
    </>
  );
}
