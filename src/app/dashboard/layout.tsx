"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import Header from "@/components/dashboard/Header";
import CompanyRequired from "@/components/auth/CompanyRequired";
import { Toaster } from "@/components/ui/toaster";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <CompanyRequired>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main 
            className="flex-1 overflow-x-hidden overflow-y-auto bg-white p-0"
            style={{
              backgroundImage: `radial-gradient(circle, #EAEAEA 2px, transparent 2px)`,
              backgroundSize: "18px 18px",
            }}
          >
            <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </CompanyRequired>
  );
}
