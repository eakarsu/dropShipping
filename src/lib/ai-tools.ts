import type { ChatMessage } from "./openrouter";

export type AiToolField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select";
  placeholder?: string;
  required?: boolean;
  options?: string[];
  default?: string;
};

export type AiToolDef = {
  slug: string;
  name: string;
  description: string;
  category: "Product" | "Marketing" | "Customer" | "Operations" | "Pricing" | "Strategy";
  icon: string; // lucide icon name
  fields: AiToolField[];
  buildMessages: (input: Record<string, string>) => ChatMessage[];
};

const sys = (s: string): ChatMessage => ({ role: "system", content: s });
const usr = (s: string): ChatMessage => ({ role: "user", content: s });

export const AI_TOOLS: AiToolDef[] = [
  {
    slug: "product-description",
    name: "Product Description Writer",
    description: "Generate compelling, conversion-optimized product descriptions for any sales channel.",
    category: "Product",
    icon: "Sparkles",
    fields: [
      { name: "title", label: "Product title", type: "text", required: true, placeholder: "Wireless Bluetooth Earbuds Pro" },
      { name: "category", label: "Category", type: "text", placeholder: "Electronics" },
      { name: "audience", label: "Target audience", type: "text", placeholder: "Remote workers, students" },
      { name: "channel", label: "Channel", type: "select", options: ["shopify", "amazon", "etsy"], default: "shopify" },
    ],
    buildMessages: (i) => [
      sys("You are an elite e-commerce copywriter. Output must be markdown with: a hook, a 3–5 bullet feature list, and a tight CTA."),
      usr(
        `Write a ${i.channel} product description.\n\nTitle: ${i.title}\nCategory: ${i.category || "n/a"}\nAudience: ${i.audience || "general consumers"}\n\nOptimize for ${i.channel === "amazon" ? "search keywords + bullet scannability" : i.channel === "etsy" ? "story + craft appeal" : "brand voice + conversion"}.`,
      ),
    ],
  },
  {
    slug: "title-optimizer",
    name: "Listing Title Optimizer",
    description: "Rewrite a product title for maximum click-through and SEO on a target marketplace.",
    category: "Product",
    icon: "Wand2",
    fields: [
      { name: "title", label: "Current title", type: "text", required: true },
      { name: "channel", label: "Target channel", type: "select", options: ["shopify", "amazon", "etsy"], default: "amazon" },
      { name: "keywords", label: "Keywords (comma-separated)", type: "text", placeholder: "wireless, noise-cancelling, gym" },
    ],
    buildMessages: (i) => [
      sys("You are an SEO + marketplace listing expert. Return 5 alternative titles ranked best→worst with a one-line rationale each."),
      usr(`Rewrite this ${i.channel} title for higher CTR.\n\nCurrent: ${i.title}\nKeywords to consider: ${i.keywords || "infer from title"}.`),
    ],
  },
  {
    slug: "seo-tags",
    name: "SEO Tags Generator",
    description: "Generate a tight set of SEO/keyword tags for a product or category.",
    category: "Product",
    icon: "Tags",
    fields: [
      { name: "title", label: "Product title", type: "text", required: true },
      { name: "channel", label: "Channel", type: "select", options: ["shopify", "amazon", "etsy"], default: "etsy" },
    ],
    buildMessages: (i) => [
      sys("You generate SEO tags. Return a markdown table: Tag | Search intent | Competition (low/med/high)."),
      usr(`Generate 13 SEO tags for ${i.channel}.\n\nTitle: ${i.title}`),
    ],
  },
  {
    slug: "ad-copy",
    name: "Ad Copy Generator",
    description: "Generate short-form ad copy for paid acquisition campaigns (Google, Meta, TikTok).",
    category: "Marketing",
    icon: "Megaphone",
    fields: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "channel", label: "Ad channel", type: "select", options: ["google", "facebook", "tiktok", "instagram"], default: "facebook" },
      { name: "tone", label: "Tone", type: "select", options: ["bold", "playful", "premium", "urgent"], default: "bold" },
    ],
    buildMessages: (i) => [
      sys("You are a performance marketing copywriter. Output 3 distinct ad variants in markdown, each with headline, primary text, and CTA."),
      usr(`Write 3 ${i.channel} ad variants for "${i.product}". Tone: ${i.tone}.`),
    ],
  },
  {
    slug: "email-campaign",
    name: "Email Campaign Writer",
    description: "Write a full marketing email — subject line, preheader, body, CTA.",
    category: "Marketing",
    icon: "Mail",
    fields: [
      { name: "goal", label: "Campaign goal", type: "text", required: true, placeholder: "Re-engage cart abandoners" },
      { name: "audience", label: "Audience segment", type: "text", placeholder: "Customers with cart > $50" },
      { name: "offer", label: "Offer (optional)", type: "text", placeholder: "10% off + free shipping" },
    ],
    buildMessages: (i) => [
      sys("You are a CRM email copywriter. Return a complete email in markdown: 3 subject lines, a preheader, the body, and a CTA button label."),
      usr(`Goal: ${i.goal}\nAudience: ${i.audience || "all customers"}\nOffer: ${i.offer || "none"}`),
    ],
  },
  {
    slug: "customer-segmentation",
    name: "Customer Segmentation Analyst",
    description: "Suggest customer segments from a sample of customer data and how to target each.",
    category: "Customer",
    icon: "Users",
    fields: [
      { name: "data", label: "Customer summary (or paste CSV)", type: "textarea", required: true, placeholder: "name, total_orders, total_spent, segment\\nAlex, 12, 480, loyal\\n..." },
    ],
    buildMessages: (i) => [
      sys("You are a CRM analyst. Identify 3–5 actionable customer segments. For each, give: name, criteria, retention play, and acquisition look-alike profile."),
      usr(`Customer data:\n\n${i.data}`),
    ],
  },
  {
    slug: "demand-forecast",
    name: "Demand Forecast",
    description: "Forecast next-30-day demand for a product based on recent sales velocity.",
    category: "Operations",
    icon: "TrendingUp",
    fields: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "salesContext", label: "Recent sales context", type: "textarea", required: true, placeholder: "Sold 24 units last week, 18 the week before, trending up. Holiday season approaching." },
    ],
    buildMessages: (i) => [
      sys("You are an inventory planner. Output: 30-day forecast (low/med/high), confidence rationale, and a reorder recommendation."),
      usr(`Product: ${i.product}\n\nContext:\n${i.salesContext}`),
    ],
  },
  {
    slug: "supplier-evaluation",
    name: "Supplier Evaluator",
    description: "Score a supplier across reliability, quality, communication, and risk.",
    category: "Operations",
    icon: "Factory",
    fields: [
      { name: "name", label: "Supplier name", type: "text", required: true },
      { name: "context", label: "What you know about them", type: "textarea", required: true, placeholder: "12-day lead time, 4.2 rating, 2 returns in 50 orders, slow email replies." },
    ],
    buildMessages: (i) => [
      sys("You are a sourcing analyst. Score reliability, quality, communication, and risk on 1–5. Justify each. Recommend a next action."),
      usr(`Supplier: ${i.name}\n\nKnown context:\n${i.context}`),
    ],
  },
  {
    slug: "pricing-suggestion",
    name: "Pricing Suggestion",
    description: "Recommend a price for a product given cost, competitor range, and target margin.",
    category: "Pricing",
    icon: "DollarSign",
    fields: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "cost", label: "Unit cost (USD)", type: "number", required: true },
      { name: "competitorRange", label: "Competitor price range", type: "text", placeholder: "$24 – $39" },
      { name: "targetMargin", label: "Target margin %", type: "number", default: "40" },
    ],
    buildMessages: (i) => [
      sys("You are a pricing strategist. Recommend a single price + 2 alternative tiers (entry / premium). Show the math."),
      usr(`Product: ${i.product}\nCost: $${i.cost}\nCompetitor range: ${i.competitorRange || "unknown"}\nTarget margin: ${i.targetMargin || "40"}%`),
    ],
  },
  {
    slug: "competitor-analysis",
    name: "Competitor Analysis",
    description: "Analyze competitor positioning and surface differentiation angles.",
    category: "Strategy",
    icon: "Crosshair",
    fields: [
      { name: "product", label: "Your product", type: "text", required: true },
      { name: "competitors", label: "Competitor names / urls", type: "textarea", required: true },
    ],
    buildMessages: (i) => [
      sys("You are a competitive strategist. Output a markdown table comparing positioning, then 3 differentiation angles you should pursue."),
      usr(`Our product: ${i.product}\n\nCompetitors:\n${i.competitors}`),
    ],
  },
  {
    slug: "review-sentiment",
    name: "Review Sentiment Analyzer",
    description: "Classify and summarize a batch of reviews; surface themes and an action plan.",
    category: "Customer",
    icon: "MessageSquareText",
    fields: [
      { name: "reviews", label: "Reviews (one per line)", type: "textarea", required: true },
    ],
    buildMessages: (i) => [
      sys("You are a customer-insights analyst. Output: sentiment breakdown (%), top 3 positive themes, top 3 complaints, and 3 actions."),
      usr(`Reviews:\n${i.reviews}`),
    ],
  },
  {
    slug: "review-response",
    name: "Review Response Drafter",
    description: "Draft an empathetic, on-brand response to a customer review.",
    category: "Customer",
    icon: "Reply",
    fields: [
      { name: "review", label: "The review", type: "textarea", required: true },
      { name: "rating", label: "Star rating (1–5)", type: "number", required: true },
      { name: "tone", label: "Tone", type: "select", options: ["professional", "warm", "apologetic"], default: "warm" },
    ],
    buildMessages: (i) => [
      sys("You craft public review responses. Be specific to the review, never generic. Output 2 variants."),
      usr(`Rating: ${i.rating}\nTone: ${i.tone}\nReview:\n${i.review}`),
    ],
  },
  {
    slug: "return-classification",
    name: "Return Reason Classifier",
    description: "Classify a return request and propose a resolution + prevention insight.",
    category: "Operations",
    icon: "PackageX",
    fields: [
      { name: "detail", label: "Customer-provided return detail", type: "textarea", required: true },
    ],
    buildMessages: (i) => [
      sys("You are a returns analyst. Output: classified reason, recommended resolution, root-cause hypothesis, and one prevention idea."),
      usr(`Return detail:\n${i.detail}`),
    ],
  },
  {
    slug: "cross-channel-strategy",
    name: "Cross-Channel Strategy",
    description: "Recommend how a product should be positioned differently on Amazon vs Shopify vs Etsy.",
    category: "Strategy",
    icon: "Network",
    fields: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "audience", label: "Target audience", type: "text", placeholder: "Wellness-focused millennials" },
    ],
    buildMessages: (i) => [
      sys("You are a marketplace strategist. For each of Amazon, Shopify, and Etsy, give: positioning angle, hero keyword, pricing posture, and one channel-native trick."),
      usr(`Product: ${i.product}\nAudience: ${i.audience || "infer"}`),
    ],
  },
  {
    slug: "executive-summary",
    name: "Business Executive Summary",
    description: "Generate an executive summary from a snapshot of business KPIs.",
    category: "Strategy",
    icon: "FileBarChart",
    fields: [
      { name: "kpis", label: "Paste KPIs / numbers", type: "textarea", required: true, placeholder: "Revenue: $48k, Orders: 612, AOV: $78, Returns: 4.2%, Top SKU: DS-1001..." },
    ],
    buildMessages: (i) => [
      sys("You write executive briefings. Output a one-paragraph headline summary, then 4 bullets: wins, risks, surprises, next-week priorities."),
      usr(`KPIs:\n${i.kpis}`),
    ],
  },
  // === Apply pass 4 — mechanical backlog ===
  {
    slug: "supplier-vetting",
    name: "Supplier Vetting (IP & Risk)",
    description: "Score a supplier on reliability, fulfilment risk, and IP / counterfeit risk before onboarding.",
    category: "Operations",
    icon: "ShieldCheck",
    fields: [
      { name: "name", label: "Supplier name", type: "text", required: true },
      { name: "country", label: "Country / region", type: "text", placeholder: "China — Shenzhen" },
      { name: "products", label: "Products they offer", type: "textarea", required: true, placeholder: "Branded-style Bluetooth earbuds, generic phone cases..." },
      { name: "evidence", label: "Available evidence (certs, reviews, sample test results)", type: "textarea" },
    ],
    buildMessages: (i) => [
      sys("You are a sourcing risk analyst. Score Reliability, Fulfilment Risk, and IP/Counterfeit Risk on 1–5 each. Flag any branded-style products that may be infringing. Recommend a go/no-go and the next 3 verification steps before onboarding."),
      usr(`Supplier: ${i.name}\nCountry: ${i.country || "unspecified"}\nProducts:\n${i.products}\n\nEvidence:\n${i.evidence || "none provided"}`),
    ],
  },
  {
    slug: "stockout-risk",
    name: "Stockout Risk Predictor",
    description: "Predict the probability of stocking out for a SKU given recent demand, lead time, and current stock.",
    category: "Operations",
    icon: "AlertTriangle",
    fields: [
      { name: "sku", label: "SKU / product", type: "text", required: true },
      { name: "currentStock", label: "Units on hand", type: "number", required: true },
      { name: "leadTimeDays", label: "Supplier lead time (days)", type: "number", required: true },
      { name: "demandContext", label: "Recent demand context", type: "textarea", required: true, placeholder: "Last 4 weeks: 18, 24, 31, 28 units. Promotion next week. Reorder placed: no." },
    ],
    buildMessages: (i) => [
      sys("You are an inventory planner. Estimate stockout probability over the next 30 days as low/medium/high with a numeric % range. Show the math (avg daily demand × lead time vs on-hand). Recommend a reorder quantity and reorder-by date."),
      usr(`SKU: ${i.sku}\nOn hand: ${i.currentStock}\nSupplier lead time (days): ${i.leadTimeDays}\n\nDemand context:\n${i.demandContext}`),
    ],
  },
  {
    slug: "pricing-strategy",
    name: "Channel Pricing Strategy",
    description: "Suggest tiered pricing per sales channel given unit cost and competitor anchor pricing.",
    category: "Pricing",
    icon: "LineChart",
    fields: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "cost", label: "Unit cost (USD)", type: "number", required: true },
      { name: "channels", label: "Channels (comma-separated)", type: "text", default: "shopify, amazon, etsy" },
      { name: "competitorAnchor", label: "Competitor anchor / price range", type: "text", placeholder: "$24 on Amazon, $32 on Shopify, $40 on Etsy" },
      { name: "targetMargin", label: "Target margin %", type: "number", default: "40" },
    ],
    buildMessages: (i) => [
      sys("You are a multi-channel pricing strategist. Output a markdown table with one row per channel: Channel | Suggested price | Margin % | Anchor rationale. Then add 2 bullets on cross-channel risks (price-monitoring/MAP, marketplace fees) and one bullet on a launch promo."),
      usr(`Product: ${i.product}\nUnit cost: $${i.cost}\nTarget margin: ${i.targetMargin || "40"}%\nChannels: ${i.channels || "shopify, amazon, etsy"}\nCompetitor anchor: ${i.competitorAnchor || "unknown — infer reasonable defaults"}`),
    ],
  },
  {
    slug: "bundle-suggester",
    name: "Profitable Bundle Suggester",
    description: "Given recent order history, suggest profitable product bundles and the offer angle for each.",
    category: "Strategy",
    icon: "Package",
    fields: [
      { name: "orderHistory", label: "Order history snippet", type: "textarea", required: true, placeholder: "Order 1: A, B  | Order 2: A, C, D | Order 3: B, D ..." },
      { name: "marginContext", label: "Margin context per SKU (optional)", type: "textarea", placeholder: "A: 40% margin, B: 22%, C: 55%, D: 18%" },
    ],
    buildMessages: (i) => [
      sys("You are a merchandising analyst. Identify the top 3 profitable bundles: which SKUs co-occur and which combination maximises gross-margin uplift. For each bundle output: SKUs, bundle name, suggested discount %, AOV uplift estimate, and the offer angle (e.g. 'Starter kit', 'Refill bundle')."),
      usr(`Order history:\n${i.orderHistory}\n\nMargin context:\n${i.marginContext || "assume uniform margin"}`),
    ],
  },
  {
    slug: "negative-review-triage",
    name: "Negative Review Triage",
    description: "Classify a returned-item complaint, route it, and draft a public + private response.",
    category: "Customer",
    icon: "MessageSquareWarning",
    fields: [
      { name: "review", label: "The complaint / review", type: "textarea", required: true },
      { name: "rating", label: "Star rating (1–5)", type: "number", required: true },
      { name: "orderContext", label: "Order context (optional)", type: "textarea", placeholder: "SKU DS-1001, shipped 12 days ago, no prior contact." },
    ],
    buildMessages: (i) => [
      sys("You triage negative customer reviews and returns. Output: 1) classified reason (defect | shipping | expectations | sizing | counterfeit suspicion | other), 2) routing recommendation (refund | replace | escalate-to-supplier | no-action), 3) a 2-sentence public review reply, 4) a private outreach DM, 5) one prevention insight for the merchandising team."),
      usr(`Rating: ${i.rating}\nOrder context: ${i.orderContext || "none provided"}\n\nReview:\n${i.review}`),
    ],
  },
];

export const TOOLS_BY_SLUG: Record<string, AiToolDef> = Object.fromEntries(
  AI_TOOLS.map((t) => [t.slug, t]),
);

export const TOOL_CATEGORIES = Array.from(new Set(AI_TOOLS.map((t) => t.category)));
