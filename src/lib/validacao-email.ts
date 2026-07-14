// Validação e normalização de email — partilhada entre rotas de API e cliente.

/** Valida o formato básico de um email (comprimento + estrutura). */
export function emailValido(email: unknown): email is string {
  if (typeof email !== "string") return false;
  const e = email.trim();
  if (e.length < 3 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** Normaliza um email para armazenamento/envio (trim + minúsculas). */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}
