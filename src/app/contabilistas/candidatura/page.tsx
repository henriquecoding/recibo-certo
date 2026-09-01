import type { Metadata } from "next";
import Link from "next/link";
import FormularioCandidatura from "./FormularioCandidatura";
import { lugaresFundadoresServidor } from "@/lib/contabilistas/progressao/fundadores-server";
import {
  COMISSAO_FUNDADOR_TEXTO, LUGARES_FUNDADORES, textoLugares,
} from "@/lib/contabilistas/progressao/fundadores";
import { PATAMARES, formatarComissao, formatarEuros } from "@/lib/contabilistas/progressao/catalogo";
import {
  COPY_BASE_DA_COMISSAO, COPY_ELEGIBILIDADE, COPY_QUEM_FATURA,
  DESBLOQUEIO_NAO_COMPRA,
} from "@/lib/contabilistas/progressao/fronteiras";
import { TETO_DE_ENCAMINHAMENTOS } from "@/lib/contabilistas/casos";
import {
  Award, Briefcase, CalendarSync, Check, Coin, Gift, Handshake, Lock,
  Search, Star, User, Warning,
} from "@/components/ui/Icons";

// ═══════════════════════════════════════════════════════════════════════
//  CANDIDATURA — porque é que vale a pena, antes do formulário
//  ---------------------------------------------------------------------
//  Isto era um formulário com três linhas por cima: «o painel dá-te
//  agenda, clientes, partilhas e um cartão de fidelidade». Um contabilista
//  certificado a decidir onde põe o nome dele merece saber mais do que
//  isso — e a pergunta que ele tem, e a que nenhuma daquelas linhas
//  respondia, é «o que é que isto me custa e o que é que eu ganho».
//
//  A ORDEM É A DA DECISÃO, e não a do que é mais bonito de mostrar:
//
//   1. O que é, numa frase, e quantos lugares de fundador restam.
//   2. Como é que um cliente chega até ti — sem isso, o resto não importa.
//   3. O que custa. A comissão ANTES das funcionalidades, porque é a
//      pergunta que fica na cabeça enquanto se lê o resto.
//   4. O programa fundador e, esgotado ele, a negociação.
//   5. O que a plataforma te dá para trabalhar.
//   6. O que a plataforma NÃO vê. É o que distingue isto de um portal.
//   7. As perguntas que sobram.
//   8. O formulário.
//
//  Server Component: o conteúdo essencial é legível sem JavaScript, e o
//  contador de lugares vem já preenchido. Só o formulário é cliente.
// ═══════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: "Ser contabilista no Recibo Certo | Recibo Certo",
  description:
    "Recebe casos de trabalhadores independentes, responde com propostas, marca consultas e sincroniza a agenda. Comissão que desce com o trabalho feito, e 5% permanentes para os primeiros dez.",
  alternates: { canonical: "/contabilistas/candidatura" },
  robots: { index: true, follow: true },
};

/** A comissão muda com os lugares. Não é conteúdo estático. */
export const revalidate = 300;

