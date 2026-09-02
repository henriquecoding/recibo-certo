"use client";

/**
 * O subconjunto de movimento usado pelos palcos públicos.
 *
 * Os palcos só precisam de transições entre valores CSS/SVG e presença de
 * painéis com chave. O runtime completo de layout/projeção do Motion custava
 * ~106 KB crus em cada uma das cinco entradas. Este adaptador conserva o
 * mesmo contrato visual com CSS Transitions + Web Animations, mantendo o
 * runtime completo para modais e ferramentas que realmente usam as restantes
 * features.
 */

import {
  Children,
  cloneElement,
  createContext,
  createElement,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

type ValorBase = string | number | null | undefined;
type Valor = ValorBase | readonly ValorBase[];
type Alvo = Record<string, Valor>;

export interface Transition {
  duration?: number;
  delay?: number;
  ease?: unknown;
  type?: "spring" | "tween" | string;
  damping?: number;
  stiffness?: number;
  [chave: string]: unknown;
}

interface ExtrasMovimento {
  initial?: false | Alvo;
  animate?: Alvo;
  exit?: Alvo;
  transition?: Transition;
  layout?: boolean | "position" | "size";
}

type Etiqueta = keyof JSX.IntrinsicElements;
type PropsMovimento<T extends Etiqueta> = Omit<
  JSX.IntrinsicElements[T],
  keyof ExtrasMovimento
> &
  ExtrasMovimento;

interface EstadoPresenca {
  aSair: boolean;
  bloquearEntrada: boolean;
}

const ContextoPresenca = createContext<EstadoPresenca>({
  aSair: false,
  bloquearEntrada: false,
});
const ATRIBUTOS_SVG = new Set([
  "cx",
  "cy",
  "r",
  "x1",
  "x2",
  "y1",
  "y2",
]);
const CHAVES_TRANSFORM = new Set([
  "x",
  "y",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
]);

const ultimo = (valor: Valor): ValorBase =>
  Array.isArray(valor) ? valor.at(-1) : (valor as ValorBase);

const unidade = (valor: Valor, unidadePadrao: string) => {
  valor = ultimo(valor);
  if (valor == null) return undefined;
  if (typeof valor === "number" && valor !== 0) return `${valor}${unidadePadrao}`;
  return String(valor);
};

/** A curva da marca (`ENTRADA` em `palco/curvas.ts`), já em CSS. */
const CURVA_PADRAO = "cubic-bezier(.16,1,.3,1)";

/**
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ AS CURVAS COM NOME DO MOTION NÃO SÃO VALORES CSS                      │
 * │                                                                       │
 * │ `Element.animate()` e a shorthand `transition` só aceitam um          │
 * │ `<easing-function>`: as palavras-chave do CSS, `cubic-bezier()`,      │
 * │ `steps()` e `linear()`. `"easeInOut"` é o nome do MOTION — o WAAPI    │
 * │ atira `TypeError` e o CSS deita fora a declaração inteira.            │
 * │                                                                       │
 * │ Deixar passar a string crua custou a rota: o `TypeError` era atirado  │
 * │ num efeito de layout DURANTE a hidratação, onde não há limite de erro │
 * │ nenhum por baixo, e `/inicio/preco` inteira caía no `global-error`    │
 * │ («This page couldn't load»). Uma pega decorativa a respirar derrubava │
 * │ a página do Preço.                                                    │
 * │                                                                       │
 * │ Por isso este adaptador TRADUZ. Os quatro nomes de aceleração do      │
 * │ Motion são exatamente as curvas com palavra-chave em CSS; os          │
 * │ restantes são as aproximações de Bézier habituais das mesmas famílias │
 * │ (`circ`, `back`), porque essas no Motion são funções e não curvas.    │
 * └───────────────────────────────────────────────────────────────────────┘
 */
const CURVAS_DO_MOTION = new Map<string, string>([
  ["linear", "linear"],
  ["easeIn", "cubic-bezier(0.42, 0, 1, 1)"],
  ["easeOut", "cubic-bezier(0, 0, 0.58, 1)"],
  ["easeInOut", "cubic-bezier(0.42, 0, 0.58, 1)"],
  ["circIn", "cubic-bezier(0.55, 0, 1, 0.45)"],
  ["circOut", "cubic-bezier(0, 0.55, 0.45, 1)"],
  ["circInOut", "cubic-bezier(0.85, 0, 0.15, 1)"],
  ["backIn", "cubic-bezier(0.36, 0, 0.66, -0.56)"],
  ["backOut", "cubic-bezier(0.34, 1.56, 0.64, 1)"],
  ["backInOut", "cubic-bezier(0.68, -0.6, 0.32, 1.6)"],
  ["anticipate", "cubic-bezier(0.36, 0, 0.66, -0.56)"],
]);

/** O que o CSS aceita tal e qual. */
const PALAVRAS_CSS = new Set([
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "step-start",
  "step-end",
]);
const FUNCOES_CSS = /^(cubic-bezier|steps|linear)\(.*\)$/;

export function curvaCSS(transicao?: Transition) {
  const curva = transicao?.ease;
  if (
    Array.isArray(curva) &&
    curva.length === 4 &&
    curva.every((valor) => typeof valor === "number" && Number.isFinite(valor))
  ) {
    return `cubic-bezier(${curva.join(",")})`;
  }
  if (typeof curva === "string") {
    const nome = curva.trim();
    const traduzida = CURVAS_DO_MOTION.get(nome);
    if (traduzida) return traduzida;
    // Uma curva que já é CSS passa; qualquer outra coisa — um nome novo do
    // Motion, uma função de `ease`, um erro de escrita — cai na da marca em
    // vez de chegar crua ao browser.
    if (PALAVRAS_CSS.has(nome) || FUNCOES_CSS.test(nome)) return nome;
  }
  return CURVA_PADRAO;
}

/**
 * Anima, e se não conseguir não anima — mas nunca derruba a rota.
 *
 * Os dois efeitos que chamam isto correm no commit da hidratação, acima de
 * qualquer `ErrorBoundary` do palco. O estado final já está aplicado por
 * `style` antes de a animação começar, portanto falhar aqui degrada para o
 * resultado certo sem trajeto — que é exatamente o que `prefers-reduced-motion`
 * já entrega. É a mesma regra dos blocos pesados: uma camada decorativa não
 * pode deixar a página em branco.
 */
function animar(
  no: Element,
  quadros: Keyframe[],
  opcoes: KeyframeAnimationOptions,
): Animation | null {
  try {
    return no.animate(quadros, opcoes);
  } catch (erro) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[motion-lite] animação recusada pelo browser:", erro);
    }
    return null;
  }
}

