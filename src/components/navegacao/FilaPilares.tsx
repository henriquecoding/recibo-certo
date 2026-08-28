// ═══════════════════════════════════════════════════════════════════════
//  A FILA DOS PILARES — a mesma navegação, em tamanho de leitura
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ NÃO É UM SEGUNDO MENU. É O MESMO, COM A LINHA QUE NÃO CABE NA BARRA  │
//  │                                                                     │
//  │ A cápsula tem espaço para um nome e um ícone. Aqui há espaço para o  │
//  │ RESULTADO — «quanto de cada recibo fica mesmo para ti» — e é essa    │
//  │ linha que faz a diferença entre reconhecer um destino e perceber     │
//  │ para que serve. Os destinos são os mesmos e vêm do mesmo sítio       │
//  │ (`lib/navegacao.ts`); o que muda é quanto se pode dizer sobre eles.  │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ SERVER COMPONENT, E ISSO É O PONTO                                   │
//  │                                                                     │
//  │ Os quatro pilares antigos da homepage não eram navegação: eram um    │
//  │ valor em `localStorage` que ramificava o hero no cliente. Não havia  │
//  │ um único `<a href>` para nenhum deles no HTML servido — nem para o   │
//  │ Google, nem para quem tem o JavaScript a falhar, nem para quem       │
//  │ carrega em «abrir noutro separador».                                 │
//  │                                                                     │
//  │ Isto são cinco ligações reais, renderizadas no servidor, sem uma     │
//  │ linha de JavaScript. É o mesmo princípio que faz a barra do          │
//  │ telemóvel e o rodapé serem HTML e não um menu montado no cliente.    │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { ArrowRight } from "@/components/ui/Icons";
import { iconeDe } from "@/components/ferramentas/icon-map";
import { PILARES } from "@/lib/navegacao";
import LinkFocoIntencao from "@/components/foco/LinkFocoIntencao";

export default function FilaPilares() {
  return (
    <section id="pilares" aria-labelledby="pilares-titulo" className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="max-w-xl">
          <div className="eyebrow mb-2 text-brand">Por onde começar</div>
          <h2 id="pilares-titulo" className="font-display display-2 font-semibold text-ink">
            Cinco perguntas, pela ordem em que aparecem.
          </h2>
        </div>
        <Link
          prefetch={false}
          href="/ferramentas"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand no-underline transition-colors hover:text-brand-dark dark:hover:text-brand-mint"
        >
          Ver tudo <ArrowRight size={14} />
        </Link>
      </div>

      {/* Mobile-first: uma coluna a 360 px, duas a partir de `sm`, os cinco
          lado a lado a partir de `lg`. Nunca cinco colunas num telemóvel —
          seria o mesmo que ter só ícones, que é o que a barra já resolve. */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PILARES.map((pilar, i) => {
          const Icon = iconeDe(pilar.icone);
          return (
            <li key={pilar.id}>
              <LinkFocoIntencao
                foco={pilar.id}
                className="focus-marca group flex h-full items-start gap-3 rounded-4xl border border-stone-100 bg-white p-4 no-underline shadow-card transition-shadow hover:shadow-lift dark:border-stone-800 dark:bg-stone-900 lg:flex-col lg:gap-2.5"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                  <Icon size={19} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-1.5">
                    {/* O número diz que há uma ORDEM. Sem ele, cinco cartões
                        iguais leem-se como cinco opções alternativas — e não
                        são: são etapas, e a maior parte das pessoas passa por
                        elas por esta ordem. */}
                    {/* `aria-hidden` esconde-o do leitor de ecrã, não dos
                        olhos — e por isso continua a ter de cumprir
                        contraste. `text-stone-300` dava 1,49:1 no claro e
                        o `dark:text-stone-600` dava 2,29:1 no escuro: o
                        número da ordem estava lá para o desenho e não
                        chegava a quem o devia ler. Os tons remapeados em
                        `globals.css` dão 5,15:1 e 7,16:1. */}
                    <span
                      aria-hidden
                      className="font-mono text-[11px] font-semibold tabular-nums text-stone-500 dark:text-stone-400"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {pilar.label}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    {pilar.resultado}
                  </span>
                </span>
              </LinkFocoIntencao>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
