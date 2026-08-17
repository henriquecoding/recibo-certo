/**
 * O que a pessoa lê quando uma operação do painel falha.
 *
 * As RPCs devolvem motivos de máquina — `demasiadas_vistas`,
 * `layout_desatualizado`, `sem_permissao` — e `apagarVista` devolve o texto
 * cru do Postgres, porque é um `delete` direto e não uma RPC. Nenhum dos
 * dois serve para ser lido: um não diz nada a quem está a trabalhar, o outro
 * diz demasiado sobre o schema a quem não está.
 *
 * O broker já tinha esta disciplina (`mensagemLegivel`). Este ficheiro é a
 * mesma ideia para as operações de escrita, num sítio só — a tradução estava
 * a ser feita no `Workspace` para gravar o layout e em lado nenhum para gerir
 * vistas, e era por isso que «demasiadas_vistas» chegava ao ecrã tal e qual.
 */

import { MAX_VISTAS } from "./layout";

/** Gravar o layout de uma vista. */
export const MENSAGEM_DA_GRAVACAO: Readonly<Record<string, string>> = Object.freeze({
  sem_permissao: "A sessão perdeu a autorização. Entre outra vez.",
  layout_demasiado_grande: "O painel tem módulos demais para guardar de uma vez.",
  layout_invalido: "Há um módulo em posição impossível. Use «Arrumar módulos».",
  vista_inexistente: "Esta vista já não existe.",
  rede: "Falha de rede. O que mudou continua aqui — tente outra vez.",
});

/** Criar, renomear, tornar principal, apagar. */
export const MENSAGEM_DA_VISTA: Readonly<Record<string, string>> = Object.freeze({
  sem_permissao: "A sessão perdeu a autorização. Entre outra vez.",
  demasiadas_vistas: `Já tem o número máximo de vistas (${MAX_VISTAS}). Apague uma antes de criar outra.`,
  vista_inexistente: "Esta vista já não existe.",
  nome_invalido: "O nome não pode ficar vazio.",
  nome_repetido: "Já existe uma vista com esse nome.",
});

/**
 * Traduz um motivo conhecido; para tudo o resto devolve a alternativa.
 *
 * Devolver a alternativa em vez do motivo é o ponto: um código que não está
 * no mapa é um código que não foi escrito para ser lido, e mostrá-lo «só
 * desta vez» é como o texto cru do Postgres acaba num cartão do painel.
 */
export function mensagemDaVista(motivo: string | undefined, alternativa: string): string {
  return (motivo && MENSAGEM_DA_VISTA[motivo]) || alternativa;
}

export function mensagemDaGravacao(motivo: string | undefined, alternativa: string): string {
  return (motivo && MENSAGEM_DA_GRAVACAO[motivo]) || alternativa;
}
