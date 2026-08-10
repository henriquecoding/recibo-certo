"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CATEGORIAS,
  FERRAMENTAS,
  GUIAS,
  categoriaPorContexto,
  pesquisarAtividades,
  pesquisarItens,
  type CategoriaBusca,
  type ItemBusca,
} from "@/lib/busca";

// ─────────────────────────────────────────────────────────────────────
// O MOTOR DA PESQUISA — um só, para as duas superfícies.
//
// A pesquisa tem duas caras: no telemóvel é uma folha modal (em 360 px não
// há "ao lado", e o teclado virtual come metade do ecrã); no computador é a
// barra do cabeçalho a expandir-se onde está. São composições diferentes do
// MESMO motor — estado, atalhos, filtros, resultados e recentes vivem aqui.
//
// Se cada superfície tivesse a sua cópia, a primeira regra que alguém
// afinasse ficava a valer só de um lado, e o defeito só apareceria no
// tamanho de ecrã que quem afinou não estava a usar.
// ─────────────────────────────────────────────────────────────────────

/**
 * A fronteira entre as duas superfícies, escrita UMA vez.
 *
 * Tem de coincidir com o `lg:` do Tailwind que mostra o cabeçalho de
 * secretária e esconde o chrome inferior. Dois números diferentes abririam
 * uma faixa de larguras com as duas superfícies ao mesmo tempo — ou com
 * nenhuma, que é pior porque não se vê a faltar.
 */
export const CONSULTA_SECRETARIA = "(min-width: 1024px)";

/**
 * O complemento exacto da anterior — 1023.98 e não 1023.
 *
 * As consultas de media aceitam larguras fraccionárias (um ecrã a 150% de
 * zoom dá 1023,33 px), e `max-width: 1023px` deixaria essas larguras sem
 * NENHUMA superfície activa: `⌘K` não faria nada e o evento global não
 * abriria nada. É uma faixa estreita, e por isso um defeito que ninguém
 * reproduz e todos os relatos descrevem como «às vezes não abre».
 */
export const CONSULTA_MOVEL = "(max-width: 1023.98px)";

export const EVENTO_BUSCA_ABRIR = "recibocerto:busca:abrir";

/**
 * A pesquisa anuncia quando abre e quando fecha.
 *
 * Serve a barra fixa do telemóvel, que fica POR BAIXO da folha modal: sem
 * saber que a folha está aberta, ela continua a receber o `Tab` e o leitor de
 * ecrã continua a anunciar um campo que ninguém vê. `inert` resolve-o — mas só
 * se houver um sinal, e um evento é o que este projecto já usa para o inverso.
 */
export const EVENTO_BUSCA_ESTADO = "recibocerto:busca:estado";

export function anunciarEstadoBusca(aberto: boolean) {
  window.dispatchEvent(new CustomEvent(EVENTO_BUSCA_ESTADO, { detail: { aberto } }));
}

export function useBuscaAberta(): boolean {
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setAberta(Boolean((e as CustomEvent<{ aberto: boolean }>).detail?.aberto));
    window.addEventListener(EVENTO_BUSCA_ESTADO, on);
    return () => window.removeEventListener(EVENTO_BUSCA_ESTADO, on);
  }, []);
  return aberta;
}

const RECENTES_KEY = "recibocerto:busca:recentes";
const RECENTES_MAX = 6;