export default async function Pagina() {
  const lugares = await lugaresFundadoresServidor();
  const base = PATAMARES[0]!;
  const topo = PATAMARES[PATAMARES.length - 1]!;

  return (
    <main className="min-h-[100dvh] bg-cream">
      {/* ── 1. O que é ────────────────────────────────────────────── */}
      <header className="mx-auto max-w-3xl px-4 pb-10 pt-10 sm:pt-14">
        <p className="eyebrow">Contabilistas certificados</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl">
          Pessoas com um problema fiscal concreto, à procura de quem o resolva
        </h1>
        <p className="mt-4 text-base leading-relaxed text-stone-600">
          O Recibo Certo é usado por trabalhadores independentes para perceberem os
          próprios impostos. Quando o caso passa do que uma calculadora resolve, essa
          pessoa descreve a situação e escolhe a quem a envia. Se estiveres aqui, podes
          ser tu.
        </p>

        {lugares.verificado && !lugares.esgotado && (
          <div className="mt-6 rounded-3xl border border-brand/30 bg-brand-light p-5">
            <p className="flex flex-wrap items-center gap-2">
              <Award size={18} className="shrink-0 text-brand-dark" aria-hidden />
              <span className="font-display text-xl text-brand-dark">
                {textoLugares(lugares)}
              </span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-brand-dark/90">
              Os primeiros {LUGARES_FUNDADORES} contabilistas aprovados ficam com{" "}
              <strong>{COMISSAO_FUNDADOR_TEXTO} de comissão</strong> — a mais baixa que
              existe — de imediato e enquanto a conta estiver ativa. Sem faturação mínima,
              sem prazo, sem letra pequena.
            </p>
          </div>
        )}

        <p className="mt-6 flex items-start gap-2 text-sm leading-relaxed text-stone-500">
          <Warning size={15} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
          Sê honesto connosco sobre o que isto ainda é: uma plataforma nova, a construir
          a base de clientes. Não te prometemos volume. O que te prometemos está escrito
          nesta página, e é verificável.
        </p>
      </header>

      {/* ── 2. Como um cliente chega ──────────────────────────────── */}
      <Seccao titulo="Como é que alguém chega até ti" Icon={Search}>
        <ol className="space-y-4">
          <Passo n={1} titulo="A pessoa descreve o caso">
            Assunto, situação, área e urgência — escrito por ela, não um formulário de
            contacto de três campos. Dá também o nome e o NIF, porque sem isso não se
            orçamenta a sério.
          </Passo>
          <Passo n={2} titulo="Escolhe a quem o envia">
            No diretório, pelo perfil. Pode enviá-lo a{" "}
            {TETO_DE_ENCAMINHAMENTOS} contabilistas no máximo — sabe que o faz, e escolhe
            entre as respostas. Não é a mesma lead vendida a dez pessoas.
          </Passo>
          <Passo n={3} titulo="Respondes com uma proposta">
            Valor, prazo e contrato em anexo. Ela só pode decidir depois de ler até ao fim
            e confirmar que leu — está no servidor, não é um botão que se contorna.
          </Passo>
          <Passo n={4} titulo="Aceite a proposta, trabalham">
            Abre-se a conversa direta, a agenda e as consultas. O dinheiro entra na tua
            conta Stripe, com o teu nome no extrato do cliente.
          </Passo>
        </ol>

        <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm leading-relaxed text-stone-600">
          <strong>Não há intermediário a ler o que combinam.</strong> A conversa é entre
          vocês os dois desde a primeira mensagem. Isto mudou em agosto de 2026 — antes,
          cada mensagem passava por revisão nossa, e deixou de passar.
        </p>
      </Seccao>

      {/* ── 3. O que custa ────────────────────────────────────────── */}
      <Seccao titulo="O que custa" Icon={Coin}>
        <p className="text-base leading-relaxed text-stone-600">
          Não há mensalidade. Não há custo de entrada. Há uma comissão sobre o trabalho
          que nasce aqui — e essa comissão <strong>desce</strong> à medida que trabalhas.
        </p>

        {/* `tabIndex` e `role="region"` não são zelo a mais: uma zona que
            rola na horizontal e não recebe foco é uma zona que quem navega
            por teclado não consegue percorrer. O axe apanha-o como
            `scrollable-region-focusable`, e tem razão. */}
        <div
          className="mt-5 overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          tabIndex={0}
          role="region"
          aria-label="Tabela de patamares de comissão"
        >
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <caption className="sr-only">
              Patamares de comissão, do inicial ao mais baixo
            </caption>
            <thead>
              <tr className="border-b border-stone-200 text-left">
                <th scope="col" className="pb-2 pr-4 font-semibold text-stone-500">Patamar</th>
                <th scope="col" className="pb-2 pr-4 font-semibold text-stone-500">Comissão</th>
                <th scope="col" className="pb-2 pr-4 font-semibold text-stone-500">XP</th>
                <th scope="col" className="pb-2 font-semibold text-stone-500">Desbloqueio</th>
              </tr>
            </thead>
            <tbody>
              {PATAMARES.map((p) => (
                <tr key={p.slug} className="border-b border-stone-100">
                  <th scope="row" className="py-2.5 pr-4 text-left font-medium text-stone-700">
                    {p.titulo}
                  </th>
                  <td className="py-2.5 pr-4 tabular-nums text-stone-700">
                    {formatarComissao(p.comissaoBps)}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-stone-500">
                    {p.xpMinimo === 0 ? "—" : p.xpMinimo}
                  </td>
                  <td className="py-2.5 tabular-nums text-stone-500">
                    {p.precoDesbloqueioCents === null
                      ? "—"
                      : formatarEuros(p.precoDesbloqueioCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          Começas em <strong>{formatarComissao(base.comissaoBps)}</strong> e chegas a{" "}
          <strong>{formatarComissao(topo.comissaoBps)}</strong>. Sobes por trabalho feito
          — cada serviço concluído e cada cliente novo dão XP — ou pagas uma vez para
          passar já ao patamar seguinte. As duas vias existem, e a primeira é a que a
          plataforma quer premiar.
        </p>

        <dl className="mt-5 space-y-3">
          <Nota titulo="Sobre o que incide">{COPY_BASE_DA_COMISSAO}</Nota>
          <Nota titulo="Quem cobra, e a quem">{COPY_QUEM_FATURA}</Nota>
          <Nota titulo="O que conta para XP">{COPY_ELEGIBILIDADE}</Nota>
        </dl>
      </Seccao>

      {/* ── 4. Fundador e negociação ──────────────────────────────── */}
      <Seccao titulo="Os primeiros dez, e quem vier depois" Icon={Award}>
        <div className="rounded-3xl border border-brand/25 bg-brand-light/50 p-5">
          <h3 className="font-display text-xl text-ink">
            Programa fundador — {COMISSAO_FUNDADOR_TEXTO}, permanentes
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            Os primeiros {LUGARES_FUNDADORES} contabilistas aprovados ficam com{" "}
            {COMISSAO_FUNDADOR_TEXTO} de comissão desde o primeiro dia. É o patamar que,
            pelo caminho normal, exige {topo.xpMinimo} XP — e que aqui não custa nada.
          </p>
          <ul className="mt-3 space-y-1.5">
            {[
              "De imediato: não há período de prova nem faturação mínima.",
              "Permanente enquanto a tua conta de contabilista estiver ativa.",
              "Não desce se estiveres um mês sem faturar.",
              "O XP continua a contar — se um dia houver patamar melhor, ficas com o melhor dos dois.",
            ].map((linha) => (
              <li key={linha} className="flex items-start gap-2 text-sm leading-relaxed text-stone-700">
                <Check size={14} className="mt-1 shrink-0 text-brand-dark" aria-hidden />
                {linha}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-stone-500">
            Porquê: quem entra numa plataforma sem histórico, sem outros profissionais lá
            dentro e sem provas dadas está a correr um risco que quem entra depois já não
            corre. Isto é o reconhecimento desse risco, e mais nada — não compra posição
            no diretório nem prioridade no encaminhamento.
          </p>
        </div>

        <div className="mt-4 rounded-3xl border border-stone-200 bg-white p-5">
          <h3 className="flex items-center gap-2 font-display text-xl text-ink">
            <Handshake size={18} className="text-stone-500" aria-hidden />
            Esgotados os dez: propõe o teu valor
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Se o preço de tabela para subir de patamar não faz sentido no teu caso, dizes
            qual faz e porquê. A proposta vai direta ao administrador, que{" "}
            <strong>aceita, contrapõe ou recusa</strong> — com uma razão escrita nos três
            casos. É além dos créditos de fidelidade que já ganhaste, não em vez deles.
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-stone-500">
            O que um valor acordado não compra
          </p>
          <ul className="mt-1.5 space-y-1">
            {DESBLOQUEIO_NAO_COMPRA.map((linha) => (
              <li key={linha} className="flex items-start gap-2 text-xs leading-relaxed text-stone-500">
                <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-300" />
                {linha}
              </li>
            ))}
          </ul>
        </div>
      </Seccao>

      {/* ── 5. O que tens para trabalhar ──────────────────────────── */}
      <Seccao titulo="O que tens para trabalhar" Icon={Briefcase}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Cartao Icon={User} titulo="Perfil público">
            Uma página tua no diretório: apresentação, áreas, idiomas, anos de
            experiência, tipos de consulta e preço. O número da Ordem aparece como
            «verificado» só depois de o confirmarmos — nunca por o teres escrito.
          </Cartao>
          <Cartao Icon={Briefcase} titulo="Casos e propostas">
            Os pedidos que te chegam, com a situação escrita pela pessoa. Respondes com
            proposta: valor, prazo, contrato em anexo e leitura confirmada.
          </Cartao>
          <Cartao Icon={CalendarSync} titulo="Agenda e sincronização">
            Publicas a semana-tipo e os clientes marcam nos horários livres. A agenda
            sincroniza com o Google Calendar, o calendário da Apple e o Outlook — as
            consultas atualizam-se sozinhas quando mudam de hora.
          </Cartao>
          <Cartao Icon={Coin} titulo="Recebimentos">
            O cliente paga pelo Recibo Certo, mas a cobrança nasce na tua conta Stripe: és
            tu o comerciante de registo, e o dinheiro nunca passa por nós.
          </Cartao>
          <Cartao Icon={Gift} titulo="Cartão de fidelidade">
            Configuras a regra — quantas consultas, que benefício — e o cartão carimba-se
            sozinho a cada consulta realizada.
          </Cartao>
          <Cartao Icon={Star} titulo="Painel que compões">
            As vistas e os módulos que escolhes, com o estado de agora: por confirmar,
            por responder, por receber.
          </Cartao>
          <Cartao Icon={Lock} titulo="Partilhas dos clientes">
            As simulações que eles fizeram aqui e escolheram enviar-te. Revogáveis por
            eles a qualquer momento.
          </Cartao>
          <Cartao Icon={Award} titulo="Progressão">
            O patamar, a comissão de agora, o que falta para a próxima, e os créditos de
            fidelidade que ganhaste.
          </Cartao>
        </div>
      </Seccao>

      {/* ── 6. O que não vemos ────────────────────────────────────── */}
      <Seccao titulo="O que a plataforma não vê" Icon={Lock}>
        <p className="text-base leading-relaxed text-stone-600">
          Isto não é uma promessa numa política de privacidade: são regras na base de
          dados, e há testes adversariais a prová-las a cada alteração.
        </p>
        <ul className="mt-4 space-y-3">
          <Garantia titulo="As tuas conversas com os clientes">
            Ninguém da administração as alcança. Um pedido de administrador sobre a tabela
            das mensagens devolve zero resultados. A única exceção é uma mensagem que tu
            ou o cliente nos entreguem — e é só essa.
          </Garantia>
          <Garantia titulo="Os dados fiscais de quem te procura">
            A administração não lê as simulações nem as preferências fiscais de ninguém.
          </Garantia>
          <Garantia titulo="O teu calendário">
            A sincronização é num sentido só: publicamos as consultas marcadas aqui. Nunca
            pedimos acesso ao teu Google ou ao teu iCloud.
          </Garantia>
          <Garantia titulo="O teu dinheiro">
            As cobranças nascem na tua conta Stripe. O saldo é teu, o extrato tem o teu
            nome, e a comissão sai como taxa de aplicação — não como uma retenção nossa.
          </Garantia>
        </ul>
      </Seccao>

      {/* ── 7. Perguntas ──────────────────────────────────────────── */}
      <Seccao titulo="Perguntas que ficam" Icon={Warning}>
        <dl className="space-y-4">
          <Pergunta p="Quem pode candidatar-se?">
            Contabilistas certificados. Qualquer conta se pode candidatar; a administração
            analisa cada pedido, confirma o que houver a confirmar e responde. Podes provar
            a inscrição por texto, por documento anexado, ou combinar por email — não
            recusamos ninguém por não querer carregar documentos.
          </Pergunta>
          <Pergunta p="Sou obrigado a aceitar os casos que me chegam?">
            Não. Um caso encaminhado é um convite. Recusas, e não conta para nada.
          </Pergunta>
          <Pergunta p="E se eu quiser sair?">
            Sais. Apagas a conta a partir das definições, com um manifesto do que é
            apagado e do que fica retido por obrigação legal — as compras e os pagamentos
            recebidos ficam pelo prazo de conservação de faturação, e isso está dito antes
            de carregares no botão.
          </Pergunta>
          <Pergunta p="Posso combinar tudo com o cliente fora da plataforma?">
            Podes. Não há bloqueio nenhum a partilhar contactos. Mas o que acontece fora
            daqui não conta para XP nem para o teu patamar — a plataforma não o viu
            acontecer.
          </Pergunta>
          <Pergunta p="Quanto tempo demora a resposta?">
            Não prometemos um prazo que ainda não conseguimos garantir. O pedido fica
            visível para ti nesta página, com o estado, e avisamos-te por email quando
            houver decisão.
          </Pergunta>
        </dl>
      </Seccao>

      {/* ── 8. O formulário ───────────────────────────────────────── */}
      <section
        id="candidatar"
        className="mx-auto max-w-3xl scroll-mt-8 px-4 pb-16 pt-4"
        aria-labelledby="candidatar-titulo"
      >
        <div className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-7">
          <h2 id="candidatar-titulo" className="font-display text-3xl leading-tight text-ink">
            Pedir acesso ao painel
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            {lugares.verificado && !lugares.esgotado
              ? `${textoLugares(lugares)} Se fores aprovado dentro deles, o benefício é atribuído no instante da aprovação — não tens de pedir nada.`
              : "A administração analisa cada pedido e responde."}
          </p>
          <FormularioCandidatura />
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          Queres ver primeiro quem já cá está?{" "}
          <Link
            href="/contabilistas"
            className="font-semibold text-brand-dark underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
          >
            O diretório público
          </Link>
        </p>
      </section>
    </main>
  );
}

/* ── Peças ─────────────────────────────────────────────────────────── */

function Seccao({
  titulo, Icon, children,
}: {
  titulo: string;
  Icon: (p: { size?: number; className?: string }) => React.JSX.Element;
  children: React.ReactNode;
}) {
  const id = titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (
    <section
      aria-labelledby={`s-${id}`}
      className="mx-auto max-w-3xl border-t border-stone-200 px-4 py-10"
    >
      <h2 id={`s-${id}`} className="flex items-center gap-2.5 font-display text-2xl leading-tight text-ink sm:text-3xl">
        <Icon size={20} className="shrink-0 text-stone-400" />
        {titulo}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold tabular-nums text-white"
      >
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold text-stone-800">{titulo}</h3>
        <p className="mt-0.5 text-sm leading-relaxed text-stone-600">{children}</p>
      </div>
    </li>
  );
}

function Nota({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">{titulo}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-stone-600">{children}</dd>
    </div>
  );
}

function Cartao({
  Icon, titulo, children,
}: {
  Icon: (p: { size?: number; className?: string }) => React.JSX.Element;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-4">
      <h3 className="flex items-center gap-2 font-semibold text-stone-800">
        <Icon size={16} className="shrink-0 text-brand-dark" />
        {titulo}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{children}</p>
    </div>
  );
}

function Garantia({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-2xl bg-white px-4 py-3">
      <Lock size={15} className="mt-0.5 shrink-0 text-brand-dark" aria-hidden />
      <div className="min-w-0">
        <h3 className="font-semibold text-stone-800">{titulo}</h3>
        <p className="mt-0.5 text-sm leading-relaxed text-stone-600">{children}</p>
      </div>
    </li>
  );
}

function Pergunta({ p, children }: { p: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-semibold text-stone-800">{p}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-stone-600">{children}</dd>
    </div>
  );
}
