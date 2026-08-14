import type { ReactNode } from "react";

/**
 * O formulário de nova tarefa anima a altura com `overflow-hidden`. O
 * DatePicker é um popover absoluto dentro desse bloco e, quando está aberto,
 * não pode ser recortado pelo contentor da animação.
 *
 * A exceção é deliberadamente limitada ao botão `#prazo-tarefa` aberto: o
 * clipping continua ativo durante todas as restantes animações e nenhuma
 * outra superfície do painel muda de comportamento.
 */
export default function TrabalhoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        .overflow-hidden:has(#prazo-tarefa[aria-expanded="true"]) {
          overflow: visible !important;
        }
      `}</style>
      {children}
    </>
  );
}
