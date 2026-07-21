// ─────────────────────────────────────────────────────────────────────────
//  Fonte única dos guias fiscais — consumida pelo índice /guias, pela secção
//  "Aprender" da homepage e pelos testes de consistência do ecossistema
//  (ecossistema.test.ts garante que GUIA_SLUGS do seo.ts espelha este array).
//  Dados puros (sem "use client"): descrevem guias reais; nada é inventado.
// ─────────────────────────────────────────────────────────────────────────

import {
  Bank, Receipt, Calculator, ShieldCheck, Coin, User, Briefcase, Globe, FileSign,
  Wallet, Calendar, Clock, Building, Scale, Flag,
} from "@/components/ui/Icons";
import type { Perfil } from "@/lib/perfil";

export type IconType = React.ComponentType<{ size?: number; className?: string }>;
export type Categoria = "Independentes" | "Conta de outrem" | "Empresas" | "Transversal";

export interface Guia {
  href: string;
  titulo: string;
  descricao: string;
  tempo: number;
  categoria: Categoria;
  icon: IconType;
}

export const GUIAS: Guia[] = [
  { href: "/guias/abrir-atividade", titulo: "Como abrir atividade nas Finanças", descricao: "Passo a passo para abrir atividade como trabalhador independente.", tempo: 5, categoria: "Independentes", icon: Bank },
  { href: "/guias/ato-isolado", titulo: "Ato isolado ou recibos verdes?", descricao: "Descobre quando usar ato isolado e quando emitir recibos verdes.", tempo: 4, categoria: "Independentes", icon: Scale },
  { href: "/guias/regime-simplificado", titulo: "Regime simplificado e coeficientes", descricao: "Entende os coeficientes e o que realmente pagas em IRS.", tempo: 6, categoria: "Independentes", icon: Calculator },
  { href: "/guias/despesas-dedutiveis", titulo: "Despesas dedutíveis e a regra dos 15%", descricao: "Que despesas contam no regime simplificado — e quanto tens de justificar.", tempo: 6, categoria: "Independentes", icon: Coin },
  { href: "/guias/contabilidade-organizada", titulo: "Simplificado vs. contabilidade organizada", descricao: "Quando compensa passar ao lucro real e o que muda.", tempo: 6, categoria: "Independentes", icon: Scale },
  { href: "/guias/retencao-na-fonte", titulo: "Retenção na fonte", descricao: "Saiba quando é aplicada e como funciona a retenção na fonte.", tempo: 4, categoria: "Independentes", icon: ShieldCheck },
  { href: "/guias/pagamentos-por-conta", titulo: "Pagamentos por conta do IRS", descricao: "Os adiantamentos de IRS da categoria B: prazos e cálculo.", tempo: 4, categoria: "Independentes", icon: Calculator },
  { href: "/guias/iva-recibos-verdes", titulo: "IVA nos recibos verdes", descricao: "A isenção de 15 000 € e quando deves liquidar IVA.", tempo: 5, categoria: "Independentes", icon: Coin },
  { href: "/guias/seguranca-social", titulo: "Segurança Social", descricao: "Como funcionam as contribuições, a fórmula e as isenções.", tempo: 5, categoria: "Independentes", icon: User },
  { href: "/guias/acumulacao-emprego", titulo: "Acumulação com emprego", descricao: "Tens emprego e passas recibos verdes? Sabe o que muda.", tempo: 4, categoria: "Independentes", icon: Briefcase },
  { href: "/guias/clientes-estrangeiros", titulo: "Clientes estrangeiros", descricao: "IVA e retenção quando faturas para fora de Portugal.", tempo: 5, categoria: "Independentes", icon: Globe },
  { href: "/guias/cessar-atividade", titulo: "Cessar atividade", descricao: "Como fechar atividade e o que acontece se não fechares.", tempo: 3, categoria: "Independentes", icon: FileSign },
  { href: "/guias/fatura-vs-recibo", titulo: "Fatura, recibo e fatura-recibo", descricao: "As diferenças e onde entram os recibos verdes.", tempo: 4, categoria: "Independentes", icon: Receipt },
  { href: "/guias/merchant-of-record", titulo: "Merchant of Record (MoR)", descricao: "Paddle, Lemon Squeezy e como emitir 1 recibo por mês.", tempo: 6, categoria: "Independentes", icon: Wallet },
  { href: "/guias/recibo-vencimento", titulo: "Como ler o recibo de vencimento", descricao: "Bruto, Segurança Social, IRS e líquido explicados linha a linha.", tempo: 5, categoria: "Conta de outrem", icon: Receipt },
  { href: "/guias/subsidios-ferias-natal", titulo: "Subsídio de férias e de Natal", descricao: "Cálculo, descontos e o que muda com os duodécimos.", tempo: 5, categoria: "Conta de outrem", icon: Calendar },
  { href: "/guias/trabalho-suplementar", titulo: "Trabalho suplementar (horas extra)", descricao: "Acréscimos, retenção autónoma e limites legais.", tempo: 5, categoria: "Conta de outrem", icon: Clock },
  { href: "/guias/abrir-empresa", titulo: "Como abrir uma empresa", descricao: "Formas jurídicas, Empresa na Hora e custos reais.", tempo: 7, categoria: "Empresas", icon: Building },
  { href: "/guias/unipessoal-vs-eni", titulo: "Empresa (unipessoal) vs. recibos verdes", descricao: "IRC ou IRS, responsabilidade e custos — qual a estrutura certa.", tempo: 7, categoria: "Empresas", icon: Building },
  { href: "/guias/irc", titulo: "IRC para PME", descricao: "Taxas, derrama e pagamentos por conta sem complicação.", tempo: 7, categoria: "Empresas", icon: Calculator },
  { href: "/guias/tributacao-autonoma", titulo: "Tributação autónoma", descricao: "Viaturas, despesas de representação e agravamento.", tempo: 7, categoria: "Empresas", icon: Scale },
  { href: "/guias/calendario-fiscal", titulo: "Calendário fiscal 2026", descricao: "Todos os prazos de IRS, IVA, Segurança Social e IRC num só sítio.", tempo: 5, categoria: "Transversal", icon: Calendar },
  { href: "/guias/escaloes-irs", titulo: "Escalões de IRS 2026", descricao: "A tabela e os mitos sobre subir de escalão.", tempo: 5, categoria: "Transversal", icon: Calculator },
  { href: "/guias/irs-jovem", titulo: "IRS Jovem 2026", descricao: "Isenção por ano, condições e como pedir.", tempo: 4, categoria: "Transversal", icon: Flag },
  { href: "/guias/ifici-nhr", titulo: "IFICI (NHR 2.0): taxa de 20%", descricao: "O sucessor do Residente Não Habitual — condições e duração.", tempo: 5, categoria: "Transversal", icon: Flag },
  { href: "/guias/deducoes-coleta", titulo: "Deduções à coleta", descricao: "Saúde, educação e despesas gerais no teu IRS.", tempo: 5, categoria: "Transversal", icon: Calculator },
  { href: "/guias/mais-valias", titulo: "Mais-valias: ações, cripto e imóveis", descricao: "Taxas, isenções e englobamento na categoria G.", tempo: 6, categoria: "Transversal", icon: Coin },
  { href: "/guias/tributacao-conjunta", titulo: "Tributação conjunta vs. separada", descricao: "O quociente conjugal e quando cada opção compensa.", tempo: 5, categoria: "Transversal", icon: User },
  { href: "/guias/reembolso-irs", titulo: "Reembolso de IRS: prazos e como acelerar", descricao: "Quando recebes e o que evita atrasos no reembolso.", tempo: 4, categoria: "Transversal", icon: Wallet },
];

