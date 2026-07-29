// ═══════════════════════════════════════════════════════════════════════
//  Bandeira pública da integração FIZ, isolada num módulo próprio.
//
//  Os componentes-cliente importam DAQUI e nunca de `config.ts`: assim não
//  arrastam para o bundle o módulo que lê segredos do servidor. (Variáveis
//  sem prefixo NEXT_PUBLIC_ nunca chegariam ao browser, mas manter a
//  separação torna a fronteira óbvia em vez de implícita.)
//
//  Regra de ativação, por ordem:
//    1. NEXT_PUBLIC_FIZ_ENABLED="false" → desligada, sem exceções.
//    2. NEXT_PUBLIC_FIZ_ENABLED="true"  → ligada, onde quer que seja.
//    3. Sem decisão explícita → LIGADA.
//
//  ⚠️ A regra 3 já foi o contrário: «ligada em deploys de ramo, DESLIGADA em
//  produção». Fazia sentido enquanto a parceria estava em negociação — não se
//  liga em produção o que ainda não está assinado. Deixou de fazer no dia em
//  que passou a haver um contrato de afiliado e um link pessoal.
//
//  O efeito da regra antiga era mau e silencioso: fazia-se deploy e não
//  aparecia nada, porque `NEXT_PUBLIC_FIZ_ENABLED` é inlined NO BUILD e
//  ninguém a tinha definido. Ficava tudo desligado sem um único erro.
//
//  Nota que continua a valer: sendo `NEXT_PUBLIC_`, esta variável é lida no
//  momento do build. Defini-la só no runtime não tem efeito nenhum no
//  browser.
// ═══════════════════════════════════════════════════════════════════════

/** "production" | "preview" | "development" — definido pela Vercel. */
export function ambienteDeploy(): string {
  return process.env.NEXT_PUBLIC_VERCEL_ENV ?? "";
}

/**
 * Estamos em produção?
 *
 * Não basta olhar para `NEXT_PUBLIC_VERCEL_ENV`: essa variável só existe na
 * Vercel. Num servidor próprio, num contentor ou em qualquer outro alojamento
 * ela vem vazia — e a versão anterior concluía daí "não é produção", abrindo
 * a porta a servir o catálogo SIMULADO a utilizadores reais, com um aviso de
 * "pré-visualização" que não corresponderia a nada.
 *
 * Quando a variável da Vercel EXISTE, é ela que manda — e só ela: num deploy
 * de ramo `NODE_ENV` também é "production" (é uma build de produção), pelo que
 * juntar as duas condições com "ou" desligaria a pré-visualização
 * precisamente onde ela serve. O `NODE_ENV` é o recurso para quando não há
 * sinal nenhum da Vercel.
 */
export function ehProducao(): boolean {
  const vercel = ambienteDeploy();
  if (vercel) return vercel === "production";
  return process.env.NODE_ENV === "production";
}

/** Deploy de ramo na Vercel — o sítio certo para rever antes de decidir. */
export function ehPreVisualizacaoDeploy(): boolean {
  return ambienteDeploy() === "preview";
}

export function fizAtiva(): boolean {
  const bandeira = process.env.NEXT_PUBLIC_FIZ_ENABLED;
  if (bandeira === "false") return false;
  if (bandeira === "true") return true;
  return true;
}

/**
 * Modo de pré-visualização: catálogo local, sem rede, nada executado.
 *
 * Liga-se sozinho quando a integração está ativa mas ainda não há
 * credenciais — que é exatamente o estado atual da parceria. Desliga-se
 * sozinho assim que houver credenciais reais.
 *
 * Em produção só liga se for pedido explicitamente, para que um erro de
 * configuração nunca mostre um catálogo simulado a utilizadores reais.
 */
export function previewPermitidoNoCliente(): boolean {
  const explicito = process.env.NEXT_PUBLIC_FIZ_PREVIEW;
  if (explicito === "false") return false;
  if (explicito === "true") return true;
  return !ehProducao();
}
