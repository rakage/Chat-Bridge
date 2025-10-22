"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users2,
  Loader2,
  ChevronDown,
  Search,
  Plus,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { CompanyModal } from "@/components/company/CompanyModal";

interface Company {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

export default function CompanySetupPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Authentication check - redirect if not logged in
  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (status === "unauthenticated") {
      // User is not logged in, redirect to login
      router.push("/auth/login");
      return;
    }

    if (session?.user?.companyId) {
      // User already has a company, redirect to dashboard
      router.push("/dashboard");
      return;
    }
  }, [status, session, router]);

  // Search for companies with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(
          `/api/companies/search?q=${encodeURIComponent(searchQuery)}`
        );

        if (!response.ok) {
          throw new Error("Failed to search companies");
        }

        const data = await response.json();
        setSearchResults(data.companies || []);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // Debounce delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Show loading while checking authentication or redirecting
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while redirecting unauthenticated users
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading while redirecting users who already have a company
  if (session?.user?.companyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600" />
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/companies/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: companyName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create company");
      }

      const result = await response.json();

      // Update the session to include the new company
      await update();

      console.log("✅ Company created successfully:", result.company);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create company:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create company"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrJoinCompany = () => {
    setShowDropdown(false);
    setShowCompanyModal(true);
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await signOut({ callbackUrl: "/" });
  };

  const handleUserSettings = () => {
    setShowUserMenu(false);
    // Navigate to user settings page when it exists
    // router.push("/settings/profile");
    console.log("Navigate to user settings");
  };

  return (
    <div
      className="min-h-screen bg-white relative"
      style={{
        backgroundImage: `radial-gradient(circle, #EAEAEA 2px, transparent 2px)`,
        backgroundSize: "18px 18px",
      }}
    >
      {/* Topbar */}
      <header className="h-14 border-b border-gray-200 bg-white relative">
        <div className="max-w-4xl mx-auto px-7 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm"></div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                <span>Select company</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
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
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search companies..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-10 border border-gray-200"
                          style={{
                            borderRadius: "8px",
                            fontFamily:
                              'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                            fontSize: "14px",
                          }}
                        />
                      </div>

                      {/* Search Results */}
                      {isSearching && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">Searching...</span>
                        </div>
                      )}

                      {!isSearching && searchQuery.length >= 2 && searchResults.length > 0 && (
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {searchResults.map((company) => (
                            <button
                              key={company.id}
                              onClick={() => {
                                setShowDropdown(false);
                                setShowCompanyModal(true);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md transition-colors"
                            >
                              <div className="font-medium text-sm text-gray-900">
                                {company.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {company.memberCount} {company.memberCount === 1 ? 'member' : 'members'}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                        <div className="text-sm text-gray-500 py-2">
                          No companies found matching &quot;{searchQuery}&quot;
                        </div>
                      )}

                      {/* Create or Join Button */}
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
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <span className="text-white text-xs font-medium">
                  {session?.user?.name?.charAt(0) ||
                    session?.user?.email?.charAt(0) ||
                    "U"}
                </span>
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
                        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {session?.user?.name?.charAt(0) ||
                              session?.user?.email?.charAt(0) ||
                              "U"}
                          </span>
                        </div>
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
        </div>
      </header>

      {/* Main content */}
      <main
        className="flex items-center justify-center px-7"
        style={{ minHeight: "calc(100vh - 56px)" }}
      >
        <div className="w-full max-w-2xl">
          <div
            className="bg-white p-10 w-full max-w-xl mx-auto"
            style={{
              borderRadius: "16px",
              boxShadow: "0 8px 28px rgba(0,0,0,0.06)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-7">
              <div
                className="w-14 h-14 bg-gray-100 flex items-center justify-center"
                style={{ borderRadius: "50%" }}
              >
                <Users2 className="w-6 h-6 text-black" />
              </div>
              <div>
                <h2
                  className="text-xl font-semibold text-black"
                  style={{
                    fontFamily:
                      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    letterSpacing: "-0.2px",
                  }}
                >
                  Create company
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  This is your company&apos;s visible name within the dashboard.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateCompany} className="space-y-5">
              <div>
                <Label
                  htmlFor="companyName"
                  className="block text-sm font-medium text-gray-600 mb-2"
                  style={{
                    fontFamily:
                      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                  }}
                >
                  Company name
                </Label>
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Name of your company"
                  disabled={isLoading}
                  maxLength={60}
                  className="w-full h-12 px-4 border border-gray-200 text-base"
                  style={{
                    borderRadius: "12px",
                    fontFamily:
                      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    fontSize: "16px",
                  }}
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isLoading || !companyName.trim()}
                  className="h-12 px-6 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500"
                  style={{
                    borderRadius: "12px",
                    fontFamily:
                      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    fontSize: "16px",
                    fontWeight: "500",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Company Modal */}
      <CompanyModal
        open={showCompanyModal}
        onOpenChange={setShowCompanyModal}
        onSuccess={() => {
          router.push("/dashboard");
        }}
      />
    </div>
  );
}