function alvoParaProps(alvo: Alvo | undefined, transicao?: Transition) {
  const style: CSSProperties & Record<string, Valor> = {};
  const atributos: Record<string, Valor> = {};
  if (!alvo) return { style, atributos };

  const x = alvo.x;
  const y = alvo.y;
  if (x != null || y != null) {
    style.translate = `${unidade(x ?? 0, "px")} ${unidade(y ?? 0, "px")}`;
  }
  if (alvo.scale != null || alvo.scaleX != null || alvo.scaleY != null) {
    const uniforme = ultimo(alvo.scale ?? 1);
    style.scale = `${ultimo(alvo.scaleX ?? uniforme)} ${ultimo(alvo.scaleY ?? uniforme)}`;
  }
  if (alvo.rotate != null) style.rotate = unidade(alvo.rotate, "deg");

  for (const [chave, valor] of Object.entries(alvo)) {
    const final = ultimo(valor);
    if (CHAVES_TRANSFORM.has(chave) || final == null) continue;
    if (ATRIBUTOS_SVG.has(chave)) {
      atributos[chave] = final;
      continue;
    }
    if (chave === "pathLength") {
      // Um path normalizado torna 0→1 equivalente ao `pathLength` de Motion.
      atributos.pathLength = 1;
      style.strokeDasharray = "1 1";
      style.strokeDashoffset = 1 - Number(final);
      continue;
    }
    style[chave] = final;
  }

  if (transicao) {
    const duracao = Math.max(0, Number(transicao.duration ?? 0.3));
    const atraso = Math.max(0, Number(transicao.delay ?? 0));
    style.transition = `all ${duracao}s ${curvaCSS(transicao)} ${atraso}s`;
  }
  return { style, atributos };
}

function combinarRefs<T>(refs: Array<Ref<T> | undefined>, valor: T | null) {
  for (const ref of refs) {
    if (typeof ref === "function") ref(valor);
    else if (ref && "current" in ref) {
      (ref as { current: T | null }).current = valor;
    }
  }
}

