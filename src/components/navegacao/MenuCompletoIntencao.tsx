"use client";

import type { ComponentProps } from "react";
import MenuCompleto from "@/components/navegacao/MenuCompleto";
import MotionProvider from "@/components/ui/motion/MotionProvider";

/**
 * Fronteira pesada da navegação completa.
 *
 * Este módulo só é importado depois de intenção explícita no botão Menu.
 * O provider viaja no mesmo chunk: os `m.*` da folha recuperam as features
 * de entrada/saída sem fazer todas as páginas públicas pagar Motion fechadas.
 */
export default function MenuCompletoIntencao(
  props: ComponentProps<typeof MenuCompleto>,
) {
  return (
    <MotionProvider>
      <MenuCompleto {...props} />
    </MotionProvider>
  );
}
