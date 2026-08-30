# Rollout e rollback da homepage

Decisão operacional de agosto de 2026 para as cinco rotas de foco.

## Decisão

Não se mantém uma segunda homepage dentro do bundle nem se usa
`NEXT_PUBLIC_HOME_FOCOS_V2`. A versão anterior não é uma implementação
independente conservada no repositório: reconstruí-la para alimentar uma flag
duplicaria texto, componentes e grafos cliente, precisamente o piso que este
trabalho reduz. Uma variável `NEXT_PUBLIC_*` seria ainda resolvida no build e
obrigaria a criar outro artefacto para cada percentagem.

O rollout 10% → 50% → 100% é feito entre **deployments imutáveis** pela
[Rolling Release da Vercel](https://vercel.com/docs/rolling-releases), com
avanço manual. Assim, a versão anterior continua a ser um artefacto já
verificado, o canário conserva todas as rotas estáticas e nenhuma decisão por
utilizador entra no middleware ou no bundle da homepage.

## Gates antes da promoção

1. O commit da preview é exatamente o commit revisto no GitHub.
2. Tipos, testes, build, isolamento/chunks e screenshots pixel estão verdes.
3. Chromium e WebKit bloqueiam o merge; Firefox valida o caminho de teclado.
4. A preview prova `Cache-Control`, `x-vercel-cache`, zero função nas trocas
   preparadas e zero carregamento de overlays alheios.
5. As 20 combinações visuais (cinco focos × claro/escuro × desktop/mobile)
   foram comparadas com a baseline auditada.
6. Não há erros de runtime no deployment e os deep links respondem 200.

## Preparação operacional

Configurar uma vez no projeto, antes do deploy de produção:

```sh
vercel rolling-release configure --enable \
  --advancement-type=manual-approval --stage=10 --stage=50
```

Esta configuração não promove uma preview nem altera o tráfego por si só. O
deployment candidato só entra no rollout depois de passar os gates e de uma
decisão explícita de produção.

## Rollout

- Iniciar com `vercel rolling-release start --dpl=<deployment-validado> --yes`;
  não executar um build novo.
- Aos 10%, repetir smoke, erros de runtime e métricas por dispositivo/rota.
- Avançar manualmente para 50% apenas com os gates de canário verdes.
- Completar com `vercel rolling-release complete --dpl=<deployment-validado>`
  apenas depois da janela de observação definida.
- Registar deployment anterior, deployment novo, commit, hora e responsável.
- Fazer smoke anónimo em `/`, nos quatro deep links e em `/termos`.
- Observar erros, LCP, INP e CLS por dispositivo/rota em 48 horas e em sete
  dias. Ausência de amostra não equivale a zero.

## Rollback

Qualquer regressão funcional, erro de runtime sustentado ou quebra material de
Core Web Vitals executa `vercel rolling-release abort
--dpl=<deployment-validado>`. O deployment anterior volta a receber o tráfego;
não se corrige em produção nem se reconstrói às pressas. O ramo permanece
disponível para diagnóstico e uma nova preview repete todos os gates.
