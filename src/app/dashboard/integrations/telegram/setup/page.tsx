"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TelegramConnectModal } from "@/components/TelegramConnectModal";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TelegramSetupPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSuccess = () => {
    setShowModal(false);
    setSuccess("Telegram bot connected successfully!");
    setTimeout(() => {
      router.push("/dashboard/integrations/telegram/manage");
    }, 2000);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/integrations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Connect Telegram Bot</h1>
          <p className="text-gray-600 mt-1">
            Connect your Telegram bot to manage conversations
          </p>
        </div>
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

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Setup Telegram Integration</CardTitle>
          <CardDescription>
            Connect your Telegram bot to receive and respond to messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold">How to create a Telegram Bot:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Open Telegram and search for <strong>@BotFather</strong></li>
              <li>Send the command <code className="px-1 py-0.5 bg-gray-100 rounded">/newbot</code></li>
              <li>Follow the instructions to set your bot name and username</li>
              <li>Copy the bot token provided by BotFather</li>
              <li>Click the button below and paste your bot token</li>
            </ol>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Important:</strong> Keep your bot token secure. Never share it publicly or commit it to version control.
            </p>
          </div>

          <div className="pt-4">
            <Button onClick={() => setShowModal(true)} className="w-full">
              Connect Telegram Bot
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            By connecting, you authorize us to manage messages on your behalf
          </p>
        </CardContent>
      </Card>

      <TelegramConnectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
