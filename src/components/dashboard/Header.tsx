"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronDown,
  Plus,
  Settings,
  LogOut,
  Slash,
  RefreshCw,
} from "lucide-react";
import { CompanyModal } from "@/components/company/CompanyModal";

const getPageTitle = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  
  // Map of routes to titles
  const routeMap: Record<string, string> = {
    "conversations": "Conversations",
    "integrations": "Integrations",
    "llm-config": "LLM Config",
    "training": "LLM Training",
    "playground": "Playground",
    "chat-widget": "Chat Widget",
    "users": "Users",
    "company": "Company",
    "settings": "Settings",
    "bot-settings": "Bot Settings",
    "system-status": "System Status",
    "freshdesk": "Freshdesk",
  };

  // Build breadcrumb, skipping "dashboard" segment
  const breadcrumbs: string[] = [];
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    // Skip "dashboard" segment
    if (segment === "dashboard") continue;
    
    if (routeMap[segment]) {
      breadcrumbs.push(routeMap[segment]);
    }
  }

  // If we're exactly on /dashboard, show Overview
  if (pathname === "/dashboard") {
    return ["Overview"];
  }

  return breadcrumbs.length > 0 ? breadcrumbs : ["Overview"];
};

interface UserCompany {
  id: string;
  name: string;
  role: string;
  isCurrent: boolean;
}

export default function Header() {
  const { data: session, update } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [switchingCompany, setSwitchingCompany] = useState(false);

  const breadcrumbs = getPageTitle(pathname);

  // Fetch user's companies when dropdown opens
  const fetchUserCompanies = async () => {
    if (userCompanies.length > 0) return; // Already loaded
    
    setLoadingCompanies(true);
    try {
      const response = await fetch("/api/companies/list");
      if (response.ok) {
        const data = await response.json();
        setUserCompanies(data.companies || []);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSwitchCompany = async (companyId: string) => {
    setSwitchingCompany(true);
    
    // Optimistically update the UI
    setUserCompanies(prevCompanies =>
      prevCompanies.map(company => ({
        ...company,
        isCurrent: company.id === companyId,
      }))
    );
    
    try {
      const response = await fetch("/api/companies/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyId }),
      });

      if (response.ok) {
        // Update session
        await update();
        
        // Close the dropdown
        setShowDropdown(false);
        
        // Refresh the page data without full reload (keeps navbar/sidebar intact)
        router.refresh();
      } else {
        const error = await response.json();
        console.error("Failed to switch company:", error);
        alert(error.error || "Failed to switch company");
        
        // Revert optimistic update
        await fetchUserCompanies();
      }
    } catch (error) {
      console.error("Error switching company:", error);
      alert("Failed to switch company");
      
      // Revert optimistic update
      await fetchUserCompanies();
    } finally {
      setSwitchingCompany(false);
    }
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await signOut({ callbackUrl: "/" });
  };

  const handleUserSettings = () => {
    setShowUserMenu(false);
    console.log("Navigate to user settings");
  };

  const handleCreateOrJoinCompany = () => {
    setShowDropdown(false);
    setShowCompanyModal(true);
  };

  const companyName = session?.user?.companyName || "Select company";

  return (
    <header className="h-14 border-b border-gray-200 bg-white relative z-50 flex shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-2 sm:px-4 flex-1 min-w-0">
        <SidebarTrigger className="-ml-1 flex-shrink-0" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block" />
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <button
              onClick={() => {
                setShowDropdown(!showDropdown);
                if (!showDropdown) {
                  fetchUserCompanies();
                }
              }}
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              <span className="truncate max-w-[120px] sm:max-w-none">{companyName}</span>
              <ChevronDown
                className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 transition-transform duration-200 ${
                  showDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Card */}
            {showDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />

                {/* Dropdown */}
                <div
                  className="absolute top-8 left-0 bg-white border border-gray-200 shadow-lg z-20 w-80 p-4"
                  style={{
                    borderRadius: "12px",
                    boxShadow: "0 8px 28px rgba(0,0,0,0.06)",
                  }}
                >
                  <div className="space-y-4">
                    {/* Companies List */}
                    {loadingCompanies ? (
                      <div className="flex items-center justify-center py-4">
                        <RefreshCw className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                        <span className="text-sm text-gray-500">Loading companies...</span>
                      </div>
                    ) : userCompanies.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 px-2 mb-2">Your Companies</p>
                        {userCompanies.map((company) => (
                          <button
                            key={company.id}
                            onClick={() => {
                              if (!company.isCurrent && !switchingCompany) {
                                handleSwitchCompany(company.id);
                              }
                            }}
                            disabled={company.isCurrent || switchingCompany}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                              company.isCurrent
                                ? "bg-gray-50 cursor-default"
                                : "hover:bg-gray-50 cursor-pointer"
                            } ${switchingCompany ? "opacity-50" : ""}`}
                          >
                            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-medium">
                                {company.name.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {company.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {company.isCurrent ? "Current" : company.role}
                              </p>
                            </div>
                            {company.isCurrent && (
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : session?.user?.companyName && (
                      <div className="py-2">
                        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-medium">
                              {session.user.companyName.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {session.user.companyName}
                            </p>
                            <p className="text-xs text-gray-500">Current company</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Create or Join Button - Always show */}
                    <Button
                      onClick={handleCreateOrJoinCompany}
                      className="w-full h-10 bg-gray-100 text-gray-700 hover:bg-gray-200 border-0 justify-start"
                      style={{
                        borderRadius: "8px",
                        fontFamily:
                          'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create or join company
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          <Separator orientation="vertical" className="mx-2 h-4 hidden md:block" />
          <div className="hidden md:flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <Slash className="h-4 w-4 text-gray-400" />}
                <span className={index === breadcrumbs.length - 1 ? "font-medium text-gray-900" : "text-gray-500"}>
                  {crumb}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} />
                <AvatarFallback className="bg-black text-white text-xs">
                  {session?.user?.name?.charAt(0) ||
                    session?.user?.email?.charAt(0) ||
                    "U"}
                </AvatarFallback>
              </Avatar>
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />

                {/* Dropdown */}
                <div
                  className="absolute top-10 right-0 bg-white border border-gray-200 shadow-lg z-20 w-56 py-2"
                  style={{
                    borderRadius: "12px",
                    boxShadow: "0 8px 28px rgba(0,0,0,0.06)",
                  }}
                >
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} />
                        <AvatarFallback className="bg-black text-white text-xs">
                          {session?.user?.name?.charAt(0) ||
                            session?.user?.email?.charAt(0) ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium text-gray-900 truncate"
                          style={{
                            fontFamily:
                              'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                          }}
                        >
                          {session?.user?.name || "User"}
                        </p>
                        <p
                          className="text-xs text-gray-500 truncate"
                          style={{
                            fontFamily:
                              'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                          }}
                        >
                          {session?.user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={handleUserSettings}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      style={{
                        fontFamily:
                          'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                      }}
                    >
                      <Settings className="w-4 h-4" />
                      User Settings
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      style={{
                        fontFamily:
                          'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
      </div>

      {/* Company Modal */}
      <CompanyModal
        open={showCompanyModal}
        onOpenChange={setShowCompanyModal}
        onSuccess={() => {
          // Reset companies list to reload it next time dropdown opens
          setUserCompanies([]);
        }}
      />
    </header>
  );
}
