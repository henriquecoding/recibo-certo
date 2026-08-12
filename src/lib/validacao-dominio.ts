// ─────────────────────────────────────────────────────────────────────────
//  Validação de domínio dos dados persistidos (RC-P1-12).
//
//  O validador anterior aceitava um recibo desde que o `id` fosse string, a
//  `data` fosse string e o `valor` fosse finito — ou seja, aceitava
//  `{ data: "ontem", valor: -5, tipo: "qualquer" }`. Um registo assim
//  propagava-se a gráficos, guardiões e exportações sem nunca ser questionado.
//
//  Aqui a validação é explícita e fechada: datas ISO que existem mesmo,
//  montantes finitos e não negativos, enums fechados, NIF com dígito de
//  controlo. O que não passa vai para quarentena em vez de ser silenciosamente
//  descartado — assim é possível dizer à pessoa que há registos por recuperar.
//
//  Módulo isomórfico (cliente, servidor e testes).
// ─────────────────────────────────────────────────────────────────────────

/** NIF português: 9 dígitos com dígito de controlo módulo 11. */
export function nifValido(nif: string): boolean {
  const limpo = nif.replace(/\s/g, "");
  if (!/^\d{9}$/.test(limpo)) return false;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(limpo[i]) * (9 - i);
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === Number(limpo[8]);
}

/**
 * Telefone português: 9 dígitos começados por 2 (fixo) ou 9 (móvel).
 * Aceita prefixo internacional +351 e separadores.
 */
export function telefoneValido(tel: string): boolean {
  const limpo = tel.replace(/[\s.\-()]/g, "").replace(/^\+351/, "").replace(/^00351/, "");
  return /^[29]\d{8}$/.test(limpo);
}

/**
 * Data ISO `AAAA-MM-DD` que existe no calendário.
 *
 * `new Date("2026-02-30")` não rebenta — normaliza para 2 de março. Por isso
 * a verificação é por componentes: só assim `2026-02-30` é recusado.
 */
export function dataIsoValida(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const ano = Number(s.slice(0, 4));
  const mes = Number(s.slice(5, 7));
  const dia = Number(s.slice(8, 10));
  if (ano < 1900 || ano > 2200 || mes < 1 || mes > 12 || dia < 1) return false;
  return dia <= new Date(ano, mes, 0).getDate();
}

/** Timestamp ISO completo e parseável. */
export function timestampIsoValido(s: unknown): s is string {
  return typeof s === "string" && s.length >= 10 && !Number.isNaN(Date.parse(s));
}

/** Montante utilizável num cálculo: finito e não negativo. */
export function montanteValido(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/** Montante estritamente positivo — para valores que não fazem sentido a zero. */
export function montantePositivo(n: unknown): n is number {
  return montanteValido(n) && n > 0;
}

/** Inteiro não negativo dentro de um máximo. */
export function contagemValida(n: unknown, max = 1_000): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= max;
}

/** Pertence a um conjunto fechado de valores. */
export function pertence<T extends string>(v: unknown, valores: readonly T[]): v is T {
  return typeof v === "string" && (valores as readonly string[]).includes(v);
}

/** Identificador não vazio. */
export function idValido(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// ─── Quarentena ─────────────────────────────────────────────────────────

/**
 * O resultado de validar uma coleção: o que é utilizável e o que ficou de
 * fora. Descartar em silêncio faz a pessoa pensar que perdeu os dados; com a
 * quarentena é possível dizer quantos registos há por recuperar.
 */
export interface Triagem<T> {
  validos: T[];
  invalidos: { registo: unknown; motivo: string }[];
}

export function triar<T>(
  registos: unknown[],
  validar: (r: unknown) => { ok: true; valor: T } | { ok: false; motivo: string },
): Triagem<T> {
  const validos: T[] = [];
  const invalidos: { registo: unknown; motivo: string }[] = [];
  for (const r of registos) {
    const v = validar(r);
    if (v.ok) validos.push(v.valor);
    else invalidos.push({ registo: r, motivo: v.motivo });
  }
  return { validos, invalidos };
}
