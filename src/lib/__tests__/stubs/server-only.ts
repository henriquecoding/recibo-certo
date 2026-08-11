// Substituto de `server-only` para os testes.
//
// O pacote real é um marcador do Next: importá-lo faz o BUILD falhar se um
// componente de cliente puxar o módulo. É uma garantia de compilação, não de
// execução — não tem comportamento nenhum em runtime — e não resolve fora do
// Next. Este ficheiro existe só para o Vitest conseguir importar os módulos
// `.server.ts` que a usam; a proteção continua inteira onde é aplicada.
export {};