/** Slug de um guia a partir do href ("/guias/abrir-atividade" → "abrir-atividade"). */
export const guiaSlug = (g: Guia): string => g.href.replace("/guias/", "");

/** Categoria de guias mais afim a cada perfil do seletor da homepage. */
export const CATEGORIA_POR_PERFIL: Record<Perfil, Categoria> = {
  independente: "Independentes",
  dependente: "Conta de outrem",
  empresa: "Empresas",
  comparar: "Transversal",
};

/** Curadoria explícita: os 4 guias em destaque na homepage por perfil.
    Validado em ecossistema.test.ts (todos os slugs têm de existir em GUIAS). */
export const GUIAS_DESTAQUE_POR_PERFIL: Record<Perfil, string[]> = {
  independente: ["abrir-atividade", "regime-simplificado", "iva-recibos-verdes", "seguranca-social"],
  dependente: ["recibo-vencimento", "subsidios-ferias-natal", "trabalho-suplementar", "irs-jovem"],
  empresa: ["abrir-empresa", "unipessoal-vs-eni", "irc", "tributacao-autonoma"],
  comparar: ["unipessoal-vs-eni", "acumulacao-emprego", "escaloes-irs", "calendario-fiscal"],
};

/** Os guias em destaque de um perfil, já resolvidos e na ordem curada. */
export function guiasPorPerfil(perfil: Perfil): Guia[] {
  return GUIAS_DESTAQUE_POR_PERFIL[perfil]
    .map((slug) => GUIAS.find((g) => guiaSlug(g) === slug))
    .filter((g): g is Guia => Boolean(g));
}
