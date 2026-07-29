import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { HORARIO_SEMANAL_COMPLETO, TRABALHO_NOTURNO } from "@/lib/fiscal-data";
import { calcularTrabalhoNoturno } from "@/lib/fiscal-laboral";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("trabalho-noturno-e-turnos");

export default function TrabalhoNoturnoETurnosPage() {
  // Exemplo com números redondos, para a conta ficar conferível linha a linha.
  const exemplo = calcularTrabalhoNoturno({ retribuicaoMensal: 1_200, horasNoturnas: 20 });

  return (
    <GuiaLayout slug="trabalho-noturno-e-turnos">
      <Seccao titulo="O que conta como trabalho noturno">
        <Paragrafo>
          O período de trabalho noturno compreende, em regra, o intervalo entre as{" "}
          <strong>{TRABALHO_NOTURNO.horaInicio.value} horas</strong> e as{" "}
          <strong>{TRABALHO_NOTURNO.horaFim.value} horas</strong> do dia seguinte. O instrumento de
          regulamentação coletiva pode fixar outro intervalo, dentro dos limites legais — se o teu
          setor tem IRCT, é lá que se confirma.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="O acréscimo calcula-se, não se aceita">
        <Paragrafo>
          O trabalho noturno é pago com acréscimo de{" "}
          <strong>{pct(TRABALHO_NOTURNO.acrescimo.value)}</strong> relativamente ao pagamento de
          trabalho equivalente prestado durante o dia. A base é a retribuição horária, que se apura
          pela fórmula legal: retribuição mensal × 12, a dividir por 52 ×{" "}
          {HORARIO_SEMANAL_COMPLETO.value} horas.
        </Paragrafo>
        <TabelaPrazos
          colunas={["Passo", "Exemplo com 1 200 €/mês e 20 horas noturnas"]}
          linhas={[
            ["Retribuição horária", `(1 200 × 12) ÷ (52 × ${HORARIO_SEMANAL_COMPLETO.value}) = ${fmt(exemplo.retribuicaoHoraria)}`],
            ["Acréscimo por hora", `${fmt(exemplo.retribuicaoHoraria)} × ${pct(exemplo.acrescimo)} = ${fmt(exemplo.retribuicaoHoraria * exemplo.acrescimo)}`],
            ["Total do mês", `× 20 horas = ${fmt(exemplo.valorAcrescimo)}`],
          ]}
        />
        <Nota titulo="É isto que confere no recibo">
          A linha do trabalho noturno deve corresponder ao acréscimo, não ao valor total das horas —
          as horas já estão pagas na retribuição base. Se o número for muito diferente, vale a pena
          perguntar.
        </Nota>
        <VaiPara href="/ferramentas/recibo-vencimento">Calcular com as minhas horas</VaiPara>
      </Seccao>

      <Seccao titulo="Subsídio de turno: não tem valor legal">
        <Paragrafo>
          Ao contrário do acréscimo noturno, o subsídio de turno <strong>não tem um valor fixado na
          lei</strong>. Resulta do instrumento de regulamentação coletiva do setor ou do contrato
          individual. Aqui o guia só pode ensinar <em>onde procurar</em>: no IRCT aplicável e na
          cláusula do teu contrato.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Isenção de horário">
        <Paragrafo>
          A isenção de horário de trabalho tem modalidades distintas — e a retribuição mínima
          correspondente varia com a modalidade acordada. Não é um valor único, e depende do que
          ficou escrito no acordo de isenção.
        </Paragrafo>
        <Nota titulo="Isenção não é trabalho ilimitado">
          A isenção dispensa a sujeição ao horário, mas não afasta os limites de duração do trabalho
          nem o direito ao descanso.
        </Nota>
        <VaiPara href="/guias/trabalho-suplementar">Horas extra: os acréscimos</VaiPara>
        <VaiPara href="/guias/recibo-vencimento">Ler o recibo linha a linha</VaiPara>
        <VaiPara href="/ferramentas/auditoria-recibo">Auditar o meu recibo</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
