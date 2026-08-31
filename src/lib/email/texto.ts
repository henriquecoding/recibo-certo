// ═══════════════════════════════════════════════════════════════════════
//  A VERSÃO EM TEXTO DOS EMAILS — RC-EMAIL-003
//  ---------------------------------------------------------------------
//  Os emails saíam só em HTML. Isso custa de duas maneiras, e nenhuma
//  delas se vê a partir de dentro:
//
//    · os filtros de spam penalizam mensagens sem alternativa em texto,
//      porque é o que quase todo o email em massa faz;
//    · há clientes e leitores de ecrã que mostram a parte de texto, e
//      quem os usa recebia uma mensagem vazia.
//
//  Escrever a versão em texto à mão em oito moldes seria oito sítios
//  para ela envelhecer. Deriva-se do HTML, que é a única forma de as
//  duas nunca se desencontrarem.
// ═══════════════════════════════════════════════════════════════════════

const ENTIDADES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
  "&nbsp;": " ", "&#10003;": "✓", "&euro;": "€", "&hellip;": "…",
};

/**
 * HTML de email → texto legível.
 *
 * Não é um conversor geral: assume o HTML que os nossos moldes produzem
 * (tabelas, parágrafos, um botão). O que interessa é que o resultado se
 * leia como uma mensagem, e que os links continuem clicáveis — daí o
 * `texto (url)` em vez de deixar cair o destino.
 */
export function htmlParaTexto(html: string): string {
  return html
    // O que não é conteúdo sai primeiro, senão o CSS aparece como texto.
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Um link vale pelo texto E pelo destino: num email de texto, o
    // destino é a única forma de lá chegar.
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, url, texto) => {
      const limpo = texto.replace(/<[^>]+>/g, "").trim();
      return limpo && !limpo.startsWith("http") ? `${limpo} (${url})` : url;
    })
    // As quebras estruturais tornam-se quebras de linha antes de as
    // etiquetas desaparecerem.
    .replace(/<\/(p|h1|h2|h3|div|tr|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/td>/gi, "  ")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTIDADES[e.toLowerCase()] ?? e)
    // Espaços a mais vindos da indentação do HTML.
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
