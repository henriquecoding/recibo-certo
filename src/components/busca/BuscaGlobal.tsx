"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { SuperficieModal } from "@/components/overlays/SuperficieModal";
import { useOverlay } from "@/components/overlays/CoordenadorOverlays";
import { TETO_DIALOGO } from "@/lib/busca/pontuar";
import {
  CONSULTA_MOVEL,
  anunciarEstadoBusca,
  focarPrimeiroResultado,
  haLancadorDeSecretaria,
  useAtalhoBusca,
  useVoltarAoCampo,
} from "./motor";
import { ChipsIntencao, CorpoResultados, EstadoAcessivel, FormularioBusca } from "./partes";
import { useControladorBusca } from "./useControladorBusca";

// O botão de pesquisa vive em `./BuscaTrigger` (ficheiro leve) para não
// arrastar este diálogo nem o índice para o bundle de quem só mostra o botão.
export { BuscaTrigger } from "./BuscaTrigger";

/**
 * A pesquisa no TELEMÓVEL — um diálogo modal, e é a decisão certa.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PORQUE AQUI É MODAL E NO COMPUTADOR NÃO                                  │
 * │                                                                         │
 * │ Em 360 px não há «ao lado»: um painel ancorado a uma barra ocuparia o    │
 * │ ecrã todo na mesma, mas sem o dizer, e o teclado virtual — que come      │
 * │ metade da altura — deixaria os resultados fora de vista.                 │
 * │                                                                         │
 * │ Por isso o campo vive em BAIXO, na zona do polegar e imediatamente       │
 * │ acima do teclado, e os resultados crescem para CIMA. A ordem visual é    │
 * │ invertida com `order-*`; o conteúdo vem dos mesmos componentes do        │
 * │ painel de secretária.                                                    │
 * │                                                                         │
 * │ Sendo modal a sério, o contrato é completo — foco inicial, prisão do     │
 * │ Tab, fundo `inert`, scroll bloqueado e devolução do foco — e vem todo    │
 * │ de `SuperficieModal`, que o escreve UMA vez para todos os diálogos.      │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export default function BuscaOverlay() {
  const pathname = usePathname();
  const [querAbrir, setQuerAbrir] = useState(false);

  // A vaga do coordenador: nunca há dois `aria-modal` ao mesmo tempo.
  const aberto = useOverlay("busca", querAbrir, { modal: true, iniciadoPeloUtilizador: true });

  const inputRef = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);

  const fechar = useCallback(() => setQuerAbrir(false), []);
  const abrir = useCallback(() => setQuerAbrir(true), []);

  // Avisa a barra fixa para se tornar inerte enquanto o diálogo está por cima
  // dela. (O `inert` por irmãos de `SuperficieModal` já a cobre; este evento
  // continua a servir a opacidade da própria barra, que é visual.)
  useEffect(() => {
    anunciarEstadoBusca(aberto);
  }, [aberto]);

  // Ver o quadro em `motor.ts`: em ecrã largo o lançador ancorado é que
  // abre — a não ser que não exista nenhum (é o caso do painel, que tem
  // barra lateral própria), e aí é este diálogo que responde.
  useAtalhoBusca({
    ativaQuando: CONSULTA_MOVEL,
    tambemQuando: () => !haLancadorDeSecretaria(),
    aberto,
    abrir,
    fechar,
  });

  useEffect(() => {
    setQuerAbrir(false);
  }, [pathname]);

  /**
   * Redimensionar para secretária fecha — mas só quando há para onde ir.
   *
   * O contrato de interação diz «fecha com foco seguro ou migra uma única
   * vez, sem dois campos». Fechar aqui é a metade simples; a outra metade é
   * não fechar no painel, onde este diálogo É a única superfície que existe
   * e fechá-lo deixaria a pessoa sem pesquisa nenhuma.
   */
  useEffect(() => {
    if (!aberto) return;
    const mq = window.matchMedia(CONSULTA_MOVEL);
    const aoMudar = () => {
      if (!mq.matches && haLancadorDeSecretaria()) setQuerAbrir(false);
    };
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, [aberto]);

  /**
   * O teclado virtual muda a altura útil, e a folha tem de o acompanhar.
   *
   * `window.innerHeight` não muda quando o teclado abre no iOS — só o
   * `visualViewport` sabe. Sem isto, o campo fica POR BAIXO do teclado, que é
   * a falha clássica de uma pesquisa em folha inferior.
   */
  const [tecladoInset, setTecladoInset] = useState(0);
  const [alturaVisivel, setAlturaVisivel] = useState(0);

  useEffect(() => {
    if (!aberto) return;
    const vv = window.visualViewport;
    const update = () => {
      if (!vv) {
        setTecladoInset(0);
        setAlturaVisivel(window.innerHeight);
        return;
      }
      setTecladoInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
      setAlturaVisivel(vv.height);
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, [aberto]);

  return (
    <SuperficieModal
      aberto={aberto}
      aoFechar={fechar}
      rotulo="Pesquisa"
      focoInicial={() => inputRef.current}
      // O gatilho é a barra fixa do chrome inferior. Se ela já não existir
      // (mudou de rota, mudou de largura), `SuperficieModal` cai no elemento
      // que tinha o foco antes — nunca no `<body>`.
      focoDeRegresso={() => document.querySelector<HTMLElement>('[data-busca-gatilho="movel"]')}
      // Sem `lg:hidden`: em ecrã largo isto SÓ monta quando não há
      // lançador ancorado, e escondê-lo por CSS deixaria o painel com um
      // diálogo aberto e invisível a prender o foco.
      className="fixed inset-0 z-[120]"
    >
      <Conteudo
        fechar={fechar}
        inputRef={inputRef}
        lista={lista}
        tecladoInset={tecladoInset}
        alturaVisivel={alturaVisivel}
      />
    </SuperficieModal>
  );
}

/**
 * O conteúdo vive num componente próprio porque monta com o diálogo.
 *
 * O controlador tem estado por abertura (consulta, intenção, recentes lidos
 * no momento, medição de abandono) e é isso que o faz nascer limpo de cada
 * vez, sem um `reiniciar()` que alguém se esqueça de chamar.
 */
function Conteudo({
  fechar,
  inputRef,
  lista,
  tecladoInset,
  alturaVisivel,
}: {
  fechar: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  lista: React.RefObject<HTMLDivElement | null>;
  tecladoInset: number;
  alturaVisivel: number;
}) {
  const controlador = useControladorBusca({ teto: TETO_DIALOGO });

  // O mesmo contrato de teclado das duas superfícies — ver `motor.ts`.
  useVoltarAoCampo(lista, inputRef);

  return (
    <AnimatePresence>
      <m.div
        key="folha"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-stone-900/45 backdrop-blur-md"
        onClick={fechar}
        aria-hidden
      />

      <div
        key="caixa"
        className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-start sm:p-4 sm:pt-[6vh]"
      >
        <m.div
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", damping: 32, stiffness: 340 }}
          style={{
            marginBottom: tecladoInset,
            maxHeight: alturaVisivel ? alturaVisivel - 12 : undefined,
            transition: "margin-bottom 0.22s cubic-bezier(0.16,1,0.3,1)",
          }}
          data-busca-painel="movel"
          className="pointer-events-auto flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-stone-200/80 bg-white shadow-float ring-1 ring-black/5 dark:border-stone-800 dark:bg-stone-900 dark:ring-white/5 sm:max-h-[82dvh] sm:rounded-2xl"
        >
          {/* Campo — em baixo no telemóvel (zona do polegar, acima do
              teclado); em cima a partir de `sm`. */}
          <div className="order-3 shrink-0 border-stone-100 dark:border-stone-800 sm:order-1 sm:border-b">
            <FormularioBusca
              controlador={controlador}
              inputRef={inputRef}
              id="rc-busca-movel"
              aoFechar={fechar}
              aoDescer={() => focarPrimeiroResultado(lista.current)}
            />
          </div>

          <div className="order-2 shrink-0 sm:order-2">
            <ChipsIntencao controlador={controlador} inputRef={inputRef} />
          </div>

          {/* `min-h-0` é o que permite ao filho rolar dentro de um flex
              column: sem isso o conteúdo empurra a caixa e a folha cresce
              para lá do ecrã. */}
          <div className="order-1 min-h-0 flex-1 overflow-y-auto overscroll-contain sm:order-3">
            <CorpoResultados controlador={controlador} aoFechar={fechar} listaRef={lista} />
          </div>

          {/* Área segura — recolhe quando o teclado está aberto, senão
              ficaria uma faixa vazia entre o campo e o teclado. */}
          <div
            aria-hidden
            className="order-4 shrink-0 sm:hidden"
            style={{ height: tecladoInset > 0 ? 0 : "env(safe-area-inset-bottom)" }}
          />

          <EstadoAcessivel id="rc-busca-movel-estado" mensagem={controlador.mensagemEstado} />
        </m.div>
      </div>
    </AnimatePresence>
  );
}