function criar<T extends Etiqueta>(etiqueta: T) {
  const Componente = forwardRef<Element, PropsMovimento<T>>(function MovimentoLeve(
    props,
    refExterna,
  ) {
    const {
      initial,
      animate,
      exit,
      transition,
      layout: _layout,
      style: styleBase,
      className,
      ...resto
    } = props as ExtrasMovimento & {
      style?: CSSProperties;
      className?: unknown;
      [chave: string]: unknown;
    };
    const presenca = useContext(ContextoPresenca);
    const aSair = presenca.aSair;
    const no = useRef<Element | null>(null);
    const alvo = aSair && exit ? exit : animate;
    const { style, atributos } = alvoParaProps(alvo, transition);
    const jaAnimouEntrada = useRef(false);
    const entrada = useRef({ initial, animate, transition });
    const assinaturaKeyframes = animate
      ? JSON.stringify(
          Object.fromEntries(
            Object.entries(animate).filter(([, valor]) => Array.isArray(valor)),
          ),
        )
      : "{}";
    const keyframesAnteriores = useRef("{}");

    useLayoutEffect(() => {
      if (
        jaAnimouEntrada.current ||
        presenca.bloquearEntrada ||
        initial === false ||
        !initial ||
        aSair ||
        !no.current ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }
      jaAnimouEntrada.current = true;
      const dados = entrada.current;
      const de = alvoParaProps(dados.initial === false ? undefined : dados.initial).style;
      const para = alvoParaProps(dados.animate).style;
      const duracao = Math.max(0, Number(dados.transition?.duration ?? 0.3)) * 1_000;
      const atraso = Math.max(0, Number(dados.transition?.delay ?? 0)) * 1_000;
      if (duracao === 0) return;
      const animacao = animar(no.current, [de as Keyframe, para as Keyframe], {
        duration: duracao,
        delay: atraso,
        easing: curvaCSS(dados.transition),
        fill: "both",
      });
      return () => animacao?.cancel();
    }, [aSair]);

    useLayoutEffect(() => {
      if (
        aSair ||
        !no.current ||
        assinaturaKeyframes === "{}" ||
        assinaturaKeyframes === keyframesAnteriores.current ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        keyframesAnteriores.current = assinaturaKeyframes;
        return;
      }
      keyframesAnteriores.current = assinaturaKeyframes;
      const entradas = Object.entries(animate ?? {});
      const quantidade = Math.max(
        ...entradas.map(([, valor]) => (Array.isArray(valor) ? valor.length : 1)),
      );
      const frames = Array.from({ length: quantidade }, (_, indice) => {
        const quadro = Object.fromEntries(
          entradas.map(([chave, valor]) => [
            chave,
            Array.isArray(valor) ? valor[Math.min(indice, valor.length - 1)] : valor,
          ]),
        );
        return alvoParaProps(quadro).style as Keyframe;
      });
      const animacao = animar(no.current, frames, {
        duration: Math.max(0, Number(transition?.duration ?? 0.3)) * 1_000,
        delay: Math.max(0, Number(transition?.delay ?? 0)) * 1_000,
        easing: curvaCSS(transition),
      });
      return () => animacao?.cancel();
    }, [aSair, assinaturaKeyframes]);

    return createElement(etiqueta, {
      ...resto,
      ...atributos,
      ref: (elemento: Element | null) => {
        no.current = elemento;
        combinarRefs([refExterna], elemento);
      },
      className: `${String(className ?? "")} rc-motion-lite`.trim(),
      style: { ...(styleBase as CSSProperties), ...style },
    });
  });
  Componente.displayName = `MovimentoLeve.${String(etiqueta)}`;
  return Componente;
}

export const m = {
  article: criar("article"),
  aside: criar("aside"),
  circle: criar("circle"),
  div: criar("div"),
  g: criar("g"),
  i: criar("i"),
  li: criar("li"),
  line: criar("line"),
  output: criar("output"),
  p: criar("p"),
  path: criar("path"),
  section: criar("section"),
  span: criar("span"),
  ul: criar("ul"),
};

const chaveDe = (elemento: ReactNode, indice: number) =>
  isValidElement(elemento) && elemento.key != null ? String(elemento.key) : `indice-${indice}`;

function retirarDoFluxo(no: ReactNode, mode: "wait" | "sync" | "popLayout") {
  if (mode !== "popLayout" || !isValidElement(no)) return no;
  const elemento = no as ReactElement<{ style?: CSSProperties }>;
  return cloneElement(elemento, {
    style: {
      ...elemento.props.style,
      position: "absolute",
      insetInline: 0,
      width: "100%",
    },
  });
}

