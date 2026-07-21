import { notFound } from "next/navigation";
import { FEATURES_BY_SLUG } from "@/lib/features";

export const dynamic = "force-dynamic";

import { getOne } from "@/lib/feature-db";
import { FeatureDetailClient } from "@/components/feature-detail";
import { getRequiredSession } from "@/lib/auth";

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ feature: string; id: string }>;
}) {
  const { feature, id } = await params;
  const def = FEATURES_BY_SLUG[feature];
  if (!def) notFound();

  const numId = Number(id);
  if (!Number.isFinite(numId)) notFound();

  const session = await getRequiredSession(["operator", "merchant_admin"]);
  const row = await getOne(feature, numId, session.merchantId);
  if (!row) notFound();

  return <FeatureDetailClient feature={def} row={row} id={numId} governed={["orders", "returns", "shipments"].includes(feature)} canDelete={session.role === "merchant_admin"} role={session.role} />;
}
