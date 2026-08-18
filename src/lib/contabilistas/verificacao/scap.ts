// ═══════════════════════════════════════════════════════════════════════
//  SCAP — o adaptador da via oficial
//  ---------------------------------------------------------------------
//  Este é o único caminho pelo qual o «verificado» pode aparecer sem uma
//  pessoa no meio, e é por isso que existe. O contrato aqui escrito não é
//  inventado nem aproximado: vem da especificação OpenAPI publicada pela
//  AMA em github.com/amagovpt/doc-SCAP-Consumidores (`SCAP-AttributeService`,
//  v2.0), lida a 2026-08-18.
//
//  Como funciona, em três passos:
//
//    1. `listarFornecedores()`  → descobre o `uriId` da Ordem. Não está
//       aqui escrito à mão de propósito: um identificador adivinhado é
//       exactamente o tipo de dado inventado que a regra de ouro nº 1
//       proíbe, e o serviço devolve-o.
//    2. `pedirAtributos()`      → pede a consulta, identificando o cidadão
//       pelo documento e apresentando a credencial que ELE autorizou.
//    3. `obterAtributos()`      → recolhe a resposta. É assíncrono por
//       desenho: quem responde é a Ordem, não o SCAP.
//
//  ⚠️ ESTADO REAL: inerte até haver protocolo com a AMA.
//
//  Ser consumidor de atributos exige protocolo com a AMA, relatório de
//  conformidade assinado com LTV, vídeo demonstrativo, cinco documentos
//  assinados em pré-produção e certificação do código pela AMA ou por
//  auditor eIDAS credenciado (documentação lida a 2026-08-18).
//
//  Sem as variáveis de ambiente configuradas, TODAS as funções devolvem
//  `indisponivel` e nenhuma inventa uma resposta. Este ficheiro nunca
//  simula uma confirmação — é o mesmo princípio do adaptador da Stripe:
//  código a sério, desligado, à espera de credenciais reais.
// ═══════════════════════════════════════════════════════════════════════

import { SCAP_DOCS, SCAP_OCC } from "./fontes";

// ─── Configuração ──────────────────────────────────────────────────────

/**
 * Os dois ambientes que a AMA opera. Estão aqui como constantes porque
 * são endereços públicos documentados, e ter o de pré-produção à mão é o
 * que permite integrar sem tocar em produção.
 */
export const SCAP_HOSTS = {
  producao: "https://scap.autenticacao.gov.pt",
  preProducao: "https://preprod.scap.autenticacao.gov.pt",
} as const;

export type AmbienteSCAP = keyof typeof SCAP_HOSTS;

export interface ConfigSCAP {
  ambiente: AmbienteSCAP;
  /** Cabeçalho `FAAuthorization` — a identificação do consumidor. */
  autorizacao: string;
  /** Certificado do consumidor, reenviado no cabeçalho `X-SSL-Cert`. */
  certificado: string;
  /** `clientName` do pedido: identifica a aplicação junto do SCAP. */
  nomeCliente: string;
}

/**
 * Lê a configuração do ambiente. `null` quando falta o que quer que seja.
 *
 * Não há valores por omissão para nenhum destes campos, e a ausência de
 * um valor por omissão é a funcionalidade: um `FAAuthorization` de
 * exemplo faria a integração parecer montada quando não está.
 */
export function configSCAP(): ConfigSCAP | null {
  const autorizacao = process.env.SCAP_FA_AUTHORIZATION?.trim();
  const certificado = process.env.SCAP_CLIENT_CERT?.trim();
  const nomeCliente = process.env.SCAP_CLIENT_NAME?.trim();
  const ambiente = process.env.SCAP_AMBIENTE?.trim();

  if (!autorizacao || !certificado || !nomeCliente) return null;
  if (ambiente !== "producao" && ambiente !== "preProducao") return null;

  return { ambiente, autorizacao, certificado, nomeCliente };
}

export function scapEstaLigado(): boolean {
  return configSCAP() !== null;
}

// ─── Contrato (DTOs da especificação da AMA) ───────────────────────────

/** Tipo de documento de identificação aceite pelo `CitizenDocumentInfoDTO`. */
export type TipoDocumento = "BI" | "CC";

export interface SubAtributo {
  id: string;
  descricao: string;
  valor: string;
}

export interface AtributoCertificado {
  id: string;
  descricao: string;
  /** `validity` na especificação. É esta data que manda no prazo do selo. */
  validoAte: string | null;
  subAtributos: SubAtributo[];
}

export interface FornecedorAtributos {
  uriId: string;
  nome: string;
  tipo: string | null;
  nipc: string | null;
}

export type ResultadoSCAP<T> =
  | { estado: "ok"; dados: T }
  | { estado: "pendente" }
  | { estado: "indisponivel"; motivo: string }
  | { estado: "erro"; motivo: string };