export function lerRecentes(): string[] {
  try {
    const cru = localStorage.getItem(RECENTES_KEY);
    const lista = cru ? JSON.parse(cru) : [];
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function guardarRecente(q: string) {
  const termo = q.trim();
  // Menos de dois caracteres não é uma pesquisa: é o caminho até uma. Guardar
  // "d" como recente enche a lista de ruído e empurra para fora o que serve.
  if (termo.length < 2) return;
  try {
    const lista = [termo, ...lerRecentes().filter((x) => x !== termo)].slice(0, RECENTES_MAX);
    localStorage.setItem(RECENTES_KEY, JSON.stringify(lista));
  } catch {
    /* modo privado, quota cheia — a pesquisa continua a funcionar sem histórico */
  }
}

/**
 * Adia o valor sem adiar o que se ESCREVE.
 *
 * O input é controlado por `query` (responde a cada tecla, sem atraso
 * perceptível); é a CONSULTA que espera. Ligar o input ao valor adiado
 * faria o cursor saltar e o texto aparecer a 160 ms de atraso.
 */
function useAdiado<T>(valor: T, ms = 160): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

/**
 * Os atalhos do estado inicial — ids de `FERRAMENTAS`, não rótulos.
 *
 * Um id que deixe de existir desaparece daqui em SILÊNCIO: o `.filter()` que
 * os resolve remove o que não encontra, e a grelha fica com menos cartões sem
 * partir nada. Por isso há um teste que confirma que todos resolvem.
 */
const MAIS_UTILIZADOS = ["f-comparar", "f-irs", "f-rv", "f-empresa", "f-venc", "f-simplificado"];

export interface FiltroDef {
  id: string;
  label: string;
}

export interface MotorBusca {
  categoria: CategoriaBusca;
  trocarCategoria: (c: CategoriaBusca) => void;
  query: string;
  setQuery: (q: string) => void;
  filtro: string;
  setFiltro: (f: string) => void;
  filtros: FiltroDef[];
  grupos: Record<string, ItemBusca[]>;
  resultadosAtividades: ReturnType<typeof pesquisarAtividades>;
  totalResultados: number;
  temQuery: boolean;
  categoriaAtual: (typeof CATEGORIAS)[number];
  recentes: string[];
  maisUtilizados: ItemBusca[];
  /** Navega e fecha. Guarda o termo nos recentes. */
  navegar: (href: string) => void;
  /** Enter abre o primeiro resultado — a via de quem não larga o teclado. */
  aoSubmeter: () => void;
  /** Repõe o estado para uma abertura nova, com o âmbito da rota actual. */
  reiniciar: () => void;
}

export function useMotorBusca({ aoFechar }: { aoFechar: () => void }): MotorBusca {
  const router = useRouter();
  const pathname = usePathname();

  const [categoria, setCategoria] = useState<CategoriaBusca>(() => categoriaPorContexto(pathname ?? "/"));
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState("all");
  const [recentes, setRecentes] = useState<string[]>([]);
  const adiado = useAdiado(query);

  const trocarCategoria = useCallback((c: CategoriaBusca) => {
    setCategoria(c);
    // O filtro pertence à categoria: "Art. 151.º" não existe em Guias, e
    // mantê-lo activo ao trocar devolveria zero resultados sem explicar porquê.
    setFiltro("all");
  }, []);

  const reiniciar = useCallback(() => {
    setCategoria(categoriaPorContexto(pathname ?? "/"));
    setFiltro("all");
    setQuery("");
    setRecentes(lerRecentes());
  }, [pathname]);

  const itens = categoria === "guias" ? GUIAS : FERRAMENTAS;

  const resultadosItens = useMemo(
    () =>
      categoria === "atividades"
        ? []
        : pesquisarItens(itens, adiado).filter((it) => filtro === "all" || it.grupo === filtro),
    [categoria, itens, adiado, filtro],
  );

  const resultadosAtividades = useMemo(
    () =>
      categoria === "atividades"
        ? pesquisarAtividades(adiado, 120).filter((a) => filtro === "all" || a.tipo === filtro)
        : [],
    [categoria, adiado, filtro],
  );

  const filtros = useMemo<FiltroDef[]>(() => {
    if (categoria === "atividades") {
      return [
        { id: "all", label: "Todas" },
        { id: "art151", label: "Art. 151.º" },
        { id: "outros", label: "Outros serviços" },
        { id: "vendas", label: "Vendas / hotelaria" },
        { id: "diretosAutor", label: "Direitos de autor" },
      ];
    }
    const fonte = categoria === "guias" ? GUIAS : FERRAMENTAS;
    const grupos = Array.from(new Set(fonte.map((i) => i.grupo)));
    return [{ id: "all", label: "Tudo" }, ...grupos.map((g) => ({ id: g, label: g }))];
  }, [categoria]);

  const grupos = useMemo(() => {
    const g: Record<string, ItemBusca[]> = {};
    for (const it of resultadosItens) (g[it.grupo] ??= []).push(it);
    return g;
  }, [resultadosItens]);

  const navegar = useCallback(
    (href: string) => {
      guardarRecente(query);
      aoFechar();
      router.push(href);
    },
    [query, aoFechar, router],
  );

  const aoSubmeter = useCallback(() => {
    if (categoria === "atividades") {
      const primeiro = resultadosAtividades[0];
      if (primeiro) navegar(`/dashboard/classificar-atividade?q=${encodeURIComponent(primeiro.label)}`);
      return;
    }
    const primeiro = resultadosItens[0];
    if (primeiro) navegar(primeiro.href);
  }, [categoria, resultadosAtividades, resultadosItens, navegar]);

  const maisUtilizados = useMemo(
    () => MAIS_UTILIZADOS.map((id) => FERRAMENTAS.find((f) => f.id === id)).filter((x): x is ItemBusca => !!x),
    [],
  );

  const categoriaAtual = CATEGORIAS.find((c) => c.id === categoria) ?? CATEGORIAS[0];

  return {
    categoria,
    trocarCategoria,
    query,
    setQuery,
    filtro,
    setFiltro,
    filtros,
    grupos,
    resultadosAtividades,
    totalResultados: categoria === "atividades" ? resultadosAtividades.length : resultadosItens.length,
    temQuery: !!adiado.trim(),
    categoriaAtual,
    recentes,
    maisUtilizados,
    navegar,
    aoSubmeter,
    reiniciar,
  };
}

/**
 * Quem responde ao `⌘K` e ao evento global — e apenas UMA superfície responde.
 *
 * As duas montam este hook. `ativaQuando` é a consulta de media que decide
 * qual delas está no ecrã, e a que não está simplesmente ignora o atalho. Sem
 * este acordo, `⌘K` abriria a folha modal E o painel do cabeçalho ao mesmo
 * tempo, com dois campos a disputar o foco.
 */
export function useAtalhoBusca({
  ativaQuando,
  aberto,
  abrir,
  fechar,
}: {
  ativaQuando: string;
  aberto: boolean;
  abrir: () => void;
  fechar: () => void;
}) {
  // Refs para o efeito não voltar a registar os ouvintes a cada tecla.
  const ref = useRef({ aberto, abrir, fechar });
  ref.current = { aberto, abrir, fechar };

  useEffect(() => {
    const consulta = window.matchMedia(ativaQuando);

    const naSuperficieCerta = () => consulta.matches;

    const onTecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (!naSuperficieCerta()) return;
        e.preventDefault();
        ref.current.aberto ? ref.current.fechar() : ref.current.abrir();
        return;
      }
      // Escape fecha mesmo que a superfície tenha mudado de tamanho entretanto:
      // ficar com um painel aberto que já não responde ao atalho é pior.
      if (e.key === "Escape" && ref.current.aberto) ref.current.fechar();
    };

    const onEvento = () => {
      if (naSuperficieCerta()) ref.current.abrir();
    };

    window.addEventListener("keydown", onTecla);
    window.addEventListener(EVENTO_BUSCA_ABRIR, onEvento);
    return () => {
      window.removeEventListener("keydown", onTecla);
      window.removeEventListener(EVENTO_BUSCA_ABRIR, onEvento);
    };
  }, [ativaQuando]);
}

/** `true` quando a consulta de media corresponde. Estável no servidor. */
export function useMediaQuery(consulta: string): boolean {
  const [corresponde, setCorresponde] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const sync = () => setCorresponde(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [consulta]);
  return corresponde;
}
