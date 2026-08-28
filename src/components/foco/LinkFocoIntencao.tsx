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
      scroll={false}
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
          router.push(ROTA_POR_FOCO[foco], { scroll: false });
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
