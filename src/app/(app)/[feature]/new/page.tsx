import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURES_BY_SLUG } from "@/lib/features";
import { FeatureForm } from "@/components/feature-form";
import { Icon } from "@/components/icon";
import { getRequiredSession } from "@/lib/auth";

export default async function NewFeaturePage({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;
  const def = FEATURES_BY_SLUG[feature];
  if (!def) notFound();
  await getRequiredSession(["operator", "merchant_admin"]);
  if (["orders", "returns", "shipments"].includes(feature)) notFound();

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href={`/${feature}`} className="hover:text-brand-700">{def.name}</Link>
        <Icon name="ChevronRight" className="w-3.5 h-3.5" />
        <span className="text-slate-700">New {def.singular}</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create {def.singular}</h1>
        <p className="text-slate-500 text-sm">Fill in the form below to create a new {def.singular.toLowerCase()}.</p>
      </div>
      <FeatureForm slug={feature} fields={def.fields} initial={{}} mode="create" />
    </div>
  );
}
