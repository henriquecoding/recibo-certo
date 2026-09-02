// ═══════════════════════════════════════════════════════════════════════
//  HANDOFF — o contexto viaja, o valor não sai do dispositivo
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE NÃO É UMA QUERY STRING, QUE ERA O ÓBVIO                       │
//  │                                                                     │
//  │ `?valor=1200` resolve o problema em cinco minutos e cria quatro:     │
//  │                                                                     │
//  │  1. o rendimento fica no HISTÓRICO do browser, num dispositivo que   │
//  │     pode ser partilhado;                                            │
//  │  2. fica no `Referer` do primeiro pedido a qualquer terceiro que a   │
//  │     página carregue;                                                 │
//  │  3. fica nos logs de acesso — os nossos e os da CDN;                 │
//  │  4. vai parar a analytics no primeiro `page_view`, porque quase      │
//  │     todas as bibliotecas registam o caminho COM a query.             │
//  │                                                                     │
//  │ Nenhuma destas quatro tem correcção depois de acontecer, e todas     │
//  │ contrariam a frase que a própria barra mostra: «Tudo fica neste      │
//  │ dispositivo». Uma promessa dessas ou é uma propriedade do código ou  │
//  │ é publicidade enganosa.                                             │
//  │                                                                     │
//  │ Por isso o que viaja no endereço é um identificador OPACO —          │
//  │ `?ctx=<uuid>` — e a carga fica em `sessionStorage`: morre com o      │
//  │ separador, não é partilhada com outras origens, não entra em         │
//  │ nenhum log e não sobrevive a um reinício do browser.                 │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  Quatro regras que o tipo e as funções impõem:
//
//   · TTL curto (10 minutos). Um contexto que sobreviva à sessão de
//     trabalho deixa de ser contexto e passa a ser um perfil.
//   · CONSUMO ÚNICO. Ler apaga. Voltar atrás no histórico não repõe um
//     valor que a pessoa entretanto mudou na ferramenta.
//   · LISTA DE PERMISSÕES POR DESTINO. Cada destino diz o que aceita; o
//     que não estiver lá não viaja, mesmo que tenha sido reconhecido.
//   · NUNCA `localStorage`. Ver acima: `sessionStorage` morre com o
//     separador, e é isso que queremos.

import type { TipoEntidade } from "./esquema";

/** O nome do parâmetro que leva o identificador opaco. */
export const PARAM_HANDOFF = "ctx";

/** Dez minutos. Chega para atravessar uma navegação; não chega para um perfil. */
export const TTL_HANDOFF_MS = 10 * 60 * 1000;

const PREFIXO = "rc:busca:ctx:";

/** O que pode viajar: números e palavras de catálogos fechados. */
export type ValorHandoff = string | number;

export type CamposHandoff = Partial<Record<TipoEntidade, ValorHandoff>>;

interface CargaHandoff {
  versao: 1;
  /** O id do documento de destino. Ver `validar` — não se confia no URL. */
  destino: string;
  criadoEm: number;
  expiraEm: number;
  campos: CamposHandoff;
}

