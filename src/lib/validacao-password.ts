export type TipoErroPassword = "comprimento" | "maiuscula" | "numero";

export interface ErroPassword {
  tipo: TipoErroPassword;
  mensagem: string;
}

export function validarPassword(pw: string): ErroPassword[] {
  const erros: ErroPassword[] = [];
  if (pw.length < 8)       erros.push({ tipo: "comprimento", mensagem: "A password tem de ter pelo menos 8 caracteres." });
  if (!/[A-Z]/.test(pw))   erros.push({ tipo: "maiuscula",   mensagem: "A password tem de conter pelo menos uma letra maiúscula." });
  if (!/\d/.test(pw))      erros.push({ tipo: "numero",      mensagem: "A password tem de conter pelo menos um número." });
  return erros;
}
