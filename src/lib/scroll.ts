// Scroll suave para uma secção por id. Seguro em SSR (verifica `document`).
export function scrollToId(id: string): void {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
