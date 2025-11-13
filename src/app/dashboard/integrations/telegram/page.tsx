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

export default function TelegramManagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [telegramConnections, setTelegramConnections] = useState<any[]>([]);
  const [disconnecting, setDisconnecting] = useState<Set<string>>(new Set());
  const [togglingAutoBot, setTogglingAutoBot] = useState<Set<string>>(new Set());
  const [hasLLMConfig, setHasLLMConfig] = useState(false);
  
  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<{ botId: string; botUsername: string } | null>(null);

  useEffect(() => {
    loadConnections();
    checkLLMConfig();
    
    // Handle success/error messages from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const telegramSuccess = urlParams.get("telegram_success");
    const messageParam = urlParams.get("message");
    const errorParam = urlParams.get("error");

    if (telegramSuccess === "true" && messageParam) {
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
      const response = await fetch('/api/telegram/connections');
      if (response.ok) {
        const data = await response.json();
        setTelegramConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Failed to load Telegram connections:', error);
      setError("Failed to load connected bots");
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

  const openDeleteDialog = (botId: string, botUsername: string) => {
    setBotToDelete({ botId, botUsername });
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
      const response = await fetch(`/api/telegram/connections/${connectionId}/autobot`, {
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
      setTelegramConnections(prev => 
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
    if (!botToDelete) return;

    const { botId, botUsername } = botToDelete;

    setDisconnecting(prev => {
      const newSet = new Set(prev);
      newSet.add(botId);
      return newSet;
    });
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/telegram/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ botId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to disconnect Telegram bot");
        return;
      }

      setSuccess(`@${botUsername} disconnected successfully!`);
      setDeleteDialogOpen(false);
      setBotToDelete(null);
      loadConnections();
    } catch (error) {
      setError("Failed to disconnect Telegram bot");
      console.error("Disconnect error:", error);
    } finally {
      setDisconnecting(prev => {
        const newSet = new Set(prev);
        newSet.delete(botId);
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
        platform="Telegram"
        connectionName={botToDelete ? `@${botToDelete.botUsername}` : ""}
        isDeleting={botToDelete ? disconnecting.has(botToDelete.botId) : false}
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
            <h1 className="text-3xl font-bold text-gray-900">Telegram Bots</h1>
            <p className="text-gray-600 mt-1">
              Manage your connected Telegram bots
            </p>
          </div>
        </div>
        <Link href="/dashboard/integrations/telegram/setup">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Bot
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

      {telegramConnections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {telegramConnections.map((connection) => (
            <Card key={connection.botId} className="relative hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <ProfilePicture 
                      src={connection.profilePictureUrl}
                      alt={`@${connection.botUsername} profile`}
                      platform="telegram"
                      size="md"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-lg">
                      {connection.botName}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      @{connection.botUsername}
                    </p>
                    <div className="flex items-center mt-2 space-x-2">
                      <Badge 
                        variant={connection.webhookSet ? "default" : "destructive"}
                        className={`text-xs ${
                          connection.webhookSet 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {connection.webhookSet ? '● Active' : '● Inactive'}
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
                    onClick={() => openDeleteDialog(connection.botId, connection.botUsername)}
                    disabled={disconnecting.has(connection.botId)}
                    className="w-full"
                  >
                    {disconnecting.has(connection.botId) ? (
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
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.384,22.779c0.322,0.228 0.737,0.285 1.107,0.145c0.37,-0.141 0.642,-0.457 0.724,-0.84c0.869,-4.084 2.977,-14.421 3.768,-18.136c0.06,-0.28 -0.04,-0.571 -0.26,-0.758c-0.22,-0.187 -0.525,-0.241 -0.797,-0.14c-4.193,1.552 -17.106,6.397 -22.384,8.35c-0.335,0.124 -0.553,0.446 -0.542,0.799c0.012,0.354 0.25,0.661 0.593,0.764c2.367,0.708 5.474,1.693 5.474,1.693c0,0 1.452,4.385 2.209,6.615c0.095,0.28 0.314,0.5 0.603,0.576c0.288,0.075 0.596,-0.004 0.811,-0.207c1.216,-1.148 3.096,-2.923 3.096,-2.923c0,0 3.572,2.619 5.598,4.062Zm-11.01,-8.677l1.679,5.538l0.373,-3.507c0,0 6.487,-5.851 10.185,-9.186c0.108,-0.098 0.123,-0.262 0.033,-0.377c-0.089,-0.115 -0.253,-0.142 -0.376,-0.064c-4.286,2.737 -11.894,7.596 -11.894,7.596Z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No Telegram Bots Connected
            </h3>
            <p className="text-gray-500 mb-6">
              Connect your Telegram bot to start managing conversations
            </p>
            <Link href="/dashboard/integrations/telegram/setup">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Connect Bot
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
}
