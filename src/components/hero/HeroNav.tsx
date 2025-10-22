"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

export function HeroNav() {
  const { data: session } = useSession();

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 border-b border-zinc-800/50 backdrop-blur-xl bg-[#0A0A0A]/80">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-black font-bold text-lg">
              C
            </div>
            <span className="text-xl font-extrabold text-white group-hover:text-zinc-300 transition-colors tracking-tight">
              ChatBridge
            </span>
          </Link>

          {/* Navigation Links - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="#demo" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Demo
            </Link>
            <Link href="#docs" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Docs
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {session?.user ? (
              <Button
                size="sm"
                className="bg-white text-black hover:bg-zinc-200 font-semibold"
                asChild
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-300 hover:text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-white text-black hover:bg-zinc-200 font-semibold"
                  asChild
                >
                  <Link href="/auth/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
