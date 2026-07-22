# 25 — Checklist de implementação e aprovação

## Regra/rubrica

- [ ] Nome jurídico e UX distintos.
- [ ] Factos mínimos e documentos definidos.
- [ ] Caixa, IRS, SS, retenção e custo separados.
- [ ] Bolsa de retenção correta.
- [ ] Vigência e três jurisdições avaliadas.
- [ ] Arredondamento documentado.
- [ ] Fonte primária ativa e verificada semanticamente.
- [ ] `needs_input` e `unsupported` desenhados.
- [ ] Testes de fronteira e dourados aprovados.

## Dataset

- [ ] Parâmetros transcritos por duas pessoas/processos independentes.
- [ ] URLs abrem a disposição correta, não apenas HTTP 200.
- [ ] Alterações e revogações pesquisadas.
- [ ] Revisor fiscal/laboral identificado.
- [ ] Hash/versão e data de aprovação registados.
- [ ] Rollback ensaiado.

## Simulador

- [ ] Perguntas em linguagem simples e condicionais.
- [ ] Builder por rubrica com editar/remover/reordenar.
- [ ] Resultado por linha e totais conservados.
- [ ] Estados vazio, carregamento, dados em falta, não suportado e conflito.
- [ ] Mobile, desktop, dark mode, zoom 200%, teclado e leitor de ecrã.
- [ ] Importação nunca escolhe enquadramento incerto silenciosamente.
- [ ] Auditoria diz «diferença», não «fraude/erro», sem prova.
- [ ] Guardar/exportar preserva versão e memória.

## Gate final

- [ ] Testes do motor e aplicação passam.
- [ ] Build passa sem avisos novos materiais.
- [ ] Auditoria de dependências limpa.
- [ ] Cross-run legado/novo sem divergências inexplicadas.
- [ ] Dataset `approved` apenas após revisão independente.
- [ ] Feature flag, telemetria sem dados sensíveis e rollback prontos.
