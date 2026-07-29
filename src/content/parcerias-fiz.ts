// ═══════════════════════════════════════════════════════════════════════
//  A PARCERIA FIZ, EM CÓDIGO — o piso que a base de dados sobrepõe
//  ---------------------------------------------------------------------
//  A primeira versão desta camada punha a parceria SÓ na base de dados. A
//  intenção era boa (mudar o link sem deploy) e o efeito foi mau: enquanto a
//  migração não estivesse aplicada e a `SUPABASE_SERVICE_ROLE_KEY` definida,
//  `parceriaAtiva()` devolvia `null`, o passo de ligação não corria, e a
//  resolução caía na pré-visualização da Fase 2 — que mostra um diálogo de
//  consentimento a prometer «continuar sem repetir dados».
//
//  Ou seja: o site mostrava a SIMULAÇÃO de uma integração que não existe, em
//  vez da parceria que existe mesmo.
//
//  A correção é ter os dois. Isto é o piso — funciona no dia em que faz
//  deploy, sem configurar nada. A linha em `admin_partners` continua a mandar
//  quando existe, e é lá que se muda o link sem deploy. `catalogo.server.ts`
//  faz a fusão: base de dados por cima, isto por baixo.
//
//  ⚠️ Este é o ÚNICO ficheiro de código onde os links podem aparecer.
//  `parcerias:sem-links-em-codigo` falha se algum outro os escrever.
// ═══════════════════════════════════════════════════════════════════════

import type { Superficie } from "./parcerias-destinos";

export interface DefinicaoParceria {
  id: string;
  parceiroKey: string;
  nome: string;
  /** Link do site — destino de baixa intenção (quem ainda está a ler). */
  linkAfiliado: string;
  /** Link de registo — destino de alta intenção (quem já decidiu). */
  linkAfiliadoRegisto: string;
  dominiosPermitidos: string[];
  /**
   * Parâmetro de sub-id. `null` até a FIZ confirmar que o preserva até à
   * conversão — pôr um parâmetro que eles ignoram não faz mal nenhum, mas dá
   * a ilusão de medição que não existe.
   */
  subidParam: string | null;
  /**
   * `false` até a FIZ confirmar que o link pessoal preserva um caminho de
   * aterragem. Sem confirmação nunca se inventa um caminho no site deles.
   */
  caminhoSuportado: boolean;
  divulgacao: string;
  comissaoDescricao: string;
  atribuicaoJanelaDias: number;
  validacaoDias: number;
  atribuicaoNota: string;
  /**
   * Superfícies ligadas por omissão.
   *
   * A ativação é faseada de propósito: começa nos sítios onde a intenção do
   * utilizador está mais próxima do que a FIZ faz, e onde a presença comercial
   * não compete com o conteúdo. Os anúncios em páginas de painel ficam de
   * fora nesta fase — quem já está a usar o produto não precisa de um banner.
   */
  superficiesAtivas: Superficie[];
}

export const PARCERIA_FIZ: DefinicaoParceria = {
  id: "fiz",
  parceiroKey: "fiz",
  nome: "FIZ",
  linkAfiliado: "https://fiz.co/?ref=gpZWdtnhQPIsWJYR",
  linkAfiliadoRegisto: "https://app.fiz.co/auth?ref=gpZWdtnhQPIsWJYR",
  dominiosPermitidos: ["fiz.co", "app.fiz.co", "help.fiz.co", "blog.fiz.co", "diretorio.fiz.co"],
  subidParam: null,
  caminhoSuportado: false,
  divulgacao:
    "Ligação de afiliado (#publicidade): se subscreveres a FIZ através daqui, recebemos uma comissão. " +
    "Não muda o preço para ti e não altera o que escrevemos nos Guias.",
  comissaoDescricao: "30% do valor líquido sem IVA, durante 12 meses a contar do primeiro pagamento",
  atribuicaoJanelaDias: 90,
  validacaoDias: 30,
  atribuicaoNota:
    "Last-click, cookie de 90 dias, permanente após o registo. Um clique nosso hoje pode virar " +
    "registo daqui a dois meses — a divergência com o relatório do parceiro é esperada.",
  superficiesAtivas: [
    "guia.next_step",
    "simulador.plano_acao",
    "demo.hero",
    "demo.hero.faixa",
    "demo.irs",
    "demo.irs.faixa",
    "precos.faixa",
  ],
};

/** Variante por omissão de cada superfície ativa. */
export const VARIANTE_POR_SUPERFICIE: Partial<Record<Superficie, string>> = {
  "guia.next_step": "padrao",
  "simulador.plano_acao": "padrao",
  "demo.hero": "compacta",
  "demo.hero.faixa": "faixa",
  "demo.irs": "compacta",
  "demo.irs.faixa": "faixa",
  "precos.faixa": "faixa",
};
