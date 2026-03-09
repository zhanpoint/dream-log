"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "@/node_modules/react-i18next";

export function ScrollToTop() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!show) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-16 right-8 z-50 flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
      aria-label={t("common.backToTop")}
      title={t("common.backToTop")}
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  );
}
