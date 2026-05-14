import "dotenv/config";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pool } from "./index";
import {
  users,
  products,
  suppliers,
  orders,
  customers,
  inventory,
  campaigns,
  channels,
  pricingRules,
  reviews,
  returns,
  shipments,
} from "./schema";

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@dropship.local";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo1234";

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]!;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const money = (n: number) => n.toFixed(2);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

async function main() {
  console.log("→ truncating tables");
  await db.execute(sql`TRUNCATE users, products, suppliers, orders, customers, inventory,
    campaigns, channels, pricing_rules, reviews, returns, shipments, ai_runs
    RESTART IDENTITY CASCADE`);

  // ---------- users ----------
  console.log("→ users");
  await db.insert(users).values({
    email: DEMO_EMAIL,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    name: "Demo Admin",
    role: "admin",
  });

  // ---------- suppliers ----------
  console.log("→ suppliers (15)");
  const supplierData = [
    ["Shenzhen Globex Co", "China", "sales@globex.cn"],
    ["Pacific Source Trading", "China", "info@pacificsource.cn"],
    ["Mumbai Textiles Ltd", "India", "orders@mumbaitex.in"],
    ["Istanbul Crafts Co", "Turkey", "hello@istanbulcrafts.tr"],
    ["Berlin Premium Goods", "Germany", "kontakt@bpg.de"],
    ["Osaka Electronics KK", "Japan", "support@osaka-elec.jp"],
    ["Seoul Beauty Lab", "South Korea", "team@seoulbeauty.kr"],
    ["Hanoi Wood Studio", "Vietnam", "wood@hanoistudio.vn"],
    ["Bangkok Home Decor", "Thailand", "sales@bkkdecor.th"],
    ["Mexico Artisan Hub", "Mexico", "contacto@mxhub.mx"],
    ["São Paulo Fashion", "Brazil", "ola@spfashion.br"],
    ["Lagos Tech Imports", "Nigeria", "hello@lagostech.ng"],
    ["Cairo Leather Works", "Egypt", "info@cairoleather.eg"],
    ["Warsaw Pet Supplies", "Poland", "biuro@warsawpet.pl"],
    ["Lisbon Cork Goods", "Portugal", "ola@lisboncork.pt"],
  ];
  await db.insert(suppliers).values(
    supplierData.map(([name, country, email], i) => ({
      name: name!,
      country: country!,
      contactEmail: email!,
      contactPhone: `+1-555-01${String(i).padStart(2, "0")}`,
      rating: ((Math.random() * 2 + 3).toFixed(1)) as unknown as string,
      leadTimeDays: 5 + Math.floor(Math.random() * 14),
      notes: `Reliable partner since 202${i % 5}.`,
      status: i % 7 === 0 ? "paused" : "active",
    })),
  );

  // ---------- products ----------
  console.log("→ products (18)");
  const productSeed = [
    ["DS-1001", "Wireless Bluetooth Earbuds Pro", "Electronics", 8.5, 39.99],
    ["DS-1002", "Smart LED Strip Lights 5m", "Home", 4.2, 19.99],
    ["DS-1003", "Yoga Mat Premium 6mm", "Fitness", 6.0, 29.99],
    ["DS-1004", "Portable Phone Stand Aluminum", "Accessories", 1.8, 12.99],
    ["DS-1005", "Organic Cotton Tote Bag", "Apparel", 2.4, 14.99],
    ["DS-1006", "Stainless Steel Water Bottle 1L", "Outdoors", 3.7, 22.99],
    ["DS-1007", "Mini Humidifier USB", "Home", 5.2, 24.99],
    ["DS-1008", "Resistance Bands Set of 5", "Fitness", 4.8, 18.99],
    ["DS-1009", "Pet Grooming Glove", "Pets", 2.1, 11.99],
    ["DS-1010", "Magnetic Phone Car Mount", "Automotive", 3.0, 16.99],
    ["DS-1011", "Wooden Watch Engraved", "Accessories", 9.5, 49.99],
    ["DS-1012", "Korean Snail Mucin Serum 100ml", "Beauty", 4.6, 27.99],
    ["DS-1013", "Bamboo Cutting Board Set", "Home", 6.8, 32.99],
    ["DS-1014", "Anti-Blue-Light Glasses", "Accessories", 3.4, 21.99],
    ["DS-1015", "Smart Plug WiFi Outlet", "Electronics", 4.0, 17.99],
    ["DS-1016", "Memory Foam Slippers", "Apparel", 3.6, 19.99],
    ["DS-1017", "Reusable Silicone Food Bags", "Home", 2.9, 15.99],
    ["DS-1018", "LED Ring Light 10\"", "Electronics", 7.5, 34.99],
  ];
  await db.insert(products).values(
    productSeed.map(([sku, title, category, cost, price], i) => ({
      sku: sku as string,
      title: title as string,
      description: `${title} — sourced from vetted suppliers, fulfilled within 24 hours of order. High customer satisfaction across all channels.`,
      category: category as string,
      cost: money(cost as number),
      price: money(price as number),
      imageUrl: `https://picsum.photos/seed/${sku}/400/400`,
      tags: [(category as string).toLowerCase(), "bestseller", i % 3 === 0 ? "new" : "popular"],
      status: i % 11 === 0 ? "draft" : "active",
      supplierId: (i % 15) + 1,
    })),
  );

  // ---------- customers ----------
  console.log("→ customers (16)");
  const firstNames = ["Alex", "Jordan", "Sam", "Taylor", "Riley", "Morgan", "Casey", "Avery", "Quinn", "Dakota", "Reese", "Cameron", "Skyler", "Rowan", "Emerson", "Hayden"];
  const lastNames = ["Carter", "Reyes", "Patel", "Nguyen", "Kim", "Martinez", "Brown", "Jones", "Garcia", "Singh", "Lopez", "Anderson", "Thomas", "Walker", "Hall", "Young"];
  const segments = ["new", "loyal", "vip", "at_risk"];
  const countries = ["US", "UK", "CA", "AU", "DE", "FR", "ES", "IT"];
  await db.insert(customers).values(
    range(16).map((i) => {
      const fn = firstNames[i]!;
      const ln = lastNames[i]!;
      const totalOrders = Math.floor(Math.random() * 25) + 1;
      return {
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
        name: `${fn} ${ln}`,
        phone: `+1-555-02${String(i).padStart(2, "0")}`,
        country: pick(countries),
        totalOrders,
        totalSpent: money(totalOrders * (20 + Math.random() * 80)),
        segment: pick(segments),
        notes: i % 4 === 0 ? "Requested gift wrapping previously." : "",
      };
    }),
  );

  // ---------- inventory ----------
  console.log("→ inventory (18)");
  await db.insert(inventory).values(
    range(18).map((i) => ({
      productId: i + 1,
      warehouse: i % 3 === 0 ? "EU-DE" : i % 3 === 1 ? "US-CA" : "ASIA-CN",
      onHand: Math.floor(Math.random() * 200) + 5,
      reserved: Math.floor(Math.random() * 15),
      reorderPoint: 20,
      reorderQty: 100,
      lastRestockedAt: daysAgo(Math.floor(Math.random() * 30)),
    })),
  );

  // ---------- channels ----------
  console.log("→ channels (15)");
  const platforms = ["shopify", "amazon", "etsy"] as const;
  const channelData = range(15).map((i) => {
    const platform = platforms[i % 3]!;
    return {
      platform,
      storeName: `${["Aurora", "Nimbus", "Verdant", "Ember", "Haven"][i % 5]}-${platform}-${i + 1}`,
      storeUrl:
        platform === "shopify"
          ? `https://store-${i + 1}.myshopify.com`
          : platform === "etsy"
            ? `https://etsy.com/shop/store${i + 1}`
            : `https://sellercentral.amazon.com/store-${i + 1}`,
      status: i % 8 === 0 ? "needs_reauth" : "connected",
      apiKeyMasked: `sk_••••${1000 + i}`,
      totalListings: Math.floor(Math.random() * 400) + 10,
      monthlyRevenue: money(Math.random() * 18000 + 500),
    };
  });
  await db.insert(channels).values(channelData);

  // ---------- orders ----------
  console.log("→ orders (20)");
  const orderStatuses = ["pending", "paid", "shipped", "delivered", "cancelled"];
  const orderRows = range(20).map((i) => {
    const items = range(1 + Math.floor(Math.random() * 3)).map((j) => {
      const idx = (i + j) % productSeed.length;
      const p = productSeed[idx]!;
      const qty = 1 + Math.floor(Math.random() * 3);
      return { sku: p[0] as string, title: p[1] as string, qty, price: p[4] as number };
    });
    const total = items.reduce((s, it) => s + it.qty * it.price, 0);
    return {
      orderNumber: `ORD-${10000 + i}`,
      channel: pick(["shopify", "amazon", "etsy"]),
      customerId: (i % 16) + 1,
      total: money(total),
      status: orderStatuses[i % orderStatuses.length]!,
      itemsJson: items,
      shippingAddress: `${100 + i} Maple St, ${pick(["Brooklyn, NY", "Austin, TX", "Berlin, DE", "Toronto, ON", "Madrid, ES"])}`,
      notes: i % 6 === 0 ? "Customer requested expedited shipping." : "",
    };
  });
  await db.insert(orders).values(orderRows);

  // ---------- campaigns ----------
  console.log("→ campaigns (15)");
  const campaignChannels = ["email", "facebook", "google", "tiktok", "instagram"];
  await db.insert(campaigns).values(
    range(15).map((i) => {
      const budget = Math.floor(Math.random() * 4000) + 200;
      const spent = Math.floor(Math.random() * budget);
      const impressions = Math.floor(Math.random() * 80000) + 1000;
      const clicks = Math.floor(impressions * (0.02 + Math.random() * 0.05));
      return {
        name: [
          "Summer Sale Blast",
          "Back to School",
          "Black Friday Tease",
          "New Product Launch",
          "Loyalty Reward",
          "Cart Abandon Recovery",
          "Flash 24h Deal",
          "Holiday Gift Guide",
          "Spring Refresh",
          "Membership Drive",
          "Re-engagement",
          "Influencer Co-Drop",
          "Free Shipping Weekend",
          "Pre-order Hype",
          "End of Season",
        ][i]!,
        channel: pick(campaignChannels),
        status: pick(["draft", "active", "paused", "completed"]),
        budget: money(budget),
        spent: money(spent),
        impressions,
        clicks,
        conversions: Math.floor(clicks * (0.03 + Math.random() * 0.07)),
        copy: "Drive demand with a compelling, channel-tailored message.",
        startsAt: daysAgo(30 - i),
        endsAt: daysAgo(-30 + i),
      };
    }),
  );

  // ---------- pricing rules ----------
  console.log("→ pricing rules (15)");
  await db.insert(pricingRules).values(
    range(15).map((i) => ({
      name: [
        "Global 35% Markup",
        "Electronics Premium Pricing",
        "Fitness Category +25%",
        "Beauty Match Competitor",
        "Home Goods Undercut 5%",
        "Apparel Min Margin 20%",
        "Pets Aggressive +40%",
        "Outdoors Standard +30%",
        "Holiday Boost +50%",
        "Clearance -15%",
        "Amazon Channel +10%",
        "Etsy Handmade +60%",
        "Shopify Standard +35%",
        "VIP Customer -10%",
        "New Product Launch +45%",
      ][i]!,
      scope: pick(["global", "category", "product"]),
      scopeValue: pick(["all", "Electronics", "Fitness", "Beauty", "Home", "Pets", "DS-1001"]),
      strategy: pick(["markup", "match", "undercut"]),
      markupPct: ((Math.random() * 60) + 5).toFixed(2),
      minMarginPct: ((Math.random() * 20) + 10).toFixed(2),
      active: i % 5 !== 0,
    })),
  );

  // ---------- reviews ----------
  console.log("→ reviews (18)");
  const reviewSamples = [
    ["Amazing product!", "Exactly what I expected. Fast shipping too.", 5, "positive"],
    ["Decent quality", "Works fine but packaging was damaged.", 4, "neutral"],
    ["Love it!", "Best purchase this year. Highly recommend.", 5, "positive"],
    ["Not as described", "The color was different from the photo.", 2, "negative"],
    ["Five stars", "Fantastic for the price.", 5, "positive"],
    ["Wouldn't buy again", "Stopped working after 2 weeks.", 1, "negative"],
    ["Pretty good", "Solid value, will recommend to friends.", 4, "positive"],
    ["Average", "Does what it says, nothing more.", 3, "neutral"],
    ["Exceeded expectations", "Quality is way above the price point.", 5, "positive"],
    ["Could be better", "Material feels cheap up close.", 2, "negative"],
    ["Excellent!", "Shipped fast, works as advertised.", 5, "positive"],
    ["Mediocre", "Just OK. Not bad, not great.", 3, "neutral"],
    ["Very happy", "Bought another one for my sister.", 5, "positive"],
    ["Disappointed", "Broke on first use.", 1, "negative"],
    ["Good enough", "Pretty happy with this one.", 4, "positive"],
    ["Fair", "Functions, but design could improve.", 3, "neutral"],
    ["Top tier", "Premium feel, worth every penny.", 5, "positive"],
    ["Returned", "Didn't fit my needs, sent it back.", 2, "negative"],
  ];
  await db.insert(reviews).values(
    reviewSamples.map((r, i) => ({
      productId: (i % 18) + 1,
      customerName: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]?.[0]}.`,
      rating: r[2] as number,
      title: r[0] as string,
      body: r[1] as string,
      channel: pick(["shopify", "amazon", "etsy"]),
      sentiment: r[3] as string,
    })),
  );

  // ---------- returns ----------
  console.log("→ returns (15)");
  const returnReasons = ["damaged", "wrong_item", "not_as_described", "no_longer_needed", "defective", "size_issue"];
  await db.insert(returns).values(
    range(15).map((i) => ({
      orderId: (i % 20) + 1,
      reason: pick(returnReasons),
      detail: pick([
        "Box arrived crushed.",
        "Color wasn't what I expected.",
        "Stopped working after 3 days.",
        "Changed my mind.",
        "Doesn't fit.",
      ]),
      status: pick(["requested", "approved", "received", "refunded", "denied"]),
      refundAmount: money(Math.floor(Math.random() * 60) + 10),
    })),
  );

  // ---------- shipments ----------
  console.log("→ shipments (18)");
  const carriers = ["USPS", "UPS", "FedEx", "DHL", "Amazon Logistics"];
  await db.insert(shipments).values(
    range(18).map((i) => {
      const shipped = i % 4 === 0 ? null : daysAgo(Math.floor(Math.random() * 14));
      const delivered = !shipped || i % 3 === 0 ? null : daysAgo(Math.floor(Math.random() * 7));
      return {
        orderId: (i % 20) + 1,
        carrier: pick(carriers),
        trackingNumber: `1Z${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
        status: pick(["label_created", "in_transit", "out_for_delivery", "delivered", "exception"]),
        cost: money(Math.random() * 25 + 3),
        shippedAt: shipped,
        deliveredAt: delivered,
      };
    }),
  );

  console.log("\n✓ seed complete");
  console.log(`  → demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
