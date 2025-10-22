"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Shield, Zap } from "lucide-react";
import { OmnichannelPreviewCard } from "./OmnichannelPreviewCard";
import { HeroNav } from "./HeroNav";

// Lazy load below-fold sections for better performance
const IntegrationsSection = dynamic(
  () =>
    import("./IntegrationsSection").then((mod) => ({
      default: mod.IntegrationsSection,
    })),
  {
    loading: () => (
      <div
        className="h-96 bg-zinc-900/20 animate-pulse"
        aria-label="Loading integrations section"
      />
    ),
  }
);

const FeaturesSection = dynamic(
  () =>
    import("./FeaturesSection").then((mod) => ({
      default: mod.FeaturesSection,
    })),
  {
    loading: () => (
      <div
        className="h-96 bg-zinc-900/20 animate-pulse"
        aria-label="Loading features section"
      />
    ),
  }
);

const PricingSection = dynamic(
  () =>
    import("./PricingSection").then((mod) => ({ default: mod.PricingSection })),
  {
    loading: () => (
      <div
        className="h-96 bg-zinc-900/20 animate-pulse"
        aria-label="Loading pricing section"
      />
    ),
  }
);

const trustLogos = ["Meta", "Shopify", "Stripe", "Slack"];

const socialProofStats = [
  { value: "1.2M+", label: "conversations/month" },
  { value: "24%", label: "CSAT uplift" },
  { value: "−38%", label: "first reply time" },
];

export function HeroSection() {
  return (
    <div className="relative">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        Skip to main content
      </a>

      {/* Shared Layered Background */}
      <div
        className="fixed inset-0 -z-10 bg-[#0A0A0A]"
        role="presentation"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* Navigation */}
      <HeroNav />

      <main id="main-content" role="main">
        <section
          className="relative min-h-screen overflow-hidden"
          aria-label="Hero section"
        >
          <div className="relative z-10 mx-auto max-w-[1200px] px-4 pt-20 pb-24 sm:pt-24 sm:pb-32 lg:pt-28 lg:pb-40">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
              {/* Left Column - Content */}
              <div className="max-w-2xl">
                <Badge
                  variant="outline"
                  className="mb-6 border-zinc-800 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-widest text-zinc-400"
                  role="text"
                >
                  Omnichannel Chatbot Platform
                </Badge>

                <h1 className="text-5xl font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-7xl tracking-tight">
                  Omnichannel chatbot to automate{" "}
                  <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    WhatsApp, Instagram, Facebook, Telegram & Web
                  </span>
                </h1>

                <p className="mt-6 text-base text-zinc-300 sm:text-lg leading-relaxed">
                  Unify customer support and sales in one AI-powered real-time
                  inbox with smart routing, seamless human handoff, and
                  comprehensive analytics. ChatBridge connects all your
                  channels.
                </p>

                <div
                  className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                  role="group"
                  aria-label="Primary call to action buttons"
                >
                  <Button
                    size="lg"
                    className="group bg-white text-black hover:bg-zinc-200 px-8 h-12 text-base font-semibold shadow-lg shadow-white/20"
                    asChild
                  >
                    <Link
                      href="/auth/register"
                      aria-label="Start your free 14-day trial of ChatBridge"
                    >
                      Start free trial
                      <ArrowRight
                        className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </Link>
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="group border-zinc-800 bg-white/5 hover:bg-white/10 text-white px-8 h-12 text-base font-semibold backdrop-blur"
                    asChild
                  >
                    <Link
                      href="#demo"
                      aria-label="Watch ChatBridge product demo video"
                    >
                      <Play
                        className="mr-2 h-4 w-4 transition-transform group-hover:scale-110"
                        aria-hidden="true"
                      />
                      Watch demo
                    </Link>
                  </Button>
                </div>

                <div
                  className="mt-8 flex flex-col gap-3 text-sm text-zinc-400"
                  role="list"
                  aria-label="Security and trial information"
                >
                  <div className="flex items-center gap-2" role="listitem">
                    <Shield
                      className="h-4 w-4 text-zinc-500"
                      aria-hidden="true"
                    />
                    <span>SOC2-ready • GDPR compliant</span>
                  </div>
                  <div className="flex items-center gap-2" role="listitem">
                    <Zap className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                    <span>No credit card needed • 14-day free trial</span>
                  </div>
                </div>

                {/* Trust Badges */}
                <aside
                  className="mt-12 pt-8 border-t border-zinc-800"
                  aria-label="Trusted by companies"
                >
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
                    Trusted by teams at
                  </p>
                  <div
                    className="flex flex-wrap items-center gap-8"
                    role="list"
                  >
                    {trustLogos.map((logo) => (
                      <div
                        key={logo}
                        className="text-zinc-600 font-semibold text-lg hover:text-zinc-400 transition-colors"
                        role="listitem"
                        aria-label={`${logo} logo`}
                      >
                        {logo}
                      </div>
                    ))}
                  </div>
                </aside>
              </div>

              {/* Right Column - Interactive Card */}
              <aside className="relative" aria-label="Live inbox preview">
                <div
                  className="absolute -inset-4 bg-gradient-to-r from-white/10 to-white/5 rounded-3xl blur-3xl opacity-20"
                  aria-hidden="true"
                />
                <OmnichannelPreviewCard />
              </aside>
            </div>

            {/* Social Proof Stats */}
            <aside
              className="mt-20 pt-12 border-t border-zinc-800"
              aria-label="Customer statistics and metrics"
            >
              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center"
                role="list"
              >
                {socialProofStats.map((stat, idx) => (
                  <div key={idx} className="space-y-2" role="listitem">
                    <div
                      className="text-4xl font-extrabold text-white tracking-tight"
                      aria-label={`${stat.value} ${stat.label}`}
                    >
                      {stat.value}
                    </div>
                    <div className="text-sm text-zinc-400 uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          {/* Animated Gradient Orbs */}
          <div
            className="absolute top-1/4 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-1/4 -right-32 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-pulse delay-1000"
            aria-hidden="true"
          />
        </section>

        {/* Integrations Section */}
        <IntegrationsSection />

        {/* Features Section */}
        <FeaturesSection />

        {/* Pricing Section */}
        <PricingSection />
      </main>
    </div>
  );
}
