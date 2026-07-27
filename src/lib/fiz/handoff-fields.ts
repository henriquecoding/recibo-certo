// ═══════════════════════════════════════════════════════════════════════
//  CAMPOS DO HANDOFF — módulo isomórfico
//  ---------------------------------------------------------------------
//  Extraído de `handoff.server.ts` porque o diálogo de consentimento corre
//  no cliente e precisa dos rótulos, mas não pode arrastar `node:crypto`.
//
//  A lista de rótulos é a fronteira do que é enviável: se um campo não
//  estiver aqui, não pode ser proposto nem autorizado. O servidor valida
//  contra esta mesma lista, por isso um cliente adulterado não consegue
//  alargar o consentimento.
//
//  ── Porque existem três grupos ────────────────────────────────────────
//
//  A primeira versão só permitia enquadramento e estimativas. Estava certa
//  no espírito e errada na conclusão: o ponto 8.2 da arquitetura proíbe
//  "NIF em query string" e "email em query string" — proíbe o CANAL, não o
//  dado. Com consentimento explícito e no corpo de um pedido cifrado, a
//  identificação é lícita (Art. 6.º, n.º 1, al. a do RGPD) e é o que evita
//  ao utilizador reescrever tudo do outro lado.
//
//  O que continua proibido não é proibido por cautela — é proibido porque
//  o utilizador NÃO PODE consentir por ele:
//    · credenciais: não são dados, são chaves de acesso;
//    · dados de clientes: pertencem a terceiros que nunca foram ouvidos;
//    · documentos e anexos: contêm invariavelmente dados de terceiros.
// ═══════════════════════════════════════════════════════════════════════

export type CampoHandoff =
  // Enquadramento — o que determina as regras aplicáveis
  | "entityType" | "activityCategory" | "vatTerritory" | "vatRegimeEstimate" | "socialSecuritySituation"
  // Estimativas — resultado dos nossos motores
  | "grossEstimate" | "vatEstimate" | "withholdingEstimate" | "socialSecurityEstimate" | "irsEstimate"
  | "period"
  // Identificação — só com consentimento próprio e destacado
  | "fullName" | "taxpayerNumber" | "email" | "phone"
  // Origem
  | "intent" | "sourceGuide";

export type GrupoCampo = "enquadramento" | "estimativas" | "identificacao" | "origem";

export interface DefinicaoCampo {
  grupo: GrupoCampo;
  rotulo: string;
  /** Porque é que vale a pena enviar. Aparece por baixo do rótulo. */
  porque?: string;
  /** Dado pessoal identificável — exige um aviso mais forte no diálogo. */
  identificavel?: boolean;
}

export const CAMPOS: Record<CampoHandoff, DefinicaoCampo> = {
  // ── Enquadramento ───────────────────────────────────────────────────
  entityType: {
    grupo: "enquadramento",
    rotulo: "Tipo de entidade",
    porque: "Particular, empresário em nome individual ou sociedade.",
  },
  activityCategory: {
    grupo: "enquadramento",
    rotulo: "Categoria da atividade",
    porque: "Determina o coeficiente e a retenção aplicáveis.",
  },
  vatTerritory: {
    grupo: "enquadramento",
    rotulo: "Território para efeitos de IVA",
    porque: "Continente, Madeira ou Açores — as taxas diferem.",
  },
  vatRegimeEstimate: {
    grupo: "enquadramento",
    rotulo: "Regime de IVA estimado",
    porque: "Isenção do Art. 53.º, isenção do Art. 9.º ou regime normal.",
  },
  socialSecuritySituation: {
    grupo: "enquadramento",
    rotulo: "Situação perante a Segurança Social",
  },

  // ── Estimativas ─────────────────────────────────────────────────────
  period: { grupo: "estimativas", rotulo: "Periodicidade da estimativa" },
  grossEstimate: { grupo: "estimativas", rotulo: "Valor bruto estimado" },
  vatEstimate: { grupo: "estimativas", rotulo: "IVA estimado" },
  withholdingEstimate: { grupo: "estimativas", rotulo: "Retenção na fonte estimada" },
  socialSecurityEstimate: { grupo: "estimativas", rotulo: "Contribuição estimada para a Segurança Social" },
  irsEstimate: { grupo: "estimativas", rotulo: "IRS estimado" },

  // ── Identificação ───────────────────────────────────────────────────
  fullName: {
    grupo: "identificacao",
    rotulo: "Nome",
    porque: "Evita ter de o escrever outra vez na FIZ.",
    identificavel: true,
  },
  taxpayerNumber: {
    grupo: "identificacao",
    rotulo: "NIF",
    porque: "Necessário para abrir atividade ou emitir documentos na FIZ.",
    identificavel: true,
  },
  email: {
    grupo: "identificacao",
    rotulo: "Email",
    porque: "Para a FIZ associar a continuação à tua conta.",
    identificavel: true,
  },
  phone: {
    grupo: "identificacao",
    rotulo: "Telefone",
    porque: "Só se quiseres ser contactado por essa via.",
    identificavel: true,
  },

  // ── Origem ──────────────────────────────────────────────────────────
  intent: { grupo: "origem", rotulo: "O que pretendes fazer a seguir" },
  sourceGuide: { grupo: "origem", rotulo: "Guia ou simulador de onde vieste" },
};

