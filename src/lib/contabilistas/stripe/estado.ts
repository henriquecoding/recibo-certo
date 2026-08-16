// ═══════════════════════════════════════════════════════════════════════
//  RECEBIMENTOS — a máquina de estados da conta Stripe Connect
//  ---------------------------------------------------------------------
//  A ligação à Stripe tinha rota, webhook e tabela — e não tinha isto. O
//  estado era calculado com ternários encadeados dentro da página, e a
//  consequência não era estética: uma conta que pode cobrar mas não pode
//  receber transferências (charges sim, payouts não) aparecia como «tudo
//  pronto», e o contabilista só descobria que o dinheiro não saía do saldo
//  quando fosse à procura dele.
//
//  Os três sinais da Stripe não são um progresso linear, e é esse o ponto:
//
//    · `details_submitted` — a pessoa acabou o formulário;
//    · `charges_enabled`   — pode receber dinheiro de clientes;
//    · `payouts_enabled`   — o dinheiro pode sair para o IBAN dela.
//
//  Podem estar em qualquer combinação. Uma conta pode cobrar sem poder
//  transferir (verificação a meio), pode ter submetido tudo e estar à
//  espera, e pode voltar atrás quando a Stripe pede um documento novo por
//  causa de um limite atingido. Chamar a isto «ligado / não ligado» é
//  perder exatamente a informação que interessa.
//
//  Este módulo é puro e não fala com a Stripe: recebe os três booleanos e
//  a lista de requisitos, e devolve um estado com nome, uma explicação e
//  um passo seguinte. É o que torna a regra testável — e testada.
// ═══════════════════════════════════════════════════════════════════════

/**
 * O estado dos recebimentos, do ponto de vista de quem quer ser pago.
 *
 * Deliberadamente NÃO espelha os campos da Stripe: espelha as situações em
 * que uma pessoa se pode encontrar, que é o que a interface tem de saber
 * para dizer a frase certa.
 */
export type EstadoRecebimentos =
  /** Nunca começou. */
  | "sem_conta"
  /** A conta existe, o formulário ficou a meio. */
  | "incompleta"
  /** Submeteu tudo e a Stripe pede mais alguma coisa. */
  | "acao_necessaria"
  /** Submeteu tudo, nada em falta, a Stripe está a verificar. */
  | "em_analise"
  /** Já cobra, mas o dinheiro ainda não sai — ou há prazo a correr. */
  | "restrita"
  /** Cobra e recebe. */
  | "ativa";

/** Os três sinais que a Stripe dá, e o que ainda pede. */
export interface SinaisDaConta {
  ligada: boolean;
  podeCobrar: boolean;
  podeReceber: boolean;
  dadosSubmetidos: boolean;
  requisitos: string[];
}

export interface RetratoDosRecebimentos {
  estado: EstadoRecebimentos;
  /** O título, em pt-PT, do ponto de vista do contabilista. */
  titulo: string;
  /** Uma frase que explica o que está a acontecer, sem jargão. */
  explicacao: string;
  /** O que fazer a seguir. `null` quando não há nada a fazer. */
  accao: string | null;
  /** Que botão mostrar: abrir o formulário, ou abrir o painel da Stripe. */
  destino: "onboarding" | "painel" | null;
  /** O tom da moldura. Segue o design system, não a gravidade da Stripe. */
  tom: "neutro" | "aviso" | "marca";
  /** Verdadeiro quando um cliente consegue mesmo pagar-lhe agora. */
  aceitaPagamentos: boolean;
}

/**
 * Classifica a conta.
 *
 * A ordem dos ramos é a especificação. `restrita` vem ANTES de `ativa` de
 * propósito: quem pode cobrar mas não pode transferir tem um problema
 * real, e um `charges_enabled === true` a decidir sozinho o resultado
 * escondia-o atrás de um visto verde.
 */
