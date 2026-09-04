"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A CONSOLA — onde o contabilista lê, seleciona, extrai e pede
//  ---------------------------------------------------------------------
//  É aqui que a instrução «extrair de forma simplificada e poder
//  selecionar o que precisa» se cumpre. E é a diferença entre isto e um
//  link: do outro lado há uma superfície de trabalho com fronteira.
//
//  A PRIMEIRA COISA é o caso em dez linhas — estrutura SBAR, quatro
//  campos, zero cliques. A literatura de passagem chama-lhe passagem
//  quente, e é o que evita o «e afinal o que é que querias?».
//
//  Depois, SETE VISTAS do mesmo dossiê, com caixa de seleção por item. Nas
//  três primeiras a seleção produz TRABALHO (pedir, perguntar, agendar);
//  nas outras produz MATERIAL (citações, datas, tabelas).
//
//  O QUE A CONSOLA NUNCA FAZ (§6.5)
//   · não edita o Guia, não corrige afirmações, não altera fontes;
//   · não mostra secção que não foi consentida — ela não foi COMPOSTA;
//   · não dá acesso a outros dossiês, casos ou painéis;
//   · não exporta o que não está selecionado. «Selecionar tudo» seleciona
//     o que está à vista — visível, e contado no evento.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import { registar } from "@/lib/analytics/cliente";
import { descarregar } from "@/lib/export/nomes";
import Button from "@/components/ui/Button";
import { Check, Copy, Download, ExternalLink, Warning } from "@/components/ui/Icons";
import {
  ACAO_NATURAL, impressaoCurta, paraCsv, paraJson, paraMarkdown, paraTexto,
  pedidoDeElementos, prazosParaIcs, RODAPE_DOSSIE, ROTULO_ESTADO_ELEMENTO,
  ROTULO_ORIGEM, ROTULO_RESPOSTA, TITULO_SECCAO,
  type DossieDeGuia, type IdSeccao, type ItemDossie, type PedidoDeElementos,
  type SeccaoDossie, type Selecao,
} from "@/lib/guias/dossie";

/** As sete vistas, pela ordem em que um profissional as usa. */
const VISTAS: IdSeccao[] = [
  "elementos", "aplicabilidade", "julgamento", "base_legal", "prazos", "numeros", "historico",
];

const ROTULO_VISTA: Partial<Record<IdSeccao, string>> = {
  elementos: "Elementos",
  aplicabilidade: "Perguntas",
  julgamento: "Julgamento",
  base_legal: "Base legal",
  prazos: "Prazos",
  numeros: "Números",
  historico: "Alterações",
};

interface Props {
  dossie: DossieDeGuia;
  /** O que mudou no guia desde a composição. Calculado no servidor. */
  alteracoes?: ItemDossie[];
  /**
   * A origem, quando a consola pode devolver trabalho.
   *
   * Sem ela a consola é só leitura e extração — que é o estado de quem
   * abre um ficheiro exportado, e um estado perfeitamente válido.
   *
   * O ENVIO é injetado, e não escolhido aqui: os três destinos escrevem
   * por caminhos diferentes (RPC autenticada em D1 e D2, rota pública com
   * token em D3), e importar a camada de dados nesta consola punha o
   * cliente do Supabase no bundle da página pública — que não precisa
   * dele para nada.
   */
  origem?: {
    referencia: string;
    enviarPedido: (pedido: PedidoDeElementos) => Promise<{ erro?: string }>;
  };
  /** O aviso de quem pede sem estar verificado pela plataforma (D3). */
  avisoDeIdentidade?: string;
}

