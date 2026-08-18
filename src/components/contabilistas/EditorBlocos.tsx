"use client";

// ═══════════════════════════════════════════════════════════════════════
//  EDITOR DE BLOCOS — onde o perfil deixa de ser um formulário
//  ---------------------------------------------------------------------
//  A pessoa escolhe os blocos que quer, escreve o que quiser lá dentro e
//  põe-nos pela ordem que quiser. O que este componente NÃO faz é decidir
//  o que é válido: isso é do motor (`personalizacao/blocos.ts`), e o
//  guardião de afirmações corre a cada tecla para o problema aparecer
//  enquanto se escreve, e não depois de gravar.
//
//  Um detalhe que parece de estilo e é de verdade: um achado de BLOQUEIO
//  não impede de escrever nem de gravar. Impede de PUBLICAR — o bloco
//  fica no editor e não sai no perfil público. Impedir a escrita fazia
//  perder texto; deixar publicar fazia-nos assinar a afirmação.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { ChevronDown, ChevronUp, Info, Plus, Trash, Warning } from "@/components/ui/Icons";
import {
  ESQUEMAS, MAX_BLOCOS, MAX_TITULO, moverBloco, novoBloco, tiposDisponiveis,
  validarBloco, validarBlocos, type Bloco, type TipoBloco,
} from "@/lib/contabilistas/personalizacao/blocos";

export interface EditorBlocosProps {
  blocos: Bloco[];
  aoMudar: (blocos: Bloco[]) => void;
}

