"use client";

import { useTranslation } from "react-i18next";

const contactEmail = "warpoint377@gmail.com";

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="text-3xl font-bold tracking-tight">{t("marketingPages.privacy.title")}</h1>
      <p className="mt-4 text-sm text-muted-foreground">{t("marketingPages.privacy.updatedAt")}</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.privacy.s1Title")}</h2>
          <p className="mt-2">{t("marketingPages.privacy.s1Intro")}</p>
          <ul className="mt-2 list-disc pl-5">
            <li>{t("marketingPages.privacy.s1Items.account")}</li>
            <li>{t("marketingPages.privacy.s1Items.content")}</li>
            <li>{t("marketingPages.privacy.s1Items.logs")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.privacy.s2Title")}</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>{t("marketingPages.privacy.s2Items.core")}</li>
            <li>{t("marketingPages.privacy.s2Items.security")}</li>
            <li>{t("marketingPages.privacy.s2Items.compliance")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.privacy.s3Title")}</h2>
          <p className="mt-2">{t("marketingPages.privacy.s3Body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.privacy.s4Title")}</h2>
          <p className="mt-2">{t("marketingPages.privacy.s4Body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.privacy.s5Title")}</h2>
          <p className="mt-2">{t("marketingPages.privacy.s5Body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.privacy.s6Title")}</h2>
          <p className="mt-2">{t("marketingPages.privacy.s6Body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.privacy.s7Title")}</h2>
          <p className="mt-2">{t("marketingPages.privacy.s7Body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.privacy.s8Title")}</h2>
          <p className="mt-2">{t("marketingPages.privacy.s8Body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.privacy.s9Title")}</h2>
          <p className="mt-2">
            {t("marketingPages.privacy.s9Body")}
            <a href={`mailto:${contactEmail}`} className="ml-1 text-primary underline underline-offset-4">
              {contactEmail}
            </a>
            。
          </p>
        </section>
      </div>
    </section>
  );
}
