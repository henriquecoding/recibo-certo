import { Seccao, Paragrafo, Nota, Passos, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 38.º e 130.º do CIMI.
export default function CorpoVptReavaliacao() {
  return (
    <>
      <Seccao titulo="A fórmula e os seis fatores">
        <Paragrafo>
          O VPT não é uma opinião de avaliador. É o resultado de uma fórmula fixada na lei, com seis
          fatores que se multiplicam entre si:
        </Paragrafo>
        <Paragrafo>
          <strong>Vt = Vc × A × Ca × Cl × Cq × Cv</strong>
        </Paragrafo>
        <Paragrafo>
          Onde <strong>Vc</strong> é o valor base dos prédios edificados, <strong>A</strong> a área
          bruta de construção mais a área excedente à de implantação, <strong>Ca</strong> o
          coeficiente de afetação (habitação, comércio, serviços…), <strong>Cl</strong> o
          coeficiente de localização, <strong>Cq</strong> o coeficiente de qualidade e conforto e{" "}
          <strong>Cv</strong> o coeficiente de vetustez — a idade do prédio. O resultado é
          arredondado para a dezena de euros imediatamente superior.
        </Paragrafo>
        <Nota titulo="Dois fatores movem-se sozinhos com o tempo">
          O <strong>Cv</strong> desce à medida que o prédio envelhece, e o <strong>Vc</strong> e o{" "}
          <strong>Cl</strong> são revistos periodicamente. Por isso é que um imóvel avaliado há
          muitos anos pode estar com um VPT que já não corresponde à fórmula em vigor — quase sempre
          por excesso.
        </Nota>
      </Seccao>

      <Seccao titulo="Onde consultar o VPT atual">
        <Paragrafo>
          Na <strong>caderneta predial urbana</strong>, no Portal das Finanças. Além do valor, a
          caderneta mostra os elementos que entraram na fórmula — a área considerada, a afetação, o
          ano de construção. É aí que se descobre um erro de área ou uma afetação errada, que são as
          duas causas mais frequentes de um VPT alto a mais.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Quando compensa pedir a reavaliação — e quando não">
        <Paragrafo>
          Compensa quando há razão para o valor ter descido: o prédio envelheceu desde a última
          avaliação, os coeficientes aplicáveis mudaram, ou a caderneta tem um dado errado. O ganho
          é recorrente — um VPT mais baixo baixa o IMI de todos os anos seguintes, e conta para a
          soma do AIMI.
        </Paragrafo>
        <Paragrafo>
          Não compensa quando estás prestes a <strong>vender</strong>. Aí o VPT tem outro papel: um
          VPT mais baixo aumenta a mais-valia tributável se o imóvel foi adquirido por valor
          patrimonial, e pode mudar a base do IMT do comprador. E não compensa às cegas — a
          reavaliação aplica a fórmula em vigor, que tanto pode dar menos como <em>mais</em>.
        </Paragrafo>
        <Nota titulo="O pedido não tem garantia de resultado">
          Pedir reavaliação é pedir que a fórmula seja aplicada de novo, com os coeficientes de
          hoje. Se os coeficientes de localização da zona subiram mais do que a vetustez desceu, o
          VPT sobe — e o IMI com ele. Vale a pena fazer as contas antes.
        </Nota>
      </Seccao>

      <Seccao titulo="Como se pede no Portal das Finanças">
        <Passos
          passos={[
            {
              titulo: "Confirmar os elementos da caderneta",
              texto: "Área bruta, afetação, ano de construção e tipologia. Se algum estiver errado, o caminho é outro — é reclamação da matriz, e essa pode ser feita a todo o tempo.",
            },
            {
              titulo: "Submeter o pedido de avaliação",
              texto: "No Portal das Finanças, na área do património, identificando o prédio. O pedido é do sujeito passivo.",
            },
            {
              titulo: "Aguardar a avaliação e a notificação do novo valor",
              texto: "O resultado é notificado e passa a constar da matriz. É desse novo valor que sai a liquidação seguinte.",
            },
          ]}
        />
      </Seccao>

      <Seccao titulo="Prazos e efeitos: a partir de quando conta">
        <Paragrafo>
          Os efeitos são <strong>para o futuro</strong>. Uma reavaliação favorável não devolve o IMI
          já pago nos anos anteriores — só muda o que vais pagar a partir do momento em que o novo
          valor entra na matriz. A periodicidade com que o pedido pode ser repetido está na tabela
          de dados aqui em baixo.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Reclamação das matrizes">
        <Paragrafo>
          É a via diferente, e a mais poderosa, porque não tem prazo. O sujeito passivo pode{" "}
          <strong>a todo o tempo</strong> reclamar de qualquer incorreção na inscrição matricial. A
          lei enumera os fundamentos, e o primeiro deles é precisamente{" "}
          <strong>«valor patrimonial tributário considerado desatualizado»</strong>.
        </Paragrafo>
        <Paragrafo>
          Outros fundamentos úteis na prática: inclusão indevida do prédio na matriz, erro na
          descrição do prédio, erro de transcrição de elementos cadastrais, duplicação ou omissão de
          prédios, e falta de averbamento de uma isenção já concedida ou reconhecida. Se recebeste
          IMI de um prédio que já não é teu, ou pagaste apesar de teres isenção reconhecida, é aqui
          que se resolve.
        </Paragrafo>
        <VaiPara href="/guias/imi">Como o VPT se transforma na conta do IMI</VaiPara>
        <VaiPara href="/guias/aimi">O adicional que soma os VPT de todos os teus imóveis</VaiPara>
        <VaiPara href="/guias/imt">O VPT também fixa o piso do imposto na compra</VaiPara>
      </Seccao>
    </>
  );
}
