"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Editor do perfil fiscal.
//
//  As preferências existiam no armazenamento mas não havia por onde as
//  editar (RC-P1-01): os guardiões e a estimativa de IRS recebiam valores por
//  omissão e apresentavam-nos como se fossem da pessoa. Este ecrã é o que
//  torna "não sei" numa resposta que se pode dar — e mudar.
//
//  Cada campo diz porque existe: um formulário fiscal sem explicação é um
//  interrogatório.
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from "react";
import { usePreferenciasFiscais, type PreferenciasFiscais, type TresEstados } from "@/lib/store/preferencias-fiscais";
import { IAS, SS_ACUMULACAO_LIMITE_MENSAL } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";
import { Check, Warning } from "@/components/ui/Icons";
import InfoTip from "@/components/ui/InfoTip";

const CAMPO =
  "w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 transition-colors " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 " +
  "dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100";

const OPCOES_TRES: { valor: TresEstados; label: string }[] = [
  { valor: "sim", label: "Sim" },
  { valor: "nao", label: "Não" },
  { valor: "nao-sei", label: "Não sei" },
];

export default function PerfilFiscalEditor() {
  const { prefs, atualizar, carregado, naNuvem } = usePreferenciasFiscais();
  const [estado, setEstado] = useState<{ tipo: "inativo" | "a-guardar" | "guardado" | "erro"; msg?: string }>({
    tipo: "inativo",
  });

  // Só se diz "Guardado" depois de a gravação confirmar (RC-P0-03).
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

  if (!carregado) {
    return <div className="h-64 animate-pulse rounded-4xl border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900" />;
  }

  const numeroOuNulo = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  return (
    <section className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Perfil fiscal</h2>
        <span aria-live="polite" className="text-xs font-medium">
          {estado.tipo === "a-guardar" && <span className="text-stone-400">A guardar…</span>}
          {estado.tipo === "guardado" && (
            <span className="inline-flex items-center gap-1 text-brand"><Check size={12} /> Guardado</span>
          )}
          {estado.tipo === "erro" && (
            <span className="inline-flex items-center gap-1 text-alert-text"><Warning size={12} /> {estado.msg}</span>
          )}
        </span>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        É daqui que os guardiões e a estimativa de IRS tiram as tuas condições. Sem estes campos, o painel tem de
        supor — e preferimos dizer-te que não sabemos.{" "}
        {naNuvem ? "Fica sincronizado na tua conta." : "Fica guardado neste dispositivo."}
      </p>

      <div className="space-y-6">
        {/* ── Atividade ─────────────────────────────────────────────── */}
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">Atividade</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="pf-inicio"
              label="Início de atividade"
              ajuda="A isenção de Segurança Social do primeiro ano conta 12 meses a partir desta data — não de um ano civil."
            >
              <input
                id="pf-inicio"
                type="date"
                className={CAMPO}
                value={prefs.dataInicioAtividade}
                onChange={(e) => gravar({ dataInicioAtividade: e.target.value })}
              />
            </Campo>

            <Campo id="pf-regime-cont" label="Regime de contabilidade">
              <select
                id="pf-regime-cont"
                className={CAMPO}
                value={prefs.regimeContabilidade}
                onChange={(e) => gravar({ regimeContabilidade: e.target.value as PreferenciasFiscais["regimeContabilidade"] })}
              >
                <option value="simplificado">Regime simplificado</option>
                <option value="organizada">Contabilidade organizada</option>
              </select>
            </Campo>

            <Campo id="pf-atividade-aberta" label="Tens atividade aberta?">
              <select
                id="pf-atividade-aberta"
                className={CAMPO}
                value={prefs.atividadeAberta ? "sim" : "nao"}
                onChange={(e) => gravar({ atividadeAberta: e.target.value === "sim" })}
              >
                <option value="sim">Sim, estou inscrito como independente</option>
                <option value="nao">Não</option>
              </select>
            </Campo>

            <Campo id="pf-jovem" label="Ano do IRS Jovem" ajuda="0 se não beneficias do IRS Jovem.">
              <input
                id="pf-jovem"
                type="number"
                min={0}
                max={10}
                className={CAMPO}
                value={prefs.irsJovemAno}
                onChange={(e) => gravar({ irsJovemAno: Number(e.target.value) || 0 })}
              />
            </Campo>
          </div>
        </fieldset>

        {/* ── IVA ───────────────────────────────────────────────────── */}
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">IVA</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="pf-regime-iva"
              label="Regime de IVA"
              ajuda="Sem isto, o guardião de IVA não te pode dizer onde estás face ao limite do Art. 53.º."
            >
              <select
                id="pf-regime-iva"
                className={CAMPO}
                value={prefs.regimeIVA}
                onChange={(e) => gravar({ regimeIVA: e.target.value as PreferenciasFiscais["regimeIVA"] })}
              >
                <option value="desconhecido">Não sei</option>
                <option value="isento">Isento (Art. 53.º)</option>
                <option value="normal-trimestral">Regime normal — trimestral</option>
                <option value="normal-mensal">Regime normal — mensal</option>
              </select>
            </Campo>

            <Campo
              id="pf-ano-anterior"
              label="Faturação do ano anterior"
              ajuda="A isenção do Art. 53.º afere-se pelo volume de negócios do ano anterior, não pelo deste ano."
            >
              <input
                id="pf-ano-anterior"
                type="number"
                min={0}
                step="0.01"
                placeholder="Deixa vazio se não souberes"
                className={CAMPO}
                defaultValue={prefs.faturacaoAnoAnterior ?? ""}
                onBlur={(e) => gravar({ faturacaoAnoAnterior: numeroOuNulo(e.target.value) })}
              />
            </Campo>
          </div>
        </fieldset>

        {/* ── Retenção na fonte ─────────────────────────────────────── */}
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">Retenção na fonte</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTresEstados
              id="pf-dispensa"
              label="Optaste pela dispensa de retenção?"
              ajuda="A dispensa é facultativa: estar abaixo dos 15 000 € dá-te o direito, mas só vale se a exerceres."
              valor={prefs.optouDispensaRetencao}
              onChange={(v) => gravar({ optouDispensaRetencao: v })}
            />
            <CampoTresEstados
              id="pf-pc"
              label="Tens pagamentos por conta liquidados?"
              ajuda="Só quem a AT notificou é que os deve pagar em julho, setembro e dezembro."
              valor={prefs.pagamentosPorConta}
              onChange={(v) => gravar({ pagamentosPorConta: v })}
            />
          </div>
        </fieldset>

        {/* ── Segurança Social ──────────────────────────────────────── */}
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">Segurança Social</legend>
          <label className="mb-3 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-stone-300 text-brand focus:ring-brand"
              checked={prefs.acumulaEmprego}
              onChange={(e) => gravar({ acumulaEmprego: e.target.checked })}
            />
            <span className="text-sm text-stone-700 dark:text-stone-300">
              Acumulo trabalho independente com trabalho por conta de outrem
            </span>
          </label>

          {prefs.acumulaEmprego && (
            <div className="grid gap-4 rounded-2xl bg-stone-50 p-4 sm:grid-cols-2 dark:bg-stone-800/50">
              <p className="text-xs leading-relaxed text-stone-500 sm:col-span-2 dark:text-stone-400">
                A dispensa do Art. 157.º não é automática. Depende de estas condições estarem TODAS cumpridas —
                por isso perguntamos em vez de assumir.
              </p>
              <CampoTresEstados
                id="pf-entidades"
                label="Empregador e cliente são entidades distintas?"
                ajuda="Não pode haver relação de domínio ou de grupo entre elas."
                valor={prefs.acumulacaoEntidadesDistintas}
                onChange={(v) => gravar({ acumulacaoEntidadesDistintas: v })}
              />
              <Campo
                id="pf-remuneracao"
                label="Remuneração mensal do trabalho dependente"
                ajuda={`Tem de ser igual ou superior a 1 × IAS (${fmt(IAS.value)}).`}
              >
                <input
                  id="pf-remuneracao"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Deixa vazio se não souberes"
                  className={CAMPO}
                  defaultValue={prefs.remuneracaoDependenteMensal ?? ""}
                  onBlur={(e) => gravar({ remuneracaoDependenteMensal: numeroOuNulo(e.target.value) })}
                />
              </Campo>
              <Campo
                id="pf-rend-a"
                label="Rendimento anual da categoria A"
                ajuda="É este valor que permite calcular o teu escalão de IRS. Sem ele, a estimativa fica em aberto."
              >
                <input
                  id="pf-rend-a"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Deixa vazio se não souberes"
                  className={CAMPO}
                  defaultValue={prefs.rendimentoCategoriaA ?? ""}
                  onBlur={(e) => gravar({ rendimentoCategoriaA: numeroOuNulo(e.target.value) })}
                />
              </Campo>
              <p className="text-[11px] leading-relaxed text-stone-400 sm:col-span-2">
                Acima de 4 × IAS ({fmt(SS_ACUMULACAO_LIMITE_MENSAL.value)}/mês de rendimento relevante) contribuis
                sobre o excedente, mesmo cumprindo as restantes condições.
              </p>
            </div>
          )}
        </fieldset>

        {/* ── Agregado familiar ─────────────────────────────────────── */}
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">Agregado familiar</legend>
          <label className="mb-3 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-stone-300 text-brand focus:ring-brand"
              checked={prefs.conjunta}
              onChange={(e) => gravar({ conjunta: e.target.checked })}
            />
            <span className="text-sm text-stone-700 dark:text-stone-300">Tributação conjunta</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {prefs.conjunta && (
              <Campo
                id="pf-conjuge"
                label="Rendimento anual do cônjuge"
                ajuda="Na tributação conjunta o escalão depende do rendimento dos dois. Sem este valor não conseguimos estimar."
              >
                <input
                  id="pf-conjuge"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Deixa vazio se não souberes"
                  className={CAMPO}
                  defaultValue={prefs.rendimentoConjuge ?? ""}
                  onBlur={(e) => gravar({ rendimentoConjuge: numeroOuNulo(e.target.value) })}
                />
              </Campo>
            )}
            <Campo id="pf-dependentes" label="Dependentes">
              <input
                id="pf-dependentes"
                type="number"
                min={0}
                max={30}
                className={CAMPO}
                value={prefs.dependentes}
                onChange={(e) => gravar({ dependentes: Number(e.target.value) || 0 })}
              />
            </Campo>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([
              ["despSaude", "Despesas de saúde"],
              ["despEducacao", "Despesas de educação"],
              ["despGerais", "Despesas gerais familiares"],
              ["despRendas", "Rendas de habitação"],
            ] as const).map(([chave, label]) => (
              <Campo key={chave} id={`pf-${chave}`} label={label}>
                <input
                  id={`pf-${chave}`}
                  type="number"
                  min={0}
                  step="0.01"
                  className={CAMPO}
                  defaultValue={prefs[chave]}
                  onBlur={(e) => gravar({ [chave]: Number(e.target.value.replace(",", ".")) || 0 })}
                />
              </Campo>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-stone-300 text-brand focus:ring-brand"
                checked={prefs.deficiencia}
                onChange={(e) => gravar({ deficiencia: e.target.checked })}
              />
              <span className="text-sm text-stone-700 dark:text-stone-300">Deficiência com grau ≥ 60%</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-stone-300 text-brand focus:ring-brand"
                checked={prefs.ifici}
                onChange={(e) => gravar({ ifici: e.target.checked })}
              />
              <span className="text-sm text-stone-700 dark:text-stone-300">IFICI (ex-RNH)</span>
            </label>
          </div>
        </fieldset>
      </div>
    </section>
  );
}

function Campo({
  id,
  label,
  ajuda,
  children,
}: {
  id: string;
  label: string;
  ajuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1 text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
        {ajuda && <InfoTip>{ajuda}</InfoTip>}
      </label>
      {children}
    </div>
  );
}

function CampoTresEstados({
  id,
  label,
  ajuda,
  valor,
  onChange,
}: {
  id: string;
  label: string;
  ajuda?: string;
  valor: TresEstados;
  onChange: (v: TresEstados) => void;
}) {
  return (
    <Campo id={id} label={label} ajuda={ajuda}>
      <select id={id} className={CAMPO} value={valor} onChange={(e) => onChange(e.target.value as TresEstados)}>
        {OPCOES_TRES.map((o) => (
          <option key={o.valor} value={o.valor}>{o.label}</option>
        ))}
      </select>
    </Campo>
  );
}