export default function EditorBlocos({ blocos, aoMudar }: EditorBlocosProps) {
  const conjunto = useMemo(() => validarBlocos(blocos), [blocos]);
  const disponiveis = useMemo(() => tiposDisponiveis(blocos), [blocos]);

  function alterar(i: number, patch: Partial<Bloco>) {
    aoMudar(blocos.map((b, k) => (k === i ? { ...b, ...patch } : b)));
  }

  function alterarItem(i: number, j: number, patch: { principal?: string; secundario?: string }) {
    alterar(i, {
      itens: blocos[i].itens.map((item, k) =>
        k === j
          ? {
              principal: patch.principal ?? item.principal,
              secundario: patch.secundario !== undefined ? patch.secundario : item.secundario,
            }
          : item
      ),
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-stone-600">
        Escolhe as secções que fazem sentido para ti e escreve o que quiseres.
        Só entra no perfil público o que estiver completo — um bloco a meio
        fica aqui, guardado, até acabares.
      </p>

      {conjunto.gerais.length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-alert-bg px-3 py-2.5 text-sm text-alert-text">
          {conjunto.gerais.map((g) => (
            <li key={g} className="flex items-start gap-1.5">
              <Warning size={14} className="mt-0.5 shrink-0" aria-hidden />
              {g}
            </li>
          ))}
        </ul>
      )}

      <ul className="space-y-3">
        {blocos.map((b, i) => {
          const esquema = ESQUEMAS[b.tipo];
          const v = validarBloco(b);
          const bloqueios = v.achados.filter((a) => a.achado.gravidade === "bloqueio");
          const avisos = v.achados.filter((a) => a.achado.gravidade === "aviso");

          return (
            <li
              key={b.id}
              className="rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone="neutral">{esquema.nome}</Badge>
                <div className="flex items-center gap-1">
                  <IconeBotao
                    rotulo={`Subir «${b.titulo || esquema.nome}»`}
                    desativado={i === 0}
                    aoClicar={() => aoMudar(moverBloco(blocos, i, i - 1))}
                  >
                    <ChevronUp size={16} aria-hidden />
                  </IconeBotao>
                  <IconeBotao
                    rotulo={`Descer «${b.titulo || esquema.nome}»`}
                    desativado={i === blocos.length - 1}
                    aoClicar={() => aoMudar(moverBloco(blocos, i, i + 1))}
                  >
                    <ChevronDown size={16} aria-hidden />
                  </IconeBotao>
                  <IconeBotao
                    rotulo={`Apagar «${b.titulo || esquema.nome}»`}
                    aoClicar={() => aoMudar(blocos.filter((_, k) => k !== i))}
                  >
                    <Trash size={16} aria-hidden />
                  </IconeBotao>
                </div>
              </div>

              <label className="mt-3 block">
                <span className="sr-only">Título do bloco</span>
                <input
                  type="text"
                  value={b.titulo}
                  maxLength={MAX_TITULO}
                  onChange={(e) => alterar(i, { titulo: e.target.value })}
                  placeholder={esquema.tituloSugerido}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-base font-semibold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>

              <ul className="mt-2.5 space-y-2">
                {b.itens.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {b.tipo === "texto" ? (
                        <textarea
                          value={item.principal}
                          rows={4}
                          maxLength={esquema.maxCaracteresItem}
                          onChange={(e) => alterarItem(i, j, { principal: e.target.value })}
                          placeholder={esquema.exemplo}
                          className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed text-stone-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                        />
                      ) : (
                        <input
                          type="text"
                          value={item.principal}
                          maxLength={esquema.maxCaracteresItem}
                          onChange={(e) => alterarItem(i, j, { principal: e.target.value })}
                          placeholder={b.tipo === "faq" ? "A pergunta" : esquema.exemplo}
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                        />
                      )}

                      {b.tipo === "faq" && (
                        <textarea
                          value={item.secundario ?? ""}
                          rows={2}
                          maxLength={esquema.maxCaracteresItem}
                          onChange={(e) => alterarItem(i, j, { secundario: e.target.value })}
                          placeholder="A resposta"
                          className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed text-stone-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                        />
                      )}
                    </div>

                    {b.itens.length > 1 && (
                      <IconeBotao
                        rotulo={`Remover entrada ${j + 1}`}
                        aoClicar={() =>
                          alterar(i, { itens: b.itens.filter((_, k) => k !== j) })
                        }
                      >
                        <Trash size={15} aria-hidden />
                      </IconeBotao>
                    )}
                  </li>
                ))}
              </ul>

              {b.itens.length < esquema.maxItens && (
                <button
                  type="button"
                  onClick={() =>
                    alterar(i, {
                      itens: [...b.itens, { principal: "", secundario: b.tipo === "faq" ? "" : null }],
                    })
                  }
                  className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-brand-dark hover:underline dark:text-brand"
                >
                  <Plus size={14} aria-hidden /> Acrescentar entrada
                </button>
              )}

              {/* O guardião. Bloqueios primeiro, porque são os que
                  impedem o bloco de sair no perfil. */}
              {(bloqueios.length > 0 || avisos.length > 0) && (
                <ul className="mt-3 space-y-1.5 border-t border-stone-100 pt-3">
                  {[...bloqueios, ...avisos].map((a, k) => (
                    <li
                      key={`${a.achado.regra}-${k}`}
                      className={`flex items-start gap-1.5 text-xs leading-relaxed ${
                        a.achado.gravidade === "bloqueio" ? "text-clay-text" : "text-stone-500"
                      }`}
                    >
                      {a.achado.gravidade === "bloqueio"
                        ? <Warning size={13} className="mt-0.5 shrink-0" aria-hidden />
                        : <Info size={13} className="mt-0.5 shrink-0" aria-hidden />}
                      <span>
                        <strong className="font-semibold">«{a.achado.excerto}»</strong> — {a.achado.porque}{" "}
                        {a.achado.sugestao}
                      </span>
                    </li>
                  ))}
                  {bloqueios.length > 0 && (
                    <li className="text-xs font-medium text-clay-text">
                      Enquanto isto estiver escrito, este bloco não aparece no perfil público.
                    </li>
                  )}
                </ul>
              )}

              {v.erros.filter((e) => e.campo !== "itens").map((e, k) => (
                <p key={k} className="mt-2 text-xs text-clay-text">{e.mensagem}</p>
              ))}
            </li>
          );
        })}
      </ul>

      {disponiveis.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            Acrescentar secção
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {disponiveis.map((t) => (
              <li key={t}>
                <BotaoTipo tipo={t} aoAdicionar={() => aoMudar([...blocos, novoBloco(t)])} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          {blocos.length >= MAX_BLOCOS
            ? `Chegaste aos ${MAX_BLOCOS} blocos. Mais do que isto deixa de se ler.`
            : "Já usaste todas as secções disponíveis."}
        </p>
      )}
    </div>
  );
}

function BotaoTipo({ tipo, aoAdicionar }: { tipo: TipoBloco; aoAdicionar: () => void }) {
  const e = ESQUEMAS[tipo];
  return (
    <Button variant="secondary" size="sm" onClick={aoAdicionar} title={e.descricao}>
      <Plus size={14} className="mr-1.5" aria-hidden />
      {e.nome}
    </Button>
  );
}

/** Alvo de toque de 36px, como manda a regra de mobile-first do projeto. */
function IconeBotao({
  rotulo, aoClicar, desativado, children,
}: {
  rotulo: string;
  aoClicar: () => void;
  desativado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={desativado}
      aria-label={rotulo}
      title={rotulo}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-stone-800 dark:hover:text-stone-300"
    >
      {children}
    </button>
  );
}
