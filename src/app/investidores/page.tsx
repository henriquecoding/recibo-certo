// ═══════════════════════════════════════════════════════════════════════════
//  /investidores — página pública, factual e inteiramente renderizada no
//  SERVIDOR. O único componente de cliente é o formulário.
//
//  A versão anterior era um Client Component de 1 422 linhas que levava ao
//  browser o Motion, o SDK do Supabase, temporizadores, três demonstrações
//  animadas e todo o texto estático. Os números apareciam a zero no HTML e só
//  eram corrigidos depois de o JavaScript correr e o IntersectionObserver
//  disparar — o que dava "0,0 milhões de empresas" a crawlers, a
//  pré-visualizações e a quem tem scripts bloqueados.
//
//  A ordem das secções segue a arquitetura do relatório: tese, prova, why now,
//  problema, produto, tração, mercado, modelo, concorrência, marcos, ronda,
//  riscos e legal.
// ═══════════════════════════════════════════════════════════════════════════

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { calcular } from "@/lib/fiscal";

import { Seccao, SeloEstado, MetricaComEvidencia, Nota, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, eur, milhoesEur, formatarData } from "./_components/Primitivas";
import ProvaDeProduto from "./_components/ProvaDeProduto";
import FormularioInteresse from "./_components/FormularioInteresse.client";

import { METRICAS_PUBLICAS, METRICAS_RESERVADAS, DATA_REFERENCIA } from "./_data/metrics";
import {
  AFIRMACOES,
  CONCORRENCIA,
  CONCORRENCIA_NOTA,
  MARCOS,
  RISCOS,
  RONDA,
  RONDA_NOTA,
  SUBTESE,
  TESE,
} from "./_data/content";
import {
  ESTRUTURA_PME,
  MERCADO,
  PRECO_PLUS_MENSAL,
  PRESSUPOSTOS,
  SENSIBILIDADE,
  UNIVERSOS,
} from "./_data/market";
import { AVISO_INVESTIMENTO, EMAIL_INVESTIDORES, NOTA_PRIVACIDADE, SLA_RESPOSTA } from "./_data/legal";

/** Exemplo do produto, calculado pelo motor verificado — no servidor. */
const PROVA = (() => {
  const bruto = 2_500;
  const r = calcular({
    bruto,
    tipo: "art151",
    regiao: "continente",
    regimeIVA: "isento",
    baseSS: "servicos",
    dispensaRetencao: false,
    isencaoSSPrimeiroAno: false,
    acumulaEmprego: false,
  });
  return {
    bruto,
    liquido: Math.round(r.liquido),
    irs: Math.round(r.retencaoIRS),
    ss: Math.round(r.segSocial),
  };
})();

const SIM_NAO: Record<string, string> = {
  sim: "Sim",
  nao: "Não",
  parceiro: "Parceiro",
  integracoes: "Integrações",
  forte: "Forte",
  medio: "Médio",
  baixo: "Baixo",
};

