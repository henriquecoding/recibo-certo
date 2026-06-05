import { redirect } from "next/navigation";

// Rota antiga /admin/parceiros → redireciona para novo sistema de anúncios
export default function ParceiroRedirect() {
  redirect("/admin/anuncios");
}
