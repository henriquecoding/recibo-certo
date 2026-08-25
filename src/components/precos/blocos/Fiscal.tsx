"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O bloco fiscal — o que mais muda o preço em Portugal.
//  ---------------------------------------------------------------------
//  Saiu do `CamposPreco.tsx`, que juntava as onze famílias de campos num
//  ficheiro de 898 linhas. Não é arrumação: a interface passa a montar-se
//  a partir de `pricing/blocos.ts`, e um bloco que vive num ficheiro seu
//  pode ser lido, revisto e corrigido sem se atravessar os outros dez.
// ═══════════════════════════════════════════════════════════════════════

import { CampoEuros, Seletor } from "../atomos";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import { ATIVIDADES } from "@/lib/fiscal-data";
import type { PropsBloco } from "./tipos";

export default function Fiscal({ contexto, atualizar }: PropsBloco) {
  // O catálogo guarda-se pelo `label` (é a chave que o resto do projeto já
  // usa); aqui resolve-se de volta para o objeto que o combobox espera.
  const atividadeEscolhida = ATIVIDADES.find((a) => a.label === contexto.vendedor.atividadeLabel) ?? null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Seletor
        id="tipo-vendedor"
        rotulo="Vendes como"
        descricao="Decide se a Segurança Social e o IRS entram no preço, e como."
        opcoes={[
          { valor: "nao_sei", rotulo: "Ainda não sei" },
          { valor: "ti", rotulo: "Trabalhador independente" },
          { valor: "empresa", rotulo: "Empresa (Lda./Unipessoal)" },
          { valor: "particular", rotulo: "Particular / ocasional" },
        ]}
        valor={contexto.vendedor.tipo}
        aoMudar={(v) => atualizar("tipo-vendedor", (c) => void (c.vendedor.tipo = v))}
      />
      <Seletor
        id="regiao"
        rotulo="Onde tens atividade"
        ajuda="O IVA segue a OPERAÇÃO: é aqui que se decide a taxa que acrescentas ao preço."
        descricao="IVA de 23% no Continente, 22% na Madeira e 16% nos Açores."
        opcoes={[
          { valor: "continente", rotulo: "Continente" },
          { valor: "madeira", rotulo: "Madeira" },
          { valor: "acores", rotulo: "Açores" },
        ]}
        valor={contexto.vendedor.regiao}
        aoMudar={(v) => atualizar("regiao", (c) => void (c.vendedor.regiao = v))}
      />

      {/* ── Residência fiscal ────────────────────────────────────────
          O IVA segue a operação; o IRS segue a PESSOA. Coincidem para
          quase toda a gente, e é por isso que o valor por omissão é «a
          mesma» — mas o aviso `irs-regiao-autonoma` convidava a pessoa a
          dizer-nos quando não coincidem, e não havia onde o dizer. Um
          aviso que pede uma resposta que a interface não aceita é pior do
          que não perguntar nada. */}
      {contexto.vendedor.tipo === "ti" ? (
        <Seletor
          id="residencia-fiscal"
          rotulo="Onde resides fiscalmente"
          ajuda="Quem decide o teu IRS é onde RESIDES, não onde está o cliente nem onde exerces. Quem reside nas regiões autónomas paga menos 30% em todos os escalões (Lei Orgânica 2/2013)."
          descricao="Na dúvida, deixa em «a mesma» — é o caso de quase toda a gente."
          opcoes={[
            { valor: "mesma", rotulo: "A mesma da atividade" },
            { valor: "continente", rotulo: "Continente" },
            { valor: "madeira", rotulo: "Madeira" },
            { valor: "acores", rotulo: "Açores" },
          ]}
          valor={contexto.vendedor.residenciaFiscal ?? "mesma"}
          aoMudar={(v) =>
            atualizar("residencia-fiscal", (c) => {
              c.vendedor.residenciaFiscal = v === "mesma" ? undefined : v;
            })
          }
        />
      ) : null}

      {contexto.vendedor.tipo === "ti" ? (
        <>
          {/* O MESMO seletor do simulador de recibos verdes.
              Era um `select` com quatro tipos canónicos, e o catálogo tem
              dezenas de atividades — várias com coeficiente, retenção ou
              base de Segurança Social próprios. A mesma pessoa escolhia a
              atividade de uma maneira ali e de outra aqui, e obtinha
              números diferentes para o mesmo caso. */}
          <div className="sm:col-span-2">
            <label
              htmlFor="atividade-preco"
              className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              A tua atividade
            </label>
            <ActivityCombobox
              value={atividadeEscolhida}
              onChange={(a) =>
                atualizar("atividade-preco", (c) => {
                  c.vendedor.atividadeLabel = a.label;
                  c.vendedor.atividade = a.tipo;
                })
              }
            />
            <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Decide o coeficiente do regime simplificado, a retenção na fonte e a base da Segurança Social — 70% nos
              serviços, 20% na venda de bens. É a mesma lista do simulador de recibos verdes.
            </p>
          </div>

          {/* ── O ano de atividade ────────────────────────────────────
              O motor lê-o desde sempre (`fiscal-ti.ts` passa-o ao IRS,
              `motor.ts` usa-o para o IVA do primeiro ano) e a interface
              nunca o perguntou: `contextoBase()` fixava-o em 3. Quem está
              no primeiro ano tinha o coeficiente do Art. 31.º calculado
              como se não estivesse — e a redução do primeiro ano é
              metade. Era o campo em falta que mais dinheiro valia. */}
          <Seletor
            id="ano-atividade"
            rotulo="Em que ano de atividade estás"
            ajuda="Art. 31.º, n.º 10 do CIRS: no primeiro ano o coeficiente é reduzido a 50%, no segundo a 75%. A redução não se aplica a quem já teve atividade nos cinco anos anteriores."
            descricao="Muda o coeficiente do regime simplificado — e com ele o IRS que entra no preço."
            opcoes={[
              { valor: "1", rotulo: "1.º ano — coeficiente a 50%" },
              { valor: "2", rotulo: "2.º ano — coeficiente a 75%" },
              { valor: "3", rotulo: "3.º ano ou seguinte" },
            ]}
            valor={String(contexto.vendedor.anoAtividade ?? 3)}
            aoMudar={(v) => atualizar("ano-atividade", (c) => void (c.vendedor.anoAtividade = Number(v)))}
          />
          <CampoEuros
            id="faturacao-anual"
            rotulo="Faturação anual que prevês"
            ajuda="Também é daqui que sai o teu regime de IVA: acima do limiar do Art. 53.º passas a liquidar."
            descricao="Sem isto o IRS fica de fora: o mesmo euro custa 13% a quem fatura 12 000 € e 43,5% a quem fatura 60 000 €."
            valor={contexto.vendedor.faturacaoAnualPrevista ?? 0}
            aoMudar={(v) => atualizar("faturacao-anual", (c) => void (c.vendedor.faturacaoAnualPrevista = v))}
            max={500_000}
          />
          <Seletor
            id="regime-contabilidade"
            rotulo="Como determinas o rendimento"
            ajuda="Art. 28.º do CIRS."
            descricao="No simplificado o coeficiente do Art. 31.º já presume as despesas, e por isso os teus custos não reduzem o IRS. Na contabilidade organizada reduzem."
            opcoes={[
              { valor: "simplificado", rotulo: "Regime simplificado" },
              { valor: "organizada", rotulo: "Contabilidade organizada" },
            ]}
            valor={contexto.vendedor.regimeContabilidade ?? "simplificado"}
            aoMudar={(v) => atualizar("regime-contabilidade", (c) => void (c.vendedor.regimeContabilidade = v))}
          />
          <CampoEuros
            id="salario-bruto-anual"
            rotulo="Salário anual bruto, se acumulas"
            descricao="O IRS soma os dois: cada euro que faturas entra por cima do salário e leva uma taxa mais alta. Deixa a zero se não acumulas."
            valor={contexto.vendedor.salarioBrutoAnual ?? 0}
            aoMudar={(v) => atualizar("salario-bruto-anual", (c) => void (c.vendedor.salarioBrutoAnual = v))}
            max={500_000}
          />
          <Seletor
            id="irs-jovem"
            rotulo="IRS Jovem"
            ajuda="Art. 12.º-B do CIRS."
            descricao="A isenção reduz a base sujeita a retenção — muda o que recebes em cada fatura, não o que ganhas no fim."
            opcoes={[
              { valor: "0", rotulo: "Não se aplica" },
              ...Array.from({ length: 10 }, (_, i) => ({
                valor: String(i + 1),
                rotulo: `${i + 1}.º ano de rendimentos`,
              })),
            ]}
            valor={String(contexto.vendedor.irsJovemAno ?? 0)}
            aoMudar={(v) =>
              atualizar("irs-jovem", (c) => void (c.vendedor.irsJovemAno = Number(v) > 0 ? Number(v) : undefined))
            }
          />
          <label className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-400 sm:col-span-2">
            <input
              type="checkbox"
              checked={!!contexto.vendedor.dispensaRetencao}
              onChange={(e) => atualizar("dispensa-retencao", (c) => void (c.vendedor.dispensaRetencao = e.target.checked))}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
            />
            <span>
              Dispensei a retenção na fonte
              <span className="mt-0.5 block text-xs text-stone-600 dark:text-stone-400">
                Podes fazê-lo se previres faturar menos de 15 000 € no ano (Art. 101.º-B do CIRS). Recebes o valor
                inteiro de cada fatura e acertas tudo no IRS — muda quando pagas, não quanto pagas.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-400 sm:col-span-2">
            <input
              type="checkbox"
              checked={!!contexto.vendedor.isencaoSSPrimeiroAno}
              onChange={(e) =>
                atualizar("isencao-ss-primeiro-ano", (c) => void (c.vendedor.isencaoSSPrimeiroAno = e.target.checked))
              }
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
            />
            <span>
              Estou nos primeiros 12 meses de atividade (isento de Segurança Social)
              <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                Vale a pena ver o preço com e sem: quando a isenção acabar, ~15% de cada euro de serviços passa a sair
                para a Segurança Social.
              </span>
            </span>
          </label>
        </>
      ) : null}

      <Seletor
        id="cliente"
        rotulo="A quem vendes"
        ajuda="Uma empresa noutro país da UE muda o IVA (autoliquidação)."
        descricao="Uma empresa portuguesa retém IRS na fonte — o que afeta a tua tesouraria, não a tua margem."
        opcoes={[
          { valor: "consumidor", rotulo: "Consumidor final" },
          { valor: "empresa_pt", rotulo: "Empresa portuguesa" },
          { valor: "empresa_ue", rotulo: "Empresa noutro país da UE" },
          { valor: "fora_ue", rotulo: "Cliente fora da UE" },
        ]}
        valor={contexto.canal.cliente}
        aoMudar={(v) => atualizar("cliente", (c) => void (c.canal.cliente = v))}
      />

      {/* ── Inversão do sujeito passivo (Art. 2.º, n.º 1, al. j) CIVA) ──
          Pergunta-se em vez de se adivinhar: as duas condições do
          Ofício-Circulado 30 101 são cumulativas e a segunda depende do
          enquadramento do CLIENTE, que não se infere de uma atividade
          escolhida num combobox. Só aparece a quem vende a uma empresa
          portuguesa, que é a única situação em que pode aplicar-se. */}
      {contexto.canal.cliente === "empresa_pt" ? (
        <label className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-400 sm:col-span-2">
          <input
            type="checkbox"
            checked={!!contexto.canal.autoliquidacaoConstrucao}
            onChange={(e) =>
              atualizar(
                "autoliquidacao-construcao",
                (c) => void (c.canal.autoliquidacaoConstrucao = e.target.checked),
              )
            }
            className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
          />
          <span>
            São serviços de construção civil (empreitada ou subempreitada)
            <span className="mt-0.5 block text-xs text-stone-600 dark:text-stone-400">
              Obra, remodelação, reparação, manutenção, conservação ou demolição de imóveis. Nesse caso inverte-se o
              sujeito passivo: emites a fatura SEM IVA com a menção «IVA — autoliquidação» e é o teu cliente que o
              entrega. Não é isenção — continuas a deduzir o IVA das tuas compras. Só se aplica se ele for sujeito
              passivo em Portugal com direito à dedução.
            </span>
          </span>
        </label>
      ) : null}
      <Seletor
        id="escalao-iva"
        rotulo="Taxa de IVA da venda"
        descricao="A maioria dos bens e serviços leva a taxa normal. A reduzida é para bens essenciais; a intermédia, sobretudo para restauração."
        opcoes={[
          { valor: "normal", rotulo: "Normal" },
          { valor: "intermedia", rotulo: "Intermédia" },
          { valor: "reduzida", rotulo: "Reduzida" },
        ]}
        valor={contexto.produto.escalaoVenda}
        aoMudar={(v) => atualizar("escalao-iva", (c) => void (c.produto.escalaoVenda = v))}
      />
    </div>
  );
}
