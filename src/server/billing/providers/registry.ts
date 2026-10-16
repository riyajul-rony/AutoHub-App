import { PaymentProvider } from "./types";
import { ManualPaymentProvider } from "./manual-provider";
import { OnlinePaymentProvider } from "./online-provider";
import { getConfig } from "@/server/config";

const manualProvider = new ManualPaymentProvider();
const onlineProvider = new OnlinePaymentProvider();

const providers: Record<string, PaymentProvider> = {
  manual: manualProvider,
  online: onlineProvider,
  stripe: onlineProvider,
  bkash: manualProvider,
  bank: manualProvider,
};

export async function getDefaultProviderId(): Promise<string> {
  const configured = await getConfig("DEFAULT_PAYMENT_PROVIDER" as any);
  return configured || "manual";
}

export function getPaymentProvider(providerId?: string): PaymentProvider {
  if (providerId && providers[providerId.toLowerCase()]) {
    return providers[providerId.toLowerCase()];
  }
  return manualProvider;
}

export function listAvailablePaymentProviders(): Array<{ id: string; name: string }> {
  return [
    { id: "manual", name: "Manual Verification (bKash / Bank / Crypto)" },
    { id: "online", name: "Online Gateway (Stripe / Webhook Integration)" },
  ];
}
