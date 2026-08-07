import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { DISPENSA_RETENCAO_LIMITE, REGIME_15PCT, REGIME_SIMPLIFICADO } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026: arts. 3.º, 31.º, 101.º, 101.º-B e 151.º do
// CIRS e arts. 6.º e 53.º do CIVA (coleção consolidada).
export default function CorpoFreelancerTecnologia() {
  return (
    <>
      <Seccao titulo="Art. 151.º ou CAE: o que determina o enquadramento">
        <Paragrafo>
          É a decisão mais consequente que tomas na abertura de atividade, e a maior parte das
          pessoas toma-a sem saber que a está a tomar.
        </Paragrafo>
        <Paragrafo>
          A tabela do <strong>art. 151.º</strong> do Código do IRS enumera profissões — e o
          enquadramento numa delas traz o coeficiente e a retenção próprios das profissões liberais.
          Uma atividade identificada por <strong>CAE</strong> e não constante dessa tabela segue a
          regra geral das outras prestações de serviços, com coeficiente e retenção diferentes.
        </Paragrafo>
        <Paragrafo>
          Os quatro valores estão na tabela de dados aqui em baixo. A diferença entre os dois
          coeficientes é de mais de <strong>metade</strong> da matéria coletável — não é um detalhe
          administrativo.
        </Paragrafo>
        <AvisoPrazo titulo="O que decide é a atividade real, não a conveniência">
          Não se escolhe o enquadramento pelo que dá menos imposto: escolhe-se pelo que descreve o
          que fazes. Um enquadramento que não corresponde à atividade é corrigível pela AT, com
          liquidação da diferença e juros. Confirma o teu caso com um contabilista certificado.
        </AvisoPrazo>
        <VaiPara href="/dashboard/classificar-atividade">
          Ferramenta para classificar a tua atividade
        </VaiPara>
      </Seccao>

      <Seccao titulo="O impacto do coeficiente no imposto final">
        <Paragrafo>
          O coeficiente não é uma taxa: é a fração do teu rendimento bruto que vai a imposto. A parte
          restante é a presunção legal de despesas — a lei assume que gastaste isso e não te pede
          contas.
        </Paragrafo>
        <Paragrafo>
          Com o coeficiente das profissões da tabela,{" "}
          <strong>{pctExato(REGIME_SIMPLIFICADO.coefServicos151.value)}</strong> do bruto entra na
          coleta. Com o das outras prestações de serviços, entra{" "}
          <strong>{pctExato(REGIME_SIMPLIFICADO.coefOutrosServicos.value)}</strong>. Sobre essa base
          é que depois correm os escalões progressivos.
        </Paragrafo>
        <Nota titulo="Um coeficiente mais baixo não é automaticamente melhor">
          Menos rendimento tributável significa também menos rendimento a contar para efeitos de
          crédito bancário e de prova de rendimentos — e, na Segurança Social, a base de incidência
          segue a sua própria regra, que não é o coeficiente. Vale a pena ver as duas contas juntas.
        </Nota>
        <VaiPara href="/dashboard/simulador">Simular com os teus números</VaiPara>
      </Seccao>

      <Seccao titulo="Retenção na fonte em cada caso">
        <Paragrafo>
          A retenção só existe quando o cliente é entidade com contabilidade organizada em Portugal.
          A taxa segue o enquadramento: uma para as profissões da tabela do art. 151.º, outra para as
          restantes atividades — as duas estão na tabela de dados.
        </Paragrafo>
        <Paragrafo>
          A retenção não é imposto adicional: é adiantamento por conta do imposto do ano. Quem retém
          mais recebe reembolso maior; quem retém menos paga mais no acerto. O total não muda.
        </Paragrafo>
        <AvisoPrazo titulo="A dispensa existe e vale a pena conhecer">
          Quem preveja não ultrapassar <strong>{fmt(DISPENSA_RETENCAO_LIMITE.value)}</strong> de
          rendimento anual da categoria B pode dispensar a retenção. Melhora a tesouraria durante o
          ano — mas transfere o imposto todo para o acerto final, e é preciso reservá-lo.
        </AvisoPrazo>
        <VaiPara href="/guias/retencao-na-fonte">Como funciona a retenção, e quando se dispensa</VaiPara>
      </Seccao>

      <Seccao titulo="Clientes na UE e fora da UE">
        <Paragrafo>
          Numa prestação de serviços a um <strong>sujeito passivo</strong> estabelecido noutro país,
          a regra geral do art. 6.º do Código do IVA localiza a operação no{" "}
          <strong>país do adquirente</strong>. Não liquidas IVA português; o imposto é devido lá pelo
          cliente, por autoliquidação.
        </Paragrafo>
        <Paragrafo>
          Sendo o cliente da <strong>União Europeia</strong>, há registo prévio para operações
          intracomunitárias e declaração recapitulativa a entregar — e é preciso validar o número de
          identificação fiscal do cliente antes de faturar. Fora da UE, a regra de localização é a
          mesma, sem a declaração recapitulativa.
        </Paragrafo>
        <AvisoPrazo titulo="A validação do número do cliente não é opcional">
          Um número inválido ou não registado no sistema de trocas intracomunitárias faz a operação
          deixar de poder ser tratada como intracomunitária. Valida antes de emitir, e guarda o
          comprovativo da validação.
        </AvisoPrazo>
        <VaiPara href="/guias/vies">O registo e a validação de números</VaiPara>
        <VaiPara href="/guias/declaracao-recapitulativa">A declaração recapitulativa</VaiPara>
      </Seccao>

      <Seccao titulo="A regra das despesas a justificar">
        <Paragrafo>
          É a contrapartida da presunção: nos coeficientes de serviços, se não justificares com
          despesas <strong>{pctExato(REGIME_15PCT.value)}</strong> do rendimento bruto, a parte não
          justificada é <strong>acrescida</strong> ao rendimento tributável.
        </Paragrafo>
        <Paragrafo>
          Contam as despesas afetas à atividade, com fatura e o teu NIF: equipamento, software,
          licenças, formação, comunicações, espaço de trabalho, deslocações. E contam também as
          contribuições obrigatórias para a Segurança Social, que abatem em termos próprios.
        </Paragrafo>
        <Nota titulo="É por isto que faz sentido pedir fatura com NIF em tudo">
          Não é para deduzir a despesa uma a uma — é para cumprir o limiar. Quem não junta nada paga
          imposto sobre um rendimento superior ao que teve, e a diferença é silenciosa: aparece no
          acerto, sem explicação visível.
        </Nota>
        <VaiPara href="/guias/regime-simplificado">
          O regime simplificado, com a regra das despesas explicada em números
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quando a sociedade passa a compensar">
        <Paragrafo>
          A pergunta certa não é «a partir de que faturação», é <strong>o que fazes ao dinheiro</strong>.
          A sociedade compensa quando o lucro fica lá dentro — reinvestido, ou distribuído ao longo
          do tempo — e não quando sai todo para a conta pessoal no próprio ano.
        </Paragrafo>
        <Paragrafo>
          Saindo todo, há duas camadas de imposto: sobre o lucro da sociedade e depois sobre o que
          retiras. E há custos fixos que em nome individual não existem: contabilidade certificada
          obrigatória, prestação de contas, obrigações societárias.
        </Paragrafo>
        <Nota titulo="E há um coeficiente que apanha quem fatura à própria sociedade">
          Serviços prestados a uma sociedade em que detenhas participação relevante têm coeficiente
          próprio, mais alto — a lei fecha a porta de faturar a si mesmo através de estrutura. Está
          previsto no art. 31.º, e convém saber disso antes de montar o esquema, não depois.
        </Nota>
        <VaiPara href="/guias/unipessoal-vs-eni">
          Sociedade ou nome individual: a comparação completa
        </VaiPara>
        <VaiPara href="/guias/remoto-empresa-estrangeira">
          Se o cliente principal é uma empresa estrangeira
        </VaiPara>
      </Seccao>
    </>
  );
}
