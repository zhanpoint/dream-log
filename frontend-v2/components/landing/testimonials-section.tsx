"use client";

import { motion } from "framer-motion";
import Marquee from "@/components/magicui/marquee";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import "@/styles/testimonials.css";

/**
 * 用户评价数据
 */
const testimonials = [
  {
    id: 1,
    name: "James",
    avatar: "https://i.pravatar.cc/150?img=12",
  },
  {
    id: 2,
    name: "Michael",
    avatar: "https://i.pravatar.cc/150?img=33",
  },
  {
    id: 3,
    name: "Sarah",
    avatar: "https://i.pravatar.cc/150?img=45",
  },
  {
    id: 4,
    name: "David",
    avatar: "https://i.pravatar.cc/150?img=68",
  },
  {
    id: 5,
    name: "Emma",
    avatar: "https://i.pravatar.cc/150?img=27",
  },
  {
    id: 6,
    name: "Alex",
    avatar: "https://i.pravatar.cc/150?img=51",
  },
  {
    id: 7,
    name: "Lisa",
    avatar: "https://i.pravatar.cc/150?img=47",
  },
  {
    id: 8,
    name: "Tom",
    avatar: "https://i.pravatar.cc/150?img=64",
  },
];

/**
 * 评价卡片组件
 */
const TestimonialCard = ({
  testimonial,
}: {
  testimonial: (typeof testimonials)[0];
}) => {
  const { t } = useTranslation();

  return (
    <motion.figure
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn(
        "testimonial-card",
        "relative w-80 min-h-[180px] cursor-pointer overflow-hidden rounded-2xl border p-6 shadow-lg transition-all duration-300 backdrop-blur-sm",
        "border-border/50",
        "hover:border-primary/30",
        "hover:shadow-2xl hover:shadow-primary/10"
      )}
    >
      {/* 用户信息头部 */}
      <div className="flex items-center gap-4 mb-6">
        <img
          className="w-12 h-12 rounded-full border-2 border-border/50"
          src={testimonial.avatar}
          alt={testimonial.name}
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">
            {testimonial.name}
          </h4>
        </div>
      </div>

      {/* 评价内容 */}
      <blockquote className="text-foreground/90 leading-relaxed text-base font-medium">
        "{t(`marketing.testimonials.reviews.${testimonial.id}`)}"
      </blockquote>
    </motion.figure>
  );
};

/**
 * 用户评价无限滚动组件
 */
export default function TestimonialsSection() {
  const { t } = useTranslation();
  // 将评价分为两行
  const firstRow = testimonials.slice(0, Math.ceil(testimonials.length / 2));
  const secondRow = testimonials.slice(Math.ceil(testimonials.length / 2));

  return (
    <section className="relative py-24 px-6 overflow-x-hidden bg-background">
      <div className="max-w-7xl mx-auto overflow-x-hidden">
        {/* 标题区域 */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            {t("marketing.testimonials.heading")}
          </h2>
        </motion.div>

        {/* 无限滚动评价区域 */}
        <div className="relative flex w-full flex-col items-center justify-center overflow-x-hidden testimonials-fade-mask">
          {/* 第一行 - 从左到右 */}
          <Marquee pauseOnHover className="[--duration:60s] mb-4 max-w-full">
            {firstRow.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </Marquee>

          {/* 第二行 - 从右到左 */}
          <Marquee reverse pauseOnHover className="[--duration:60s] max-w-full">
            {secondRow.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </Marquee>
        </div>

        {/* 底部统计信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true, amount: 0.3 }}
          className="flex flex-wrap justify-center items-center gap-16 mt-16 text-center"
        >
          <div className="flex flex-col">
            <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              1000+
            </span>
            <span className="text-sm text-muted-foreground font-medium mt-2">
              {t("marketing.testimonials.stats.users")}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              50000+
            </span>
            <span className="text-sm text-muted-foreground font-medium mt-2">
              {t("marketing.testimonials.stats.dreams")}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              97%
            </span>
            <span className="text-sm text-muted-foreground font-medium mt-2">
              {t("marketing.testimonials.stats.satisfaction")}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
