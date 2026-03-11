"use client";

import { useTranslation } from "react-i18next";
import { usePageMetadata } from "@/hooks/use-page-metadata";

const contactEmail = "warpoint377@gmail.com";

export default function ContactPage() {
  const { t } = useTranslation();

  usePageMetadata(t("marketingPages.contact.title"), t("marketingPages.contact.description"));

  return (
    <section className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="text-3xl font-bold tracking-tight">{t("marketingPages.contact.title")}</h1>
      <p className="mt-4 text-muted-foreground leading-7">{t("marketingPages.contact.intro")}</p>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t("marketingPages.contact.officialEmail")}</p>
        <a
          href={`mailto:${contactEmail}`}
          className="mt-1 inline-block text-base font-medium text-primary underline underline-offset-4"
        >
          {contactEmail}
        </a>
        <p className="mt-3 text-sm text-muted-foreground">{t("marketingPages.contact.emailHint")}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">{t("marketingPages.contact.supportTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground leading-6">
            <li>{t("marketingPages.contact.supportItems.bug")}</li>
            <li>{t("marketingPages.contact.supportItems.suggestion")}</li>
            <li>{t("marketingPages.contact.supportItems.complaint")}</li>
            <li>{t("marketingPages.contact.supportItems.data")}</li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">{t("marketingPages.contact.includeTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground leading-6">
            <li>{t("marketingPages.contact.includeItems.type")}</li>
            <li>{t("marketingPages.contact.includeItems.detail")}</li>
            <li>{t("marketingPages.contact.includeItems.context")}</li>
            <li>{t("marketingPages.contact.includeItems.expected")}</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">{t("marketingPages.contact.processTitle")}</h2>
        <p className="mt-3 text-sm text-muted-foreground leading-7">{t("marketingPages.contact.processBody")}</p>
      </div>
    </section>
  );
}
