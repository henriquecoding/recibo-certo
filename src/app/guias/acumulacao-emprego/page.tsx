import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import InfoTip from "@/components/ui/InfoTip";
import { Check } from "@/components/ui/Icons";
import { IAS_VALUE, DISPENSA_RETENCAO_LIMITE, RETENCAO } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = metadataDoGuia("acumulacao-emprego");

const ias = IAS_VALUE;

export default function AcumulacaoEmpregoPage() {
  return (
    <GuiaLayout slug="acumulacao-emprego">

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          IRS — dois rendimentos, uma declaração
        </h2>
        <div className="space-y-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Anexo A</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">Trabalho dependente — Categoria A (salário)</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Anexo B</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">Recibos verdes — Categoria B</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-4">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Os dois rendimentos somam-se para determinar o escalão. Isso pode significar pagar mais IRS marginal sobre os rendimentos dos recibos verdes do que se fossem a única fonte.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Segurança Social — quando pagas e quando não pagas
        </h2>
        <div className="space-y-3">
          <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="brand">Isento dos recibos</Badge>
            </div>
            <p className="text-sm text-stone-700 dark:text-stone-300 mb-3">Se cumprires <em>todas</em> estas condições:</p>
            <ul className="space-y-1.5 text-sm text-stone-600 dark:text-stone-400">
              <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> Cliente dos recibos <strong>diferente</strong> do empregador</li>
              <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> Média mensal dos recibos {"<"} 4 × IAS ({fmt(4 * ias)})
                <InfoTip label="Base legal isenção SS">Art. 152.º Código Contributivo</InfoTip>
              </li>
              <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" /> Salário do emprego ≥ 1 × IAS ({fmt(ias)})</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="neutral">Paga SS pelos recibos</Badge>
            </div>
            <ul className="space-y-1.5 text-sm text-stone-600 dark:text-stone-400">
              <li className="flex items-start gap-2"><span className="text-stone-400 mt-0.5">→</span> Cliente dos recibos é a mesma entidade que o empregador</li>
              <li className="flex items-start gap-2"><span className="text-stone-400 mt-0.5">→</span> Média mensal dos recibos ≥ {fmt(4 * ias)}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Retenção na fonte com acumulação
        </h2>
        <div className="space-y-3 text-sm text-stone-600 dark:text-stone-400">
          <p>As regras de retenção são as normais: {pct(RETENCAO.art151.value)} para atividades do Art. 151.º, {pct(RETENCAO.outros.value)} para outros serviços com CAE.</p>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p>
              <span className="font-semibold text-stone-700 dark:text-stone-300">Dispensa de retenção:</span> podes dispensar se a estimativa anual de rendimentos dos recibos for inferior a {fmt(DISPENSA_RETENCAO_LIMITE.value)}.
              Mas atenção — a estimativa anual considera <em>ambas</em> as fontes de rendimento, o que pode afetar o escalão aplicável.
            </p>
          </div>
        </div>
      </section>

      {/* Três conceitos separados — reestruturado na sequência da auditoria
          de 26/07/2026. A versão anterior tinha uma única secção que tratava
          "entidade contratante", "dependência económica" e "falso recibo
          verde" como se fossem a mesma coisa. Não são: têm testes
          diferentes, entidades decisoras diferentes e consequências
          diferentes. Juntá-los levava o leitor a concluir sozinho que tinha
          um vínculo laboral encoberto a partir de uma percentagem. */}
      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">
          Concentrar faturação num só cliente: três coisas diferentes
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Quando a maior parte do que faturas vem de uma só entidade, entram em jogo três regimes
          distintos. Confundi-los é o erro mais comum — e o mais caro.
        </p>

        <div className="space-y-3">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">1</Badge>
              <p className="font-semibold text-stone-800 dark:text-stone-100">Entidade contratante</p>
              <span className="text-xs text-stone-400">Segurança Social</span>
            </div>
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              É uma obrigação <strong>do teu cliente</strong>, não tua. A entidade é qualificada
              como contratante quando beneficia de pelo menos <strong>50 %</strong> do valor total
              da tua atividade como trabalhador independente. A taxa que essa entidade passa a
              pagar à Segurança Social varia consoante a concentração se situe entre 50 % e 80 % ou
              acima de 80 %.
              <InfoTip label="Base legal">
                Código dos Regimes Contributivos — regime das entidades contratantes de
                trabalhadores independentes.
              </InfoTip>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Não muda o teu enquadramento nem transforma o vínculo em contrato de trabalho: é uma
              contribuição adicional a cargo de quem te contrata.
            </p>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">2</Badge>
              <p className="font-semibold text-stone-800 dark:text-stone-100">Dependência económica</p>
              <span className="text-xs text-stone-400">Proteção social</span>
            </div>
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              É uma <strong>qualificação tua</strong>, e é ela que abre a porta ao subsídio por
              cessação de atividade. Depende da concentração da tua faturação numa entidade
              contratante, apurada por ano civil — e o direito à prestação exige ainda outras
              condições cumulativas, incluindo o prazo de garantia.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Ou seja: ser economicamente dependente é, para efeitos de proteção social, sobretudo
              uma vantagem — não um problema.
            </p>
          </div>

          <div className="rounded-3xl border border-clay-text/30 bg-clay-bg p-5 dark:bg-red-950/30">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="danger">3</Badge>
              <p className="font-semibold text-stone-800 dark:text-stone-100">
                Contrato de trabalho encoberto
              </p>
              <span className="text-xs text-stone-500">Direito do trabalho</span>
            </div>
            <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              Aqui a pergunta é outra: existe <strong>subordinação jurídica</strong>? Avalia-se por
              indícios previstos no Código do Trabalho — horário imposto, local determinado pela
              entidade, instrumentos de trabalho pertencentes a ela, integração na estrutura
              organizativa, retribuição periódica fixa. Quem decide é a Autoridade para as Condições
              do Trabalho ou um tribunal, caso a caso.
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-stone-800 dark:text-stone-100">
              Uma percentagem de faturação, por si só, não prova nada.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              É possível faturar 100 % a um cliente sem qualquer subordinação, e é possível haver
              subordinação com vários clientes. Se suspeitas que o teu caso é este, fala com um
              advogado ou com a ACT — não tires a conclusão a partir de um número.
            </p>
          </div>
        </div>
      </section>

    </GuiaLayout>
  );
}