/** Compatibilidade: o mapa simples de rótulos continua disponível. */
export const ROTULO_CAMPO: Record<CampoHandoff, string> = Object.fromEntries(
  Object.entries(CAMPOS).map(([k, v]) => [k, v.rotulo]),
) as Record<CampoHandoff, string>;

export const CAMPOS_VALIDOS = Object.keys(CAMPOS) as CampoHandoff[];

export const CAMPOS_IDENTIFICAVEIS: CampoHandoff[] = CAMPOS_VALIDOS.filter(
  (c) => CAMPOS[c].identificavel,
);

export interface DefinicaoGrupo {
  id: GrupoCampo;
  titulo: string;
  descricao: string;
  /** Resumo de uma linha, para quando o grupo está fechado. */
  resumo: string;
  /**
   * O diálogo abre este grupo por omissão?
   *
   * O atrito deve ser PROPORCIONAL À SENSIBILIDADE, não uniforme. Hoje custa
   * exatamente o mesmo autorizar "Periodicidade" e "NIF", o que é errado nas
   * duas direções: fatiga quem só quer continuar, e banaliza o campo que
   * merecia uma pausa.
   *
   * Por isso o enquadramento e os valores — que são o que o utilizador
   * acabou de ver no simulador — abrem; a identificação abre FECHADA, com o
   * aviso à vista, para que abri-la seja um gesto próprio.
   */
  abertoPorOmissao: boolean;
}

export const GRUPOS: DefinicaoGrupo[] = [
  {
    id: "enquadramento",
    titulo: "Enquadramento fiscal",
    descricao: "O que determina as regras que se aplicam ao teu caso.",
    resumo: "Atividade, território e regime de IVA.",
    abertoPorOmissao: true,
  },
  {
    id: "estimativas",
    titulo: "Valores estimados",
    descricao: "Resultado dos nossos cálculos. São estimativas, não valores oficiais.",
    resumo: "Os números que acabaste de ver.",
    abertoPorOmissao: true,
  },
  {
    id: "identificacao",
    titulo: "Identificação",
    descricao: "Dados que te identificam. Só faz sentido enviar se quiseres continuar já na FIZ.",
    resumo: "Nome, NIF, email e telefone — opcional.",
    abertoPorOmissao: false,
  },
  {
    id: "origem",
    titulo: "Origem",
    descricao: "De onde veio esta continuação.",
    resumo: "Que simulador ou guia deu origem a isto.",
    abertoPorOmissao: false,
  },
];

/**
 * Nunca sai daqui, aconteça o que acontecer — e não por excesso de cautela.
 *
 * Credenciais não são dados pessoais, são chaves de acesso: partilhá-las
 * seria dar acesso, não informação. Dados de clientes e documentos
 * pertencem a terceiros que nunca foram ouvidos — o utilizador não tem
 * legitimidade para consentir em nome deles.
 */
export const CAMPOS_NUNCA_ENVIADOS = [
  "palavras-passe ou credenciais da FIZ, das Finanças ou da Segurança Social",
  "dados dos teus clientes",
  "documentos emitidos e anexos",
  "IBAN e dados bancários",
] as const;

/** Nenhum destes campos pode viajar em query string, em circunstância alguma. */
export const NUNCA_EM_URL: CampoHandoff[] = [
  ...CAMPOS_IDENTIFICAVEIS,
  "grossEstimate",
  "irsEstimate",
  "socialSecurityEstimate",
];