export default function InvestidoresPage() {
  const afirmacoesPorEstado = {
    live: AFIRMACOES.filter((a) => a.estado === "live"),
    pilot: AFIRMACOES.filter((a) => a.estado === "pilot"),
    planned: AFIRMACOES.filter((a) => a.estado === "planned"),
    hypothesis: AFIRMACOES.filter((a) => a.estado === "hypothesis"),
  };

  return (
    <>
      <Nav />
      <main>
        {/* ── 1 · Hero ─────────────────────────────────────────────────── */}
        <section className="grain px-5 pt-10 pb-14 sm:px-6 sm:pt-14 sm:pb-20">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-start">
            <div>
              <p className="eyebrow mb-4 text-brand-dark dark:text-brand-mint">Para investidores</p>
              <h1 className="font-display display-hero max-w-[20ch] text-balance font-semibold text-ink">
                A camada de decisão fiscal para quem trabalha em Portugal.
              </h1>
              <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-stone-600 dark:text-stone-400 sm:text-lg">
                {SUBTESE}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a href="#contacto" className={BOTAO_PRIMARIO}>
                  Pedir o deck
                </a>
                <a href="/" className={BOTAO_SECUNDARIO}>
                  Experimentar o produto
                </a>
              </div>
              <p className="mt-6 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
                Todos os números desta página têm definição, origem e data. Os que ainda não
                temos medidos com rigor estão identificados como tal — nenhum foi estimado
                para preencher espaço.
              </p>
            </div>

            {/* Ficha da ronda. Não inventa: diz o que há e o que não há. */}
            <aside className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
              <h2 className="font-display text-lg font-semibold text-ink">A ronda</h2>
              {RONDA.divulgada ? (
                <dl className="mt-4 space-y-2 text-[13px]">
                  {RONDA.estagio && <LinhaFicha termo="Estágio" valor={RONDA.estagio} />}
                  {RONDA.montante && <LinhaFicha termo="A levantar" valor={RONDA.montante} />}
                  {RONDA.instrumento && <LinhaFicha termo="Instrumento" valor={RONDA.instrumento} />}
                  {RONDA.ticketMinimo && <LinhaFicha termo="Ticket" valor={RONDA.ticketMinimo} />}
                  {RONDA.comprometido && <LinhaFicha termo="Comprometido" valor={RONDA.comprometido} />}
                  {RONDA.fechoPrevisto && <LinhaFicha termo="Fecho previsto" valor={RONDA.fechoPrevisto} />}
                </dl>
              ) : (
                <p className="mt-3 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
                  {RONDA_NOTA}
                </p>
              )}
              <a href="#contacto" className={`${BOTAO_PRIMARIO} mt-5`}>
                Falar connosco
              </a>
              <p className="mt-3 text-[12px] text-stone-500 dark:text-stone-400">
                Resposta {SLA_RESPOSTA}.
              </p>
            </aside>
          </div>
        </section>

        {/* ── 2 · Prova ────────────────────────────────────────────────── */}
        <Seccao
          id="prova"
          tom="branco"
          eyebrow="Prova"
          titulo="Não peça para acreditar em adjetivos."
          descricao={
            <>
              Estes números são contados a partir do código deste produto, não escritos à mão.
              Qualquer pessoa os pode confirmar abrindo as páginas indicadas. Referência:{" "}
              <time dateTime={DATA_REFERENCIA}>{formatarData(DATA_REFERENCIA)}</time>.
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {METRICAS_PUBLICAS.map((m) => (
              <MetricaComEvidencia key={m.id} m={m} />
            ))}
          </div>
          <Nota>
            São métricas de <strong>superfície de produto</strong>, não de tração. A distinção
            é intencional: dizem o que existe e é verificável, não quantas pessoas o usam.
            A tração está mais abaixo, e o que dela não está medido não é apresentado.
          </Nota>
        </Seccao>

        {/* ── 3 · Why now + 4 · Problema ───────────────────────────────── */}
        <Seccao
          id="porque-agora"
          eyebrow="Porquê agora"
          titulo="A decisão fiscal ficou mais difícil do que a execução."
          descricao={
            <>
              Emitir uma fatura é hoje um problema resolvido, com bons produtos e execução
              certificada disponível por API. O que continua por resolver é o passo anterior:
              perceber quanto do dinheiro é mesmo teu, quanto reservar, que regime escolher e
              quando pagar — com regras que mudam todos os anos e vivem espalhadas por
              diplomas, portarias e ofícios.
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                t: "Quem serve o beachhead",
                d: `Trabalhadores por conta própria em Portugal: ${UNIVERSOS.trabalhadoresContaPropria.valor.toLocaleString("pt-PT")} pessoas segundo o INE/PORDATA. Nem todas emitem recibos verdes — é um limite superior, não uma contagem de clientes.`,
              },
              {
                t: "O que os trava",
                d: "A informação existe, mas está em linguagem legal, dispersa e sem contexto pessoal. A pergunta não é «o que diz a lei», é «o que é que isto significa para mim, este mês».",
              },
              {
                t: "O que mudou",
                d: "A execução certificada passou a estar disponível por API. Deixou de ser preciso construir faturação para servir quem decide — o que torna viável ser a camada de decisão e ligar à execução.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900">
                <h3 className="text-[14px] font-semibold text-ink">{c.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">{c.d}</p>
              </div>
            ))}
          </div>
        </Seccao>

        {/* ── 5 · Produto ──────────────────────────────────────────────── */}
        <Seccao
          id="produto"
          tom="branco"
          eyebrow="Produto"
          titulo="Uma pergunta, um número com memória de cálculo, um passo seguinte."
          descricao="O utilizador chega com uma pergunta — quanto é meu, quanto reservar, que regime escolher. Calculamos com fontes oficiais, mostramos de onde vem cada parcela e transformamos o resultado numa ação: guardar, exportar, preparar para o contabilista ou continuar num parceiro de execução."
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
            <ProvaDeProduto v={PROVA} />
            <div>
              <h3 className="font-display text-lg font-semibold text-ink">O que existe e o que não existe</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
                Cada afirmação abaixo traz o seu estado. O presente e o futuro nunca partilham
                o mesmo estilo — foi assim que a versão anterior conseguiu apresentar crédito,
                take rate e reconciliação bancária ao lado do que já funciona.
              </p>
              <ul className="mt-5 space-y-3">
                {(["live", "pilot", "planned", "hypothesis"] as const).flatMap((estado) =>
                  afirmacoesPorEstado[estado].map((a) => (
                    <li
                      key={a.id}
                      className="rounded-2xl border border-stone-200/80 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">{a.texto}</p>
                        <SeloEstado estado={a.estado} />
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                        {a.verificacao}
                        {a.urlFonte && (
                          <>
                            {" "}
                            <a
                              href={a.urlFonte}
                              className="font-semibold text-brand-dark underline underline-offset-2 dark:text-brand-mint"
                            >
                              abrir
                            </a>
                          </>
                        )}
                      </p>
                    </li>
                  )),
                )}
              </ul>
            </div>
          </div>
        </Seccao>

        {/* ── 6 · Tração ───────────────────────────────────────────────── */}
        <Seccao
          id="tracao"
          eyebrow="Tração"
          titulo="O que ainda não medimos com rigor, não publicamos."
          descricao="Estas são as métricas que decidem um investimento. Cada uma está definida — o que conta, o que não conta, com que cadência — e nenhuma tem número aqui porque nenhuma tem hoje uma fonte que um terceiro possa auditar. Partilhamo-las na conversa, com o método à frente."
        >
          <div tabIndex={0} role="region" aria-label="Métricas de tração, definição e estado de divulgação" className="focus-marca overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-[13px]">
              <caption className="sr-only">Métricas de tração, definição e estado de divulgação</caption>
              <thead>
                <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-400 dark:border-stone-700">
                  <th scope="col" className="py-2 pr-4 font-semibold">Métrica</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Definição</th>
                  <th scope="col" className="py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {METRICAS_RESERVADAS.map((m) => (
                  <tr key={m.id}>
                    <th scope="row" className="py-3 pr-4 align-top font-semibold text-stone-800 dark:text-stone-200">
                      {m.rotulo}
                    </th>
                    <td className="py-3 pr-4 align-top leading-relaxed text-stone-600 dark:text-stone-400">
                      {m.definicao}
                    </td>
                    <td className="py-3 align-top text-stone-500 dark:text-stone-400">
                      <span className="whitespace-nowrap rounded-full border border-stone-300 px-2 py-0.5 text-[11px] font-semibold dark:border-stone-600">
                        No deck
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Nota>
            A camada de medição já existe e recusa qualquer evento com rendimento, NIF ou texto
            livre. O que falta é a série consolidada — e fechá-la é o primeiro marco que o
            capital compra.
          </Nota>
        </Seccao>

        {/* ── 7 · Mercado ──────────────────────────────────────────────── */}
        <Seccao
          id="mercado"
          tom="branco"
          eyebrow="Mercado"
          titulo="Bottom-up, em clientes e em receita — com o método à vista."
          descricao="Partimos de um universo com fonte pública, aplicamos o preço real do produto e duas taxas declaradas como objetivos. Nenhum destes números é tração."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { r: "TAM", c: MERCADO.tamClientes, a: MERCADO.tamArr, d: "Universo elegível × preço atual" },
              { r: "SAM", c: MERCADO.samClientes, a: MERCADO.samArr, d: `${Math.round(PRESSUPOSTOS.fatiaServivel * 100)}% servível pelo produto de hoje` },
              { r: "SOM", c: MERCADO.somClientes, a: MERCADO.somArr, d: `${Math.round(PRESSUPOSTOS.fatiaAlcancavel5a * 100)}% do servível, meta a 5 anos` },
            ].map((x) => (
              <div key={x.r} className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{x.r}</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
                  {x.c.toLocaleString("pt-PT")}
                </p>
                <p className="text-[12px] text-stone-500 dark:text-stone-400">clientes potenciais</p>
                <p className="mt-3 font-display text-lg font-semibold tabular-nums text-brand-dark dark:text-brand-mint">
                  {milhoesEur(x.a)}
                </p>
                <p className="text-[12px] text-stone-500 dark:text-stone-400">
                  ARR teórico a {PRECO_PLUS_MENSAL.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} €/mês
                </p>
                <p className="mt-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{x.d}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-10 font-display text-lg font-semibold text-ink">Como chegámos aqui</h3>
          <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
            <li>
              <strong className="text-stone-800 dark:text-stone-200">Universo:</strong>{" "}
              {UNIVERSOS.trabalhadoresContaPropria.valor.toLocaleString("pt-PT")} trabalhadores por
              conta própria ({UNIVERSOS.trabalhadoresContaPropria.fonte.entidade},{" "}
              {UNIVERSOS.trabalhadoresContaPropria.fonte.referencia}).{" "}
              {UNIVERSOS.trabalhadoresContaPropria.definicao}{" "}
              <a
                href={UNIVERSOS.trabalhadoresContaPropria.fonte.url}
                rel="nofollow noopener"
                className="font-semibold text-brand-dark underline underline-offset-2 dark:text-brand-mint"
              >
                ver fonte
              </a>
            </li>
            <li>
              <strong className="text-stone-800 dark:text-stone-200">Preço:</strong> o do Plus hoje,{" "}
              {PRECO_PLUS_MENSAL.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} €/mês. Não
              usámos um preço futuro para engordar o mercado.
            </li>
            <li>
              <strong className="text-stone-800 dark:text-stone-200">Servível:</strong>{" "}
              {PRESSUPOSTOS.fatiaServivelPorque}
            </li>
            <li>
              <strong className="text-stone-800 dark:text-stone-200">Alcançável:</strong>{" "}
              {PRESSUPOSTOS.fatiaAlcancavelPorque}
            </li>
          </ul>

          <h3 className="mt-10 font-display text-lg font-semibold text-ink">
            Sensibilidade ao preço
          </h3>
          <div tabIndex={0} role="region" aria-label="ARR potencial em três cenários de preço" className="focus-marca mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-[13px]">
              <caption className="sr-only">ARR potencial em três cenários de preço</caption>
              <thead>
                <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-400 dark:border-stone-700">
                  <th scope="col" className="py-2 pr-4 font-semibold">Preço/mês</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">ARR do TAM</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">ARR do SAM</th>
                  <th scope="col" className="py-2 text-right font-semibold">ARR do SOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {SENSIBILIDADE.map((s) => (
                  <tr key={s.arpaMensalEur}>
                    <th scope="row" className="py-2.5 pr-4 font-semibold tabular-nums text-stone-800 dark:text-stone-200">
                      {s.arpaMensalEur.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} €
                    </th>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-stone-600 dark:text-stone-400">
                      {milhoesEur(s.resultado.tamArr)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-stone-600 dark:text-stone-400">
                      {milhoesEur(s.resultado.samArr)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-stone-600 dark:text-stone-400">
                      {milhoesEur(s.resultado.somArr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Nota>
            O que <em>não</em> dizemos: que o mercado são 1,3 milhões de empresas. O INE conta{" "}
            {UNIVERSOS.empresasAtivas.valor.toLocaleString("pt-PT")} empresas ativas ({UNIVERSOS.empresasAtivas.fonte.referencia}) e a
            ficha europeia estima {UNIVERSOS.pmeSetorNaoFinanceiro.valor.toLocaleString("pt-PT")} PME no setor não
            financeiro — universos diferentes, e nenhum deles é o cliente deste produto hoje. Na
            mesma fonte, micro e pequenas empresas são {ESTRUTURA_PME.micro}% e {ESTRUTURA_PME.pequenas}%, ou seja{" "}
            {(ESTRUTURA_PME.micro + ESTRUTURA_PME.pequenas).toFixed(1)}% — e não os 97% que a versão anterior citava.
          </Nota>
        </Seccao>

        {/* ── 8 · Modelo + 10 · Concorrência ───────────────────────────── */}
        <Seccao
          id="modelo"
          eyebrow="Modelo e posição"
          titulo="Vendemos inteligência e distribuição, não faturação."
          descricao={CONCORRENCIA_NOTA}
        >
          <div tabIndex={0} role="region" aria-label="Matriz de posicionamento face a produtos adjacentes" className="focus-marca overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-[13px]">
              <caption className="sr-only">Matriz de posicionamento face a produtos adjacentes</caption>
              <thead>
                <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-400 dark:border-stone-700">
                  <th scope="col" className="py-2 pr-4 font-semibold">Produto</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Foco</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Faturação</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Execução</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Pagamentos</th>
                  <th scope="col" className="py-2 font-semibold">Simulação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {CONCORRENCIA.map((l) => (
                  <tr key={l.produto} className={l.proprio ? "bg-brand-light/40 dark:bg-brand/10" : undefined}>
                    <th scope="row" className="py-2.5 pr-4 font-semibold text-stone-800 dark:text-stone-200">
                      {l.url ? (
                        <a href={l.url} rel="nofollow noopener" className="underline underline-offset-2">
                          {l.produto}
                        </a>
                      ) : (
                        l.produto
                      )}
                    </th>
                    <td className="py-2.5 pr-4 text-stone-600 dark:text-stone-400">{l.wedge}</td>
                    <td className="py-2.5 pr-4 text-stone-600 dark:text-stone-400">{SIM_NAO[l.faturacao]}</td>
                    <td className="py-2.5 pr-4 text-stone-600 dark:text-stone-400">{SIM_NAO[l.execucao]}</td>
                    <td className="py-2.5 pr-4 text-stone-600 dark:text-stone-400">{SIM_NAO[l.pagamentos]}</td>
                    <td className="py-2.5 text-stone-600 dark:text-stone-400">{SIM_NAO[l.simulacao]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Nota>
            Monetização de hoje: uma subscrição, o Plus, a{" "}
            {PRECO_PLUS_MENSAL.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} €/mês, e receita de
            parceria contada à comissão validada — nunca ao clique. Pagamentos e open banking
            continuam hipóteses: não há parceiro, não há enquadramento e não há procura medida.
          </Nota>
        </Seccao>

        {/* ── 11 · Marcos + 13 · Ronda ─────────────────────────────────── */}
        <Seccao
          id="ronda"
          tom="branco"
          eyebrow="A ronda"
          titulo="O que o capital compra."
          descricao="Marcos verificáveis, não uma lista aberta de funcionalidades. A repartição do uso de fundos depende do montante, que ainda não está fechado — publicá-la agora seria inventá-la."
        >
          <ol className="grid gap-4 sm:grid-cols-3">
            {MARCOS.map((m, i) => (
              <li key={m.id} className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900">
                <span className="font-display text-2xl font-semibold text-brand-dark dark:text-brand-mint">
                  {i + 1}
                </span>
                <h3 className="mt-1 text-[14px] font-semibold text-ink">{m.titulo}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">{m.descricao}</p>
                <p className="mt-3 border-t border-stone-100 pt-2.5 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  <strong className="text-stone-700 dark:text-stone-300">Como se mede:</strong> {m.medida}
                </p>
              </li>
            ))}
          </ol>
        </Seccao>

        {/* ── 14 · Riscos ──────────────────────────────────────────────── */}
        <Seccao
          id="riscos"
          eyebrow="Riscos"
          titulo="Os cinco que nos tiram o sono."
          descricao="Uma página de investimento sem riscos é publicidade. Estes são os nossos, com o que estamos a fazer sobre cada um."
        >
          <ul className="grid gap-4 sm:grid-cols-2">
            {RISCOS.map((r) => (
              <li key={r.id} className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900">
                <h3 className="text-[14px] font-semibold text-ink">{r.titulo}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">{r.descricao}</p>
                <p className="mt-3 border-t border-stone-100 pt-2.5 text-[12px] leading-relaxed text-stone-600 dark:border-stone-800 dark:text-stone-400">
                  <strong className="text-stone-800 dark:text-stone-200">Mitigação:</strong> {r.mitigacao}
                </p>
              </li>
            ))}
          </ul>
        </Seccao>

        {/* ── 15 · Contacto + legal ────────────────────────────────────── */}
        <Seccao
          id="contacto"
          tom="branco"
          eyebrow="Próximo passo"
          titulo="Peça o deck."
          descricao={`Um formulário curto. Respondemos ${SLA_RESPOSTA}, com o deck e uma proposta de conversa de 25 minutos. Sem NDA para o primeiro contacto.`}
        >
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
            <FormularioInteresse />

            <div className="space-y-5">
              <div className="rounded-3xl border border-stone-200/80 bg-stone-50/60 p-5 dark:border-stone-700 dark:bg-stone-800/40">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Nota de privacidade para investidores
                </h3>
                <dl className="mt-3 space-y-2 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
                  <LinhaFicha termo="Finalidade" valor={NOTA_PRIVACIDADE.finalidade} />
                  <LinhaFicha termo="Base legal" valor={NOTA_PRIVACIDADE.baseLegal} />
                  <LinhaFicha termo="Quem trata" valor={NOTA_PRIVACIDADE.destinatarios} />
                  <LinhaFicha termo="Conservação" valor={NOTA_PRIVACIDADE.conservacao} />
                  <LinhaFicha termo="Direitos" valor={NOTA_PRIVACIDADE.direitos} />
                </dl>
                <p className="mt-3 text-[12px] text-stone-500 dark:text-stone-400">
                  Versão {NOTA_PRIVACIDADE.versao} ·{" "}
                  <a href="/privacidade#investidores" className="font-semibold text-brand-dark underline underline-offset-2 dark:text-brand-mint">
                    política completa
                  </a>{" "}
                  ·{" "}
                  <a href={`mailto:${EMAIL_INVESTIDORES}`} className="font-semibold text-brand-dark underline underline-offset-2 dark:text-brand-mint">
                    {EMAIL_INVESTIDORES}
                  </a>
                </p>
              </div>

              <div className="rounded-3xl border border-stone-200/80 p-5 dark:border-stone-700">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Aviso
                </h3>
                <p className="mt-3 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
                  {AVISO_INVESTIMENTO}
                </p>
              </div>
            </div>
          </div>
        </Seccao>
      </main>
      <Footer />
    </>
  );
}

function LinhaFicha({ termo, valor }: { termo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="shrink-0 font-semibold text-stone-700 dark:text-stone-300">{termo}:</dt>
      <dd className="text-stone-600 dark:text-stone-400">{valor}</dd>
    </div>
  );
}
