"use client";

import Link from "next/link";
import "@/styles/footer.css";
import { SphereMask } from "@/components/magicui/sphere-mask";
import { useTranslation } from "react-i18next";

export function SiteFooter() {
  const { t } = useTranslation();

  const footerNavs = [
    {
      label: t("footer.sections.product"),
      items: [
        { href: "#features", name: t("footer.items.features") },
        { href: "#statistics", name: t("footer.items.statistics") },
        { href: "#about", name: t("footer.items.about") },
      ],
    },
    {
      label: t("footer.sections.resources"),
      items: [
        { href: "/docs", name: t("footer.items.docs") },
        { href: "/blog", name: t("footer.items.blog") },
        { href: "/help", name: t("footer.items.help") },
      ],
    },
    {
      label: t("footer.sections.legal"),
      items: [
        { href: "/terms", name: t("footer.items.terms") },
        { href: "/privacy", name: t("footer.items.privacy") },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden">
      {/* 地平线及辉光效果 */}
      <SphereMask />
      
      <div className="mx-auto w-full max-w-screen-xl relative z-10">
        <div className="md:flex md:justify-between px-8 p-4 py-16 sm:pb-16 gap-4">
          <div className="mb-12 flex-col flex gap-4">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Dream Log" className="h-12 w-12 rounded-full object-cover" />
              <span className="self-center text-2xl font-semibold whitespace-nowrap text-foreground">
                Dream Log
              </span>
            </Link>
            <p className="max-w-xs text-base text-muted-foreground">
              {t("footer.tagline")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:gap-10 sm:grid-cols-3">
            {footerNavs.map((nav) => (
              <div key={nav.label}>
                <h2 className="mb-6 text-base tracking-tighter font-semibold text-foreground uppercase">
                  {nav.label}
                </h2>
                <ul className="gap-3 grid">
                  {nav.items.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="cursor-pointer text-muted-foreground hover:text-foreground duration-200 font-medium text-base"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex sm:items-center sm:justify-center rounded-md border-neutral-700/20 py-4 px-8 gap-2">
          <div className="flex items-center gap-4 text-base text-muted-foreground">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-beian-link"
            >
              豫ICP备2025135141号-1
            </a>
            <span className="text-muted-foreground/60">|</span>
            <a
              href="https://beian.mps.gov.cn/#/query/webSearch?code=41911002000051"
              target="_blank"
              rel="noreferrer"
              className="footer-beian-link flex items-center gap-1"
            >
              <img src="/beian.png" alt="公安备案" className="w-3 h-3" />
              豫公网安备41911002000051号
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