// ─── Chamadas ──────────────────────────────────────────────────────────

const TIMEOUT_MS = 15_000;

async function chamar(
  cfg: ConfigSCAP,
  caminho: string,
  init: { method: "GET" | "POST"; corpo?: unknown }
): Promise<ResultadoSCAP<unknown>> {
  const url = `${SCAP_HOSTS[cfg.ambiente]}${caminho}`;
  const controlo = new AbortController();
  const relogio = setTimeout(() => controlo.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetch(url, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        FAAuthorization: cfg.autorizacao,
        "X-SSL-Cert": cfg.certificado,
      },
      body: init.corpo === undefined ? undefined : JSON.stringify(init.corpo),
      signal: controlo.signal,
      cache: "no-store",
    });

    if (resposta.status === 401 || resposta.status === 403) {
      return { estado: "indisponivel", motivo: "O SCAP recusou as credenciais desta aplicação." };
    }
    if (!resposta.ok) {
      return { estado: "erro", motivo: `O SCAP respondeu ${resposta.status}.` };
    }
    return { estado: "ok", dados: (await resposta.json()) as unknown };
  } catch (e) {
    const abortado = e instanceof Error && e.name === "AbortError";
    return {
      estado: "erro",
      motivo: abortado ? "O SCAP não respondeu a tempo." : "Não foi possível falar com o SCAP.",
    };
  } finally {
    clearTimeout(relogio);
  }
}

const MOTIVO_DESLIGADO =
  "A verificação automática pelo SCAP ainda não está ligada. Exige protocolo " +
  "com a AMA e certificação da integração.";

/**
 * Os fornecedores de atributos activos no SCAP.
 *
 * É daqui que sai o `uriId` da Ordem — e é por isto que a descoberta é
 * uma chamada e não uma constante. A lista das associações aderentes é
 * publicada pela AMA (art. 6.º, n.º 2 da Portaria n.º 73/2018) e muda sem
 * nos avisar.
 */
export async function listarFornecedores(
  processId: string
): Promise<ResultadoSCAP<FornecedorAtributos[]>> {
  const cfg = configSCAP();
  if (!cfg) return { estado: "indisponivel", motivo: MOTIVO_DESLIGADO };

  const r = await chamar(
    cfg,
    `/SCAPAttributeService/searchAttributeProviderInstitutionsRequest?processId=${encodeURIComponent(processId)}`,
    { method: "GET" }
  );
  if (r.estado !== "ok") return r as ResultadoSCAP<FornecedorAtributos[]>;

  const corpo = r.dados as { attributeProviders?: unknown };
  const lista = Array.isArray(corpo?.attributeProviders) ? corpo.attributeProviders : [];

  return {
    estado: "ok",
    dados: lista.flatMap((x): FornecedorAtributos[] => {
      const o = x as Record<string, unknown>;
      const uriId = typeof o.uriId === "string" ? o.uriId : null;
      const nome = typeof o.name === "string" ? o.name : null;
      if (!uriId || !nome) return [];
      return [{
        uriId,
        nome,
        tipo: typeof o.type === "string" ? o.type : null,
        nipc: typeof o.nipc === "string" ? o.nipc : null,
      }];
    }),
  };
}

/**
 * O fornecedor que é a Ordem, dentro da lista devolvida pelo SCAP.
 *
 * Compara pelo NIPC quando ele vem — é o identificador estável — e cai no
 * nome só como recurso. Devolve `null` quando não encontra, e não o
 * primeiro parecido: escolher o fornecedor errado é pedir à entidade
 * errada que confirme uma pessoa.
 */
export function encontrarOrdem(
  fornecedores: readonly FornecedorAtributos[],
  nipcDaOrdem: string | null
): FornecedorAtributos | null {
  if (nipcDaOrdem) {
    const porNipc = fornecedores.find((f) => f.nipc === nipcDaOrdem);
    if (porNipc) return porNipc;
  }
  const alvo = "contabilistas certificados";
  return (
    fornecedores.find((f) =>
      f.nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(alvo)
    ) ?? null
  );
}

export interface PedidoAtributos {
  processId: string;
  /** A credencial de Chave Móvel Digital que o cidadão autorizou. */
  credentialId: string;
  nome: string;
  documento: { tipo: TipoDocumento; numero: string; pais?: string };
  /** `uriId` do fornecedor — em regra o devolvido por `encontrarOrdem`. */
  fornecedorUriIds: string[];
}

