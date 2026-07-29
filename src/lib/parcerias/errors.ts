// Erros da camada de parcerias. Segue o desenho de `src/lib/fiz/errors.ts`:
// um código estável para decidir, uma mensagem em pt-PT para mostrar.

export type CodigoParceria =
  | "parceiro_desconhecido"
  | "parceiro_inativo"
  | "fora_da_janela"
  | "sem_link"
  | "destino_recusado"
  | "dados_no_url"
  | "modo_nao_permite";

export class ParceriaError extends Error {
  readonly codigo: CodigoParceria;

  constructor(codigo: CodigoParceria, mensagem: string) {
    super(mensagem);
    this.name = "ParceriaError";
    this.codigo = codigo;
  }
}

/** Motivo legível para a página de explicação do redirecionador. */
export const MOTIVO_LEGIVEL: Record<CodigoParceria, string> = {
  parceiro_desconhecido: "Esta ligação de parceiro não existe.",
  parceiro_inativo: "Esta parceria não está ativa de momento.",
  fora_da_janela: "Esta parceria está fora do período em que vigora.",
  sem_link: "Esta parceria ainda não tem uma ligação configurada.",
  destino_recusado: "O destino configurado não pertence aos domínios permitidos.",
  dados_no_url: "A ligação construída continha dados que não devem viajar num URL.",
  modo_nao_permite: "Esta ação não está disponível no modo contratado com o parceiro.",
};
