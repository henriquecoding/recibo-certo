// ─────────────────────────────────────────────────────────────────────
//  O ESTADO INICIAL — três tarefas, e nada mais
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE O PAINEL DEIXOU DE ABRIR COM QUINZE DESTINOS (P1-04)          │
//  │                                                                     │
//  │ Abria com seis cartões «Mais utilizadas» e nove «Recursos fiscais» — │
//  │ um mini-painel de controlo de 704 px que tapava o herói e exigia     │
//  │ LEITURA antes de se poder pesquisar. Uma pesquisa que obriga a ler   │
//  │ quinze rótulos antes de escrever falhou no que tinha para fazer.     │
//  │                                                                     │
//  │ Ficam três tarefas, escolhidas pelo CONTEXTO explícito da rota — não │
//  │ por um perfil adivinhado. Os quinze destinos não se perderam: estão  │
//  │ todos no índice, a uma consulta de distância, e o índice completo    │
//  │ está a um clique em «Ver todas as ferramentas».                      │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  Este ficheiro é LEVE de propósito: o estado inicial tem de poder ser
//  desenhado antes de o índice chegar. Se as sugestões viessem do índice,
//  o painel abriria vazio à espera de uma rede.
// ─────────────────────────────────────────────────────────────────────

export interface Sugestao {
  id: string;
  titulo: string;
  /** A pergunta a que responde — o que a pessoa está mesmo a pensar. */
  pergunta: string;
  href: string;
}

const INDEPENDENTES: Sugestao[] = [
  { id: "s-calculadora", titulo: "Calculadora de recibos verdes", pergunta: "Quanto vou receber?", href: "/#calculadora" },
  { id: "s-iva", titulo: "IVA nos recibos verdes", pergunta: "Tenho de cobrar IVA?", href: "/guias/iva-recibos-verdes" },
  { id: "s-prazos", titulo: "Calendário fiscal", pergunta: "O que tenho de entregar, e quando?", href: "/dashboard/prazos" },
];

const GUIAS: Sugestao[] = [
  { id: "s-abrir", titulo: "Abrir atividade nas Finanças", pergunta: "Por onde começo?", href: "/guias/abrir-atividade" },
  { id: "s-simplificado", titulo: "Regime simplificado", pergunta: "Quanto pago de IRS?", href: "/guias/regime-simplificado" },
  { id: "s-ss", titulo: "Segurança Social", pergunta: "Quanto desconto, e quando?", href: "/guias/seguranca-social" },
];

const FERRAMENTAS: Sugestao[] = [
  { id: "s-irs", titulo: "Simulador de IRS anual", pergunta: "Vou ter reembolso ou acerto?", href: "/ferramentas/simulador-irs" },
  { id: "s-comparar", titulo: "Comparar cenários", pergunta: "Compensa abrir empresa?", href: "/ferramentas/comparar-regimes" },
  { id: "s-classificar", titulo: "Classificar atividade", pergunta: "Que retenção se aplica à minha profissão?", href: "/ferramentas/classificar-atividade" },
];

/**
 * O contexto é a ROTA, e só a rota.
 *
 * Nada de perfil inferido de histórico: numa pesquisa fiscal, adivinhar
 * quem a pessoa é para lhe mudar as opções é o caminho mais curto para ela
 * deixar de encontrar aquilo que já sabia onde estava.
 */
export function sugestoesPorContexto(pathname: string): Sugestao[] {
  if (pathname.startsWith("/guias")) return GUIAS;
  if (pathname.startsWith("/ferramentas") || pathname.startsWith("/dashboard")) return FERRAMENTAS;
  return INDEPENDENTES;
}
