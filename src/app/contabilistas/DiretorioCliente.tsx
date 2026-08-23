"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O DIRETÓRIO — procura, filtros e resultados
//  ---------------------------------------------------------------------
//  Três mudanças de fundo em relação ao que estava aqui:
//
//   1. **O estado vive no endereço.** `?q=irs&distrito=Lisboa&vagas=1` é o
//      que a pessoa está a ver, e é isso que ela pode partilhar, atualizar
//      ou reencontrar quando volta de um perfil (§20). O componente não
//      guarda uma segunda cópia dos filtros: lê-os de `useSearchParams` e
//      escreve-os com `history.replaceState`, que o router do Next
//      reconhece — e assim não há uma entrada de histórico por tecla.
//
//   2. **Filtrar é trabalho da base de dados.** Antes vinham até 200
//      fichas inteiras e o browser fazia `.filter()`. Agora cada mudança
//      pede uma página de 24 já filtrada. É a diferença entre uma lista
//      que funciona com doze contabilistas e uma que funciona com mil.
//
//   3. **Um pedido antigo nunca vence um novo.** Escrever «irs» e logo a
//      seguir «iva» lança dois pedidos; se o primeiro chegar depois, os
//      resultados de «irs» apareceriam por baixo da palavra «iva». O
//      contador `pedido` garante que só a última resposta é escrita (§76).
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  comFiltro, contarFiltros, filtroParaQuery, FILTRO_VAZIO, lerDiretorio, parseFiltro,
  type CartaoDoDiretorio, type FiltroDiretorio, type OrdemDoDiretorio,
} from "@/lib/contabilistas/diretorio";
import ContabilistaCard from "@/components/diretorio/ContabilistaCard";
import DiretorioFinder from "./DiretorioFinder";
import { ColunaDeFiltros, FolhaDeFiltros } from "./DiretorioFiltros";
import VisitanteContextBar from "./VisitanteContextBar";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import Button from "@/components/ui/Button";
import SelectMenu, { type OpcaoSelectMenu } from "@/components/ui/SelectMenu";
import { Briefcase, Filter, Warning } from "@/components/ui/Icons";

const OPCOES_ORDEM: readonly OpcaoSelectMenu[] = [
  { value: "disponibilidade", label: "Quem aceita clientes primeiro" },
  { value: "nome", label: "Nome (A–Z)" },
];

function CartaoFantasma() {
  return (
    <div className="h-[19.5rem] animate-pulse rounded-4xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start gap-3.5">
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-stone-100 dark:bg-stone-800" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-stone-100 dark:bg-stone-800" />
          <div className="h-3 w-1/2 rounded bg-stone-100 dark:bg-stone-800" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <div className="h-3 w-full rounded bg-stone-100 dark:bg-stone-800" />
        <div className="h-3 w-5/6 rounded bg-stone-100 dark:bg-stone-800" />
      </div>
      <div className="mt-5 flex gap-1.5">
        <div className="h-6 w-16 rounded-lg bg-stone-100 dark:bg-stone-800" />
        <div className="h-6 w-14 rounded-lg bg-stone-100 dark:bg-stone-800" />
      </div>
      <div className="mt-6 h-10 rounded-xl bg-stone-100 dark:bg-stone-800" />
    </div>
  );
}

