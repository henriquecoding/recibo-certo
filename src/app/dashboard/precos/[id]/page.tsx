import type { Metadata } from "next";
import DetalhePreco from "./DetalhePreco";

/**
 * REVER UM PREÇO GUARDADO.
 *
 * A lista recalcula os preços com as regras de hoje, e isso é o que a
 * torna comparável. O que faltava era o outro lado da mesma verdade: o
 * resultado com que a DECISÃO foi tomada. Esta página mostra os dois, com
 * o delta entre eles, e só substitui o guardado quando alguém o pedir
 * (ADR-07 — «preço histórico não é sobrescrito»).
 *
 * O item vive no cofre, no dispositivo: o servidor não sabe — nem pode
 * saber — o que está neste `id`. Por isso a página é uma casca e todo o
 * trabalho acontece no cliente.
 */
export const metadata: Metadata = {
  title: "Preço guardado",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalhePreco id={decodeURIComponent(id)} />;
}
