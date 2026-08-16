// ═══════════════════════════════════════════════════════════════════════
//  CONTACTO EXTERNO — a mesma regra que a base de dados aplica
//  ---------------------------------------------------------------------
//  Isto NÃO é a fronteira de segurança. A fronteira é
//  `texto_parece_contacto_externo` na migração 054, que corre dentro da
//  transação que escreve — quem quiser contornar o browser fala com o
//  PostgREST e encontra-a na mesma.
//
//  Isto existe por uma razão diferente: para que a pessoa saiba ANTES de
//  carregar em enviar. Um aviso a meio da escrita é uma explicação; a mesma
//  recusa a chegar do servidor três segundos depois é uma parede. As duas
//  implementações têm de dizer o mesmo, e é por isso que as regras estão
//  escritas nos dois sítios com os mesmos nomes e pela mesma ordem.
//
//  O EQUILÍBRIO
//  ------------
//  Todo o desenho desta função está entre dois erros de sinal contrário.
//  Deixar passar um número perde a relação para fora da plataforma. Recusar
//  um NIF estraga uma conversa de quem não estava a fazer nada — e ensina a
//  desconfiar da caixa de texto, que é o dano mais caro dos dois, porque
//  atinge quem estava a portar-se bem.
//
//  Daí a regra central: NÚMEROS SOZINHOS NÃO CHEGAM. Um NIF, um IBAN, uma
//  referência de multibanco e um telemóvel são todos dígitos. O que
//  distingue um contacto não são os dígitos — é a forma de os apresentar:
//  o indicativo, os separadores, ou a palavra que os introduz. Um
//  `912345678` cru só é recusado quando nada à volta o apresenta como
//  outra coisa.
// ═══════════════════════════════════════════════════════════════════════

/** Porque é que um texto foi recusado. Serve para explicar, não para acusar. */
export type MotivoContacto = "email" | "telefone" | "canal" | "convite";

export interface DeteccaoContacto {
  /** Verdadeiro quando o texto oferece um canal fora da plataforma. */
  encontrado: boolean;
  /** Os motivos encontrados, por ordem de deteção. Vazio quando limpo. */
  motivos: MotivoContacto[];
}

/**
 * Números que já têm dono declarado.
 *
 * Um NIF português pode começar por 91 (as séries 90/91/98/99 existem), e
 * nesse caso é indistinguível de um telemóvel olhando só para os dígitos.
 * O que os distingue é a etiqueta que quase sempre os acompanha — e é ela
 * que se procura aqui. Encontrada, os dígitos saem do texto antes de a
 * análise começar: é assim que o NIF deixa de parecer um telemóvel sem que
 * a deteção de telemóveis tenha de ficar mais fraca.
 */
const NUMEROS_COM_DONO =
  /(nif|nipc|n\.?i\.?f|contribuinte|iban|nib|refer[êe]ncia|ref\.?|entidade|multibanco|mb ?way|fatura|factura|recibo|documento|processo|ap[óo]lice|matr[íi]cula)[^0-9]{0,24}[0-9 .-]{6,34}/g;

/** Email escrito por extenso, ou com o arroba disfarçado. */
const EMAIL = [
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/,
  // «joao [at] gmail.com» — arroba entre parênteses, domínio normal.
  /[a-z0-9._%+-]+ ?[([{] ?(at|arroba) ?[)\]}] ?[a-z0-9-]+\.[a-z]{2,}/,
  // «joao (arroba) gmail (ponto) com» — o ponto também disfarçado.
  /[a-z0-9._%+-]+ ?[([{] ?(at|arroba) ?[)\]}] ?[a-z0-9.-]+ ?[([{] ?(dot|ponto) ?[)\]}] ?[a-z]{2,}/,
  /[a-z0-9._%+-]+ (at|arroba) [a-z0-9.-]+ ?\.? ?[a-z]{2,}/,
  /mailto ?:/,
];

/** Indicativo de país. Não há leitura inocente de um +351. */
const INDICATIVO = [/(\+ ?351|00 ?351)[ .-]?[0-9]/, /tel ?: ?[+0-9]/];

/**
 * Um número português de nove dígitos, com ou sem separadores.
 *
 * Enumerar os agrupamentos possíveis («912 345 678», «91 234 5678», «912-345-678»…)
 * é o caminho errado: falha sempre num que ninguém se lembrou, e a primeira
 * versão disto falhava logo no mais comum de todos. Procura-se antes uma
 * corrida de nove dígitos com separadores opcionais e normaliza-se.
 *
 * As duas âncoras não são decorativas. Sem elas, um número de doze dígitos
 * dava nove a partir do quarto, e passava a telemóvel por recorte.
 */
const CORRIDA_DE_NOVE = /(?<![0-9])([0-9](?:[ .-]?[0-9]){8})(?![0-9])/g;
const PREFIXO_PT = /^(9[1236]|2[1-9])/;

