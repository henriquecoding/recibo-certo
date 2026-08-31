// Sem `"use client"`: este layout só coloca o runtime de movimento à volta
// do quiz. A autenticação leve já é partilhada pelo layout raiz.
import type { ReactNode } from "react";
import MotionProvider from "@/components/ui/motion/MotionProvider";

export default function QuizFiscalLayout({ children }: { children: ReactNode }) {
  return <MotionProvider>{children}</MotionProvider>;
}
