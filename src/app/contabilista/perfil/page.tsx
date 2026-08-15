"use client";

// ═══════════════════════════════════════════════════════════════════════
//  PERFIL PROFISSIONAL — editor à esquerda, resultado à direita
//  ---------------------------------------------------------------------
//  Era um cartão-formulário vertical onde a apresentação, o site e o
//  concelho tinham o mesmo peso visual, e onde se editava sem nunca ver o
//  efeito. A §121.2 chama-lhe o problema principal: parecia uma área
//  administrativa em vez da construção de uma presença profissional.
//
//  A mudança estrutural é esta, e não trocar inputs:
//
//      FORMULÁRIO LONGO  →  EDITOR + PRÉ-VISUALIZAÇÃO + ESTADO
//
//  Cinco blocos com pesos diferentes (§126): identidade domina, áreas e
//  atendimento são adequação, contacto e disponibilidade são detalhe. À
//  direita, o que o cliente vai ver — derivado do RASCUNHO, sem um único
//  pedido de rede por tecla (§134, §154).
//
//  O que continua exatamente como estava, de propósito: o `slug` é
//  read-only porque está trancado por trigger (§144); o LinkedIn usa o
//  componente que já existe (§131); guardar é uma operação só, com o
//  rascunho preservado em erro (§145).
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import { usarPainel } from "@/components/contabilistas/usarPainel";
import { atualizarFicha } from "@/lib/contabilistas/fonte/dados";
import { DISTRITOS, ESPECIALIDADES } from "@/lib/contabilistas/catalogo";
import {
  COPY_CONTACTOS, IDIOMAS, checklistPerfil, completudeDoPerfil,
  type FichaDePerfil,
} from "@/lib/contabilistas/perfil";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import LinkedInConta from "@/components/contabilistas/LinkedInConta";
import PerfilPreview from "@/components/contabilistas/PerfilPreview";
import SelectMenu, { type OpcaoSelectMenu } from "@/components/ui/SelectMenu";
import { useAvisos } from "@/components/ui/Avisos";
import { Check, ExternalLink, Eye, Lock, User, Warning } from "@/components/ui/Icons";

interface Formulario {
  nome: string; occ: string; bio: string; distrito: string; concelho: string;
  email: string; telefone: string; website: string; aceita: boolean;
  especialidades: string[]; modalidades: string[];
  titulo: string; apresentacaoCurta: string; idiomas: string[];
  anosExperiencia: string; respostaHoras: string;
}

const OPCOES_DISTRITO: readonly OpcaoSelectMenu[] = [
  { value: "", label: "Sem distrito" },
  ...DISTRITOS.map((d) => ({ value: d, label: d })),
];

const VAZIO: Formulario = {
  nome: "", occ: "", bio: "", distrito: "", concelho: "",
  email: "", telefone: "", website: "", aceita: true,
  especialidades: [], modalidades: ["presencial", "online"],
  titulo: "", apresentacaoCurta: "", idiomas: [],
  anosExperiencia: "", respostaHoras: "",
};

