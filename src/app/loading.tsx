// ═══════════════════════════════════════════════════════════════════════
//  O QUE SE VÊ ENQUANTO UMA LEITURA CHEGA
//  ---------------------------------------------------------------------
//  `/` é uma rota dinâmica: trocar de aba pede um render ao servidor. Sem
//  este ficheiro, o App Router não tem fronteira de espera para mostrar —
//  a página anterior fica congelada até a nova chegar, e uma interface
//  que não responde ao toque lê-se como avariada, não como ocupada.
//
//  Não é um esqueleto do conteúdo. Um esqueleto que adivinha a forma da
//  página seguinte acerta poucas vezes e, quando falha, o salto é pior do
//  que a espera. É uma barra fina no topo — o sinal mínimo que diz «foi
//  registado, está a caminho».
//
//  `role="status"` e não `alert`: é progresso, não um problema.
// ═══════════════════════════════════════════════════════════════════════

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9500] h-0.5 overflow-hidden"
    >
      <span className="sr-only">A abrir…</span>
      <span
        aria-hidden
        className="block h-full w-1/3 rounded-full bg-brand motion-safe:animate-[carregar_1.1s_cubic-bezier(.16,1,.3,1)_infinite] motion-reduce:w-full motion-reduce:opacity-60"
      />
    </div>
  );
}
