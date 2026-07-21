import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------- auth ----------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  role: varchar("role", { length: 32 }).notNull().default("operator"),
  customerId: integer("customer_id"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- products ----------
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
    sku: varchar("sku", { length: 64 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description").notNull().default(""),
    category: varchar("category", { length: 80 }).notNull(),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull().default("0"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
    imageUrl: varchar("image_url", { length: 500 }).notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    supplierId: integer("supplier_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ skuIdx: uniqueIndex("products_merchant_sku_uidx").on(t.merchantId, t.sku) }),
);

// ---------- suppliers ----------
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
  name: varchar("name", { length: 200 }).notNull(),
  country: varchar("country", { length: 80 }).notNull(),
  contactEmail: varchar("contact_email", { length: 320 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 64 }).notNull().default(""),
  rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
  leadTimeDays: integer("lead_time_days").notNull().default(7),
  notes: text("notes").notNull().default(""),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- orders ----------
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
  orderNumber: varchar("order_number", { length: 64 }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
  channel: varchar("channel", { length: 32 }).notNull(), // shopify | amazon | etsy
  customerId: integer("customer_id"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  paymentStatus: varchar("payment_status", { length: 32 }).notNull().default("unpaid"),
  fulfillmentStatus: varchar("fulfillment_status", { length: 32 }).notNull().default("unfulfilled"),
  refundStatus: varchar("refund_status", { length: 32 }).notNull().default("none"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxTotal: numeric("tax_total", { precision: 12, scale: 2 }).notNull().default("0"),
  shippingTotal: numeric("shipping_total", { precision: 12, scale: 2 }).notNull().default("0"),
  rowVersion: integer("row_version").notNull().default(1),
  exceptionCode: varchar("exception_code", { length: 64 }),
  itemsJson: jsonb("items_json").$type<Array<{ sku: string; title: string; qty: number; price: number; fulfilledQty?: number }>>().notNull().default([]),
  shippingAddress: text("shipping_address").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ orderNumberIdx: uniqueIndex("orders_merchant_number_uidx").on(t.merchantId, t.orderNumber), idempotencyIdx: uniqueIndex("orders_merchant_idempotency_uidx").on(t.merchantId, t.idempotencyKey) }));

// ---------- customers ----------
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull().default(""),
  country: varchar("country", { length: 80 }).notNull().default(""),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpent: numeric("total_spent", { precision: 10, scale: 2 }).notNull().default("0"),
  segment: varchar("segment", { length: 32 }).notNull().default("new"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ emailIdx: uniqueIndex("customers_merchant_email_uidx").on(t.merchantId, t.email) }));

// ---------- inventory ----------
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
  productId: integer("product_id").notNull(),
  warehouse: varchar("warehouse", { length: 64 }).notNull().default("default"),
  onHand: integer("on_hand").notNull().default(0),
  reserved: integer("reserved").notNull().default(0),
  reorderPoint: integer("reorder_point").notNull().default(10),
  reorderQty: integer("reorder_qty").notNull().default(50),
  lastRestockedAt: timestamp("last_restocked_at"),
}, (t) => ({ warehouseIdx: uniqueIndex("inventory_merchant_product_warehouse_uidx").on(t.merchantId, t.productId, t.warehouse) }));

// ---------- marketing campaigns ----------
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
  name: varchar("name", { length: 200 }).notNull(),
  channel: varchar("channel", { length: 32 }).notNull(), // email | facebook | google | tiktok
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  budget: numeric("budget", { precision: 10, scale: 2 }).notNull().default("0"),
  spent: numeric("spent", { precision: 10, scale: 2 }).notNull().default("0"),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  copy: text("copy").notNull().default(""),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
});

// ---------- channels (Amazon / Shopify / Etsy connections) ----------
export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
  platform: varchar("platform", { length: 32 }).notNull(), // shopify | amazon | etsy
  storeName: varchar("store_name", { length: 200 }).notNull(),
  storeUrl: varchar("store_url", { length: 500 }).notNull().default(""),
  status: varchar("status", { length: 32 }).notNull().default("connected"),
  apiKeyMasked: varchar("api_key_masked", { length: 64 }).notNull().default(""),
  totalListings: integer("total_listings").notNull().default(0),
  monthlyRevenue: numeric("monthly_revenue", { precision: 10, scale: 2 }).notNull().default("0"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
});