export function classificarRecebimentos(s: SinaisDaConta): RetratoDosRecebimentos {
  if (!s.ligada) {
    return {
      estado: "sem_conta",
      titulo: "Ainda não recebes pagamentos por aqui",
      explicacao:
        "Os teus clientes só te podem pagar pelo Recibo Certo depois de ligares uma conta Stripe. O formulário é da Stripe e pede o que a lei obriga: identificação, morada e o IBAN onde queres receber.",
      accao: "Ativar recebimentos",
      destino: "onboarding",
      tom: "neutro",
      aceitaPagamentos: false,
    };
  }

  if (!s.dadosSubmetidos) {
    return {
      estado: "incompleta",
      titulo: "Falta acabar o formulário",
      explicacao:
        "A conta existe, mas ficou a meio. Enquanto não estiver submetida, os teus clientes não te conseguem pagar aqui.",
      accao: "Continuar o formulário",
      destino: "onboarding",
      tom: "aviso",
      aceitaPagamentos: false,
    };
  }

  if (!s.podeCobrar && s.requisitos.length > 0) {
    return {
      estado: "acao_necessaria",
      titulo: "A Stripe precisa de mais alguma coisa",
      explicacao:
        "Já submeteste o formulário, mas falta responder ao que a Stripe pede em baixo. Até lá, não podes cobrar.",
      accao: "Resolver na Stripe",
      destino: "onboarding",
      tom: "aviso",
      aceitaPagamentos: false,
    };
  }

  if (!s.podeCobrar) {
    return {
      estado: "em_analise",
      titulo: "A Stripe está a verificar",
      explicacao:
        "Está tudo enviado e não falta nada da tua parte. Assim que a verificação terminar, os teus clientes passam a poder pagar-te aqui — avisamos-te.",
      accao: null,
      destino: "painel",
      tom: "neutro",
      aceitaPagamentos: false,
    };
  }

  // Daqui para baixo já cobra. Falta saber se o dinheiro sai.
  if (!s.podeReceber) {
    return {
      estado: "restrita",
      titulo: "Já cobras, mas o dinheiro ainda não sai",
      explicacao:
        "Os teus clientes já te conseguem pagar e o dinheiro fica no teu saldo Stripe. As transferências para o teu IBAN estão suspensas até a verificação ficar completa.",
      accao: "Ver o que falta",
      destino: "painel",
      tom: "aviso",
      aceitaPagamentos: true,
    };
  }

  if (s.requisitos.length > 0) {
    return {
      estado: "restrita",
      titulo: "A funcionar, com um prazo a correr",
      explicacao:
        "Está tudo a funcionar, mas a Stripe pede mais dados dentro de um prazo. Se ele passar sem resposta, os recebimentos param.",
      accao: "Resolver na Stripe",
      destino: "painel",
      tom: "aviso",
      aceitaPagamentos: true,
    };
  }

  return {
    estado: "ativa",
    titulo: "Recebimentos ativos",
    explicacao:
      "Os teus clientes podem pagar-te aqui e o dinheiro segue para o teu IBAN segundo o calendário que definires na Stripe.",
    accao: null,
    destino: "painel",
    tom: "marca",
    aceitaPagamentos: true,
  };
}

// ─── Os requisitos, em português ───────────────────────────────────────
//
// A Stripe devolve códigos como `individual.verification.document` ou
// `company.tax_id`. Mostrá-los tal e qual — que era o que a página fazia,
// em `font-mono` — não é transparência: é passar o trabalho de traduzir
// para quem menos o consegue fazer, e num momento em que a pessoa já está
// a tentar perceber porque é que não pode ser paga.

/** Traduções exatas, para os códigos que não seguem o padrão. */
const EXATOS: Record<string, string> = {
  external_account: "O IBAN para onde queres receber",
  "business_profile.url": "O endereço do teu site ou perfil profissional",
  "business_profile.mcc": "A categoria da tua atividade",
  "business_profile.product_description": "Uma descrição do que fazes",
  "business_profile.name": "O nome do teu negócio",
  "business_profile.support_phone": "Um telefone de apoio ao cliente",
  "tos_acceptance.date": "A aceitação dos termos da Stripe",
  "tos_acceptance.ip": "A aceitação dos termos da Stripe",
  "settings.dashboard.display_name": "O nome que aparece no extrato do cliente",
  "company.tax_id": "O NIPC da empresa",
  "company.name": "O nome da empresa",
  "company.verification.document": "Um documento que comprove a empresa",
  "company.directors_provided": "A confirmação de quem são os administradores",
  "company.owners_provided": "A confirmação de quem são os sócios",
  "company.executives_provided": "A confirmação de quem são os responsáveis",
};

