// ═══════════════════════════════════════════════════════════════════════
//  OS EMAILS DE AUTENTICAÇÃO — RC-EMAIL-004
//  ---------------------------------------------------------------------
//  Estes seis emails não são enviados por este código: são enviados pela
//  Supabase, a partir de moldes guardados no painel dela. É por isso que
//  ficaram esquecidos — saíam em INGLÊS, sem marca nenhuma («Confirm your
//  signup», «Follow this link to confirm your user»), e ninguém os via
//  porque a confirmação de email estava desligada.
//
//  São, ainda assim, o PRIMEIRO email que uma pessoa recebe da marca.
//
//  ── Porque é que vivem aqui, se são colados noutro sítio ─────────────
//  Porque partilham o `layout()` dos outros. Escritos à mão no painel da
//  Supabase, ficariam dois desenhos de email da mesma marca a divergir
//  em silêncio — que é exatamente o que aconteceu com a cor `#1D9E75`,
//  que ficou nos emails meses depois de o site já ter mudado.
//
//  `npm run auth:moldes` escreve-os em `docs/moldes-auth-supabase/`,
//  prontos a colar em Authentication → Emails no painel da Supabase.
//
//  ── As variáveis são da Supabase ─────────────────────────────────────
//  `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}` são
//  substituídas por ela no envio. Aqui são texto literal de propósito —
//  não lhes toques.
// ═══════════════════════════════════════════════════════════════════════

import { layout, botao, INK, MUTED } from "./templates";
import { EMAIL_APOIO } from "@/lib/contacto";

interface MoldeAuth {
  /** O nome exato do molde no painel da Supabase. */
  painel: string;
  /** Nome do ficheiro gerado. */
  ficheiro: string;
  assunto: string;
  html: string;
}

const titulo = (texto: string) =>
  `<h2 class="rc-titulo" style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">${texto}</h2>`;

const paragrafo = (texto: string) =>
  `<p class="rc-texto" style="margin:0 0 12px;font-size:14px;line-height:1.7;color:${MUTED};">${texto}</p>`;

/** O rodapé que diz a quem não pediu isto que não tem de fazer nada.
 *
 *  É a única defesa que uma pessoa tem quando alguém escreve o email
 *  dela por engano — ou de propósito — num formulário de registo. */
const seNaoPediste = (o_que: string) =>
  `<p class="rc-rodape" style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#A8A29E;">
    Se não ${o_que}, ignora este email — não acontece nada. Em caso de dúvida, escreve para
    <a href="mailto:${EMAIL_APOIO}" style="color:#A8A29E;">${EMAIL_APOIO}</a>.
  </p>`;

/** O aviso de validade. A Supabase expira estes links, e não o dizer é o
 *  que gera o «cliquei e não funcionou» que ninguém consegue explicar. */
const validade = `<p class="rc-rodape" style="margin:16px 0 0;font-size:12px;color:#A8A29E;">
    O link é de utilização única e expira dentro de pouco tempo. Se falhar, pede outro.
  </p>`;

export const MOLDES_AUTH: MoldeAuth[] = [
  {
    painel: "Confirm signup",
    ficheiro: "01-confirmar-registo.html",
    assunto: "Confirma o teu email — Recibo Certo",
    html: layout(`
      ${titulo("Falta um passo: confirma o email")}
      ${paragrafo("Bem-vindo ao <strong class=\"rc-forte\" style=\"color:" + INK + ";\">Recibo Certo</strong>. Carrega no botão para confirmares que este email é teu e ativares a conta.")}
      ${paragrafo("A partir daí, o teu histórico de recibos, os cenários do simulador e os alertas de prazos ficam guardados na tua conta — e acompanham-te em qualquer dispositivo.")}
      ${botao("Confirmar o meu email", "{{ .ConfirmationURL }}")}
      ${validade}
      ${seNaoPediste("foste tu a criar conta no Recibo Certo")}
    `),
  },
  {
    painel: "Reset password",
    ficheiro: "02-recuperar-palavra-passe.html",
    assunto: "Definir uma palavra-passe nova — Recibo Certo",
    html: layout(`
      ${titulo("Definir uma palavra-passe nova")}
      ${paragrafo("Pediste para recuperar o acesso à tua conta. Carrega no botão e escolhe uma palavra-passe nova.")}
      ${paragrafo("Enquanto não o fizeres, a palavra-passe atual continua a funcionar.")}
      ${botao("Definir palavra-passe", "{{ .ConfirmationURL }}")}
      ${validade}
      ${seNaoPediste("pediste isto")}
    `),
  },
  {
    painel: "Magic Link",
    ficheiro: "03-link-magico.html",
    assunto: "O teu link de entrada — Recibo Certo",
    html: layout(`
      ${titulo("Entrar sem palavra-passe")}
      ${paragrafo("Carrega no botão para entrares na tua conta. Não precisas de escrever nada.")}
      ${botao("Entrar no Recibo Certo", "{{ .ConfirmationURL }}")}
      ${validade}
      ${seNaoPediste("foste tu a pedir para entrar")}
    `),
  },
  {
    painel: "Change Email Address",
    ficheiro: "04-mudar-email.html",
    assunto: "Confirma o teu email novo — Recibo Certo",
    html: layout(`
      ${titulo("Confirma o endereço novo")}
      ${paragrafo("Pediste para mudar o email da tua conta para <strong class=\"rc-forte\" style=\"color:" + INK + ";\">{{ .Email }}</strong>. Confirma para a mudança ficar efetiva.")}
      ${paragrafo("Até confirmares, continuas a entrar com o endereço antigo.")}
      ${botao("Confirmar o email novo", "{{ .ConfirmationURL }}")}
      ${validade}
      ${seNaoPediste("pediste esta mudança")}
    `),
  },
  {
    painel: "Invite user",
    ficheiro: "05-convite.html",
    assunto: "Foste convidado para o Recibo Certo",
    html: layout(`
      ${titulo("Tens um convite")}
      ${paragrafo("Foste convidado a criar conta no <strong class=\"rc-forte\" style=\"color:" + INK + ";\">Recibo Certo</strong>, o copiloto financeiro para quem passa recibos verdes em Portugal.")}
      ${paragrafo("Carrega no botão para aceitares e definires a tua palavra-passe.")}
      ${botao("Aceitar o convite", "{{ .ConfirmationURL }}")}
      ${validade}
      ${seNaoPediste("não estavas à espera deste convite")}
    `),
  },
  {
    painel: "Reauthentication",
    ficheiro: "06-reautenticacao.html",
    assunto: "O teu código de confirmação — Recibo Certo",
    html: layout(`
      ${titulo("Código de confirmação")}
      ${paragrafo("Para concluir a operação que pediste, escreve este código na página onde estavas:")}
      <div class="rc-caixa" style="margin:20px 0;padding:18px;border-radius:12px;background:#F5F5F4;text-align:center;">
        <p class="rc-forte" style="margin:0;font-size:30px;font-weight:700;letter-spacing:0.18em;color:${INK};">{{ .Token }}</p>
      </div>
      ${validade}
      ${seNaoPediste("não pediste nada")}
    `),
  },
];
