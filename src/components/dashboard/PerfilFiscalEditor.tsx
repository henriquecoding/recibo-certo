"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Editor do perfil fiscal
//  ---------------------------------------------------------------------
//  As preferências existiam no armazenamento mas não havia por onde as
//  editar (RC-P1-01): os guardiões e a estimativa de IRS recebiam valores
//  por omissão e apresentavam-nos como se fossem da pessoa.
//
//  O primeiro editor resolveu isso e trouxe outro problema: dezoito campos
//  do mesmo tamanho, numa grelha plana, quase todos menus cinzentos e
//  contadores a mostrar «0». Não se percebia o que faltava, o que cada
//  resposta servia, nem se alguma coisa tinha sido gravada — o estado de
//  gravação era uma palavra de doze pixels no canto.
//
//  Agora:
//   · cada secção é um cartão com o que destranca e quantas perguntas lhe
//     faltam — a barra de progresso conta perguntas REAIS, aplicáveis ao
//     caso concreto, e não campos de um formulário genérico;
//   · «não sei» continua a ser resposta legítima, mas visível;
//   · o estado de gravação é uma faixa fixa, não um sussurro.
//
//  EXIGE SESSÃO. É um perfil: são condições pessoais que determinam
//  reservas de imposto e que a pessoa espera reencontrar. Guardá-las só
//  neste browser era prometer memória e perdê-la na primeira limpeza de
//  dados. As calculadoras continuam a funcionar sem conta — isto não é uma
//  calculadora.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth";
import {
  usePreferenciasFiscais, type PreferenciasFiscais,
} from "@/lib/store/preferencias-fiscais";
import { IAS, SS_ACUMULACAO_LIMITE_MENSAL } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";
import {
  Check, Warning, Lock, Spinner, Calendar, Receipt, Coin, ShieldCheck, Home, Cloud,
} from "@/components/ui/Icons";
import {
  CAMPO_BASE, Rotulo, EscolhaTresEstados, CampoMoeda, CampoContagem, Interruptor,
} from "./perfil-fiscal/campos";
import { SECCOES, completude, type IdSeccao } from "./perfil-fiscal/completude";

const ICONES: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Calendar, Receipt, Coin, ShieldCheck, Home,
};

type EstadoGravacao =
  | { tipo: "inativo" }
  | { tipo: "a-guardar" }
  | { tipo: "guardado" }
  | { tipo: "erro"; msg: string };

export default function PerfilFiscalEditor() {
  const { user, carregado: authCarregado, abrirModal, disponivel } = useAuth();

  if (!authCarregado) return <Esqueleto />;
  if (disponivel && !user) return <PortaFechada onEntrar={() => abrirModal("entrar")} />;
  return <Editor />;
}

/* ─── Porta fechada ────────────────────────────────────────────────── */

function PortaFechada({ onEntrar }: { onEntrar: () => void }) {
  return (
    <section className="overflow-hidden rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="border-b border-stone-100 bg-stone-50 px-6 py-8 text-center dark:border-stone-800 dark:bg-stone-800/40 sm:px-8 sm:py-10">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
          <Lock size={20} />
        </span>
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 sm:text-2xl">
          O perfil fiscal precisa de sessão iniciada
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Aqui guardas condições pessoais — início de atividade, regime de IVA, agregado, rendimentos
          do casal. É o que faz o painel falar de ti em vez de falar de uma pessoa média, e é o tipo
          de coisa que tens de reencontrar quando voltares.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onEntrar}
            className="btn-shine inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float sm:w-auto"
          >
            Entrar ou criar conta
          </button>
          <Link
            href="/ferramentas"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand dark:border-stone-700 dark:text-stone-300 sm:w-auto"
          >
            Usar as calculadoras sem conta
          </Link>
        </div>
      </div>
      <div className="px-6 py-5 sm:px-8">
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          Criar conta é gratuito. As calculadoras, os simuladores e os guias continuam a funcionar sem
          sessão e sem registo — o que muda com a conta é teres um perfil que persiste e, no plano
          Plus, sincroniza entre dispositivos.
        </p>
      </div>
    </section>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-28 animate-pulse rounded-4xl border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900" />
      <div className="h-56 animate-pulse rounded-4xl border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900" />
    </div>
  );
}

