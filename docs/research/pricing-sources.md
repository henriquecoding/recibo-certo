# Matriz de fontes — Pricing Engine (Portugal)

> Regra do projeto: **nenhuma regra fiscal ou legal entra em código sem constar
> desta matriz.** Cada linha tem tema, regra, fonte, URL, data de consulta,
> vigência e nível de confiança. As regras já cobertas por `src/lib/fiscal-data.ts`
> **não são reescritas aqui** — são referenciadas, porque duplicar um número
> fiscal é exatamente o defeito que a regra 1 do `CLAUDE.md` existe para evitar.

Data de consulta de todas as linhas novas: **2026-08-18**.

## Níveis de confiança

| Nível | Significado |
|---|---|
| `oficial` | Fonte primária: código tributário, Diário da República, ASAE, Segurança Social, AT. |
| `institucional` | Ordem dos Contabilistas Certificados, IAPMEI, associações setoriais, reguladores. |
| `comercial` | Preçário publicado pelo próprio operador (Stripe, CTT, marketplace). Verdadeiro para aquele operador, variável no tempo. |
| `estimativa` | Depende de dados do utilizador ou de pressupostos declarados. Nunca apresentado como facto. |

---

## 1. Regras já existentes no projeto (reutilizadas, não reescritas)

| Tema | Regra | Onde vive | Confiança |
|---|---|---|---|
| Taxas de IVA | Continente 23/13/6, Madeira 22/12/5, Açores 16/9/4 | `IVA_TAXAS` (`fiscal-data.ts`) | oficial |
| Isenção de IVA | Art. 53.º CIVA — limiar 15 000 € do ano civil anterior; 18 750 € (+25%) para perda imediata | `IVA_ISENCAO_LIMITE`, `IVA_ISENCAO_EXCESSO`, motor `fiscal-iva.ts` | oficial |
| Sem direito à dedução | Art. 53.º n.º 3 CIVA — quem está isento não deduz o IVA suportado | `fiscal-iva.ts` | oficial |
| Coeficientes do regime simplificado | Art. 31.º CIRS (0,75 serviços Art. 151.º · 0,35 vendas/hotelaria · 0,95 propriedade intelectual…) | `ATIVIDADES`, `efeitoFiscal()` | oficial |
| Segurança Social — TI | Taxa 21,4%; base 70% (serviços) / 20% (bens); teto 12 × IAS; mínimo 20 €/mês | `SS_TAXA`, `SS_COEFICIENTE`, `contribuicoesSS()` | oficial |
| Retenção na fonte | 23% (Art. 151.º) · 11,5% · 16,5% · dispensa do Art. 101.º-B | `retencaoNaFonte()` | oficial |
| Escalões de IRS 2026 | Art. 68.º CIRS | `ESCALOES_IRS` | oficial |
| IAS 2026 | 537,13 € | `IAS` | oficial |

---

## 2. Regras novas — preço ao consumidor

| Tema | Regra | Fonte | URL | Vigência | Confiança |
|---|---|---|---|---|---|
| Preço ao consumidor | O preço de venda indicado ao consumidor é o **preço total, com todas as taxas e impostos incluídos** | ASAE — Afixação de preços; DL n.º 138/90, alterado pelo DL n.º 162/99 | https://www.asae.gov.pt/perguntas-frequentes1/area-economica/precos/afixacao-de-precos.aspx | Em vigor | oficial |
| Legibilidade | Preço indicado «em dígitos, de modo visível, inequívoco, fácil e perfeitamente legível» | idem | idem | Em vigor | oficial |
| Preço por unidade de medida | Obrigatório para produtos alimentares e não alimentares vendidos a granel ou em quantidade, além do preço de venda | ASAE | https://www.asae.gov.pt/perguntas-frequentes1/area-economica/precos/preco-por-unidade-de-medida.aspx | Em vigor | oficial |
| Preço de serviços | Afixado em listas/cartazes visíveis no local onde os serviços são propostos, com indicação clara do critério (hora, percentagem, tarefa) | ASAE / DL 138/90 | idem | Em vigor | oficial |
| Contratos à distância | O preço total, **incluindo impostos, transporte e outros encargos**, é informação pré-contratual obrigatória e integra o contrato | DL n.º 24/2014, art. 4.º | https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=2062&tabela=leis | Em vigor | oficial |

