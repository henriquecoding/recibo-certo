"use client";

/**
 * A workspace do contabilista — o orquestrador.
 *
 * O ciclo de edição é o da referência A e o da §9.5/§12.12: tudo acontece
 * em memória e há UMA escrita ao concluir. Trinta e três arrastos não são
 * trinta e três pedidos de rede.
 *
 *   Personalizar painel
 *     → draft em memória (+ stack de Desfazer, 25 estados)
 *     → Desfazer / Repor padrão / Arrumar / Alinhar, tudo local
 *     → Concluir edição → valida → 1 RPC → fecha
 *
 * Duas coisas que não se veem e que são o ponto:
 *
 *  1. Concluir SEM ter mudado nada não grava (§12.13). A comparação é por
 *     assinatura canónica, não por JSON cru — a ordem incidental das
 *     propriedades não pode contar como alteração.
 *
 *  2. `layout_desatualizado` não é escondido nem resolvido à força. Outra
 *     aba gravou entretanto; a pessoa escolhe. Sobrescrever em silêncio
 *     destruía trabalho que ela fez noutro sítio (§12.14, §12.15).
 *
 * O motor de edição entra por import DINÂMICO: quem só consulta o painel
 * não carrega arrasto, colisões nem biblioteca (§12.11).
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_MODULOS_POR_VISTA, compactarVertical, mudou, primeiroEncaixe, proximaTag,
  validarLayout,
} from "@/lib/contabilistas/dashboard/layout";
import { erroQueImpedeGravar } from "@/lib/contabilistas/dashboard/validacao";
import { MODULOS } from "@/lib/contabilistas/dashboard/modulos";
import { VISTAS_POR_OMISSAO, layoutDaOmissao } from "@/lib/contabilistas/dashboard/omissao";
import type {
  WidgetType, WorkspaceLayoutV2, WorkspaceView, WorkspaceWidgetInstance,
} from "@/lib/contabilistas/dashboard/tipos";
import { guardarLayout, listarVistas } from "@/lib/contabilistas/fonte/dashboard";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar } from "@/components/ui/Confirmar";
import Button from "@/components/ui/Button";
import AcoesDoPainel, { TituloDoPainel } from "@/components/contabilistas/AcoesDoPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import { Check, LayoutGrid, Plus, RotateCcw, Settings } from "@/components/ui/Icons";
import { Broker } from "./broker";
import GrelhaVista from "./GrelhaVista";
import GerirVista from "./GerirVista";
import BarraEdicao from "./BarraEdicao";
import styles from "./workspace.module.css";

const GrelhaEdicao = dynamic(() => import("./GrelhaEdicao"), { ssr: false });
const BibliotecaModulos = dynamic(() => import("./BibliotecaModulos"), { ssr: false });
const OrganizarMovel = dynamic(() => import("./OrganizarMovel"), { ssr: false });

const LIMITE_DESFAZER = 25;

export default function Workspace({
  contabilistaId, href, demonstracao,
}: {
  contabilistaId: string;
  href: (destino: string) => string;
  demonstracao: boolean;
}) {
  const avisos = useAvisos();
  const confirmar = useConfirmar();

  const [vistas, setVistas] = useState<WorkspaceView[] | null>(null);
  const [ativaId, setAtivaId] = useState<string | null>(null);
  const [edicao, setEdicao] = useState(false);
  const [draft, setDraft] = useState<WorkspaceLayoutV2 | null>(null);
  const [historico, setHistorico] = useState<WorkspaceLayoutV2[]>([]);
  const [grelhaVisivel, setGrelhaVisivel] = useState(true);
  const [biblioteca, setBiblioteca] = useState(true);
  const [organizarMovel, setOrganizarMovel] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);

  // Um broker por sessão de painel: é o que garante uma leitura por
  // domínio mesmo com três widgets a pedir a mesma fonte.
  const broker = useMemo(() => new Broker(contabilistaId), [contabilistaId]);
  const [, forcar] = useState(0);
  useEffect(() => broker.subscrever(() => forcar((n) => n + 1)), [broker]);

  useEffect(() => {
    let vivo = true;
    listarVistas(contabilistaId)
      .then((v) => {
        if (!vivo) return;
        setVistas(v);
        setAtivaId(v.find((x) => x.principal)?.id ?? v[0]?.id ?? null);
      })
      .catch(() => { if (vivo) setVistas([]); });
    return () => { vivo = false; };
  }, [contabilistaId]);

  const ativa = vistas?.find((v) => v.id === ativaId) ?? null;
  const layout = edicao && draft ? draft : ativa?.layout ?? null;

  /* ------------------------------ edição ------------------------------ */

  const registar = useCallback((novo: WorkspaceLayoutV2) => {
    setHistorico((h) => [...h, novo].slice(-LIMITE_DESFAZER));
  }, []);

  const aplicar = useCallback(
    (items: WorkspaceWidgetInstance[]) => {
      setDraft((d) => {
        if (!d) return d;
        registar(d);
        return { ...d, items };
      });
    },
    [registar],
  );

  function abrirEdicao() {
    if (!ativa) return;
    setDraft(structuredClone(ativa.layout));
    setHistorico([]);
    setEdicao(true);
    setBiblioteca(true);
  }

  function desfazer() {
    setHistorico((h) => {
      if (h.length === 0) return h;
      const anterior = h[h.length - 1];
      setDraft(anterior);
      return h.slice(0, -1);
    });
  }

  async function reporPadrao() {
    if (!ativa) return;
    const ok = await confirmar({
      titulo: "Repor o painel de partida?",
      descricao: `A vista «${ativa.nome}» volta à composição inicial.`,
      consequencias: ["Os módulos que acrescentou nesta vista são retirados."],
      confirmar: "Repor",
    });
    if (!ok) return;

    const omissao = VISTAS_POR_OMISSAO.find((v) => v.nome === ativa.nome);
    const base = omissao
      ? layoutDaOmissao(omissao.posicoes, () => crypto.randomUUID())
      : validarLayout({
          version: 2, revision: 1,
          grid: ativa.layout.grid,
          items: [],
        }).layout;

    setDraft((d) => {
      if (d) registar(d);
      return { ...base, revision: ativa.layout.revision };
    });
  }

  function acrescentar(type: WidgetType) {
    setDraft((d) => {
      if (!d) return d;
      if (d.items.length >= MAX_MODULOS_POR_VISTA) {
        avisos.erro("Esta vista já tem o número máximo de módulos.", {
          detalhe: `O limite é ${MAX_MODULOS_POR_VISTA}. Remova um antes de acrescentar outro.`,
        });
        return d;
      }
      const def = MODULOS[type];
      const ocupados = d.items.filter((i) => !i.hidden).map((i) => i.desktop);
      const desktop = primeiroEncaixe(
        def.posicaoPadrao.colSpan, def.posicaoPadrao.rowSpan, ocupados, d.grid.desktop.columns,
      );
      const novo: WorkspaceWidgetInstance = {
        instanceId: crypto.randomUUID(),
        type,
        tag: proximaTag(type, d.items.map((i) => i.tag)),
        configVersion: 1,
        desktop,
      };
      registar(d);
      // Pede já o domínio: o módulo acabou de aparecer e um cartão vazio
      // durante três segundos parece uma avaria.
      void broker.pedirVarios(def.dominios);
      return validarLayout({ ...d, items: [...d.items, novo] }).layout;
    });
  }

  function remover(instanceId: string) {
    setDraft((d) => {
      if (!d) return d;
      registar(d);
      return {
        ...d,
        items: compactarVertical(d.items.filter((i) => i.instanceId !== instanceId)),
      };
    });
  }

  function compactar() {
    setDraft((d) => (d ? (registar(d), { ...d, items: compactarVertical(d.items) }) : d));
  }

  function alinharEsquerda() {
    setDraft((d) => {
      if (!d) return d;
      registar(d);
      const items = [...d.items]
        .sort((a, b) => a.desktop.row - b.desktop.row || a.desktop.col - b.desktop.col)
        .map((i) => ({ ...i, desktop: { ...i.desktop, col: 1 } }));
      return { ...d, items: compactarVertical(items) };
    });
  }

  /** Arrumação determinística: críticos em cima, diferidos em baixo. */
  function arrumar() {
    setDraft((d) => {
      if (!d) return d;
      registar(d);
      const peso = { critical: 0, normal: 1, deferred: 2 } as const;
      const ordenados = [...d.items].sort(
        (a, b) =>
          peso[MODULOS[a.type].prioridade] - peso[MODULOS[b.type].prioridade] ||
          a.tag.localeCompare(b.tag),
      );
      const colocados: WorkspaceWidgetInstance[] = [];
      for (const item of ordenados) {
        const desktop = primeiroEncaixe(
          item.desktop.colSpan, item.desktop.rowSpan,
          colocados.map((c) => c.desktop), d.grid.desktop.columns,
        );
        colocados.push({ ...item, desktop });
      }
      return validarLayout({ ...d, items: colocados }).layout;
    });
  }

  async function concluir() {
    if (!ativa || !draft) return;

    const v = validarLayout(draft);
    // Sobreposição não é impedimento — `validarLayout` devolve o layout já
    // arrumado e é esse que se grava. Só o que o SQL recusa para o ecrã.
    const impedimento = erroQueImpedeGravar(v);
    if (impedimento) {
      avisos.erro(
        impedimento === "tipo_desconhecido"
          ? "Há um módulo que já não existe nesta versão."
          : "Há um módulo em estado que não pode ser guardado.",
        { detalhe: "O painel foi corrigido. Confirme a composição e volte a concluir." },
      );
      setDraft(v.layout);
      return;
    }

    // Concluir sem ter mudado nada não gasta uma escrita (§12.13).
    if (!mudou(ativa.layout, v.layout)) {
      setEdicao(false);
      setDraft(null);
      return;
    }

    setAGuardar(true);
    const r = await guardarLayout(ativa.id, ativa.revision, v.layout);
    setAGuardar(false);

    if (r.ok && r.revision) {
      setVistas((vs) =>
        (vs ?? []).map((x) =>
          x.id === ativa.id
            ? { ...x, layout: { ...v.layout, revision: r.revision! }, revision: r.revision! }
            : x,
        ),
      );
      setEdicao(false);
      setDraft(null);
      avisos.sucesso("Painel guardado.");
      return;
    }

    if (r.motivo === "layout_desatualizado") {
      // O draft NÃO é descartado: a pessoa escolhe. Devolvê-la em silêncio
      // ao layout antigo perdia o trabalho que acabou de fazer.
      const recarregar = await confirmar({
        titulo: "Este painel mudou noutro sítio",
        descricao:
          "A vista foi guardada noutra aba ou noutro dispositivo depois de abrir a edição.",
        consequencias: [
          "Carregar a versão mais recente descarta o que mudou agora.",
          "Manter o que tem aqui permite tentar guardar outra vez.",
        ],
        confirmar: "Carregar a mais recente",
        cancelar: "Manter o que tenho",
      });
      if (recarregar) {
        const frescas = await listarVistas(contabilistaId);
        setVistas(frescas);
        setEdicao(false);
        setDraft(null);
      }
      return;
    }

    avisos.erro("Não foi possível guardar o painel.", {
      detalhe: r.detalhe ?? MENSAGEM_DA_FALHA[r.motivo ?? "rede"],
    });
  }

  /* ------------------------------ render ------------------------------ */

  if (!vistas) return <EsqueletoPainel forma="duasColunas" />;

  if (vistas.length === 0 || !ativa || !layout) {
    return (
      <div className="rounded-4xl border border-stone-200 bg-white p-6 text-center shadow-card dark:border-stone-800">
        <LayoutGrid size={22} className="mx-auto text-stone-300" aria-hidden />
        <h2 className="mt-3 font-display text-xl text-ink">Ainda não tens vistas neste painel</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
          Uma vista é a forma como organizas os teus módulos. Podes criar as de partida
          — Meu dia, Fecho mensal, Clientes e Fiscal — e mudá-las como quiseres.
        </p>
        <div className="mt-5 flex justify-center">
          <Button
            onClick={() => {
              void listarVistas(contabilistaId).then((v) => {
                setVistas(v);
                setAtivaId(v.find((x) => x.principal)?.id ?? v[0]?.id ?? null);
              });
            }}
          >
            Criar as vistas de partida
          </Button>
        </div>
      </div>
    );
  }

  const tiposNoPainel = new Set(layout.items.map((i) => i.type));

  return (
    <div className="space-y-4">
      <TituloDoPainel>{edicao ? `A editar · ${ativa.nome}` : ativa.nome}</TituloDoPainel>

      <AcoesDoPainel>
        {edicao ? (
          <>
            <button type="button" onClick={desfazer} disabled={historico.length === 0} className={styles.acaoTopo}>
              <RotateCcw size={13} aria-hidden /> Desfazer
            </button>
            <button type="button" onClick={reporPadrao} className={styles.acaoTopo}>
              Repor
            </button>
            <Button onClick={concluir} disabled={aGuardar}>
              <Check size={14} aria-hidden /> {aGuardar ? "A guardar…" : "Concluir edição"}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={abrirEdicao}>
            <Settings size={14} aria-hidden /> Personalizar painel
          </Button>
        )}
      </AcoesDoPainel>

      {/* ── Separadores de vistas ───────────────────────────────────
          Criar uma vista já se podia; mudar-lhe o nome, escolher qual
          abre primeiro e apagá-la é o que faltava — e é o que fazia
          «Vista 5» ficar para sempre onde ninguém a queria. O `•••` só
          aparece na vista ativa: gerir a que não se está a ver é pedir
          enganos. Em edição desaparece — mexer nas vistas a meio de um
          rascunho por gravar perdia o rascunho. */}
      <div className={styles.vistas} role="tablist" aria-label="Vistas do painel">
        {vistas.map((v) => {
          const ativaAqui = v.id === ativaId;
          return (
            <span
              key={v.id}
              className={`${styles.separador} ${ativaAqui ? styles.separadorAtivo : ""}`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={ativaAqui}
                onClick={() => {
                  if (edicao) return;
                  setAtivaId(v.id);
                }}
                disabled={edicao && !ativaAqui}
                className={`${styles.vista} ${ativaAqui ? styles.vistaAtiva : ""} focus-marca`}
              >
                {v.nome}
              </button>

              {ativaAqui && !edicao && (
                <GerirVista
                  vista={v}
                  ePrincipal={Boolean(v.principal)}
                  podeApagar={vistas.length > 1}
                  aoMudar={(opcoes) => void recarregarVistas(opcoes?.apagada)}
                />
              )}
            </span>
          );
        })}
        {!edicao && (
          <button type="button" onClick={() => criarVistaNova()} className={`${styles.novaVista} focus-marca`}>
            <Plus size={12} aria-hidden /> Nova vista
          </button>
        )}
      </div>

      {edicao && (
        <BarraEdicao
          grelhaVisivel={grelhaVisivel}
          onAlternarGrelha={() => setGrelhaVisivel((g) => !g)}
          onCompactar={compactar}
          onAlinharEsquerda={alinharEsquerda}
          onArrumar={arrumar}
        />
      )}

      {/* ── As ações, no telemóvel ─────────────────────────────────────
          `AcoesDoPainel` é um portal para a barra do topo e só existe a
          partir de `lg` — no telemóvel aquela barra não tem espaço. Sem
          esta linha não havia forma NENHUMA de entrar em edição num
          telefone, o que descobri no smoke a 360px.

          O `lg:hidden` vai no invólucro e não nos botões: `.organizar` e
          `.acaoTopo` declaram `display` no módulo CSS e, com a mesma
          especificidade, ganha a regra escrita depois. */}
      <div className="lg:hidden">
        {edicao ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOrganizarMovel(true)}
              className={`${styles.acaoTopo} focus-marca`}
            >
              Organizar painel
            </button>
            <button
              type="button"
              onClick={desfazer}
              disabled={historico.length === 0}
              className={`${styles.acaoTopo} focus-marca`}
            >
              <RotateCcw size={13} aria-hidden /> Desfazer
            </button>
            <button type="button" onClick={reporPadrao} className={`${styles.acaoTopo} focus-marca`}>
              Repor
            </button>
            <span className="ml-auto">
              <Button onClick={concluir} disabled={aGuardar}>
                <Check size={14} aria-hidden /> {aGuardar ? "A guardar…" : "Concluir"}
              </Button>
            </span>
          </div>
        ) : (
          <Button variant="secondary" onClick={abrirEdicao}>
            <Settings size={14} aria-hidden /> Personalizar painel
          </Button>
        )}
      </div>

      <div className={edicao && biblioteca ? styles.comBiblioteca : undefined}>
        <div className="min-w-0">
          {edicao ? (
            <GrelhaEdicao
              layout={layout}
              broker={broker}
              href={href}
              grelhaVisivel={grelhaVisivel}
              onAlterar={aplicar}
              onRemover={remover}
            />
          ) : (
            <GrelhaVista layout={layout} broker={broker} href={href} />
          )}
        </div>

        {edicao && biblioteca && (
          <div className={styles.colunaBiblioteca}>
            <BibliotecaModulos
              jaNoPainel={tiposNoPainel}
              onAdicionar={acrescentar}
              onFechar={() => setBiblioteca(false)}
            />
          </div>
        )}
      </div>

      {edicao && !biblioteca && (
        <button type="button" onClick={() => setBiblioteca(true)} className={`${styles.organizar} focus-marca`}>
          <Plus size={13} aria-hidden /> Adicionar módulos
        </button>
      )}

      {organizarMovel && (
        <OrganizarMovel
          layout={layout}
          onFechar={() => setOrganizarMovel(false)}
          onAlterar={aplicar}
        />
      )}
    </div>
  );

  /**
   * Volta a ler as vistas depois de uma mudança na barra.
   *
   * `apagada` existe porque apagar a vista ATIVA deixaria `ativaId` a
   * apontar para nada — e o ecrã cairia na recuperação «ainda não tens
   * vistas», que seria falso. Quando é a ativa que sai, a escolha passa
   * para a principal, ou para a primeira que sobrar.
   */
  async function recarregarVistas(apagada?: string) {
    const frescas = await listarVistas(contabilistaId);
    setVistas(frescas);
    if (apagada && apagada === ativaId) {
      setAtivaId(frescas.find((v) => v.principal)?.id ?? frescas[0]?.id ?? null);
    }
  }

  async function criarVistaNova() {
    const { criarVista } = await import("@/lib/contabilistas/fonte/dashboard");
    const nome = `Vista ${(vistas?.length ?? 0) + 1}`;
    const r = await criarVista(nome, ativaId ?? undefined);
    if (r.erro) { avisos.erro("Não foi possível criar a vista.", { detalhe: r.erro }); return; }
    const frescas = await listarVistas(contabilistaId);
    setVistas(frescas);
    if (r.id) setAtivaId(r.id);
    avisos.sucesso(`Vista «${nome}» criada.`);
  }
}

const MENSAGEM_DA_FALHA: Record<string, string> = {
  sem_permissao: "A sessão perdeu a autorização. Entre outra vez.",
  layout_demasiado_grande: "O painel tem módulos demais para guardar de uma vez.",
  layout_invalido: "Há um módulo em posição impossível. Use «Arrumar módulos».",
  vista_inexistente: "Esta vista já não existe.",
  rede: "Falha de rede. O que mudou continua aqui — tente outra vez.",
};
