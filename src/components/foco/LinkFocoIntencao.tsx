"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ComponentProps } from "react";
import { ROTA_POR_FOCO, type FocoHomepage } from "@/lib/foco-homepage";
import { useIntencaoFocos } from "./ControladorPrefetchFocos";

type Props = Omit<
  ComponentProps<typeof Link>,
  | "href"
  | "prefetch"
  | "onPointerEnter"
  | "onPointerDown"
  | "onFocus"
  | "onKeyDown"
  | "onClick"
> & {
  foco: FocoHomepage;
};

/** Link de servidor por fora, política única de intenção por dentro. */
export default function LinkFocoIntencao({ foco, className = "", ...props }: Props) {
  const router = useRouter();
  const { pendente, preparar, iniciar } = useIntencaoFocos();
  const aAbrir = pendente === foco;

  // O controlador pai pode hidratar antes destas ilhas durante a hidratação
  // seletiva. Esta marca prova que o próprio link — e os seus handlers — já
  // chegaram ao commit, evitando que medições confundam HTML visível com uma
  // interação realmente pronta.
  useEffect(() => {
    const nome = `rc:foco:link-ready:${foco}`;
    try {
      performance.mark(nome, { detail: { foco } });
    } catch {
      performance.mark(nome);
    }
  }, [foco]);

  return (
    <Link
      {...props}
      href={ROTA_POR_FOCO[foco]}
      data-foco-destino={foco}
      prefetch={false}
      // Sem `scroll={false}`: muda de rota, logo abre no princípio.
      // Ver o quadro em `ChromeMobile.tsx`.
      onPointerEnter={() => preparar(foco)}
      onFocus={() => preparar(foco)}
      onKeyDown={(evento) => {
        if (
          evento.key === "Enter" &&
          !evento.repeat &&
          !evento.metaKey &&
          !evento.ctrlKey &&
          !evento.shiftKey &&
          !evento.altKey
        ) {
          evento.preventDefault();
          iniciar(foco, "teclado");
          // O Firefox começava a reconciliar a nova rota na mesma tarefa do
          // keydown e só pintava o anel pendente depois. A próxima frame
          // entrega o feedback; uma nova tarefa inicia a navegação logo após
          // essa pintura, sem pagar uma segunda frame inteira. O href continua
          // real e funcional sem JavaScript.
          requestAnimationFrame(() => {
            setTimeout(() => {
              // Sem `{ scroll: false }`, pela mesma razão do `Link` acima: o
              // caminho do teclado tem de aterrar onde o do dedo aterra.
              router.push(ROTA_POR_FOCO[foco]);
            }, 0);
          });
        }
      }}
      onPointerDown={(evento) => {
        if (
          evento.button === 0 &&
          !evento.metaKey &&
          !evento.ctrlKey &&
          !evento.shiftKey &&
          !evento.altKey
        ) {
          iniciar(foco, "pointer");
        }
      }}
      onClick={(evento) => {
        if (evento.detail === 0) iniciar(foco, "teclado");
      }}
      aria-busy={aAbrir || undefined}
      className={`${className} ${aAbrir ? "ring-2 ring-brand/45" : ""}`}
    />
  );
}
