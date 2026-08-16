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
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import { usarPainel } from "@/components/contabilistas/usarPainel";
import { atualizarFicha } from "@/lib/contabilistas/fonte/dados";
import { DISTRITOS, ESPECIALIDADES } from "@/lib/contabilistas/catalogo";
import {
  COPY_CONTACTOS, IDIOMAS, checklistPerfil, completudeDoPerfil,
  percentagemDoPerfil, primeiroPorFazer, type FichaDePerfil,
} from "@/lib/contabilistas/perfil";
import { obterLinkedInPublico } from "@/lib/contabilistas/fonte/linkedin";
import Button from "@/components/ui/Button";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import LinkedInConta from "@/components/contabilistas/LinkedInConta";
import PerfilPreview from "@/components/contabilistas/PerfilPreview";
import AcoesDoPainel, { TituloDoPainel } from "@/components/contabilistas/AcoesDoPainel";
import { obterDisponibilidade } from "@/lib/contabilistas/fonte/dados";
import { NOMES_DIAS, type RegraDisponibilidade } from "@/lib/contabilistas/agenda";
import {
  COPY_VALORES_INDICATIVOS, DURACOES, PAGAMENTOS, TIPOS_MAX, apagarTipoConsulta,
  atualizarTipoConsulta, criarTipoConsulta, duracaoLegivel, listarTiposConsulta,
  precoLegivel, type MomentoDePagamento, type TipoConsulta,
} from "@/lib/contabilistas/fonte/tipos-consulta";
import SelectMenu, { type OpcaoSelectMenu } from "@/components/ui/SelectMenu";
import { useAvisos } from "@/components/ui/Avisos";
import { Check, ExternalLink, Eye, Info, Linkedin, Lock, Plus, Trash, User, Warning } from "@/components/ui/Icons";
import AvatarContabilista from "@/components/contabilistas/AvatarContabilista";
import { usarRascunhoSujo } from "@/components/contabilistas/usarRascunhoSujo";

interface Formulario {
  nome: string; occ: string; bio: string; distrito: string; concelho: string;
  email: string; telefone: string; website: string; aceita: boolean;
  especialidades: string[]; modalidades: string[];
  titulo: string; apresentacaoCurta: string; idiomas: string[];
  anosExperiencia: string; respostaHoras: string;
}

