"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/supabase/auth";

export default function QuizFiscalLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
