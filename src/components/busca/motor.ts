"use client";

import { useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════
//  O QUE O CABEÇALHO PRECISA DE SABER SOBRE A PESQUISA — E MAIS NADA
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ ESTE FICHEIRO É LEVE, E ISSO É UMA DECISÃO DE ARQUITECTURA (P1-02)   │
//  │                                                                     │
//  │ Aqui vivia também o motor da pesquisa — e o motor importava o        │
//  │ índice, que importava `fiscal-data.ts`. Como o cabeçalho importa     │
//  │ este ficheiro, a cadeia arrastava o catálogo fiscal para o bundle    │
//  │ inicial de TODAS as páginas públicas. O comentário dizia que só      │
//  │ carregava ao abrir; o grafo de imports dizia o contrário, e o grafo  │
//  │ é que manda.                                                         │
//  │                                                                     │
//  │ O que ficou: atalhos de teclado, consultas de media e o par de       │
//  │ eventos. Zero importações de dados. O controlador da pesquisa vive   │
//  │ em `useControladorBusca.ts` e só chega por `next/dynamic`; o índice  │
//  │ é um JSON que só é pedido quando alguém mostra intenção de procurar. │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

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
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ O CHROME QUE O PAINEL NÃO PODE DESTRUIR — ESCRITO UMA VEZ            │
 * │                                                                     │
 * │ O painel fecha no `pointerdown` de tudo o que é fora dele, e há uma  │
 * │ excepção: o próprio chrome. Ver o quadro em `ancoragem.ts` — dentro  │
 * │ do chrome espera-se pelo `click`, senão fechar destrói o alvo do     │
 * │ gesto que ainda vem a caminho e carregar num destino não navega.     │
 * │                                                                     │
 * │ O selector estava escrito à mão dentro do painel: `nav[data-compacto]│
 * │ ` para a secretária. O cabeçalho foi reescrito (passou a ser o       │
 * │ cartão do desenho, com `data-expandido`), o atributo desapareceu do  │
 * │ DOM e o selector passou a casar com ZERO elementos. Nada falhou,     │
 * │ nada avisou: a excepção simplesmente deixou de existir, e a          │
 * │ protecção que este código descreve em três parágrafos era, na        │
 * │ prática, uma string morta. O do telemóvel apontava só à fila dos     │
 * │ cinco pilares e deixava de fora a linha da marca e do menu — meia    │
 * │ excepção, que é o mesmo defeito em ponto pequeno.                    │
 * │                                                                     │
 * │ Passa a ser um MARCADOR declarado pelo próprio chrome, e o par       │
 * │ (constante aqui, atributo lá) é verificado por teste. Um cabeçalho   │
 * │ novo tem de o levar consigo, ou o teste reprova antes de sair daqui. │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export const MARCA_CHROME = "data-rc-chrome";
export const CHROME_SECRETARIA = `[${MARCA_CHROME}="secretaria"]`;
export const CHROME_MOVEL = `[${MARCA_CHROME}="movel"]`;

/**
 * A pesquisa anuncia quando abre e quando fecha.
 *
 * Serve a barra fixa do telemóvel, que fica POR BAIXO do diálogo: sem
 * saber que ele está aberto, ela continua a receber o `Tab` e o leitor de
 * ecrã continua a anunciar um campo que ninguém vê.
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

/**
 * Quem responde ao `⌘K` e ao evento global — e apenas UMA superfície responde.
 *
 * As duas montam este hook. `ativaQuando` é a consulta de media que decide
 * qual delas está no ecrã, e a que não está simplesmente ignora o atalho. Sem
 * este acordo, `⌘K` abriria o diálogo do telemóvel E o painel do cabeçalho ao
 * mesmo tempo, com dois campos a disputar o foco.
 */
/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ QUEM RESPONDE QUANDO NÃO HÁ LANÇADOR DE SECRETARIA                   │
 * │                                                                     │
 * │ O acordo «só uma superfície responde» era por LARGURA, e isso deixou │
 * │ um botão morto: o painel tem a sua própria barra lateral, com um     │
 * │ botão de pesquisa, e o cabeçalho público (que traz o lançador de     │
 * │ secretária) não existe lá. Num ecrã largo dentro do painel, esse     │
 * │ botão disparava o evento global e NINGUÉM o ouvia — clicar não fazia │
 * │ nada, e `⌘K` também não.                                             │
 * │                                                                     │
 * │ A regra certa não é a largura: é «existe um lançador ancorado?». Se  │
 * │ existir, é ele que abre (é onde a pessoa clicou). Se não existir, o  │
 * │ diálogo responde, seja qual for a largura — que é exactamente o que  │
 * │ um botão de pesquisa sem barra por baixo deve fazer.                 │
 * │                                                                     │
 * │ Um contador de módulo e não um contexto: isto é lido dentro de um    │
 * │ ouvinte de teclado, fora do ciclo de render, e não tem de provocar   │
 * │ actualizações em ninguém.                                            │
 * └─────────────────────────────────────────────────────────────────────┘
 */
/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ «ANCORADO», E JÁ NÃO «DE SECRETÁRIA»                                 │
 * │                                                                     │
 * │ Chamava-se `lancadoresDeSecretaria` porque durante um tempo só o     │
 * │ computador tinha uma barra com painel próprio: no telemóvel a        │
 * │ pesquisa era um diálogo modal, e o registo servia para o diálogo     │
 * │ saber que não devia responder onde já havia barra.                   │
 * │                                                                     │
 * │ Agora as duas superfícies são barras com painel ancorado — a de      │
 * │ secretária abre para baixo, a do telemóvel para cima — e o nome      │
 * │ tinha deixado de descrever a coisa. A pergunta que este contador     │
 * │ responde é a mesma de sempre e continua a ser a certa: «há uma       │
 * │ barra onde este gesto possa abrir?». Se houver, é ela que abre. Se   │
 * │ não houver — no /dashboard, no /admin, dentro de `/pesquisar` — o    │
 * │ diálogo global responde, que é o que um botão de pesquisa sem barra  │
 * │ por baixo tem de fazer.                                             │
 * └─────────────────────────────────────────────────────────────────────┘
 */
let lancadoresAncorados = 0;

export function registarLancadorAncorado(): () => void {
  lancadoresAncorados += 1;
  return () => {
    lancadoresAncorados -= 1;
  };
}

export function haLancadorAncorado(): boolean {
  return lancadoresAncorados > 0;
}

/**
 * Regista uma barra ancorada — mas SÓ ENQUANTO ELA ESTIVER NO ECRÃ.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ ESTAR MONTADO NÃO É ESTAR VISÍVEL, E A DIFERENÇA CALA A PESQUISA     │
 * │                                                                     │
 * │ As duas barras escondem-se por CSS (`hidden lg:block` numa,          │
 * │ `lg:hidden` na outra), portanto estão as duas montadas em todas as   │
 * │ larguras. Um registo incondicional fazia a de telemóvel declarar-se  │
 * │ presente num ecrã de 1280 px, onde ninguém a vê — e como o diálogo   │
 * │ global se cala onde há barra, bastava uma página sem cabeçalho de    │
 * │ secretária para o `⌘K` e o botão de pesquisa deixarem de fazer nada. │
 * │ Sem erro, sem aviso: um atalho que simplesmente não responde.        │
 * │                                                                     │
 * │ Passa a registar-se pela consulta de media, que é a mesma que decide │
 * │ se a barra se vê. «Há uma barra onde este gesto possa abrir?» volta  │
 * │ a ser uma pergunta sobre o que está no ecrã.                         │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function useRegistarLancador(consulta: string) {
  const visivel = useMediaQuery(consulta);
  useEffect(() => {
    if (!visivel) return;
    return registarLancadorAncorado();
  }, [visivel]);
}

export function useAtalhoBusca({
  ativaQuando,
  tambemQuando,
  aberto,
  abrir,
  fechar,
}: {
  /**
   * A largura em que esta superfície é a que está no ecrã. Opcional: o
   * diálogo global não tem largura própria — responde por AUSÊNCIA de
   * barra, seja qual for o tamanho do ecrã, e por isso só traz
   * `tambemQuando`. Escrever-lhe uma consulta que nunca casa era a
   * alternativa, e é a que obriga o leitor seguinte a perceber porquê.
   */
  ativaQuando?: string;
  /** Condição extra, avaliada no momento do gesto. Ver o quadro acima. */
  tambemQuando?: () => boolean;
  aberto: boolean;
  abrir: () => void;
  fechar: () => void;
}) {
  /**
   * As dependências vivem numa ref para o efeito não voltar a registar os
   * ouvintes a cada render — mas a ref é actualizada num EFEITO, não no corpo
   * do componente.
   *
   * Escrever numa ref durante o render é o que parece mais simples e é o que a
   * documentação do React desaconselha: um render pode ser começado e deitado
   * fora (StrictMode, transições, Suspense), e a escrita fica lá na mesma.
   * Aqui isso significaria o atalho a fechar um painel que já reabriu, ou a
   * chamar um `fechar` de uma versão do componente que já não existe.
   */
  const ref = useRef({ aberto, abrir, fechar, tambemQuando });
  useEffect(() => {
    ref.current = { aberto, abrir, fechar, tambemQuando };
  });

  useEffect(() => {
    const consulta = ativaQuando ? window.matchMedia(ativaQuando) : null;

    const naSuperficieCerta = () => (consulta?.matches ?? false) || (ref.current.tambemQuando?.() ?? false);

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

/**
 * `⌘K` no Mac, `Ctrl K` no resto — e nada antes de saber qual.
 *
 * Um glifo de Command fixo não comunica nada a quem está em Windows ou
 * Linux, que é a maioria (P2-03). Só depois de montar é que há `navigator`,
 * e por isso o rótulo entra no segundo render: é decoração `aria-hidden`, e
 * o nome acessível do lançador nunca dependeu disto.
 *
 * Vive AQUI, no módulo leve, e não junto das peças visuais: é o lançador
 * que o usa, e o lançador está no bundle inicial de todas as páginas.
 */
export function useAtalhoDoSistema(): string {
  const [rotulo, setRotulo] = useState("");
  useEffect(() => {
    const mac = /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
    setRotulo(mac ? "⌘K" : "Ctrl K");
  }, []);
  return rotulo;
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

/**
 * Leva o foco ao primeiro resultado da lista.
 *
 * `ArrowDown` no campo entra nos resultados; `ArrowUp` no primeiro volta ao
 * campo. É a única navegação por setas que existe — deliberadamente. Uma
 * combobox completa (selecção activa anunciada, `aria-activedescendant`,
 * Enter a abrir o item seleccionado) seria o outro contrato possível, e o
 * erro está em prometer esse e entregar este. Aqui os resultados são
 * ligações verdadeiras: o `Tab` entra neles, o browser anuncia-os como
 * ligações e a seta é só um atalho.
 */
export function focarPrimeiroResultado(container: HTMLElement | null) {
  container?.querySelector<HTMLElement>("[data-resultado]")?.focus();
}

/**
 * O caminho de volta: `ArrowUp` no PRIMEIRO resultado devolve o foco ao
 * campo. Sem ele, a seta era um caminho só de ida — entrava-se na lista e
 * só se saía com `Shift+Tab`, que é uma tecla diferente para desfazer a
 * mesma acção.
 *
 * Vive nas duas superfícies porque o contrato de teclado é o mesmo nas
 * duas; a composição é que muda.
 */
export function useVoltarAoCampo(
  listaRef: React.RefObject<HTMLElement | null>,
  inputRef: React.RefObject<HTMLInputElement | null>,
) {
  useEffect(() => {
    const onTecla = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp") return;
      const ativo = document.activeElement;
      if (!(ativo instanceof HTMLElement) || ativo.dataset.resultado === undefined) return;
      if (ativo !== listaRef.current?.querySelector("[data-resultado]")) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onTecla);
    return () => document.removeEventListener("keydown", onTecla);
  }, [listaRef, inputRef]);
}