export default function DiretorioCliente() {
  const params = useSearchParams();
  const filtro = useMemo(() => parseFiltro(new URLSearchParams(params.toString())), [params]);

  const [cartoes, setCartoes] = useState<CartaoDoDiretorio[]>([]);
  const [total, setTotal] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [estado, setEstado] = useState<"a-ler" | "pronto" | "erro">("a-ler");
  const [aLer, setALer] = useState(true);
  const [aCarregarMais, setACarregarMais] = useState(false);
  const [folhaAberta, setFolhaAberta] = useState(false);
  /** Incrementa no «Tentar novamente» — é o que faz o efeito repetir. */
  const [tentativa, setTentativa] = useState(0);

  // O filtro corrente sem passar pelas dependências do efeito: o efeito
  // só deve reagir à IDENTIDADE dos filtros, não à página.
  const filtroRef = useRef(filtro);
  filtroRef.current = filtro;
  const pedido = useRef(0);

  const chaveDosFiltros = useMemo(() => filtroParaQuery({ ...filtro, pagina: 1 }), [filtro]);
  const numeroDeFiltros = contarFiltros(filtro);

  useEffect(() => {
    const meu = ++pedido.current;
    setALer(true);

    lerDiretorio(filtroRef.current, { desdeOInicio: true })
      .then((p) => {
        if (meu !== pedido.current) return;
        setCartoes(p.cartoes);
        setTotal(p.total);
        setTemMais(p.temMais);
        setEstado("pronto");
      })
      .catch((e: Error) => {
        if (meu !== pedido.current) return;
        // A mensagem técnica fica na consola; a pessoa recebe uma frase e
        // um botão. Um erro do PostgREST não é informação para ninguém (§80).
        console.error("[diretorio] falha ao ler o diretório:", e.message);
        setEstado("erro");
      })
      .finally(() => {
        if (meu === pedido.current) setALer(false);
      });
  }, [chaveDosFiltros, tentativa]);

  /** Escreve o filtro no endereço. O router do Next lê-o de volta. */
  const irPara = useCallback((novo: FiltroDiretorio) => {
    const query = filtroParaQuery(novo);
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, []);

  const mudar = useCallback(
    (mudanca: Partial<FiltroDiretorio>) => irPara(comFiltro(filtroRef.current, mudanca)),
    [irPara],
  );

  // Limpar apaga os filtros, não a ordenação: a ordem é uma preferência de
  // leitura, e reposicioná-la sem aviso é mudar a lista debaixo dos olhos.
  const limpar = useCallback(
    () => irPara({ ...FILTRO_VAZIO, ordem: filtroRef.current.ordem }),
    [irPara],
  );

  function carregarMais() {
    const proxima = { ...filtro, pagina: filtro.pagina + 1 };
    const meu = ++pedido.current;
    setACarregarMais(true);
    irPara(proxima);

    lerDiretorio(proxima, { desdeOInicio: false })
      .then((p) => {
        if (meu !== pedido.current) return;
        // Concatenar e não substituir: quem carregou três páginas não pode
        // perder as duas primeiras por ter pedido a terceira.
        setCartoes((atuais) => [...atuais, ...p.cartoes]);
        setTotal(p.total);
        setTemMais(p.temMais);
      })
      .catch((e: Error) => {
        if (meu === pedido.current) console.error("[diretorio] falha ao carregar mais:", e.message);
      })
      .finally(() => {
        if (meu === pedido.current) setACarregarMais(false);
      });
  }

  const semFiltros = numeroDeFiltros === 0;

  return (
    <>
      <DiretorioFinder filtro={filtro} onMudar={mudar} />

      <div className="mt-4">
        <VisitanteContextBar />
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id="resultados" className="font-display text-2xl text-ink dark:text-stone-50 sm:text-[1.75rem]">
            Contabilistas disponíveis
          </h2>
          <p role="status" aria-live="polite" className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {estado === "erro"
              ? "Não foi possível carregar o diretório."
              : aLer && cartoes.length === 0
                ? "A procurar…"
                : total === 0
                  ? "Nenhum perfil corresponde a esta procura."
                  : `${total} ${total === 1 ? "perfil encontrado" : "perfis encontrados"}${
                      filtro.ordem === "nome" ? " · por ordem alfabética" : " · quem aceita clientes primeiro"
                    }`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFolhaAberta(true)}
            className="focus-marca inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-semibold text-stone-700 shadow-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 lg:hidden"
          >
            <Filter size={15} aria-hidden />
            Filtros
            {numeroDeFiltros > 0 && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-[0.625rem] font-bold text-white">
                {numeroDeFiltros}
              </span>
            )}
          </button>

          <SelectMenu
            id="diretorio-ordem"
            value={filtro.ordem}
            options={OPCOES_ORDEM}
            onChange={(v) => mudar({ ordem: v as OrdemDoDiretorio })}
            ariaLabel="Ordenar resultados"
            className="w-[13.5rem]"
          />
        </div>
      </div>

      {/* `grid-cols-1` e `minmax(0,…)` não são zelo: uma grelha sem colunas
          declaradas cria uma coluna implícita `auto`, que se dimensiona pelo
          conteúdo máximo e arrasta a página para lá do ecrã. É assim que um
          cartão de 394px aparece dentro de um telemóvel de 360px. */}
      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <ColunaDeFiltros
          filtro={filtro}
          onMudar={mudar}
          onLimpar={limpar}
          temFiltros={numeroDeFiltros > 0}
        />

        <div className="min-w-0">
          {estado === "erro" ? (
            <div
              role="alert"
              className="rounded-4xl border border-stone-200 bg-white px-5 py-10 text-center shadow-card dark:border-stone-800 dark:bg-stone-900"
            >
              <Warning size={26} className="mx-auto text-alert-text" aria-hidden />
              <p className="mt-3 font-display text-lg text-ink dark:text-stone-50">
                Não foi possível carregar o diretório.
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                Pode ter sido uma falha momentânea de ligação. Os perfis continuam lá.
              </p>
              <div className="mt-5 flex justify-center">
                <Button variant="secondary" onClick={() => setTentativa((t) => t + 1)}>
                  Tentar novamente
                </Button>
              </div>
            </div>
          ) : aLer && cartoes.length === 0 ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true" aria-label="A carregar contabilistas">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i}><CartaoFantasma /></li>
              ))}
            </ul>
          ) : cartoes.length === 0 ? (
            <EstadoVazio
              Icon={Briefcase}
              titulo={semFiltros ? "O diretório ainda está a começar" : "Não encontrámos ninguém com estes filtros"}
              descricao={
                semFiltros
                  ? "Ainda não há contabilistas aprovados. Se és contabilista, podes ser dos primeiros."
                  : filtro.distrito
                    ? "Experimenta procurar quem atende online — não depende do distrito."
                    : "Tenta com menos filtros, ou procura por outra área de trabalho."
              }
              acao={
                semFiltros ? (
                  <Link href="/contabilistas/candidatura">
                    <Button variant="secondary">Candidatar-me</Button>
                  </Link>
                ) : (
                  <div className="flex flex-wrap justify-center gap-2">
                    {filtro.distrito && (
                      <Button variant="secondary" onClick={() => mudar({ distrito: "", modalidade: "online" })}>
                        Ver quem atende online
                      </Button>
                    )}
                    <Button variant="ghost" onClick={limpar}>Limpar filtros</Button>
                  </div>
                )
              }
            />
          ) : (
            <>
              <ul
                className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 ${aLer ? "opacity-60" : "opacity-100"}`}
              >
                {cartoes.map((c) => (
                  <li key={c.userId}>
                    <ContabilistaCard cartao={c} areaEmDestaque={filtro.especialidade} />
                  </li>
                ))}
              </ul>

              {temMais && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <Button variant="secondary" onClick={carregarMais} disabled={aCarregarMais}>
                    {aCarregarMais ? "A carregar…" : "Carregar mais"}
                  </Button>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    A mostrar {cartoes.length} de {total}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <FolhaDeFiltros
        aberta={folhaAberta}
        onFechar={() => setFolhaAberta(false)}
        filtro={filtro}
        onMudar={mudar}
        onLimpar={limpar}
        total={total}
        aLer={aLer}
      />
    </>
  );
}
