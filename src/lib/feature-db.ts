// Resolve a feature slug → its Drizzle table object so API routes
// don't have to switch-case across 12 entities.
import { eq, sql, desc } from "drizzle-orm";
import { db, schema } from "./db";
import { FEATURES_BY_SLUG, type FeatureDef } from "./features";

const TABLE_BY_SLUG = {
  products: schema.products,
  suppliers: schema.suppliers,
  orders: schema.orders,
  customers: schema.customers,
  inventory: schema.inventory,
  campaigns: schema.campaigns,
  channels: schema.channels,
  "pricing-rules": schema.pricingRules,
  reviews: schema.reviews,
  returns: schema.returns,
  shipments: schema.shipments,
} as const;

export type FeatureSlug = keyof typeof TABLE_BY_SLUG;

export function getFeature(slug: string): { def: FeatureDef; table: (typeof TABLE_BY_SLUG)[FeatureSlug] } | null {
  const def = FEATURES_BY_SLUG[slug];
  const table = TABLE_BY_SLUG[slug as FeatureSlug];
  if (!def || !table) return null;
  return { def, table };
}

export async function listAll(slug: string) {
  const f = getFeature(slug);
  if (!f) return [];
  return db.select().from(f.table as never).orderBy(desc(sql.raw("id"))).limit(500) as Promise<Record<string, unknown>[]>;
}

export async function getOne(slug: string, id: number) {
  const f = getFeature(slug);
  if (!f) return null;
  const [row] = (await db.select().from(f.table as never).where(eq((f.table as never as { id: never }).id, id)).limit(1)) as Record<string, unknown>[];
  return row ?? null;
}

export async function createOne(slug: string, values: Record<string, unknown>) {
  const f = getFeature(slug);
  if (!f) return null;
  const [row] = (await db.insert(f.table as never).values(values as never).returning()) as Record<string, unknown>[];
  return row;
}

export async function updateOne(slug: string, id: number, values: Record<string, unknown>) {
  const f = getFeature(slug);
  if (!f) return null;
  const [row] = (await db
    .update(f.table as never)
    .set(values as never)
    .where(eq((f.table as never as { id: never }).id, id))
    .returning()) as Record<string, unknown>[];
  return row ?? null;
}

export async function deleteOne(slug: string, id: number) {
  const f = getFeature(slug);
  if (!f) return false;
  await db.delete(f.table as never).where(eq((f.table as never as { id: never }).id, id));
  return true;
}

// Coerce values from form (all strings) into the DB-friendly shapes Drizzle expects.
export function coerceValues(slug: string, raw: Record<string, unknown>): Record<string, unknown> {
  const def = FEATURES_BY_SLUG[slug];
  if (!def) return raw;
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    if (raw[f.name] === undefined || raw[f.name] === null || raw[f.name] === "") continue;
    if (f.type === "number") {
      const n = Number(raw[f.name]);
      if (!Number.isNaN(n)) {
        // numeric columns in pg accept strings; integer columns accept numbers.
        // We pass numbers and let Drizzle handle coercion; it works for both.
        out[f.name] = n;
      }
    } else {
      out[f.name] = String(raw[f.name]);
    }
  }
  return out;
}