export function AnimatePresence({
  children,
  mode = "sync",
  initial = true,
  onExitComplete,
}: {
  children: ReactNode;
  mode?: "wait" | "sync" | "popLayout";
  initial?: boolean;
  onExitComplete?: () => void;
}) {
  const atuais = Children.toArray(children);
  const anteriores = useRef(atuais);
  const primeiraRender = useRef(true);
  const aoCompletarRef = useRef(onExitComplete);
  aoCompletarRef.current = onExitComplete;
  const temporizadores = useRef(new Map<string, number>());
  const [aSair, setASair] = useState<Array<{ chave: string; no: ReactNode }>>([]);
  const [chavesBloqueadas, setChavesBloqueadas] = useState<Set<string>>(
    () => new Set(),
  );
  const assinatura = atuais.map(chaveDe).join("|");

  useLayoutEffect(() => {
    const chavesAtuais = new Set(atuais.map(chaveDe));
    let cancelouSaida = false;
    for (const chave of chavesAtuais) {
      const temporizador = temporizadores.current.get(chave);
      if (temporizador === undefined) continue;
      window.clearTimeout(temporizador);
      temporizadores.current.delete(chave);
      cancelouSaida = true;
    }
    const removidos = anteriores.current
      .map((no, indice) => ({ chave: chaveDe(no, indice), no }))
      .filter((item) => !chavesAtuais.has(item.chave));
    if (removidos.length === 0) {
      setASair((itens) => {
        const filtrados = itens.filter((item) => !chavesAtuais.has(item.chave));
        return filtrados.length === itens.length ? itens : filtrados;
      });
      if (cancelouSaida && temporizadores.current.size === 0) {
        setChavesBloqueadas(new Set());
      }
      return;
    }

    if (mode === "wait") {
      const chavesAnteriores = new Set(
        anteriores.current.map((no, indice) => chaveDe(no, indice)),
      );
      setChavesBloqueadas(
        new Set(
          atuais
            .map((no, indice) => chaveDe(no, indice))
            .filter((chave) => !chavesAnteriores.has(chave)),
        ),
      );
    }

    setASair((itens) => [
      ...itens.filter(
        (item) =>
          !chavesAtuais.has(item.chave) &&
          !removidos.some((removido) => removido.chave === item.chave),
      ),
      ...removidos,
    ]);
    for (const removido of removidos) {
      if (temporizadores.current.has(removido.chave)) continue;
      const temporizador = window.setTimeout(() => {
        temporizadores.current.delete(removido.chave);
        setASair((itens) => itens.filter((item) => item.chave !== removido.chave));
        if (temporizadores.current.size === 0) {
          setChavesBloqueadas(new Set());
          aoCompletarRef.current?.();
        }
      }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420);
      temporizadores.current.set(removido.chave, temporizador);
    }
  }, [assinatura, mode]);

  // Guardar também a versão mais recente de filhos cujas chaves não mudaram;
  // se saírem no render seguinte, a cópia de saída não fica desatualizada.
  useLayoutEffect(() => {
    anteriores.current = atuais;
    primeiraRender.current = false;
  });

  useEffect(
    () => () => {
      for (const temporizador of temporizadores.current.values()) {
        window.clearTimeout(temporizador);
      }
      temporizadores.current.clear();
    },
    [],
  );

  return (
    <>
      {aSair.map((item) => (
        <ContextoPresenca.Provider
          key={`saida-${item.chave}`}
          value={{ aSair: true, bloquearEntrada: false }}
        >
          {retirarDoFluxo(item.no, mode)}
        </ContextoPresenca.Provider>
      ))}
      {atuais.map((item, indice) => {
        const chave = chaveDe(item, indice);
        if (chavesBloqueadas.has(chave)) return null;
        return (
          <ContextoPresenca.Provider
            key={`presente-${chave}`}
            value={{
              aSair: false,
              bloquearEntrada: primeiraRender.current && initial === false,
            }}
          >
            {item as ReactElement}
          </ContextoPresenca.Provider>
        );
      })}
    </>
  );
}

export function useReducedMotion(): boolean | null {
  const [reduz, setReduz] = useState<boolean | null>(null);
  useEffect(() => {
    const consulta = matchMedia("(prefers-reduced-motion: reduce)");
    const atualizar = () => setReduz(consulta.matches);
    atualizar();
    consulta.addEventListener("change", atualizar);
    return () => consulta.removeEventListener("change", atualizar);
  }, []);
  return reduz;
}