export default function ConsolaDossie({ dossie, alteracoes, origem, avisoDeIdentidade }: Props) {
  const avisos = useAvisos();
  const [vista, setVista] = useState<IdSeccao>("elementos");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aPedir, setAPedir] = useState(false);
  const [pedido, setPedido] = useState<string | null>(null);

  // O histórico é calculado na LEITURA, e por isso chega por props em vez
  // de vir dentro do dossiê: no instante da composição era vazio.
  const seccoes = useMemo<SeccaoDossie[]>(() => {
    const base = [...dossie.seccoes];
    if (alteracoes && alteracoes.length > 0) {
      base.push({ id: "historico", titulo: TITULO_SECCAO.historico, itens: alteracoes, incluida: true });
    }
    return base;
  }, [dossie.seccoes, alteracoes]);

  const disponiveis = useMemo(
    () => VISTAS.filter((v) => seccoes.some((s) => s.id === v && s.itens.length > 0)),
    [seccoes],
  );
  const atual = seccoes.find((s) => s.id === vista) ?? null;
  const selecao: Selecao = useMemo(() => ({ itens: selecionados }), [selecionados]);
  const daVista = useMemo(
    () => (atual?.itens ?? []).filter((i) => selecionados.has(i.id)),
    [atual, selecionados],
  );

  function alternar(id: string) {
    setSelecionados((s) => {
      const proximo = new Set(s);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function selecionarTudoAVista() {
    setSelecionados((s) => {
      const proximo = new Set(s);
      for (const i of atual?.itens ?? []) proximo.add(i.id);
      return proximo;
    });
  }

  function medir(action: string, format?: string) {
    registar("guide_dossier_extract", {
      guide_id: dossie.guia.slug,
      view: vista,
      action,
      format,
      item_count: daVista.length,
    });
  }

  async function copiar(formato: "markdown" | "texto") {
    if (daVista.length === 0) { avisos.info("Escolhe primeiro os itens que queres."); return; }
    const texto = formato === "markdown" ? paraMarkdown(dossie, selecao) : paraTexto(dossie, selecao);
    try {
      await navigator.clipboard.writeText(texto);
      avisos.sucesso(`${daVista.length} ${daVista.length === 1 ? "item copiado" : "itens copiados"}.`);
      medir("copiar", formato);
    } catch {
      avisos.erro("O browser não deixou copiar. Usa a exportação.");
    }
  }

  function exportar(formato: "md" | "csv" | "ics" | "json") {
    if (daVista.length === 0 && formato !== "ics") {
      avisos.info("Escolhe primeiro os itens que queres.");
      return;
    }
    const base = `recibocerto-dossie-${dossie.guia.slug}-${vista}`;
    const conteudo =
      formato === "md" ? paraMarkdown(dossie, selecao)
      : formato === "csv" ? paraCsv(dossie, selecao)
      : formato === "ics" ? prazosParaIcs(dossie, selecao)
      : paraJson(dossie, selecao);
    const mime =
      formato === "md" ? "text/markdown;charset=utf-8"
      : formato === "csv" ? "text/csv;charset=utf-8"
      : formato === "ics" ? "text/calendar;charset=utf-8"
      : "application/json;charset=utf-8";
    descarregar(conteudo, `${base}.${formato}`, mime);
    medir("exportar", formato);
  }

  /**
   * Devolver como perguntas.
   *
   * Copia, e não envia: os três destinos têm canais diferentes — a conversa
   * do vínculo, as mensagens do caso, e nada em D3 — e inventar aqui um
   * quarto canal era criar uma caixa de entrada que ninguém lê. O que a
   * consola faz é preparar o texto; quem o envia escolhe por onde.
   */
  async function perguntar() {
    if (daVista.length === 0) { avisos.info("Escolhe primeiro as perguntas que queres devolver."); return; }
    const linhas = daVista.map((i, n) => `${n + 1}. ${i.texto}`);
    const texto = [
      `Sobre o guia «${dossie.guia.titulo}» (versão de ${dossie.fixado.revistoEm}), preciso que me confirmes:`,
      "",
      ...linhas,
      "",
      RODAPE_DOSSIE,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      avisos.sucesso("Perguntas copiadas. Cola-as onde falas com o cliente.");
      medir("perguntar");
    } catch {
      avisos.erro("O browser não deixou copiar.");
    }
  }

  async function pedir() {
    if (!origem) return;
    if (daVista.length === 0) { avisos.info("Escolhe primeiro os elementos a pedir."); return; }
    setAPedir(true);
    const p = pedidoDeElementos(dossie, selecao, { ref: origem.referencia });
    const r = await origem.enviarPedido(p);
    setAPedir(false);
    if (r.erro) { avisos.erro(r.erro); return; }
    setPedido(p.id);
    avisos.sucesso(`Pedido enviado com ${p.itens.length} ${p.itens.length === 1 ? "item" : "itens"}.`);
    registar("guide_dossier_request", {
      guide_id: dossie.guia.slug,
      item_count: p.itens.length,
      authored_count: p.itens.filter((i) => i.origem === "profissional").length,
      has_deadline: p.itens.some((i) => Boolean(i.prazo)),
    });
  }

  return (
    <div className="space-y-6">
      <CasoEmDezLinhas dossie={dossie} />

      {avisoDeIdentidade && (
        <p className="flex items-start gap-2 rounded-2xl bg-stone-100 px-4 py-3 text-sm leading-relaxed text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          <Warning size={16} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
          {avisoDeIdentidade}
        </p>
      )}

      {/* As vistas. Rolam na horizontal no telemóvel; a página nunca rola. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div role="tablist" aria-label="Vistas do dossiê" className="flex gap-1.5">
          {disponiveis.map((v) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={v === vista}
              onClick={() => setVista(v)}
              className={`min-h-[36px] shrink-0 rounded-xl px-3 text-xs font-medium transition-colors ${
                v === vista
                  ? "bg-brand text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
              }`}
            >
              {ROTULO_VISTA[v]}{" "}
              <span className="tabular-nums opacity-70">
                {seccoes.find((s) => s.id === v)?.itens.length ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {atual && (
        <section aria-label={TITULO_SECCAO[atual.id]}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="texto-mini text-stone-500 dark:text-stone-400">
              {daVista.length} de {atual.itens.length} selecionados · {ACAO_NATURAL[atual.id]}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selecionarTudoAVista}
                className="texto-mini font-semibold text-brand-dark underline underline-offset-2 dark:text-brand"
              >
                Selecionar tudo à vista
              </button>
              {daVista.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelecionados(new Set())}
                  className="texto-mini text-stone-500 underline underline-offset-2 dark:text-stone-400"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          <ul className="space-y-2">
            {atual.itens.map((item) => (
              <li key={item.id}>
                <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 p-3 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800/50">
                  <input
                    type="checkbox"
                    checked={selecionados.has(item.id)}
                    onChange={() => alternar(item.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      selecionados.has(item.id)
                        ? "border-brand bg-brand text-white"
                        : "border-stone-300 dark:border-stone-600"
                    }`}
                  >
                    {selecionados.has(item.id) && <Check size={12} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-relaxed text-stone-700 dark:text-stone-200">
                      {item.numero ? <span className="tabular-nums text-stone-400">{item.numero}. </span> : null}
                      {item.texto}
                    </span>
                    <Detalhe item={item} />
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            {atual.id === "elementos" && origem && (
              <Button size="sm" onClick={pedir} disabled={aPedir || Boolean(pedido)}>
                {pedido ? "Pedido enviado" : aPedir ? "A enviar…" : "Pedir ao cliente"}
              </Button>
            )}
            {atual.id === "aplicabilidade" && (
              <Button size="sm" onClick={perguntar}>Devolver como perguntas</Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => copiar("markdown")}>
              <Copy size={14} className="mr-1.5" aria-hidden /> Copiar
            </Button>
            {atual.id === "prazos" ? (
              <Button size="sm" variant="secondary" onClick={() => exportar("ics")}>
                <Download size={14} className="mr-1.5" aria-hidden /> Agenda (.ics)
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => exportar("csv")}>
                <Download size={14} className="mr-1.5" aria-hidden /> CSV
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => exportar("md")}>Markdown</Button>
            <Button size="sm" variant="secondary" onClick={() => exportar("json")}>JSON</Button>
          </div>
        </section>
      )}

      <p className="border-t border-stone-100 pt-4 text-xs leading-relaxed text-stone-400 dark:border-stone-800">
        Gerado pelo Recibo Certo a partir do guia «{dossie.guia.titulo}», versão de{" "}
        {dossie.fixado.revistoEm} (impressão {impressaoCurta(dossie.fixado.impressao)}).{" "}
        {RODAPE_DOSSIE}
      </p>
    </div>
  );
}

// ─── Vista 1 · o caso em dez linhas ────────────────────────────────────

function CasoEmDezLinhas({ dossie }: { dossie: DossieDeGuia }) {
  const resumo = dossie.seccoes.find((s) => s.id === "resumo");
  const situacao = resumo?.itens.find((i) => i.id === "resumo.situacao");
  const enquadramento = resumo?.itens.find((i) => i.id === "resumo.enquadramento");
  const resposta = resumo?.itens.find((i) => i.id === "resumo.resposta");
  const falta = resumo?.itens.find((i) => i.id === "resumo.falta");

  const linhas: { rotulo: string; texto: string }[] = [];
  if (situacao) linhas.push({ rotulo: "Situação", texto: situacao.texto });
  if (enquadramento) linhas.push({ rotulo: "Enquadramento", texto: enquadramento.texto });
  if (resposta) linhas.push({ rotulo: "O que o guia responde", texto: resposta.texto });
  if (falta) linhas.push({ rotulo: "O que falta", texto: falta.texto });

  return (
    <section
      aria-label="O caso em dez linhas"
      className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900"
    >
      <dl className="space-y-3">
        {linhas.map((l) => (
          <div key={l.rotulo}>
            <dt className="eyebrow">{l.rotulo}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-stone-200">{l.texto}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ─── A proveniência, por baixo de cada item ────────────────────────────

/**
 * Nenhum item chega ao ecrã sem proveniência — e isto é o sítio onde essa
 * regra deixa de ser um tipo e passa a ser uma coisa que se lê.
 */
function Detalhe({ item }: { item: ItemDossie }) {
  const partes: string[] = [ROTULO_ORIGEM[item.proveniencia.origem]];

  if (item.estado) partes.push(ROTULO_ESTADO_ELEMENTO[item.estado]);
  if (item.resposta) {
    partes.push(
      `${item.sentido === "exclui" ? "não se aplica se" : "aplica-se se"} → ${ROTULO_RESPOSTA[item.resposta]}`,
    );
  }
  if (item.peso) partes.push(item.peso === "critical" ? "crítico" : item.peso === "high" ? "elevado" : "normal");
  if (item.quando?.ate) partes.push(`até ${item.quando.ate}`);
  if (item.proveniencia.origem === "motor") partes.push(item.proveniencia.ruleKey);
  if (item.proveniencia.origem === "afirmacao" && item.proveniencia.fonteIds.length > 0) {
    partes.push(item.proveniencia.fonteIds.join(", "));
  }
  if (item.data) partes.push(item.data);

  return (
    <>
      <span className="texto-mini mt-1 block text-stone-400">{partes.join(" · ")}</span>
      {item.fonte && (
        <a
          href={item.fonte.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="texto-mini mt-1 inline-flex items-center gap-1 text-brand-dark underline underline-offset-2 dark:text-brand"
        >
          {item.fonte.autoridade} <ExternalLink size={11} aria-hidden />
        </a>
      )}
    </>
  );
}
