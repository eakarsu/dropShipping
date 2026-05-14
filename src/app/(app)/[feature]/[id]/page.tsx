import { notFound } from "next/navigation";
import { FEATURES_BY_SLUG } from "@/lib/features";

export const dynamic = "force-dynamic";

import { getOne } from "@/lib/feature-db";
import { FeatureDetailClient } from "@/components/feature-detail";

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

  const row = await getOne(feature, numId);
  if (!row) notFound();

  return <FeatureDetailClient feature={def} row={row} id={numId} />;
}
