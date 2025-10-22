"use client";

import { useState, useEffect } from "react";
import { Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { InstagramIcon } from "@/components/ui/instagram-icon";
import { FacebookMessengerIcon } from "@/components/ui/facebook-icon";
import { TelegramIcon } from "@/components/ui/telegram-icon";

const integrations = [
  { id: "wa", icon: WhatsAppIcon, label: "WhatsApp", customIcon: true },
  { id: "ig", icon: InstagramIcon, label: "Instagram", customIcon: true },
  { id: "fb", icon: FacebookMessengerIcon, label: "Facebook Messenger", customIcon: true },
  { id: "tg", icon: TelegramIcon, label: "Telegram", customIcon: true },
  { id: "web", icon: Monitor, label: "Web Chat", customIcon: false },
];

const marqueeItems = [...integrations, ...integrations];

export function IntegrationsSection() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section
      id="integrations"
      className="relative py-12 sm:py-16 lg:py-20 overflow-hidden"
      role="region"
      aria-label="Supported chat channels and integrations"
    >
      {/* Animated Gradient Orbs */}
      <div className="absolute top-1/2 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl opacity-[0.08] animate-pulse" />
      <div className="absolute top-1/2 right-20 w-96 h-96 bg-white/3 rounded-full blur-3xl opacity-[0.08] animate-pulse" style={{ animationDelay: '1.5s' }} />

      <div className="relative z-10 mx-auto max-w-full px-4">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <Badge
            variant="outline"
            className="mb-4 border-zinc-800 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-widest text-zinc-400"
          >
            Integrations
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight" id="integrations-heading">
            Connect All Your Communication Channels
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
            All your customer conversations in one place.
          </p>
        </div>

        {/* Futuristic Marquee Container */}
        <div className="relative py-8 overflow-hidden">
          {/* Glow line on top - full width */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          {/* Gradient Overlays for fade effect */}
          <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent z-10 pointer-events-none" />

          {/* Marquee Track - duplicated for seamless loop */}
          <div
            className="marquee-wrapper overflow-hidden"
            role="list"
            aria-label="Connected chat channels"
          >
            {!isMounted && (
              <div className="flex items-center justify-center gap-8 py-4">
                {integrations.map((integration) => (
                  <div key={integration.id} className="flex flex-col items-center gap-3 px-6 py-4 opacity-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/50" />
                    <span className="text-xs font-medium text-zinc-500 whitespace-nowrap">
                      {integration.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {isMounted && (
              <div className="marquee-container">
                {Array.from({ length: 2 }).map((_, loopIndex) => (
                  <div
                    key={`loop-${loopIndex}`}
                    className="marquee-content"
                    aria-hidden={loopIndex === 1}
                  >
                    {marqueeItems.map((integration, itemIndex) => {
                      const IconComponent = integration.icon;
                      const isPrimaryItem = loopIndex === 0 && itemIndex < integrations.length;
                      return (
                        <div
                          key={`${integration.id}-${loopIndex}-${itemIndex}`}
                          className="integration-icon flex-shrink-0 group"
                          role={isPrimaryItem ? "listitem" : undefined}
                          aria-label={isPrimaryItem ? integration.label : undefined}
                        >
                          <div className="relative flex flex-col items-center gap-3 px-6 py-4">
                            {/* Icon Container */}
                            <div className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 border border-zinc-700/50 backdrop-blur-sm transition-all duration-500 group-hover:scale-110 group-hover:border-white/30 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                              {/* Inner glow effect */}
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/10 group-hover:to-white/5 transition-all duration-500" />
                              {integration.customIcon ? (
                                <IconComponent 
                                  size={32}
                                  className="relative text-zinc-400 group-hover:text-white transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                                />
                              ) : (
                                <IconComponent className="relative h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 group-hover:text-white transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                              )}
                            </div>

                            {/* Label */}
                            <span className="text-xs font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300 whitespace-nowrap">
                              {integration.label}
                            </span>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Glow line on bottom - full width */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>

      <style jsx>{`
        .marquee-container {
          display: flex;
          align-items: center;
          width: max-content;
          min-width: 100%;
          animation: marquee-scroll 20s linear infinite;
          will-change: transform;
        }

        .marquee-content {
          display: flex;
          align-items: center;
          gap: 2rem;
          padding-right: 2rem;
          flex: none;
        }

        @media (min-width: 640px) {
          .marquee-content {
            gap: 3rem;
            padding-right: 3rem;
          }
        }

        @keyframes marquee-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

      `}</style>
    </section>
  );
}