export default function PerfilPage() {
  const { ficha, aCarregar, recarregar } = usarFicha();
  const painel = usarPainel();
  const avisos = useAvisos();
  const [f, setF] = useState<Formulario>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [porGuardar, setPorGuardar] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);

  /** Uma só porta para mudar o rascunho — e para saber que mudou. */
  function mudar(patch: Partial<Formulario>) {
    setPorGuardar(true);
    setF((x) => ({ ...x, ...patch }));
  }

  useEffect(() => {
    if (!ficha) return;
    setF({
      nome: ficha.nome, occ: ficha.occ ?? "", bio: ficha.bio,
      distrito: ficha.distrito ?? "", concelho: ficha.concelho ?? "",
      email: ficha.emailContacto ?? "", telefone: ficha.telefone ?? "",
      website: ficha.website ?? "", aceita: ficha.aceitaNovosClientes,
      especialidades: ficha.especialidades, modalidades: ficha.modalidades,
      titulo: ficha.tituloProfissional ?? "",
      apresentacaoCurta: ficha.apresentacaoCurta ?? "",
      idiomas: ficha.idiomas,
      anosExperiencia: ficha.anosExperiencia?.toString() ?? "",
      respostaHoras: ficha.respostaMediaHoras?.toString() ?? "",
    });
    setPorGuardar(false);
  }, [ficha]);

  /**
   * O rascunho, com a forma da ficha.
   *
   * É daqui que a pré-visualização deriva. Não há uma segunda estrutura
   * de dados montada à mão para o preview (§134) — o que se vê à direita
   * é o que fica guardado, com os mesmos campos e as mesmas regras.
   */
  const rascunho = useMemo<FichaDePerfil | null>(() => {
    if (!ficha) return null;
    return {
      ...ficha,
      nome: f.nome,
      occ: f.occ.trim() || null,
      bio: f.bio,
      distrito: f.distrito || null,
      concelho: f.concelho.trim() || null,
      especialidades: f.especialidades,
      modalidades: f.modalidades as FichaDePerfil["modalidades"],
      emailContacto: f.email.trim() || null,
      telefone: f.telefone.trim() || null,
      website: f.website.trim() || null,
      aceitaNovosClientes: f.aceita,
      tituloProfissional: f.titulo.trim() || null,
      apresentacaoCurta: f.apresentacaoCurta.trim() || null,
      idiomas: f.idiomas,
      anosExperiencia: numeroOuNulo(f.anosExperiencia),
      respostaMediaHoras: numeroOuNulo(f.respostaHoras),
      // Mudar o número OCC apaga a verificação — a base de dados faz isso
      // por trigger, e a pré-visualização tem de o mostrar antes de guardar.
      occVerificado: ficha.occVerificado && f.occ.trim() === (ficha.occ ?? ""),
    };
  }, [ficha, f]);

  const completude = useMemo(
    () => (rascunho ? completudeDoPerfil(rascunho) : null),
    [rascunho],
  );

  function alternar(lista: "especialidades" | "modalidades" | "idiomas", valor: string) {
    setPorGuardar(true);
    setF((x) => ({
      ...x,
      [lista]: x[lista].includes(valor) ? x[lista].filter((v) => v !== valor) : [...x[lista], valor],
    }));
  }

  async function guardar() {
    if (!ficha) return;
    setErro(null);
    if (f.nome.trim().length < 2) { setErro("O nome não pode ficar vazio."); return; }
    if (f.modalidades.length === 0) { setErro("Escolhe pelo menos uma modalidade de atendimento."); return; }

    setAGuardar(true);
    const { erro: e } = await atualizarFicha(ficha.userId, {
      nome: f.nome.trim(),
      occ: f.occ.trim() || null,
      bio: f.bio.trim(),
      distrito: f.distrito || null,
      concelho: f.concelho.trim() || null,
      especialidades: f.especialidades,
      modalidades: f.modalidades,
      email_contacto: f.email.trim() || null,
      telefone: f.telefone.trim() || null,
      website: f.website.trim() || null,
      aceita_novos_clientes: f.aceita,
      titulo_profissional: f.titulo.trim() || null,
      apresentacao_curta: f.apresentacaoCurta.trim() || null,
      idiomas: f.idiomas,
      anos_experiencia: numeroOuNulo(f.anosExperiencia),
      resposta_media_horas: numeroOuNulo(f.respostaHoras),
    });
    setAGuardar(false);
    // Em erro o rascunho fica onde está: perder o que se escreveu por causa
    // de uma falha de rede é o pior desfecho possível (§145).
    if (e) { setErro(e); return; }
    setPorGuardar(false);
    recarregar();
    avisos.sucesso("Perfil guardado.", {
      detalhe: f.aceita
        ? "É isto que os clientes veem no diretório."
        : "Continuas no diretório, mas sem aceitar novos clientes.",
    });
  }

  if (aCarregar) return <EsqueletoPainel forma="formulario" />;
  if (!ficha || !rascunho || !completude) return null;

  return (
    <div className="space-y-6">
      <CabecalhoPainel
        titulo="Perfil profissional"
        descricao="Controla o que os clientes veem antes de entrarem em contacto contigo."
        acao={
          // O diretório é público e real; o contabilista da demonstração não
          // existe lá. Abrir a ligação daria uma página não encontrada.
          painel.demonstracao ? (
            <span className="inline-flex min-h-[2.5rem] items-center rounded-xl border border-dashed border-stone-300 px-4 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
              Sem página pública: este perfil é simulado
            </span>
          ) : (
            <Link
              href={`/contabilistas/${ficha.slug}`}
              className="focus-marca inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-stone-600"
            >
              Ver como cliente <ExternalLink size={14} aria-hidden />
            </Link>
          )
        }
      />

      {/* Estado do perfil. O §127 pede uma superfície operacional, não um
          parágrafo informativo — publicado, vagas, e o que falta. */}
      <section
        aria-label="Estado do perfil"
        className="rounded-4xl border border-brand/20 bg-brand-light/40 p-5 dark:border-brand/25 dark:bg-brand/10 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Publicado</Badge>
              {rascunho.aceitaNovosClientes
                ? <Badge tone="brand">Aceita novos clientes</Badge>
                : <Badge tone="neutral">Sem novas vagas</Badge>}
            </div>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              É isto que aparece no diretório e na página onde os clientes te
              encontram. O endereço público é{" "}
              <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs dark:bg-stone-950/60">
                /contabilistas/{ficha.slug}
              </code>{" "}
              e só a administração o altera.
            </p>
          </div>

          <div className="w-full max-w-[16rem] shrink-0">
            <p className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold text-stone-700 dark:text-stone-200">
                {completude.rotulo}
              </span>
              <span className="shrink-0 tabular-nums text-stone-500 dark:text-stone-400">
                {completude.completos}/{completude.total}
              </span>
            </p>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70 dark:bg-stone-950/50"
              role="progressbar"
              aria-valuenow={completude.completos}
              aria-valuemin={0}
              aria-valuemax={completude.total}
              aria-label="Essenciais do perfil preenchidos"
            >
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${(completude.completos / completude.total) * 100}%` }}
              />
            </div>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {completude.essenciais.map((e) => (
                <li
                  key={e.id}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
                    e.completo
                      ? "bg-white text-brand-dark dark:bg-stone-950/70 dark:text-brand-mint"
                      : "bg-white/50 text-stone-500 dark:bg-stone-950/40 dark:text-stone-400"
                  }`}
                >
                  {e.completo
                    ? <Check size={11} className="text-brand" aria-hidden />
                    : <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />}
                  {e.rotulo}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text dark:bg-red-950/35 dark:text-red-200">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      {/* Editor à esquerda, resultado à direita. No telemóvel é um fluxo
          vertical com a pré-visualização no fim — não duas colunas
          comprimidas (§152). */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <Bloco numero={1} titulo="Identidade profissional" Icon={User}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Texto rotulo="Nome profissional" id="nome" valor={f.nome} onChange={(v) => mudar({ nome: v })} />
              <div>
                <Texto
                  rotulo="Nº de inscrição na OCC"
                  id="occ"
                  valor={f.occ}
                  onChange={(v) => mudar({ occ: v })}
                />
                {/* A §124 fecha esta porta: um número escrito aqui é
                    «informado». «Verificado» exige a administração. */}
                <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-stone-400 dark:text-stone-500">
                  <Lock size={12} className="mt-0.5 shrink-0" aria-hidden />
                  {rascunho.occVerificado
                    ? "Verificado pela administração. Mudar o número retira a verificação."
                    : "Aparece como «informado». A verificação é feita pela administração."}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Texto
                rotulo="Título profissional"
                id="titulo"
                valor={f.titulo}
                ajuda="Ex.: Contabilista Certificada"
                onChange={(v) => mudar({ titulo: v.slice(0, 80) })}
              />
              <Numero
                rotulo="Anos de experiência"
                id="anos"
                valor={f.anosExperiencia}
                max={60}
                ajuda="Declarado por ti. Não é calculado."
                onChange={(v) => mudar({ anosExperiencia: v })}
              />
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                Apresentação de uma linha
              </span>
              <span className="mt-0.5 block text-xs text-stone-400 dark:text-stone-500">
                É o que aparece no cartão do diretório. A apresentação completa vem a seguir.
              </span>
              <input
                value={f.apresentacaoCurta}
                onChange={(e) => mudar({ apresentacaoCurta: e.target.value.slice(0, 200) })}
                placeholder="Acompanho freelancers e pequenas empresas, o ano todo."
                className="focus-marca mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">Apresentação</span>
              <span className="mt-0.5 block text-xs text-stone-400 dark:text-stone-500">
                Com quem trabalhas? Em que situações és mais útil? Como costumas acompanhar?
              </span>
              <textarea
                value={f.bio}
                onChange={(e) => mudar({ bio: e.target.value.slice(0, 2000) })}
                rows={5}
                className="focus-marca mt-2 w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:border-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
              />
              {/* O contador só ganha destaque perto do limite (§128). */}
              <span
                className={`mt-1 block text-xs tabular-nums ${
                  f.bio.length > 1800 ? "font-semibold text-clay-text" : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {f.bio.length} / 2000
              </span>
            </label>
          </Bloco>

          <Bloco numero={2} titulo="Áreas de trabalho" Icon={Check}>
            <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              São estas as áreas por que os clientes filtram no diretório.
            </p>
            <fieldset className="mt-3">
              <legend className="sr-only">Áreas de trabalho</legend>
              <div className="flex flex-wrap gap-2">
                {ESPECIALIDADES.map((e) => {
                  const ativo = f.especialidades.includes(e);
                  return (
                    <button
                      key={e}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => alternar("especialidades", e)}
                      className={`inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                        ativo
                          ? "bg-brand text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                      }`}
                    >
                      {e}
                      {ativo && <Check size={13} aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </Bloco>

          <Bloco numero={3} titulo="Atendimento e território" Icon={User}>
            <fieldset>
              <legend className="text-sm font-semibold text-stone-700 dark:text-stone-200">Como atendes</legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(["presencial", "online"] as const).map((m) => {
                  const ativo = f.modalidades.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => alternar("modalidades", m)}
                      className={`min-h-[2.25rem] rounded-xl px-3.5 py-2 text-sm font-medium capitalize transition-colors ${
                        ativo
                          ? "bg-brand text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Desligar «presencial» não apaga o distrito nem o concelho —
                deixa é de os exigir. Reativar restaura o que estava (§130). */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label htmlFor="distrito-perfil" className="block">
                <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">Distrito</span>
                <SelectMenu
                  id="distrito-perfil"
                  value={f.distrito}
                  options={OPCOES_DISTRITO}
                  onChange={(value) => mudar({ distrito: value })}
                  ariaLabel="Distrito do perfil profissional"
                  className="mt-2"
                />
              </label>
              <Texto rotulo="Concelho" id="concelho" valor={f.concelho} onChange={(v) => mudar({ concelho: v })} />
            </div>

            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                Idiomas de atendimento
              </legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {IDIOMAS.map((i) => {
                  const ativo = f.idiomas.includes(i.codigo);
                  return (
                    <button
                      key={i.codigo}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => alternar("idiomas", i.codigo)}
                      className={`min-h-[2.25rem] rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                        ativo
                          ? "bg-brand text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                      }`}
                    >
                      {i.nome}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-4 max-w-xs">
              <Numero
                rotulo="Responde normalmente em"
                id="resposta"
                valor={f.respostaHoras}
                max={168}
                sufixo="horas"
                ajuda="Um compromisso teu, não uma medição da plataforma."
                onChange={(v) => mudar({ respostaHoras: v })}
              />
            </div>
          </Bloco>

          <Bloco numero={4} titulo="Contacto e presença digital" Icon={Lock}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Texto rotulo="Email de contacto" id="email" tipo="email" valor={f.email} onChange={(v) => mudar({ email: v })} />
              <Texto rotulo="Telefone" id="tel" tipo="tel" valor={f.telefone} onChange={(v) => mudar({ telefone: v })} />
            </div>
            <div className="mt-4">
              <Texto rotulo="Site" id="site" tipo="url" valor={f.website} onChange={(v) => mudar({ website: v })} />
            </div>

            {/* A frase tem de dizer a verdade sobre o esquema, e o esquema
                trata os dois campos de maneira diferente: o email está no
                contrato público, o telefone só sai a quem tem vínculo. */}
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-cream px-4 py-3 text-xs leading-relaxed text-stone-600 dark:bg-stone-950/60 dark:text-stone-300">
              <Lock size={13} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
              {COPY_CONTACTOS}
            </p>

            <div className="mt-4">
              <LinkedInConta contabilistaId={ficha.userId} />
            </div>
          </Bloco>

          <Bloco numero={5} titulo="Disponibilidade comercial" Icon={Check}>
            {/* Um checkbox no fundo do formulário não é uma decisão; é um
                detalhe. A §132 pede que isto seja uma escolha visível. */}
            <div role="radiogroup" aria-label="Disponibilidade para novos clientes" className="grid gap-2.5 sm:grid-cols-2">
              <Opcao
                escolhida={f.aceita}
                onClick={() => mudar({ aceita: true })}
                titulo="A aceitar novos clientes"
                texto="Os clientes podem pedir acompanhamento a partir do teu perfil."
              />
              <Opcao
                escolhida={!f.aceita}
                onClick={() => mudar({ aceita: false })}
                titulo="Sem novas vagas"
                texto="O perfil continua público, mas os pedidos ficam desativados. Quem já é teu cliente não é afetado."
              />
            </div>
          </Bloco>
        </div>

        {/* Pré-visualização. `lg:sticky` só a partir do desktop — no
            telemóvel é uma secção normal no fim do fluxo (§152). */}
        <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
            <Eye size={15} className="text-brand" aria-hidden />
            Pré-visualização pública
          </h2>
          <PerfilPreview ficha={rascunho} />

          <section className="mt-4 rounded-4xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
            <h3 className="font-display text-lg text-ink dark:text-stone-100">O que ainda dá para melhorar</h3>
            <ul className="mt-3 space-y-2">
              {checklistPerfil(rascunho).map((i) => (
                <li key={i.id} className="flex items-start gap-2 text-sm">
                  {i.feito
                    ? <Check size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                    : <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />}
                  <span className={i.feito ? "text-stone-400 dark:text-stone-500" : "text-stone-700 dark:text-stone-300"}>
                    {i.rotulo}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {/* A barra só existe quando há o que guardar (§127). Um botão sticky
          permanente ocupa uma faixa do ecrã para não dizer nada — e no
          telemóvel essa faixa disputa espaço com a navegação do fundo. */}
      {porGuardar && (
        <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-brand/30 bg-white/95 p-3 shadow-lift backdrop-blur lg:bottom-4 dark:border-brand/30 dark:bg-stone-900/95">
          <Button onClick={guardar} disabled={aGuardar}>
            {aGuardar ? "A guardar…" : "Guardar alterações"}
          </Button>
          <span role="status" className="text-sm text-stone-500 dark:text-stone-400">
            Tens alterações por guardar.
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Peças ─────────────────────────────────────────────────────────────

/** Um número inteiro num campo de texto — ou nada, que é diferente de zero. */
function numeroOuNulo(v: string): number | null {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function Bloco({
  numero, titulo, Icon, children,
}: {
  numero: number;
  titulo: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`bloco-${numero}`}
      className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6"
    >
      <h2 id={`bloco-${numero}`} className="flex items-center gap-2.5 font-display text-lg text-ink dark:text-stone-100">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
          <Icon size={15} aria-hidden />
        </span>
        {titulo}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Opcao({
  escolhida, onClick, titulo, texto,
}: {
  escolhida: boolean; onClick: () => void; titulo: string; texto: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={escolhida}
      onClick={onClick}
      className={`focus-marca rounded-2xl border p-4 text-left transition-colors ${
        escolhida
          ? "border-brand bg-brand-light/50 dark:border-brand/50 dark:bg-brand/10"
          : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-950/40"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
            escolhida ? "border-brand" : "border-stone-300 dark:border-stone-600"
          }`}
        >
          {escolhida && <span className="h-2 w-2 rounded-full bg-brand" />}
        </span>
        <span className="font-semibold text-stone-800 dark:text-stone-100">{titulo}</span>
      </span>
      <span className="mt-1.5 block pl-6 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        {texto}
      </span>
    </button>
  );
}

function Texto({
  rotulo, id, valor, onChange, tipo = "text", ajuda,
}: {
  rotulo: string; id: string; valor: string;
  onChange: (v: string) => void; tipo?: string; ajuda?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{rotulo}</span>
      {ajuda && <span className="mt-0.5 block text-xs text-stone-400 dark:text-stone-500">{ajuda}</span>}
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="focus-marca mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
      />
    </label>
  );
}

function Numero({
  rotulo, id, valor, onChange, max, ajuda, sufixo,
}: {
  rotulo: string; id: string; valor: string; onChange: (v: string) => void;
  max: number; ajuda?: string; sufixo?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{rotulo}</span>
      {ajuda && <span className="mt-0.5 block text-xs text-stone-400 dark:text-stone-500">{ajuda}</span>}
      <span className="mt-2 flex items-center gap-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={valor}
          onChange={(e) => {
            const limpo = e.target.value.replace(/\D/g, "").slice(0, 3);
            const n = Number.parseInt(limpo, 10);
            onChange(limpo === "" ? "" : String(Math.min(Number.isFinite(n) ? n : 0, max)));
          }}
          className="focus-marca min-h-[2.75rem] w-20 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm tabular-nums text-stone-800 focus:border-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
        />
        {sufixo && <span className="text-sm text-stone-500 dark:text-stone-400">{sufixo}</span>}
      </span>
    </label>
  );
}