/* ─── Editor ───────────────────────────────────────────────────────── */

function Editor() {
  const { prefs, atualizar, carregado, naNuvem } = usePreferenciasFiscais();
  const [estado, setEstado] = useState<EstadoGravacao>({ tipo: "inativo" });

  // Só se diz «Guardado» depois de a gravação confirmar (RC-P0-03).
  const gravar = useCallback(
    async (patch: Partial<PreferenciasFiscais>) => {
      setEstado({ tipo: "a-guardar" });
      const r = await atualizar(patch);
      if (r.ok) {
        setEstado({ tipo: "guardado" });
        setTimeout(() => setEstado((e) => (e.tipo === "guardado" ? { tipo: "inativo" } : e)), 2500);
      } else {
        setEstado({ tipo: "erro", msg: r.erro.mensagem });
      }
    },
    [atualizar],
  );

  const estadoCompletude = useMemo(() => completude(prefs), [prefs]);

  if (!carregado) return <Esqueleto />;

  const { faltas, respondidas, total, percentagem, completo, porResponderTotal } = estadoCompletude;

  return (
    <div className="space-y-4">
      {/* ── Cabeçalho: progresso real e estado de gravação ──────────── */}
      <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
              Perfil fiscal
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              É daqui que os guardiões e a estimativa de IRS tiram as tuas condições. Sem estes
              campos, o painel tem de supor — e preferimos dizer-te que não sabemos.
            </p>
          </div>
          <EtiquetaGravacao estado={estado} />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-semibold text-stone-700 dark:text-stone-300">
              {completo ? "Perfil completo" : `${respondidas} de ${total} respondidas`}
            </span>
            <span className="text-[13px] font-bold tabular-nums text-brand">{percentagem}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={percentagem}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Perguntas do perfil fiscal respondidas"
            className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500"
              style={{ width: `${percentagem}%` }}
            />
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {completo
              ? "Nada por responder. O painel usa as tuas condições reais em todos os avisos."
              : `Faltam ${porResponderTotal} ${porResponderTotal === 1 ? "resposta" : "respostas"}. Enquanto faltarem, o painel diz que não sabe em vez de arriscar um número.`}
          </p>
        </div>

        <p className="mt-4 flex items-start gap-2 border-t border-stone-100 pt-4 text-xs leading-relaxed text-stone-500 dark:border-stone-800 dark:text-stone-400">
          <Cloud size={14} className="mt-0.5 flex-shrink-0 text-stone-400" />
          {naNuvem ? (
            <span>Sincronizado na tua conta, em todos os dispositivos.</span>
          ) : (
            <span>
              Guardado na tua conta neste dispositivo. Sincronizar entre dispositivos faz parte do{" "}
              <Link href="/precos" className="font-semibold text-brand underline-offset-2 hover:underline">
                plano Plus
              </Link>
              .
            </span>
          )}
        </p>
      </section>

      {/* ── Secções ──────────────────────────────────────────────────── */}
      <Seccao id="atividade" faltas={faltas}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Rotulo
            htmlFor="pf-inicio"
            label="Início de atividade"
            ajuda="A isenção de Segurança Social do primeiro ano conta 12 meses a partir desta data — não de um ano civil."
          >
            <input
              id="pf-inicio"
              type="date"
              className={CAMPO_BASE}
              value={prefs.dataInicioAtividade}
              onChange={(e) => gravar({ dataInicioAtividade: e.target.value })}
            />
          </Rotulo>

          <Rotulo htmlFor="pf-regime-cont" label="Regime de contabilidade">
            <select
              id="pf-regime-cont"
              className={CAMPO_BASE}
              value={prefs.regimeContabilidade}
              onChange={(e) =>
                gravar({ regimeContabilidade: e.target.value as PreferenciasFiscais["regimeContabilidade"] })
              }
            >
              <option value="simplificado">Regime simplificado</option>
              <option value="organizada">Contabilidade organizada</option>
            </select>
          </Rotulo>

          <div className="sm:col-span-2">
            <Interruptor
              label="Tenho atividade aberta nas Finanças"
              descricao="Estás inscrito como trabalhador independente."
              ativo={prefs.atividadeAberta}
              onChange={(v) => gravar({ atividadeAberta: v })}
            />
          </div>

          <CampoContagem
            label="Ano do IRS Jovem"
            ajuda="Em que ano de benefício estás. Zero se não beneficias do IRS Jovem."
            valor={prefs.irsJovemAno}
            onChange={(v) => gravar({ irsJovemAno: v })}
            max={10}
            sufixo={prefs.irsJovemAno === 0 ? "Não beneficio do IRS Jovem" : `${prefs.irsJovemAno}.º de 10 anos`}
          />
        </div>
      </Seccao>

      <Seccao id="iva" faltas={faltas}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Rotulo
            htmlFor="pf-regime-iva"
            label="Regime de IVA"
            ajuda="Sem isto, o guardião de IVA não te pode dizer onde estás face ao limite do Art. 53.º."
          >
            <select
              id="pf-regime-iva"
              className={CAMPO_BASE}
              value={prefs.regimeIVA}
              onChange={(e) => gravar({ regimeIVA: e.target.value as PreferenciasFiscais["regimeIVA"] })}
            >
              <option value="desconhecido">Não sei</option>
              <option value="isento">Isento (Art. 53.º)</option>
              <option value="normal-trimestral">Regime normal — trimestral</option>
              <option value="normal-mensal">Regime normal — mensal</option>
            </select>
          </Rotulo>

          <CampoMoeda
            label="Faturação do ano anterior"
            ajuda="A isenção do Art. 53.º afere-se pelo volume de negócios do ano anterior, não pelo deste ano."
            valor={prefs.faturacaoAnoAnterior}
            onGravar={(v) => gravar({ faturacaoAnoAnterior: v })}
          />
        </div>
      </Seccao>

      <Seccao id="retencao" faltas={faltas}>
        <div className="grid gap-5 sm:grid-cols-2">
          <EscolhaTresEstados
            label="Optaste pela dispensa de retenção?"
            ajuda="A dispensa é facultativa: estar abaixo dos 15 000 € dá-te o direito, mas só vale se a exerceres."
            valor={prefs.optouDispensaRetencao}
            onChange={(v) => gravar({ optouDispensaRetencao: v })}
          />
          <EscolhaTresEstados
            label="Tens pagamentos por conta liquidados?"
            ajuda="Só quem a AT notificou é que os deve pagar em julho, setembro e dezembro."
            valor={prefs.pagamentosPorConta}
            onChange={(v) => gravar({ pagamentosPorConta: v })}
          />
        </div>
      </Seccao>

      <Seccao id="seguranca-social" faltas={faltas}>
        <Interruptor
          label="Acumulo trabalho independente com trabalho por conta de outrem"
          descricao="Se acumulas, podes estar dispensado de contribuir — mas só se três condições estiverem cumpridas."
          ativo={prefs.acumulaEmprego}
          onChange={(v) => gravar({ acumulaEmprego: v })}
        />

        {prefs.acumulaEmprego ? (
          <div className="mt-4 space-y-4 rounded-3xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/40 sm:p-5">
            <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              A dispensa do Art. 157.º não é automática. Depende de estas condições estarem TODAS
              cumpridas — por isso perguntamos em vez de assumir.
            </p>
            <EscolhaTresEstados
              label="Empregador e cliente são entidades distintas?"
              ajuda="Não pode haver relação de domínio ou de grupo entre elas."
              valor={prefs.acumulacaoEntidadesDistintas}
              onChange={(v) => gravar({ acumulacaoEntidadesDistintas: v })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoMoeda
                label="Remuneração mensal do trabalho dependente"
                ajuda={`Tem de ser igual ou superior a 1 × IAS (${fmt(IAS.value)}).`}
                valor={prefs.remuneracaoDependenteMensal}
                onGravar={(v) => gravar({ remuneracaoDependenteMensal: v })}
              />
              <CampoMoeda
                label="Rendimento anual da categoria A"
                ajuda="É este valor que permite calcular o teu escalão de IRS. Sem ele, a estimativa fica em aberto."
                valor={prefs.rendimentoCategoriaA}
                onGravar={(v) => gravar({ rendimentoCategoriaA: v })}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-stone-400">
              Acima de 4 × IAS ({fmt(SS_ACUMULACAO_LIMITE_MENSAL.value)}/mês de rendimento relevante)
              contribuis sobre o excedente, mesmo cumprindo as restantes condições.
            </p>
          </div>
        ) : null}
      </Seccao>

      <Seccao id="agregado" faltas={faltas}>
        <div className="space-y-4">
          <Interruptor
            label="Tributação conjunta"
            descricao="Na tributação conjunta o escalão depende do rendimento dos dois."
            ativo={prefs.conjunta}
            onChange={(v) => gravar({ conjunta: v })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {prefs.conjunta ? (
              <CampoMoeda
                label="Rendimento anual do cônjuge"
                ajuda="Sem este valor não conseguimos estimar o escalão do agregado."
                valor={prefs.rendimentoConjuge}
                onGravar={(v) => gravar({ rendimentoConjuge: v })}
              />
            ) : null}
            <CampoContagem
              label="Dependentes"
              valor={prefs.dependentes}
              onChange={(v) => gravar({ dependentes: v })}
              max={30}
            />
          </div>

          <div>
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Despesas dedutíveis do ano
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ["despSaude", "Despesas de saúde"],
                ["despEducacao", "Despesas de educação"],
                ["despGerais", "Despesas gerais familiares"],
                ["despRendas", "Rendas de habitação"],
              ] as const).map(([chave, label]) => (
                <CampoMoeda
                  key={chave}
                  label={label}
                  valor={prefs[chave] || null}
                  placeholder="0"
                  onGravar={(v) => gravar({ [chave]: v ?? 0 })}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Interruptor
              label="Deficiência com grau ≥ 60%"
              ativo={prefs.deficiencia}
              onChange={(v) => gravar({ deficiencia: v })}
            />
            <Interruptor
              label="IFICI (ex-RNH)"
              descricao="Incompatível com o IRS Jovem."
              ativo={prefs.ifici}
              onChange={(v) => gravar({ ifici: v })}
            />
          </div>
        </div>
      </Seccao>
    </div>
  );
}

/* ─── Peças ────────────────────────────────────────────────────────── */

function EtiquetaGravacao({ estado }: { estado: EstadoGravacao }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold";
  return (
    <span aria-live="polite" className="flex-shrink-0">
      {estado.tipo === "a-guardar" && (
        <span className={`${base} bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400`}>
          <Spinner size={12} /> A guardar…
        </span>
      )}
      {estado.tipo === "guardado" && (
        <span className={`${base} bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand`}>
          <Check size={12} /> Guardado
        </span>
      )}
      {estado.tipo === "erro" && (
        <span className={`${base} bg-alert-bg text-alert-text`}>
          <Warning size={12} /> {estado.msg}
        </span>
      )}
    </span>
  );
}

function Seccao({
  id, faltas, children,
}: {
  id: IdSeccao;
  faltas: Record<IdSeccao, string[]>;
  children: React.ReactNode;
}) {
  const meta = SECCOES.find((s) => s.id === id)!;
  const Icone = ICONES[meta.icone] ?? Calendar;
  const emFalta = faltas[id];

  return (
    <section
      aria-labelledby={`pf-${id}`}
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
          <Icone size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`pf-${id}`} className="text-[15px] font-semibold text-stone-800 dark:text-stone-100">
              {meta.titulo}
            </h3>
            {emFalta.length > 0 ? (
              <span className="rounded-full bg-alert-bg px-2 py-0.5 text-[11px] font-bold text-alert-text">
                {emFalta.length} por responder
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-bold text-brand-dark dark:bg-brand/15 dark:text-brand">
                <Check size={10} /> Completa
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {meta.destranca}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}