## 3. Regras novas — reduções de preço, saldos e promoções

| Tema | Regra | Fonte | URL | Vigência | Confiança |
|---|---|---|---|---|---|
| Preço de referência | O «preço mais baixo anteriormente praticado» é o **mais baixo dos 30 dias consecutivos anteriores** à redução — incluindo reduções anteriores | ASAE; DL n.º 70/2007 na redação do DL n.º 109-G/2021 | https://www.asae.gov.pt/perguntas-frequentes1/area-economica/praticas-comerciais-saldos.aspx | Desde 2022 | oficial |
| Informação obrigatória | Modalidade (saldos/promoção/liquidação), tipo de produto, preço mais baixo anterior, data de início e duração | idem | idem | Em vigor | oficial |
| Duração dos saldos | Máximo de **124 dias por ano civil** no conjunto | idem | idem | Em vigor | oficial |
| Liquidações | Sem período fixo; máximo de 90 dias por comunicação | idem | idem | Em vigor | oficial |
| Comunicação prévia | Saldos e liquidações comunicados à ASAE com **5 dias úteis** de antecedência (ePortugal). Promoções não carecem de comunicação | idem | idem | Em vigor | oficial |
| Proibição | Proibido vender a preço reduzido bens adquiridos **depois** do início da redução | idem | idem | Em vigor | oficial |

## 4. Regras novas — devoluções, garantia e o seu custo

| Tema | Regra | Fonte | URL | Vigência | Confiança |
|---|---|---|---|---|---|
| Livre resolução | 14 dias nos contratos à distância; 30 dias fora do estabelecimento | DL n.º 24/2014, art. 10.º | https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=2062&tabela=leis | Em vigor | oficial |
| Prazo alargado | Falta de informação pré-contratual sobre o direito → prazo estende-se **12 meses** | idem | idem | Em vigor | oficial |
| Custo da devolução | Suportado pelo **consumidor**, salvo acordo em contrário ou falta de informação prévia | idem, art. 13.º | idem | Em vigor | oficial |
| Portes de entrega | O vendedor **reembolsa os portes de entrega originais** (na modalidade normal) | idem | idem | Em vigor | oficial |
| Exceções | Bens personalizados, perecíveis, selados abertos, conteúdo digital iniciado com consentimento | idem, art. 17.º | idem | Em vigor | oficial |
| Garantia de conformidade | Regime da conformidade dos bens e conteúdos digitais | DL n.º 84/2021 | https://www.anacom.pt/render.jsp?contentId=1708830 | Em vigor | oficial |

## 5. Regras novas — IVA em canais e mercados

| Tema | Regra | Fonte | URL | Vigência | Confiança |
|---|---|---|---|---|---|
| Vendas à distância intra-UE | Abaixo de **10 000 €/ano** (líquidos de IVA, corrente ou anterior) tributa-se em Portugal (Art. 6.º-A CIVA); acima, no Estado de destino | OCC — IVA / Vendas intracomunitárias à distância; RITI arts. 10.º-11.º; Lei n.º 47/2020 | https://www.occ.pt/pt-pt/noticias/iva-vendas-intracomunitarias-distancia | Desde 07/2021 | institucional |
| Balcão Único (OSS) | Registo único em Portugal e declaração trimestral, em alternativa ao registo em cada Estado-membro. Opcional | idem | idem | Em vigor | institucional |
| Serviços B2B na UE | Autoliquidação pelo adquirente (Art. 6.º n.º 6 CIVA) — o prestador não liquida IVA português | `SOURCES.art6civa` em `fiscal-data.ts` | https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva6.aspx | Em vigor | oficial |
| Bens em segunda mão | Regime da margem: IVA incide sobre a **margem**, não sobre o preço total | DL n.º 199/96; OCC | https://www.occ.pt/pt-pt/noticias/iva-regime-da-margem-3 | Em vigor | institucional |

