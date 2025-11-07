"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface CompanyRequiredProps {
  children: React.ReactNode;
}

export default function CompanyRequired({ children }: CompanyRequiredProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (status === "loading") return; // Still loading session

    if (!session?.user) {
      // Not authenticated, redirect to login
      router.push("/auth/login");
      return;
    }

    if (!session.user.companyId) {
      // User has no company, redirect to company setup
      router.push("/setup/company");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    // Mark as mounted after first successful render
    if (status !== "loading" && session?.user?.companyId) {
      hasMountedRef.current = true;
    }
  }, [status, session?.user?.companyId]);

  // Only show loading spinner on initial mount
  // After mounted, let child components handle loading states during company switch
  const shouldShowLoading = (status === "loading" || !session?.user || !session.user.companyId) && !hasMountedRef.current;

  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // User is authenticated and has a company, render children
  return <>{children}</>;
}