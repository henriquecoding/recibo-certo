import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FizLogo, { FizMarca } from "@/components/fiz/FizLogo";
import { Check, Warning, Lock, ArrowLeft } from "@/components/ui/Icons";
import { FIZ_GUIDE_ROUTES, GUIAS_SEM_ACAO_FIZ, MANIFESTO_ROTAS_META } from "@/content/fiz-guide-routes";
import { FIZ_SIMULATOR_ROUTES, SIMULADORES_SEM_ACAO_FIZ, META_ROTAS_SIMULADORES } from "@/content/fiz-simulator-routes";
import { CAMPOS_NUNCA_ENVIADOS } from "@/lib/fiz/handoff-fields";
import FizPlanoAcao from "@/components/fiz/FizPlanoAcao";
import FizNextStep from "@/components/fiz/FizNextStep";
import FizConnectionCard from "@/components/fiz/FizConnectionCard";

// ─────────────────────────────────────────────────────────────────────────
//  Destino do handoff em modo de pré-visualização.
//
//  Em produção o utilizador seria levado para a FIZ. Em pré-visualização é
//  trazido aqui, para ficar inequívoco que nada foi enviado — e para poder
//  ver, num só sítio, o mapa completo do que foi desenhado.
//
//  Página interna de revisão: fora do sitemap e não indexável.
// ─────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Pré-visualização da integração FIZ",
  description: "Mapa da integração planeada entre o ReciboCerto e a FIZ. Página interna de revisão.",
  robots: { index: false, follow: false },
};

const MODO: Record<string, string> = {
  NO_DATA: "Sem dados",
  CONSENTED_HANDOFF: "Envio consentido",
  CONNECTED_ACCOUNT: "Conta ligada",
};

function Cartao({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-3xl border border-fiz-200 bg-white p-4 dark:bg-stone-900">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{titulo}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{nota}</p>}
    </div>
  );
}

