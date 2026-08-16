"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CARTÃO — o resumo, não o perfil
//  ---------------------------------------------------------------------
//  Um cartão tem de responder a quatro perguntas em três segundos: quem é,
//  o que faz, onde atende e está a aceitar clientes. Tudo o resto — preço,
//  agenda, contactos, fidelidade ao pormenor — pertence ao perfil, que é
//  onde a decisão acontece (§156).
//
//  Duas coisas que este cartão deliberadamente NÃO faz:
//
//   · **não anuncia horários.** A referência visual mostra «próxima
//     disponibilidade: terça, 10:30». Saber isso exigiria ler a agenda de
//     cada contabilista — vinte e quatro leituras por página, e uma delas
//     capaz de revelar, por subtração, quando é que alguém tem clientes.
//     Enquanto não houver um agregado que responda sem contar isso, o
//     cartão diz o que sabe: se aceita clientes (§10, §11).
//
//   · **não pede vínculo.** O botão é «Ver perfil». Uma relação começa
//     depois de se ler quem está do outro lado, não a partir de uma
//     grelha (§45).
//
//  O cartão inteiro é clicável através de um só link — o `after:inset-0`
//  do «Ver perfil» cobre o cartão. Assim não há links dentro de links, e
//  o leitor de ecrã anuncia uma ação em vez de quatro (§65).
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import {
  estadoOcc, especialidadesDoCartao, textoLocalizacao, textoModalidades,
  textoRespostaCurta, type CartaoDoDiretorio,
} from "@/lib/contabilistas/diretorio";
import { nomesDosIdiomas } from "@/lib/contabilistas/perfil";
import AvatarContabilista from "@/components/contabilistas/AvatarContabilista";
import { ArrowRight, Gift, Linkedin, MapPin, ShieldCheck } from "@/components/ui/Icons";

const TOM_DA_OCC = {
  verificada: "text-brand-dark dark:text-brand-mint",
  informada: "text-stone-500 dark:text-stone-400",
  aprovado: "text-stone-500 dark:text-stone-400",
} as const;

