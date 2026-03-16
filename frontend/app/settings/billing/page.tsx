"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  createCheckoutSession,
  createPortalSession,
  getBillingClientConfig,
  getQuotaSnapshot,
  getSubscriptionStatus,
} from "@/lib/billing-api";
import { invalidateCache } from "@/lib/api";
import { AuthHelpers, AuthToken } from "@/lib/auth-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCnyMonthly } from "@/lib/price";
import { useNotificationSSE } from "@/lib/use-notification-sse";

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

const billingCards = [
  {
    id: "free",
    titleKey: "billing.cards.free.title",
    priceKey: "free",
    descKey: "billing.cards.free.desc",
  },
  {
    id: "pro",
    titleKey: "billing.cards.pro.title",
    priceKey: "pro",
    descKey: "billing.cards.pro.desc",
  },
  {
    id: "ultra",
    titleKey: "billing.cards.ultra.title",
    priceKey: "ultra",
    descKey: "billing.cards.ultra.desc",
  },
] as const;

const planRank: Record<"free" | "pro" | "ultra", number> = {
  free: 0,
  pro: 1,
  ultra: 2,
};

type PlanType = keyof typeof planRank;

export default function BillingPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [quota, setQuota] = useState<any>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [billingDisabled, setBillingDisabled] = useState<boolean>(true);

  const formatPrice = useCallback(
    (price?: number) =>
      formatCnyMonthly(price, {
        freeLabel: t("billing.price.free"),
        perMonthLabel: t("billing.price.perMonth"),
        locale: i18n.language,
      }),
    [i18n.language, t]
  );

  const currentPlan: PlanType = useMemo(() => {
    const plan = subscription?.plan_type;
    return plan === "free" || plan === "pro" || plan === "ultra" ? plan : "free";
  }, [subscription?.plan_type]);
  const paymentStatus = searchParams.get("status");
  const checkoutStatus = searchParams.get("checkout");

  useEffect(() => {
    const loadBillingConfig = async () => {
      try {
        const cfg = await getBillingClientConfig();
        setBillingDisabled(Boolean(cfg.billing_disabled));
      } catch {
        // Fail closed: avoid exposing checkout when config can't be loaded
        setBillingDisabled(true);
      }
    };
    loadBillingConfig();

    const load = async () => {
      try {
        const [sub, quotaData] = await Promise.all([
          getSubscriptionStatus(),
          getQuotaSnapshot(),
        ]);
        setSubscription(sub);
        setQuota(quotaData);
      } catch {
        toast.error(t("billing.toast.loadSubscriptionFailed"));
      }
    };
    load();
  }, [t]);

  const refreshSubscription = useCallback(async () => {
    try {
      const [sub, quotaData] = await Promise.all([
        getSubscriptionStatus(),
        getQuotaSnapshot(),
      ]);
      setSubscription(sub);
      setQuota(quotaData);
    } catch {
      // ignore
    }
  }, []);

  useNotificationSSE({
    onEvent: (event) => {
      if (event === "subscription_updated") {
        invalidateCache("billing:");
        refreshSubscription();
      }
    },
  });

  useEffect(() => {
    if (paymentStatus === "success" && checkoutStatus === "completed") {
      toast.success(t("billing.toast.paymentSuccess"), {
        duration: 4000,
      });
      invalidateCache("billing:");
      refreshSubscription();
      const url = new URL(window.location.href);
      url.searchParams.delete("status");
      url.searchParams.delete("checkout");
      router.replace(url.pathname, { scroll: false });
      return;
    }
    if (paymentStatus === "cancel" || checkoutStatus === "canceled") {
      toast.message(t("billing.toast.paymentCanceled.title"), {
        description: t("billing.toast.paymentCanceled.description"),
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("status");
      url.searchParams.delete("checkout");
      router.replace(url.pathname, { scroll: false });
    }
  }, [paymentStatus, checkoutStatus, router, t, refreshSubscription]);

  useEffect(() => {
    const portalReturn = searchParams.get("portal");
    if (portalReturn === "success") {
      invalidateCache("billing:");
      // 返回即刻先刷新一次，最终状态以 SSE 推送为准（无轮询）
      refreshSubscription();
      const url = new URL(window.location.href);
      url.searchParams.delete("portal");
      router.replace(url.pathname, { scroll: false });
    }
  }, [router, searchParams, refreshSubscription]);

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

  const quotaSummary = useMemo(() => {
    if (!quota) return [];
    return [
      { label: t("billing.quota.dreamAnalysis"), used: quota.used.dream_analysis, limit: quota.limits.dream_analysis },
      { label: t("billing.quota.titleAnalysis"), used: quota.used.title_analysis, limit: quota.limits.title_analysis },
      { label: t("billing.quota.imageGeneration"), used: quota.used.image_generation, limit: quota.limits.image_generation },
      { label: t("billing.quota.weeklyReports"), used: quota.used.weekly_reports, limit: quota.limits.weekly_reports },
      { label: t("billing.quota.monthlyReports"), used: quota.used.monthly_reports, limit: quota.limits.monthly_reports },
      { label: t("billing.quota.yearlyReports"), used: quota.used.yearly_reports, limit: quota.limits.yearly_reports },
      { label: t("billing.quota.topicReports"), used: quota.used.topic_reports, limit: quota.limits.topic_reports },
    ];
  }, [quota, t]);

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
        AuthHelpers.setPostLoginRedirect(window.location.pathname);
        window.location.href = "/auth";
        return;
      }
      setLoadingPlan(plan);
      const isUpgrade = currentPlan !== "free";
      const { checkout_url, portal_url } = await createCheckoutSession(plan, isUpgrade);
      if (portal_url) {
        window.location.href = portal_url;
        return;
      }
      if (checkout_url) {
        window.location.href = checkout_url;
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

  const handlePortal = async () => {
    try {
      if (billingDisabled) {
        toast.message(t("billing.disabled.title"), {
          description: t("billing.disabled.description"),
        });
        return;
      }
      const { portal_url } = await createPortalSession();
      window.location.href = portal_url;
    } catch (error: any) {
      const message = error?.response?.data?.detail;
      if (message === "BILLING_DISABLED") {
        toast.message(t("billing.disabled.title"), {
          description: t("billing.disabled.description"),
        });
        return;
      }
      toast.error(message || t("billing.toast.openPortalFailed"));
    }
  };


  const renderAction = (plan: "free" | "pro" | "ultra") => {
    if (currentPlan === plan) {
      return (
        <Button disabled variant="outline" className="h-10 w-fit rounded-full px-6">
          {t("billing.action.currentPlan")}
        </Button>
      );
    }
    if (plan !== "free" && planRank[currentPlan] > planRank[plan]) {
      return (
        <Button
          className="h-10 w-fit rounded-full bg-primary/15 px-6 text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/25 hover:text-primary-foreground hover:shadow-[0_10px_26px_-16px_rgba(59,130,246,0.9)]"
          onClick={() => handleUpgrade(plan)}
          disabled={loadingPlan !== null}
        >
          {loadingPlan === plan
            ? t("billing.action.redirecting")
            : t(planCopy[plan].downgrade)}
        </Button>
      );
    }
    if (plan === "free") {
      return (
        <Button disabled variant="outline" className="h-10 w-fit rounded-full px-6">
          {t("billing.action.freePlan")}
        </Button>
      );
    }
    return (
      <Button
        className="h-10 w-fit rounded-full bg-primary/15 px-6 text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/25 hover:text-primary-foreground hover:shadow-[0_10px_26px_-16px_rgba(59,130,246,0.9)]"
        onClick={() => handleUpgrade(plan)}
        disabled={loadingPlan !== null}
      >
        {loadingPlan === plan
          ? t("billing.action.redirecting")
          : t(planCopy[plan].upgrade)}
      </Button>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("billing.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("billing.subtitle")}
        </p>
        {paymentStatus === "cancel" && checkoutStatus === "canceled" && (
          <div className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/70 px-4 py-3 text-sm text-amber-700">
            {t("billing.alerts.paymentCanceled")}
          </div>
        )}
        {(subscription?.status_reason === "payment_failed" ||
          subscription?.status_reason === "payment_action_required") && (
          <div className="mt-4 rounded-2xl border border-rose-200/60 bg-rose-50/70 px-4 py-3 text-sm text-rose-700">
            {t("billing.alerts.paymentFailed.message")}
            <button
              className="ml-3 inline-flex items-center text-xs font-semibold text-rose-700 underline decoration-dotted underline-offset-4"
              onClick={handlePortal}
            >
              {t("billing.alerts.paymentFailed.action")}
            </button>
          </div>
        )}
        {subscription?.status === "past_due" && (
          <div className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/70 px-4 py-3 text-sm text-amber-700">
            {t("billing.alerts.pastDue.message")}
            <button
              className="ml-3 inline-flex items-center text-xs font-semibold text-amber-700 underline decoration-dotted underline-offset-4"
              onClick={handlePortal}
            >
              {t("billing.alerts.pastDue.action")}
            </button>
          </div>
        )}
        {subscription?.status === "incomplete" && (
          <div className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/70 px-4 py-3 text-sm text-amber-700">
            {t("billing.alerts.incomplete")}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {billingCards.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-background p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
              plan.id === "free" && "border-emerald-500/60",
              plan.id === "pro" &&
                "border-primary/35 before:absolute before:inset-0 before:bg-gradient-to-br before:from-indigo-500/10 before:via-sky-500/5 before:to-purple-500/10",
              plan.id === "ultra" &&
                "border-amber-400/40 before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-400/12 before:via-orange-500/6 before:to-rose-500/10",
              currentPlan === plan.id && "ring-1 ring-primary/40"
            )}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">{t(plan.titleKey)}</h2>
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wide",
                    plan.id === "free" &&
                      "text-emerald-600 dark:text-emerald-300",
                    plan.id === "pro" &&
                      "bg-gradient-to-r from-indigo-500 via-sky-500 to-purple-500 bg-clip-text text-transparent",
                    plan.id === "ultra" &&
                      "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent"
                  )}
                >
                  {(() => {
                    const price = prices[plan.priceKey];
                    return formatPrice(price);
                  })()}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t(plan.descKey)}</p>
              <div className="mt-4">{renderAction(plan.id)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-primary/10 dark:from-slate-950/60 dark:via-slate-950/40 dark:to-slate-900/40 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.6)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{t("billing.quota.title")}</h3>
          </div>
          <Button
            variant="outline"
            className="rounded-full px-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-[0_8px_20px_-14px_rgba(59,130,246,0.8)]"
            onClick={handlePortal}
            disabled={billingDisabled}
          >
            {t("billing.actions.manageSubscription")}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {quotaSummary.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-sm text-foreground/90 dark:border-white/10 dark:bg-white/5"
            >
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-sm text-foreground/90">
                {item.used} / {item.limit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
