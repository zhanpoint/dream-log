import { api, dedupeGet, getCached, invalidateCache, setCache } from "./api";

export type PlanType = "free" | "pro" | "ultra";

export interface SubscriptionStatus {
  plan_type: PlanType;
  status: string;
  status_reason?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  pending_update?: {
    price_id?: string | null;
    plan_type?: PlanType | null;
    effective_at?: string | null;
  } | null;
}

export interface QuotaSnapshot {
  plan_type: PlanType;
  period_start: string;
  limits: Record<string, number>;
  used: Record<string, number>;
}

export interface BillingClientConfig {
  billing_disabled: boolean;
}

export async function getBillingClientConfig(): Promise<BillingClientConfig> {
  const cacheKey = "billing:client-config";
  const cached = getCached<BillingClientConfig>(cacheKey);
  if (cached) return cached;

  const data = await dedupeGet(cacheKey, async () => {
    const response = await api.get<BillingClientConfig>("/billing/client-config");
    setCache(cacheKey, response.data, 60_000);
    return response.data;
  });
  return data;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const cacheKey = "billing:subscription";
  const cached = getCached<SubscriptionStatus>(cacheKey);
  if (cached) return cached;

  const data = await dedupeGet(cacheKey, async () => {
    const response = await api.get<SubscriptionStatus>("/billing/subscription");
    setCache(cacheKey, response.data, 10_000);
    return response.data;
  });
  return data;
}

export async function getQuotaSnapshot(): Promise<QuotaSnapshot> {
  const cacheKey = "billing:quota";
  const cached = getCached<QuotaSnapshot>(cacheKey);
  if (cached) return cached;

  const data = await dedupeGet(cacheKey, async () => {
    const response = await api.get<QuotaSnapshot>("/quota/me");
    setCache(cacheKey, response.data, 10_000);
    return response.data;
  });
  return data;
}

export async function createCheckoutSession(planType: PlanType, upgrade = false) {
  const response = await api.post<{
    checkout_url?: string;
    portal_url?: string;
    updated?: boolean;
  }>("/billing/checkout", {
    plan_type: planType,
    upgrade,
  });
  invalidateCache("billing:");
  return response.data;
}


export async function createPortalSession() {
  const response = await api.post<{ portal_url: string }>("/billing/portal");
  return response.data;
}
