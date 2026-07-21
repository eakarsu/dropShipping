// Single source of truth for the dropshipping features the app exposes.
// Each entry drives:
//   • the sidebar nav
//   • the dashboard cards (clickable → feature)
//   • the generic list / detail / new pages
//   • the API routes
//   • which AI tool is suggested as the primary action

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "json";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  default?: string | number | boolean;
};

export type ColumnDef = {
  name: string;
  label: string;
  format?: "money" | "date" | "badge" | "rating" | "json";
};

export type FeatureDef = {
  slug: string;            // url segment, e.g. "products"
  table: string;           // drizzle schema export name
  name: string;            // human plural, e.g. "Products"
  singular: string;
  description: string;
  icon: string;            // lucide name
  columns: ColumnDef[];    // list page columns
  fields: FieldDef[];      // create/edit form fields
};

export const FEATURES: FeatureDef[] = [
  {
    slug: "products",
    table: "products",
    name: "Products",
    singular: "Product",
    description: "Catalog of items you sell across all channels.",
    icon: "Package",
    columns: [
      { name: "sku", label: "SKU" },
      { name: "title", label: "Title" },
      { name: "category", label: "Category" },
      { name: "price", label: "Price", format: "money" },
      { name: "status", label: "Status", format: "badge" },
    ],
    fields: [
      { name: "sku", label: "SKU", type: "text", required: true },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "category", label: "Category", type: "text", required: true },
      { name: "cost", label: "Unit cost (USD)", type: "number", required: true },
      { name: "price", label: "Selling price (USD)", type: "number", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "imageUrl", label: "Image URL", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["active", "draft", "archived"], default: "active" },
    ],
  },
  {
    slug: "suppliers",
    table: "suppliers",
    name: "Suppliers",
    singular: "Supplier",
    description: "Vendors who fulfill your products.",
    icon: "Factory",
    columns: [
      { name: "name", label: "Name" },
      { name: "country", label: "Country" },
      { name: "rating", label: "Rating", format: "rating" },
      { name: "leadTimeDays", label: "Lead time (days)" },
      { name: "status", label: "Status", format: "badge" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "country", label: "Country", type: "text", required: true },
      { name: "contactEmail", label: "Contact email", type: "text", required: true },
      { name: "contactPhone", label: "Phone", type: "text" },
      { name: "rating", label: "Rating (0-5)", type: "number", default: 4 },
      { name: "leadTimeDays", label: "Lead time (days)", type: "number", default: 7 },
      { name: "notes", label: "Notes", type: "textarea" },
      { name: "status", label: "Status", type: "select", options: ["active", "paused", "blacklisted"], default: "active" },
    ],
  },
  {
    slug: "orders",
    table: "orders",
    name: "Orders",
    singular: "Order",
    description: "Orders received across all sales channels.",
    icon: "ShoppingCart",
    columns: [
      { name: "orderNumber", label: "Order #" },
      { name: "channel", label: "Channel", format: "badge" },
      { name: "total", label: "Total", format: "money" },
      { name: "status", label: "Status", format: "badge" },
      { name: "createdAt", label: "Created", format: "date" },
    ],
    fields: [
      { name: "orderNumber", label: "Order number", type: "text", required: true },
      { name: "channel", label: "Channel", type: "select", options: ["shopify", "amazon", "etsy"], default: "shopify" },
      { name: "customerId", label: "Customer ID", type: "number" },
      { name: "total", label: "Total (USD)", type: "number", required: true },
      { name: "status", label: "Status", type: "select", options: ["pending", "paid", "shipped", "delivered", "cancelled"], default: "pending" },
      { name: "shippingAddress", label: "Shipping address", type: "textarea" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    slug: "customers",
    table: "customers",
    name: "Customers",
    singular: "Customer",
    description: "People who buy from your stores.",
    icon: "Users",
    columns: [
      { name: "name", label: "Name" },
      { name: "email", label: "Email" },
      { name: "country", label: "Country" },
      { name: "totalOrders", label: "Orders" },
      { name: "totalSpent", label: "Spent", format: "money" },
      { name: "segment", label: "Segment", format: "badge" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "text", required: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "country", label: "Country", type: "text" },
      { name: "segment", label: "Segment", type: "select", options: ["new", "loyal", "vip", "at_risk"], default: "new" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    slug: "inventory",
    table: "inventory",
    name: "Inventory",
    singular: "Inventory item",
    description: "Stock levels per product per warehouse.",
    icon: "Boxes",
    columns: [
      { name: "productId", label: "Product ID" },
      { name: "warehouse", label: "Warehouse" },
      { name: "onHand", label: "On hand" },
      { name: "reserved", label: "Reserved" },
      { name: "reorderPoint", label: "Reorder point" },
    ],
    fields: [
      { name: "productId", label: "Product ID", type: "number", required: true },
      { name: "warehouse", label: "Warehouse", type: "select", options: ["EU-DE", "US-CA", "ASIA-CN", "default"], default: "default" },
      { name: "onHand", label: "On hand", type: "number", required: true },
      { name: "reserved", label: "Reserved", type: "number", default: 0 },
      { name: "reorderPoint", label: "Reorder point", type: "number", default: 10 },
      { name: "reorderQty", label: "Reorder qty", type: "number", default: 50 },
    ],
  },
  {
    slug: "campaigns",
    table: "campaigns",
    name: "Campaigns",
    singular: "Campaign",
    description: "Paid + email marketing campaigns.",
    icon: "Megaphone",
    columns: [
      { name: "name", label: "Name" },
      { name: "channel", label: "Channel", format: "badge" },
      { name: "status", label: "Status", format: "badge" },
      { name: "budget", label: "Budget", format: "money" },
      { name: "spent", label: "Spent", format: "money" },
      { name: "conversions", label: "Conv." },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "channel", label: "Channel", type: "select", options: ["email", "facebook", "google", "tiktok", "instagram"], default: "email" },
      { name: "status", label: "Status", type: "select", options: ["draft", "active", "paused", "completed"], default: "draft" },
      { name: "budget", label: "Budget (USD)", type: "number", required: true },
      { name: "copy", label: "Copy", type: "textarea" },
    ],
  },
  {
    slug: "channels",
    table: "channels",
    name: "Sales Channels",
    singular: "Channel",
    description: "Connected Amazon, Shopify, and Etsy stores.",
    icon: "Network",
    columns: [
      { name: "platform", label: "Platform", format: "badge" },
      { name: "storeName", label: "Store" },
      { name: "totalListings", label: "Listings" },
      { name: "monthlyRevenue", label: "MRR", format: "money" },
      { name: "status", label: "Status", format: "badge" },
    ],
    fields: [
      { name: "platform", label: "Platform", type: "select", options: ["shopify", "amazon", "etsy"], required: true, default: "shopify" },
      { name: "storeName", label: "Store name", type: "text", required: true },
      { name: "storeUrl", label: "Store URL", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["connected", "needs_reauth", "disconnected"], default: "connected" },
    ],
  },
  {
    slug: "pricing-rules",
    table: "pricingRules",
    name: "Pricing Rules",
    singular: "Pricing rule",
    description: "Automated pricing strategies.",
    icon: "DollarSign",
    columns: [
      { name: "name", label: "Name" },
      { name: "scope", label: "Scope", format: "badge" },
      { name: "strategy", label: "Strategy", format: "badge" },
      { name: "markupPct", label: "Markup %" },
      { name: "active", label: "Active", format: "badge" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "scope", label: "Scope", type: "select", options: ["global", "category", "product"], default: "global" },
      { name: "scopeValue", label: "Scope value", type: "text" },
      { name: "strategy", label: "Strategy", type: "select", options: ["markup", "match", "undercut"], default: "markup" },
      { name: "markupPct", label: "Markup %", type: "number", default: 35 },
      { name: "minMarginPct", label: "Min margin %", type: "number", default: 15 },
    ],
  },
  {
    slug: "reviews",
    table: "reviews",
    name: "Reviews",
    singular: "Review",
    description: "Customer reviews across all channels.",
    icon: "Star",
    columns: [
      { name: "productId", label: "Product" },
      { name: "customerName", label: "Customer" },
      { name: "rating", label: "Rating", format: "rating" },
      { name: "title", label: "Title" },
      { name: "channel", label: "Channel", format: "badge" },
      { name: "sentiment", label: "Sentiment", format: "badge" },
    ],
    fields: [
      { name: "productId", label: "Product ID", type: "number", required: true },
      { name: "customerName", label: "Customer name", type: "text", required: true },
      { name: "rating", label: "Rating (1-5)", type: "number", required: true },
      { name: "title", label: "Title", type: "text" },
      { name: "body", label: "Body", type: "textarea" },
      { name: "channel", label: "Channel", type: "select", options: ["shopify", "amazon", "etsy"], default: "shopify" },
    ],
  },
  {
    slug: "returns",
    table: "returns",
    name: "Returns",
    singular: "Return",
    description: "Customer return requests.",
    icon: "PackageX",
    columns: [
      { name: "orderId", label: "Order" },
      { name: "reason", label: "Reason", format: "badge" },
      { name: "status", label: "Status", format: "badge" },
      { name: "refundAmount", label: "Refund", format: "money" },
      { name: "createdAt", label: "Created", format: "date" },
    ],
    fields: [
      { name: "orderId", label: "Order ID", type: "number", required: true },
      { name: "reason", label: "Reason", type: "select", options: ["damaged", "wrong_item", "not_as_described", "no_longer_needed", "defective", "size_issue"], default: "damaged" },
      { name: "detail", label: "Detail", type: "textarea" },
      { name: "status", label: "Status", type: "select", options: ["requested", "approved", "received", "refunded", "denied"], default: "requested" },
      { name: "refundAmount", label: "Refund (USD)", type: "number", default: 0 },
    ],
  },
  {
    slug: "shipments",
    table: "shipments",
    name: "Shipments",
    singular: "Shipment",
    description: "Outgoing fulfillment and tracking.",
    icon: "Truck",
    columns: [
      { name: "orderId", label: "Order" },
      { name: "carrier", label: "Carrier" },
      { name: "trackingNumber", label: "Tracking #" },
      { name: "status", label: "Status", format: "badge" },
      { name: "cost", label: "Cost", format: "money" },
    ],
    fields: [
      { name: "orderId", label: "Order ID", type: "number", required: true },
      { name: "carrier", label: "Carrier", type: "select", options: ["USPS", "UPS", "FedEx", "DHL", "Amazon Logistics"], default: "USPS" },
      { name: "trackingNumber", label: "Tracking number", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["label_created", "in_transit", "out_for_delivery", "delivered", "exception"], default: "label_created" },
      { name: "cost", label: "Cost (USD)", type: "number", default: 0 },
    ],
  },
];

export const FEATURES_BY_SLUG: Record<string, FeatureDef> = Object.fromEntries(
  FEATURES.map((f) => [f.slug, f]),
);
