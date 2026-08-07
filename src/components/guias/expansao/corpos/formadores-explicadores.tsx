import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { ISENCOES_CIVA_PROFISSOES, IVA_ISENCAO_LIMITE } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado na coleção consolidada:
// art. 9.º, n.os 9), 10) e 11) do CIVA, art. 53.º do CIVA, e arts. 3.º,
// 31.º, 101.º e 151.º do CIRS.
//
// O pacote diz que «explicações particulares e formação não certificada
// seguem a regra geral, com a isenção do art. 53.º enquanto o volume o
// permitir». Não é assim para as explicações: o n.º 11) do art. 9.º, na
// redação da Lei n.º 82/2023, isenta-as pela natureza do serviço. Ver
// `correcoes.ts`.
export default function CorpoFormadoresExplicadores() {
  return (
    <>
      <Seccao titulo="Formação certificada vs. não certificada">
        <Paragrafo>
          Ensinar não é uma coisa só, e o Código do IVA trata-as separadamente. Há três portas
          diferentes no art. 9.º, e a maior parte das dúvidas resolve-se ao perceber por qual delas
          se entra.
        </Paragrafo>
        <Paragrafo>
          · O <strong>ensino</strong> prestado por estabelecimentos integrados no Sistema Nacional de
          Educação, ou reconhecidos como tendo fins análogos.
          <br />· A <strong>formação profissional</strong>, prestada por organismos de direito
          público ou por entidades reconhecidas pelos ministérios competentes.
          <br />· As <strong>lições sobre matérias do ensino escolar ou superior</strong> — as
          explicações.
        </Paragrafo>
        <AvisoPrazo titulo="A terceira porta é a que quase ninguém conhece">
          Muita informação em circulação diz que as explicações particulares seguem a regra geral e
          só ficam isentas enquanto o volume de negócios o permitir. Não é o caso: estão isentas pela
          natureza da operação, e a isenção não depende de reconhecimento nem de volume nenhum.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A isenção do art. 9.º e os seus requisitos">
        <Paragrafo>
          Para a <strong>formação profissional</strong>, a lei isenta as prestações efetuadas por{" "}
          {ISENCOES_CIVA_PROFISSOES.formacaoProfissional.value}. O requisito é de{" "}
          <em>quem presta</em>, não do conteúdo: a mesma formação, dada por uma entidade reconhecida
          ou por quem não o é, tem tratamentos diferentes.
        </Paragrafo>
        <Paragrafo>
          Para as <strong>explicações</strong>, a lei isenta as prestações que consistam em{" "}
          {ISENCOES_CIVA_PROFISSOES.licoes.value}. Aqui o requisito é do{" "}
          <em>conteúdo</em>: a matéria tem de ser do ensino escolar ou superior. É isso que separa
          uma explicação de matemática do 9.º ano de um workshop de fotografia.
        </Paragrafo>
        <Nota titulo="A isenção do art. 9.º é incompleta">
          Nos dois casos, isentar a operação retira o direito à dedução do IVA suportado nas compras.
          Material, equipamento e software vêm com IVA que não recuperas.
        </Nota>
      </Seccao>

      <Seccao titulo="Quando se aplica antes a isenção do art. 53.º">
        <Paragrafo>
          Quando a atividade <strong>não cabe</strong> em nenhuma das portas do art. 9.º — formação
          sem reconhecimento, workshops, cursos de temas fora do currículo escolar ou superior,
          coaching, formação de nicho a empresas.
        </Paragrafo>
        <Paragrafo>
          Aí vale a isenção geral do art. 53.º, enquanto o volume de negócios anual ficar abaixo de{" "}
          <strong>{fmt(IVA_ISENCAO_LIMITE.value)}</strong>. Ultrapassado esse limiar, passa-se ao
          regime normal e começa a liquidar-se IVA.
        </Paragrafo>
        <AvisoPrazo titulo="A diferença aparece exatamente quando o negócio cresce">
          Um explicador que ultrapasse o limiar continua isento — a isenção dele não vem do art. 53.º.
          Um formador não reconhecido, no mesmo patamar de faturação, passa a liquidar IVA. Confundir
          as duas situações leva a liquidar imposto que a lei não pede, ou a não liquidar o que ela
          pede.
        </AvisoPrazo>
        <VaiPara href="/guias/mudar-regime-iva">Como se faz a passagem de regime</VaiPara>
      </Seccao>

      <Seccao titulo="Coeficiente e retenção">
        <Paragrafo>
          Do lado do IRS, a isenção de IVA não muda nada: o rendimento é da categoria B e segue as
          regras comuns. O enquadramento faz-se por profissão da tabela do art. 151.º ou por CAE, com
          os coeficientes e retenções da tabela de dados aqui em baixo.
        </Paragrafo>
        <Paragrafo>
          A retenção existe quando quem paga é entidade com contabilidade organizada: escolas,
          empresas, centros de formação. Explicações a particulares não têm retenção — e é por isso
          que quem vive de explicações tem o imposto todo concentrado no acerto do ano seguinte.
        </Paragrafo>
        <VaiPara href="/guias/retencao-na-fonte">Como funciona a retenção</VaiPara>
      </Seccao>

      <Seccao titulo="Faturar a escolas, empresas e particulares">
        <Paragrafo>
          A obrigação de emitir fatura existe nos três casos, com ou sem IVA liquidado, e a menção do
          motivo da isenção é obrigatória quando ela se aplica. Muda quem retém e muda o que o
          cliente faz com o documento.
        </Paragrafo>
        <Paragrafo>
          · <strong>Particulares</strong> — sem retenção. O NIF do cliente permite-lhe deduzir a
          despesa de educação no IRS, quando aplicável.
          <br />· <strong>Escolas e centros de formação</strong> — retenção, se tiverem contabilidade
          organizada. Costumam exigir a fatura antes de processar o pagamento.
          <br />· <strong>Empresas</strong> — retenção, e frequentemente com prazos de pagamento
          próprios que não coincidem com a data de emissão.
        </Paragrafo>
        <Nota titulo="Emitir a fatura não é o mesmo que ter recebido">
          Na categoria B, a obrigação declarativa nasce com a emissão. Faturar em dezembro trabalho
          que só te pagam em fevereiro põe o rendimento no ano da fatura — vale a pena saber isso
          quando se decide o calendário de emissão.
        </Nota>
        <VaiPara href="/guias/fatura-nao-paga">O que fazer com uma fatura que não é paga</VaiPara>
      </Seccao>

      <Seccao titulo="Entidade formadora certificada: o que muda">
        <Paragrafo>
          A certificação como entidade formadora abre a porta do art. 9.º à formação profissional, e
          é isso que a torna relevante do ponto de vista fiscal — além do acesso a financiamento
          público e a concursos, que é a razão pela qual a maior parte das pessoas a procura.
        </Paragrafo>
        <Paragrafo>
          Traz também obrigações: requisitos de qualidade, registo de formandos e formadores,
          avaliação e reporte. É um regime, não um selo.
        </Paragrafo>
        <AvisoPrazo titulo="Certificar tem uma contrapartida fiscal que convém pesar">
          Passar as operações a isentas retira o direito à dedução do IVA suportado. Para quem
          investe muito em equipamento, plataforma e instalações, essa perda pode ser maior do que o
          ganho — e a conta faz-se antes de pedir a certificação, não depois.
        </AvisoPrazo>
        <VaiPara href="/guias/renunciar-isencao-iva">
          Quando faz sentido estar fora da isenção
        </VaiPara>
      </Seccao>
    </>
  );
}