## 6. Custos de canal — preçários comerciais (`comercial`, versionados)

> Estes valores **mudam sem aviso**. Vivem em `src/lib/pricing/regras.ts` com
> `validFrom`, `verifiedAt` e URL, e a interface mostra-os sempre como
> *pressuposto editável*, nunca como facto imposto.

| Canal | Custo | Fonte | URL | Consultado | Confiança |
|---|---|---|---|---|---|
| Stripe — cartões EEE | 1,5% + 0,25 € | Stripe (preçário PT) | https://stripe.com/pt/pricing | 2026-08-18 | comercial |
| Stripe — cartões premium EEE | 2,8% + 0,25 € | idem | idem | 2026-08-18 | comercial |
| Stripe — cartões internacionais | 3,15% + 0,25 € (+2% conversão) | idem | idem | 2026-08-18 | comercial |
| Stripe — MB WAY | 1,5% + 0,25 € | idem | idem | 2026-08-18 | comercial |
| Stripe — presencial (EEE) | 1,4% + 0,10 € | idem | idem | 2026-08-18 | comercial |
| Stripe — litígio (chargeback) | 20 € por contestação recebida | idem | idem | 2026-08-18 | comercial |
| Amazon (ES, serve PT) | 39 €/mês plano profissional; comissão 5–22% por categoria; FBA 2,70–5,90 €/unidade | Zunapro; Webfy | https://www.zunapro.com/portugal/en/blog/top-marketplaces-portugal-2025 | 2026-08-18 | comercial |
| Worten Marketplace | Sem mensalidade; comissão 8–18% por categoria | Zunapro | idem | 2026-08-18 | comercial |
| Fnac Portugal | Sem mensalidade; comissão 6–19% por categoria | Zunapro | idem | 2026-08-18 | comercial |
| KuantoKusta | Híbrido CPC (0,05–1,50 €/clique) + comissão 3–15% | Zunapro | idem | 2026-08-18 | comercial |
| El Corte Inglés PT | Sem mensalidade; comissão 10–25% por categoria | Zunapro | idem | 2026-08-18 | comercial |
| OLX Portugal | Anúncio gratuito; destaques 2,49–14,99 €; OLX Pro 20–150 €/mês; OLX Entregas ~5% | Webfy | https://www.webfy.pt/pt-br/blog/marketplace-vs-loja-propria-custos-reais-em-2026 | 2026-08-18 | comercial |
| CTT | Tarifário 2026 publicado em PDF; varia por peso, formato e serviço | CTT | https://www.ctt.pt/transversais/lista-de-precos-de-correio | 2026-08-18 | comercial |

## 7. Custo do trabalho

| Tema | Valor | Fonte | URL | Vigência | Confiança |
|---|---|---|---|---|---|
| Retribuição mínima mensal garantida | 920 €/mês (14 meses) | DGERT | https://www.dgert.gov.pt/retribuicao-minima-mensal-garantida-para-2026 | 2026 | oficial |
| IAS 2026 | 537,13 € | `fiscal-data.ts` (`IAS`) | Portal da Segurança Social | 2026 | oficial |

## 8. O que ficou deliberadamente de fora

- **Preços de mercado por categoria.** Não existe fonte pública fiável e
  atualizada que cubra «quanto custa um bolo de aniversário em Braga». A
  ferramenta diz *«não temos dados suficientes para estimar o preço de mercado»*
  em vez de inventar um número. É a diferença entre uma ferramenta credível e um
  gerador de expectativas.
- **Ecovalor / Ponto Verde por material.** As tabelas existem mas são por
  material e por peso de embalagem, e exigem uma modelação de embalagem que
  ultrapassa o âmbito da v1. Fica como custo variável introduzido pelo
  utilizador, com nota explicativa.
- **Tabelas completas dos CTT.** O tarifário é um PDF extenso, por escalões de
  peso e serviço. Modelá-lo por inteiro criaria uma dependência de manutenção
  desproporcionada; os portes entram como valor introduzido, com faixas
  indicativas.
