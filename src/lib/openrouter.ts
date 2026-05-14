import { db } from "./db";
import { aiRuns } from "./db/schema";

const BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-4.5";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type AiCallResult = {
  text: string;
  model: string;
  tokensUsed: number;
  raw: Record<string, unknown>;
};

export async function callOpenRouter(opts: {
  messages: ChatMessage[];
  tool: string;
  input: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
}): Promise<AiCallResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    const fallback = mockResponse(opts.tool, opts.input);
    await logRun({ ...opts, output: fallback, model: `${MODEL} (mocked — no key)`, tokens: 0, status: "ok" });
    return { text: fallback, model: `${MODEL} (mocked — no key)`, tokensUsed: 0, raw: { mocked: true } };
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3001",
      "X-Title": "Dropship Manager",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1200,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    await logRun({ ...opts, output: "", model: MODEL, tokens: 0, status: "error", error: err });
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
    model?: string;
  };

  const text = json.choices?.[0]?.message?.content ?? "";
  const tokensUsed = json.usage?.total_tokens ?? 0;
  const model = json.model ?? MODEL;

  await logRun({ ...opts, output: text, model, tokens: tokensUsed, status: "ok" });
  return { text, model, tokensUsed, raw: json as Record<string, unknown> };
}

async function logRun(args: {
  tool: string;
  input: Record<string, unknown>;
  output: string;
  model: string;
  tokens: number;
  status: "ok" | "error";
  error?: string;
}) {
  try {
    await db.insert(aiRuns).values({
      tool: args.tool,
      inputJson: args.input,
      outputText: args.output,
      model: args.model,
      tokensUsed: args.tokens,
      status: args.status,
      errorMessage: args.error ?? "",
    });
  } catch {
    // don't break the request if logging fails
  }
}

// Provides a sensible offline output so the UI looks great even without an API key.
function mockResponse(tool: string, input: Record<string, unknown>): string {
  const subject = JSON.stringify(input).slice(0, 100);
  return [
    `# ${humanize(tool)} (preview)`,
    "",
    `> No \`OPENROUTER_API_KEY\` set in \`.env\`, so this is a demo response. Add your key and the live model will respond.`,
    "",
    `**Tool:** \`${tool}\`  `,
    `**Model target:** \`${MODEL}\`  `,
    `**Input snapshot:** \`${subject}\``,
    "",
    "## Suggested output",
    "",
    "- ✨ Concise, on-brand result.",
    "- 📈 Includes 3 actionable recommendations.",
    "- 🧠 Tailored to dropshipping context.",
    "",
    "## Recommendations",
    "",
    "1. **Lead with the customer benefit**, not the feature spec.",
    "2. **Anchor pricing** against perceived value, not raw cost.",
    "3. **Test two angles** — emotional vs. practical — before scaling spend.",
    "",
    "_Replace this preview by adding your OpenRouter key._",
  ].join("\n");
}

function humanize(s: string) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
