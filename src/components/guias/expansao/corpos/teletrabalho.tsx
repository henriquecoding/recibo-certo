import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { TELETRABALHO } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026 contra os arts. 166.º, 167.º, 168.º,
// 169.º e 170.º do Código do Trabalho (articulado consolidado, PGD
// Lisboa). O limite fiscal da compensação NÃO é publicado: o n.º 6 do
// art. 168.º remete-o para portaria, que não foi possível confirmar.
export default function CorpoTeletrabalho() {
  return (
    <>
      <Seccao titulo="Sem acordo escrito, não há teletrabalho">
        <Paragrafo>
          {TELETRABALHO.exigeAcordoEscrito.value}.
        </Paragrafo>
        <Paragrafo>
          É a base de tudo o resto, e é onde a maior parte das situações reais falha: trabalha-se de
          casa há anos, por hábito, sem uma linha escrita. Sem acordo, não há regime de teletrabalho —
          e sem regime não há as obrigações que ele impõe ao empregador.
        </Paragrafo>
        <Nota titulo="A tua casa passa a ser o local de trabalho">
          {TELETRABALHO.localDeTrabalho.value}. Não é uma formalidade: muda a lei aplicável aos
          acidentes de trabalho e à segurança e saúde.
        </Nota>
      </Seccao>

      <Seccao titulo="O acordo tem conteúdo obrigatório">
        <Paragrafo>
          A lei enumera o que ele deve conter: identificação e domicílio das partes; o local onde o
          trabalho é realizado; o período normal de trabalho diário e semanal; o horário; a atividade
          contratada e a categoria; e a retribuição, incluindo prestações complementares e acessórias.
        </Paragrafo>
        <Paragrafo>
          E define ainda o <strong>regime de permanência ou de alternância</strong> entre trabalho à
          distância e presencial — que é o que resolve, por antecipação, quase todos os conflitos
          práticos.
        </Paragrafo>
        <AvisoPrazo titulo="Um acordo sem horário é um acordo incompleto">
          O horário acordado é o que delimita quando podes ser contactado, quando pode haver visita ao
          teu domicílio e onde começa o trabalho suplementar. Sem ele escrito, essas fronteiras
          desaparecem.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="As despesas são do empregador — e a lei diz quais">
        <Paragrafo>
          {TELETRABALHO.despesasIntegralmenteCompensadas.value}.
        </Paragrafo>
        <Paragrafo>
          Repara no que a lei nomeia expressamente: <strong>energia</strong>,{" "}
          <strong>rede</strong> em condições de velocidade compatível com as necessidades de serviço, e{" "}
          <strong>manutenção</strong> dos equipamentos. Não é só o computador.
        </Paragrafo>
        <Paragrafo>
          O contrato ou a convenção coletiva devem <strong>fixar o valor</strong> da compensação na
          celebração do acordo. E, não havendo valor fixo,{" "}
          {TELETRABALHO.criterioDasDespesas.value}.
        </Paragrafo>
        <AvisoPrazo titulo="Paga-se imediatamente, não no fim do ano">
          {TELETRABALHO.pagamentoImediato.value}.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O tratamento fiscal da compensação">
        <Paragrafo>
          É a parte que interessa aos dois lados: a compensação{" "}
          {TELETRABALHO.tratamentoFiscal.value}.
        </Paragrafo>
        <Paragrafo>
          Este guia <strong>não publica esse limite</strong>. O Código remete-o para portaria dos
          membros do Governo responsáveis pelas áreas fiscal e da segurança social, e não foi possível
          confirmar em fonte oficial legível o valor em vigor. Confirma-o antes de fixar o montante no
          acordo — acima dele, a compensação passa a ser rendimento tributável.
        </Paragrafo>
        <Nota titulo="Abaixo do limite, não entra no recibo como rendimento">
          É a razão pela qual vale a pena fixar o valor por escrito no acordo, em vez de o diluir num
          aumento de salário: um é compensação, o outro é retribuição, e pagam impostos diferentes.
        </Nota>
        <VaiPara href="/guias/ajudas-de-custo-km">
          Os outros abonos que não são salário até certo limite
        </VaiPara>
      </Seccao>

      <Seccao titulo="Privacidade: o que o empregador não pode fazer">
        <Paragrafo>
          {TELETRABALHO.controloProibido.value}.
        </Paragrafo>
        <Paragrafo>
          Software que tira capturas de ecrã, que regista teclas, que fotografa pela câmara ou que
          monitoriza o histórico de navegação cai diretamente nesta proibição.
        </Paragrafo>
        <AvisoPrazo titulo="E a visita ao domicílio tem duas condições">
          Requer <strong>aviso prévio de {TELETRABALHO.avisoVisitaHoras.value} horas</strong> e{" "}
          <strong>concordância do trabalhador</strong>. Só pode ter por objeto o controlo da atividade
          e dos instrumentos de trabalho, só na tua presença, e só durante o horário acordado.
        </AvisoPrazo>
        <Nota titulo="O direito à desconexão tem norma própria">
          O empregador deve abster-se de contactar o trabalhador no período de descanso, ressalvadas
          situações de força maior. É o mesmo princípio que o Código enuncia quando manda respeitar o
          horário e os tempos de descanso e de repouso da família.
        </Nota>
      </Seccao>

      <Seccao titulo="Os mesmos direitos, e a reversibilidade">
        <Paragrafo>
          Quem está em teletrabalho tem os <strong>mesmos direitos e deveres</strong> dos demais
          trabalhadores, sem redução de retribuição, e em matéria de formação, promoção, limites do
          tempo de trabalho, descanso, segurança e saúde e reparação de danos por acidente.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "Pôr o acordo por escrito, mesmo que já se trabalhe assim há anos",
              texto: "Sem ele, o regime não se aplica — e as obrigações de compensação de despesas não nascem.",
            },
            {
              titulo: "Fixar o valor da compensação no próprio acordo",
              texto: "É o que a lei manda, e é o que evita a discussão mensal sobre a fatura da luz.",
            },
            {
              titulo: "Guardar as faturas do mês anterior ao início",
              texto: "É o termo de comparação que a lei usa quando não há valor fixo: despesas homólogas do último mês de trabalho presencial.",
            },
            {
              titulo: "Escrever o regime de alternância, dia a dia",
              texto: "Quantos dias presenciais, quais, e com que antecedência se alteram. É a cláusula que mais conflitos evita.",
            },
            {
              titulo: "Confirmar o limite fiscal da compensação no ano em curso",
              texto: "Acima dele, o que era compensação passa a ser rendimento — com IRS e contribuições.",
            },
            {
              titulo: "Recusar visitas sem os avisos e sem acordo",
              texto: `Aviso prévio de ${TELETRABALHO.avisoVisitaHoras.value} horas e concordância. A violação é contraordenação grave; o controlo por captura de imagem ou de histórico é muito grave.`,
            },
          ]}
        />
        <VaiPara href="/guias/assedio-trabalho">
          Quando a monitorização passa a ser outra coisa
        </VaiPara>
        <VaiPara href="/guias/recibo-vencimento">
          Onde a compensação aparece — e onde não deve aparecer
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quem pode exigir teletrabalho">
        <Paragrafo>
          Em regra, o teletrabalho depende de acordo — o que significa que nenhuma das partes o pode
          impor. Mas a lei abre exceções em que o trabalhador tem <strong>direito</strong> a ele, desde
          que as funções o permitam.
        </Paragrafo>
        <Paragrafo>
          É o caso de quem tem <strong>filho com idade até determinada</strong> nos termos da lei, de
          quem é <strong>cuidador informal não principal</strong>, e de vítima de violência doméstica
          nas condições legalmente previstas.
        </Paragrafo>
        <AvisoPrazo titulo="A recusa tem de ser fundamentada por escrito">
          Quando o direito existe, o empregador só o pode recusar com fundamento escrito na
          incompatibilidade das funções. Uma recusa sem fundamento é atacável.
        </AvisoPrazo>
        <Nota titulo="E o acordo pode ser temporário">
          Nada obriga a que seja definitivo. Fixar duração e condições de cessação no próprio acordo é
          o que dá previsibilidade aos dois lados.
        </Nota>
      </Seccao>
    </>
  );
}
