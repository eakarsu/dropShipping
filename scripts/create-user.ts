import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/lib/db";
import { users } from "../src/lib/db/schema";

const acknowledgement = process.env.BOOTSTRAP_ACKNOWLEDGEMENT;
const email = (process.env.BOOTSTRAP_EMAIL ?? process.env.PROVISION_ADMIN_EMAIL)?.trim().toLowerCase();
const name = (process.env.BOOTSTRAP_NAME ?? process.env.PROVISION_ADMIN_NAME)?.trim() || "Runtime Administrator";
const password = process.env.BOOTSTRAP_PASSWORD ?? process.env.PROVISION_ADMIN_PASSWORD;
const merchantId = (process.env.BOOTSTRAP_MERCHANT_ID ?? process.env.TENANT_ID)?.trim();
const role = process.env.BOOTSTRAP_ROLE ?? "merchant_admin";
const customerId = process.env.BOOTSTRAP_CUSTOMER_ID ? Number(process.env.BOOTSTRAP_CUSTOMER_ID) : undefined;

if (acknowledgement !== "create-initial-admin") throw new Error("BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin is required");
if (!email || !name || !password || password.length < 12 || !merchantId || !/^[A-Za-z0-9_-]{1,64}$/.test(merchantId)) {
  throw new Error("Valid email, name, 12+ character password, and merchant/tenant ID are required");
}
if (!["customer", "operator", "merchant_admin"].includes(role)) throw new Error("Invalid BOOTSTRAP_ROLE");
if (role === "customer" && (!Number.isInteger(customerId) || customerId! <= 0)) throw new Error("BOOTSTRAP_CUSTOMER_ID is required for customer accounts");
const accountEmail: string = email;
const accountPassword: string = password;
const accountMerchantId: string = merchantId;

async function main() {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, accountEmail)).limit(1);
  const values = {
    email: accountEmail,
    name,
    merchantId: accountMerchantId,
    role,
    customerId,
    passwordHash: await bcrypt.hash(accountPassword, 12),
    active: true,
  };
  if (existing) await db.update(users).set(values).where(eq(users.id, existing.id));
  else await db.insert(users).values(values);
  console.log(`${existing ? 'Updated' : 'Created'} ${role} account for ${accountEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
