export const APP_VERSION = "1.3.1";
export const VERSAO_STORAGE_KEY = "recibocerto:changelog_visto";

export interface EntradaChangelog {
  version: string;
  data: string;
  titulo: string;
  itens: string[];
}

export const CHANGELOG: EntradaChangelog[] = [
  {
    version: "1.3.1",
    data: "2026-06-21",
    titulo: "Simulador de empresa — otimização fiscal e comparação RV",
    itens: [
      "Passo 4 (Otimização fiscal): Tributação Autónoma de viaturas (elétrica/PHEV/combustão) e despesas de representação, com agravamento para empresas em prejuízo.",
      "Passo 4 (RFAI): Benefício ao investimento por região (interior 30%, litoral 10%), deduzido à coleta de IRC com limite de 50%.",
      "Passo 5 (Resultado): Mapa comparativo RV vs Empresa — cards com preços, bullet points, veredicto e ponto de viragem calculado.",
      "Slider interativo de faturação (0–200k€) com presets e cálculo ao vivo de ambos os cenários.",
      "RV simplificado para comparação: regime simplificado (coef. 0,75 serviços) e SS 21,4% sobre rendimento relevante.",
      "TA e RFAI integrados na cascata de resultados e no painel lateral ao vivo.",
    ],
  },
  {
    version: "1.3.0",
    data: "2026-06-21",
    titulo: "Simulador de empresa (Lda) — modo guiado",
    itens: [
      "Novo modo guiado para empresa: passo a passo para simular e abrir uma sociedade (Unipessoal ou por Quotas).",
      "Cálculo com IRC PME 2026 (15% até 50.000€ + 19%), derrama municipal, dividendos (28% liberatória ou englobamento 50%) e Segurança Social do gerente.",
      "Dica automática de otimização: indica quando o englobamento de dividendos compensa face à taxa liberatória.",
      "Calendário de obrigações fiscais da empresa e guia passo a passo de constituição (Empresa na Hora, capital, contabilidade).",
      "Página dedicada em /ferramentas/simulador-empresa e alternador Guiado/Completo no simulador.",
      "Calendário Fiscal do Ano redesenhado com grelha responsiva, progresso do ano e resumo por trimestre.",
    ],
  },
  {
    version: "1.2.0",
    data: "2026-06-16",
    titulo: "Quiz Fiscal — Configurações e Menu",
    itens: [
      "Ícones de menu e configurações aumentados para melhor visibilidade.",
      "Menu lateral com estatísticas em tempo real (acertos, erros, sequência, pontos).",
      "Barra de progresso e navegação por categorias no menu lateral.",
      "Painel de configurações com dificuldade, tempo por pergunta, perguntas por sessão e 5 preferências configuráveis.",
      "Configurações do quiz persistidas localmente entre sessões.",
      "Registo e autenticação via Google e LinkedIn disponíveis.",
    ],
  },
  {
    version: "1.1.7",
    data: "2026-06-14",
    titulo: "Simulação de IRS Jovem e Correções",
    itens: [
      "Adicionada simulação de IRS Jovem no cálculo anual de IRS.",
      "Suporte a anos de benefício com isenção de 100%, 75%, 50% e 25%.",
      "Suporte à simulação conjunta com IRS Jovem separado para titular e parceiro.",
      "Cálculo ajustado com rendimentos isentos englobados para determinação da taxa.",
      "Corrigido o bug que impedia a gravação de novos dados no Histórico Salarial.",
      "Melhorada a atualização do Histórico Salarial após guardar novos recibos.",
      "Melhorias gerais de desempenho e carregamento da aplicação.",
    ],
  },
  {
    version: "1.1.6",
    data: "2026-06-02",
    titulo: "Integração Calculadora e Pontos",
    itens: [
      "Sistema de pontos XP integrado no Quiz Fiscal.",
      "Persistência de progresso do quiz na nuvem quando autenticado.",
      "Melhorias na calculadora de recibos verdes.",
    ],
  },
];