/** Passo 1: abrir o pedido. Não devolve atributos — devolve aceitação. */
export async function pedirAtributos(p: PedidoAtributos): Promise<ResultadoSCAP<true>> {
  const cfg = configSCAP();
  if (!cfg) return { estado: "indisponivel", motivo: MOTIVO_DESLIGADO };
  if (p.fornecedorUriIds.length === 0) {
    return { estado: "erro", motivo: "Não foi indicado nenhum fornecedor de atributos." };
  }

  const r = await chamar(cfg, "/SCAPAttributeService/searchCitizenAttributesRequest", {
    method: "POST",
    corpo: {
      processId: p.processId,
      credentialId: p.credentialId,
      clientName: cfg.nomeCliente,
      citizenInfo: {
        name: p.nome,
        citizenDocumentInfo: {
          type: p.documento.tipo,
          country: p.documento.pais ?? "PT",
          id: p.documento.numero,
        },
      },
      // Só atributos profissionais. Não pedimos os empresariais nem os de
      // funcionário: não servem para nada aqui, e pedir dados que não se
      // usam é recolher dados a mais sobre uma pessoa.
      searchAllEnterpriseAttributes: false,
      searchAllEmployeeAttributes: false,
      attributeProviderUriIds: p.fornecedorUriIds,
    },
  });

  if (r.estado !== "ok") return r as ResultadoSCAP<true>;
  return { estado: "ok", dados: true };
}

/**
 * Passo 2: recolher a resposta.
 *
 * `pendente` não é um erro — é o estado normal enquanto a Ordem não
 * responde, e quem chama tem de saber esperar em vez de concluir que
 * falhou.
 */
export async function obterAtributos(
  processId: string
): Promise<ResultadoSCAP<AtributoCertificado[]>> {
  const cfg = configSCAP();
  if (!cfg) return { estado: "indisponivel", motivo: MOTIVO_DESLIGADO };

  const r = await chamar(cfg, "/SCAPAttributeService/getCitizenAttributesResponse", {
    method: "POST",
    corpo: { processId },
  });
  if (r.estado !== "ok") return r as ResultadoSCAP<AtributoCertificado[]>;

  const corpo = r.dados as { completed?: unknown; citizenAttributes?: unknown };
  if (corpo?.completed !== true) return { estado: "pendente" };

  const porFornecedor = Array.isArray(corpo.citizenAttributes) ? corpo.citizenAttributes : [];
  const atributos: AtributoCertificado[] = [];

  for (const bloco of porFornecedor) {
    const b = bloco as Record<string, unknown>;
    const lista = Array.isArray(b.attributes) ? b.attributes : [];
    for (const a of lista) {
      const o = a as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : null;
      const descricao = typeof o.description === "string" ? o.description : null;
      if (!id || !descricao) continue;

      const subs = Array.isArray(o.subAttributes) ? o.subAttributes : [];
      atributos.push({
        id,
        descricao,
        validoAte: typeof o.validity === "string" ? o.validity : null,
        subAtributos: subs.flatMap((s): SubAtributo[] => {
          const so = s as Record<string, unknown>;
          if (typeof so.id !== "string" || typeof so.value !== "string") return [];
          return [{
            id: so.id,
            descricao: typeof so.description === "string" ? so.description : so.id,
            valor: so.value,
          }];
        }),
      });
    }
  }

  return { estado: "ok", dados: atributos };
}

/**
 * O número de inscrição que vem dentro do atributo, quando vem.
 *
 * Procura-o nos sub-atributos por chave e, em último recurso, no texto da
 * descrição. Devolver `null` é um resultado legítimo e frequente: o
 * atributo pode certificar a qualidade de membro sem repetir o número, e
 * nesse caso o que ficou provado é a qualidade — não o número. Quem
 * chamar tem de decidir com isso e não preencher o resto de cabeça.
 */
export function numeroNoAtributo(a: AtributoCertificado): string | null {
  const chaves = ["numero", "n_membro", "nmembro", "cod_membro", "membro", "inscricao"];
  for (const s of a.subAtributos) {
    const chave = s.id.toLowerCase().replace(/[^a-z_]/g, "");
    if (chaves.some((c) => chave.includes(c))) {
      const d = s.valor.replace(/\D+/g, "").replace(/^0+/, "");
      if (d) return d;
    }
  }
  const noTexto = a.descricao.match(/\b(\d{1,7})\b/);
  return noTexto ? noTexto[1].replace(/^0+/, "") || null : null;
}

/** Para a página de estado: o que dizer sobre esta via, e onde ler mais. */
export const EXPLICACAO_SCAP = {
  titulo: "Verificação automática pela Ordem (SCAP)",
  fontes: [SCAP_OCC, SCAP_DOCS],
  requisitos: [
    "Protocolo com a Agência para a Modernização Administrativa (AMA).",
    "Relatório de conformidade com as guidelines, assinado digitalmente com LTV.",
    "Vídeo demonstrativo da solução e cinco documentos assinados em pré-produção.",
    "Certificação do código pela AMA ou por auditor eIDAS credenciado.",
  ],
  contacto: "eid@ama.pt",
} as const;
