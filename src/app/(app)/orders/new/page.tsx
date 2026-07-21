import { getRequiredSession } from "@/lib/auth";
import { NewOrderForm } from "@/components/new-order-form";

export default async function NewOrderPage() {
  await getRequiredSession(["operator", "merchant_admin"]);
  return <NewOrderForm />;
}
