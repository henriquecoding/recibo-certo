import HomepageDescobrir from "@/components/descobrir/HomepageDescobrir";
import HomepageFocoShell from "@/components/foco/HomepageFocoShell";
import snapshot from "@/generated/homepage/descobrir.json";
import { metadataDoFoco } from "@/lib/foco/metadata";

export const dynamic = "error";
export const metadata = metadataDoFoco("descobrir");

export default function Home() {
  return (
    <HomepageFocoShell foco="descobrir">
      <HomepageDescobrir exemplo={snapshot.dados} />
    </HomepageFocoShell>
  );
}
