// Moldura das páginas públicas de contabilistas.
//
// O diretório, os perfis e a candidatura viviam sem cabeçalho nenhum: quem
// lá chegasse a partir de um link não tinha como voltar ao resto do site, e
// «Contabilistas» — que agora é um item da barra — não tinha onde acender.
//
// O painel de gestão (`/contabilista`, no singular) tem moldura própria, com
// a navegação dele. São coisas diferentes e continuam a sê-lo.

import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/ui/motion/MotionProvider";

export default function ContabilistasLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <MotionProvider>{children}</MotionProvider>
      <Footer />
    </>
  );
}
