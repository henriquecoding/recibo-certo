// «há 5 min», «ontem», «12 ago» — o carimbo de um aviso, como se lê.
//
// Fora do componente para poder ser exercido em Node: vivia dentro do
// `.tsx` do sino, ao lado de `next/link` e do `motion`, e um teste que o
// quisesse tocar arrastava a árvore toda. Uma função de formatação é a
// primeira coisa que se quer testar e era a única que não dava.

/**
 * Relativo enquanto ajuda, absoluto depois.
 *
 * O corte às 48 horas não é arbitrário: «há 30 h» é pior do que «ontem»
 * para quem quer saber se já respondeu, e «há 72 h» é pior do que a data.
 *
 * `agora` é injetável para os testes. Em produção ninguém o passa.
 */
export function quando(iso: string, agora: number = Date.now()): string {
  const carimbo = Date.parse(iso);
  if (Number.isNaN(carimbo)) return "";

  // Truncado, nunca arredondado. Arredondar dizia «há 1 min» a um aviso
  // de trinta segundos e «há 2 h» a um de hora e meia — tempo decorrido
  // conta-se para baixo, e um aviso que se anuncia mais velho do que é faz
  // duvidar de quem o mandou.
  const minutos = Math.floor((agora - carimbo) / 60000);
  // Um relógio adiantado do lado do servidor punha um aviso acabado de
  // nascer a dizer «há -1 min». «agora» é a resposta certa para tudo o
  // que ainda não passou.
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  if (horas < 48) return "ontem";

  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" })
    .format(new Date(carimbo));
}
