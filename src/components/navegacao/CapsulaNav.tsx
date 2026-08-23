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
//  │ O ESTADO ACTIVO SÃO TRÊS SINAIS, E NENHUM DELES É SÓ COR             │
//  │                                                                     │
//  │ Relevo (o segmento activo levanta-se da bandeja com fundo branco e   │
//  │ sombra), contraste de fundo, e o ícone na cor da marca. Cor sozinha  │
//  │ falha para uma parte das pessoas e em qualquer impressão.             │
//  │                                                                     │
//  │ E é o `aria-current="page"` que carrega o estado para a tecnologia   │
//  │ de apoio; a pintura segue-o, em vez de serem duas verdades a manter  │
//  │ à mão.                                                                │
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
/*
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ ISTO É O CONTROLO SEGMENTADO DO PRODUTO — E ESTAVA ESTICADO            │
 * │                                                                       │
 * │ O idioma já existe e vive em `negocio/descoberta/Configurador.tsx`,    │
 * │ no seletor «Essencial · Personalizar · Avançado»:                      │
 * │                                                                       │
 * │     bandeja   inline-flex rounded-full bg-stone-100 p-1                │
 * │     item      min-h-[38px] rounded-full px-3.5 text-[12px] font-bold   │
 * │     activo    bg-white text-ink shadow-card                            │
 * │                                                                       │
 * │ A versão anterior desta barra pegou nessa forma e mudou-lhe as três    │
 * │ coisas que a fazem funcionar: pôs a bandeja BRANCA e com contorno      │
 * │ (deixa de haver fundo de onde o activo se levante), ESTICOU-A à        │
 * │ largura toda com `flex-1` nos itens (a 1440 px isso são ~80 px de ar   │
 * │ entre rótulos, e uma bandeja só comunica agrupamento enquanto os itens │
 * │ estiverem juntos) e marcou o activo com uma lavagem verde SEM relevo   │
 * │ — pastilha dentro de pastilha, mesma forma e mesmo material nos dois   │
 * │ níveis.                                                                │
 * │                                                                       │
 * │ Volta ao idioma da casa. O activo levanta-se: fundo branco e sombra    │
 * │ sobre a bandeja cinzenta. São três sinais — relevo, contraste de       │
 * │ fundo e o ícone na cor da marca — e nenhum deles é só cor.              │
 * └───────────────────────────────────────────────────────────────────────┘
 */
const ITEM =
  "focus-marca inline-flex min-h-[38px] items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[12px] font-semibold transition-colors";

const INATIVO = "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200";

/* Relevo + fundo + ícone na marca. O `descobrir-negocio` usa `text-ink` no
   activo e é o que se segue: a cor da marca entra pelo ícone, não pelo
   rótulo, para o activo não competir com o botão de acção da linha de cima. */
const ATIVO = "bg-white text-ink shadow-card dark:bg-stone-950 dark:text-stone-100";

export default function CapsulaNav({ aoAbrirMenu, menuAberto }: { aoAbrirMenu: () => void; menuAberto: boolean }) {
  const pathname = usePathname();
  const aceso = hrefAtivo(pathname);

  return (
    <nav aria-label="Principal" className="flex w-full items-center justify-between gap-4">
      {/* A bandeja é `inline-flex`: tem a largura do que leva dentro, e é
          isso que a faz ler como UM controlo. A linha continua a ter a
          largura do contentor — o que ficou de fora foi o esticão. */}
      <div className="inline-flex max-w-full items-center gap-1 rounded-full bg-stone-100 p-1 dark:bg-stone-800">
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
              <Icon
                size={15}
                className={`flex-shrink-0 ${ativo ? "text-brand" : "text-stone-400 dark:text-stone-500"}`}
              />
              <span>{pilar.label}</span>
            </Link>
          );
        })}
      </div>

      {/* «Menu» não é o sexto pilar: está fora da bandeja, na ponta oposta,
          e tem a forma de um controlo com contorno e não a de um segmento.
          Estava lá dentro, separado por uma régua, e uma régua é um sinal
          fraco de mais para dizer «isto é de outra natureza». */}
      <button
        type="button"
        data-menu-gatilho="secretaria"
        aria-haspopup="dialog"
        aria-expanded={menuAberto}
        onClick={aoAbrirMenu}
        className="focus-marca inline-flex min-h-[38px] flex-shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 text-[12px] font-semibold text-stone-600 transition-colors hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-brand"
      >
        <MenuIcon size={15} className="flex-shrink-0 text-stone-400 dark:text-stone-500" />
        Menu
      </button>
    </nav>
  );
}
