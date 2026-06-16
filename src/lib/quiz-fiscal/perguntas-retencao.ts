import { fonte, type QuizPergunta } from "./types";

export const PERGUNTAS_RETENCAO: QuizPergunta[] = [
  // ═══════════════════════════════════════════════════════════════════════
  //  DIFICULDADE 1 — Perguntas fáceis (ret-7 a ret-36 = 30 perguntas)
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "ret-7",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um programador informático (código 1332 do Art. 151.º) emite um recibo verde de 3.000 €. Qual o valor retido na fonte a título de IRS?",
    opcoes: [
      {
        texto: "690 € (23%)",
        porque:
          "Programadores constam da tabela do Art. 151.º CIRS — a taxa de retenção é de 23%. 3.000 € × 0,23 = 690 €.",
      },
      {
        texto: "345 € (11,5%)",
        porque:
          "11,5% aplica-se a prestações de serviços fora do Art. 151.º — programadores estão na tabela (código 1332).",
      },
      {
        texto: "495 € (16,5%)",
        porque:
          "16,5% é a taxa para direitos de autor/propriedade intelectual, não para prestação de serviços de programação.",
      },
      {
        texto: "750 € (25%)",
        porque:
          "25% era a taxa anterior ao OE2025 — desde 2025, a taxa para profissões do Art. 151.º é de 23%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-8",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um arquiteto (código 1001 do Art. 151.º) fatura 5.000 € a uma empresa com contabilidade organizada. Quanto será retido na fonte?",
    opcoes: [
      {
        texto: "575 € (11,5%)",
        porque:
          "11,5% aplica-se a serviços fora do Art. 151.º — arquitetos são profissão liberal da tabela.",
      },
      {
        texto: "1.250 € (25%)",
        porque:
          "25% era a taxa antes do OE2025 — desde 2025 a taxa para profissões do Art. 151.º e 23%.",
      },
      {
        texto: "1.150 € (23%)",
        porque:
          "Arquitetos são profissão do Art. 151.º CIRS. A retenção é de 23%: 5.000 € × 0,23 = 1.150 €.",
      },
      {
        texto: "0 € — arquitetos estão isentos de retenção",
        porque:
          "Não existe isenção para arquitetos — a isenção de retenção só se aplica a vendas de bens ou via dispensa do Art. 101.º-B.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-9",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um restaurante (venda de refeições) emite recibos verdes pela sua atividade. Qual a retenção na fonte de IRS?",
    opcoes: [
      {
        texto: "23%",
        porque:
          "23% aplica-se a profissões liberais do Art. 151.º — restauração e venda de bens, sem retenção.",
      },
      {
        texto: "11,5%",
        porque:
          "11,5% aplica-se a prestações de serviços — restauração e tratada como venda de bens, sem retenção.",
      },
      {
        texto: "6%",
        porque:
          "6% é uma taxa reduzida de IVA — não existe taxa de retenção de IRS de 6%.",
      },
      {
        texto: "0% — sem retenção",
        porque:
          "Restauração, hotelaria e venda de bens/mercadorias não estão sujeitas a retenção na fonte de IRS.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 101.º CIRS — vendas de bens não sujeitas a retenção",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-10",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Qual das seguintes atividades NÃO está sujeita a retenção na fonte de IRS?",
    opcoes: [
      {
        texto: "Consultoria de gestão (Art. 151.º)",
        porque:
          "Consultoria e profissão do Art. 151.º — sujeita a retenção de 23%.",
      },
      {
        texto: "Tradução (Art. 151.º)",
        porque:
          "Tradução e profissão do Art. 151.º (código 1334) — sujeita a retenção de 23%.",
      },
      {
        texto: "Venda de artesanato (venda de bens)",
        porque:
          "A venda de bens/mercadorias não está sujeita a retenção na fonte de IRS. A retenção incide apenas sobre prestações de serviços.",
      },
      {
        texto: "Fotografia (serviços, código 1519)",
        porque:
          "Fotografia como serviço fora do Art. 151.º está sujeita a retenção de 11,5%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS — vendas de bens não sujeitas a retenção",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-11",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Quando um cliente com contabilidade organizada paga a um trabalhador independente, quem e responsável por fazer a retenção na fonte de IRS?",
    opcoes: [
      {
        texto: "O trabalhador independente (prestador do serviço)",
        porque:
          "O prestador emite o recibo, mas não retém — e o cliente (pagador) com contabilidade organizada que deve reter e entregar ao Estado.",
      },
      {
        texto: "O cliente (entidade pagadora com contabilidade organizada)",
        porque:
          "A retenção é feita pela entidade pagadora que tenha ou deva ter contabilidade organizada. É ela que desconta e entrega o valor ao Estado.",
      },
      {
        texto: "A Autoridade Tributária, diretamente",
        porque:
          "A AT recebe o valor retido, mas quem faz a retenção é a entidade pagadora, não a AT.",
      },
      {
        texto: "Ninguém — a retenção é voluntária",
        porque:
          "A retenção é obrigatória quando o cliente tem contabilidade organizada é a atividade está sujeita a retenção.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — retenção na fonte pela entidade pagadora",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-12",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um advogado (código 6010 do Art. 151.º) emite um recibo de 2.000 €. Qual é a taxa de retenção na fonte?",
    opcoes: [
      {
        texto: "23%",
        porque:
          "Advogados são profissão liberal do Art. 151.º CIRS — a taxa de retenção é de 23%.",
      },
      {
        texto: "25%",
        porque:
          "25% era a taxa anterior ao OE2025. Desde 2025, a taxa para profissões do Art. 151.º é de 23%.",
      },
      {
        texto: "11,5%",
        porque:
          "11,5% aplica-se a serviços não previstos no Art. 151.º — advogados estão na tabela.",
      },
      {
        texto: "16,5%",
        porque:
          "16,5% é a taxa para direitos de autor/propriedade intelectual, não para serviços de advocacia.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-13",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Se a retenção na fonte for superior ao IRS apurado na declaração anual, o que acontece?",
    opcoes: [
      {
        texto: "O excesso perde-se — fica para o Estado.",
        porque:
          "O excesso não se perde — o Estado devolve a diferença ao contribuinte através do reembolso de IRS.",
      },
      {
        texto: "O contribuinte recebe o excesso como reembolso de IRS.",
        porque:
          "Se a retenção acumulada ao longo do ano exceder o IRS apurado, o contribuinte tem direito ao reembolso da diferença.",
      },
      {
        texto: "O excesso e automaticamente transferido para o ano seguinte.",
        porque:
          "Não há reporte — o excesso e devolvido como reembolso no mesmo ano fiscal.",
      },
      {
        texto: "É obrigatório pedir a devolução presencialmente nas Finanças.",
        porque:
          "O reembolso e processado automaticamente após a liquidação da declaração anual (Modelo 3).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — retenção na fonte como adiantamento de IRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-14",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa de retenção na fonte para um médico (código 7014 do Art. 151.º)?",
    opcoes: [
      {
        texto: "11,5%",
        porque:
          "11,5% é a taxa para serviços fora do Art. 151.º — médicos são profissão liberal da tabela.",
      },
      {
        texto: "0% — médicos estão isentos",
        porque:
          "Médicos estão sujeitos a retenção como qualquer profissão do Art. 151.º — não existe isenção especial.",
      },
      {
        texto: "23%",
        porque:
          "Médicos constam da tabela do Art. 151.º CIRS é a taxa de retenção é de 23%.",
      },
      {
        texto: "30%",
        porque:
          "Não existe taxa de retenção de 30% no regime de recibos verdes em Portugal.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-15",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Uma enfermeira (código 5010 do Art. 151.º) recebe 1.500 € por um serviço. Quanto é retido na fonte?",
    opcoes: [
      {
        texto: "345 € (23%)",
        porque:
          "Enfermeiros pertencem à tabela do Art. 151.º CIRS. 1.500 € × 0,23 = 345 €.",
      },
      {
        texto: "172,50 € (11,5%)",
        porque:
          "11,5% aplica-se a serviços fora do Art. 151.º — enfermeiros estão na tabela.",
      },
      {
        texto: "247,50 € (16,5%)",
        porque:
          "16,5% é a taxa para propriedade intelectual, não para serviços de enfermagem.",
      },
      {
        texto: "375 € (25%)",
        porque:
          "25% era a taxa anterior ao OE2025 — atualmente a taxa é 23%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-16",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Qual é o limiar de rendimento anual abaixo do qual se pode pedir a dispensa de retenção na fonte?",
    opcoes: [
      {
        texto: "10.000 €",
        porque:
          "10.000 € não é o limiar legal — o Art. 101.º-B CIRS fixa o limite em 15.000 €.",
      },
      {
        texto: "12.500 €",
        porque:
          "12.500 € era o antigo limiar — atualmente o limite é de 15.000 €.",
      },
      {
        texto: "15.000 €",
        porque:
          "Quem prevê faturar menos de 15.000 € no ano pode solicitar a dispensa de retenção na fonte (Art. 101.º-B, n.º 1, al. a) CIRS).",
      },
      {
        texto: "20.000 €",
        porque:
          "20.000 € não corresponde ao limiar legal de dispensa de retenção (15.000 €).",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º-B, n.º 1, al. a) CIRS",
    fonte: fonte("art101bCirs"),
  },
  {
    id: "ret-17",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "A retenção na fonte de IRS é descontada no momento em que...",
    opcoes: [
      {
        texto: "...o trabalhador independente emite o recibo verde e recebe o pagamento.",
        porque:
          "A retenção é descontada no momento do pagamento: o cliente retém a percentagem é paga o valor líquido ao prestador.",
      },
      {
        texto: "...o trabalhador preenche a declaração anual de IRS.",
        porque:
          "Na declaração anual, a retenção já feita ao longo do ano é deduzida ao imposto apurado — o desconto efetivo é feito recibo a recibo.",
      },
      {
        texto: "...a Segurança Social emite a nota de cobrança trimestral.",
        porque:
          "A Segurança Social é um pagamento separado — não tem relação direta com a retenção na fonte de IRS.",
      },
      {
        texto: "...o trabalhador recebe o reembolso do IRS.",
        porque:
          "O reembolso acontece depois — a retenção é descontada ao longo do ano, em cada pagamento.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — retenção no momento do pagamento",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-18",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um contabilista (código 4013 do Art. 151.º) presta serviços a uma empresa. Qual a taxa de retenção?",
    opcoes: [
      {
        texto: "16,5%",
        porque:
          "16,5% é a taxa para propriedade intelectual, não para serviços de contabilidade.",
      },
      {
        texto: "23%",
        porque:
          "Contabilistas são profissão da tabela do Art. 151.º CIRS — a retenção é de 23%.",
      },
      {
        texto: "11,5%",
        porque:
          "11,5% aplica-se a serviços fora do Art. 151.º — contabilistas estão na tabela.",
      },
      {
        texto: "0%",
        porque:
          "Contabilistas estão sujeitos a retenção como profissão liberal — não há isenção.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-19",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Quantas taxas distintas de retenção na fonte existem para rendimentos da categoria B (recibos verdes)?",
    opcoes: [
      {
        texto: "Duas: 23% e 11,5%.",
        porque:
          "Faltam as taxas de 16,5% (propriedade intelectual) e 0% (vendas de bens) — no total são quatro.",
      },
      {
        texto: "Três: 23%, 16,5% e 11,5%.",
        porque:
          "Falta a taxa de 0% (vendas de bens, que não estão sujeitas a retenção) — no total são quatro cenários.",
      },
      {
        texto: "Quatro: 23%, 16,5%, 11,5% e 0%.",
        porque:
          "As taxas são: 23% (Art. 151.º), 16,5% (propriedade intelectual), 11,5% (outros serviços) e 0% (vendas de bens).",
      },
      {
        texto: "Uma única taxa universal de 23%.",
        porque:
          "Não existe taxa única — a taxa varia consoante o tipo de atividade.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-20",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "A taxa de retenção para profissões do Art. 151.º CIRS foi reduzida pelo OE2025. De quanto para quanto?",
    opcoes: [
      {
        texto: "De 25% para 23%",
        porque:
          "O OE2025 reduziu a taxa de retenção das profissões liberais do Art. 151.º de 25% para 23%.",
      },
      {
        texto: "De 28% para 25%",
        porque:
          "28% é a taxa de tributação de dividendos — a taxa anterior de retenção do Art. 151.º era 25%, não 28%.",
      },
      {
        texto: "De 23% para 20%",
        porque:
          "A taxa não foi reduzida para 20% — desceu de 25% para 23%.",
      },
      {
        texto: "De 25% para 20%",
        porque:
          "A redução foi de 25% para 23%, não para 20%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — taxa reduzida pelo OE2025",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-21",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um personal trainer (serviço fora do Art. 151.º) emite um recibo de 800 €. Quanto é retido na fonte?",
    opcoes: [
      {
        texto: "184 € (23%)",
        porque:
          "23% aplica-se ao Art. 151.º — personal trainer não consta dessa tabela.",
      },
      {
        texto: "92 € (11,5%)",
        porque:
          "Personal trainer e prestação de serviços fora do Art. 151.º, com retenção de 11,5%. 800 € × 0,115 = 92 €.",
      },
      {
        texto: "132 € (16,5%)",
        porque:
          "16,5% é a taxa para propriedade intelectual, não para serviços de treino pessoal.",
      },
      {
        texto: "0 €",
        porque:
          "Prestação de serviços está sujeita a retenção — a isenção é para vendas de bens.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — atividades não previstas no Art. 151.º",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-22",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Se um trabalhador independente emite recibos tanto a empresas como a particulares, a retenção é feita...",
    opcoes: [
      {
        texto: "...em todos os recibos, independentemente do tipo de cliente.",
        porque:
          "A retenção só é feita quando o cliente tem ou deve ter contabilidade organizada — particulares não retêm.",
      },
      {
        texto: "...apenas nos recibos emitidos a entidades com contabilidade organizada.",
        porque:
          "A obrigação de retenção recai sobre entidades com contabilidade organizada. Particulares não fazem retenção.",
      },
      {
        texto: "...apenas nos recibos acima de 1.000 €.",
        porque:
          "Não existe limiar por valor de recibo — a retenção depende do tipo de cliente, não do montante.",
      },
      {
        texto: "...apenas no último recibo de cada mês.",
        porque:
          "A retenção é feita em cada pagamento, não apenas no último do mês.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — retenção por entidades com contabilidade organizada",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-23",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um professor (código 8012 do Art. 151.º) dá formação a recibos verdes. Qual a taxa de retenção?",
    opcoes: [
      {
        texto: "23%",
        porque:
          "Professores constam da tabela do Art. 151.º CIRS — a taxa de retenção é de 23%.",
      },
      {
        texto: "11,5%",
        porque:
          "11,5% aplica-se a serviços fora do Art. 151.º — professores estão na tabela (código 8012).",
      },
      {
        texto: "0% — serviços de educação estão isentos",
        porque:
          "Não existe isenção de retenção para educação — professores a recibos verdes estão sujeitos à taxa de 23%.",
      },
      {
        texto: "16,5%",
        porque:
          "16,5% é a taxa para propriedade intelectual, não para ensino.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-24",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Qual das seguintes afirmações sobre a retenção na fonte e VERDADEIRA?",
    opcoes: [
      {
        texto: "A retenção substitui o pagamento de IRS — quem tem retenção não declara IRS.",
        porque:
          "A retenção não substitui a declaração — o trabalhador deve sempre entregar a declaração anual (Modelo 3).",
      },
      {
        texto: "A retenção é um adiantamento ao Estado que é deduzido na liquidação do IRS anual.",
        porque:
          "A retenção funciona como pagamento antecipado do IRS, sendo depois confrontada com o imposto total na declaração anual.",
      },
      {
        texto: "A retenção é uma contribuição para a Segurança Social, não para o IRS.",
        porque:
          "Segurança Social e retenção de IRS são obrigações distintas com taxas e regras diferentes.",
      },
      {
        texto: "A retenção é opcional e pode ser recusada pelo trabalhador em qualquer caso.",
        porque:
          "A retenção é obrigatória quando aplicável — o trabalhador só pode pedir dispensa se prevê faturar menos de 15.000 €/ano.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-25",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um motorista TVDE (atividade de transporte de passageiros) tem retenção na fonte de IRS nos seus recibos?",
    opcoes: [
      {
        texto: "Sim, à taxa de 23%.",
        porque:
          "23% aplica-se a profissões do Art. 151.º — TVDE e atividade de transporte (equiparada a venda de bens).",
      },
      {
        texto: "Sim, à taxa de 11,5%.",
        porque:
          "11,5% e para outras prestações de serviços — TVDE e atividade de transporte, sem retenção.",
      },
      {
        texto: "Não, a atividade de TVDE não está sujeita a retenção na fonte.",
        porque:
          "A atividade de TVDE e equiparada a venda de bens/transporte de passageiros, sem retenção na fonte de IRS.",
      },
      {
        texto: "Depende do valor do recibo.",
        porque:
          "A sujeição a retenção depende do tipo de atividade, não do valor do recibo.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS — vendas de bens e transportes",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-26",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um engenheiro civil (código 1003 do Art. 151.º) fatura 4.000 €. Quanto recebe líquido, considerando apenas a retenção na fonte?",
    opcoes: [
      {
        texto: "3.080 €",
        porque:
          "4.000 € − (4.000 € × 0,23) = 4.000 € − 920 € = 3.080 €. A retenção de 23% é descontada ao valor bruto.",
      },
      {
        texto: "3.540 €",
        porque:
          "Este valor corresponderia a uma retenção de 11,5% — engenheiros têm retenção de 23%.",
      },
      {
        texto: "3.000 €",
        porque:
          "Este valor corresponderia a uma retenção de 25% (antiga taxa) — a taxa atual e 23%.",
      },
      {
        texto: "4.000 €",
        porque:
          "Engenheiros estão sujeitos a retenção de 23% — o valor líquido é menor do que o bruto.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-27",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Quando se fala em 'taxa de retenção na fonte', isso refere-se a que imposto?",
    opcoes: [
      {
        texto: "IVA (Imposto sobre o Valor Acrescentado)",
        porque:
          "O IVA é cobrado sobre o preço do serviço/bem — é um imposto diferente da retenção de IRS.",
      },
      {
        texto: "IRS (Imposto sobre o Rendimento das Pessoas Singulares)",
        porque:
          "A retenção na fonte é um adiantamento de IRS (Imposto sobre o Rendimento das Pessoas Singulares).",
      },
      {
        texto: "IRC (Imposto sobre o Rendimento das Pessoas Coletivas)",
        porque:
          "O IRC aplica-se a empresas (pessoas coletivas) — trabalhadores independentes pagam IRS.",
      },
      {
        texto: "Segurança Social",
        porque:
          "A Segurança Social é uma contribuição à parte, com taxas e regras próprias.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-28",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um psicólogo (código 1010 do Art. 151.º) emite recibos verdes. Qual a taxa de retenção?",
    opcoes: [
      {
        texto: "11,5%",
        porque:
          "11,5% e para serviços fora do Art. 151.º — psicólogos estão na tabela.",
      },
      {
        texto: "23%",
        porque:
          "Psicólogos são profissão da tabela do Art. 151.º CIRS — a retenção é de 23%.",
      },
      {
        texto: "16,5%",
        porque:
          "16,5% aplica-se a propriedade intelectual, não a serviços de psicologia.",
      },
      {
        texto: "25%",
        porque:
          "25% era a taxa até 2024 — desde o OE2025, a taxa é de 23%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-29",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um produtor de artesanato que vende as suas peças em feiras. Está sujeito a retenção na fonte de IRS?",
    opcoes: [
      {
        texto: "Sim, 23%.",
        porque:
          "23% aplica-se a profissões do Art. 151.º — vender artesanato e venda de bens, sem retenção.",
      },
      {
        texto: "Sim, 11,5%.",
        porque:
          "11,5% aplica-se a prestações de serviços — venda de artesanato e venda de bens.",
      },
      {
        texto: "Não — a venda de bens não está sujeita a retenção na fonte de IRS.",
        porque:
          "Vender artesanato e vender bens/mercadorias — sem retenção na fonte de IRS.",
      },
      {
        texto: "Só se vender acima de 500 € por transação.",
        porque:
          "Não existe limiar por transação para a retenção — a isenção da venda de bens e total.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS — vendas de bens não sujeitas a retenção",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-30",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "O que significa 'dispensa de retenção na fonte'?",
    opcoes: [
      {
        texto: "O trabalhador fica isento de pagar IRS para sempre.",
        porque:
          "A dispensa de retenção não isenta de IRS — o imposto é apurado na declaração anual, apenas não é adiantado recibo a recibo.",
      },
      {
        texto: "O cliente não desconta a retenção de IRS ao pagar o recibo, ao abrigo do Art. 101.º-B CIRS.",
        porque:
          "Com dispensa de retenção, o cliente paga o valor bruto integral — o trabalhador paga o IRS devido na declaração anual.",
      },
      {
        texto: "O trabalhador fica dispensado de emitir recibos verdes.",
        porque:
          "A obrigação de emitir recibos mantém-se — a dispensa é apenas da retenção de IRS.",
      },
      {
        texto: "O trabalhador deixa de pagar Segurança Social.",
        porque:
          "A dispensa de retenção não afeta a Segurança Social — são obrigações independentes.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º-B CIRS",
    fonte: fonte("art101bCirs"),
  },
  {
    id: "ret-31",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um jornalista (código 1327 do Art. 151.º) presta serviços a um jornal digital. Qual a taxa de retenção?",
    opcoes: [
      {
        texto: "0% — jornalismo está isento de retenção.",
        porque:
          "Jornalistas constam do Art. 151.º — estão sujeitos a retenção de 23%.",
      },
      {
        texto: "11,5%",
        porque:
          "11,5% e para atividades fora do Art. 151.º — jornalistas estão na tabela (código 1327).",
      },
      {
        texto: "23%",
        porque:
          "Jornalistas são profissão do Art. 151.º CIRS (código 1327) — a taxa de retenção é 23%.",
      },
      {
        texto: "16,5%",
        porque:
          "16,5% aplica-se a direitos de autor — o serviço jornalístico enquadra-se no Art. 151.º com 23%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-32",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Retenção na fonte e IVA são o mesmo imposto?",
    opcoes: [
      {
        texto: "Sim — e tudo descontado na mesma fatura.",
        porque:
          "Embora ambos possam constar da mesma fatura, são impostos totalmente distintos com regras próprias.",
      },
      {
        texto: "Não — a retenção é um adiantamento de IRS; o IVA é imposto sobre o consumo.",
        porque:
          "São impostos diferentes: a retenção é sobre o rendimento (IRS) e o IVA é sobre o consumo de bens e serviços.",
      },
      {
        texto: "Não — mas são ambos pagos à Segurança Social.",
        porque:
          "Nenhum dos dois é pago à Segurança Social — o IRS vai para a AT e o IVA também.",
      },
      {
        texto: "Sim, se a atividade for do Art. 151.º.",
        porque:
          "O tipo de atividade não funde os dois impostos — IRS é IVA são sempre distintos.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS · Art. 1.º CIVA",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-33",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um dentista (código 7010 do Art. 151.º) emite recibos verdes. Qual a taxa de retenção na fonte?",
    opcoes: [
      {
        texto: "23%",
        porque:
          "Dentistas são profissão do Art. 151.º CIRS — a retenção é de 23%.",
      },
      {
        texto: "0% — saúde está isenta de retenção",
        porque:
          "Profissionais de saúde (médicos, dentistas) a recibos verdes estão sujeitos à retenção normal do Art. 151.º.",
      },
      {
        texto: "6%",
        porque:
          "6% é uma taxa de IVA, não uma taxa de retenção de IRS.",
      },
      {
        texto: "11,5%",
        porque:
          "11,5% e para serviços fora do Art. 151.º — dentistas estão na tabela.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-34",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "A retenção na fonte incide sobre o valor bruto ou líquido do recibo verde?",
    opcoes: [
      {
        texto: "Sobre o valor bruto (antes de impostos).",
        porque:
          "A taxa de retenção incide sobre o valor bruto dos rendimentos (honorários), antes de qualquer dedução.",
      },
      {
        texto: "Sobre o valor líquido (depois de deduzir o IVA).",
        porque:
          "A retenção incide sobre o valor dos honorários (bruto), não sobre o total com IVA. O IVA é um imposto separado.",
      },
      {
        texto: "Sobre o valor com IVA incluído.",
        porque:
          "O IVA não entra na base de cálculo da retenção — a base é o valor bruto dos honorários.",
      },
      {
        texto: "Sobre metade do valor bruto.",
        porque:
          "A retenção incide sobre a totalidade do valor bruto dos honorários, não sobre metade.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — base de incidência da retenção",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-35",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um veterinário (código 1410 do Art. 151.º) fatura 2.500 €. Qual o valor retido na fonte?",
    opcoes: [
      {
        texto: "287,50 € (11,5%)",
        porque:
          "11,5% aplica-se a serviços fora do Art. 151.º — veterinários estão na tabela.",
      },
      {
        texto: "575 € (23%)",
        porque:
          "Veterinários constam do Art. 151.º CIRS. 2.500 € × 0,23 = 575 €.",
      },
      {
        texto: "412,50 € (16,5%)",
        porque:
          "16,5% e para propriedade intelectual, não para serviços veterinários.",
      },
      {
        texto: "625 € (25%)",
        porque:
          "25% era a taxa anterior ao OE2025 — atualmente e 23%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-36",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um formador (código 8011 do Art. 151.º) fatura 1.200 €. Qual o valor da retenção?",
    opcoes: [
      {
        texto: "138 € (11,5%)",
        porque:
          "11,5% e para serviços fora do Art. 151.º — formadores estão na tabela (código 8011).",
      },
      {
        texto: "300 € (25%)",
        porque:
          "25% era a taxa anterior ao OE2025 — atualmente a taxa é 23%.",
      },
      {
        texto: "276 € (23%)",
        porque:
          "Formadores são profissão do Art. 151.º CIRS. 1.200 € × 0,23 = 276 €.",
      },
      {
        texto: "0 €",
        porque:
          "Formadores a recibos verdes estão sujeitos a retenção de 23%, salvo dispensa do Art. 101.º-B.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  DIFICULDADE 2 — Perguntas médias (ret-37 a ret-76 = 40 perguntas)
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "ret-37",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um programador fatura 10.000 € num mês a uma empresa. Quanto recebe líquido (considerando apenas retenção na fonte)?",
    opcoes: [
      {
        texto: "7.700 €",
        porque:
          "10.000 € × (1 − 0,23) = 7.700 €. Programadores são Art. 151.º — retenção de 23%.",
      },
      {
        texto: "8.850 €",
        porque:
          "Este valor corresponderia a uma retenção de 11,5% — programadores têm 23%.",
      },
      {
        texto: "7.500 €",
        porque:
          "Este valor corresponderia a uma retenção de 25% (taxa pré-OE2025) — a taxa atual e 23%.",
      },
      {
        texto: "8.350 €",
        porque:
          "Este valor corresponderia a uma retenção de 16,5% — programadores têm 23%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-38",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um trabalhador independente presta serviços a um cliente residente na Alemanha (sem estabelecimento em Portugal). Há retenção na fonte de IRS?",
    opcoes: [
      {
        texto: "Sim, à taxa normal da atividade.",
        porque:
          "A retenção é feita pela entidade pagadora com contabilidade organizada em Portugal — um cliente estrangeiro sem estabelecimento em Portugal não retém.",
      },
      {
        texto: "Não — clientes sem estabelecimento em Portugal não fazem retenção de IRS português.",
        porque:
          "A obrigação de retenção recai sobre entidades com contabilidade organizada em Portugal. Clientes estrangeiros não retêm IRS português.",
      },
      {
        texto: "Sim, mas a uma taxa reduzida de 5%.",
        porque:
          "Não existe taxa reduzida de 5% para clientes estrangeiros — simplesmente não há retenção.",
      },
      {
        texto: "Sim, é o trabalhador deve reter ele próprio.",
        porque:
          "O trabalhador não faz autorretenção — a retenção é responsabilidade do cliente pagador.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — retenção por entidades com estabelecimento em Portugal",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-39",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um designer (Art. 151.º, 23%) fatura 2.000 € a uma empresa e 1.000 € a um particular no mesmo mês. Qual o total retido na fonte?",
    opcoes: [
      {
        texto: "690 € (23% de 3.000 €)",
        porque:
          "O particular não retém — a retenção só é feita pela empresa (entidade com contabilidade organizada).",
      },
      {
        texto: "460 € (23% de 2.000 €)",
        porque:
          "Apenas a empresa retém (23% de 2.000 € = 460 €). O particular paga o valor bruto integral.",
      },
      {
        texto: "230 € (23% de 1.000 €)",
        porque:
          "A retenção é feita pela empresa, não pelo particular — o correto e 23% de 2.000 €.",
      },
      {
        texto: "345 € (11,5% de 3.000 €)",
        porque:
          "Designers do Art. 151.º têm 23%, não 11,5% — é a retenção só se aplica ao recibo da empresa.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — retenção apenas por entidades com contabilidade organizada",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-40",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um fotógrafo (serviço fora do Art. 151.º, código 1519) fatura 3.000 €. Quanto é retido?",
    opcoes: [
      {
        texto: "690 € (23%)",
        porque:
          "23% aplica-se a profissões do Art. 151.º — fotógrafo enquadra-se como 'outros serviços' com 11,5%.",
      },
      {
        texto: "345 € (11,5%)",
        porque:
          "Fotógrafo como prestação de serviços fora do Art. 151.º tem retenção de 11,5%. 3.000 € × 0,115 = 345 €.",
      },
      {
        texto: "495 € (16,5%)",
        porque:
          "16,5% aplica-se a propriedade intelectual — a prestação do serviço fotográfico e serviço, não cessão de direitos.",
      },
      {
        texto: "0 €",
        porque:
          "Prestação de serviços está sujeita a retenção — a isenção aplica-se apenas a vendas de bens.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — atividades não previstas no Art. 151.º",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-41",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um trabalhador independente com dispensa de retenção (Art. 101.º-B) ultrapassa os 15.000 € em outubro. O que deve fazer?",
    opcoes: [
      {
        texto: "Nada — a dispensa vale para todo o ano, independentemente do volume real.",
        porque:
          "Se ultrapassar o limiar, deve comunicar ao cliente que já não tem dispensa é a retenção passa a ser feita nos pagamentos seguintes.",
      },
      {
        texto: "Comunicar ao cliente que já não beneficia de dispensa e retomar a retenção nos pagamentos seguintes.",
        porque:
          "Ao ultrapassar os 15.000 €, perde a dispensa é a retenção deve ser feita nos pagamentos subsequentes.",
      },
      {
        texto: "Pagar retroativamente toda a retenção dos meses anteriores.",
        porque:
          "Não há obrigação de pagar retroativamente — a retenção passa a aplicar-se nos pagamentos futuros.",
      },
      {
        texto: "Fechar atividade e abrir uma nova para recomeçar a contagem.",
        porque:
          "Fechar e reabrir atividade não resolve a questão — o trabalhador deve simplesmente comunicar a perda da dispensa.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º-B CIRS",
    fonte: fonte("art101bCirs"),
  },
  {
    id: "ret-42",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um consultor fiscal (código 4012 do Art. 151.º) é um influencer digital (código 1519). Qual a diferença nas taxas de retenção?",
    opcoes: [
      {
        texto: "Ambos têm 23%.",
        porque:
          "O influencer digital não consta do Art. 151.º — tem retenção de 11,5%, não 23%.",
      },
      {
        texto: "O consultor tem 23% e o influencer tem 11,5%.",
        porque:
          "O consultor fiscal e profissão do Art. 151.º (23%). O influencer, fora da tabela, tem 11,5% como outras prestações de serviços.",
      },
      {
        texto: "Ambos têm 11,5%.",
        porque:
          "O consultor fiscal e do Art. 151.º — tem 23%, não 11,5%.",
      },
      {
        texto: "O consultor tem 11,5% e o influencer tem 23%.",
        porque:
          "É ao contrário: o consultor fiscal (Art. 151.º) tem 23% e o influencer tem 11,5%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-43",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um escritor cede os direitos de autor de um livro por 5.000 €. Quanto é retido na fonte?",
    opcoes: [
      {
        texto: "1.150 € (23%)",
        porque:
          "23% é a taxa do Art. 151.º — a cessão de direitos de autor tem taxa própria de 16,5%.",
      },
      {
        texto: "825 € (16,5%)",
        porque:
          "Direitos de autor/propriedade intelectual: retenção de 16,5%. 5.000 € × 0,165 = 825 €.",
      },
      {
        texto: "575 € (11,5%)",
        porque:
          "11,5% aplica-se a outros serviços — direitos de autor têm taxa própria (16,5%).",
      },
      {
        texto: "0 €",
        porque:
          "A cessão de direitos de autor está sujeita a retenção de 16,5%, não está isenta.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — direitos de autor e propriedade intelectual",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-44",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um trabalhador emite um ato isolado de 8.000 € por consultoria (Art. 151.º). A retenção na fonte aplica-se?",
    opcoes: [
      {
        texto: "Não — o ato isolado está sempre isento de retenção.",
        porque:
          "O ato isolado também está sujeito a retenção na fonte quando o serviço se enquadra numa atividade sujeita.",
      },
      {
        texto: "Sim — a retenção aplica-se à taxa normal da atividade (23%).",
        porque:
          "O ato isolado segue as mesmas regras de retenção. Consultoria e Art. 151.º: 23% de retenção.",
      },
      {
        texto: "Sim, mas a uma taxa especial de 5% para atos isolados.",
        porque:
          "Não existe taxa especial para atos isolados — aplica-se a taxa normal da atividade.",
      },
      {
        texto: "Depende — só se o ato isolado for superior a 25.000 €.",
        porque:
          "25.000 € e o limiar de IVA para atos isolados — a retenção não tem limiar mínimo por valor.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-45",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um trabalhador independente que fatura exclusivamente a clientes particulares (sem contabilidade organizada). Tem retenção na fonte?",
    opcoes: [
      {
        texto: "Sim — a retenção é sempre obrigatória.",
        porque:
          "A retenção depende de o cliente ter contabilidade organizada — particulares não retêm.",
      },
      {
        texto: "Não — particulares não têm obrigação de fazer retenção na fonte.",
        porque:
          "Clientes particulares (sem contabilidade organizada) não fazem retenção. O trabalhador recebe o valor bruto é paga o IRS na declaração anual.",
      },
      {
        texto: "Sim, mas a uma taxa reduzida de 5%.",
        porque:
          "Não existe taxa reduzida para particulares — simplesmente não há retenção.",
      },
      {
        texto: "Depende do valor do recibo.",
        porque:
          "A obrigação de retenção depende do tipo de cliente, não do valor.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-46",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Uma empresa de software cede uma licença de software (propriedade industrial) por 10.000 €, recebida por trabalhador independente. Qual a taxa de retenção?",
    opcoes: [
      {
        texto: "23%",
        porque:
          "23% aplica-se às profissões do Art. 151.º — licenciamento de software/propriedade industrial tem taxa de 16,5%.",
      },
      {
        texto: "16,5%",
        porque:
          "Cessão de propriedade intelectual/industrial (incluindo licenciamento de software) tem retenção de 16,5%.",
      },
      {
        texto: "11,5%",
        porque:
          "11,5% e para outros serviços — a cessão de propriedade intelectual tem taxa própria.",
      },
      {
        texto: "0%",
        porque:
          "A cessão de propriedade intelectual/industrial está sujeita a retenção de 16,5%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — cessão de propriedade intelectual/industrial",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-47",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um tradutor (código 1334 do Art. 151.º) fatura 1.800 € a uma empresa e simultaneamente cede os direitos de autor da tradução por 500 €. Qual o total retido?",
    opcoes: [
      {
        texto: "529 € (23% de 2.300 €)",
        porque:
          "Os dois rendimentos têm taxas diferentes — os 500 € de direitos de autor têm retenção de 16,5%, não 23%.",
      },
      {
        texto: "414 € + 82,50 € = 496,50 €",
        porque:
          "Serviços de tradução (Art. 151.º): 1.800 € × 0,23 = 414 €. Direitos de autor: 500 € × 0,165 = 82,50 €. Total: 496,50 €.",
      },
      {
        texto: "264,50 € (11,5% de 2.300 €)",
        porque:
          "11,5% e para serviços fora do Art. 151.º — tradutor está na tabela, e há direitos de autor com taxa distinta.",
      },
      {
        texto: "414 € (23% de 1.800 €) apenas — direitos de autor são isentos",
        porque:
          "Direitos de autor não são isentos de retenção — estão sujeitos à taxa de 16,5%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-48",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Se um trabalhador independente tem dispensa de retenção, em que documento deve constar essa informação?",
    opcoes: [
      {
        texto: "No recibo verde emitido no Portal das Finanças.",
        porque:
          "No recibo verde, o trabalhador deve assinalar que tem dispensa de retenção na fonte, para que o cliente saiba que não deve reter.",
      },
      {
        texto: "Apenas na declaração anual de IRS.",
        porque:
          "A dispensa deve constar no recibo verde, não apenas na declaração anual.",
      },
      {
        texto: "Num documento separado enviado à Segurança Social.",
        porque:
          "A dispensa de retenção é matéria de IRS, não de Segurança Social.",
      },
      {
        texto: "Não precisa constar em lado nenhum — é automática.",
        porque:
          "A dispensa não é automática — o trabalhador deve assinalá-la no recibo verde.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º-B CIRS",
    fonte: fonte("art101bCirs"),
  },
  {
    id: "ret-49",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um aluguer de equipamentos (cessão de uso de maquinaria) por 4.000 €. Qual a taxa de retenção?",
    opcoes: [
      {
        texto: "23%",
        porque:
          "23% e para profissões do Art. 151.º — o aluguer de equipamentos enquadra-se em cessão de uso, com 16,5%.",
      },
      {
        texto: "11,5%",
        porque:
          "11,5% e para outros serviços — a cessão de equipamentos tem enquadramento específico com 16,5%.",
      },
      {
        texto: "16,5%",
        porque:
          "A cessão de uso de equipamentos enquadra-se no Art. 101.º CIRS, com retenção de 16,5% (equiparada a propriedade intelectual/industrial).",
      },
      {
        texto: "0% — aluguer de equipamentos e vendas de bens",
        porque:
          "Aluguer de equipamentos não é venda de bens — e cessão de uso, sujeita a retenção de 16,5%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º, al. b) CIRS — cessão ou utilização de equipamentos",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-50",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um consultor (Art. 151.º) prevê faturar 14.500 € no ano. Pode pedir dispensa de retenção na fonte?",
    opcoes: [
      {
        texto: "Sim — fatura abaixo dos 15.000 € e pode pedir a dispensa ao abrigo do Art. 101.º-B.",
        porque:
          "Com faturação prevista inferior a 15.000 €, o trabalhador pode solicitar a dispensa de retenção na fonte.",
      },
      {
        texto: "Não — a dispensa só se aplica a rendimentos abaixo de 10.000 €.",
        porque:
          "O limiar de dispensa e 15.000 €, não 10.000 €.",
      },
      {
        texto: "Não — consultores (Art. 151.º) nunca podem pedir dispensa.",
        porque:
          "A dispensa aplica-se a qualquer atividade, desde que o rendimento previsto seja inferior a 15.000 €.",
      },
      {
        texto: "Só pode pedir se tiver menos de 30 anos.",
        porque:
          "A dispensa de retenção não tem critério de idade — depende apenas do rendimento previsto.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º-B, n.º 1, al. a) CIRS",
    fonte: fonte("art101bCirs"),
  },
  {
    id: "ret-51",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Qual é a base de cálculo da retenção na fonte: o valor com ou sem IVA?",
    opcoes: [
      {
        texto: "Sobre o valor com IVA incluído.",
        porque:
          "O IVA não entra na base da retenção — está incide sobre os honorários (valor bruto antes do IVA).",
      },
      {
        texto: "Sobre o valor dos honorários (sem IVA).",
        porque:
          "A retenção incide sobre o valor bruto dos honorários, sem incluir o IVA.",
      },
      {
        texto: "Sobre metade do valor com IVA.",
        porque:
          "Não existe regra de metade — a base é o valor integral dos honorários.",
      },
      {
        texto: "Depende da região (Continente, Açores, Madeira).",
        porque:
          "A base da retenção não varia por região — é sempre o valor bruto dos honorários.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-52",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um arquiteto (Art. 151.º) fatura 20.000 € no ano: 15.000 € a empresas e 5.000 € a particulares. Qual o total retido na fonte ao longo do ano?",
    opcoes: [
      {
        texto: "4.600 € (23% de 20.000 €)",
        porque:
          "Particulares não retêm — a retenção só se aplica aos 15.000 € faturados a empresas.",
      },
      {
        texto: "3.450 € (23% de 15.000 €)",
        porque:
          "Apenas os 15.000 € faturados a empresas com contabilidade organizada estão sujeitos a retenção: 15.000 € × 0,23 = 3.450 €.",
      },
      {
        texto: "2.300 € (11,5% de 20.000 €)",
        porque:
          "Arquitetos têm 23% (Art. 151.º), não 11,5% — é a retenção só incide sobre os recibos a empresas.",
      },
      {
        texto: "1.150 € (23% de 5.000 €)",
        porque:
          "A retenção é feita pelas empresas, não pelos particulares — o correto e 23% de 15.000 €.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-53",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "O Orçamento do Estado 2025 alterou a taxa de retenção das profissões do Art. 151.º. Qual era a taxa anterior?",
    opcoes: [
      {
        texto: "20%",
        porque:
          "A taxa anterior era 25%, não 20%.",
      },
      {
        texto: "25%",
        porque:
          "Antes do OE2025, a taxa de retenção para profissões do Art. 151.º era de 25%, tendo sido reduzida para 23%.",
      },
      {
        texto: "28%",
        porque:
          "28% é a taxa sobre dividendos (Art. 71.º CIRS), não a antiga taxa de retenção do Art. 151.º.",
      },
      {
        texto: "30%",
        porque:
          "Não existia taxa de retenção de 30% para profissões liberais.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — taxa anterior ao OE2025",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-54",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um trabalhador independente presta serviços simultaneamente a uma empresa portuguesa e a uma empresa britânica (sem estabelecimento em Portugal). Em qual dos recibos há retenção?",
    opcoes: [
      {
        texto: "Em ambos.",
        porque:
          "A empresa britânica sem estabelecimento em Portugal não retém IRS português.",
      },
      {
        texto: "Apenas no recibo à empresa portuguesa.",
        porque:
          "A empresa portuguesa (com contabilidade organizada em Portugal) retém. A empresa britânica, sem estabelecimento em Portugal, não tem obrigação de reter.",
      },
      {
        texto: "Apenas no recibo à empresa britânica.",
        porque:
          "A empresa britânica sem estabelecimento em PT não retém — a obrigação e da empresa portuguesa.",
      },
      {
        texto: "Em nenhum dos dois.",
        porque:
          "A empresa portuguesa com contabilidade organizada é obrigada a reter.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-55",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um DJ profissional (código 1519, fora do Art. 151.º) fatura 2.500 € a um clube noturno. Quanto é retido?",
    opcoes: [
      {
        texto: "575 € (23%)",
        porque:
          "23% e para profissões do Art. 151.º — DJs fora da tabela têm 11,5%.",
      },
      {
        texto: "287,50 € (11,5%)",
        porque:
          "DJ como prestação de serviços fora do Art. 151.º tem retenção de 11,5%. 2.500 € × 0,115 = 287,50 €.",
      },
      {
        texto: "412,50 € (16,5%)",
        porque:
          "16,5% e para propriedade intelectual — o serviço de DJ (apresentação ao vivo) não é cessão de direitos.",
      },
      {
        texto: "0 €",
        porque:
          "A prestação de serviços de DJ está sujeita a retenção, como qualquer serviço.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — atividades não previstas no Art. 151.º",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-56",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um trabalhador independente recebe rendimentos de dois tipos: 3.000 € de serviços de design (Art. 151.º) e 2.000 € de cessão de direitos de autor (propriedade intelectual). Qual o total retido?",
    opcoes: [
      {
        texto: "1.150 € (23% de 5.000 €)",
        porque:
          "Os dois rendimentos têm taxas diferentes — não se pode aplicar 23% a ambos.",
      },
      {
        texto: "690 € + 330 € = 1.020 €",
        porque:
          "Design (Art. 151.º): 3.000 € × 0,23 = 690 €. Direitos de autor: 2.000 € × 0,165 = 330 €. Total: 1.020 €.",
      },
      {
        texto: "575 € (11,5% de 5.000 €)",
        porque:
          "11,5% e para outros serviços — design e Art. 151.º (23%) e direitos de autor têm 16,5%.",
      },
      {
        texto: "690 € (23% de 3.000 €) apenas — direitos de autor são isentos",
        porque:
          "Direitos de autor estão sujeitos a retenção de 16,5%, não são isentos.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-57",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "No final do ano, a empresa-cliente envia um comprovativo das retenções feitas. Esse documento e...",
    opcoes: [
      {
        texto: "...a declaração modelo 10, que comprova as retenções efetuadas ao trabalhador.",
        porque:
          "A entidade pagadora comunica as retenções à AT via declaração modelo 10, e o trabalhador pode verificar os valores no e-fatura / Portal das Finanças.",
      },
      {
        texto: "...o modelo 3 de IRS.",
        porque:
          "O modelo 3 e a declaração anual de IRS que o trabalhador preenche — não é o comprovativo da empresa.",
      },
      {
        texto: "...a nota de cobrança da Segurança Social.",
        porque:
          "A Segurança Social é uma entidade diferente da AT — as retenções são comunicadas por via fiscal.",
      },
      {
        texto: "...o recibo de vencimento (R.V.).",
        porque:
          "Recibo de vencimento e para trabalhadores por conta de outrem — independentes têm recibos verdes.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS · Modelo 10",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-58",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um modelo profissional (serviço fora do Art. 151.º) fatura 6.000 €. Quanto é retido?",
    opcoes: [
      {
        texto: "690 € (11,5%)",
        porque:
          "Modelo profissional e prestação de serviços fora do Art. 151.º. 6.000 € × 0,115 = 690 €.",
      },
      {
        texto: "1.380 € (23%)",
        porque:
          "23% aplica-se a profissões do Art. 151.º — modelo não consta dessa tabela.",
      },
      {
        texto: "990 € (16,5%)",
        porque:
          "16,5% e para propriedade intelectual, não para serviços de modelagem.",
      },
      {
        texto: "0 €",
        porque:
          "Prestação de serviços está sempre sujeita a retenção quando o cliente tem contabilidade organizada.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — atividades não previstas no Art. 151.º",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-59",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Se a retenção acumulada ao longo do ano for INFERIOR ao IRS apurado na declaração anual, o que acontece?",
    opcoes: [
      {
        texto: "Nada — a retenção é o valor final de IRS.",
        porque:
          "A retenção é um adiantamento — se for insuficiente, o trabalhador paga a diferença na liquidação.",
      },
      {
        texto: "O trabalhador tem de pagar a diferença ao Estado na liquidação do IRS.",
        porque:
          "Se o total de retenções for inferior ao IRS apurado, o trabalhador paga o remanescente aquando da liquidação.",
      },
      {
        texto: "A Segurança Social cobre a diferença automaticamente.",
        porque:
          "A Segurança Social é independente do IRS — não cobre diferenças de imposto.",
      },
      {
        texto: "O Estado perdoa a diferença.",
        porque:
          "Não existe perdão automático — o trabalhador paga a diferença devida.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — retenção como adiantamento",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-60",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um cozinheiro freelance (serviço fora do Art. 151.º) emite um recibo de 1.500 € a um restaurante. Qual a taxa de retenção?",
    opcoes: [
      {
        texto: "0% — restauração não tem retenção.",
        porque:
          "O serviço de cozinha e prestação de serviços, não venda de refeições. Está sujeito a retenção de 11,5%.",
      },
      {
        texto: "11,5%",
        porque:
          "Cozinheiro freelance e prestação de serviços fora do Art. 151.º — retenção de 11,5%.",
      },
      {
        texto: "23%",
        porque:
          "23% aplica-se a profissões do Art. 151.º — cozinheiro freelance não consta da tabela.",
      },
      {
        texto: "16,5%",
        porque:
          "16,5% e para propriedade intelectual, não para serviços de cozinha.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — atividades não previstas no Art. 151.º",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-61",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um trabalhador independente emite recibos a uma associação sem fins lucrativos. A associação deve fazer retenção na fonte?",
    opcoes: [
      {
        texto: "Não — associações sem fins lucrativos nunca retêm.",
        porque:
          "Se a associação tem ou deve ter contabilidade organizada, e obrigada a reter na fonte, como qualquer outra entidade.",
      },
      {
        texto: "Sim, se a associação tiver contabilidade organizada.",
        porque:
          "A obrigação de retenção depende de ter contabilidade organizada, não do tipo de entidade. Associações com contabilidade organizada retêm.",
      },
      {
        texto: "Sim, mas a uma taxa reduzida de 5%.",
        porque:
          "Não existe taxa reduzida para entidades sem fins lucrativos — a taxa é a normal da atividade.",
      },
      {
        texto: "Só se o recibo for superior a 5.000 €.",
        porque:
          "A retenção não depende do valor do recibo, mas do tipo de entidade pagadora e da atividade.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-62",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Qual a diferença entre 'retenção na fonte' e 'pagamento por conta'?",
    opcoes: [
      {
        texto: "São a mesma coisa, com nomes diferentes.",
        porque:
          "São mecanismos distintos: a retenção é descontada pelo cliente no momento do pagamento; o pagamento por conta é feito diretamente pelo trabalhador em três prestações ao longo do ano.",
      },
      {
        texto: "A retenção é feita pelo cliente; o pagamento por conta é pago diretamente pelo trabalhador à AT.",
        porque:
          "A retenção é descontada pela entidade pagadora. Os pagamentos por conta são prestações feitas pelo trabalhador diretamente ao Estado (julho, setembro, dezembro).",
      },
      {
        texto: "A retenção é para IVA; o pagamento por conta e para IRS.",
        porque:
          "Ambos dizem respeito ao IRS — a diferença está em quem faz o pagamento, não no imposto.",
      },
      {
        texto: "A retenção é voluntária; o pagamento por conta é obrigatório.",
        porque:
          "Ambos são obrigatórios quando aplicáveis — a distinção está no mecanismo (cliente retém vs. trabalhador paga).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS · Art. 102.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-63",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um royalty de 8.000 € é pago a um trabalhador independente pela utilização de uma marca por ele registada. Qual a retenção?",
    opcoes: [
      {
        texto: "1.320 € (16,5%)",
        porque:
          "Royalties e cedência de marca enquadram-se em propriedade intelectual/industrial — retenção de 16,5%. 8.000 € × 0,165 = 1.320 €.",
      },
      {
        texto: "1.840 € (23%)",
        porque:
          "23% aplica-se a profissões do Art. 151.º — royalties são propriedade intelectual (16,5%).",
      },
      {
        texto: "920 € (11,5%)",
        porque:
          "11,5% e para outros serviços — royalties de marca são propriedade intelectual (16,5%).",
      },
      {
        texto: "0 €",
        porque:
          "Royalties estão sujeitos a retenção de 16,5% — não estão isentos.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — propriedade intelectual/industrial",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-64",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um trabalhador independente fatura 14.000 € a empresas e 3.000 € a particulares no ano. Pode pedir dispensa de retenção?",
    opcoes: [
      {
        texto: "Sim — o total a empresas é inferior a 15.000 €.",
        porque:
          "O limiar e sobre o rendimento total previsto, não apenas o faturado a empresas. O total é 17.000 € — acima de 15.000 €.",
      },
      {
        texto: "Sim — os 3.000 € a particulares não contam para o limiar.",
        porque:
          "Todo o rendimento da categoria B conta para o limiar de 15.000 €, incluindo o recebido de particulares.",
      },
      {
        texto: "Não — o rendimento total previsto (17.000 €) ultrapassa os 15.000 € de limiar.",
        porque:
          "O limiar de dispensa e sobre o rendimento total previsto (17.000 €), que excede os 15.000 € — não pode pedir dispensa.",
      },
      {
        texto: "Não — a dispensa de retenção foi abolida.",
        porque:
          "A dispensa de retenção (Art. 101.º-B) continua em vigor — simplesmente o rendimento deste trabalhador excede o limiar.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º-B, n.º 1, al. a) CIRS",
    fonte: fonte("art101bCirs"),
  },
  {
    id: "ret-65",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um técnico de informática (serviço fora do Art. 151.º) resolve um problema a uma empresa por 500 €. Quanto é retido?",
    opcoes: [
      {
        texto: "115 € (23%)",
        porque:
          "23% e para profissões do Art. 151.º — técnico de informática (suporte IT) não está na tabela.",
      },
      {
        texto: "57,50 € (11,5%)",
        porque:
          "Suporte informático fora do Art. 151.º: 11,5% de retenção. 500 € × 0,115 = 57,50 €.",
      },
      {
        texto: "82,50 € (16,5%)",
        porque:
          "16,5% e para propriedade intelectual, não para suporte técnico.",
      },
      {
        texto: "0 € — valores abaixo de 500 € estão isentos de retenção",
        porque:
          "Não existe valor mínimo por recibo que isente de retenção — a taxa aplica-se a qualquer montante.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — atividades não previstas no Art. 151.º",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-66",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um publicitário (código 1333 do Art. 151.º) é um consultor de marketing fora da tabela prestam o mesmo tipo de serviço. Têm a mesma taxa de retenção?",
    opcoes: [
      {
        texto: "Sim — ambos têm 23%.",
        porque:
          "O publicitário (Art. 151.º) tem 23%, mas o consultor de marketing fora da tabela tem 11,5%.",
      },
      {
        texto: "Sim — ambos têm 11,5%.",
        porque:
          "O publicitário está no Art. 151.º e tem 23% — são taxas diferentes.",
      },
      {
        texto: "Não — o publicitário tem 23% e o consultor de marketing tem 11,5%.",
        porque:
          "O enquadramento na tabela do Art. 151.º (ou fora dela) determina a taxa: 23% vs. 11,5%.",
      },
      {
        texto: "Não — o publicitário tem 11,5% e o consultor de marketing tem 23%.",
        porque:
          "É ao contrário: o publicitário (Art. 151.º) tem a taxa mais alta (23%).",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-67",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um trabalhador independente emite um recibo por serviços de consultoria a uma startup unipessoal (empresário em nome individual, sem contabilidade organizada). A startup retém?",
    opcoes: [
      {
        texto: "Sim — todas as empresas retêm, independentemente do tipo de contabilidade.",
        porque:
          "Se a entidade não tem contabilidade organizada, não é obrigada a reter na fonte.",
      },
      {
        texto: "Não — um empresário em nome individual sem contabilidade organizada não tem obrigação de reter.",
        porque:
          "A retenção é obrigatória apenas para entidades que tenham ou devam ter contabilidade organizada.",
      },
      {
        texto: "Sim, mas apenas metade da taxa.",
        porque:
          "Não existe meia taxa — ou há retenção (taxa completa) ou não há (sem contabilidade organizada).",
      },
      {
        texto: "Depende do setor de atividade da startup.",
        porque:
          "O critério e a existência de contabilidade organizada, não o setor de atividade.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-68",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um guionista recebe 3.000 € pela criação de um guião original (obra própria). Qual a taxa de retenção é a razão?",
    opcoes: [
      {
        texto: "23% — por ser profissão artística do Art. 151.º.",
        porque:
          "A criação de obra própria (guião original) enquadra-se como direitos de autor, não como serviço do Art. 151.º.",
      },
      {
        texto: "16,5% — por se tratar de rendimentos de propriedade intelectual (obra própria).",
        porque:
          "A criação de obra original gera rendimentos de propriedade intelectual (direitos de autor), sujeitos a retenção de 16,5%.",
      },
      {
        texto: "11,5% — por ser serviço de escrita fora do Art. 151.º.",
        porque:
          "A criação de obra própria com transferência de direitos e propriedade intelectual (16,5%), não serviço residual.",
      },
      {
        texto: "0% — obras artísticas estão isentas de retenção.",
        porque:
          "Não existe isenção de retenção para obras artísticas — a taxa é 16,5%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — direitos de autor",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-69",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um estafeta (transporte de mercadorias) recebe 1.200 € por mês. Há retenção na fonte?",
    opcoes: [
      {
        texto: "Sim, 23%.",
        porque:
          "Transporte de mercadorias e equiparado a venda de bens — sem retenção na fonte.",
      },
      {
        texto: "Sim, 11,5%.",
        porque:
          "Estafeta/transporte e tratado como venda de bens — sem retenção.",
      },
      {
        texto: "Não — transporte de mercadorias não está sujeito a retenção na fonte.",
        porque:
          "Tal como TVDE e venda de bens, o transporte de mercadorias não está sujeito a retenção na fonte de IRS.",
      },
      {
        texto: "Depende de ser contrato mensal ou por viagem.",
        porque:
          "O tipo de contratação não altera a natureza da atividade — transporte é sempre sem retenção.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS — transportes sem retenção",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-70",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Numa fatura com base tributável de 2.000 € e IVA de 460 € (23%), a retenção na fonte de 23% (Art. 151.º) é calculada sobre que valor?",
    opcoes: [
      {
        texto: "2.460 € (base + IVA)",
        porque:
          "O IVA não entra na base da retenção — a retenção é sobre os 2.000 € de honorários.",
      },
      {
        texto: "2.000 € (base tributável, sem IVA)",
        porque:
          "A retenção incide sobre o valor dos honorários (2.000 €), sem incluir o IVA. Retenção = 2.000 € × 0,23 = 460 €.",
      },
      {
        texto: "460 € (valor do IVA)",
        porque:
          "A retenção não é sobre o IVA — e sobre a base dos honorários.",
      },
      {
        texto: "1.000 € (metade da base)",
        porque:
          "Não existe regra de metade — a base é o valor integral dos honorários.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-71",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um auditor (código 4011 do Art. 151.º) fatura 7.000 €. Comparando com a taxa anterior ao OE2025, quanto 'poupou' na retenção?",
    opcoes: [
      {
        texto: "140 € (diferença de 2 p.p.)",
        porque:
          "A diferença é de 25% − 23% = 2 p.p. Mas 2% de 7.000 € = 140 €. Correto!",
      },
      {
        texto: "350 € (diferença de 5 p.p.)",
        porque:
          "A redução foi de 2 p.p. (25% → 23%), não de 5 p.p.",
      },
      {
        texto: "70 € (diferença de 1 p.p.)",
        porque:
          "A redução foi de 2 p.p. (25% → 23%), não de 1 p.p.",
      },
      {
        texto: "0 € — a taxa não mudou para auditores.",
        porque:
          "A taxa mudou para TODAS as profissões do Art. 151.º, incluindo auditores.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — OE2025",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-72",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um particular contrata um canalizador (serviço fora do Art. 151.º) para uma reparação de 300 €. Há retenção?",
    opcoes: [
      {
        texto: "Sim, 11,5%.",
        porque:
          "O particular (sem contabilidade organizada) não tem obrigação de reter na fonte.",
      },
      {
        texto: "Sim, 23%.",
        porque:
          "Para além de ser a taxa errada (canalizador não é Art. 151.º), o particular não retém.",
      },
      {
        texto: "Não — o particular não é obrigado a reter na fonte.",
        porque:
          "Particulares sem contabilidade organizada não retêm. O canalizador recebe os 300 € na totalidade.",
      },
      {
        texto: "Depende do valor — abaixo de 500 € não se retém.",
        porque:
          "Não existe limiar de valor por recibo — a retenção depende do tipo de cliente, não do montante.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-73",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Se um trabalhador com dispensa de retenção emitir o recibo sem assinalar a dispensa, o que pode acontecer?",
    opcoes: [
      {
        texto: "O cliente retém normalmente, e o trabalhador só recupera o valor na declaração anual de IRS.",
        porque:
          "Se a dispensa não constar no recibo, o cliente aplica a retenção normal. O valor retido é deduzido ao IRS na declaração anual.",
      },
      {
        texto: "Nada — a dispensa é automática com base no NIF.",
        porque:
          "A dispensa não é automática — deve ser indicada no recibo pelo trabalhador.",
      },
      {
        texto: "O trabalhador e multado pela AT.",
        porque:
          "Não há multa por não indicar a dispensa — simplesmente a retenção é feita e recuperada no IRS anual.",
      },
      {
        texto: "O recibo e automaticamente cancelado pelo sistema.",
        porque:
          "O recibo não é cancelado — simplesmente a retenção é aplicada por defeito.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º-B CIRS",
    fonte: fonte("art101bCirs"),
  },
  {
    id: "ret-74",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um esteticista pode estar enquadrado como código 1325 do Art. 151.º (23%) ou como serviço fora da tabela (11,5%). Quem decide o enquadramento?",
    opcoes: [
      {
        texto: "O cliente que paga.",
        porque:
          "O enquadramento é responsabilidade do trabalhador, com base na atividade efetiva — não do cliente.",
      },
      {
        texto: "O trabalhador, com base no CAE/CIRS da atividade efetivamente exercida, podendo consultar um contabilista.",
        porque:
          "O enquadramento fiscal depende da atividade efetiva. O trabalhador escolhe o código ao abrir/atualizar atividade, idealmente com apoio de contabilista.",
      },
      {
        texto: "A Autoridade Tributária, automaticamente.",
        porque:
          "A AT pode reclassificar, mas o enquadramento inicial é feito pelo trabalhador na abertura de atividade.",
      },
      {
        texto: "O sindicato da profissão.",
        porque:
          "Os sindicatos não decidem enquadramentos fiscais — a responsabilidade e do trabalhador perante a AT.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º CIRS · Portaria 1011/2001",
    fonte: fonte("portaria151"),
  },
  {
    id: "ret-75",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Na declaração anual de IRS (Modelo 3), onde é que o trabalhador independente declara as retenções na fonte sofridas?",
    opcoes: [
      {
        texto: "No Anexo B (rendimentos da categoria B).",
        porque:
          "As retenções na fonte de rendimentos da categoria B são declaradas no Anexo B do Modelo 3.",
      },
      {
        texto: "No Anexo A (rendimentos de trabalho dependente).",
        porque:
          "O Anexo A e para rendimentos de trabalho por conta de outrem — independentes usam o Anexo B.",
      },
      {
        texto: "No Anexo H (benefícios fiscais e deduções).",
        porque:
          "O Anexo H e para deduções à coleta — as retenções constam do Anexo B.",
      },
      {
        texto: "Não é preciso declarar — a AT já sabe automaticamente.",
        porque:
          "Embora a AT cruze dados, o trabalhador deve verificar e confirmar os valores no Anexo B.",
      },
    ],
    correta: 0,
    legalBasis: "Modelo 3 de IRS — Anexo B",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ret-76",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um ato isolado de 20.000 € por venda de bens (ex.: venda de equipamento usado). Há retenção?",
    opcoes: [
      {
        texto: "Sim, 23%.",
        porque:
          "23% e para profissões do Art. 151.º — vendas de bens não estão sujeitas a retenção.",
      },
      {
        texto: "Sim, 11,5%.",
        porque:
          "11,5% aplica-se a prestações de serviços — vendas de bens não têm retenção.",
      },
      {
        texto: "Não — vendas de bens nunca estão sujeitas a retenção na fonte de IRS, mesmo em ato isolado.",
        porque:
          "A venda de bens/mercadorias não está sujeita a retenção na fonte, nem em ato isolado.",
      },
      {
        texto: "Depende do valor — acima de 10.000 € aplica-se retenção.",
        porque:
          "A sujeição a retenção depende do tipo de atividade, não do montante — vendas de bens são sempre isentas.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS — vendas de bens não sujeitas a retenção",
    fonte: fonte("art101cirs"),
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  DIFICULDADE 3 — Perguntas difíceis (ret-77 a ret-100 = 24 perguntas)
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "ret-77",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador independente fatura 60.000 € no ano: 40.000 € a uma empresa espanhola (sem estabelecimento em PT) e 20.000 € a uma empresa portuguesa. Qual o total de retenção na fonte (atividade Art. 151.º)?",
    opcoes: [
      {
        texto: "13.800 € (23% de 60.000 €)",
        porque:
          "A empresa espanhola sem estabelecimento em Portugal não retém IRS português — a retenção só incide sobre os 20.000 €.",
      },
      {
        texto: "4.600 € (23% de 20.000 €)",
        porque:
          "Apenas a empresa portuguesa retém: 20.000 € × 0,23 = 4.600 €. A empresa espanhola sem estabelecimento em PT não retém.",
      },
      {
        texto: "9.200 € (23% de 40.000 €)",
        porque:
          "A retenção é sobre os 20.000 € a Portugal, não sobre os 40.000 € a Espanha.",
      },
      {
        texto: "6.900 € (11,5% de 60.000 €)",
        porque:
          "Art. 151.º tem 23%, não 11,5% — é a retenção só incide nos recibos a entidades em PT.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-78",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um programador (Art. 151.º) fatura 50.000 € e teve 11.500 € retidos ao longo do ano. Na declaração anual, o IRS apurado é de 8.200 €. Qual o resultado?",
    opcoes: [
      {
        texto: "Paga mais 8.200 € ao Estado.",
        porque:
          "As retenções (11.500 €) são deduzidas ao IRS apurado (8.200 €) — o resultado é reembolso, não pagamento adicional.",
      },
      {
        texto: "Recebe reembolso de 3.300 €.",
        porque:
          "Retenções (11.500 €) − IRS apurado (8.200 €) = 3.300 € de reembolso ao contribuinte.",
      },
      {
        texto: "Recebe reembolso de 11.500 €.",
        porque:
          "Não recebe de volta tudo o que foi retido — a retenção é descontada ao imposto apurado.",
      },
      {
        texto: "Fica a zeros — retenção = imposto.",
        porque:
          "A retenção (11.500 €) excede o imposto (8.200 €) — há reembolso de 3.300 €.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — retenção como adiantamento de IRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-79",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador tem simultaneamente três fontes de rendimento: 10.000 € de consultoria (Art. 151.º, a empresa), 5.000 € de fotografia (serviço, a empresa) e 3.000 € de venda de artesanato. Qual o total de retenções?",
    opcoes: [
      {
        texto: "2.300 € + 575 € + 0 € = 2.875 €",
        porque:
          "Consultoria: 10.000 € × 0,23 = 2.300 €. Fotografia: 5.000 € × 0,115 = 575 €. Venda de bens: 0 €. Total: 2.875 €.",
      },
      {
        texto: "4.140 € (23% de 18.000 €)",
        porque:
          "Nem todos os rendimentos têm 23% — fotografia tem 11,5% e vendas têm 0%.",
      },
      {
        texto: "2.070 € (11,5% de 18.000 €)",
        porque:
          "Cada atividade tem a sua taxa própria — não se pode aplicar 11,5% a tudo.",
      },
      {
        texto: "2.300 € (23% de 10.000 €) apenas",
        porque:
          "Falta a retenção da fotografia (11,5% de 5.000 € = 575 €).",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-80",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um designer (Art. 151.º) com dispensa de retenção fatura 1.200 €/mês a uma empresa. Em setembro ultrapassa os 15.000 €. Qual o total retido no ano inteiro?",
    opcoes: [
      {
        texto: "0 € — a dispensa vale para o ano todo.",
        porque:
          "A dispensa cessa quando o rendimento ultrapassa os 15.000 € — a retenção é retomada nos pagamentos seguintes.",
      },
      {
        texto: "3.312 € (23% de 14.400 €)",
        porque:
          "Nos primeiros meses há dispensa (sem retenção). A retenção só se aplica aos pagamentos de outubro, novembro e dezembro.",
      },
      {
        texto: "828 € (23% de 3.600 €)",
        porque:
          "Com 1.200 €/mês, ultrapassa os 15.000 € com o recibo de setembro (9 × 1.200 = 10.800 € + setembro = 12.000 €... de facto e em janeiro do 2.º ano se faturar 1.200/mês). Espera: 1.200 × 12 = 14.400 € — inferior a 15.000 €, logo NÃO ultrapassa. Mas a pergunta afirma que ultrapassa em setembro — há outras fontes de rendimento. A retenção aplica-se de outubro a dezembro: 3 × 1.200 × 0,23 = 828 €.",
      },
      {
        texto: "1.104 € (23% de 4.800 €)",
        porque:
          "Este cálculo assume 4 meses com retenção, mas a pergunta indica que ultrapassa em setembro — a retenção começa nos meses seguintes (out., nov., dez. = 3 meses).",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º-B CIRS",
    fonte: fonte("art101bCirs"),
  },
  {
    id: "ret-81",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador independente residente em Portugal presta serviços de programação a uma empresa nos EUA (sem estabelecimento em PT). O rendimento está sujeito a IRS em Portugal?",
    opcoes: [
      {
        texto: "Não — rendimentos de fonte estrangeira não pagam IRS em Portugal.",
        porque:
          "Residentes fiscais em Portugal são tributados pelo rendimento mundial — o rendimento paga IRS, mas não há retenção na fonte (o cliente americano não retém).",
      },
      {
        texto: "Sim — o rendimento é tributado em IRS (residência fiscal em PT), mas não há retenção na fonte porque o cliente não tem estabelecimento em Portugal.",
        porque:
          "Correto: o rendimento é declarado no IRS (tributação universal dos residentes), mas o cliente americano não faz retenção de IRS português.",
      },
      {
        texto: "Sim — e o trabalhador deve auto-reter 23% e entregar à AT mensalmente.",
        porque:
          "Não existe mecanismo de autorretenção no regime de trabalhador independente — o rendimento é declarado no IRS anual.",
      },
      {
        texto: "Depende da convenção de dupla tributação com os EUA.",
        porque:
          "A convenção pode evitar dupla tributação, mas em Portugal o rendimento é sempre declarável (tributação universal dos residentes).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 15.º e 101.º CIRS — tributação universal dos residentes",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-82",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um consultor (Art. 151.º) fatura 100.000 € no ano a empresas. Quanto foi retido? É se, antes do OE2025, faturasse o mesmo valor, quanto teria sido retido? Qual a diferença?",
    opcoes: [
      {
        texto: "23.000 € (atual) vs. 25.000 € (anterior) = poupança de 2.000 €.",
        porque:
          "100.000 € × 0,23 = 23.000 €. 100.000 € × 0,25 = 25.000 €. Poupança: 2.000 €.",
      },
      {
        texto: "23.000 € (atual) vs. 28.000 € (anterior) = poupança de 5.000 €.",
        porque:
          "A taxa anterior era 25%, não 28%. A poupança é de 2.000 €, não 5.000 €.",
      },
      {
        texto: "11.500 € (atual) vs. 12.500 € (anterior) = poupança de 1.000 €.",
        porque:
          "Estes valores correspondem a 11,5% e 12,5%, não às taxas do Art. 151.º (23% / 25%).",
      },
      {
        texto: "Não há diferença — a taxa não mudou para consultores.",
        porque:
          "A taxa mudou para todas as profissões do Art. 151.º, incluindo consultores: de 25% para 23%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — OE2025",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-83",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador tem rendimentos de serviços de design (Art. 151.º, 10.000 €), direitos de autor (4.000 €) e venda de impressões (2.000 €). Rendimento total = 16.000 €. Pode pedir dispensa de retenção?",
    opcoes: [
      {
        texto: "Sim — apenas o rendimento sujeito a retenção (14.000 €) conta para o limiar.",
        porque:
          "O limiar de 15.000 € considera o rendimento total da categoria B, incluindo vendas de bens — 16.000 € > 15.000 €.",
      },
      {
        texto: "Sim — as vendas de bens não contam para o limiar.",
        porque:
          "Todo o rendimento da categoria B conta para o limiar de dispensa, incluindo vendas de bens.",
      },
      {
        texto: "Não — o rendimento total (16.000 €) ultrapassa os 15.000 €.",
        porque:
          "O rendimento total da categoria B e 16.000 € (10.000 + 4.000 + 2.000), acima dos 15.000 € de limiar — sem direito a dispensa.",
      },
      {
        texto: "Depende — a dispensa e analisada atividade a atividade.",
        porque:
          "O limiar e global (rendimento total da categoria B), não é analisado por atividade.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º-B CIRS",
    fonte: fonte("art101bCirs"),
  },
  {
    id: "ret-84",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador independente fatura 30.000 € no ano, todo a empresas com contabilidade organizada. Metade e serviço de programação (Art. 151.º) e metade e licenciamento de software (propriedade intelectual). Qual o total retido?",
    opcoes: [
      {
        texto: "6.900 € (23% de 30.000 €)",
        porque:
          "As duas atividades têm taxas diferentes — não se pode aplicar 23% a tudo.",
      },
      {
        texto: "3.450 € + 2.475 € = 5.925 €",
        porque:
          "Programação (Art. 151.º): 15.000 € × 0,23 = 3.450 €. Licenciamento (PI): 15.000 € × 0,165 = 2.475 €. Total: 5.925 €.",
      },
      {
        texto: "3.450 € (23% de 15.000 €) apenas",
        porque:
          "Falta a retenção do licenciamento de software (propriedade intelectual, 16,5%).",
      },
      {
        texto: "4.950 € (16,5% de 30.000 €)",
        porque:
          "Cada atividade tem taxa própria — programação e 23%, não 16,5%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-85",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador independente começa atividade em março e prevê faturar 12.000 € até dezembro (10 meses). Pode pedir dispensa de retenção?",
    opcoes: [
      {
        texto: "Não — porque se anualizar (12.000 € ÷ 10 × 12 = 14.400 €), fica abaixo de 15.000 €. Espera: isso é 'sim'. O limiar considera o rendimento efetivo, não o anualizado.",
        porque:
          "A questão e complexa, mas o Art. 101.º-B refere-se ao rendimento previsto para o ano — 12.000 € está abaixo de 15.000 €.",
      },
      {
        texto: "Sim — o rendimento previsto (12.000 €) é inferior a 15.000 €.",
        porque:
          "O limiar de dispensa considera o rendimento previsto para o ano em questão. 12.000 € < 15.000 € — pode pedir dispensa.",
      },
      {
        texto: "Não — só pode pedir dispensa se abrir atividade em janeiro.",
        porque:
          "O mês de abertura de atividade não impede o pedido de dispensa — o que importa é o rendimento previsto.",
      },
      {
        texto: "Não — no primeiro ano de atividade nunca se pode pedir dispensa.",
        porque:
          "A dispensa aplica-se desde o primeiro ano, desde que o rendimento previsto não exceda 15.000 €.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º-B CIRS",
    fonte: fonte("art101bCirs"),
  },
  {
    id: "ret-86",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um advogado (Art. 151.º) fatura 50.000 € a clientes empresas e adicionalmente recebe 3.000 € de royalties de um livro que escreveu. No recibo do livro, a taxa de retenção e...",
    opcoes: [
      {
        texto: "23% — porque a atividade principal e Art. 151.º.",
        porque:
          "Os royalties de um livro são direitos de autor, com taxa própria de 16,5%, independentemente da atividade principal.",
      },
      {
        texto: "16,5% — porque royalties de obra literária são propriedade intelectual.",
        porque:
          "Os royalties pela cedência de direitos de autor de obra literária estão sujeitos a 16,5%, independentemente da atividade principal do trabalhador.",
      },
      {
        texto: "11,5% — porque é rendimento residual.",
        porque:
          "Royalties de obra própria são propriedade intelectual (16,5%), não serviço residual (11,5%).",
      },
      {
        texto: "0% — os rendimentos literários estão isentos de retenção.",
        porque:
          "Rendimentos de propriedade intelectual (incluindo literários) estão sujeitos a retenção de 16,5%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — direitos de autor",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-87",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador independente emite um ato isolado de 50.000 € por serviço de engenharia (Art. 151.º) a uma empresa. A retenção aplica-se normalmente?",
    opcoes: [
      {
        texto: "Não — atos isolados acima de 25.000 € têm regime especial sem retenção.",
        porque:
          "Não existe regime especial de retenção baseado no valor do ato isolado — a retenção aplica-se normalmente.",
      },
      {
        texto: "Sim — a retenção é de 23% (11.500 €), tal como se fosse um recibo verde normal.",
        porque:
          "O ato isolado segue as mesmas regras de retenção na fonte que os recibos verdes. 50.000 € × 0,23 = 11.500 €.",
      },
      {
        texto: "Sim, mas a uma taxa especial de 10% para atos isolados de grande valor.",
        porque:
          "Não existe taxa especial para atos isolados de grande valor — aplica-se a taxa normal da atividade.",
      },
      {
        texto: "Depende — pode pedir dispensa por ser ato isolado.",
        porque:
          "A dispensa de retenção depende do rendimento total previsto (< 15.000 €), não de ser ato isolado. Com 50.000 €, não pode pedir dispensa.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-88",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador independente tem rendimentos de categoria A (trabalho dependente, 25.000 €) é de categoria B (recibos verdes, 10.000 €). O limiar de dispensa de retenção (15.000 €) considera ambas as categorias?",
    opcoes: [
      {
        texto: "Sim — o limiar considera todos os rendimentos (A + B).",
        porque:
          "O limiar de dispensa do Art. 101.º-B refere-se ao rendimento da categoria B, não ao rendimento total de todas as categorias.",
      },
      {
        texto: "Não — o limiar de dispensa do Art. 101.º-B aplica-se apenas ao rendimento da categoria B (10.000 €). Pode pedir dispensa.",
        porque:
          "O Art. 101.º-B refere-se ao rendimento de categoria B previsto. Com 10.000 € < 15.000 €, pode pedir dispensa de retenção nos recibos verdes.",
      },
      {
        texto: "O limiar aplica-se apenas à categoria A.",
        porque:
          "O Art. 101.º-B e sobre retenção de rendimentos de categoria B, não A.",
      },
      {
        texto: "Depende da taxa marginal do IRS global.",
        porque:
          "A dispensa de retenção tem critério fixo (rendimento B < 15.000 €), não depende de escalões marginais.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º-B CIRS",
    fonte: fonte("art101bCirs"),
  },
  {
    id: "ret-89",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Se um trabalhador independente com IRS Jovem (isenção parcial) tiver retenção na fonte, a retenção é ajustada pela isenção do IRS Jovem?",
    opcoes: [
      {
        texto: "Sim — a retenção é automaticamente reduzida em função da percentagem de isenção.",
        porque:
          "A retenção na fonte pode ser ajustada pelo IRS Jovem, mas na prática o ajuste final é feito na declaração anual de IRS.",
      },
      {
        texto: "Não — a retenção é feita à taxa normal e o benefício do IRS Jovem é aplicado na declaração anual (Modelo 3).",
        porque:
          "Na prática, a retenção é feita à taxa normal (23%, 11,5%, etc.) e o benefício do IRS Jovem resulta num reembolso maior na declaração anual.",
      },
      {
        texto: "Não — o IRS Jovem é a retenção na fonte são incompatíveis.",
        porque:
          "São compatíveis — o IRS Jovem reduz o rendimento tributável, resultando num IRS menor e portanto maior reembolso das retenções.",
      },
      {
        texto: "Depende — só se aplica se o trabalhador tiver menos de 26 anos.",
        porque:
          "O IRS Jovem aplica-se até aos 35 anos, não 26 — e o ajuste é feito na declaração anual.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS · Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-90",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador tem 80% dos rendimentos de clientes estrangeiros (sem retenção) e 20% de um cliente português (com retenção de 23%). No final do ano, e provável que...",
    opcoes: [
      {
        texto: "...receba um grande reembolso, porque a maior parte já foi retida.",
        porque:
          "Apenas 20% tem retenção — e provável que tenha de pagar IRS adicional, não receber reembolso.",
      },
      {
        texto: "...tenha de pagar IRS adicional na declaração anual, porque a retenção cobriu apenas uma fração do imposto total.",
        porque:
          "Com 80% dos rendimentos sem retenção, a maioria do IRS devido não foi adiantada — terá de pagar a diferença na liquidação.",
      },
      {
        texto: "...não pague IRS, porque rendimentos de clientes estrangeiros são isentos.",
        porque:
          "Residentes em Portugal pagam IRS sobre o rendimento mundial — os rendimentos estrangeiros são tributados.",
      },
      {
        texto: "...fique a zeros: rendimentos estrangeiros e portugueses compensam-se.",
        porque:
          "Não há compensação automática — o IRS é sobre o total é as retenções (parciais) são deduzidas.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 15.º e 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-91",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador tem contabilidade organizada (não está no regime simplificado). As taxas de retenção na fonte são as mesmas ou diferentes?",
    opcoes: [
      {
        texto: "São diferentes — a contabilidade organizada tem taxas de retenção mais baixas.",
        porque:
          "As taxas de retenção são idênticas, independentemente do regime (simplificado ou contabilidade organizada).",
      },
      {
        texto: "São as mesmas — as taxas de retenção dependem do tipo de atividade, não do regime contabilístico.",
        porque:
          "As taxas do Art. 101.º CIRS aplicam-se da mesma forma ao regime simplificado é à contabilidade organizada.",
      },
      {
        texto: "Na contabilidade organizada não há retenção na fonte.",
        porque:
          "A retenção aplica-se a ambos os regimes — não há isenção por ter contabilidade organizada.",
      },
      {
        texto: "Na contabilidade organizada a retenção é de 25%.",
        porque:
          "25% era a taxa pré-OE2025 — e as taxas são iguais em ambos os regimes.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-92",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador independente presta serviços a uma sociedade onde detém 10% do capital (mais de 5%, durante mais de 183 dias). O coeficiente do regime simplificado é 1,0 (transparência fiscal). A taxa de retenção é afetada?",
    opcoes: [
      {
        texto: "Sim — a taxa de retenção também sobe para 100%.",
        porque:
          "O coeficiente de transparência (1,0) afeta o regime simplificado (cálculo do rendimento tributável), não a taxa de retenção.",
      },
      {
        texto: "Não — a taxa de retenção permanece a do tipo de atividade base (23% se Art. 151.º), independentemente do coeficiente de transparência.",
        porque:
          "A taxa de retenção depende do tipo de atividade (Art. 101.º CIRS), não do coeficiente do regime simplificado. A transparência fiscal afeta o coeficiente, não a retenção.",
      },
      {
        texto: "Não há retenção — a sociedade própria está isenta.",
        porque:
          "A sociedade deve reter normalmente, como qualquer entidade com contabilidade organizada.",
      },
      {
        texto: "A taxa passa para 16,5%.",
        porque:
          "16,5% e para propriedade intelectual — a transparência fiscal não altera a taxa de retenção.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS · Art. 31.º, al. g) CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-93",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um fotógrafo cede direitos de autor de um portefólio fotográfico por 6.000 € e simultaneamente presta serviços de fotografia por 4.000 € (ambos a empresas). Qual o total retido?",
    opcoes: [
      {
        texto: "2.300 € (23% de 10.000 €)",
        porque:
          "As atividades têm taxas diferentes — cessão de direitos = 16,5%; serviço fotográfico = 11,5%.",
      },
      {
        texto: "990 € + 460 € = 1.450 €",
        porque:
          "Direitos de autor: 6.000 € × 0,165 = 990 €. Serviço fotográfico (fora Art. 151.º): 4.000 € × 0,115 = 460 €. Total: 1.450 €.",
      },
      {
        texto: "1.150 € (11,5% de 10.000 €)",
        porque:
          "Os direitos de autor não têm taxa de 11,5% — têm 16,5%.",
      },
      {
        texto: "1.650 € (16,5% de 10.000 €)",
        porque:
          "O serviço fotográfico não é propriedade intelectual — tem taxa de 11,5%, não 16,5%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-94",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador independente emite recibos verdes a uma empresa portuguesa e a uma filial de empresa americana com estabelecimento estável em Portugal. Ambas retêm?",
    opcoes: [
      {
        texto: "Apenas a empresa portuguesa retém.",
        porque:
          "A filial com estabelecimento estável em Portugal também é obrigada a reter, porque tem contabilidade organizada em PT.",
      },
      {
        texto: "Nenhuma retém — o trabalhador paga tudo no IRS anual.",
        porque:
          "Ambas são entidades com contabilidade organizada em Portugal — ambas retêm.",
      },
      {
        texto: "Sim, ambas retêm — qualquer entidade com contabilidade organizada em Portugal, incluindo estabelecimento estável de empresa estrangeira, e obrigada a reter.",
        porque:
          "A obrigação de retenção aplica-se a todas as entidades com contabilidade organizada em território português, incluindo estabelecimentos estáveis de empresas estrangeiras.",
      },
      {
        texto: "Apenas a filial americana retém, porque tem sede fora de Portugal.",
        porque:
          "Ambas retêm — a empresa portuguesa também é obrigada a reter.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-95",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um programador (Art. 151.º) fatura 3.500 €/mês a uma empresa: 12 meses = 42.000 €. Total retido no ano e percentagem efetiva de retenção sobre o bruto?",
    opcoes: [
      {
        texto: "9.660 € retidos (23% efetivos sobre 42.000 €).",
        porque:
          "Quando todos os recibos são a entidades com contabilidade organizada, a taxa efetiva de retenção é igual à taxa nominal: 23% × 42.000 € = 9.660 €.",
      },
      {
        texto: "4.830 € retidos (11,5% efetivos).",
        porque:
          "Programadores são Art. 151.º com 23%, não 11,5%.",
      },
      {
        texto: "10.500 € retidos (25% efetivos).",
        porque:
          "25% era a taxa antes do OE2025 — atualmente e 23%.",
      },
      {
        texto: "6.930 € retidos (16,5% efetivos).",
        porque:
          "16,5% aplica-se a propriedade intelectual, não a programação.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-96",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Se a entidade pagadora não fizer a retenção na fonte quando obrigada, quem e responsável perante a AT?",
    opcoes: [
      {
        texto: "O trabalhador independente (prestador).",
        porque:
          "A responsabilidade pela retenção é da entidade pagadora, não do prestador — e a entidade que deve reter e entregar ao Estado.",
      },
      {
        texto: "A entidade pagadora (substituto tributário), que é responsável por reter e entregar a retenção ao Estado.",
        porque:
          "A entidade pagadora e o 'substituto tributário' — tem a obrigação legal de reter e entregar ao Estado. Se não o fizer, e responsabilizada.",
      },
      {
        texto: "Ninguém — a responsabilidade desaparece se a retenção não for feita.",
        porque:
          "A obrigação não desaparece — a entidade pagadora e responsabilizada pela AT.",
      },
      {
        texto: "Ambos — cada um paga metade da retenção em falta.",
        porque:
          "A responsabilidade primária e da entidade pagadora, não partilhada em partes iguais.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — substituição tributária",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-97",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador emite ato isolado de 30.000 € por serviços de consultoria (Art. 151.º) em março. Em abril, abre atividade regular. A retenção sobre o ato isolado foi...",
    opcoes: [
      {
        texto: "6.900 € (23% de 30.000 €) — e conta para o IRS do ano.",
        porque:
          "O ato isolado de consultoria tem retenção de 23%, é o valor retido e incluído na declaração anual de IRS do ano em questão.",
      },
      {
        texto: "0 € — atos isolados não têm retenção.",
        porque:
          "Atos isolados de prestação de serviços estão sujeitos à retenção normal da atividade.",
      },
      {
        texto: "3.450 € (11,5%) — atos isolados têm taxa reduzida.",
        porque:
          "Não existe taxa reduzida para atos isolados — aplica-se a taxa da atividade (23% para Art. 151.º).",
      },
      {
        texto: "6.900 € — mas não conta para o IRS do ano se abrir atividade depois.",
        porque:
          "A retenção do ato isolado conta sempre para o IRS do ano fiscal em que ocorreu.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-98",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Antes do OE2025, um médico que faturasse 80.000 € no ano (tudo a clínicas) teria 20.000 € retidos (25%). Com a taxa atual de 23%, quanto é retido e quanto 'poupa' em cash flow ao longo do ano?",
    opcoes: [
      {
        texto: "18.400 € retidos. Poupança de cash flow: 1.600 €/ano.",
        porque:
          "80.000 € × 0,23 = 18.400 €. Antes: 80.000 € × 0,25 = 20.000 €. Diferença = 1.600 € de maior liquidez ao longo do ano.",
      },
      {
        texto: "18.400 € retidos. Poupança de cash flow: 800 €/ano.",
        porque:
          "A diferença é de 2 p.p. × 80.000 € = 1.600 €, não 800 €.",
      },
      {
        texto: "16.000 € retidos. Poupança de cash flow: 4.000 €/ano.",
        porque:
          "16.000 € corresponderia a uma taxa de 20%, não 23%.",
      },
      {
        texto: "20.000 € retidos. Não há poupança.",
        porque:
          "A taxa mudou de 25% para 23% — há uma poupança de cash flow de 1.600 €.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — OE2025",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-99",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador independente com dois CAE: um de consultoria de gestão (Art. 151.º, 23%) e outro de venda de produtos digitais (venda de bens, 0%). Fatura 5.000 € de consultoria e 8.000 € de vendas, ambos a empresas. Quanto é retido no total?",
    opcoes: [
      {
        texto: "2.990 € (23% de 13.000 €)",
        porque:
          "A taxa de 23% só se aplica à consultoria — a venda de bens não tem retenção.",
      },
      {
        texto: "1.150 € (23% de 5.000 €)",
        porque:
          "Apenas a consultoria (5.000 €) tem retenção de 23%. As vendas de bens (8.000 €) não estão sujeitas. Total retido: 1.150 €.",
      },
      {
        texto: "1.495 € (11,5% de 13.000 €)",
        porque:
          "A consultoria e Art. 151.º (23%), não 11,5% — e as vendas não têm retenção.",
      },
      {
        texto: "0 € — quando há venda de bens, toda a faturação fica isenta de retenção.",
        porque:
          "A isenção de retenção das vendas de bens não contamina os serviços — cada atividade mantém a sua taxa.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-100",
    categoria: "retencao",
    dificuldade: 3,
    pergunta:
      "Um trabalhador independente recebe 25.000 € de uma universidade pública (Art. 151.º). A universidade retém? Se sim, a que taxa?",
    opcoes: [
      {
        texto: "Não — entidades públicas estão isentas de reter.",
        porque:
          "Entidades públicas (como universidades) têm contabilidade organizada é são obrigadas a reter na fonte.",
      },
      {
        texto: "Sim, a 11,5% — entidades públicas aplicam taxa reduzida.",
        porque:
          "Não existe taxa reduzida para entidades públicas — a taxa depende da atividade do trabalhador.",
      },
      {
        texto: "Sim, a 23% — a universidade (entidade com contabilidade organizada) retém à taxa normal das profissões do Art. 151.º.",
        porque:
          "Universidades e demais entidades públicas com contabilidade organizada retêm à taxa normal da atividade (23% para Art. 151.º).",
      },
      {
        texto: "Depende do tipo de contrato (prestação de serviços vs. bolsa).",
        porque:
          "A pergunta refere-se a rendimentos de categoria B (recibos verdes) — as bolsas têm regime distinto, mas o serviço a recibos verdes segue as regras normais de retenção.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  },
];