const OPCOES_PAGAMENTO: readonly OpcaoSelectMenu[] = PAGAMENTOS.map((p) => ({
  value: p.id,
  label: p.rotulo,
}));

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

  // O maior formulário do painel — dezasseis campos — e a barra lateral
  // tem nove destinos a um clique. Sair sem guardar perdia tudo em silêncio.
  usarRascunhoSujo({
    sujo: porGuardar,
    descricao: "Editaste o perfil e ainda não guardaste as alterações.",
  });

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
  const checklist = useMemo(() => (rascunho ? checklistPerfil(rascunho) : []), [rascunho]);
  const feitos = checklist.filter((i) => i.feito).length;
  const percentagem = rascunho ? percentagemDoPerfil(rascunho) : 0;
  const porFazer = rascunho ? primeiroPorFazer(rascunho) : null;

  // A semana-tipo mostra-se aqui e edita-se na agenda: são os mesmos dados,
  // e ter dois editores da mesma coisa é ter duas verdades (§143).
  const [horarios, setHorarios] = useState<RegraDisponibilidade[] | null>(null);
  useEffect(() => {
    if (!ficha) return;
    let vivo = true;
    obterDisponibilidade(ficha.userId)
      .then((r) => { if (vivo) setHorarios(r); })
      .catch(() => { if (vivo) setHorarios([]); });
    return () => { vivo = false; };
  }, [ficha]);

  // O catálogo de consultas. Ao contrário do resto do editor, grava à peça:
  // cada tipo é uma linha independente, e juntá-lo ao rascunho obrigaria a
  // reconciliar criações e remoções num só `UPDATE`.
  const [tipos, setTipos] = useState<TipoConsulta[] | null>(null);
  const [aCriarTipo, setACriarTipo] = useState(false);
  const recarregarTipos = useCallback(async (id: string) => {
    try { setTipos(await listarTiposConsulta(id)); } catch { setTipos([]); }
  }, []);
  useEffect(() => { if (ficha) void recarregarTipos(ficha.userId); }, [ficha, recarregarTipos]);

  // A fotografia. Não é um campo do perfil: vem do LinkedIn ligado, e é
  // por isso que o editor não a deixa carregar à mão (§131).
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!ficha) return;
    let vivo = true;
    obterLinkedInPublico(ficha.userId)
      .then((l) => { if (vivo) setAvatarUrl(l.avatarUrl); })
      .catch(() => { if (vivo) setAvatarUrl(null); });
    return () => { vivo = false; };
  }, [ficha]);

  /**
   * Que blocos já têm o que precisam.
   *
   * É o que põe o galo no cabeçalho de cada bloco. Cada linha responde à
   * pergunta «este bloco já dá contexto a quem lê o perfil?» — não «todos
   * os campos estão preenchidos», que transformaria campos opcionais em
   * obrigatórios pela porta das traseiras.
   */
  const blocoFeito = useMemo(() => ({
    identidade: Boolean(f.nome.trim() && f.titulo.trim() && (f.apresentacaoCurta.trim() || f.bio.trim())),
    especializacoes: f.especialidades.length > 0,
    atendimento: f.modalidades.length > 0 && f.idiomas.length > 0,
    consultas: (tipos ?? []).some((t) => t.ativo),
    contacto: Boolean(f.email.trim()),
    disponibilidade: (horarios ?? []).length > 0,
  }), [f, tipos, horarios]);

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
      <TituloDoPainel>Perfil profissional</TituloDoPainel>
      <AcoesDoPainel>
        {!painel.demonstracao && (
          <Link
            href={`/contabilistas/${ficha.slug}`}
            className="focus-marca inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-200/70 bg-white/60 px-3 text-sm font-medium text-stone-600 transition-colors hover:bg-white"
          >
            <Eye size={15} aria-hidden /> Pré-visualizar
          </Link>
        )}
        <Button size="sm" onClick={guardar} disabled={aGuardar || !porGuardar}>
          <Check size={15} aria-hidden />
          {aGuardar ? "A guardar…" : "Guardar alterações"}
        </Button>
      </AcoesDoPainel>

      {/* ── O cartão do topo ────────────────────────────────────────────
          O que a referência põe aqui, e por esta ordem: quem é a página,
          quanto está completa, e as três coisas que se decidem sem descer
          — se está publicada, se aceita clientes, e como se vê por fora.
          Substitui o cabeçalho genérico do painel: um título e um botão
          «ver como cliente» diziam menos do que este cartão diz. */}
      <section
        aria-labelledby="perfil-titulo"
        className="relative overflow-hidden rounded-4xl border border-brand/20 bg-gradient-to-br from-brand-light/70 via-brand-light/30 to-transparent p-5 dark:border-brand/25 dark:from-brand/20 dark:via-brand/8 dark:to-transparent sm:p-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
            <span
              className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-brand/25 bg-white text-brand-dark dark:border-brand/30 dark:text-brand-mint sm:flex"
              aria-hidden
            >
              <User size={24} />
            </span>
            <div className="min-w-0">
              {/* O h1 da página vive aqui. O título do topo é uma etiqueta
                  de navegação — um `span` —, e não pode ser o cabeçalho. */}
              <h1 id="perfil-titulo" className="font-display text-xl text-ink sm:text-2xl">
                Perfil profissional
              </h1>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-stone-600">
                Esta informação é visível para os clientes no diretório e no
                teu perfil público.
              </p>
            </div>
          </div>

          <div className="w-full shrink-0 lg:max-w-[17rem]">
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-stone-700">
                Perfil completo
              </span>
              <span className="font-display text-2xl tabular-nums text-brand-dark dark:text-brand-mint">
                {percentagem}%
              </span>
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-white/80"
              role="progressbar"
              aria-valuenow={percentagem}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Perfil completo"
            >
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${percentagem}%` }}
              />
            </div>
            {/* A frase diz o que falta A SÉRIO. A referência escreve aqui
                «falta incluir testemunhos ou avaliações» — e testemunhos
                escritos pelo próprio não são um sinal de confiança, são
                copy. A §139 fecha essa porta; a frase sai da checklist. */}
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              {porFazer ? `Falta: ${porFazer.rotulo.toLowerCase()}.` : completude.rotulo + "."}
            </p>
          </div>
        </div>

        {/* A linha das decisões. `aceita` é o único campo do perfil que se
            edita fora dos blocos: é a pergunta que se responde mais vezes,
            e obrigá-la a descer sete secções era pô-la fora de vista. */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-brand/15 pt-4 dark:border-brand/20">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-brand/25 bg-white px-3 py-1.5 text-sm font-semibold text-brand-dark dark:border-brand/30 dark:text-brand-mint">
            <Check size={14} aria-hidden /> Publicado
          </span>

          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-stone-700">
            <span>Aceita novos clientes</span>
            <input
              type="checkbox"
              className="peer sr-only"
              checked={f.aceita}
              onChange={(e) => mudar({ aceita: e.target.checked })}
            />
            {/* O interruptor desenha-se a partir do estado e não com
                `peer-checked` no botão de dentro: o `peer` só alcança
                irmãos, e o botão é neto do input. */}
            <span
              aria-hidden
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand ${
                f.aceita ? "bg-brand" : "bg-stone-300 dark:bg-stone-700"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  f.aceita ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </span>
          </label>

          <span className="w-full sm:ml-auto sm:w-auto">
            {/* O diretório é público e real; o contabilista da demonstração
                não existe lá. Abrir a ligação daria «não encontrado». */}
            {painel.demonstracao ? (
              <span className="inline-flex min-h-10 items-center rounded-xl border border-dashed border-stone-300 px-3.5 text-sm text-stone-500">
                Sem página pública: perfil simulado
              </span>
            ) : (
              <Link
                href={`/contabilistas/${ficha.slug}`}
                className="focus-marca inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 dark:hover:border-stone-600"
              >
                Ver perfil público <ExternalLink size={14} aria-hidden />
              </Link>
            )}
          </span>
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
          <Bloco numero={1} titulo="Identidade profissional" completo={blocoFeito.identidade}>
            {/* A fotografia abre o bloco, como na referência. Não tem
                botão de carregar: vem do LinkedIn ligado, e é o selo que
                diz de onde veio (§131). Sem LinkedIn ficam as iniciais e
                a legenda explica o que fazer. */}
            <div className="mb-5 flex items-center gap-4">
              <span className="relative shrink-0">
                <AvatarContabilista
                  contabilistaId={ficha.userId}
                  nome={f.nome || ficha.nome}
                  avatarUrl={avatarUrl}
                  tamanho="lg"
                />
                {rascunho.linkedinLigado && (
                  <span
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl border-2 border-white bg-[#0A66C2] text-[0.625rem] font-bold text-white dark:border-stone-900"
                    aria-label="Fotografia do LinkedIn"
                  >
                    in
                  </span>
                )}
              </span>
              <p className="min-w-0 text-xs leading-relaxed text-stone-500">
                {rascunho.linkedinLigado ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A66C2]/10 px-2 py-1 font-semibold text-[#0A66C2] dark:bg-[#0A66C2]/20 dark:text-[#7cb9f0]">
                    <Linkedin size={13} aria-hidden /> Foto do LinkedIn
                  </span>
                ) : (
                  <>
                    Sem fotografia. Liga o LinkedIn no bloco 5 e a tua
                    fotografia profissional passa a aparecer aqui e no perfil
                    público.
                  </>
                )}
              </p>
            </div>

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
                <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-stone-400">
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
              <span className="text-sm font-semibold text-stone-700">
                Apresentação de uma linha
              </span>
              <span className="mt-0.5 block text-xs text-stone-400">
                É o que aparece no cartão do diretório. A apresentação completa vem a seguir.
              </span>
              <input
                value={f.apresentacaoCurta}
                onChange={(e) => mudar({ apresentacaoCurta: e.target.value.slice(0, 200) })}
                placeholder="Acompanho freelancers e pequenas empresas, o ano todo."
                className="focus-marca mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand dark:placeholder:text-stone-600"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-stone-700">Apresentação</span>
              <span className="mt-0.5 block text-xs text-stone-400">
                Com quem trabalhas? Em que situações és mais útil? Como costumas acompanhar?
              </span>
              <textarea
                value={f.bio}
                onChange={(e) => mudar({ bio: e.target.value.slice(0, 2000) })}
                rows={5}
                className="focus-marca mt-2 w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:border-brand dark:placeholder:text-stone-600"
              />
              {/* O contador só ganha destaque perto do limite (§128). */}
              <span
                className={`mt-1 block text-xs tabular-nums ${
                  f.bio.length > 1800 ? "font-semibold text-clay-text" : "text-stone-400"
                }`}
              >
                {f.bio.length} / 2000
              </span>
            </label>
          </Bloco>

          <Bloco numero={2} titulo="Especializações" completo={blocoFeito.especializacoes}>
            <p className="text-sm leading-relaxed text-stone-500">
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
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:hover:bg-stone-700"
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

          <Bloco numero={3} titulo="Atendimento e território" completo={blocoFeito.atendimento}>
            <fieldset>
              <legend className="text-sm font-semibold text-stone-700">Como atendes</legend>
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
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:hover:bg-stone-700"
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
                <span className="text-sm font-semibold text-stone-700">Distrito</span>
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
              <legend className="text-sm font-semibold text-stone-700">
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
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:hover:bg-stone-700"
                      }`}
                    >
                      {i.nome}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div className="max-w-xs flex-1">
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
              {/* Eco do interruptor do topo, não um segundo comando: quem
                  está a rever o atendimento tem de ver isto sem subir, mas
                  dois sítios a escrever o mesmo campo é que dá divergência. */}
              <p className="mb-1">
                <span className="block text-sm font-semibold text-stone-700">
                  Aceita novos clientes
                </span>
                <span
                  className={`mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium ${
                    f.aceita
                      ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {f.aceita
                    ? <><Check size={14} aria-hidden /> Sim</>
                    : "Sem novas vagas"}
                </span>
              </p>
            </div>
          </Bloco>

          <Bloco numero={4} titulo="Consultas e honorário" completo={blocoFeito.consultas}>
            <p className="text-sm leading-relaxed text-stone-500">
              O que ofereces e por que valor. Aparece no teu perfil público
              como referência — o valor de cada consulta continua a ser
              acordado contigo em função do serviço.
            </p>
            <p className="mt-2 flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-xs leading-relaxed text-stone-600">
              <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                Para os clientes poderem pagar aqui, ativa os recebimentos em{" "}
                <Link href={painel.href("/contabilista/pagamentos")} className="font-semibold text-brand-dark underline underline-offset-2">
                  Recebimentos
                </Link>
                . Sem isso, «paga ao marcar» e «paga depois» não geram cobrança.
              </span>
            </p>

            {tipos === null ? (
              <div className="mt-4 h-24 animate-pulse rounded-2xl bg-stone-100" aria-busy="true" />
            ) : (
              <>
                {tipos.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {tipos.map((t) => (
                      <li
                        key={t.id}
                        className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-stone-800">
                            {t.nome}
                          </span>
                          <span className="mt-0.5 block text-xs text-stone-500">
                            {duracaoLegivel(t.duracaoMin)}
                            {t.descricao && ` · ${t.descricao}`}
                          </span>
                          {/* Quando é que se paga. Um preço sem esta linha
                              não diz se o cliente paga ao marcar ou no
                              fim — e são fluxos diferentes para os dois. */}
                          <span className="mt-1.5 block max-w-[15rem]">
                            <SelectMenu
                              id={`pagamento-${t.id}`}
                              value={t.pagamento}
                              onChange={async (v) => {
                                const { erro } = await atualizarTipoConsulta(t.id, {
                                  pagamento: v as MomentoDePagamento,
                                });
                                if (erro) { avisos.erro("Não foi possível guardar.", { detalhe: erro }); return; }
                                await recarregarTipos(ficha.userId);
                              }}
                              options={OPCOES_PAGAMENTO}
                              ariaLabel={`Quando se paga «${t.nome}»`}
                            />
                          </span>
                        </span>
                        <span className={`shrink-0 font-semibold tabular-nums ${t.precoCents === 0 ? "text-brand-dark dark:text-brand-mint" : "text-stone-800"}`}>
                          {precoLegivel(t.precoCents)}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-pressed={t.ativo}
                            onClick={async () => {
                              await atualizarTipoConsulta(t.id, { ativo: !t.ativo });
                              await recarregarTipos(ficha.userId);
                            }}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
                          >
                            {t.ativo ? "Visível" : "Oculto"}
                          </button>
                          <button
                            type="button"
                            aria-label={`Remover «${t.nome}»`}
                            onClick={async () => {
                              await apagarTipoConsulta(t.id);
                              await recarregarTipos(ficha.userId);
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-clay-text dark:hover:bg-stone-800"
                          >
                            <Trash size={14} aria-hidden />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {aCriarTipo ? (
                  <NovoTipo
                    onCancelar={() => setACriarTipo(false)}
                    onCriar={async (dados) => {
                      const { erro } = await criarTipoConsulta({ contabilistaId: ficha.userId, ...dados });
                      if (erro) { avisos.erro(erro); return; }
                      setACriarTipo(false);
                      await recarregarTipos(ficha.userId);
                      avisos.sucesso("Consulta adicionada.");
                    }}
                  />
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    disabled={tipos.length >= TIPOS_MAX}
                    onClick={() => setACriarTipo(true)}
                  >
                    <Plus size={14} aria-hidden /> Adicionar consulta
                  </Button>
                )}

                {/* A frase não é uma nota de rodapé opcional: é o que
                    distingue uma âncora comercial de uma tabela de preços
                    fixos, e o que mantém isto compatível com a §123. */}
                <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone-400">
                  <Lock size={12} className="mt-0.5 shrink-0" aria-hidden />
                  {COPY_VALORES_INDICATIVOS}
                </p>
              </>
            )}
          </Bloco>

          <Bloco numero={5} titulo="Confiança e contacto" completo={blocoFeito.contacto}>
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
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-cream px-4 py-3 text-xs leading-relaxed text-stone-600">
              <Lock size={13} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
              {COPY_CONTACTOS}
            </p>

            <div className="mt-4">
              <LinkedInConta contabilistaId={ficha.userId} />
            </div>
          </Bloco>

          {/* A disponibilidade comercial era o bloco 7. Subiu para o cartão
              do topo, onde a referência a põe: é a pergunta que se responde
              mais vezes, e sete secções abaixo estava fora de vista. A §132
              continua satisfeita — é uma decisão visível, com estado. */}

          <Bloco numero={6} titulo="Disponibilidade" completo={blocoFeito.disponibilidade}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-md text-sm leading-relaxed text-stone-500">
                Os horários que os clientes veem no teu perfil. Editam-se na
                agenda, na semana-tipo — são os mesmos dados.
              </p>
              <Link href={painel.href("/contabilista/agenda")}>
                <Button size="sm" variant="secondary">Editar horários</Button>
              </Link>
            </div>

            {horarios === null ? (
              <div className="mt-4 h-20 animate-pulse rounded-2xl bg-stone-100" aria-busy="true" />
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {NOMES_DIAS.map((nome, dia) => {
                  const doDia = horarios.filter((h) => h.diaSemana === dia);
                  return (
                    <li
                      key={dia}
                      className={`rounded-2xl border px-3 py-2.5 ${
                        doDia.length > 0
                          ? "border-brand/20 bg-brand-light/40 dark:border-brand/25 dark:bg-brand/10"
                          : "border-stone-200 bg-stone-50/60"
                      }`}
                    >
                      <span className="block text-xs font-bold uppercase tracking-wide text-stone-500">
                        {nome.slice(0, 3)}
                      </span>
                      {doDia.length === 0 ? (
                        <span className="mt-1 block text-xs text-stone-400">Fechado</span>
                      ) : (
                        doDia.map((h, i) => (
                          <span key={i} className="mt-1 block text-xs tabular-nums text-stone-700">
                            {h.inicio}–{h.fim}
                          </span>
                        ))
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Bloco>
        </div>

        {/* Pré-visualização. `lg:sticky` só a partir do desktop — no
            telemóvel é uma secção normal no fim do fluxo (§152). */}
        <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700">
              <Eye size={15} className="text-brand" aria-hidden />
              Pré-visualização pública
            </h2>
            {!painel.demonstracao && (
              <Link
                href={`/contabilistas/${ficha.slug}`}
                className="focus-marca inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-light dark:text-brand-mint dark:hover:bg-brand/15"
              >
                Ver perfil público <ExternalLink size={12} aria-hidden />
              </Link>
            )}
          </div>
          <PerfilPreview ficha={rascunho} tipos={tipos} avatarUrl={avatarUrl} />

          <section className="mt-4 rounded-4xl border border-stone-200 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg text-ink">Checklist essencial</h3>
              <span className="text-xs tabular-nums text-stone-500">
                {feitos} de {checklist.length} concluídos
              </span>
            </div>
            <div
              className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-stone-100"
              role="progressbar"
              aria-valuenow={feitos}
              aria-valuemin={0}
              aria-valuemax={checklist.length}
              aria-label="Itens do checklist concluídos"
            >
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${percentagem}%` }}
              />
            </div>
            <ul className="mt-3 space-y-2">
              {checklist.map((i) => (
                <li key={i.id} className="flex items-start gap-2 text-sm">
                  {i.feito
                    ? <Check size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                    : <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />}
                  <span className={i.feito ? "text-stone-400" : "text-stone-700"}>
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
        <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-brand/30 bg-white/95 p-3 shadow-lift backdrop-blur lg:bottom-4 dark:border-brand/30">
          <Button onClick={guardar} disabled={aGuardar}>
            {aGuardar ? "A guardar…" : "Guardar alterações"}
          </Button>
          <span role="status" className="text-sm text-stone-500">
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

/**
 * Um bloco numerado do editor.
 *
 * O galo ao lado do número não é decoração: diz se aquele bloco já tem o
 * que precisa. Um bloco por preencher mostra o número dentro do quadrado,
 * e o galo só aparece quando `completo`. Assim a pessoa percorre a coluna
 * e vê onde parar sem abrir cada secção.
 */
function Bloco({
  numero, titulo, completo, children,
}: {
  numero: number;
  titulo: string;
  completo: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`bloco-${numero}`}
      className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6"
    >
      <h2 id={`bloco-${numero}`} className="flex items-center gap-2.5 font-display text-lg text-ink">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
            completo
              ? "bg-brand text-white"
              : "bg-stone-100 text-stone-500"
          }`}
          aria-hidden
        >
          {completo ? <Check size={15} /> : numero}
        </span>
        <span className="min-w-0">
          <span className="tabular-nums text-stone-400">{numero}.</span>{" "}
          {titulo}
        </span>
        <span className="sr-only">{completo ? " — preenchido" : " — por preencher"}</span>
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** O formulário de uma consulta nova. Grava à peça, não com o rascunho. */
function NovoTipo({
  onCriar, onCancelar,
}: {
  onCriar: (d: { nome: string; descricao: string | null; duracaoMin: number; precoCents: number }) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [duracao, setDuracao] = useState(60);
  const [euros, setEuros] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onCriar({
          nome,
          descricao: descricao.trim() || null,
          duracaoMin: duracao,
          // Vazio é grátis, e grátis é uma oferta legítima — não um campo
          // por preencher. Ver `tipos-consulta.ts`.
          precoCents: Math.round(Number(euros.replace(",", ".") || "0") * 100),
        });
      }}
      className="mt-3 space-y-3 rounded-2xl border border-stone-200 bg-cream/50 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-stone-700">Nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value.slice(0, 80))}
            placeholder="Primeira conversa"
            autoFocus
            className="focus-marca mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm dark:text-stone-100"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="block">
            <span className="block text-sm font-semibold text-stone-700">Duração</span>
            <SelectMenu
              id="duracao-tipo-consulta"
              value={String(duracao)}
              options={DURACOES.map((d) => ({ value: String(d), label: duracaoLegivel(d) }))}
              onChange={(v) => setDuracao(Number(v))}
              ariaLabel="Duração da consulta"
              className="mt-2"
            />
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">Valor</span>
            <input
              inputMode="decimal"
              value={euros}
              onChange={(e) => setEuros(e.target.value.replace(/[^\d,.]/g, ""))}
              placeholder="Grátis"
              className="focus-marca mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm tabular-nums dark:text-stone-100"
            />
          </label>
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-stone-700">
          Descrição <span className="font-normal text-stone-400">(opcional)</span>
        </span>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value.slice(0, 300))}
          className="focus-marca mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm dark:text-stone-100"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={nome.trim().length < 2}>Adicionar</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancelar}>Cancelar</Button>
      </div>
    </form>
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
      <span className="text-sm font-semibold text-stone-700">{rotulo}</span>
      {ajuda && <span className="mt-0.5 block text-xs text-stone-400">{ajuda}</span>}
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="focus-marca mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand dark:placeholder:text-stone-600"
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
      <span className="text-sm font-semibold text-stone-700">{rotulo}</span>
      {ajuda && <span className="mt-0.5 block text-xs text-stone-400">{ajuda}</span>}
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
          className="focus-marca min-h-[2.75rem] w-20 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm tabular-nums text-stone-800 focus:border-brand"
        />
        {sufixo && <span className="text-sm text-stone-500">{sufixo}</span>}
      </span>
    </label>
  );
}
