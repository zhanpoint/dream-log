"use client";

import { useTranslation } from "react-i18next";
import { usePageMetadata } from "@/hooks/use-page-metadata";

const contactEmail = "warpoint377@gmail.com";

export default function TermsPage() {
  const { t } = useTranslation();

  usePageMetadata(t("marketingPages.terms.title"), t("marketingPages.terms.description"));

  return (
    <section className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="text-3xl font-bold tracking-tight">{t("marketingPages.terms.title")}</h1>
      <p className="mt-4 text-sm text-muted-foreground">{t("marketingPages.terms.updatedAt")}</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.terms.s1Title")}</h2>
          <p className="mt-2">{t("marketingPages.terms.s1Body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.terms.s2Title")}</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>{t("marketingPages.terms.s2Items.a")}</li>
            <li>{t("marketingPages.terms.s2Items.b")}</li>
            <li>{t("marketingPages.terms.s2Items.c")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.terms.s3Title")}</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>{t("marketingPages.terms.s3Items.a")}</li>
            <li>{t("marketingPages.terms.s3Items.b")}</li>
            <li>{t("marketingPages.terms.s3Items.c")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.terms.s4Title")}</h2>
          <p className="mt-2">{t("marketingPages.terms.s4Body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.terms.s5Title")}</h2>
          <p className="mt-2">{t("marketingPages.terms.s5Body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.terms.s6Title")}</h2>
          <p className="mt-2">{t("marketingPages.terms.s6Body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.terms.s7Title")}</h2>
          <p className="mt-2">{t("marketingPages.terms.s7Body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t("marketingPages.terms.s8Title")}</h2>
          <p className="mt-2">
            {t("marketingPages.terms.s8Body")}
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