export default function PreVisualizacaoFizPage() {
  return (
    <>
      <Nav />
      <div className="min-h-screen bg-cream dark:bg-stone-950">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="mb-6 rounded-4xl border border-fiz-300 bg-fiz-50 p-5 sm:p-6">
            <div className="mb-2 flex items-center gap-2">
              <FizLogo size={28} className="rounded-lg" decorativo />
              <FizMarca size={16} />
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              Nada foi enviado. Isto é uma pré-visualização.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              Chegaste aqui porque a integração com a FIZ está em modo de revisão. Em produção,
              este passo abriria a FIZ com o contexto que tivesses autorizado. Enquanto a parceria
              não estiver fechada e validada pelas duas equipas, nenhum dado sai do ReciboCerto e
              nenhuma ação é executada.
            </p>
            <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-white px-3 py-2 text-xs leading-relaxed text-stone-600 dark:bg-stone-900 dark:text-stone-400">
              <Lock size={13} className="mt-0.5 flex-shrink-0 text-brand" />
              <span>
                Para desligar esta pré-visualização, basta remover{" "}
                <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">NEXT_PUBLIC_FIZ_PREVIEW</code>.
                Com credenciais reais configuradas, ela desliga-se sozinha.
              </span>
            </p>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Cartao titulo="Guias com ação" valor={String(MANIFESTO_ROTAS_META.comAcao)} nota={`${MANIFESTO_ROTAS_META.semAcao} sem ação, por decisão`} />
            <Cartao titulo="Simuladores" valor={String(META_ROTAS_SIMULADORES.comAcao)} nota={`${META_ROTAS_SIMULADORES.semAcao} sem ação, por decisão`} />
            <Cartao titulo="Rotas ativas" valor={String(MANIFESTO_ROTAS_META.ativas + META_ROTAS_SIMULADORES.ativas)} nota="Ativam-se no go-live" />
            <Cartao titulo="Contrato" valor={MANIFESTO_ROTAS_META.contractVersion} nota="Versão do OpenAPI" />
          </div>

          {/* Componentes reais, com dados de exemplo ─────────────────────
              Estes NÃO são mockups: são os mesmos componentes que aparecem
              no simulador, nos guias e no painel de conta, a resolver contra
              o catálogo local. Serve para rever o desenho sem ter de
              percorrer o assistente todo. */}
          <section className="mb-10">
            <h2 className="mb-1 font-display text-xl font-semibold text-ink">Como fica na prática</h2>
            <p className="mb-4 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Componentes reais, com valores de exemplo. Carrega em «Escolher o que enviar» para
              veres o ecrã de consentimento tal como o utilizador o verá.
            </p>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
              1 · Fim de um simulador
            </p>
            <FizPlanoAcao
              simulador="recibos-verdes"
              valores={{
                entityType: "INDIVIDUAL",
                activityCategory: "1319 · Programador informático",
                vatTerritory: "CONTINENTAL",
                vatRegimeEstimate: "EXEMPT_ART_53",
                period: "ANNUAL",
                grossEstimate: 18000,
                vatEstimate: 0,
                socialSecurityEstimate: 2696,
                irsEstimate: 1743,
              }}
              passosPreparacao={[
                "Atividade classificada e coeficiente confirmado.",
                "Regime de IVA e retenção na fonte determinados.",
                "Estimativa anual de IRS e Segurança Social calculada.",
              ]}
            />

            <p className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wider text-stone-400">
              2 · Fim de um guia
            </p>
            <FizNextStep slug="abrir-atividade" />

            <p className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wider text-stone-400">
              3 · Ligação de conta, no painel
            </p>
            <FizConnectionCard />
          </section>

          {/* Simuladores */}
          <section className="mb-8">
            <h2 className="mb-1 font-display text-xl font-semibold text-ink">Simuladores</h2>
            <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
              O que acontece depois de um resultado. O resumo da simulação é o que o handoff
              transporta — sempre campo a campo, escolhido pelo utilizador.
            </p>
            <div className="overflow-x-auto rounded-3xl border border-stone-200 dark:border-stone-700">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-stone-50 dark:bg-stone-800/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500">Simulador</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500">Ação</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500">Capacidade</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500">Modo</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500">Campos</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-stone-900">
                  {FIZ_SIMULATOR_ROUTES.map((r) => (
                    <tr key={r.simulador} className="border-t border-stone-100 dark:border-stone-800">
                      <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-stone-700 dark:text-stone-200">{r.nome}</th>
                      <td className="px-4 py-3 text-xs text-stone-600 dark:text-stone-400">{r.fallbackLabel}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-fiz-700">{r.requiredCapability}</td>
                      <td className="px-4 py-3 text-xs text-stone-500">{MODO[r.dataMode]}</td>
                      <td className="px-4 py-3 text-xs tabular-nums text-stone-500">{r.camposPropostos.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-3 space-y-1.5">
              {SIMULADORES_SEM_ACAO_FIZ.map((s) => (
                <li key={s.simulador} className="flex items-start gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  <Warning size={13} className="mt-0.5 flex-shrink-0 text-stone-400" />
                  <span><strong>{s.simulador}</strong> — {s.razao}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Guias */}
          <section className="mb-8">
            <h2 className="mb-1 font-display text-xl font-semibold text-ink">Guias</h2>
            <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
              Uma ação por Guia, resolvida por capacidade. Nenhum URL da FIZ escrito à mão.
            </p>
            <div className="overflow-x-auto rounded-3xl border border-stone-200 dark:border-stone-700">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-stone-50 dark:bg-stone-800/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500">Guia</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500">Intenção</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500">Capacidade</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500">Modo</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-stone-500">Revisão</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-stone-900">
                  {FIZ_GUIDE_ROUTES.map((r) => (
                    <tr key={r.guideSlug} className="border-t border-stone-100 dark:border-stone-800">
                      <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-stone-700 dark:text-stone-200">
                        <Link href={`/guias/${r.guideSlug}`} className="hover:text-brand hover:underline">{r.guideSlug}</Link>
                      </th>
                      <td className="px-4 py-3 font-mono text-[11px] text-stone-500">{r.intent}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-fiz-700">{r.destinationKey}</td>
                      <td className="px-4 py-3 text-xs text-stone-500">{MODO[r.dataMode]}</td>
                      <td className="px-4 py-3 text-xs">
                        {r.exigeRevisaoHumana ? (
                          <span className="inline-flex items-center gap-1 text-alert-text">
                            <Warning size={12} /> humana
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-3 space-y-1.5">
              {GUIAS_SEM_ACAO_FIZ.map((g) => (
                <li key={g.slug} className="flex items-start gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  <Warning size={13} className="mt-0.5 flex-shrink-0 text-stone-400" />
                  <span><strong>{g.slug}</strong> — {g.razao}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-8 rounded-3xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
            <h2 className="mb-2 font-display text-lg font-semibold text-ink">O que nunca sai daqui</h2>
            <p className="mb-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              Independentemente do que o utilizador autorize, estes dados não são transferidos em
              nenhum fluxo — e existe um teste que falha se alguém os acrescentar:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CAMPOS_NUNCA_ENVIADOS.map((c) => (
                <span key={c} className="rounded-lg bg-clay-bg px-2 py-1 text-xs font-medium text-clay-text">{c}</span>
              ))}
            </div>
            <ul className="mt-4 space-y-1.5">
              {[
                "Nenhum dado pessoal ou fiscal em query strings.",
                "Destinos limitados a domínios da FIZ, validados no servidor.",
                "Tokens delegados cifrados em repouso (AES-256-GCM).",
                "Enviar dados é gratuito — nunca se verifica o plano Plus.",
                "Uma falha da FIZ nunca inutiliza um guia ou um simulador.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                  <Check size={13} className="mt-0.5 flex-shrink-0 text-brand" />
                  {t}
                </li>
              ))}
            </ul>
          </section>

          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-200"
          >
            <ArrowLeft size={15} /> Voltar ao ReciboCerto
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
