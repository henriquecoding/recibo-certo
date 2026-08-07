import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { PROGRAMA_REGRESSAR } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 07/08/2026:
// art. 12.º-A do CIRS na redação da Lei n.º 82/2023, e art. 68.º-A, para onde
// o n.º 1 remete o teto.
//
// O pacote marcou dois dados com «confirmar» — o número de anos sem
// residência e a janela de elegibilidade — e classificou o guia como ALTA
// MANUTENÇÃO. As duas ficaram confirmadas, e o pacote tinha razão no aviso:
// a janela é fixada por diploma e é a primeira coisa a reverificar. Pelo
// caminho apareceu um dado que o pacote não trazia de todo — o teto anual da
// exclusão, que já vivia no motor por causa do simulador.
export default function CorpoProgramaRegressar() {
  return (
    <>
      <Seccao titulo="Quem é elegível">
        <Paragrafo>
          O regime chama-se, na lei, <em>regime fiscal aplicável a ex-residentes</em>, e o nome diz
          quase tudo. As condições do n.º 1 são <strong>cumulativas</strong>: falha uma e o benefício
          não existe.
        </Paragrafo>
        <Paragrafo>
          · Tornar-te fiscalmente residente <strong>dentro da janela</strong> que a lei fixa.
          <br />· <strong>Não</strong> teres sido considerado residente em Portugal em qualquer dos
          anos anteriores exigidos.
          <br />· Teres sido residente cá <strong>em algum período antes disso</strong>.
          <br />· Teres a <strong>situação tributária regularizada</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="Não é para quem chega — é para quem volta">
          A terceira condição é a que elimina mais gente e a que menos se lê. Quem nunca foi
          residente fiscal em Portugal <strong>não é elegível</strong>, por muitos anos que tenha
          vivido fora e por muita ligação que tenha ao país. É o regime dos ex-residentes, não o dos
          recém-chegados.
        </AvisoPrazo>
        <VaiPara href="/guias/primeiro-ano-fiscal-portugal">
          Se é a tua primeira vez cá, o caminho é outro
        </VaiPara>
      </Seccao>

      <Seccao titulo="O requisito de não residência prévia">
        <Paragrafo>
          São <strong>{PROGRAMA_REGRESSAR.anosSemResidencia.value} anos</strong> sem teres sido
          considerado residente em território português. Não é «ter vivido fora»: é não teres
          preenchido, em nenhum desses anos, os critérios de residência do art. 16.º.
        </Paragrafo>
        <Paragrafo>
          A distinção importa porque a residência fiscal não depende de onde te sentes em casa. Quem
          saiu do país mas manteve cá habitação em condições de residência habitual, ou nunca
          comunicou a alteração de domicílio, pode ter continuado residente sem o saber — e cada um
          desses anos parte a contagem.
        </Paragrafo>
        <Nota titulo="É por isto que sair bem importa cinco anos depois">
          O momento de garantir que a saída ficou registada é o da saída. Reconstruir a prova de não
          residência cinco anos depois, com o cadastro a dizer o contrário, é muito mais difícil do
          que ter comunicado a mudança no prazo.
        </Nota>
        <VaiPara href="/guias/residencia-fiscal">
          Os critérios de residência, que são os que contam nesta contagem
        </VaiPara>
        <VaiPara href="/guias/sair-de-portugal">
          Como se cessa a residência de maneira a que fique provada
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que é excluído e o que não é">
        <Paragrafo>
          São excluídos de tributação <strong>metade</strong> dos rendimentos do trabalho dependente
          e dos rendimentos empresariais e profissionais — as{" "}
          <strong>categorias A e B</strong>, e não só a B. Um ex-residente com salário tem direito à
          mesma exclusão de quem passa recibos verdes.
        </Paragrafo>
        <Paragrafo>
          Fica de fora tudo o resto: rendas, capitais, mais-valias, pensões. O regime é sobre o
          rendimento do trabalho, em qualquer das duas formas em que ele aparece.
        </Paragrafo>
        <AvisoPrazo titulo="Há um teto anual, e a lei põe-no num sítio inesperado">
          A exclusão vale «até ao montante do limite superior do primeiro escalão previsto no n.º 1
          do artigo 68.º-A» — o artigo da taxa adicional de solidariedade. O valor está na tabela de
          dados aqui em baixo, e o teto morde no <strong>montante excluído</strong>, não no
          rendimento: é o quanto se pode deixar de fora, não o quanto se pode ganhar.
        </AvisoPrazo>
        <Nota titulo="A exclusão não apaga o rendimento do resto da conta">
          Metade fica de fora da tributação, mas a outra metade entra e é ela que determina o teu
          escalão. O simulador do site faz esta conta com o regime ligado, e mostra a diferença.
        </Nota>
        <VaiPara href="/dashboard/simulador">
          Simular o IRS com o regime dos ex-residentes aplicado
        </VaiPara>
      </Seccao>

      <Seccao titulo="Duração do benefício">
        <Paragrafo>
          <strong>{PROGRAMA_REGRESSAR.anos.value} anos</strong>, contando o do regresso. Não são
          cinco anos completos a partir do primeiro dia: se voltares em outubro, esse ano já é o
          primeiro dos cinco.
        </Paragrafo>
        <Paragrafo>
          Voltar cedo no ano aproveita o benefício por mais meses. Voltar em dezembro gasta um dos
          cinco anos em três semanas.
        </Paragrafo>
        <AvisoPrazo titulo="A janela de entrada fecha — e o ano-limite está na tabela">
          Não é a duração que é o problema: é a <strong>data de entrada</strong>. A lei fixa o último
          ano em que é possível tornar-se residente e ainda entrar no regime, e esse ano está na
          tabela de dados aqui em baixo. Já foi prorrogado antes; enquanto não o for de novo, quem se
          tornar residente depois dele fica de fora. Confirma a redação em vigor antes de marcar o
          regresso — é a coisa que mais depressa envelhece neste guia.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Compatibilidade com outros regimes">
        <Paragrafo>
          A lei é expressa numa incompatibilidade: <strong>não podem beneficiar deste regime</strong>{" "}
          os sujeitos passivos que tenham solicitado a inscrição como residente não habitual. Não é
          uma escolha que se faça duas vezes — pedir um fecha o outro.
        </Paragrafo>
        <Paragrafo>
          Com os benefícios comuns do IRS não há conflito: as deduções à coleta, o quociente
          familiar e as restantes regras aplicam-se normalmente sobre a parte do rendimento que é
          tributada.
        </Paragrafo>
        <Nota titulo="Antes de escolher, compara com a conta feita">
          Regimes que parecem melhores no papel podem não o ser no teu caso concreto — depende da
          composição do rendimento, do escalão e de quantos anos tencionas ficar. A comparação
          faz-se com números, não com percentagens soltas.
        </Nota>
      </Seccao>

      <Seccao titulo="Como se pede e onde se assinala">
        <Passos
          passos={[
            {
              titulo: "Inscrever-te como residente e comunicar o domicílio fiscal",
              texto: "É o que estabelece a data a partir da qual és residente — e é essa data que decide se entras dentro da janela.",
            },
            {
              titulo: "Confirmar que a situação tributária está regularizada",
              texto: "É condição do regime, e verifica-se no Portal das Finanças. Uma pendência antiga de quando cá vivias resolve-se antes, não depois.",
            },
            {
              titulo: "Reunir a prova da não residência nos anos exigidos",
              texto: "Certificados de residência fiscal do país onde viveste, para cada um desses anos. Emitem-se lá, não cá, e demoram.",
            },
            {
              titulo: "Assinalar o regime na declaração de rendimentos",
              texto: "O benefício exerce-se na declaração do ano — não é um pedido prévio autónomo. Confirma o campo no formulário do ano em causa, porque a numeração muda.",
            },
            {
              titulo: "Repetir em cada um dos anos do benefício",
              texto: "Assinalar num ano não assinala nos seguintes. Um ano esquecido é um ano pago por inteiro.",
            },
          ]}
        />
        <Nota titulo="Guarda a prova enquanto o benefício durar">
          Os certificados de residência dos anos anteriores são o que sustenta a elegibilidade — e
          são pedidos numa eventual verificação, que pode acontecer anos depois de teres voltado.
        </Nota>
        <VaiPara href="/guias/deducoes-coleta">
          As deduções que continuam a aplicar-se sobre a parte tributada
        </VaiPara>
      </Seccao>
    </>
  );
}
