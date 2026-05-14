import { notFound } from "next/navigation";
import Link from "next/link";
import { TOOLS_BY_SLUG } from "@/lib/ai-tools";
import { AiToolRunner } from "@/components/ai-tool-runner";
import { Icon } from "@/components/icon";

export default async function AiToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  const def = TOOLS_BY_SLUG[tool];
  if (!def) notFound();

  // strip non-serializable buildMessages before sending to the client
  const { buildMessages: _build, ...clientTool } = def;
  void _build;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/ai" className="hover:text-brand-700">AI Center</Link>
        <Icon name="ChevronRight" className="w-3.5 h-3.5" />
        <span className="text-slate-700">{def.name}</span>
      </div>
      <AiToolRunner tool={clientTool} />
    </div>
  );
}