/**
 * Palavras que apresentam um número como forma de contacto.
 *
 * É esta vizinhança que autoriza recusar nove dígitos crus. Sem ela, nove
 * dígitos são só nove dígitos — podiam ser um NIF cujo dono não escreveu a
 * etiqueta, e recusá-los seria o falso positivo que não se pode ter.
 */
const APRESENTA_COMO_CONTACTO =
  /(telem[óo]vel|telefone|contacto|contato|whats|wpp|liga|ligar|chama|telefona|sms|n[úu]mero|call)/;

/**
 * Procura números portugueses, e diz de que tipo.
 *
 * `comSeparador` dispensa contexto: escrever «912 345 678» é ditar um
 * número a alguém, e nenhum campo de NIF sai assim. `cru` precisa de uma
 * palavra à volta que o apresente como contacto.
 */
function procurarNumeros(s: string): { comSeparador: boolean; cru: boolean } {
  let comSeparador = false;
  let cru = false;

  for (const m of s.matchAll(CORRIDA_DE_NOVE)) {
    const bruto = m[1];
    const digitos = bruto.replace(/[ .-]/g, "");
    if (digitos.length !== 9 || !PREFIXO_PT.test(digitos)) continue;
    if (bruto.length > digitos.length) comSeparador = true;
    else cru = true;
  }

  return { comSeparador, cru };
}

/** Canais com nome próprio. Nomeá-los numa relação é quase sempre um convite. */
const CANAL = [
  /\b(whats ?app|whatsap|wpp|telegram|signal|viber|messenger|skype|imessage|facetime)\b/,
  /(wa\.me|api\.whatsapp|t\.me\/|m\.me\/|join\.skype)/,
  /(instagram\.com\/|facebook\.com\/|linkedin\.com\/in\/|tiktok\.com\/@)/,
];

/** Convites a sair, sem número nenhum à vista. */
const CONVITE = [
  /\b(o|meu) (meu )?(email|e-mail|mail|telem[óo]vel|telefone|contacto|n[úu]mero) (é|e|:) /,
  /(manda|envia|escreve|passa|d[áa]|liga)[- ](me )?(um |o |para o |para )?(email|e-mail|mail|whats|sms|telem[óo]vel|telefone)/,
  /fora (da|desta) plataforma/,
  /(falamos|continuamos|combinamos) (por|no|pelo) (whats|email|e-mail|telefone|telem[óo]vel)/,
];

/**
 * Examina um texto à procura de canais de contacto externos.
 *
 * Devolve os motivos e não só um booleano porque a interface precisa deles:
 * dizer «isto parece um telemóvel» é uma correção, dizer «não podes enviar»
 * é uma ordem sem explicação.
 */
export function detetarContactoExterno(texto: string): DeteccaoContacto {
  const s = (texto ?? "").toLowerCase().replace(/\s+/g, " ");
  const limpo = s.replace(NUMEROS_COM_DONO, " ");
  const motivos: MotivoContacto[] = [];

  if (EMAIL.some((r) => r.test(limpo))) motivos.push("email");

  const numeros = procurarNumeros(limpo);
  if (
    INDICATIVO.some((r) => r.test(limpo)) ||
    numeros.comSeparador ||
    (numeros.cru && APRESENTA_COMO_CONTACTO.test(limpo))
  ) {
    motivos.push("telefone");
  }
  if (CANAL.some((r) => r.test(limpo))) motivos.push("canal");
  if (CONVITE.some((r) => r.test(limpo))) motivos.push("convite");

  return { encontrado: motivos.length > 0, motivos };
}

/** Atalho para quem só quer saber se pode enviar. */
export function pareceContactoExterno(texto: string): boolean {
  return detetarContactoExterno(texto).encontrado;
}

/**
 * O que dizer a quem escreveu isto.
 *
 * Em português de quem explica, não de quem apanha alguém em falta: a
 * pessoa quase sempre não estava a tentar contornar nada — estava a fazer
 * o que se faz em todo o lado. A frase diz o motivo, e diz o que se ganha
 * em ficar.
 */
export function explicarContactoExterno(motivos: MotivoContacto[]): string {
  const o = motivos[0];
  const inicio =
    o === "email"
      ? "Isto parece um endereço de email."
      : o === "telefone"
        ? "Isto parece um número de telefone."
        : o === "canal"
          ? "Isto aponta para uma aplicação de mensagens."
          : "Isto parece um convite para falarem fora daqui.";

  return `${inicio} O acompanhamento fica todo nesta conversa — é aqui que o histórico se guarda, que as partilhas se revogam e que ninguém perde o fio.`;
}

/**
 * A recusa vinda do servidor, traduzida.
 *
 * O gatilho da migração 054 levanta `22023` com `HINT = 'contacto_externo'`.
 * Reconhecer a dica evita mostrar a mensagem crua do PostgreSQL a alguém
 * que só queria enviar uma frase.
 */
export function eRecusaDeContacto(erro: { hint?: string | null; message?: string } | null): boolean {
  if (!erro) return false;
  if (erro.hint === "contacto_externo") return true;
  return (erro.message ?? "").includes("contactos pessoais não se partilham");
}
