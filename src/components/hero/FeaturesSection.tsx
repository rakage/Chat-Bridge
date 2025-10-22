"use client";

import Link from "next/link";
import { MessageCircle, Bot, BarChart3, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    id: "pillar-omni",
    icon: MessageCircle,
    title: "Truly Omnichannel",
    desc: "Handle WhatsApp, IG, FB, Web and Telegram in one AI-assisted inbox.",
    href: "#integrations",
    ctaLabel: "See channels",
  },
  {
    id: "pillar-automation",
    icon: Bot,
    title: "Automation + Handoff",
    desc: "Route with AI, escalate to agents, and track SLAs end-to-end.",
    href: "#automation",
    ctaLabel: "Explore flows",
  },
  {
    id: "pillar-analytics",
    icon: BarChart3,
    title: "Analytics that Matter",
    desc: "Understand CSAT, resolution time, deflection, and revenue impact.",
    href: "#analytics",
    ctaLabel: "View metrics",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative py-16 sm:py-20 lg:py-24 overflow-hidden"
      role="region"
      aria-label="Key product value propositions"
    >
      {/* Animated Gradient Orbs */}
      <div className="absolute top-1/3 left-10 w-80 h-80 bg-white/5 rounded-full blur-3xl opacity-[0.14] animate-pulse" />
      <div
        className="absolute bottom-1/3 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl opacity-[0.14] animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative z-10 mx-auto max-w-[1200px] px-4">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <Badge
            variant="outline"
            className="mb-4 border-zinc-800 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-widest text-zinc-400"
          >
            Why ChatBridge
          </Badge>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight"
            id="features-heading"
          >
            Built to Unify, Automate, and Measure
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
            Three pillars that turn every conversation into outcomes.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, idx) => {
            const IconComponent = feature.icon;
            return (
              <article
                key={feature.id}
                className="group relative rounded-2xl border border-zinc-800/60 bg-zinc-900/55 backdrop-blur-xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-500/35 hover:shadow-2xl hover:shadow-purple-500/10"
                role="article"
                aria-labelledby={`${feature.id}-title`}
                style={{
                  animationDelay: `${idx * 90}ms`,
                }}
              >
                {/* Icon */}
                <div
                  className="mb-5 flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-800/60 border border-zinc-700/50 group-hover:scale-110 transition-transform duration-300"
                  aria-hidden="true"
                >
                  <IconComponent className="h-7 w-7 text-zinc-300" />
                </div>

                {/* Content */}
                <h3
                  id={`${feature.id}-title`}
                  className="text-lg sm:text-xl font-bold text-white mb-3 tracking-tight"
                >
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-zinc-400 mb-5 leading-relaxed">
                  {feature.desc}
                </p>

                {/* CTA Link */}
                <Link
                  href={feature.href}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors group/link"
                >
                  {feature.ctaLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                </Link>

                {/* Focus ring */}
                <div className="absolute inset-0 rounded-2xl ring-0 ring-green-500/0 group-focus-within:ring-2 group-focus-within:ring-green-500/55 transition-all pointer-events-none" />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
