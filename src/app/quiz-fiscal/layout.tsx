// Sem `"use client"`: este layout só compõe o `AuthProvider`, que já é um
// componente-cliente. Marcá-lo como cliente arrastava a subárvore toda para o
// bundle sem necessidade e impedia qualquer conteúdo servido no servidor.
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/supabase/auth";

export default function QuizFiscalLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
