import { fonte, type QuizPergunta } from "./types";

export const PERGUNTAS_REGIME: QuizPergunta[] = [
  // ── rs-8 a rs-20: Coeficientes — cenários práticos ──────────────────
  {
    id: "rs-8",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Um advogado (profissão liberal do Art. 151.º CIRS) fatura 40.000 € brutos anuais no regime simplificado. Qual o rendimento tributável?",
    opcoes: [
      {
        texto: "40.000 €",
        porque:
          "Seria 100% — isso corresponderia ao coeficiente de transparência fiscal (1,00), não ao de profissões liberais.",
      },
      {
        texto: "30.000 €",
        porque:
          "O coeficiente para profissões do Art. 151.º é 0,75: 40.000 × 0,75 = 30.000 €. Correto.",
      },
      {
        texto: "14.000 €",
        porque:
          "Seria 40.000 × 0,35 — o coeficiente 0,35 aplica-se a 'outras prestações de serviços', não a profissões do Art. 151.º.",
      },
      {
        texto: "6.000 €",
        porque:
          "Seria 40.000 × 0,15 — o coeficiente 0,15 aplica-se a vendas de bens e restauração, não a serviços profissionais.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. b) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-9",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Uma gestora de redes sociais (atividade fora do Art. 151.º) fatura 20.000 € anuais. Quanto é tributado no regime simplificado?",
    opcoes: [
      {
        texto: "15.000 €",
        porque:
          "Seria o coeficiente 0,75, que se aplica a profissões do Art. 151.º — a gestão de redes sociais não consta nessa tabela.",
      },
      {
        texto: "3.000 €",
        porque:
          "Seria 20.000 × 0,15, o coeficiente para vendas/restauração — não se aplica a prestações de serviços.",
      },
      {
        texto: "7.000 €",
        porque:
          "Atividades de serviços fora do Art. 151.º têm coeficiente 0,35: 20.000 × 0,35 = 7.000 €. Correto.",
      },
      {
        texto: "19.000 €",
        porque:
          "Seria 20.000 × 0,95, o coeficiente de propriedade intelectual — não se aplica a serviços de gestão de redes sociais.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 1, al. c) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-10",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Um comerciante que vende artesanato (venda de bens) fatura 50.000 € brutos. Qual o rendimento tributável no regime simplificado?",
    opcoes: [
      {
        texto: "7.500 €",
        porque:
          "O coeficiente para vendas de bens é 0,15: 50.000 × 0,15 = 7.500 €. Correto.",
      },
      {
        texto: "17.500 €",
        porque:
          "Seria 50.000 × 0,35 — o coeficiente para outros serviços, não para vendas de bens.",
      },
      {
        texto: "37.500 €",
        porque:
          "Seria 50.000 × 0,75 — o coeficiente de profissões liberais, não de vendas.",
      },
      {
        texto: "47.500 €",
        porque:
          "Seria 50.000 × 0,95 — o coeficiente de propriedade intelectual, não de vendas.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 31.º, n.º 1, al. a) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-11",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Um músico recebe 10.000 € de royalties pela cedência de direitos de autor sobre as suas composições. Qual o coeficiente aplicável?",
    opcoes: [
      {
        texto: "0,75",
        porque:
          "0,75 aplica-se a serviços do Art. 151.º — os direitos de autor/propriedade intelectual têm coeficiente próprio.",
      },
      {
        texto: "0,35",
        porque:
          "0,35 é para outras prestações de serviços — rendimentos de propriedade intelectual não são 'prestações de serviços'.",
      },
      {
        texto: "0,15",
        porque:
          "0,15 é para vendas de bens e restauração — não se aplica a rendimentos de propriedade intelectual.",
      },
      {
        texto: "0,95",
        porque:
          "Os rendimentos de propriedade intelectual (direitos de autor) têm coeficiente 0,95, o mais alto do regime simplificado.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 31.º, n.º 1, al. d) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-12",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "No regime simplificado, o coeficiente de 0,15 aplica-se a que tipo de rendimentos?",
    opcoes: [
      {
        texto: "Profissões liberais do Art. 151.º CIRS",
        porque:
          "As profissões do Art. 151.º têm coeficiente 0,75, não 0,15.",
      },
      {
        texto: "Vendas de mercadorias, restauração e hotelaria",
        porque:
          "O coeficiente 0,15 destina-se a vendas de bens, restauração e alojamento (quando em estabelecimento). Correto.",
      },
      {
        texto: "Propriedade intelectual e direitos de autor",
        porque:
          "A propriedade intelectual tem coeficiente 0,95, não 0,15.",
      },
      {
        texto: "Subsídios não destinados à exploração",
        porque:
          "Esses subsídios têm coeficiente 0,30, não 0,15.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. a) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-13",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um restaurante em nome individual fatura 120.000 € anuais. Qual o rendimento tributável no regime simplificado?",
    opcoes: [
      {
        texto: "42.000 €",
        porque:
          "Seria 120.000 × 0,35 — esse coeficiente é para outras prestações de serviços, não restauração.",
      },
      {
        texto: "18.000 €",
        porque:
          "Restauração aplica o coeficiente 0,15: 120.000 × 0,15 = 18.000 €. Correto.",
      },
      {
        texto: "90.000 €",
        porque:
          "Seria 120.000 × 0,75 — o coeficiente de profissões liberais, não de restauração.",
      },
      {
        texto: "120.000 €",
        porque:
          "Tributar 100% é o coeficiente de transparência fiscal (1,00) — restauração tem coeficiente 0,15.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. a) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-14",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um engenheiro informático (código 1320 do Art. 151.º) e uma programadora freelancer (código residual, fora do Art. 151.º) faturam ambos 30.000 €. Qual a diferença de rendimento tributável entre os dois?",
    opcoes: [
      {
        texto: "Nenhuma — ambos pagam o mesmo",
        porque:
          "O engenheiro tem coeficiente 0,75 e a programadora fora do Art. 151.º tem 0,35 — logo há diferença.",
      },
      {
        texto: "O engenheiro é tributado em mais 12.000 €",
        porque:
          "Engenheiro: 30.000 × 0,75 = 22.500 €. Programadora: 30.000 × 0,35 = 10.500 €. Diferença: 12.000 €. Correto.",
      },
      {
        texto: "O engenheiro é tributado em menos 12.000 €",
        porque:
          "É o contrário: o coeficiente 0,75 é mais desfavorável (mais rendimento tributável) do que 0,35.",
      },
      {
        texto: "A diferença é de 6.000 €",
        porque:
          "A diferença real é 22.500 − 10.500 = 12.000 €, não 6.000 €.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. b) e c) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-15",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "O que significa o coeficiente 0,75 no regime simplificado?",
    opcoes: [
      {
        texto: "Paga-se 75% de imposto sobre o rendimento bruto",
        porque:
          "O coeficiente não é a taxa de imposto — é a percentagem do rendimento bruto considerada como tributável, à qual se aplicam depois os escalões de IRS.",
      },
      {
        texto: "75% do rendimento bruto é considerado tributável; os restantes 25% são presumidos como despesas",
        porque:
          "O coeficiente 0,75 significa que a AT assume que 25% são despesas e tributa 75%. Correto.",
      },
      {
        texto: "Recebe-se apenas 75% do valor faturado",
        porque:
          "O coeficiente não afeta o que se recebe — afeta o que é tributável para efeitos de IRS.",
      },
      {
        texto: "75% do rendimento está isento de imposto",
        porque:
          "É o contrário: 75% é tributado (não isento). Apenas 25% é presumido como despesas.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-16",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "No regime simplificado, qual o coeficiente que resulta em menor tributação para o contribuinte?",
    opcoes: [
      {
        texto: "0,95 — propriedade intelectual",
        porque:
          "0,95 é o mais alto — tributa 95% do rendimento. É o mais desfavorável.",
      },
      {
        texto: "0,75 — profissões do Art. 151.º",
        porque:
          "0,75 tributa 75% do rendimento — existem coeficientes mais baixos.",
      },
      {
        texto: "0,35 — outros serviços",
        porque:
          "0,35 tributa 35% — mas 0,15 tributa ainda menos.",
      },
      {
        texto: "0,15 — vendas de bens e restauração",
        porque:
          "Com coeficiente 0,15, apenas 15% do rendimento é tributável — é o mais favorável para o contribuinte. Correto.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 31.º, n.º 1, al. a) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-17",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um arquiteto (Art. 151.º) fatura 60.000 € e tem despesas reais de 20.000 €. No regime simplificado, qual o rendimento tributável?",
    opcoes: [
      {
        texto: "40.000 € (60.000 − 20.000)",
        porque:
          "No regime simplificado não se deduzem despesas reais — aplica-se o coeficiente, independentemente das despesas efetivas.",
      },
      {
        texto: "45.000 € (60.000 × 0,75)",
        porque:
          "No regime simplificado, o rendimento tributável é sempre rendimento bruto × coeficiente. Para o Art. 151.º: 60.000 × 0,75 = 45.000 €. Correto.",
      },
      {
        texto: "21.000 € (60.000 × 0,35)",
        porque:
          "0,35 seria para serviços fora do Art. 151.º — um arquiteto consta na tabela, logo o coeficiente é 0,75.",
      },
      {
        texto: "20.000 € (as despesas reais)",
        porque:
          "No regime simplificado não se usam despesas reais — essas só contam na contabilidade organizada.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. b) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-18",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Uma tradutora freelancer (atividade fora do Art. 151.º) fatura 25.000 €. No regime simplificado, quanto é considerado como 'despesas presumidas'?",
    opcoes: [
      {
        texto: "6.250 € (25%)",
        porque:
          "25% seria a dedução presumida para coeficiente 0,75 — mas a tradutora fora do Art. 151.º tem coeficiente 0,35.",
      },
      {
        texto: "16.250 € (65%)",
        porque:
          "Com coeficiente 0,35, a AT presume que 65% do rendimento bruto são despesas: 25.000 × 0,65 = 16.250 €. Correto.",
      },
      {
        texto: "3.750 € (15%)",
        porque:
          "15% de despesas presumidas corresponderia ao coeficiente 0,85, que não existe no regime simplificado.",
      },
      {
        texto: "21.250 € (85%)",
        porque:
          "85% de despesas presumidas corresponderia ao coeficiente 0,15 (vendas) — não se aplica a prestação de serviços.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. c) CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-19",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Um contabilista certificado (profissão do Art. 151.º, código 1310) fatura 35.000 €. No regime simplificado, qual é a parcela considerada 'não tributável'?",
    opcoes: [
      {
        texto: "8.750 €",
        porque:
          "Para profissões do Art. 151.º, o coeficiente é 0,75, logo 25% é presumido como despesas: 35.000 × 0,25 = 8.750 €. Correto.",
      },
      {
        texto: "22.750 €",
        porque:
          "Seria 65% do rendimento (coeficiente 0,35) — mas contabilistas estão no Art. 151.º, com coeficiente 0,75.",
      },
      {
        texto: "26.250 €",
        porque:
          "Seria 75% do rendimento — mas 75% é a parte tributável, não a parte isenta.",
      },
      {
        texto: "1.750 €",
        porque:
          "Seria apenas 5% do rendimento (coeficiente 0,95) — aplica-se a propriedade intelectual, não a contabilistas.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 31.º, n.º 1, al. b) CIRS · Art. 151.º CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-20",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um inventor recebe 80.000 € de royalties de propriedade industrial (patente). Qual o rendimento tributável no regime simplificado?",
    opcoes: [
      {
        texto: "60.000 €",
        porque:
          "Seria 80.000 × 0,75 — o coeficiente de profissões do Art. 151.º, não de propriedade industrial.",
      },
      {
        texto: "28.000 €",
        porque:
          "Seria 80.000 × 0,35 — o coeficiente de outros serviços, não de propriedade intelectual/industrial.",
      },
      {
        texto: "76.000 €",
        porque:
          "Rendimentos de propriedade intelectual/industrial têm coeficiente 0,95: 80.000 × 0,95 = 76.000 €. Correto.",
      },
      {
        texto: "80.000 €",
        porque:
          "Tributar 100% seria o coeficiente de transparência fiscal (1,00) — a propriedade industrial tem 0,95.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 1, al. d) CIRS",
    fonte: fonte("art31"),
  },
  // ── rs-21 a rs-30: Regra dos 15% ────────────────────────────────────
  {
    id: "rs-21",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "A regra dos 15% aplica-se a quais coeficientes do regime simplificado?",
    opcoes: [
      {
        texto: "A todos os coeficientes (0,15 a 1,00)",
        porque:
          "A regra dos 15% NÃO se aplica a todos — exclui 0,15 (vendas), 0,95 (prop. intelectual) e 1,00 (transparência).",
      },
      {
        texto: "Apenas ao coeficiente 0,75 (Art. 151.º)",
        porque:
          "Aplica-se ao 0,75 mas também ao 0,35 — não é exclusivo do Art. 151.º.",
      },
      {
        texto: "Apenas aos coeficientes 0,75 e 0,35",
        porque:
          "A regra dos 15% aplica-se exclusivamente aos coeficientes 0,75 (profissões do Art. 151.º) e 0,35 (outros serviços). Correto.",
      },
      {
        texto: "Apenas ao coeficiente 0,35 (outros serviços)",
        porque:
          "Aplica-se ao 0,35 mas também ao 0,75 — não é exclusivo de outros serviços.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 1 e n.º 2 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-22",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um médico (Art. 151.º) fatura 40.000 € e tem apenas 3.000 € em despesas validadas no e-fatura. O que acontece com a regra dos 15%?",
    opcoes: [
      {
        texto: "Nada — a regra dos 15% não afeta profissões do Art. 151.º",
        porque:
          "A regra dos 15% aplica-se ao coeficiente 0,75 (Art. 151.º). Os 15% de 40.000 = 6.000 €; faltam 3.000 € justificados.",
      },
      {
        texto: "Os 3.000 € não justificados (6.000 − 3.000) são acrescidos ao rendimento tributável",
        porque:
          "15% de 40.000 = 6.000 € a justificar. Só tem 3.000 €, logo os 3.000 € em falta são adicionados ao rendimento tributável. Correto.",
      },
      {
        texto: "O coeficiente sobe automaticamente para 1,00",
        porque:
          "A regra dos 15% não altera o coeficiente — acrescenta a diferença não justificada ao rendimento tributável.",
      },
      {
        texto: "É obrigado a mudar para contabilidade organizada",
        porque:
          "Não justificar os 15% não obriga a mudar de regime — apenas aumenta o rendimento tributável nesse ano.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 2 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-23",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um consultor (fora do Art. 151.º, coef. 0,35) fatura 50.000 € e justifica 5.000 € em despesas no e-fatura. Qual o rendimento tributável final?",
    opcoes: [
      {
        texto: "17.500 €",
        porque:
          "Seria 50.000 × 0,35 sem considerar a regra dos 15%. Mas: 15% de 50.000 = 7.500 €; faltam 2.500 €, que são acrescidos.",
      },
      {
        texto: "20.000 €",
        porque:
          "Base: 50.000 × 0,35 = 17.500 €. Regra 15%: 50.000 × 0,15 = 7.500 € a justificar; justificou 5.000 €; faltam 2.500 €. Total: 17.500 + 2.500 = 20.000 €. Correto.",
      },
      {
        texto: "22.500 €",
        porque:
          "Seria 50.000 × 0,35 + 5.000 € — mas a penalização é pela parte NÃO justificada, não pelo total de despesas.",
      },
      {
        texto: "25.000 €",
        porque:
          "Seria 50.000 × 0,50 — não existe coeficiente de 0,50 para serviços gerais.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 2 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-24",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Qual o montante mínimo de despesas que um advogado (Art. 151.º) com 60.000 € de faturação deve justificar no e-fatura para evitar a penalização da regra dos 15%?",
    opcoes: [
      {
        texto: "4.500 €",
        porque:
          "Seria 60.000 × 0,075, sem base legal — não existe esta percentagem.",
      },
      {
        texto: "15.000 €",
        porque:
          "Seria 60.000 × 0,25 — a regra dos 15% exige justificar 15% do bruto, não 25%.",
      },
      {
        texto: "9.000 €",
        porque:
          "15% de 60.000 = 9.000 €. Este é o valor mínimo de despesas a justificar no e-fatura. Correto.",
      },
      {
        texto: "6.000 €",
        porque:
          "Seria 60.000 × 0,10 — a percentagem correta é 15%, não 10%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 2 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-25",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Uma designer (Art. 151.º) fatura 80.000 € e justifica 12.000 € em despesas (rendas, material, etc.) no e-fatura. Qual o acréscimo da regra dos 15%?",
    opcoes: [
      {
        texto: "12.000 €",
        porque:
          "O acréscimo não é o total de despesas — é a diferença entre os 15% do bruto e o que foi justificado.",
      },
      {
        texto: "0 € — não há acréscimo",
        porque:
          "15% de 80.000 = 12.000 €. A designer justificou exatamente 12.000 €. Não há diferença a acrescer. Correto.",
      },
      {
        texto: "8.000 €",
        porque:
          "15% de 80.000 é 12.000 €, não 20.000 € — logo a diferença não é 8.000 €.",
      },
      {
        texto: "2.000 €",
        porque:
          "Não sobram 2.000 € por justificar — as despesas cobrem exatamente o limiar de 15%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 2 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-26",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "A regra dos 15% aplica-se a um comerciante com coeficiente 0,15 (vendas)?",
    opcoes: [
      {
        texto: "Sim — aplica-se a todos os coeficientes",
        porque:
          "A regra dos 15% aplica-se apenas aos coeficientes 0,75 e 0,35, não ao 0,15.",
      },
      {
        texto: "Não — a regra dos 15% aplica-se apenas aos coeficientes 0,75 e 0,35",
        porque:
          "A regra dos 15% está prevista apenas para rendimentos sujeitos aos coeficientes 0,75 e 0,35, excluindo vendas (0,15). Correto.",
      },
      {
        texto: "Sim, mas só se faturar mais de 100.000 €",
        porque:
          "Não existe essa condição — a regra simplesmente não se aplica ao coeficiente 0,15.",
      },
      {
        texto: "Aplica-se, mas com 10% em vez de 15%",
        porque:
          "Não existe variante de 10% da regra — ela simplesmente não se aplica a vendas.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 2 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-27",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um psicólogo (Art. 151.º) fatura 100.000 € e justifica 10.000 € em despesas. Qual o rendimento tributável total?",
    opcoes: [
      {
        texto: "75.000 €",
        porque:
          "Seria 100.000 × 0,75 sem regra dos 15%. Falta calcular: 15% de 100.000 = 15.000 €; justificou 10.000 €; faltam 5.000 €.",
      },
      {
        texto: "80.000 €",
        porque:
          "Base: 100.000 × 0,75 = 75.000 €. 15% do bruto = 15.000 €; justificou 10.000 €; diferença = 5.000 €. Total: 75.000 + 5.000 = 80.000 €. Correto.",
      },
      {
        texto: "85.000 €",
        porque:
          "A penalização é de 5.000 € (15.000 − 10.000), não de 10.000 €. Logo é 75.000 + 5.000 = 80.000 €.",
      },
      {
        texto: "90.000 €",
        porque:
          "A penalização seria 15.000 € — mas 10.000 € já estão justificados, logo só faltam 5.000 €.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 2 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-28",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Que tipo de despesas contam para cumprir a regra dos 15% no regime simplificado?",
    opcoes: [
      {
        texto: "Apenas despesas com contabilista certificado",
        porque:
          "As despesas elegíveis incluem rendas do local de trabalho, material, comunicações, deslocações, entre outras — não se limitam ao contabilista.",
      },
      {
        texto: "Despesas registadas no e-fatura com NIPC do contribuinte, como rendas, material, deslocações profissionais, comunicações",
        porque:
          "As despesas elegíveis são as relacionadas com a atividade, registadas no e-fatura (ou comunicadas à AT). Correto.",
      },
      {
        texto: "Apenas despesas com IVA dedutível",
        porque:
          "Contribuintes isentos de IVA (Art. 53.º) também podem justificar despesas — não é necessário deduzir IVA.",
      },
      {
        texto: "Qualquer despesa pessoal (supermercado, roupa, lazer)",
        porque:
          "Apenas despesas profissionais/mistas contam — despesas estritamente pessoais não são elegíveis.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 2 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-29",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um formador (fora do Art. 151.º, coef. 0,35) fatura 70.000 € e não justifica nenhuma despesa. Qual o rendimento tributável?",
    opcoes: [
      {
        texto: "24.500 €",
        porque:
          "Seria 70.000 × 0,35, sem a penalização dos 15%. Mas 15% de 70.000 = 10.500 € não justificados.",
      },
      {
        texto: "35.000 €",
        porque:
          "Base: 70.000 × 0,35 = 24.500 €. Penalização: 15% de 70.000 = 10.500 € (0 € justificados). Total: 24.500 + 10.500 = 35.000 €. Correto.",
      },
      {
        texto: "70.000 €",
        porque:
          "Mesmo sem despesas justificadas, o coeficiente continua a aplicar-se — não se tributa 100%.",
      },
      {
        texto: "45.500 €",
        porque:
          "Não existe fórmula que resulte em 45.500 € — o cálculo correto é 24.500 + 10.500 = 35.000 €.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 2 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-30",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "A regra dos 15% aplica-se a rendimentos de propriedade intelectual (coeficiente 0,95)?",
    opcoes: [
      {
        texto: "Sim — aplica-se a todos os rendimentos da categoria B",
        porque:
          "A regra dos 15% aplica-se apenas aos coeficientes 0,75 e 0,35, não ao 0,95.",
      },
      {
        texto: "Sim, mas com 5% em vez de 15%",
        porque:
          "Não existe variante da regra para o coeficiente 0,95 — simplesmente não se aplica.",
      },
      {
        texto: "Não — a regra dos 15% aplica-se apenas aos coeficientes 0,75 e 0,35",
        porque:
          "O coeficiente 0,95 não está sujeito à regra dos 15%. Apenas os coeficientes 0,75 e 0,35 exigem justificação de despesas. Correto.",
      },
      {
        texto: "Não — mas a AT pode exigir comprovação se suspeitar de fraude",
        porque:
          "A questão é sobre a regra dos 15% especificamente. Não se aplica ao 0,95, independentemente de verificações genéricas.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 2 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  // ── rs-31 a rs-40: Reduções primeiros anos ──────────────────────────
  {
    id: "rs-31",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Um designer abre atividade pela primeira vez e fatura 20.000 € no primeiro ano. Qual a redução aplicável no regime simplificado?",
    opcoes: [
      {
        texto: "Redução de 25% no rendimento tributável",
        porque:
          "25% é a redução do segundo ano. No primeiro ano, a redução é de 50%.",
      },
      {
        texto: "Redução de 50% no rendimento tributável",
        porque:
          "No primeiro ano de atividade, o rendimento tributável é reduzido em 50% (Art. 31.º, n.º 10 CIRS). Correto.",
      },
      {
        texto: "Isenção total de IRS",
        porque:
          "Não há isenção total — há uma redução de 50% no primeiro ano.",
      },
      {
        texto: "Nenhuma redução — o regime simplificado não tem benefícios para novos contribuintes",
        porque:
          "O Art. 31.º, n.º 10 CIRS prevê reduções nos dois primeiros anos de atividade.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 10 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-32",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um consultor (fora do Art. 151.º, coef. 0,35) abre atividade e fatura 30.000 € no primeiro ano. Qual o rendimento tributável com a redução de início de atividade?",
    opcoes: [
      {
        texto: "10.500 €",
        porque:
          "Seria 30.000 × 0,35 sem redução. Mas no primeiro ano há redução de 50%.",
      },
      {
        texto: "5.250 €",
        porque:
          "Rendimento base: 30.000 × 0,35 = 10.500 €. Com redução de 50% (1.º ano): 10.500 × 0,50 = 5.250 €. Correto.",
      },
      {
        texto: "7.875 €",
        porque:
          "Seria 10.500 × 0,75 — mas a redução do primeiro ano é de 50%, não 25%.",
      },
      {
        texto: "15.000 €",
        porque:
          "Seria 30.000 × 0,50, como se o coeficiente fosse 0,50 — o cálculo correto aplica primeiro o coeficiente 0,35 e depois a redução.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 10 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-33",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "No segundo ano de atividade, um médico dentista (Art. 151.º) fatura 50.000 €. Qual a redução aplicável?",
    opcoes: [
      {
        texto: "50% — a mesma que no primeiro ano",
        porque:
          "50% é a redução do primeiro ano. No segundo ano é 25%.",
      },
      {
        texto: "25% do rendimento tributável",
        porque:
          "No segundo ano de atividade, a redução é de 25% (Art. 31.º, n.º 10 CIRS). Correto.",
      },
      {
        texto: "Nenhuma — a redução aplica-se apenas no primeiro ano",
        porque:
          "A redução aplica-se nos dois primeiros anos: 50% no 1.º e 25% no 2.º.",
      },
      {
        texto: "75% do rendimento tributável",
        porque:
          "Não existe redução de 75% no regime simplificado.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 10 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-34",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um veterinário (Art. 151.º, coef. 0,75) abre atividade e fatura 40.000 € no primeiro ano. Qual o rendimento tributável?",
    opcoes: [
      {
        texto: "30.000 €",
        porque:
          "Seria 40.000 × 0,75 sem a redução de início de atividade. Falta aplicar a redução de 50%.",
      },
      {
        texto: "20.000 €",
        porque:
          "Seria 40.000 × 0,50, como se o coeficiente fosse 0,50 — o cálculo correto aplica o coeficiente 0,75 primeiro.",
      },
      {
        texto: "15.000 €",
        porque:
          "40.000 × 0,75 = 30.000 €. Com redução de 50% no 1.º ano: 30.000 × 0,50 = 15.000 €. Correto.",
      },
      {
        texto: "10.000 €",
        porque:
          "Seria 40.000 × 0,25 — não corresponde a nenhuma combinação válida de coeficiente e redução.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 1, al. b) e n.º 10 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-35",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um fotógrafo (fora do Art. 151.º, coef. 0,35) fatura 24.000 € no segundo ano de atividade. Qual o rendimento tributável com a redução?",
    opcoes: [
      {
        texto: "8.400 €",
        porque:
          "Seria 24.000 × 0,35 sem a redução. No 2.º ano há redução de 25%.",
      },
      {
        texto: "4.200 €",
        porque:
          "Seria 8.400 × 0,50 — mas a redução do segundo ano é de 25%, não 50%.",
      },
      {
        texto: "6.300 €",
        porque:
          "24.000 × 0,35 = 8.400 €. Com redução de 25% no 2.º ano: 8.400 × 0,75 = 6.300 €. Correto.",
      },
      {
        texto: "18.000 €",
        porque:
          "Seria 24.000 × 0,75 — o coeficiente 0,75 é de profissões do Art. 151.º, não de fotógrafo fora da tabela.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 10 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-36",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "A redução de início de atividade (50%/25%) aplica-se no terceiro ano de atividade?",
    opcoes: [
      {
        texto: "Sim — aplica-se nos primeiros 3 anos",
        porque:
          "A redução prevista no Art. 31.º, n.º 10 aplica-se apenas nos dois primeiros anos, não no terceiro.",
      },
      {
        texto: "Sim, com redução de 12,5%",
        porque:
          "Não existe redução de 12,5% — a lei prevê apenas 50% (1.º ano) e 25% (2.º ano).",
      },
      {
        texto: "Não — a redução aplica-se apenas nos dois primeiros anos de atividade",
        porque:
          "Ao abrigo do Art. 31.º, n.º 10 CIRS, a redução só abrange o 1.º ano (50%) e o 2.º ano (25%). A partir do 3.º ano, aplica-se o coeficiente normal. Correto.",
      },
      {
        texto: "Depende da faturação anual",
        porque:
          "A redução não depende da faturação — depende apenas do número de anos de atividade (1.º ou 2.º).",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 10 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-37",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Qual é a percentagem de redução aplicável ao rendimento tributável no segundo ano de atividade no regime simplificado?",
    opcoes: [
      {
        texto: "50%",
        porque:
          "50% é a redução do primeiro ano. No segundo ano a redução é de 25%.",
      },
      {
        texto: "10%",
        porque:
          "Não existe redução de 10% — a lei prevê 50% (1.º ano) e 25% (2.º ano).",
      },
      {
        texto: "25%",
        porque:
          "No segundo ano de atividade, o rendimento tributável é reduzido em 25% (Art. 31.º, n.º 10 CIRS). Correto.",
      },
      {
        texto: "75%",
        porque:
          "Não existe redução de 75% no regime simplificado.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 10 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-38",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Uma enfermeira (Art. 151.º) abre atividade e fatura 36.000 € no primeiro ano. Já tinha aberto atividade como comerciante 10 anos antes e encerrado. Tem direito à redução de início de atividade?",
    opcoes: [
      {
        texto: "Sim — a redução aplica-se sempre que se abre atividade",
        porque:
          "A redução do Art. 31.º, n.º 10 exige que seja o 'início de atividade' — reabertura pode não contar como primeiro início se não cumprir os requisitos.",
      },
      {
        texto: "Não — a redução aplica-se apenas no primeiro início de atividade ao longo da vida",
        porque:
          "A lei refere 'início de atividade' — se não exerceu nos anos anteriores e cumpre os requisitos, pode beneficiar da redução.",
      },
      {
        texto: "Depende — a AT avalia caso a caso se se trata de verdadeiro início de atividade ou mera reabertura",
        porque:
          "A aplicação da redução em caso de reabertura depende de verificar se se trata de um novo início de atividade, o que a AT pode questionar. Correto.",
      },
      {
        texto: "Sim, mas apenas a redução de 25% (não de 50%)",
        porque:
          "Não há regra que limite a 25% em caso de reabertura — a questão é se se qualifica como início de atividade.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 10 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-39",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um comerciante (vendas, coef. 0,15) abre atividade e fatura 80.000 € no 1.º ano. Qual o rendimento tributável com a redução?",
    opcoes: [
      {
        texto: "12.000 €",
        porque:
          "Seria 80.000 × 0,15 sem redução de início de atividade.",
      },
      {
        texto: "6.000 €",
        porque:
          "80.000 × 0,15 = 12.000 €. Com redução de 50% no 1.º ano: 12.000 × 0,50 = 6.000 €. Correto.",
      },
      {
        texto: "40.000 €",
        porque:
          "Seria 80.000 × 0,50, como se o coeficiente fosse 0,50 — não é assim que funciona.",
      },
      {
        texto: "9.000 €",
        porque:
          "Seria 12.000 × 0,75 — isso corresponderia a uma redução de 25% (2.º ano), não 50% (1.º ano).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. a) e n.º 10 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-40",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um programador (fora do Art. 151.º, coef. 0,35) no primeiro ano de atividade fatura 50.000 € e não justifica nenhuma despesa. Qual o rendimento tributável, considerando a regra dos 15% e a redução de início de atividade?",
    opcoes: [
      {
        texto: "8.750 €",
        porque:
          "Seria (50.000 × 0,35) × 0,50 = 8.750 €, sem a penalização da regra dos 15%.",
      },
      {
        texto: "12.500 €",
        porque:
          "Seria (50.000 × 0,35 + 7.500) × 0,50 = 12.500 € — a redução de 50% aplica-se ao rendimento tributável antes do acréscimo dos 15%, e o acréscimo é feito ao rendimento base.",
      },
      {
        texto: "25.000 €",
        porque:
          "Base: 50.000 × 0,35 = 17.500 €. Regra 15%: +7.500 €. Subtotal: 25.000 €. Redução 50% (1.º ano): 25.000 × 0,50 = 12.500 €. O valor 25.000 € é antes da redução.",
      },
      {
        texto: "17.500 €",
        porque:
          "Seria 50.000 × 0,35 sem redução e sem regra dos 15% — faltam ambos os ajustes.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 2 e n.º 10 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  // ── rs-41 a rs-50: Limite 200.000 € e transição ────────────────────
  {
    id: "rs-41",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Qual o limite máximo de rendimento bruto anual para permanecer no regime simplificado?",
    opcoes: [
      {
        texto: "100.000 €",
        porque:
          "O limite é de 200.000 €, não de 100.000 € (Art. 28.º CIRS).",
      },
      {
        texto: "150.000 €",
        porque:
          "O limite é de 200.000 €, não de 150.000 €.",
      },
      {
        texto: "200.000 €",
        porque:
          "O Art. 28.º CIRS estabelece que o regime simplificado se aplica a contribuintes com rendimento bruto anual até 200.000 €. Correto.",
      },
      {
        texto: "250.000 €",
        porque:
          "O limite é de 200.000 €, não de 250.000 €.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 28.º CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-42",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "O que acontece se um contribuinte no regime simplificado ultrapassar os 200.000 € de rendimento bruto num ano?",
    opcoes: [
      {
        texto: "É imediatamente excluído do regime simplificado nesse ano",
        porque:
          "A transição não é imediata no próprio ano — aplica-se a contabilidade organizada a partir do ano seguinte.",
      },
      {
        texto: "Fica obrigado a contabilidade organizada a partir do ano seguinte",
        porque:
          "Ao ultrapassar o limiar de 200.000 €, o contribuinte transita para contabilidade organizada no período seguinte. Correto.",
      },
      {
        texto: "Paga uma multa mas mantém o regime simplificado",
        porque:
          "Não há multa — o efeito é a transição obrigatória para contabilidade organizada.",
      },
      {
        texto: "O coeficiente sobe automaticamente para 1,00",
        porque:
          "Não há ajuste do coeficiente — a consequência é a mudança obrigatória de regime.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-43",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um freelancer fatura 195.000 € num ano. Pode manter o regime simplificado?",
    opcoes: [
      {
        texto: "Não — o limite é 150.000 €",
        porque:
          "O limite é 200.000 €, não 150.000 €. Com 195.000 € está dentro do limite.",
      },
      {
        texto: "Sim — está abaixo do limite de 200.000 €",
        porque:
          "195.000 € é inferior ao limiar de 200.000 € do Art. 28.º CIRS, pelo que pode manter o regime simplificado. Correto.",
      },
      {
        texto: "Sim, mas só se tiver contabilista",
        porque:
          "No regime simplificado não é obrigatório ter contabilista — esse requisito é da contabilidade organizada.",
      },
      {
        texto: "Sim, mas com penalização de 10% extra",
        porque:
          "Não existe penalização extra por se aproximar do limite — ou está abaixo e mantém, ou ultrapassa e muda.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-44",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um contribuinte com contabilidade organizada quer voltar ao regime simplificado. É possível?",
    opcoes: [
      {
        texto: "Nunca — uma vez na contabilidade organizada, é permanente",
        porque:
          "É possível voltar ao regime simplificado, desde que se cumpram os requisitos (rendimento bruto ≤ 200.000 €) e se faça o pedido.",
      },
      {
        texto: "Sim, desde que o rendimento bruto esteja abaixo de 200.000 € e opte pelo regime simplificado",
        porque:
          "É possível regressar ao regime simplificado quando o rendimento bruto esteja dentro do limite e se faça a opção. Correto.",
      },
      {
        texto: "Sim, mas apenas após 5 anos na contabilidade organizada",
        porque:
          "O período mínimo de permanência no regime pelo qual se optou é de 3 anos, mas não especificamente 5.",
      },
      {
        texto: "Sim, automaticamente quando o rendimento baixar",
        porque:
          "A transição não é automática — é necessário exercer a opção pela mudança de regime.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-45",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "No regime simplificado, é obrigatório ter contabilista certificado?",
    opcoes: [
      {
        texto: "Sim — é sempre obrigatório",
        porque:
          "No regime simplificado não é obrigatório ter contabilista certificado — essa obrigação é da contabilidade organizada.",
      },
      {
        texto: "Não — no regime simplificado não é obrigatório ter contabilista certificado",
        porque:
          "Uma das vantagens do regime simplificado é não exigir contabilista, ao contrário da contabilidade organizada. Correto.",
      },
      {
        texto: "Só acima de 100.000 € de faturação",
        porque:
          "Não existe esse limiar — no regime simplificado nunca é obrigatório, independentemente da faturação.",
      },
      {
        texto: "Só para profissões do Art. 151.º",
        porque:
          "A obrigação de contabilista não depende da profissão no regime simplificado — simplesmente não é exigido.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-46",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um contribuinte opta pelo regime simplificado em 2025. Quando é que pode, pela primeira vez, mudar para contabilidade organizada?",
    opcoes: [
      {
        texto: "A qualquer momento, sem restrições",
        porque:
          "A opção pelo regime tem um período mínimo de permanência de 3 anos (Art. 28.º, n.º 5 CIRS).",
      },
      {
        texto: "Após 3 anos — a partir de 2028",
        porque:
          "A opção por um regime tem período mínimo de permanência de 3 anos. Tendo optado em 2025, pode mudar a partir de 2028. Correto.",
      },
      {
        texto: "Após 1 ano — a partir de 2026",
        porque:
          "O período mínimo é de 3 anos, não 1.",
      },
      {
        texto: "Após 5 anos — a partir de 2030",
        porque:
          "O período mínimo é de 3 anos, não 5.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º, n.º 5 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-47",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um contribuinte fatura 210.000 € em 2025. Pode continuar no regime simplificado em 2026?",
    opcoes: [
      {
        texto: "Sim — o limite é 250.000 €",
        porque:
          "O limite é 200.000 €, não 250.000 €. Com 210.000 € ultrapassa o limiar.",
      },
      {
        texto: "Sim — o excesso aplica o coeficiente 1,00",
        porque:
          "Não existe um coeficiente especial para o excesso — ultrapassar o limite obriga a mudar de regime.",
      },
      {
        texto: "Não — ultrapassa os 200.000 € e é obrigado a contabilidade organizada",
        porque:
          "Ao ultrapassar 200.000 € de rendimento bruto, fica obrigado a contabilidade organizada a partir de 2026. Correto.",
      },
      {
        texto: "Sim, se justificar as despesas no e-fatura",
        porque:
          "Justificar despesas é relativo à regra dos 15%, não ao limiar de permanência no regime.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 28.º CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-48",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "O limite de 200.000 € do regime simplificado refere-se a que valor?",
    opcoes: [
      {
        texto: "Rendimento líquido (após aplicar o coeficiente)",
        porque:
          "O limiar refere-se ao rendimento bruto (faturação), não ao rendimento tributável após coeficiente.",
      },
      {
        texto: "Rendimento bruto anual (faturação total)",
        porque:
          "O Art. 28.º CIRS refere 'montante anual ilíquido de rendimentos desta categoria' — ou seja, o rendimento bruto. Correto.",
      },
      {
        texto: "Lucro anual (rendimento menos despesas)",
        porque:
          "O lucro é um conceito da contabilidade organizada — o limiar baseia-se no rendimento bruto.",
      },
      {
        texto: "Volume de negócios para efeitos de IVA",
        porque:
          "O volume de negócios para IVA é diferente — o limiar do regime simplificado é sobre o rendimento bruto da categoria B.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-49",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um contribuinte está no regime simplificado e ultrapassou 200.000 € em 2024 (transitou para contabilidade organizada em 2025). Em 2025, fatura 150.000 €. Pode voltar ao regime simplificado em 2026?",
    opcoes: [
      {
        texto: "Sim — o rendimento já está abaixo de 200.000 €",
        porque:
          "Há um período mínimo de permanência de 3 anos quando se opta por (ou é obrigado a) um regime.",
      },
      {
        texto: "Não — tem de permanecer na contabilidade organizada pelo menos 3 anos",
        porque:
          "O período mínimo de permanência é de 3 anos (Art. 28.º, n.º 5 CIRS). Só pode regressar ao simplificado, no mínimo, em 2028. Correto.",
      },
      {
        texto: "Sim, mas apenas se pedir ao contabilista certificado",
        porque:
          "O contabilista pode tratar do pedido, mas o impedimento é o período mínimo de 3 anos.",
      },
      {
        texto: "Sim — a transição obrigatória não tem período mínimo",
        porque:
          "O período mínimo de 3 anos aplica-se também quando a transição é obrigatória.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º, n.º 5 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-50",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Que vantagem tem o regime simplificado face à contabilidade organizada para quem tem poucas despesas?",
    opcoes: [
      {
        texto: "Não precisa de guardar faturas",
        porque:
          "Mesmo no regime simplificado deve guardar faturas (são necessárias para a regra dos 15%). A vantagem é outra.",
      },
      {
        texto: "Os coeficientes presumem despesas mesmo que o contribuinte tenha poucas despesas reais",
        porque:
          "No regime simplificado, os coeficientes garantem uma dedução presumida (ex.: 65% para coef. 0,35), mesmo com poucas despesas reais. Correto.",
      },
      {
        texto: "Paga sempre menos imposto",
        porque:
          "Nem sempre — se as despesas reais forem elevadas, a contabilidade organizada pode ser mais vantajosa.",
      },
      {
        texto: "Está isento de IRS nos primeiros 5 anos",
        porque:
          "Não há isenção de 5 anos — há apenas reduções nos primeiros 2 anos.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  // ── rs-51 a rs-60: Contabilidade organizada vs simplificado ─────────
  {
    id: "rs-51",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um consultor (fora do Art. 151.º, coef. 0,35) fatura 60.000 € e tem 45.000 € de despesas reais. Qual regime é mais vantajoso?",
    opcoes: [
      {
        texto: "Regime simplificado — rendimento tributável de 21.000 €",
        porque:
          "No simplificado: 60.000 × 0,35 = 21.000 €. Na contabilidade organizada: 60.000 − 45.000 = 15.000 €. Organizada é melhor.",
      },
      {
        texto: "Contabilidade organizada — rendimento tributável de 15.000 €",
        porque:
          "Organizada: 60.000 − 45.000 = 15.000 €. Simplificado: 60.000 × 0,35 = 21.000 €. A organizada resulta em menos 6.000 € tributáveis. Correto.",
      },
      {
        texto: "São iguais",
        porque:
          "Não são iguais — 21.000 € (simplificado) vs 15.000 € (organizada).",
      },
      {
        texto: "Depende do escalão de IRS",
        porque:
          "Independentemente do escalão, menos rendimento tributável é sempre melhor — e a organizada dá 15.000 € vs 21.000 €.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º e 31.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-52",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "A partir de que percentagem de despesas reais (face ao rendimento bruto) é que a contabilidade organizada se torna mais vantajosa para um profissional do Art. 151.º (coef. 0,75)?",
    opcoes: [
      {
        texto: "Quando as despesas ultrapassam 15% do rendimento bruto",
        porque:
          "15% é a regra das despesas a justificar, não o ponto de equilíbrio entre regimes.",
      },
      {
        texto: "Quando as despesas ultrapassam 25% do rendimento bruto",
        porque:
          "Com coeficiente 0,75, o simplificado presume 25% de despesas. Se as despesas reais ultrapassarem 25%, a organizada tributa menos. Correto.",
      },
      {
        texto: "Quando as despesas ultrapassam 50% do rendimento bruto",
        porque:
          "50% corresponderia ao ponto de equilíbrio do coeficiente 0,50 — o coeficiente 0,75 presume apenas 25% de despesas.",
      },
      {
        texto: "Quando as despesas ultrapassam 75% do rendimento bruto",
        porque:
          "75% é o coeficiente (parte tributável), não a dedução presumida. O equilíbrio é a 25% de despesas.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º e 31.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-53",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Para um freelancer com coeficiente 0,35, a contabilidade organizada só compensa quando as despesas reais ultrapassam que percentagem do rendimento?",
    opcoes: [
      {
        texto: "25%",
        porque:
          "25% é o equilíbrio para o coeficiente 0,75, não para o 0,35.",
      },
      {
        texto: "35%",
        porque:
          "35% é a parte tributável (coeficiente), não a parte deduzida. O simplificado presume 65% de despesas.",
      },
      {
        texto: "50%",
        porque:
          "O ponto de equilíbrio não é 50% — é 65%, que é a dedução presumida do coeficiente 0,35.",
      },
      {
        texto: "65%",
        porque:
          "Com coeficiente 0,35, presume-se 65% de despesas. Se as despesas reais ultrapassarem 65% do rendimento bruto, a organizada compensa. Correto.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 28.º e 31.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-54",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Na contabilidade organizada, como se calcula o rendimento tributável?",
    opcoes: [
      {
        texto: "Rendimento bruto × coeficiente",
        porque:
          "Isso é o regime simplificado. A contabilidade organizada usa despesas reais.",
      },
      {
        texto: "Rendimento bruto − despesas reais efetivamente suportadas e documentadas",
        porque:
          "Na contabilidade organizada, deduzem-se as despesas reais comprovadas, resultando no lucro tributável. Correto.",
      },
      {
        texto: "Rendimento bruto − 4.104 € (dedução específica)",
        porque:
          "A dedução específica de 4.104 € aplica-se a rendimentos do trabalho dependente (categoria A), não à categoria B com contabilidade organizada.",
      },
      {
        texto: "Rendimento bruto × 0,50 (metade)",
        porque:
          "Não existe fórmula de 50% na contabilidade organizada — usam-se as despesas reais.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º e 32.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-55",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um médico (Art. 151.º) fatura 100.000 € e tem 30.000 € de despesas reais. Qual a diferença de rendimento tributável entre os dois regimes?",
    opcoes: [
      {
        texto: "Simplificado: 75.000 €; Organizada: 70.000 € → diferença de 5.000 €",
        porque:
          "Simplificado: 100.000 × 0,75 = 75.000 €. Organizada: 100.000 − 30.000 = 70.000 €. Diferença = 5.000 €. Correto.",
      },
      {
        texto: "Simplificado: 35.000 €; Organizada: 70.000 € → diferença de 35.000 €",
        porque:
          "35.000 € seria com coeficiente 0,35 — um médico do Art. 151.º tem coeficiente 0,75.",
      },
      {
        texto: "São iguais — 75.000 € em ambos",
        porque:
          "Na organizada seria 100.000 − 30.000 = 70.000 €, não 75.000 €.",
      },
      {
        texto: "Simplificado: 75.000 €; Organizada: 30.000 € → diferença de 45.000 €",
        porque:
          "Na organizada o rendimento tributável é rendimento − despesas = 70.000 €, não apenas as despesas (30.000 €).",
      },
    ],
    correta: 0,
    legalBasis: "Art. 28.º, 31.º e 32.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-56",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Qual destas é uma desvantagem do regime simplificado face à contabilidade organizada?",
    opcoes: [
      {
        texto: "Não permite deduzir despesas reais superiores ao coeficiente presumido",
        porque:
          "No regime simplificado, as despesas são forfetárias (presumidas pelo coeficiente). Se as reais forem maiores, não podem ser deduzidas. Correto.",
      },
      {
        texto: "Obriga a ter contabilista certificado",
        porque:
          "É o contrário — a contabilidade organizada é que obriga a ter contabilista.",
      },
      {
        texto: "Tributa sempre 100% do rendimento",
        porque:
          "O regime simplificado não tributa 100% — tributa conforme o coeficiente (ex.: 75%, 35%, 15%).",
      },
      {
        texto: "Não permite emitir recibos verdes",
        porque:
          "Ambos os regimes permitem emitir recibos verdes.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 28.º e 31.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-57",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um restaurante em nome individual fatura 180.000 € e tem 160.000 € de despesas reais. Simplificado ou organizada?",
    opcoes: [
      {
        texto: "Simplificado: 27.000 € tributáveis — é melhor",
        porque:
          "Simplificado: 180.000 × 0,15 = 27.000 €. Organizada: 180.000 − 160.000 = 20.000 €. A organizada é melhor.",
      },
      {
        texto: "Organizada: 20.000 € tributáveis — é melhor",
        porque:
          "Organizada: 180.000 − 160.000 = 20.000 €. Simplificado: 180.000 × 0,15 = 27.000 €. A organizada resulta em menos 7.000 € tributáveis. Correto.",
      },
      {
        texto: "São equivalentes",
        porque:
          "27.000 € vs 20.000 € — há uma diferença de 7.000 € a favor da organizada.",
      },
      {
        texto: "Simplificado: 63.000 € tributáveis — a organizada é muito melhor",
        porque:
          "63.000 € seria 180.000 × 0,35 — restauração usa o coeficiente 0,15, não 0,35.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º, 31.º e 32.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-58",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Qual é o custo adicional mais significativo da contabilidade organizada face ao regime simplificado?",
    opcoes: [
      {
        texto: "O pagamento de IVA",
        porque:
          "O IVA depende do regime de IVA (ex.: Art. 53.º), não do regime de IRS (simplificado vs organizada).",
      },
      {
        texto: "A obrigação de ter contabilista certificado (CC) e manter contabilidade formal",
        porque:
          "Na contabilidade organizada é obrigatório ter contabilista certificado, cujo honorário é um custo adicional fixo. Correto.",
      },
      {
        texto: "Uma taxa fixa anual de 2.000 € à AT",
        porque:
          "Não existe taxa fixa à AT para a contabilidade organizada.",
      },
      {
        texto: "A impossibilidade de emitir recibos verdes",
        porque:
          "Na contabilidade organizada continua a ser possível emitir recibos verdes.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º e 123.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-59",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "No regime simplificado, o contribuinte pode optar voluntariamente pela contabilidade organizada, mesmo com rendimento abaixo de 200.000 €?",
    opcoes: [
      {
        texto: "Não — o regime simplificado é obrigatório abaixo de 200.000 €",
        porque:
          "O regime simplificado é o regime supletivo, mas o contribuinte pode optar pela contabilidade organizada.",
      },
      {
        texto: "Sim — pode optar pela contabilidade organizada a qualquer momento",
        porque:
          "Qualquer contribuinte abaixo de 200.000 € pode optar pela contabilidade organizada se considerar mais vantajosa. Correto.",
      },
      {
        texto: "Sim, mas só após 5 anos no simplificado",
        porque:
          "O período mínimo de permanência é de 3 anos após optar, mas a opção pela organizada pode ser feita se não houver período mínimo em curso.",
      },
      {
        texto: "Sim, mas precisa de autorização da AT",
        porque:
          "Não é necessária autorização — basta fazer a opção (declaração de alterações).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º, n.º 3 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-60",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um contribuinte com coeficiente 0,75 fatura 80.000 €. Tem despesas reais de 25.000 € e paga 3.600 €/ano de contabilista. A contabilidade organizada compensa?",
    opcoes: [
      {
        texto: "Sim — o rendimento tributável na organizada é muito menor",
        porque:
          "Organizada: 80.000 − 25.000 = 55.000 €. Simplificado: 80.000 × 0,75 = 60.000 €. Diferença de 5.000 €, mas o custo do CC é 3.600 €. Margem muito pequena.",
      },
      {
        texto: "Não — a diferença não justifica o custo do contabilista",
        porque:
          "Organizada: 55.000 € tributáveis (poupança de ~5.000 € na base). A poupança fiscal depende do escalão, mas a 37%, seriam ~1.850 € de imposto a menos, inferior ao custo do CC (3.600 €). Não compensa. Correto.",
      },
      {
        texto: "Sim — poupa sempre com despesas acima de 20%",
        porque:
          "O ponto de equilíbrio teórico para o coef. 0,75 é 25% de despesas, mas deve-se considerar o custo adicional do contabilista.",
      },
      {
        texto: "Depende apenas do escalão de IRS",
        porque:
          "Depende da diferença de base tributável E do custo do contabilista, não só do escalão.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º e 31.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  // ── rs-61 a rs-68: Transparência fiscal ─────────────────────────────
  {
    id: "rs-61",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Qual o coeficiente aplicável quando um trabalhador independente presta serviços a uma sociedade onde detém 5% ou mais do capital?",
    opcoes: [
      {
        texto: "0,75 — como profissão liberal",
        porque:
          "Quando há participação ≥ 5%, aplica-se o regime de transparência fiscal com coeficiente 1,00, não 0,75.",
      },
      {
        texto: "0,35 — como outros serviços",
        porque:
          "O coeficiente 0,35 aplica-se a outros serviços sem relação de participação. Aqui aplica-se o 1,00.",
      },
      {
        texto: "1,00 — tributação total do rendimento",
        porque:
          "Rendimentos de serviços prestados a entidade onde o contribuinte detém ≥ 5% têm coeficiente 1,00 (transparência fiscal). Correto.",
      },
      {
        texto: "0,50 — metade do rendimento",
        porque:
          "Não existe coeficiente de 0,50 para serviços — o coeficiente de transparência fiscal é 1,00.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 1, al. g) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-62",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um consultor detém 10% de uma sociedade e presta-lhe serviços por 30.000 €. Qual o rendimento tributável no regime simplificado?",
    opcoes: [
      {
        texto: "10.500 € (30.000 × 0,35)",
        porque:
          "0,35 seria para serviços sem participação ≥ 5%. Aqui, o consultor detém 10%, logo o coeficiente é 1,00.",
      },
      {
        texto: "22.500 € (30.000 × 0,75)",
        porque:
          "0,75 seria para profissões do Art. 151.º sem participação ≥ 5%. Com 10% de participação, aplica-se 1,00.",
      },
      {
        texto: "30.000 € (30.000 × 1,00)",
        porque:
          "Com participação de 10% (≥ 5%) na sociedade, aplica-se o coeficiente 1,00: 100% do rendimento é tributável. Correto.",
      },
      {
        texto: "4.500 € (30.000 × 0,15)",
        porque:
          "0,15 é para vendas/restauração — não se aplica a serviços de consultoria a sociedade participada.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 1, al. g) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-63",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um contabilista (Art. 151.º) detém 4% de uma sociedade e presta-lhe serviços por 20.000 €. Qual o coeficiente aplicável?",
    opcoes: [
      {
        texto: "1,00 — porque presta serviços à sociedade onde é sócio",
        porque:
          "O coeficiente 1,00 aplica-se apenas quando a participação é ≥ 5%. Com 4%, não se ativa a transparência fiscal.",
      },
      {
        texto: "0,75 — porque é profissão do Art. 151.º e a participação (4%) é inferior a 5%",
        porque:
          "Com participação de 4% (< 5%), não se aplica o coeficiente de transparência fiscal. Aplica-se o coeficiente normal da profissão: 0,75. Correto.",
      },
      {
        texto: "0,35 — porque é prestação de serviços a uma sociedade",
        porque:
          "O facto de o cliente ser uma sociedade não altera o coeficiente — 0,35 é para atividades fora do Art. 151.º.",
      },
      {
        texto: "0,50 — metade entre 0,75 e 1,00",
        porque:
          "Não existe média de coeficientes. Ou se aplica o 1,00 (se ≥ 5%) ou o coeficiente normal da atividade.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. b) e g) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-64",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "O que significa 'transparência fiscal' no contexto do regime simplificado?",
    opcoes: [
      {
        texto: "Publicar as contas na internet",
        porque:
          "Transparência fiscal não tem a ver com publicação — refere-se à tributação integral quando há participação ≥ 5%.",
      },
      {
        texto: "Rendimentos de serviços a sociedades onde se detém ≥ 5% são tributados a 100% (coeficiente 1,00)",
        porque:
          "A transparência fiscal evita que se use a sociedade para reduzir o rendimento tributável, aplicando o coeficiente 1,00. Correto.",
      },
      {
        texto: "Ter todas as faturas no e-fatura",
        porque:
          "A comunicação de faturas ao e-fatura é uma obrigação geral, não está relacionada com a transparência fiscal.",
      },
      {
        texto: "Apresentar declaração de IRS sem erros",
        porque:
          "A transparência fiscal é um regime de tributação, não uma qualidade da declaração.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. g) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-65",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um arquiteto (Art. 151.º) fatura 50.000 € a clientes normais e 20.000 € a uma sociedade onde detém 8%. Qual o rendimento tributável total?",
    opcoes: [
      {
        texto: "52.500 € (70.000 × 0,75)",
        porque:
          "Não pode aplicar 0,75 a tudo — os 20.000 € à sociedade participada têm coeficiente 1,00.",
      },
      {
        texto: "57.500 € (50.000 × 0,75 + 20.000 × 1,00)",
        porque:
          "Clientes normais: 50.000 × 0,75 = 37.500 €. Sociedade (≥ 5%): 20.000 × 1,00 = 20.000 €. Total: 57.500 €. Correto.",
      },
      {
        texto: "37.500 € (50.000 × 0,75)",
        porque:
          "Falta somar os 20.000 € à sociedade participada, que são tributados a 100%.",
      },
      {
        texto: "70.000 € (tudo a 1,00)",
        porque:
          "O coeficiente 1,00 aplica-se apenas aos serviços à sociedade participada, não a todos os rendimentos.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. b) e g) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-66",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "O limiar de 5% para a transparência fiscal refere-se a quê?",
    opcoes: [
      {
        texto: "5% da faturação total do contribuinte",
        porque:
          "O limiar não é sobre a faturação — é sobre a participação no capital da sociedade.",
      },
      {
        texto: "5% ou mais de participação no capital social da sociedade",
        porque:
          "O coeficiente 1,00 aplica-se quando o contribuinte detém direta ou indiretamente 5% ou mais do capital da entidade à qual presta serviços. Correto.",
      },
      {
        texto: "5% do rendimento bruto anual do setor",
        porque:
          "O limiar nada tem a ver com o rendimento do setor — refere-se à participação societária.",
      },
      {
        texto: "5% do tempo de trabalho dedicado à sociedade",
        porque:
          "O critério é de participação no capital, não de tempo de trabalho.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. g) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-67",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um freelancer detém 5% de duas sociedades diferentes. Fatura 15.000 € a cada uma e 30.000 € a outros clientes (atividade fora Art. 151.º). Qual o rendimento tributável?",
    opcoes: [
      {
        texto: "21.000 € (60.000 × 0,35)",
        porque:
          "Não se pode aplicar 0,35 a tudo — os serviços às sociedades participadas têm coeficiente 1,00.",
      },
      {
        texto: "40.500 € (30.000 × 0,35 + 30.000 × 1,00)",
        porque:
          "Outros clientes: 30.000 × 0,35 = 10.500 €. Sociedades (5% cada): 15.000 + 15.000 = 30.000 × 1,00 = 30.000 €. Total: 40.500 €. Correto.",
      },
      {
        texto: "60.000 € (tudo a 1,00)",
        porque:
          "O coeficiente 1,00 só se aplica aos serviços às sociedades participadas, não a todos os rendimentos.",
      },
      {
        texto: "30.000 € (só as sociedades contam)",
        porque:
          "Todos os rendimentos são tributados — os de outros clientes com o coeficiente normal.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. c) e g) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-68",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Qual o objetivo da regra de transparência fiscal (coeficiente 1,00) no regime simplificado?",
    opcoes: [
      {
        texto: "Penalizar quem tem sociedades",
        porque:
          "O objetivo não é penalizar — é evitar que se use a sociedade participada para baixar artificialmente o coeficiente.",
      },
      {
        texto: "Evitar que o contribuinte reduza artificialmente a tributação prestando serviços a uma sociedade que controla",
        porque:
          "A regra impede que o contribuinte beneficie do coeficiente reduzido ao faturar para uma sociedade onde tem participação significativa. Correto.",
      },
      {
        texto: "Obrigar à contabilidade organizada",
        porque:
          "A transparência fiscal não obriga a mudar de regime — apenas aplica o coeficiente 1,00 a esses rendimentos.",
      },
      {
        texto: "Aumentar a receita fiscal de forma geral",
        porque:
          "A regra tem como objetivo específico a anti-evasão, não o aumento geral de receita.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. g) CIRS",
    fonte: fonte("art31"),
  },
  // ── rs-69 a rs-78: Alojamento local ─────────────────────────────────
  {
    id: "rs-69",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Qual o coeficiente do regime simplificado para rendimentos de alojamento local em estabelecimento de hospedagem?",
    opcoes: [
      {
        texto: "0,35",
        porque:
          "0,35 aplica-se a alojamento local em moradia ou apartamento, não em estabelecimento de hospedagem.",
      },
      {
        texto: "0,50",
        porque:
          "0,50 aplica-se a alojamento local em zona de contenção, não a estabelecimento de hospedagem em geral.",
      },
      {
        texto: "0,15",
        porque:
          "O alojamento local explorado como estabelecimento de hospedagem tem o mesmo coeficiente das vendas e hotelaria: 0,15. Correto.",
      },
      {
        texto: "0,75",
        porque:
          "0,75 é para profissões liberais do Art. 151.º — não se aplica a alojamento local.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 1, al. a) CIRS",
    fonte: fonte("alojamentoLocal"),
  },
  {
    id: "rs-70",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Qual o coeficiente para alojamento local em moradia ou apartamento?",
    opcoes: [
      {
        texto: "0,15",
        porque:
          "0,15 é para estabelecimento de hospedagem — moradia/apartamento tem coeficiente diferente.",
      },
      {
        texto: "0,35",
        porque:
          "Alojamento local em moradia ou apartamento tem coeficiente 0,35. Correto.",
      },
      {
        texto: "0,50",
        porque:
          "0,50 aplica-se apenas a moradias/apartamentos em zona de contenção, não a todos.",
      },
      {
        texto: "0,75",
        porque:
          "0,75 é para profissões liberais — não se aplica a alojamento local.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º CIRS",
    fonte: fonte("alojamentoLocal"),
  },
  {
    id: "rs-71",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um proprietário tem um apartamento de alojamento local em zona de contenção e fatura 40.000 €. Qual o rendimento tributável?",
    opcoes: [
      {
        texto: "6.000 € (40.000 × 0,15)",
        porque:
          "0,15 é para estabelecimento de hospedagem — em zona de contenção o coeficiente é 0,50.",
      },
      {
        texto: "14.000 € (40.000 × 0,35)",
        porque:
          "0,35 seria para moradia/apartamento fora de zona de contenção. Em zona de contenção é 0,50.",
      },
      {
        texto: "20.000 € (40.000 × 0,50)",
        porque:
          "Alojamento local em zona de contenção (moradia ou apartamento) tem coeficiente 0,50: 40.000 × 0,50 = 20.000 €. Correto.",
      },
      {
        texto: "30.000 € (40.000 × 0,75)",
        porque:
          "0,75 é para profissões liberais — alojamento local em contenção tem 0,50.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 1, al. h) CIRS",
    fonte: fonte("alojamentoLocal"),
  },
  {
    id: "rs-72",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "O que é uma 'zona de contenção' para efeitos de alojamento local?",
    opcoes: [
      {
        texto: "Qualquer zona rural",
        porque:
          "Zonas rurais não são automaticamente zonas de contenção — estas são definidas por deliberação municipal.",
      },
      {
        texto: "Zona onde a câmara municipal suspende novos registos de alojamento local, por pressão sobre o mercado habitacional",
        porque:
          "As zonas de contenção são áreas definidas pelas câmaras municipais onde se limita o alojamento local para proteger a habitação. Correto.",
      },
      {
        texto: "Zona com mais de 100 alojamentos locais por km²",
        porque:
          "Não existe um critério numérico fixo — a definição cabe aos municípios.",
      },
      {
        texto: "Zona costeira de Portugal continental",
        porque:
          "As zonas de contenção não correspondem a uma área geográfica genérica — são definidas caso a caso pelos municípios.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 15.º-A do DL 128/2014",
    fonte: fonte("alojamentoLocal"),
  },
  {
    id: "rs-73",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um proprietário tem dois imóveis de alojamento local: um estabelecimento de hospedagem (fatura 50.000 €) e um apartamento (fatura 30.000 €). Qual o rendimento tributável total?",
    opcoes: [
      {
        texto: "12.000 € (80.000 × 0,15)",
        porque:
          "Não se pode aplicar 0,15 a tudo — apenas o estabelecimento de hospedagem tem esse coeficiente.",
      },
      {
        texto: "28.000 € (80.000 × 0,35)",
        porque:
          "Não se pode aplicar 0,35 a tudo — cada tipo de alojamento tem o seu coeficiente.",
      },
      {
        texto: "18.000 € (50.000 × 0,15 + 30.000 × 0,35)",
        porque:
          "Estabelecimento: 50.000 × 0,15 = 7.500 €. Apartamento: 30.000 × 0,35 = 10.500 €. Total: 18.000 €. Correto.",
      },
      {
        texto: "60.000 € (50.000 × 0,75 + 30.000 × 0,50)",
        porque:
          "0,75 e 0,50 não são os coeficientes corretos — estabelecimento é 0,15 e apartamento é 0,35.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º CIRS",
    fonte: fonte("alojamentoLocal"),
  },
  {
    id: "rs-74",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um proprietário de moradia de alojamento local fora de zona de contenção fatura 60.000 €. Qual o coeficiente e rendimento tributável?",
    opcoes: [
      {
        texto: "Coeficiente 0,15 → 9.000 €",
        porque:
          "0,15 é para estabelecimento de hospedagem — moradias têm coeficiente 0,35 (fora de contenção).",
      },
      {
        texto: "Coeficiente 0,35 → 21.000 €",
        porque:
          "Moradia de alojamento local fora de zona de contenção tem coeficiente 0,35: 60.000 × 0,35 = 21.000 €. Correto.",
      },
      {
        texto: "Coeficiente 0,50 → 30.000 €",
        porque:
          "0,50 aplica-se apenas em zona de contenção — fora dessa zona, moradias têm 0,35.",
      },
      {
        texto: "Coeficiente 0,75 → 45.000 €",
        porque:
          "0,75 é para profissões liberais do Art. 151.º — não se aplica a alojamento local.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º CIRS",
    fonte: fonte("alojamentoLocal"),
  },
  {
    id: "rs-75",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um proprietário tem um apartamento de alojamento local em zona de contenção (fatura 25.000 €) e outro fora de contenção (fatura 35.000 €). Qual o rendimento tributável total?",
    opcoes: [
      {
        texto: "21.000 € (60.000 × 0,35)",
        porque:
          "Não se pode aplicar 0,35 a ambos — o apartamento em contenção tem coeficiente 0,50.",
      },
      {
        texto: "24.750 € (25.000 × 0,50 + 35.000 × 0,35)",
        porque:
          "Contenção: 25.000 × 0,50 = 12.500 €. Fora de contenção: 35.000 × 0,35 = 12.250 €. Total: 24.750 €. Correto.",
      },
      {
        texto: "30.000 € (60.000 × 0,50)",
        porque:
          "O coeficiente 0,50 aplica-se apenas ao imóvel em zona de contenção, não a ambos.",
      },
      {
        texto: "9.000 € (60.000 × 0,15)",
        porque:
          "0,15 é para estabelecimento de hospedagem — apartamentos têm 0,35 ou 0,50.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º CIRS",
    fonte: fonte("alojamentoLocal"),
  },
  {
    id: "rs-76",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Qual a diferença de coeficiente entre um 'estabelecimento de hospedagem' e um 'apartamento' no alojamento local?",
    opcoes: [
      {
        texto: "Não há diferença — ambos têm coeficiente 0,35",
        porque:
          "Há diferença: estabelecimento de hospedagem tem 0,15, apartamento tem 0,35.",
      },
      {
        texto: "Estabelecimento: 0,15 / Apartamento: 0,35",
        porque:
          "O estabelecimento de hospedagem beneficia do coeficiente mais baixo (0,15), enquanto o apartamento tem 0,35. Correto.",
      },
      {
        texto: "Estabelecimento: 0,35 / Apartamento: 0,15",
        porque:
          "É ao contrário: o estabelecimento tem o coeficiente mais baixo (0,15).",
      },
      {
        texto: "Estabelecimento: 0,50 / Apartamento: 0,75",
        porque:
          "Esses coeficientes não correspondem — 0,50 é para contenção e 0,75 é para profissões liberais.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º CIRS",
    fonte: fonte("alojamentoLocal"),
  },
  {
    id: "rs-77",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um proprietário abre atividade de alojamento local (apartamento, fora de contenção) e fatura 45.000 € no 1.º ano. Qual o rendimento tributável com a redução de início de atividade?",
    opcoes: [
      {
        texto: "15.750 €",
        porque:
          "Seria 45.000 × 0,35 sem redução. No 1.º ano há redução de 50%.",
      },
      {
        texto: "7.875 €",
        porque:
          "45.000 × 0,35 = 15.750 €. Com redução de 50% (1.º ano): 15.750 × 0,50 = 7.875 €. Correto.",
      },
      {
        texto: "3.375 €",
        porque:
          "Seria 45.000 × 0,15 × 0,50 — mas o coeficiente para apartamento é 0,35, não 0,15.",
      },
      {
        texto: "22.500 €",
        porque:
          "Seria 45.000 × 0,50, como se o coeficiente fosse 0,50 — o coeficiente para apartamento fora de contenção é 0,35.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 10 CIRS",
    fonte: fonte("alojamentoLocal"),
  },
  {
    id: "rs-78",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "A regra dos 15% aplica-se a rendimentos de alojamento local em apartamento (coeficiente 0,35)?",
    opcoes: [
      {
        texto: "Não — a regra dos 15% nunca se aplica a alojamento local",
        porque:
          "A regra dos 15% aplica-se aos coeficientes 0,75 e 0,35. Alojamento local em apartamento tem coeficiente 0,35.",
      },
      {
        texto: "Sim — o coeficiente 0,35 do alojamento local em apartamento está sujeito à regra dos 15%",
        porque:
          "A regra dos 15% aplica-se a todos os rendimentos sujeitos ao coeficiente 0,35, incluindo alojamento local em apartamento/moradia. Correto.",
      },
      {
        texto: "Sim, mas com 10% em vez de 15%",
        porque:
          "Não existe variante da regra para alojamento local — é sempre 15% para os coeficientes 0,35 e 0,75.",
      },
      {
        texto: "Depende da zona geográfica",
        porque:
          "A aplicação da regra dos 15% não depende da zona — depende do coeficiente (0,75 ou 0,35).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 2 CIRS",
    fonte: fonte("alojamentoLocal"),
  },
  // ── rs-79 a rs-84: Subsídios ────────────────────────────────────────
  {
    id: "rs-79",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Qual o coeficiente para subsídios NÃO destinados à exploração no regime simplificado?",
    opcoes: [
      {
        texto: "0,10",
        porque:
          "0,10 é para subsídios destinados à exploração. Os não destinados à exploração têm 0,30.",
      },
      {
        texto: "0,30",
        porque:
          "Subsídios ou subvenções não destinados à exploração têm coeficiente 0,30. Correto.",
      },
      {
        texto: "0,15",
        porque:
          "0,15 é para vendas de bens e restauração, não para subsídios.",
      },
      {
        texto: "0,50",
        porque:
          "0,50 é para alojamento local em zona de contenção, não para subsídios.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. e) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-80",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Qual o coeficiente para subsídios destinados à exploração no regime simplificado?",
    opcoes: [
      {
        texto: "0,30",
        porque:
          "0,30 é para subsídios NÃO destinados à exploração. Os destinados à exploração têm 0,10.",
      },
      {
        texto: "0,15",
        porque:
          "0,15 é para vendas de bens e restauração, não para subsídios.",
      },
      {
        texto: "0,35",
        porque:
          "0,35 é para outros serviços, não para subsídios.",
      },
      {
        texto: "0,10",
        porque:
          "Subsídios destinados à exploração e restantes rendimentos da categoria B têm coeficiente 0,10. Correto.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 31.º, n.º 1, al. f) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-81",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um agricultor recebe um subsídio não destinado à exploração (investimento) de 20.000 €. Qual o rendimento tributável no regime simplificado?",
    opcoes: [
      {
        texto: "2.000 € (20.000 × 0,10)",
        porque:
          "0,10 é para subsídios destinados à exploração — os não destinados à exploração têm coeficiente 0,30.",
      },
      {
        texto: "6.000 € (20.000 × 0,30)",
        porque:
          "Subsídios não destinados à exploração: 20.000 × 0,30 = 6.000 €. Correto.",
      },
      {
        texto: "7.000 € (20.000 × 0,35)",
        porque:
          "0,35 é para outros serviços, não para subsídios não destinados à exploração.",
      },
      {
        texto: "20.000 € (totalidade)",
        porque:
          "Tributar 100% seria o coeficiente 1,00 (transparência fiscal) — subsídios não destinados à exploração têm 0,30.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. e) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-82",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um freelancer recebe um subsídio de exploração de 5.000 € (para cobrir custos operacionais). Qual o rendimento tributável?",
    opcoes: [
      {
        texto: "500 € (5.000 × 0,10)",
        porque:
          "Subsídios destinados à exploração têm coeficiente 0,10: 5.000 × 0,10 = 500 €. Correto.",
      },
      {
        texto: "1.500 € (5.000 × 0,30)",
        porque:
          "0,30 é para subsídios NÃO destinados à exploração — aqui o subsídio é destinado à exploração.",
      },
      {
        texto: "1.750 € (5.000 × 0,35)",
        porque:
          "0,35 é para outros serviços, não para subsídios.",
      },
      {
        texto: "750 € (5.000 × 0,15)",
        porque:
          "0,15 é para vendas/restauração, não para subsídios de exploração.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 31.º, n.º 1, al. f) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-83",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Qual a diferença entre 'subsídio destinado à exploração' e 'subsídio não destinado à exploração'?",
    opcoes: [
      {
        texto: "Exploração: financia custos operacionais correntes (coef. 0,10) / Não exploração: financia investimento em ativos (coef. 0,30)",
        porque:
          "Os subsídios destinados à exploração cobrem custos correntes da atividade (0,10), enquanto os não destinados à exploração financiam investimentos/ativos (0,30). Correto.",
      },
      {
        texto: "Exploração: coef. 0,30 / Não exploração: coef. 0,10",
        porque:
          "É ao contrário: exploração tem 0,10 e não exploração tem 0,30.",
      },
      {
        texto: "São iguais — ambos com coeficiente 0,15",
        porque:
          "Têm coeficientes diferentes: 0,10 (exploração) e 0,30 (não exploração).",
      },
      {
        texto: "Exploração: isento / Não exploração: coef. 1,00",
        porque:
          "Nenhum dos dois é isento nem tem coeficiente 1,00.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 31.º, n.º 1, al. e) e f) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-84",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um agricultor recebe 10.000 € de subsídio de exploração e 15.000 € de subsídio de investimento (não exploração), além de 40.000 € de vendas. Qual o rendimento tributável total?",
    opcoes: [
      {
        texto: "11.500 € (65.000 × 0,15 + ajustes)",
        porque:
          "Não se pode aplicar um único coeficiente a tudo — cada tipo de rendimento tem o seu coeficiente.",
      },
      {
        texto: "11.500 € (40.000 × 0,15 + 15.000 × 0,30 + 10.000 × 0,10)",
        porque:
          "Vendas: 40.000 × 0,15 = 6.000 €. Sub. não exploração: 15.000 × 0,30 = 4.500 €. Sub. exploração: 10.000 × 0,10 = 1.000 €. Total: 11.500 €. Correto.",
      },
      {
        texto: "9.750 € (65.000 × 0,15)",
        porque:
          "Não se pode aplicar 0,15 a tudo — os subsídios têm coeficientes próprios (0,30 e 0,10).",
      },
      {
        texto: "22.750 € (65.000 × 0,35)",
        porque:
          "0,35 aplica-se a outros serviços — vendas têm 0,15 e subsídios têm coeficientes específicos.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. a), e) e f) CIRS",
    fonte: fonte("art31"),
  },
  // ── rs-85 a rs-93: Atividades mistas ────────────────────────────────
  {
    id: "rs-85",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um contribuinte vende artesanato (20.000 €) e presta serviços de formação fora do Art. 151.º (15.000 €). Qual o rendimento tributável?",
    opcoes: [
      {
        texto: "5.250 € (35.000 × 0,15)",
        porque:
          "Não se pode aplicar 0,15 a tudo — os serviços de formação têm coeficiente 0,35.",
      },
      {
        texto: "8.250 € (20.000 × 0,15 + 15.000 × 0,35)",
        porque:
          "Vendas: 20.000 × 0,15 = 3.000 €. Serviços: 15.000 × 0,35 = 5.250 €. Total: 8.250 €. Correto.",
      },
      {
        texto: "12.250 € (35.000 × 0,35)",
        porque:
          "Não se pode aplicar 0,35 a tudo — as vendas de artesanato têm coeficiente 0,15.",
      },
      {
        texto: "26.250 € (35.000 × 0,75)",
        porque:
          "0,75 é para profissões do Art. 151.º — nenhuma destas atividades se enquadra.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. a) e c) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-86",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Uma arquiteta (Art. 151.º) fatura 40.000 € de serviços de arquitetura e recebe 8.000 € de royalties de um livro técnico. Qual o rendimento tributável total?",
    opcoes: [
      {
        texto: "37.600 € (40.000 × 0,75 + 8.000 × 0,95)",
        porque:
          "Arquitetura (Art. 151.º): 40.000 × 0,75 = 30.000 €. Royalties: 8.000 × 0,95 = 7.600 €. Total: 37.600 €. Correto.",
      },
      {
        texto: "36.000 € (48.000 × 0,75)",
        porque:
          "Não se aplica o mesmo coeficiente a ambos — os royalties têm coeficiente próprio (0,95).",
      },
      {
        texto: "16.800 € (48.000 × 0,35)",
        porque:
          "0,35 é para serviços fora do Art. 151.º — ambas as atividades têm coeficientes diferentes e mais altos.",
      },
      {
        texto: "48.000 € (tributação total)",
        porque:
          "Tributar 100% seria com coeficiente 1,00 (transparência fiscal), que não se aplica aqui.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 31.º, n.º 1, al. b) e d) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-87",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um contribuinte tem três fontes de rendimento: consultoria (fora Art. 151.º) de 25.000 €, vendas online de 10.000 € e serviços a uma sociedade onde detém 6% de 15.000 €. Qual o rendimento tributável total?",
    opcoes: [
      {
        texto: "25.250 € (25.000 × 0,35 + 10.000 × 0,15 + 15.000 × 0,35)",
        porque:
          "Os serviços à sociedade participada (6% ≥ 5%) devem ter coeficiente 1,00, não 0,35.",
      },
      {
        texto: "25.250 € (50.000 × 0,35 + ajustes)",
        porque:
          "Não se pode aplicar um único coeficiente — cada tipo de rendimento tem o seu.",
      },
      {
        texto: "24.750 € (25.000 × 0,35 + 10.000 × 0,15 + 15.000 × 1,00)",
        porque:
          "Consultoria: 25.000 × 0,35 = 8.750 €. Vendas: 10.000 × 0,15 = 1.500 €. Sociedade (6%): 15.000 × 1,00 = 15.000 €. Total: 25.250 €. Recalculando: 8.750 + 1.500 + 15.000 = 25.250 €, não 24.750 €.",
      },
      {
        texto: "25.250 € (25.000 × 0,35 + 10.000 × 0,15 + 15.000 × 1,00)",
        porque:
          "Consultoria: 8.750 €. Vendas: 1.500 €. Sociedade participada: 15.000 €. Total: 25.250 €. Correto.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 31.º, n.º 1, al. a), c) e g) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-88",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um contribuinte presta serviços de engenharia (Art. 151.º, 50.000 €) e vende equipamentos (10.000 €). Qual o rendimento tributável?",
    opcoes: [
      {
        texto: "45.000 € (60.000 × 0,75)",
        porque:
          "As vendas de equipamentos têm coeficiente 0,15, não 0,75 — não se pode aplicar o mesmo coeficiente.",
      },
      {
        texto: "39.000 € (50.000 × 0,75 + 10.000 × 0,15)",
        porque:
          "Engenharia: 50.000 × 0,75 = 37.500 €. Vendas: 10.000 × 0,15 = 1.500 €. Total: 39.000 €. Correto.",
      },
      {
        texto: "21.000 € (60.000 × 0,35)",
        porque:
          "0,35 é para serviços fora do Art. 151.º — engenharia consta na tabela (0,75).",
      },
      {
        texto: "37.500 € (50.000 × 0,75, ignorando vendas)",
        porque:
          "As vendas de equipamentos (10.000 €) também são tributáveis — com coeficiente 0,15.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. a) e b) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-89",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Se um contribuinte exerce atividades sujeitas a coeficientes diferentes, como se calcula o rendimento tributável?",
    opcoes: [
      {
        texto: "Aplica-se o coeficiente mais alto a todo o rendimento",
        porque:
          "Cada tipo de rendimento é tributado com o seu próprio coeficiente — não se usa o mais alto para tudo.",
      },
      {
        texto: "Aplica-se o coeficiente mais baixo a todo o rendimento",
        porque:
          "Cada tipo de rendimento tem o seu coeficiente — não se beneficia do mais baixo para tudo.",
      },
      {
        texto: "Faz-se a média dos coeficientes",
        porque:
          "Não se calcula uma média — cada parcela de rendimento usa o seu coeficiente.",
      },
      {
        texto: "Aplica-se o coeficiente respetivo a cada tipo de rendimento e somam-se os resultados",
        porque:
          "Cada parcela de rendimento é multiplicada pelo coeficiente que lhe corresponde, e os resultados são somados. Correto.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 31.º, n.º 1 CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-90",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um contribuinte no 1.º ano de atividade tem: serviços (Art. 151.º) de 30.000 € e royalties de 10.000 €. Qual o rendimento tributável com a redução de início de atividade?",
    opcoes: [
      {
        texto: "16.250 €",
        porque:
          "Seria (30.000 × 0,75 + 10.000 × 0,95) × 0,50 = (22.500 + 9.500) × 0,50 = 16.000 €, não 16.250 €.",
      },
      {
        texto: "16.000 €",
        porque:
          "Base: 30.000 × 0,75 = 22.500 €; 10.000 × 0,95 = 9.500 €. Total base: 32.000 €. Com redução de 50% (1.º ano): 16.000 €. Correto.",
      },
      {
        texto: "32.000 €",
        porque:
          "Seria sem a redução de 50% do 1.º ano — falta aplicar a redução.",
      },
      {
        texto: "20.000 € (40.000 × 0,50)",
        porque:
          "Não se pode aplicar 0,50 como coeficiente uniforme — cada rendimento tem o seu coeficiente.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1 e n.º 10 CIRS",
    fonte: fonte("art31"),
  },
  // ── rs-91 a rs-95: Interação com escalões de IRS ────────────────────
  {
    id: "rs-91",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "No regime simplificado, o coeficiente substitui os escalões de IRS?",
    opcoes: [
      {
        texto: "Sim — paga-se o coeficiente como taxa final de imposto",
        porque:
          "O coeficiente não é uma taxa de imposto — determina o rendimento tributável, que depois é sujeito aos escalões de IRS.",
      },
      {
        texto: "Não — o coeficiente determina o rendimento tributável, que depois é tributado nos escalões normais de IRS",
        porque:
          "O coeficiente reduz a base tributável, mas o imposto efetivo é calculado aplicando os escalões progressivos de IRS. Correto.",
      },
      {
        texto: "Sim — quem está no simplificado tem escalões especiais",
        porque:
          "Não existem escalões especiais para o regime simplificado — aplicam-se os escalões gerais ao rendimento tributável.",
      },
      {
        texto: "Depende da atividade exercida",
        porque:
          "Independentemente da atividade, o rendimento tributável (após coeficiente) é sempre sujeito aos escalões gerais.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º e Art. 68.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-92",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Dois contribuintes faturam 50.000 €: um com coeficiente 0,75 (Art. 151.º) e outro com 0,35 (fora Art. 151.º). Qual a diferença na base que entra nos escalões de IRS?",
    opcoes: [
      {
        texto: "Não há diferença — ambos entram no mesmo escalão",
        porque:
          "Há diferença: 37.500 € vs 17.500 € de rendimento tributável, que podem cair em escalões diferentes.",
      },
      {
        texto: "20.000 € de diferença (37.500 € vs 17.500 €)",
        porque:
          "Art. 151.º: 50.000 × 0,75 = 37.500 €. Fora Art. 151.º: 50.000 × 0,35 = 17.500 €. Diferença na base: 20.000 €. Correto.",
      },
      {
        texto: "5.000 € de diferença",
        porque:
          "A diferença é 37.500 − 17.500 = 20.000 €, não 5.000 €.",
      },
      {
        texto: "50.000 € de diferença",
        porque:
          "Ambos faturam 50.000 € — a diferença está no rendimento tributável, não na faturação.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º e Art. 68.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-93",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um profissional do Art. 151.º fatura 50.000 €. No regime simplificado, o rendimento tributável é 37.500 €. Se tivesse despesas reais de 30.000 € e optasse pela contabilidade organizada, o rendimento tributável seria 20.000 €. Considerando que a taxa marginal sobre a diferença (17.500 €) é de 37%, qual a poupança fiscal aproximada com a organizada?",
    opcoes: [
      {
        texto: "Cerca de 6.475 €",
        porque:
          "A diferença de base tributável é 37.500 − 20.000 = 17.500 €. A 37% marginal: 17.500 × 0,37 ≈ 6.475 €. Correto.",
      },
      {
        texto: "Cerca de 17.500 €",
        porque:
          "17.500 € é a diferença de base tributável, não a poupança de imposto.",
      },
      {
        texto: "Cerca de 3.000 €",
        porque:
          "A poupança é 17.500 × 0,37 ≈ 6.475 €, não 3.000 €.",
      },
      {
        texto: "Cerca de 12.500 €",
        porque:
          "12.500 € não corresponde a nenhuma fórmula válida neste cenário.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 28.º, 31.º e 68.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  // ── rs-94 a rs-97: Profissões específicas e enquadramento ──────────
  {
    id: "rs-94",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Um solicitador (profissão do Art. 151.º CIRS) fatura 45.000 €. Qual o coeficiente aplicável?",
    opcoes: [
      {
        texto: "0,35 — como outros serviços",
        porque:
          "O solicitador consta na tabela do Art. 151.º — o seu coeficiente é 0,75, não 0,35.",
      },
      {
        texto: "0,75 — como profissão liberal do Art. 151.º",
        porque:
          "O solicitador (código 6010) é uma profissão do Art. 151.º CIRS, com coeficiente 0,75. Correto.",
      },
      {
        texto: "0,15 — como vendas de bens",
        porque:
          "0,15 é para vendas e restauração — solicitadores prestam serviços profissionais.",
      },
      {
        texto: "0,95 — como propriedade intelectual",
        porque:
          "0,95 é para rendimentos de propriedade intelectual, não para serviços de solicitadoria.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. b) CIRS · Art. 151.º CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-95",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um coach de vida (life coach) não consta na tabela do Art. 151.º. Qual o coeficiente aplicável no regime simplificado?",
    opcoes: [
      {
        texto: "0,75 — todas as prestações de serviços",
        porque:
          "0,75 é exclusivo das profissões do Art. 151.º. Atividades fora dessa tabela têm 0,35.",
      },
      {
        texto: "0,35 — prestação de serviços fora do Art. 151.º",
        porque:
          "Atividades de prestação de serviços não previstas no Art. 151.º enquadram-se no coeficiente 0,35. Correto.",
      },
      {
        texto: "0,15 — porque é similar a formação",
        porque:
          "0,15 é para vendas/restauração — coaching é prestação de serviços, com coeficiente 0,35.",
      },
      {
        texto: "0,95 — porque é propriedade intelectual",
        porque:
          "Coaching não é propriedade intelectual — é prestação de serviços fora do Art. 151.º.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. c) CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-96",
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta:
      "Um economista (código 1321 do Art. 151.º) e um consultor financeiro (fora do Art. 151.º) exercem funções semelhantes. Porque têm coeficientes diferentes?",
    opcoes: [
      {
        texto: "Não têm — ambos usam 0,75",
        porque:
          "Apenas o economista (Art. 151.º) tem 0,75. O consultor financeiro fora da tabela tem 0,35.",
      },
      {
        texto: "Porque a tabela do Art. 151.º define taxativamente as profissões com coeficiente 0,75 — o enquadramento depende do código de atividade, não da função exercida",
        porque:
          "O coeficiente depende do enquadramento formal na tabela do Art. 151.º, e não da semelhança de funções. Correto.",
      },
      {
        texto: "Porque o consultor fatura menos",
        porque:
          "O coeficiente não depende do valor faturado — depende da classificação da atividade.",
      },
      {
        texto: "Porque o economista tem formação superior",
        porque:
          "A formação académica não determina o coeficiente — é o código de atividade na tabela do Art. 151.º.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, al. b) e c) CIRS · Art. 151.º CIRS",
    fonte: fonte("art31"),
  },
  {
    id: "rs-97",
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta:
      "Um médico veterinário é uma profissão prevista no Art. 151.º CIRS. Qual o coeficiente no regime simplificado?",
    opcoes: [
      {
        texto: "0,15",
        porque:
          "0,15 é para vendas de bens e restauração — um veterinário presta serviços profissionais.",
      },
      {
        texto: "0,35",
        porque:
          "0,35 é para serviços fora do Art. 151.º — mas o veterinário consta na tabela.",
      },
      {
        texto: "0,75",
        porque:
          "O médico veterinário (Art. 151.º CIRS) tem coeficiente 0,75. Correto.",
      },
      {
        texto: "0,95",
        porque:
          "0,95 é para propriedade intelectual, não para serviços veterinários.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 1, al. b) CIRS · Art. 151.º CIRS",
    fonte: fonte("art31"),
  },
  // ── rs-98 a rs-100: Conceitos avançados combinados ──────────────────
  {
    id: "rs-98",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um advogado (Art. 151.º) no 2.º ano de atividade fatura 60.000 € e justifica 6.000 € em despesas. Qual o rendimento tributável final, considerando regra dos 15% e redução de 2.º ano?",
    opcoes: [
      {
        texto: "36.000 €",
        porque:
          "Seria (60.000 × 0,75 + 3.000) × 0,75, mas o cálculo correto dá um valor diferente.",
      },
      {
        texto: "33.750 €",
        porque:
          "Base: 60.000 × 0,75 = 45.000 €. 15% de 60.000 = 9.000 €; justificou 6.000 €; faltam 3.000 €. Subtotal: 48.000 €. Redução 25% (2.º ano): 48.000 × 0,75 = 36.000 €. Não dá 33.750 €.",
      },
      {
        texto: "36.000 €",
        porque:
          "Base: 45.000 €. Regra 15%: +3.000 €. Subtotal: 48.000 €. Redução 25% (2.º ano): 48.000 × 0,75 = 36.000 €. Correto.",
      },
      {
        texto: "45.000 €",
        porque:
          "Seria apenas 60.000 × 0,75, sem regra dos 15% nem redução de 2.º ano.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 2 e n.º 10 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-99",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Um contribuinte no 1.º ano tem: consultoria (fora Art. 151.º) 40.000 €, vendas 20.000 €, e serviços a sociedade participada (7%) 10.000 €. Sem despesas justificadas. Qual o rendimento tributável, incluindo regra dos 15% e redução de início de atividade?",
    opcoes: [
      {
        texto: "14.500 €",
        porque:
          "Consultoria: 40.000 × 0,35 = 14.000 €. Vendas: 20.000 × 0,15 = 3.000 €. Sociedade: 10.000 × 1,00 = 10.000 €. Regra 15% sobre os 40.000 de consultoria (coef. 0,35): 40.000 × 0,15 = 6.000 € não justificados. Subtotal: 33.000 €. Redução 50%: 16.500 €. Não dá 14.500 €.",
      },
      {
        texto: "16.500 €",
        porque:
          "Consultoria: 14.000 €. Vendas: 3.000 €. Sociedade: 10.000 €. Regra 15% (coef. 0,35 dos 40.000): +6.000 €. Subtotal: 33.000 €. Redução 50% (1.º ano): 16.500 €. Correto.",
      },
      {
        texto: "13.500 €",
        porque:
          "Este valor não resulta da combinação correta dos cálculos.",
      },
      {
        texto: "27.000 €",
        porque:
          "Seria sem aplicar a redução de 50% do 1.º ano.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1, n.º 2 e n.º 10 CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
  {
    id: "rs-100",
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta:
      "Qual das seguintes afirmações sobre o regime simplificado está INCORRETA?",
    opcoes: [
      {
        texto: "O coeficiente 0,95 aplica-se a rendimentos de propriedade intelectual",
        porque:
          "Esta afirmação está correta — a propriedade intelectual tem coeficiente 0,95.",
      },
      {
        texto: "A regra dos 15% aplica-se a todos os coeficientes, incluindo 0,15 e 0,95",
        porque:
          "INCORRETO: a regra dos 15% aplica-se apenas aos coeficientes 0,75 e 0,35. Não se aplica ao 0,15, 0,95 ou 1,00. Correto — esta é a afirmação incorreta.",
      },
      {
        texto: "No 1.º ano de atividade há uma redução de 50% no rendimento tributável",
        porque:
          "Esta afirmação está correta — a redução do 1.º ano é de 50%.",
      },
      {
        texto: "O limite para permanecer no regime simplificado é de 200.000 € brutos anuais",
        porque:
          "Esta afirmação está correta — o limite é de 200.000 €.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º CIRS",
    fonte: fonte("occRegimeSimplificado"),
  },
];