function armazenamento(): Storage | null {
  try {
    // Um browser em modo restrito lança ao ACEDER a `sessionStorage`, e não
    // só ao escrever. O contexto é uma comodidade: sem ele a ferramenta
    // abre limpa, que é um estado perfeitamente válido.
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function identificador(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* segue para o caminho de baixo */
  }
  // Sem `randomUUID` não há aleatoriedade criptográfica — e também não é
  // preciso: isto é uma chave de uma gaveta que só este separador vê, e
  // não um segredo. O que tem de ser é único dentro da sessão.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Guarda o contexto e devolve o identificador a pôr no endereço.
 *
 * `null` quando não há nada para guardar (nenhum campo permitido foi
 * reconhecido) ou quando o armazenamento não existe. Quem chama trata os
 * dois casos da mesma maneira: navega sem `?ctx=`, e o destino abre limpo.
 */
export function guardarHandoff(destino: string, campos: CamposHandoff): string | null {
  const entradas = Object.entries(campos).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (entradas.length === 0) return null;

  const store = armazenamento();
  if (!store) return null;

  const agora = Date.now();
  const carga: CargaHandoff = {
    versao: 1,
    destino,
    criadoEm: agora,
    expiraEm: agora + TTL_HANDOFF_MS,
    campos: Object.fromEntries(entradas) as CamposHandoff,
  };

  const id = identificador();
  try {
    store.setItem(`${PREFIXO}${id}`, JSON.stringify(carga));
  } catch {
    // Quota cheia ou escrita recusada. Sem contexto, com ferramenta a
    // abrir na mesma — nunca um erro na cara de quem só quis calcular.
    return null;
  }
  limparExpirados(store, agora);
  return id;
}

/**
 * Lê, valida e APAGA o contexto.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ O DESTINO NÃO ACREDITA NO QUE LHE CHEGA                              │
 * │                                                                     │
 * │ `aceites` é a lista do que ESTA página sabe receber, declarada por   │
 * │ ela. Um campo que não esteja lá é descartado em silêncio, e um       │
 * │ contexto criado para outro destino é ignorado por inteiro.           │
 * │                                                                     │
 * │ Não é paranoia sobre um atacante — a gaveta é do próprio separador.  │
 * │ É a mesma disciplina do `parseFiltro` do diretório: o que entra numa │
 * │ interface tem de vir de um catálogo fechado, ou mais cedo ou mais    │
 * │ tarde alguém guarda um contexto para uma página, muda o destino num  │
 * │ refactor, e a ferramenta abre com um campo preenchido que não é dela.│
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function consumirHandoff(
  destino: string,
  id: string | null | undefined,
  aceites: readonly TipoEntidade[],
): CamposHandoff | null {
  if (!id) return null;
  const store = armazenamento();
  if (!store) return null;

  const chave = `${PREFIXO}${id}`;
  let bruto: string | null = null;
  try {
    bruto = store.getItem(chave);
    // Consumo único: apaga-se ANTES de validar. Um contexto que não passe
    // na validação não é um contexto para tentar outra vez.
    store.removeItem(chave);
  } catch {
    return null;
  }
  if (!bruto) return null;

  let carga: CargaHandoff;
  try {
    carga = JSON.parse(bruto) as CargaHandoff;
  } catch {
    return null;
  }

  if (carga?.versao !== 1) return null;
  if (carga.destino !== destino) return null;
  if (!carga.expiraEm || carga.expiraEm < Date.now()) return null;

  const campos: CamposHandoff = {};
  for (const tipo of aceites) {
    const valor = carga.campos?.[tipo];
    if (valor !== undefined && valor !== null && valor !== "") campos[tipo] = valor;
  }
  return Object.keys(campos).length > 0 ? campos : null;
}

/**
 * Varre a gaveta e deita fora o que já expirou.
 *
 * Corre a cada escrita e não num temporizador: um contexto expirado só
 * incomoda quando alguém escreve o seguinte, e um temporizador seria mais
 * uma coisa a viver enquanto a pessoa não está a fazer nada.
 */
function limparExpirados(store: Storage, agora: number): void {
  try {
    const mortos: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const chave = store.key(i);
      if (!chave?.startsWith(PREFIXO)) continue;
      try {
        const carga = JSON.parse(store.getItem(chave) ?? "{}") as Partial<CargaHandoff>;
        if (!carga.expiraEm || carga.expiraEm < agora) mortos.push(chave);
      } catch {
        mortos.push(chave);
      }
    }
    for (const chave of mortos) store.removeItem(chave);
  } catch {
    /* o armazenamento pode recusar-se a ser enumerado; não é fatal */
  }
}

/**
 * O endereço final de uma ação preparada.
 *
 * Devolve o `href` intacto quando não há contexto para transportar — é o
 * caso da esmagadora maioria das consultas, e a ausência do parâmetro é
 * o que torna esses endereços partilháveis sem pensar duas vezes.
 */
export function hrefComHandoff(href: string, id: string | null): string {
  if (!id) return href;
  // A âncora fica sempre no fim: `/x#calculadora?ctx=…` não é um endereço,
  // é uma âncora com um nome esquisito.
  const [caminho, ancora] = href.split("#");
  const separador = caminho.includes("?") ? "&" : "?";
  const comParametro = `${caminho}${separador}${PARAM_HANDOFF}=${encodeURIComponent(id)}`;
  return ancora ? `${comParametro}#${ancora}` : comParametro;
}

/** Só para testes: esvazia a gaveta. */
export function esquecerHandoffs(): void {
  const store = armazenamento();
  if (!store) return;
  const chaves: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const chave = store.key(i);
    if (chave?.startsWith(PREFIXO)) chaves.push(chave);
  }
  for (const chave of chaves) store.removeItem(chave);
}
