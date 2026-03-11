"use client";

import { useTranslation } from "react-i18next";
import { usePageMetadata } from "@/hooks/use-page-metadata";

export default function AboutPage() {
  const { t } = useTranslation();

  usePageMetadata(t("marketingPages.about.title"), t("marketingPages.about.description"));

  return (
    <section className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="text-3xl font-bold tracking-tight">{t("marketingPages.about.title")}</h1>
      <p className="mt-4 text-muted-foreground leading-7">{t("marketingPages.about.intro")}</p>

      <div className="mt-8 grid gap-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">{t("marketingPages.about.originTitle")}</h2>
          <p className="mt-3 text-muted-foreground leading-7">{t("marketingPages.about.originBody")}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">{t("marketingPages.about.capabilityTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>{t("marketingPages.about.capabilities.quick")}</li>
            <li>{t("marketingPages.about.capabilities.ai")}</li>
            <li>{t("marketingPages.about.capabilities.tracking")}</li>
            <li>{t("marketingPages.about.capabilities.community")}</li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">{t("marketingPages.about.principleTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>{t("marketingPages.about.principles.boundary")}</li>
            <li>{t("marketingPages.about.principles.user")}</li>
            <li>{t("marketingPages.about.principles.iterate")}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
