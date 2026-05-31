"use client";

import { useEffect, useState } from "react";
import PartnerCard from "@/components/ui/PartnerCard";
import { getPartnerForContext, dismissPartner, type Partner } from "@/lib/partners";

export default function PartnerSpot({ context }: { context: string }) {
  const [partner, setPartner] = useState<Partner | null>(null);

  useEffect(() => {
    setPartner(getPartnerForContext(context));
  }, [context]);

  if (!partner) return null;

  return (
    <PartnerCard
      partner={partner}
      onDismiss={() => {
        dismissPartner(partner.id);
        setPartner(null);
      }}
    />
  );
}
