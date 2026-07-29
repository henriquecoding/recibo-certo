import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("falsos-recibos-verdes");

// Os indícios do Art. 12.º do Código do Trabalho. Deliberadamente sem
// contador nem "score": a presunção é ilidível e a qualificação depende do
// caso concreto. Transformar isto num teste com resultado seria dar como
// automática uma conclusão que os tribunais fazem caso a caso — é a falha
// 3.7 da auditoria, e não se repete aqui.
const INDICIOS = [
  "A atividade é realizada em local pertencente ao beneficiário, ou por ele determinado.",
  "Os equipamentos e instrumentos de trabalho pertencem ao beneficiário.",
  "Quem presta a atividade observa horas de início e de termo determinadas pelo beneficiário.",
  "É paga, com certa periodicidade, uma quantia certa a quem presta a atividade.",
  "Quem presta a atividade desempenha funções de direção ou chefia na estrutura do beneficiário.",
];

export default function FalsosRecibosVerdesPage() {
  return (
    <GuiaLayout slug="falsos-recibos-verdes">
      <Seccao titulo="O papel que assinaste não decide sozinho">
        <Paragrafo>
          Um contrato pode chamar-se prestação de serviços e a relação ser, na substância, trabalho
          subordinado. O Código do Trabalho prevê uma <strong>presunção de contrato de trabalho</strong>
          {" "}quando se verifiquem <em>algumas</em> das características que enuncia — não é preciso
          que se verifiquem todas.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Os indícios">
        <ul className="space-y-2">
          {INDICIOS.map((i) => (
            <li
              key={i}
              className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 text-sm leading-relaxed text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
            >
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
              <span className="min-w-0">{i}</span>
            </li>
          ))}
        </ul>
        <AvisoPrazo titulo="Isto não é um teste com resultado">
          Não há contagem de indícios que dê um veredito. A presunção é <strong>ilidível</strong> —
          admite prova em contrário — e a qualificação da relação depende sempre do caso concreto,
          apreciado no seu conjunto. Qualquer ferramenta que te devolva &quot;sim&quot; ou
          &quot;não&quot; a esta pergunta está a prometer o que não pode cumprir.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que muda se a presunção operar">
        <Paragrafo>
          A relação passa a ser tratada como contrato de trabalho, com as consequências laborais e
          contributivas correspondentes — retribuição, férias, subsídios, cessação e enquadramento
          na Segurança Social como trabalhador por conta de outrem.
        </Paragrafo>
        <Nota titulo="Há consequências dos dois lados">
          A requalificação não é apenas um ganho: muda o teu enquadramento fiscal e contributivo, e
          pode ter efeitos retroativos. É uma decisão a tomar informado, e com aconselhamento —
          não por impulso.
        </Nota>
      </Seccao>

      <Seccao titulo="Se estás nesta situação">
        <Paragrafo>
          Reúne o que descreve a relação real: registos de horário, instruções recebidas, local de
          trabalho, equipamento usado e o peso relativo daquele cliente na tua faturação. É esse
          conjunto — e não a designação do contrato — que sustenta qualquer discussão.
        </Paragrafo>
        <VaiPara href="/guias/acumulacao-emprego">
          Acumular emprego e recibos verdes
        </VaiPara>
        <VaiPara href="/guias/recibo-vencimento">
          Comparar com o que receberia por conta de outrem
        </VaiPara>
        <VaiPara href="/guias/seguranca-social">
          O que muda na Segurança Social
        </VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
