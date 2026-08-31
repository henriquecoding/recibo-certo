import type { ReactNode } from "react";
import MotionProvider from "@/components/ui/motion/MotionProvider";

/** As integrações têm diálogos animados; a documentação legal não os paga. */
export default function IntegracoesLayout({ children }: { children: ReactNode }) {
  return <MotionProvider>{children}</MotionProvider>;
}
