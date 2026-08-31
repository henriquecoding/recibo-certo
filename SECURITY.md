# Política de segurança

## Versões suportadas

A branch `main` e a implantação de produção em
`https://www.recibocerto.pt` são as únicas versões suportadas. Previews e
branches de trabalho podem estar incompletas e não devem receber dados reais.

## Comunicar uma vulnerabilidade

Não abras uma issue pública. Envia um email para
`recibocerto.pt@gmail.com` com o assunto **[SEGURANÇA] Recibo Certo** e inclui:

- descrição e impacto;
- URL, rota ou ficheiro afetado;
- passos mínimos para reproduzir;
- evidência sem dados pessoais de terceiros;
- proposta de correção, se existir.

Nunca envies tokens, palavras-passe ou dados pessoais no corpo do email.
Revoga primeiro qualquer segredo que possa ter sido exposto.

## Regras de teste

Sem autorização escrita, não é permitido:

- aceder, alterar ou eliminar dados de terceiros;
- testar em volume, provocar indisponibilidade ou contornar rate limits;
- realizar phishing, engenharia social ou persistência;
- extrair código, bancos de dados, perguntas, respostas ou conteúdo;
- publicar detalhes antes de a correção estar disponível.

Usa a menor prova possível, interrompe o teste assim que o impacto estiver
demonstrado e preserva os identificadores técnicos necessários à investigação.

## Compromisso de resposta

Pretendemos confirmar a receção em até 5 dias úteis, comunicar uma primeira
avaliação em até 10 dias úteis e coordenar a divulgação depois da correção. Os
prazos dependem da gravidade e não constituem SLA contratual.

## Segredos e fronteiras

- Segredos de produção vivem apenas nos ambientes protegidos da Vercel,
  Supabase e fornecedores; nunca no Git.
- Variáveis com prefixo `NEXT_PUBLIC_` são públicas por definição.
- Módulos que leem credenciais ou executam operações privilegiadas devem
  importar `server-only`.
- Um segredo encontrado no histórico deve ser revogado e rodado; apagar apenas
  o ficheiro ou criar um commit de reversão não elimina o segredo do histórico.
- A verificação `npm run security:boundary` deve passar antes de integrar.

Esta política não concede autorização para testar o sistema nem licença sobre
o código ou conteúdo.
