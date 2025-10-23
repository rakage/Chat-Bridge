"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ProfilePicture } from "@/components/ProfilePicture";
import { DeleteSocialConfirmDialog } from "@/components/DeleteSocialConfirmDialog";
import { AlertCircle, CheckCircle, ArrowLeft, Trash2, Plus, Bot } from "lucide-react";

export default function FacebookManagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [pageConnections, setPageConnections] = useState<any[]>([]);
  const [disconnectingPages, setDisconnectingPages] = useState<Set<string>>(new Set());
  const [togglingAutoBot, setTogglingAutoBot] = useState<Set<string>>(new Set());
  const [hasLLMConfig, setHasLLMConfig] = useState(false);
  
  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<{ pageId: string; pageName: string } | null>(null);

  useEffect(() => {
    loadPageConnections();
    checkLLMConfig();
    
    // Handle OAuth callback success/error messages
    const urlParams = new URLSearchParams(window.location.search);
    const facebookSuccess = urlParams.get("facebook_success");
    const messageParam = urlParams.get("message");
    const errorParam = urlParams.get("error");

    if (facebookSuccess === "true" && messageParam) {
      setSuccess(decodeURIComponent(messageParam));
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadPageConnections = async () => {
    try {
      const response = await fetch("/api/settings/page");
      if (response.ok) {
        const data = await response.json();
        setPageConnections(data.pageConnections || []);
      }
    } catch (error) {
      console.error("Failed to load page connections:", error);
      setError("Failed to load connected pages");
    } finally {
      setLoading(false);
    }
  };

  const checkLLMConfig = async () => {
    try {
      const response = await fetch('/api/settings/provider');
      if (response.ok) {
        const data = await response.json();
        setHasLLMConfig(data.config?.hasApiKey || false);
      }
    } catch (error) {
      console.error('Error checking LLM config:', error);
      setHasLLMConfig(false);
    }
  };

  const openDeleteDialog = (pageId: string, pageName: string) => {
    setPageToDelete({ pageId, pageName });
    setDeleteDialogOpen(true);
  };

  const handleAutoBotToggle = async (pageId: string, currentAutoBot: boolean) => {
    if (!hasLLMConfig && !currentAutoBot) {
      setError('LLM Configuration Required: Please configure your LLM provider in Bot Settings before enabling auto-response.');
      return;
    }

    setTogglingAutoBot(prev => {
      const newSet = new Set(prev);
      newSet.add(pageId);
      return newSet;
    });

    try {
      const response = await fetch(`/api/settings/page/${pageId}/autobot`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ autoBot: !currentAutoBot }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to toggle auto-bot");
        return;
      }

      const data = await response.json();
      setSuccess(data.message);
      
      // Update local state
      setPageConnections(prev => 
        prev.map(page => 
          page.pageId === pageId 
            ? { ...page, autoBot: !currentAutoBot }
            : page
        )
      );
    } catch (error) {
      setError("Failed to toggle auto-bot");
      console.error("Auto-bot toggle error:", error);
    } finally {
      setTogglingAutoBot(prev => {
        const newSet = new Set(prev);
        newSet.delete(pageId);
        return newSet;
      });
    }
  };

  const handleDisconnectPage = async () => {
    if (!pageToDelete) return;

    const { pageId, pageName } = pageToDelete;

    setDisconnectingPages(prev => {
      const newSet = new Set(prev);
      newSet.add(pageId);
      return newSet;
    });
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/settings/page/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to disconnect page");
        return;
      }

      setSuccess(`${pageName} disconnected successfully!`);
      setDeleteDialogOpen(false);
      setPageToDelete(null);
      loadPageConnections();
    } catch (error) {
      setError("Failed to disconnect page");
      console.error("Disconnect error:", error);
    } finally {
      setDisconnectingPages(prev => {
        const newSet = new Set(prev);
        newSet.delete(pageId);
        return newSet;
      });
    }
  };

  // Auto-dismiss messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <DeleteSocialConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDisconnectPage}
        platform="Facebook"
        connectionName={pageToDelete?.pageName || ""}
        isDeleting={pageToDelete ? disconnectingPages.has(pageToDelete.pageId) : false}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/integrations">
              <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Facebook Pages</h1>
            <p className="text-gray-600 mt-1">
              Manage your connected Facebook Pages
            </p>
          </div>
        </div>
        <Link href="/dashboard/integrations/facebook/setup">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Page
          </Button>
        </Link>
      </div>

      {success && (
        <div className="flex items-center p-4 text-green-700 bg-green-100 rounded-lg">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center p-4 text-red-700 bg-red-100 rounded-lg">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {pageConnections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageConnections.map((page) => (
            <Card key={page.id} className="relative hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <ProfilePicture 
                      src={page.profilePictureUrl}
                      alt={`${page.pageName} profile`}
                      platform="facebook"
                      size="md"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-lg">
                      {page.pageName}
                    </h3>
                    <div className="flex items-center mt-2 space-x-2 flex-wrap gap-1">
                      <Badge 
                        variant={page.webhookConnected ? "default" : "destructive"}
                        className={`text-xs ${
                          page.webhookConnected 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {page.webhookConnected ? '● Active' : '● Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Auto-Bot Toggle */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4 text-gray-600" />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${!hasLLMConfig ? 'text-gray-400' : 'text-gray-900'}`}>AI Auto-Response</p>
                        {!hasLLMConfig ? (
                          <p className="text-xs text-orange-600">
                            ⚠️ Configure LLM settings first in{' '}
                            <Link href="/dashboard/llm-config" className="underline font-medium">
                              Bot Settings
                            </Link>
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            {page.autoBot ? 'Bot responds automatically' : 'Manual agent required'}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={page.autoBot || false}
                      onCheckedChange={() => handleAutoBotToggle(page.pageId, page.autoBot)}
                      disabled={togglingAutoBot.has(page.pageId) || !hasLLMConfig}
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openDeleteDialog(page.pageId, page.pageName)}
                    disabled={disconnectingPages.has(page.pageId)}
                    className="w-full"
                  >
                    {disconnectingPages.has(page.pageId) ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.627 0-12 4.975-12 11.111 0 3.497 1.745 6.616 4.472 8.652v4.237l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111 0-6.136-5.373-11.111-12-11.111zm1.193 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No Facebook Pages Connected
            </h3>
            <p className="text-gray-500 mb-6">
              Connect your Facebook Pages to start managing conversations
            </p>
            <Link href="/dashboard/integrations/facebook/setup">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Connect Page
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
}
