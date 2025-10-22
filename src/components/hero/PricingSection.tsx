"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ArrowRight, Calendar, Check, Sparkles } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    tag: "Starter",
    tagVariant: "secondary" as const,
    price: { monthly: 0, annual: 0 },
    desc: "Everything to try ChatBridge for a small team.",
    features: [
      "Unified inbox (Web + Email)",
      "Basic automation & canned replies",
      "Standard analytics",
      "Community support",
    ],
    cta: { label: "Start free", href: "#signup" },
  },
  {
    id: "pro",
    name: "Pro",
    tag: "Most Popular",
    tagVariant: "default" as const,
    featured: true,
    price: { monthly: 49, annual: 490 },
    perLabel: "agent/month",
    desc: "Omnichannel + AI routing for growing teams.",
    features: [
      "AI routing & workflows",
      "Human handoff to agents",
      "SLA tracking & CSAT surveys",
      "Integrations: WhatsApp, IG, FB, Email",
      "Advanced analytics & exports",
      "Priority email support",
    ],
    disclaimer: "*Fair use policy applies.",
    cta: { label: "Start 14-day trial", href: "#signup-pro" },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tag: "Scale",
    tagVariant: "secondary" as const,
    price: { monthly: "Custom", annual: "Custom" },
    desc: "Security, compliance, and custom workflows.",
    features: [
      "SSO (Okta, Google) & SCIM",
      "BAA / HIPAA-ready, ISO 27001, GDPR",
      "Private cloud / on-prem options",
      "Custom SLAs & dedicated CSM",
      "Advanced role/permission model",
      "Premium support (24/7)",
    ],
    cta: { label: "Talk to sales", href: "#contact-sales", ghost: true },
  },
];

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  return (
    <section
      id="pricing"
      className="relative py-18 sm:py-24 lg:py-30 overflow-hidden"
      role="region"
      aria-label="Pricing plans"
    >
      {/* Animated Gradient Orbs */}
      <div className="absolute top-1/4 left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl opacity-[0.12] animate-pulse" />
      <div className="absolute bottom-1/4 right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl opacity-[0.12] animate-pulse" style={{ animationDelay: '1.5s' }} />

      <div className="relative z-10 mx-auto max-w-[1200px] px-4">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <Badge
            variant="outline"
            className="mb-4 border-zinc-800 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-widest text-zinc-400"
          >
            Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight" id="pricing-heading">
            Simple, Scalable Pricing Plans
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
            No credit card needed – start in 5 minutes.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                billingPeriod === "monthly"
                  ? "bg-white text-black shadow-lg"
                  : "text-zinc-400 hover:text-white"
              }`}
              aria-label="Select monthly billing"
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                billingPeriod === "annual"
                  ? "bg-white text-black shadow-lg"
                  : "text-zinc-400 hover:text-white"
              }`}
              aria-label="Select annual billing"
            >
              Annual
              <span className="text-xs text-green-500">— 2 months free</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-16 items-stretch">
          {plans.map((plan, idx) => {
            // Calculate price display based on billing period
            let displayPrice: number | string;
            let displayLabel = plan.perLabel;
            const monthlyAmount = typeof plan.price.monthly === "number" ? plan.price.monthly : null;
            const annualMonthlyEquivalent =
              typeof plan.price.annual === "number"
                ? Math.round(plan.price.annual / 12)
                : null;
            const amountsDiffer =
              monthlyAmount !== null &&
              annualMonthlyEquivalent !== null &&
              monthlyAmount !== annualMonthlyEquivalent;
            const shouldAnimateAmount = amountsDiffer;
            
            if (typeof plan.price[billingPeriod] === "number") {
              if (billingPeriod === "annual" && typeof plan.price.annual === "number" && plan.price.annual > 0) {
                // Show monthly equivalent for annual billing (annual total / 12 months)
                displayPrice = annualMonthlyEquivalent ?? plan.price.annual;
                displayLabel = "agent/month (billed annually)";
              } else {
                displayPrice = plan.price[billingPeriod];
              }
            } else {
              displayPrice = plan.price[billingPeriod];
            }

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col h-full ${
                  plan.featured
                    ? "border-purple-500/50 bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 shadow-lg shadow-purple-500/20"
                    : "border-zinc-800/60 bg-zinc-900/55 hover:border-zinc-700"
                }`}
                role="article"
                aria-labelledby={`${plan.id}-name`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {plan.featured && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
                )}

                <CardHeader className="p-6 sm:p-7">
                  <div className="flex items-start justify-between mb-4">
                    <Badge variant={plan.tagVariant} className="text-xs">
                      {plan.tag}
                    </Badge>
                    {plan.featured && (
                      <div className="flex items-center gap-1 text-xs text-green-400">
                        <Sparkles className="h-3 w-3" />
                        <span>Save 17%</span>
                      </div>
                    )}
                  </div>

                  <h3 id={`${plan.id}-name`} className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>

                  <div className="mb-4 relative h-16 overflow-hidden">
                    {typeof displayPrice === "number" ? (
                      <div
                        key={`${plan.id}-${billingPeriod}`}
                        className="flex items-end gap-2 h-full"
                      >
                        <span className="text-2xl sm:text-3xl font-semibold text-zinc-400 leading-none">
                          $
                        </span>
                        <span
                          className={`text-4xl sm:text-5xl font-extrabold text-white inline-block leading-none ${
                            shouldAnimateAmount ? "animate-price-flip" : ""
                          }`}
                        >
                          {displayPrice}
                        </span>
                        {displayLabel && (
                          <span className="text-sm text-zinc-400">
                            /{displayLabel}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div 
                        key={`${plan.id}-${billingPeriod}`}
                        className={`text-4xl sm:text-5xl font-extrabold text-white inline-block ${
                          shouldAnimateAmount ? "animate-price-flip" : ""
                        }`}
                      >
                        {displayPrice}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-zinc-400 leading-relaxed">{plan.desc}</p>
                </CardHeader>

                <CardContent className="px-6 sm:px-7 pb-6 flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.disclaimer && (
                    <p className="text-xs text-zinc-500 mt-4">{plan.disclaimer}</p>
                  )}
                </CardContent>

                <CardFooter className="p-6 sm:p-7 pt-0 mt-auto">
                  <Button
                    asChild
                    className={`w-full ${
                      plan.cta.ghost
                        ? "bg-transparent border border-zinc-700 text-white hover:bg-white/10"
                        : plan.featured
                        ? "bg-white text-black hover:bg-zinc-200"
                        : "bg-zinc-800 text-white hover:bg-zinc-700"
                    }`}
                  >
                    <Link href={plan.cta.href} aria-label={`${plan.cta.label} for ${plan.name} plan`}>
                      {plan.cta.label}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Footnotes */}
        <div className="text-center space-y-2 mb-12">
          <p className="text-xs text-zinc-500">Prices shown in USD. Tax may apply.</p>
          <p className="text-xs text-zinc-500">Annual plan billed upfront (2 months free equivalent).</p>
          <p className="text-xs text-zinc-500">HIPAA support requires signed BAA on Pro/Enterprise.</p>
        </div>

        {/* CTA Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 backdrop-blur-xl p-8 sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          
          <div className="relative text-center">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3 tracking-tight">
              Ready to unify every conversation?
            </h3>
            <p className="text-base sm:text-lg text-zinc-400 mb-8 max-w-2xl mx-auto">
              No credit card needed – start in 5 minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-white text-black hover:bg-zinc-200 px-8 h-12 text-base font-semibold" asChild>
                <Link href="#signup">
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-zinc-700 bg-transparent text-white hover:bg-white/10 px-8 h-12 text-base font-semibold"
                asChild
              >
                <Link href="#demo">
                  <Calendar className="mr-2 h-4 w-4" />
                  Book a demo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes price-flip {
          0% {
            transform: translateY(-100%) rotateX(90deg);
            opacity: 0;
          }
          50% {
            transform: translateY(20%) rotateX(-10deg);
          }
          100% {
            transform: translateY(0) rotateX(0deg);
            opacity: 1;
          }
        }

        .animate-price-flip {
          animation: price-flip 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </section>
  );
}
