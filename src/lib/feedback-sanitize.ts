// Segurança do feedback — funções PURAS (sem Supabase), partilhadas pela UI e
// pela camada de dados. Defesa em profundidade: a app nunca renderiza este texto
// como HTML (o React escapa e não usamos dangerouslySetInnerHTML), mas mesmo
// assim bloqueamos/limpamos código, HTML e scripts antes de gravar — e a BD
// repete a limpeza num trigger (migration 018).

// Padrões típicos de injeção: tags HTML, <script>, javascript:/vbscript:,
// handlers on*=, data:text/html, srcdoc, e templates {{...}} / <% ... %>.
// Nota: a 1.ª alternativa exige que o `<` seja seguido logo de letra/`!`/`/`
// (uma tag real). Assim, comparações matemáticas como "lucro < 1000 > custo"
// não são marcadas como código.
const PADRAO_PERIGOSO =
  /<\/?[a-z!][^>]*>|<\s*script|javascript:|vbscript:|on[a-z]+\s*=|data:text\/html|srcdoc\s*=|\{\{[\s\S]*\}\}|<%[\s\S]*%>/i;

/** True se o texto contém código, HTML ou scripts (a bloquear no envio). */
export function contemCodigo(texto: string): boolean {
  return PADRAO_PERIGOSO.test(texto);
}

/** Remove tags HTML, caracteres de controlo e invisíveis. Preserva tabs/quebras. */
export function sanitizarTexto(texto: string): string {
  const semTags = texto.replace(/<\/?[a-z!][^>]*>/gi, "");
  let limpo = "";
  for (const ch of semTags) {
    const c = ch.codePointAt(0) ?? 0;
    // controlo (exceto tab/quebra), DEL, largura-zero e BOM (ofuscação)
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) continue;
    if (c === 0x7f) continue;
    if (c === 0x200b || c === 0x200c || c === 0x200d || c === 0x2060 || c === 0xfeff) continue;
    limpo += ch;
  }
  return limpo.trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validação básica de email (vazio é aceite — campo opcional). */
export function emailValido(email?: string): boolean {
  if (!email || !email.trim()) return true;
  return EMAIL_RE.test(email.trim());
}
