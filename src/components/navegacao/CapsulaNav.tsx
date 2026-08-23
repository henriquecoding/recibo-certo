"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A CÁPSULA — a navegação principal de secretária
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ CINCO PILARES E UM «MENU», E NÃO CINCO SECÇÕES SORTIDAS              │
//  │                                                                     │
//  │ A barra tinha «Simular · Guias · Quiz · Planos · Contabilistas» —    │
//  │ um hub de ferramentas ao lado de um corpo editorial, de um jogo, de  │
//  │ uma página de preços e de um directório. Cinco coisas de naturezas   │
//  │ diferentes, todas ao mesmo nível, e nenhuma delas era a tarefa.      │
//  │                                                                     │
//  │ Agora a barra responde a uma só pergunta — «em que ponto estás?» —   │
//  │ e a ordem responde-a: descobrir → preço → recibos → salário →        │
//  │ empresa. Tudo o resto está atrás de «Menu», que é um destino         │
//  │ honesto: diz que há mais e mostra tudo de uma vez.                    │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O NOME COMPLETO, SEMPRE — E O `aria-label` MESMO ASSIM                │
//  │                                                                     │
//  │ Enquanto a cápsula dividia a linha com a marca e as acções, houve    │
//  │ aqui um mecanismo de dois rótulos: o completo em ecrãs largos, um    │
//  │ curto abaixo de `xl`. Com uma linha inteira deixou de ser preciso —  │
//  │ o nome completo cabe em qualquer largura de secretária.               │
//  │                                                                     │
//  │ O `aria-label` fica na mesma. Não é redundância: o rótulo visível é  │
//  │ texto dentro da âncora AO LADO de um ícone, e declarar o nome        │
//  │ explicitamente é o que garante que o que se ouve é exactamente o que │
//  │ se lê, sem depender de como cada leitor de ecrã junta as partes.     │
//  │                                                                     │
//  │ O rótulo curto continua a existir em `lib/navegacao.ts` — quem o usa │
//  │ é a barra do telemóvel, onde cinco lugares dividem 360 px.           │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O ESTADO ACTIVO SÃO TRÊS SINAIS, E `aria-current` COMANDA-OS         │
//  │                                                                     │
//  │ Lavagem de fundo, cor e um anel. Três, porque um deles sozinho é     │
//  │ cor — e cor sozinha falha para uma parte das pessoas e em qualquer   │
//  │ impressão. E é o `aria-current="page"` que a CSS lê, não uma classe: │
//  │ assim o DOM carrega o estado para a tecnologia de apoio e a pintura  │
//  │ segue-o, em vez de serem duas verdades a manter à mão.                │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon } from "@/components/ui/Icons";
import { iconeDe } from "@/components/ferramentas/icon-map";
import { PILARES, hrefAtivo } from "@/lib/navegacao";
import { medirNavegacao } from "@/lib/busca/medicao";

/*
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ A CÁPSULA TEM UMA LINHA SÓ PARA SI, E É POR ISSO QUE PODE RESPIRAR     │
 * │                                                                       │
 * │ Houve uma versão em que ela dividia a primeira linha com a marca e as  │
 * │ acções, e aí cada píxel de `padding` era uma decisão de sobrevivência: │
 * │ a 1024 px sobravam-lhe ~390 px de folga e a 1440 sobravam 17, o que    │
 * │ obrigava a apertar o espaçamento até a barra ficar densa e a trocar    │
 * │ «Recibos verdes» por «Recibos» a partir de certa largura.              │
 * │                                                                       │
 * │ Numa linha inteira sobram ~300 px em QUALQUER largura de secretária,   │
 * │ com os rótulos completos. Portanto: espaçamento confortável e o nome   │
 * │ inteiro sempre — o rótulo curto continua a existir em                  │
 * │ `lib/navegacao.ts`, mas quem o usa é a barra do telemóvel, onde cinco  │
 * │ lugares dividem 360 px e ele é mesmo necessário.                       │
 * └───────────────────────────────────────────────────────────────────────┘
 */
const ITEM =
  "focus-marca relative flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium no-underline transition-colors";

const INATIVO =
  "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200";

/* A bolha do activo: fundo + cor + anel. O anel é `inset` para não somar
   largura e desalinhar os vizinhos quando o pilar aceso muda. */
const ATIVO =
  "bg-brand-light text-brand-dark ring-1 ring-inset ring-brand/70 dark:bg-brand/15 dark:text-brand dark:ring-brand/60";

export default function CapsulaNav({ aoAbrirMenu, menuAberto }: { aoAbrirMenu: () => void; menuAberto: boolean }) {
  const pathname = usePathname();
  const aceso = hrefAtivo(pathname);

  return (
    /* ┌─────────────────────────────────────────────────────────────────┐
       │ A MESMA LARGURA DA BARRA DE PESQUISA — exactamente, não quase    │
       │                                                                 │
       │ Com `w-fit` a cápsula media 715 px e a barra logo por baixo 704: │
       │ 5 px de desvio de cada lado, dois objectos empilhados quase       │
       │ alinhados. «Quase» é o pior sítio para parar — lê-se como um     │
       │ erro, e não como uma diferença. Ou são claramente larguras       │
       │ diferentes, ou são a MESMA.                                      │
       │                                                                 │
       │ São a mesma, e vem do mesmo token (`--rc-dock-larga`), porque    │
       │ escrever 44 rem aqui e ler o token ali bastava para uma afinação │
       │ futura desalinhar as duas em silêncio. `justify-between`         │
       │ distribui a folga que sobra: os itens tocam as bordas de dentro  │
       │ e as duas linhas passam a ter uma aresta vertical comum.          │
       └─────────────────────────────────────────────────────────────────┘ */
    <nav
      aria-label="Principal"
      className="rc-capsula flex w-full max-w-[var(--rc-dock-larga)] items-center justify-between gap-0.5 p-1.5"
    >
      {PILARES.map((pilar) => {
        const Icon = iconeDe(pilar.icone);
        const ativo = aceso === pilar.href;
        return (
          <Link
            key={pilar.id}
            href={pilar.href}
            aria-label={pilar.label}
            aria-current={ativo ? "page" : undefined}
            onClick={() => medirNavegacao(pilar.id, "secretaria")}
            className={`${ITEM} ${ativo ? ATIVO : INATIVO}`}
          >
            <Icon size={17} className="flex-shrink-0" />
            <span>{pilar.label}</span>
          </Link>
        );
      })}

      {/* A régua separa o que é destino do que é «há mais». Sem ela, «Menu»
          lê-se como o sexto pilar. */}
      <span aria-hidden className="mx-0.5 h-6 w-px flex-shrink-0 bg-stone-200 dark:bg-stone-700" />

      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={menuAberto}
        onClick={aoAbrirMenu}
        className={`${ITEM} ${INATIVO}`}
      >
        <MenuIcon size={17} className="flex-shrink-0" />
        <span>Menu</span>
      </button>
    </nav>
  );
}
