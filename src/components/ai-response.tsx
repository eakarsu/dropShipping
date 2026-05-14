"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Icon } from "./icon";
import { useState } from "react";

export function AiResponse({
  output, model, tokensUsed, tool,
}: { output: string; model: string; tokensUsed: number; tool: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-brand-50 to-purple-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center">
            <Icon name="Sparkles" className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">AI Response</div>
            <div className="text-[11px] text-slate-500 leading-tight">
              <span className="font-mono">{model}</span> · {tokensUsed} tokens · <span className="font-mono">{tool}</span>
            </div>
          </div>
        </div>
        <button onClick={copy} className="btn-ghost text-xs py-1.5">
          <Icon name={copied ? "Check" : "Copy"} className="w-3.5 h-3.5" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="p-6 ai-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
      </div>
    </div>
  );
}
