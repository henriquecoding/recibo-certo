// ═══════════════════════════════════════════════════════════════════════
//  /investidores — casca de SERVIDOR.
//
//  A página é quase toda interativa (formulário de proposta, mini-simuladores
//  animados) e vive em `InvestidoresCliente.tsx`. O que fica aqui é só o
//  cálculo dos três exemplos, feito no servidor pelos motores verificados.
//
//  Porquê a separação: os montantes dos mini-simuladores estavam escritos à
//  mão dentro do componente-cliente e nenhum vinha do motor. Calculá-los no
//  cliente resolveria a exatidão mas arrastaria `fiscal.ts` e `fiscal-data.ts`
//  para o bundle desta rota; calculados aqui, o utilizador recebe os números
//  já feitos e o motor não viaja. É o mesmo padrão do Hero em `src/app/page.tsx`.
// ═══════════════════════════════════════════════════════════════════════

import { calcular } from "@/lib/fiscal";
import { calcularVencimento, compararCategorias } from "@/lib/fiscal-dependente";
import InvestidoresCliente, { type ValoresDemos } from "./InvestidoresCliente";

/** Entradas de exemplo dos três mini-simuladores. */
const DEMO_RECIBO_MENSAL = 2_500;
const DEMO_SALARIO_MENSAL = 1_800;
const DEMO_FATURACAO_ANUAL = 80_000;

function calcularValores(): ValoresDemos {
  const rv = calcular({
    bruto: DEMO_RECIBO_MENSAL,
    tipo: "art151",
    regiao: "continente",
    regimeIVA: "isento",
    baseSS: "servicos",
    dispensaRetencao: false,
    isencaoSSPrimeiroAno: false,
    acumulaEmprego: false,
  });

  const vc = calcularVencimento({ salarioBruto: DEMO_SALARIO_MENSAL, dependentes: 0 });

  const cmp = compararCategorias({ brutoAnual: DEMO_FATURACAO_ANUAL, dependentes: 0 });

  return {
    recibosVerdes: {
      bruto: DEMO_RECIBO_MENSAL,
      liquido: Math.round(rv.liquido),
      irs: Math.round(rv.retencaoIRS),
      ss: Math.round(rv.segSocial),
    },
    vencimento: {
      bruto: DEMO_SALARIO_MENSAL,
      liquido: Math.round(vc.liquido),
      irs: Math.round(vc.irsRetido),
      ss: Math.round(vc.ssTrabalhador),
    },
    empresa: {
      bruto: DEMO_FATURACAO_ANUAL,
      liquido: Math.round(cmp.empresa.liquido),
      irc: Math.round(cmp.empresa.irc),
      derrama: Math.round(cmp.empresa.derrama),
      dividendos: Math.round(cmp.empresa.dividendos),
    },
  };
}

export default function InvestidoresPage() {
  return <InvestidoresCliente valores={calcularValores()} />;
}
