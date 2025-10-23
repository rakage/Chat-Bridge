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

export default function InstagramManagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [instagramConnections, setInstagramConnections] = useState<any[]>([]);
  const [disconnecting, setDisconnecting] = useState<Set<string>>(new Set());
  const [togglingAutoBot, setTogglingAutoBot] = useState<Set<string>>(new Set());
  const [hasLLMConfig, setHasLLMConfig] = useState(false);
  
  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{ instagramUserId: string; username: string } | null>(null);

  useEffect(() => {
    loadConnections();
    checkLLMConfig();
    
    // Handle OAuth callback success/error messages
    const urlParams = new URLSearchParams(window.location.search);
    const instagramSuccess = urlParams.get("instagram_success");
    const messageParam = urlParams.get("message");
    const errorParam = urlParams.get("error");

    if (instagramSuccess === "true" && messageParam) {
      setSuccess(decodeURIComponent(messageParam));
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/instagram/connections');
      if (response.ok) {
        const data = await response.json();
        setInstagramConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Failed to load Instagram connections:', error);
      setError("Failed to load connected accounts");
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

  const openDeleteDialog = (instagramUserId: string, username: string) => {
    setAccountToDelete({ instagramUserId, username });
    setDeleteDialogOpen(true);
  };

  const handleAutoBotToggle = async (connectionId: string, currentAutoBot: boolean) => {
    if (!hasLLMConfig && !currentAutoBot) {
      setError('LLM Configuration Required: Please configure your LLM provider in Bot Settings before enabling auto-response.');
      return;
    }

    setTogglingAutoBot(prev => {
      const newSet = new Set(prev);
      newSet.add(connectionId);
      return newSet;
    });

    try {
      const response = await fetch(`/api/instagram/connections/${connectionId}/autobot`, {
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
      setInstagramConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, autoBot: !currentAutoBot }
            : conn
        )
      );
    } catch (error) {
      setError("Failed to toggle auto-bot");
      console.error("Auto-bot toggle error:", error);
    } finally {
      setTogglingAutoBot(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const handleDisconnect = async () => {
    if (!accountToDelete) return;

    const { instagramUserId, username } = accountToDelete;

    setDisconnecting(prev => {
      const newSet = new Set(prev);
      newSet.add(instagramUserId);
      return newSet;
    });
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/instagram/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instagramUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to disconnect Instagram account");
        return;
      }

      setSuccess(`@${username} disconnected successfully!`);
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      loadConnections();
    } catch (error) {
      setError("Failed to disconnect Instagram account");
      console.error("Disconnect error:", error);
    } finally {
      setDisconnecting(prev => {
        const newSet = new Set(prev);
        newSet.delete(instagramUserId);
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
      <>
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
      </>
    );
  }

  return (
    <>
      <DeleteSocialConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDisconnect}
        platform="Instagram"
        connectionName={accountToDelete ? `@${accountToDelete.username}` : ""}
        isDeleting={accountToDelete ? disconnecting.has(accountToDelete.instagramUserId) : false}
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
            <h1 className="text-3xl font-bold text-gray-900">Instagram Accounts</h1>
            <p className="text-gray-600 mt-1">
              Manage your connected Instagram accounts
            </p>
          </div>
        </div>
        <Link href="/dashboard/integrations/instagram/setup">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
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

      {instagramConnections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instagramConnections.map((connection) => (
            <Card key={connection.instagramUserId} className="relative hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <ProfilePicture 
                      src={connection.profilePictureUrl}
                      alt={`@${connection.username} profile`}
                      platform="instagram"
                      size="md"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-lg">
                      @{connection.username}
                    </h3>
                    {connection.displayName && (
                      <p className="text-sm text-gray-500 truncate">
                        {connection.displayName}
                      </p>
                    )}
                    <div className="flex items-center mt-2 space-x-2 flex-wrap gap-1">
                      <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-200">
                        ● Active
                      </Badge>
                      {connection.mediaCount > 0 && (
                        <span className="text-xs text-gray-500">
                          {connection.mediaCount} posts
                        </span>
                      )}
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
                            {connection.autoBot ? 'Bot responds automatically' : 'Manual agent required'}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={connection.autoBot || false}
                      onCheckedChange={() => handleAutoBotToggle(connection.id, connection.autoBot)}
                      disabled={togglingAutoBot.has(connection.id) || !hasLLMConfig}
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openDeleteDialog(connection.instagramUserId, connection.username)}
                    disabled={disconnecting.has(connection.instagramUserId)}
                    className="w-full"
                  >
                    {disconnecting.has(connection.instagramUserId) ? (
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
            <div className="w-16 h-16 bg-gradient-to-br from-pink-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No Instagram Accounts Connected
            </h3>
            <p className="text-gray-500 mb-6">
              Connect your Instagram Business account to start managing messages
            </p>
            <Link href="/dashboard/integrations/instagram/setup">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Connect Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
}
