// Helper leve para abrir a Central de Feedback a partir de qualquer sítio, sem
// arrastar o componente do modal. O modal global (FeedbackModal, montado no
// layout) escuta este evento.

import type { TipoFeedback } from "@/lib/supabase/feedback";

export const EVENTO_ABRIR_FEEDBACK = "recibocerto:feedback:abrir";

export function abrirFeedback(detalhe?: { tipo?: TipoFeedback; area?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_FEEDBACK, { detail: detalhe }));
}
