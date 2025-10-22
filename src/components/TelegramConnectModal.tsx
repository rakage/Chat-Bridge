"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Send, ExternalLink } from "lucide-react";

interface TelegramConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TelegramConnectModal({
  isOpen,
  onClose,
  onSuccess,
}: TelegramConnectModalProps) {
  const [botToken, setBotToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/telegram/save-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ botToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect Telegram bot");
      }

      setSuccess(data.message);
      setBotToken("");

      // Call onSuccess callback after a short delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to connect Telegram bot");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setBotToken("");
    setError("");
    setSuccess("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Send className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle>Connect Telegram Bot</DialogTitle>
              <DialogDescription>
                Enter your bot token to connect
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-900">
              How to get your bot token:
            </p>
            <ol className="text-sm text-blue-700 space-y-1 ml-4 list-decimal">
              <li>Open Telegram and search for @BotFather</li>
              <li>Send /newbot to create a new bot (or use existing)</li>
              <li>Copy the bot token that looks like: 123456:ABC-DEF...</li>
            </ol>
            <a
              href="https://core.telegram.org/bots#6-botfather"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
            >
              Learn more about BotFather
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Bot Token Input */}
          <div className="space-y-2">
            <Label htmlFor="botToken">Bot Token</Label>
            <Input
              id="botToken"
              type="password"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              disabled={loading || !!success}
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Your bot token will be encrypted and stored securely
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !botToken || !!success}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Connect Bot
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
