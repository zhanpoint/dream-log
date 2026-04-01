 "use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCnyMonthly } from "@/lib/price";
import {
  createCheckoutSession,
  getBillingClientConfig,
  getQuotaSnapshot,
  getSubscriptionStatus,
} from "@/lib/billing-api";
import { AuthHelpers, AuthToken } from "@/lib/auth-api";
import { toast } from "sonner";
import { ScrollReveal } from "@/components/magicui/scroll-reveal";

const planCopy = {
  free: {
    cta: "billing.plan.free.cta",
  },
  pro: {
    upgrade: "billing.plan.pro.upgrade",
    downgrade: "billing.plan.pro.downgrade",
  },
  ultra: {
    upgrade: "billing.plan.ultra.upgrade",
    downgrade: "billing.plan.ultra.downgrade",
  },
} as const;

const plans = [
  {
    id: "free",
    titleKey: "billing.plans.free.title",
    subtitleKey: "billing.plans.free.subtitle",
    features: [
      "billing.plans.free.features.0",
      "billing.plans.free.features.1",
      "billing.plans.free.features.2",
      "billing.plans.free.features.3",
      "billing.plans.free.features.4",
    ],
  },
  {
    id: "pro",
    titleKey: "billing.plans.pro.title",
    subtitleKey: "billing.plans.pro.subtitle",
    features: [
      "billing.plans.pro.features.0",
      "billing.plans.pro.features.1",
      "billing.plans.pro.features.2",
      "billing.plans.pro.features.3",
      "billing.plans.pro.features.4",
    ],
  },
  {
    id: "ultra",
    titleKey: "billing.plans.ultra.title",
    subtitleKey: "billing.plans.ultra.subtitle",
    features: [
      "billing.plans.ultra.features.0",
      "billing.plans.ultra.features.1",
      "billing.plans.ultra.features.2",
      "billing.plans.ultra.features.3",
      "billing.plans.ultra.features.4",
    ],
  },
] as const;

const planRank: Record<"free" | "pro" | "ultra", number> = {
  free: 0,
  pro: 1,
  ultra: 2,
};

type PlanType = "free" | "pro" | "ultra";

export default function PricingSection() {
  const { t, i18n } = useTranslation();
  const [currentPlan, setCurrentPlan] = useState<PlanType>("free");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [billingDisabled, setBillingDisabled] = useState<boolean>(true);

  const formatPrice = (price?: number) =>
    formatCnyMonthly(price, {
      freeLabel: t("billing.price.free"),
      perMonthLabel: t("billing.price.perMonth"),
      locale: i18n.language,
    });

  useEffect(() => {
    const loadBillingConfig = async () => {
      try {
        const cfg = await getBillingClientConfig();
        setBillingDisabled(Boolean(cfg.billing_disabled));
      } catch {
        // Fail closed
        setBillingDisabled(true);
      }
    };
    loadBillingConfig();

    const load = async () => {
      try {
        const [sub, quota] = await Promise.all([
          getSubscriptionStatus(),
          getQuotaSnapshot(),
        ]);
        setCurrentPlan(sub.plan_type || quota.plan_type || "free");
      } catch {
        // 未登录时静默失败
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const response = await fetch("/api/plans");
        if (!response.ok) return;
        const data = await response.json();
        setPrices(data.pricing || {});
      } catch {
        // ignore
      }
    };
    loadPricing();
  }, []);

  const handleUpgrade = async (plan: "pro" | "ultra") => {
    try {
      if (billingDisabled) {
        toast.message(t("billing.disabled.title"), {
          description: t("billing.disabled.description"),
        });
        return;
      }
      const authed = AuthToken.isAuthenticated();
      if (!authed) {
        AuthHelpers.setPostLoginRedirect(window.location.pathname + "#pricing");
        window.location.href = "/auth";
        return;
      }
      setLoadingPlan(plan);
      const isUpgrade = currentPlan !== "free";
      const { checkout_url, portal_url } = await createCheckoutSession(plan, isUpgrade);
      const targetUrl = portal_url || checkout_url;
      if (targetUrl) {
        window.location.href = targetUrl;
      }
    } catch (error: any) {
      const message = error?.response?.data?.detail;
      if (message === "BILLING_DISABLED") {
        toast.message(t("billing.disabled.title"), {
          description: t("billing.disabled.description"),
        });
        return;
      }
      toast.error(message || t("billing.toast.createCheckoutFailed"));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="mx-auto mt-20 w-full max-w-screen-xl px-6 pb-16">
      <ScrollReveal variant="fade-up">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="text-4xl font-semibold text-foreground">{t("billing.hero.title")}</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            {t("billing.hero.subtitle")}
          </p>
        </div>
      </ScrollReveal>
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <ScrollReveal
            key={plan.id}
            variant="fade-up"
            delay={0.06 * index}
            className="h-full"
          >
            <div
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-background p-6 text-foreground shadow-[0_20px_50px_-20px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_70px_-20px_rgba(59,130,246,0.35)]",
                plan.id === "free" && "border-emerald-500/30 hover:border-emerald-400/45",
                plan.id === "pro" && "border-primary/40 ring-1 ring-primary/25",
                plan.id === "ultra" && "border-amber-400/40 hover:border-amber-300/55"
              )}
            >
              {plan.id === "pro" && (
                <span className="absolute right-4 top-4 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {t("billing.plans.pro.badge")}
                </span>
              )}
              <div className="relative z-10">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{t(plan.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground">{t(plan.subtitleKey)}</p>
                </div>
                <div
                  className={cn(
                    "mb-4 text-2xl font-semibold",
                    plan.id === "free" &&
                      "text-emerald-600 dark:text-emerald-300",
                    plan.id === "pro" &&
                      "bg-gradient-to-r from-indigo-500 via-sky-500 to-purple-500 bg-clip-text text-transparent",
                    plan.id === "ultra" &&
                      "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent"
                  )}
                >
                  {formatPrice(prices[plan.id])}
                </div>
                <ul className="space-y-2 text-sm text-foreground/95">
                  {plan.features.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {t(item)}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {currentPlan === plan.id ? (
                    <Button
                      variant="outline"
                      className="h-10 w-fit rounded-full px-6 transition-all duration-300"
                      disabled
                    >
                      {t("billing.action.currentPlan")}
                    </Button>
                  ) : plan.id === "free" ? (
                    <Button
                      disabled
                      variant="outline"
                      className="h-10 w-fit rounded-full px-6 transition-all duration-300"
                    >
                      {t(planCopy.free.cta)}
                    </Button>
                  ) : (
                    <Button
                      className="h-10 w-fit rounded-full px-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-18px_rgba(99,102,241,0.9)] focus-visible:shadow-[0_16px_36px_-18px_rgba(99,102,241,0.9)]"
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loadingPlan !== null}
                    >
                      {(() => {
                        const isLower =
                          planRank[currentPlan] > planRank[plan.id as PlanType];
                        const copy = planCopy[plan.id as "pro" | "ultra"];
                        const text = isLower ? copy.downgrade : copy.upgrade;
                        return loadingPlan === plan.id
                          ? t("billing.action.redirecting")
                          : t(text);
                      })()}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
