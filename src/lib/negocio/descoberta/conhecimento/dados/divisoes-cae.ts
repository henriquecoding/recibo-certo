// ═══════════════════════════════════════════════════════════════════════
//  AS DIVISÕES DA CAE, COMO O INE AS PUBLICA
//  ---------------------------------------------------------------------
//  Copiadas da dimensão «Atividade económica (Divisão - CAE Rev. 3)» do
//  indicador 0014449 do INE — a mesma dimensão que o conector de oferta
//  consulta. Não é uma transcrição de memória nem de um PDF: é a lista
//  que o serviço devolve, e é por isso que serve de árbitro.
//
//  Existe para uma coisa só: `negocio-descoberta-ontologia.test.ts`
//  recusa uma divisão que a ontologia use e o INE não conheça. Um código
//  inventado não daria erro nenhum — daria zero empresas, e zero
//  empresas lê-se como «mercado livre». É o modo de falhar mais caro
//  que esta camada podia ter, e o mais silencioso.
//
//  As secções (letras A–S) e o total (TOT) ficam de fora de propósito:
//  a ontologia mapeia para divisões, e somar uma secção com uma divisão
//  contaria as mesmas empresas duas vezes.
//
//  Fonte: INE, Sistema de contas integradas das empresas, indicador
//  0014449 · https://www.ine.pt/xurl/indx/0014449/PT
//  Lido em 2026-08-23.
// ═══════════════════════════════════════════════════════════════════════

/** Código da divisão → designação oficial. 81 divisões. */
export const DIVISOES_CAE: ReadonlyMap<string, string> = new Map([
  ["01", "Agricultura, produção animal, caça e atividades dos serviços relacionados"],
  ["02", "Silvicultura e exploração florestal"],
  ["03", "Pesca e aquicultura"],
  ["05", "Extração de hulha e lenhite"],
  ["06", "Extração de petróleo bruto e gás natural"],
  ["07", "Extração e preparação de minérios metálicos"],
  ["08", "Outras indústrias extrativas"],
  ["09", "Atividades dos serviços relacionados com as indústrias extrativas"],
  ["10", "Indústrias alimentares"],
  ["11", "Indústria das bebidas"],
  ["12", "Indústria do tabaco"],
  ["13", "Fabricação de têxteis"],
  ["14", "Indústria do vestuário"],
  ["15", "Indústria do couro e dos produtos do couro"],
  ["16", "Indústrias da madeira e da cortiça e suas obras, exceto mobiliário; Fabricação de obras de cestaria e de espartaria"],
  ["17", "Fabricação de pasta, de papel, de cartão e seus artigos"],
  ["18", "Impressão e reprodução de suportes gravados"],
  ["19", "Fabricação de coque, produtos petrolíferos refinados e de aglomerados de combustíveis"],
  ["20", "Fabricação de produtos químicos e de fibras sintéticas ou artificiais, exceto produtos farmacêuticos"],
  ["21", "Fabricação de produtos farmacêuticos de base e de preparações farmacêuticas"],
  ["22", "Fabricação de artigos de borracha e de matérias plásticas"],
  ["23", "Fabricação de outros produtos minerais não metálicos"],
  ["24", "Indústrias metalúrgicas de base"],
  ["25", "Fabricação de produtos metálicos, exceto máquinas e equipamentos"],
  ["26", "Fabricação de equipamentos informáticos, equipamento para comunicações e produtos eletrónicos e óticos"],
  ["27", "Fabricação de equipamento elétrico"],
  ["28", "Fabricação de máquinas e de equipamentos, n.e."],
  ["29", "Fabricação de veículos automóveis, reboques, semi-reboques e componentes para veículos automóveis"],
  ["30", "Fabricação de outro equipamento de transporte"],
  ["31", "Fabrico de mobiliário e de colchões"],
  ["32", "Outras indústrias transformadoras"],
  ["33", "Reparação, manutenção e instalação de máquinas e equipamentos"],
  ["35", "Eletricidade, gás, vapor, água quente e fria e ar frio"],
  ["36", "Captação, tratamento e distribuição de água"],
  ["37", "Recolha, drenagem e tratamento de águas residuais"],
  ["38", "Recolha, tratamento e eliminação de resíduos; valorização de materiais"],
  ["39", "Descontaminação e atividades similares"],
  ["41", "Promoção imobiliária (desenvolvimento de projetos de edifícios); construção de edifícios"],
  ["42", "Engenharia civil"],
  ["43", "Atividades especializadas de construção"],
  ["45", "Comércio, manutenção e reparação, de veículos automóveis e motociclos"],
  ["46", "Comércio por grosso (inclui agentes), exceto de veículos automóveis e motociclos"],
  ["47", "Comércio a retalho, exceto de veículos automóveis e motociclos"],
  ["49", "Transportes terrestres e transportes por oleodutos ou gasodutos"],
  ["50", "Transportes por água"],
  ["51", "Transportes aéreos"],
  ["52", "Armazenagem e atividades auxiliares dos transportes(inclui manuseamento)"],
  ["53", "Atividades postais e de courier"],
  ["55", "Alojamento"],
  ["56", "Restauração e similares"],
  ["58", "Atividades de edição"],
  ["59", "Atividades cinematográficas, de vídeo, de produção de programas de televisão, de gravação de som e de edição de música"],
  ["60", "Atividades de rádio e de televisão"],
  ["61", "Telecomunicações"],
  ["62", "Consultoria e programação informática e atividades relacionadas"],
  ["63", "Atividades dos serviços de informação"],
  ["68", "Atividades imobiliárias"],
  ["69", "Atividades jurídicas e de contabilidade"],
  ["70", "Atividades das sedes sociais e de consultoria para a gestão"],
  ["71", "Atividades de arquitetura, de engenharia e técnicas afins; atividades de ensaios e de análises técnicas"],
  ["72", "Atividades de investigação científica e de desenvolvimento"],
  ["73", "Publicidade, estudos de mercado e sondagens de opinião"],
  ["74", "Outras atividades de consultoria, científicas, técnicas e similares"],
  ["75", "Atividades veterinárias"],
  ["77", "Atividades de aluguer"],
  ["78", "Atividades de emprego"],
  ["79", "Agências de viagem, operadores turísticos, outros serviços de reservas e atividades relacionadas"],
  ["80", "Atividades de investigação e segurança"],
  ["81", "Atividades relacionadas com edifícios, plantação e manutenção de jardins"],
  ["82", "Atividades de serviços administrativos e de apoio prestados às empresas"],
  ["85", "Educação"],
  ["86", "Atividades de saúde humana"],
  ["87", "Atividades de apoio social com alojamento"],
  ["88", "Atividades de apoio social sem alojamento"],
  ["90", "Atividades de teatro, de música, de dança e outras atividades artísticas e literárias"],
  ["91", "Atividades das bibliotecas, arquivos, museus e outras atividades culturais"],
  ["92", "Lotarias e outros jogos de aposta"],
  ["93", "Atividades desportivas, de diversão e recreativas"],
  ["94", "Atividades das organizações associativas"],
  ["95", "Reparação de computadores e de bens de uso pessoal e doméstico"],
  ["96", "Outras atividades de serviços pessoais"],
]);
