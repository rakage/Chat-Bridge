"use client";

import { Card } from "@/components/ui/card";
import { MessageSquare, GitBranch, BarChart3 } from "lucide-react";

const valueProps = [
  {
    icon: MessageSquare,
    title: "Truly omnichannel",
    description: "WhatsApp, IG, FB, Web, and Email in one inbox.",
  },
  {
    icon: GitBranch,
    title: "Automation + handoff",
    description: "Route with rules, escalate to agents, track SLAs.",
  },
  {
    icon: BarChart3,
    title: "Analytics that matter",
    description: "CSAT, resolution time, deflection, revenue impact.",
  },
];

export function ValuePropositions() {
  return (
    <section className="relative py-24 bg-[#0A0A0A]">
      <div className="relative z-10 mx-auto max-w-[1200px] px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Built for modern support teams
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Everything you need to deliver exceptional customer experiences at scale
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {valueProps.map((prop, idx) => {
            const Icon = prop.icon;
            return (
              <Card
                key={idx}
                className="relative p-8 bg-gradient-to-br from-white/5 to-white/[0.02] border-zinc-800 hover:border-zinc-700 transition-all group hover:shadow-2xl hover:shadow-white/5"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                <div className="relative">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/10 mb-6 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{prop.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{prop.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