/** Sufixos, aplicados depois de tirar o prefixo (`individual.`, `person_xxx.`). */
const SUFIXOS: [RegExp, string][] = [
  [/^verification\.document$/, "Um documento de identificação (frente e verso)"],
  [/^verification\.additional_document$/, "Um segundo documento de identificação"],
  [/^id_number$/, "O teu número de identificação fiscal"],
  [/^ssn_last_4$/, "Os últimos dígitos do teu número de identificação"],
  [/^dob\./, "A tua data de nascimento"],
  [/^first_name$/, "O teu nome próprio"],
  [/^last_name$/, "O teu apelido"],
  // Uma frase para todos os campos de morada, e não uma por campo: são
  // quatro códigos e uma coisa a fazer. Ver `requisitosLegiveis`.
  [/^address\./, "A tua morada (rua, código postal e localidade)"],
  [/^email$/, "O teu email"],
  [/^phone$/, "O teu telefone"],
  [/^relationship\./, "O teu papel na empresa"],
];

const PREFIXOS = [/^individual\./, /^representative\./, /^person_[A-Za-z0-9]+\./, /^company\./];

/**
 * Um código de requisito da Stripe, dito em português.
 *
 * Quando não há tradução, devolve `null` em vez de inventar uma frase. A
 * interface mostra então o código — feio, mas honesto, e a lista de
 * códigos por traduzir é o que diz onde acrescentar a próxima linha.
 */
export function traduzirRequisito(codigo: string): string | null {
  const c = codigo.trim();
  if (!c) return null;
  if (EXATOS[c]) return EXATOS[c];

  let resto = c;
  for (const p of PREFIXOS) {
    if (p.test(resto)) { resto = resto.replace(p, ""); break; }
  }

  for (const [padrao, texto] of SUFIXOS) {
    if (padrao.test(resto)) return texto;
  }

  return null;
}

export interface RequisitoLegivel {
  codigo: string;
  /** A frase em português, ou `null` quando ainda não há tradução. */
  texto: string | null;
}

/**
 * A lista de requisitos, pronta a mostrar.
 *
 * Tira duplicados depois de traduzir: `individual.address.line1` e
 * `individual.address.city` são dois códigos e uma só coisa a fazer —
 * escrever a morada. Mostrar as duas linhas fazia parecer mais trabalho do
 * que é, e o desânimo aqui custa uma conta por acabar.
 */
export function requisitosLegiveis(codigos: string[]): RequisitoLegivel[] {
  const vistos = new Set<string>();
  const out: RequisitoLegivel[] = [];

  for (const codigo of codigos) {
    const texto = traduzirRequisito(codigo);
    const chave = texto ?? `cru:${codigo}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    out.push({ codigo, texto });
  }

  return out;
}

/**
 * O que dizer ao CLIENTE sobre este contabilista.
 *
 * Nada do que está acima sai daqui. O cliente não tem nada que saber que a
 * Stripe pediu um documento a alguém — é informação privada, e das que
 * fazem perder um cliente por uma razão que não é dele. Só sai o facto que
 * lhe interessa: consegue ou não pagar aqui.
 */
export function comoOClienteVe(aceitaPagamentos: boolean): {
  rotulo: string;
  detalhe: string;
} {
  return aceitaPagamentos
    ? {
        rotulo: "Aceita pagamento pela plataforma",
        detalhe: "Pagas as consultas aqui, com recibo e histórico.",
      }
    : {
        rotulo: "Pagamento combinado diretamente",
        detalhe: "As consultas com este contabilista pagam-se fora da plataforma.",
      };
}