// ---------- pricing rules ----------
export const pricingRules = pgTable("pricing_rules", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
  name: varchar("name", { length: 200 }).notNull(),
  scope: varchar("scope", { length: 32 }).notNull().default("global"), // global | category | product
  scopeValue: varchar("scope_value", { length: 200 }).notNull().default(""),
  strategy: varchar("strategy", { length: 32 }).notNull().default("markup"), // markup | match | undercut
  markupPct: numeric("markup_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  minMarginPct: numeric("min_margin_pct", { precision: 5, scale: 2 }).notNull().default("10"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- reviews ----------
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
  productId: integer("product_id").notNull(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  rating: integer("rating").notNull().default(5),
  title: varchar("title", { length: 200 }).notNull().default(""),
  body: text("body").notNull().default(""),
  channel: varchar("channel", { length: 32 }).notNull().default("shopify"),
  sentiment: varchar("sentiment", { length: 16 }).notNull().default("unknown"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- returns ----------
export const returns = pgTable("returns", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
  orderId: integer("order_id").notNull(),
  reason: varchar("reason", { length: 64 }).notNull(),
  detail: text("detail").notNull().default(""),
  status: varchar("status", { length: 32 }).notNull().default("requested"), // requested|approved|received|refunded|denied
  refundAmount: numeric("refund_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- shipments ----------
export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
  orderId: integer("order_id").notNull(),
  carrier: varchar("carrier", { length: 64 }).notNull().default("USPS"),
  trackingNumber: varchar("tracking_number", { length: 128 }).notNull().default(""),
  status: varchar("status", { length: 32 }).notNull().default("label_created"),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
});

// ---------- AI runs (history of AI tool executions) ----------
export const aiRuns = pgTable("ai_runs", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull().default("legacy-quarantine"),
  tool: varchar("tool", { length: 64 }).notNull(),
  inputJson: jsonb("input_json").$type<Record<string, unknown>>().notNull().default({}),
  outputText: text("output_text").notNull().default(""),
  model: varchar("model", { length: 128 }).notNull().default(""),
  tokensUsed: integer("tokens_used").notNull().default(0),
  status: varchar("status", { length: 16 }).notNull().default("ok"), // ok | error
  errorMessage: text("error_message").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull(),
  orderId: integer("order_id").notNull(),
  actorUserId: integer("actor_user_id"),
  action: varchar("action", { length: 64 }).notNull(),
  fromState: varchar("from_state", { length: 32 }).notNull(),
  toState: varchar("to_state", { length: 32 }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  previousHash: varchar("previous_hash", { length: 64 }),
  eventHash: varchar("event_hash", { length: 64 }).notNull(),
  signature: varchar("signature", { length: 64 }).notNull(),
  signingKeyId: varchar("signing_key_id", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ idempotencyIdx: uniqueIndex("order_events_merchant_idempotency_uidx").on(t.merchantId, t.idempotencyKey), orderIdx: index("order_events_merchant_order_idx").on(t.merchantId, t.orderId, t.createdAt) }));

export const webhookReceipts = pgTable("webhook_receipts", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull(),
  provider: varchar("provider", { length: 32 }).notNull(),
  providerEventId: varchar("provider_event_id", { length: 160 }).notNull(),
  payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("received"),
  error: text("error"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ providerEventIdx: uniqueIndex("webhook_receipts_provider_event_uidx").on(t.provider, t.providerEventId) }));

export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 64 }).notNull(),
  orderId: integer("order_id").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  providerReference: varchar("provider_reference", { length: 160 }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ idempotencyIdx: uniqueIndex("refunds_merchant_idempotency_uidx").on(t.merchantId, t.idempotencyKey) }));

// ---------- type exports ----------
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type PricingRule = typeof pricingRules.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type ReturnRow = typeof returns.$inferSelect;
export type Shipment = typeof shipments.$inferSelect;
export type AiRun = typeof aiRuns.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type WebhookReceipt = typeof webhookReceipts.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
