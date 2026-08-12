## O que muda

<!-- Explica a alteração e o motivo. -->

## Fronteira de segurança e propriedade intelectual

- [ ] Não introduz segredos, dados pessoais, ficheiros `.env`, chaves ou
      credenciais no Git, logs, fixtures, screenshots ou artefactos.
- [ ] Variáveis `NEXT_PUBLIC_` contêm apenas informação assumidamente pública.
- [ ] Código que lê segredos ou usa privilégios importa `server-only`.
- [ ] Nenhum banco proprietário, resposta de quiz ou motor exclusivo passou
      para um Client Component, bundle público, source map ou resposta em massa.
- [ ] As APIs devolvem apenas os campos necessários e aplicam autenticação,
      autorização, validação, rate limit e anti-replay quando aplicável.
- [ ] Não enfraquece robots.txt, Proxy, TDMRep, CSP, headers ou `LICENSE`.
- [ ] Actions novas têm permissões mínimas; ações de terceiros estão fixadas a
      um commit completo e foram revistas.
- [ ] Dependências e código copiado têm licença compatível e autoria registada.
- [ ] `npm run security:boundary` passou.

## Validação

<!-- Lista comandos, testes manuais, screenshots e limitações. -->

## Implantação e reversão

<!-- Indica variáveis/migrações e como reverter sem perder dados. -->
