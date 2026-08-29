import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calculator,
  Check,
  Coin,
  ExternalLink,
  Eye,
  Lock,
  Scale,
  ShieldCheck,
  Warning,
} from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";
import FilaPilares from "@/components/navegacao/FilaPilares";
import Precos from "@/components/Precos";
import HeroFoco from "@/components/foco/HeroFoco";
import Bussola from "@/components/foco/Bussola";
import SeccaoFoco, { CartaoMetodo, FaqFoco } from "@/components/foco/SeccaoFoco";
import { FOCO_POR_ID } from "@/components/foco/focos";
import LinkFocoIntencao from "@/components/foco/LinkFocoIntencao";
import PalcoSalario, { type DadosSalario } from "./PalcoSalario";

const eur = (n: number) =>
  `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const PRINCIPIOS = [
  {
    titulo: "Ninguém confere o recibo",
    texto:
      "Chega ao email, o valor bate com o que caiu na conta, e fica arquivado. É a peça de papel mais recebida e menos lida do país.",
    Icon: Eye,
  },
  {
    titulo: "O erro comum é a tabela",
    texto:
      "Dependentes, estado civil, deficiência, IRS Jovem: cada um muda a tabela de retenção. Um campo desatualizado no sistema da empresa não dá erro nenhum — dá um número plausível.",
    Icon: Calculator,
  },
  {
    titulo: "Retido a mais não é poupança",
    texto:
      "Volta no acerto do ano seguinte, sem juros. É um empréstimo ao Estado que ninguém decidiu fazer.",
    Icon: Coin,
  },
  {
    titulo: "Retido a menos é uma fatura adiada",
    texto:
      "Não é dinheiro ganho: é imposto que vais pagar de uma vez, em julho, quando o mês já tem as suas próprias contas.",
    Icon: Warning,
  },
] as const;

const FAQS = [
  {
    pergunta: "A minha entidade patronal pode enganar-se na retenção?",
    resposta:
      "Pode, e a causa quase nunca é má-fé: é um campo desatualizado. Se declaraste um dependente, mudaste de estado civil ou entraste no IRS Jovem e o processamento não foi atualizado, a tabela aplicada passa a ser a errada — e o recibo continua a parecer normal.",
  },
  {
    pergunta: "Se descobrir uma diferença, perdi o dinheiro?",
    resposta:
      "Não. A retenção é um adiantamento: no acerto do IRS, o que foi retido a mais é devolvido e o que foi retido a menos é cobrado. O que se perde é o uso do dinheiro durante o ano — e a surpresa de o descobrir só em julho.",
  },
  {
    pergunta: "Os subsídios de férias e de Natal entram nesta conta?",
    resposta:
      "Entram, e é onde há mais confusão. Podem ser pagos por inteiro no mês próprio ou em duodécimos, e a retenção não é calculada da mesma maneira nos dois casos. A ferramenta trata os dois cenários em separado.",
  },
  {
    pergunta: "E o subsídio de refeição?",
    resposta:
      "É isento de IRS e de Segurança Social até ao limite legal, que é diferente consoante seja pago em dinheiro ou em cartão. Acima desse limite, a parte excedente é tributada como remuneração — e essa é outra linha que costuma vir errada.",
  },
  {
    pergunta: "Posso ter salário e recibos verdes ao mesmo tempo?",
    resposta:
      "Podes, e é mais comum do que parece. Não te obriga a escolher uma identidade: a Segurança Social tem regras de acumulação próprias e o IRS junta as duas categorias no fim. Por isso este site nunca te pergunta «o que és».",
  },
] as const;

export default function HomepageSalario({ dados }: { dados: DadosSalario }) {
  const foco = FOCO_POR_ID.get("salario")!;
  const diferencaMensal = Math.abs(dados.liquidoCerto - dados.liquidoRecibo);

  return (
    <>
      <HeroFoco
        foco={foco}
        ancora="#metodo-salario"
        rotuloAncora="Ver como se confere"
        selos={[
          { Icon: Lock, texto: "O teu recibo não sai do dispositivo" },
          { Icon: ShieldCheck, texto: "Tabelas de retenção de 2026" },
        ]}
      >
        <PalcoSalario dados={dados} />
      </HeroFoco>

      {/* ── Método ──────────────────────────────────────────────── */}
      <SeccaoFoco
        id="metodo-salario"
        fundo="areia"
        sobrancelha="O método"
        titulo="Conferir não é desconfiar. É ler."
        intro="A conta do salário é pública e determinística: do bruto sai 11% de Segurança Social e uma retenção que depende da tua situação pessoal. Se a soma não der o líquido que recebeste, uma das duas está errada — e dá para ver qual."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPIOS.map(({ titulo, texto, Icon }, indice) => (
            <Reveal key={titulo} delay={indice * 0.05}>
              <CartaoMetodo indice={indice} Icon={Icon} titulo={titulo} texto={texto} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8 overflow-hidden rounded-[2rem] border border-stone-100 bg-white shadow-lift dark:border-stone-800 dark:bg-stone-900">
          <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-800 sm:px-7">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-stone-500">
              <Briefcase size={15} className="text-brand" /> O exemplo da demonstração, em números
            </div>
          </div>
          <div className="grid md:grid-cols-3">
            {[
              {
                rotulo: "No recibo",
                valor: eur(dados.liquidoRecibo),
                texto: `Retenção de ${eur(dados.irsRecibo)}, calculada pela tabela de quem não tem dependentes.`,
                cores: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
              },
              {
                rotulo: "Devia ser",
                valor: eur(dados.liquidoCerto),
                texto: `Retenção de ${eur(dados.irsCerto)}, pela tabela certa — com o dependente declarado.`,
                cores: "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint",
              },
              {
                rotulo: "Por mês",
                valor: eur(diferencaMensal),
                texto: `Se o erro se repetir nos ${dados.pagamentosProjetados} pagamentos, a projeção é ${eur(dados.diferenca14Pagamentos)}. É uma hipótese explícita, não um total garantido.`,
                cores: "bg-clay-bg text-clay-text",
              },
            ].map((coluna, indice) => (
              <div
                key={coluna.rotulo}
                className={`p-5 sm:p-7 ${indice > 0 ? "border-t border-stone-100 dark:border-stone-800 md:border-l md:border-t-0" : ""}`}
              >
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${coluna.cores}`}
                >
                  {coluna.rotulo}
                </span>
                <div className="mt-4 font-display text-2xl font-semibold tabular-nums text-ink">
                  {coluna.valor}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">{coluna.texto}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </SeccaoFoco>

      {/* ── Percurso ────────────────────────────────────────────── */}
      <SeccaoFoco
        id="percurso-salario"
        fundo="branco"
        sobrancelha="Depois de conferir"
        titulo="Salário não é uma etapa — é um percurso paralelo."
        intro="Ter salário não te impede de ter um negócio, e ter um negócio não te obriga a largar o salário. A ordem dos outros focos não se aplica aqui: este cruza-se com eles em vez de vir antes ou depois."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-4xl border border-brand bg-brand-light p-5 shadow-card dark:bg-brand/15 sm:p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white">
              <Check size={18} />
            </span>
            <div className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-brand">
              Estás aqui
            </div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">
              Conferir com o teu recibo
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Põe os teus números e vê se as linhas batem. Se tens o PDF, a auditoria lê-o e faz a
              comparação por ti.
            </p>
            <Link
              href="/ferramentas/auditoria-recibo"
              className="focus-marca mt-5 inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-brand-dark no-underline dark:text-brand-mint"
            >
              Auditar o meu recibo <ArrowRight size={13} />
            </Link>
          </div>

          <LinkFocoIntencao
            foco="recibos"
            className="focus-marca group rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:p-6"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
              <Coin size={18} />
            </span>
            <div className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-stone-400">
              Se também faturas
            </div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">
              Ver o que fica dos recibos
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Acumular emprego e atividade muda as regras da Segurança Social. Vale a pena ver as
              duas contas juntas.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-transform group-hover:translate-x-1">
              Abrir <ArrowRight size={13} />
            </div>
          </LinkFocoIntencao>

          <LinkFocoIntencao
            foco="empresa"
            className="focus-marca group rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:p-6"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
              <Scale size={18} />
            </span>
            <div className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-stone-400">
              Se estás a decidir
            </div>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">
              Comparar com as alternativas
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              O mesmo rendimento rende de forma diferente conforme a categoria. Ver os três lado a
              lado antes de decidir.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-transform group-hover:translate-x-1">
              Ver os caminhos <ArrowRight size={13} />
            </div>
          </LinkFocoIntencao>
        </div>
      </SeccaoFoco>

      <section className="rc-home-deferred rc-home-deferred--compact px-4 pb-8 sm:px-6 sm:pb-12">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-7">
          <FilaPilares />
        </div>
      </section>

      <Precos />

      <FaqFoco
        id="faq-salario"
        sobrancelha="Antes de arquivar"
        titulo="As perguntas que ninguém faz ao recibo."
        intro="Cinco confusões que fazem a diferença entre um recibo lido e um recibo recebido."
        perguntas={FAQS}
        cta={{ href: "/ferramentas/recibo-vencimento", rotulo: "Conferir o meu recibo" }}
      />

      {/* ── Fontes ──────────────────────────────────────────────── */}
      <SeccaoFoco
        id="fontes-salario"
        fundo="areia"
        sobrancelha="Fontes e limites"
        titulo="As tabelas são públicas. É por isso que dá para conferir."
        intro="As tabelas de retenção são publicadas em despacho todos os anos e a taxa contributiva está na lei. Nada nesta página é uma estimativa de mercado — é aritmética sobre valores oficiais."
        larguraTitulo="max-w-2xl"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              sigla: "Tabelas de retenção",
              titulo: "Despacho anual",
              texto:
                "As tabelas por situação pessoal e familiar, publicadas pelo Governo. É delas que sai a linha que mais vezes vem errada.",
              href: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/tabela_ret_fonte/Pages/default.aspx",
            },
            {
              sigla: "Segurança Social",
              titulo: "Taxa contributiva",
              texto:
                "11% a cargo do trabalhador e 23,75% a cargo da entidade empregadora, sobre a remuneração sujeita.",
              href: "https://www.seg-social.pt/trabalhadores-por-conta-de-outrem",
            },
          ].map(({ sigla, titulo, texto, href }, i) => (
            <Reveal key={sigla} delay={i * 0.05}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-marca group flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-shadow hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand">
                    {sigla}
                  </span>
                  <ExternalLink size={13} className="text-stone-400 group-hover:text-brand" />
                </div>
                <h3 className="mt-5 text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {titulo}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">{texto}</p>
              </a>
            </Reveal>
          ))}
          <Reveal delay={0.1}>
            <div className="flex h-full flex-col rounded-4xl border border-brand/30 bg-brand-light p-5 shadow-card dark:bg-brand/15">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-dark dark:text-brand-mint">
                <Warning size={12} /> O limite desta conferência
              </div>
              <h3 className="mt-5 text-sm font-semibold text-stone-800 dark:text-stone-100">
                Não substitui a tua empresa
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Uma diferença apurada aqui é um ponto de partida para uma conversa com o
                processamento salarial — não uma acusação. Há situações legítimas que a conta
                genérica não conhece.
              </p>
            </div>
          </Reveal>
        </div>
      </SeccaoFoco>

      {/* A bússola fecha a leitura. Quem chegou aqui já sabe uma coisa;
          isto diz-lhe que há outras quatro e qual é a pergunta de cada
          uma — sem o obrigar a subir ao cabeçalho para descobrir. */}
      <section className="rc-home-deferred rc-home-deferred--compact px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <Bussola
            excepto="salario"
            compacta
            titulo="E as outras quatro?"
            nota="Cada uma responde ao que este ecrã não responde."
          />
        </div>
      </section>
    </>
  );
}
