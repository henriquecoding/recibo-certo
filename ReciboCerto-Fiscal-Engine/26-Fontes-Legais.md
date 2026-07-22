# 26 — Fontes legais e proveniência

## Fontes primárias usadas

| Tema | Fonte oficial | Uso |
|---|---|---|
| Categoria A e limites | [CIRS, artigo 2.º](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs2.aspx) | classificação IRS |
| Espécie/viatura | [CIRS, artigo 24.º](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs24.aspx) | valor de uso de viatura |
| Retenções autónomas | [CIRS, artigo 99.º-C](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs99c.aspx) | subsídios, suplementar, retroativos |
| Tabelas/IRS Jovem | [CIRS, artigo 99.º-F](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs99f.aspx) | mecânica mensal |
| Continente 2026 | [Despacho n.º 233-A/2026](https://diariodarepublica.pt/dr/detalhe/despacho/233-a-2026-998488151) | tabelas e instruções |
| Direitos laborais | [Código do Trabalho consolidado](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475) | horas, férias, Natal, cessação |
| Segurança Social | [Código Contributivo consolidado](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34514575) | incidência e taxas |
| Refeição 2026 | [Portaria n.º 51-B/2026/1](https://diariodarepublica.pt/dr/detalhe/portaria/51-b-2026-1031110274) | 6,15 €/dia |
| RMMG 2026 | [Decreto-Lei n.º 139/2025](https://diariodarepublica.pt/dr/detalhe/decreto-lei/139-2025-992879809) | 920 € e penhora/piso doença |
| Penhora | [CPC, artigo 738.º](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2013-34580575) | limites sobre líquido |
| Doença | [Guia prático 2026](https://www.seg-social.pt/ptss/pssd/documento/cmdde8gsx000qi12yzi40plc6) | RR, taxas, espera e limites |
| Parentalidade | [Guia prático 2026](https://www.seg-social.pt/ptss/pssd/documento/cmc1ynbn400fskl2y5g278wvp) | RR, modalidades e mínimos |

## Política de fontes

Só AT, Diário da República, Segurança Social e jornais oficiais regionais podem fundamentar parâmetros. Fontes secundárias podem ajudar a localizar uma regra, mas nunca entram no dataset aprovado.

## Verificação semântica

Cada entrada de `src/legal/catalogue.ts` contém âncoras esperadas, termos proibidos, vigência, estado e data da revisão humana. Uma página responder não prova que contém o artigo correto.

## Atualização

Alteração material cria nova versão efetiva. A fonte anterior permanece para reproduzir recibos históricos. Conflitos entre atos/fontes bloqueiam a regra até resolução documentada.

## Madeira e Açores

As tabelas regionais já existem no legado e devem ser migradas com os atos oficiais completos e cenários dourados próprios. Não se deriva uma região por aplicar percentagem à tabela do Continente.
