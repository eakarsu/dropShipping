import { notFound } from "next/navigation";
import { FEATURES_BY_SLUG } from "@/lib/features";

export const dynamic = "force-dynamic";

import { listAll } from "@/lib/feature-db";
import { FeatureListClient } from "@/components/feature-list";
import { getRequiredSession } from "@/lib/auth";

export default async function FeatureListPage({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;
  const def = FEATURES_BY_SLUG[feature];
  if (!def) notFound();

  const session = await getRequiredSession(["operator", "merchant_admin"]);
  const rows = await listAll(feature, session.merchantId);
  return <FeatureListClient feature={def} initialRows={rows as Record<string, unknown>[]} canDelete={session.role === "merchant_admin"} />;
}