export default function ContabilistaCard({
  cartao,
  areaEmDestaque = "",
}: {
  cartao: CartaoDoDiretorio;
  /** A área que a pessoa está a filtrar — vem à frente nas etiquetas. */
  areaEmDestaque?: string;
}) {
  const occ = estadoOcc(cartao);
  const local = textoLocalizacao(cartao);
  const { visiveis, restantes } = especialidadesDoCartao(cartao.especialidades, areaEmDestaque);
  const resposta = textoRespostaCurta(cartao.respostaMediaHoras);
  const idiomas = nomesDosIdiomas(cartao.idiomas);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-4xl border border-stone-200 bg-white p-5 shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lift motion-reduce:transform-none dark:border-stone-800 dark:bg-stone-900 dark:hover:border-brand/40">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-brand/5 blur-2xl dark:bg-brand/10"
      />

      <header className="relative flex items-start gap-3.5">
        <div className="relative shrink-0">
          <AvatarContabilista
            contabilistaId={cartao.userId}
            nome={cartao.nome}
            temAvatar={cartao.avatarDisponivel}
            tamanho="sm"
          />
          {cartao.linkedinLigado && (
            // Sinal de identidade, não um atalho: dentro de um cartão que
            // já é um link, um segundo link seria HTML inválido (§65).
            <span
              title="LinkedIn ligado"
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-[0.4rem] border-2 border-white bg-[#0A66C2] text-white dark:border-stone-900"
            >
              <Linkedin size={10} aria-hidden />
              <span className="sr-only">LinkedIn ligado</span>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* O estado comercial fica numa linha própria, acima do nome.
              Ao lado do nome roubava-lhe metade da largura a 360px e
              partia «Maria Ferreira» em duas linhas (§36, §60). */}
          <p
            className={`inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
              cartao.aceitaNovosClientes
                ? "bg-brand-light text-brand-dark dark:bg-brand/20 dark:text-brand-mint"
                : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
            }`}
          >
            {cartao.aceitaNovosClientes ? "Aceita clientes" : "Sem vagas"}
          </p>

          <h3 className="mt-1.5 font-display text-xl leading-tight text-ink transition-colors group-hover:text-brand-dark dark:text-stone-50 dark:group-hover:text-brand-mint">
            {cartao.nome}
          </h3>

          <p
            title={occ.etiqueta}
            className={`mt-1 flex items-start gap-1.5 text-xs font-medium ${TOM_DA_OCC[occ.tom]}`}
          >
            <ShieldCheck size={13} className="mt-px shrink-0" aria-hidden />
            <span className="min-w-0">
              {cartao.tituloProfissional && (
                <span className="text-stone-600 dark:text-stone-300">
                  {cartao.tituloProfissional} ·{" "}
                </span>
              )}
              {occ.curto}
            </span>
          </p>

          {/* A modalidade não se repete aqui: já é uma das duas colunas do
              rodapé do cartão. `min-w-0` para o `truncate` poder atuar. */}
          {local && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
              <MapPin size={13} className="shrink-0" aria-hidden />
              <span className="min-w-0 truncate">{local}</span>
            </p>
          )}
        </div>
      </header>

      {/* Sem apresentação curta não se inventa uma: diz-se como atende e
          convida-se a abrir o perfil. A bio inteira não vem no cartão —
          seriam milhares de caracteres por página para três linhas. */}
      <p className="relative mt-4 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        {cartao.apresentacaoCurta
          ?? `Atendimento ${textoModalidades(cartao.modalidades).toLowerCase()}. Abre o perfil para conhecer as áreas de trabalho, a disponibilidade e como começar.`}
      </p>

      {visiveis.length > 0 && (
        <ul className="relative mt-3.5 flex flex-wrap gap-1.5">
          {visiveis.map((e) => (
            <li
              key={e}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                e === areaEmDestaque
                  ? "bg-brand-light text-brand-dark dark:bg-brand/20 dark:text-brand-mint"
                  : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
              }`}
            >
              {e}
            </li>
          ))}
          {restantes > 0 && (
            <li className="px-1 py-1 text-xs text-stone-400 dark:text-stone-500">
              +{restantes}
            </li>
          )}
        </ul>
      )}

      <dl className="relative mt-4 grid grid-cols-2 gap-3 border-t border-stone-100 pt-3.5 dark:border-stone-800">
        <div className="min-w-0">
          <dt className="text-[0.625rem] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
            Atendimento
          </dt>
          <dd className="mt-0.5 truncate text-xs font-semibold text-stone-700 dark:text-stone-200">
            {textoModalidades(cartao.modalidades)}
          </dd>
        </div>
        {(resposta || idiomas.length > 0) && (
          <div className="min-w-0">
            <dt className="text-[0.625rem] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
              {resposta ? "Tempo de resposta" : "Idiomas"}
            </dt>
            <dd className="mt-0.5 truncate text-xs font-semibold text-stone-700 dark:text-stone-200">
              {resposta ?? idiomas.join(" · ")}
            </dd>
          </div>
        )}
      </dl>

      <div className="relative mt-auto flex items-center justify-between gap-3 pt-3.5">
        {/* Dois sinais no máximo, e nunca a ausência de nenhum deles.
            «Não aceita pagamento aqui» num cartão de diretório é uma marca
            negativa ao lado do nome de alguém, por uma coisa que na maioria
            dos casos é só «ainda não ligou». O facto positivo aparece; o
            negativo diz-se na página do perfil, onde há espaço para o dizer
            sem parecer um aviso. */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {cartao.fidelidadeAtiva && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-brand-dark dark:text-brand-mint">
              <Gift size={13} aria-hidden /> Fidelidade disponível
            </p>
          )}
          {cartao.recebePagamentos && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-brand-dark dark:text-brand-mint">
              <ShieldCheck size={13} aria-hidden /> Pagamento pela plataforma
            </p>
          )}
        </div>

        <Link
          href={`/contabilistas/${cartao.slug}`}
          className="focus-marca inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-brand-dark after:absolute after:inset-0 after:content-[''] dark:text-brand-mint"
        >
          Ver perfil
          <span className="sr-only"> de {cartao.nome}</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
