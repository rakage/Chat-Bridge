"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Copy, ExternalLink, Globe } from "lucide-react";

interface WebhookStatus {
  webhookVerifyToken: boolean;
  facebookAppSecret: boolean;
  facebookAppId: boolean;
  nextAuthUrl: boolean;
  webhookUrl: string | null;
  isComplete: boolean;
  recommendations: string[];
}

export function WebhookSetupGuide() {
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    checkWebhookStatus();
  }, []);

  const checkWebhookStatus = async () => {
    try {
      const response = await fetch("/api/webhook/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setShowGuide(!data.isComplete);
      }
    } catch (error) {
      console.error("Failed to check webhook status:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status || status.isComplete) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-800">
              Webhook is properly configured. Your pages can receive messages automatically.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <span>Webhook Setup Required</span>
        </CardTitle>
        <p className="text-sm text-orange-700">
          To receive Facebook messages automatically, you need to configure the webhook.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Checklist */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Configuration Status:</h4>
          <div className="space-y-1">
            <StatusItem 
              label="Facebook App ID" 
              status={status.facebookAppId} 
            />
            <StatusItem 
              label="Facebook App Secret" 
              status={status.facebookAppSecret} 
            />
            <StatusItem 
              label="Webhook Verify Token" 
              status={status.webhookVerifyToken} 
            />
            <StatusItem 
              label="Application URL" 
              status={status.nextAuthUrl} 
            />
          </div>
        </div>

        {/* Webhook URL */}
        {status.webhookUrl && (
          <div className="bg-white p-3 rounded-lg border">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Webhook URL:
            </label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 text-sm bg-gray-100 px-2 py-1 rounded">
                {status.webhookUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(status.webhookUrl!)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        {showGuide && (
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(!showGuide)}
            >
              {showGuide ? "Hide" : "Show"} Setup Guide
            </Button>
            
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-2">Quick Setup Guide:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>
                  <strong>Add Environment Variables:</strong>
                  <div className="mt-1 ml-4">
                    {status.recommendations.map((rec, index) => (
                      <div key={index} className="text-xs text-gray-600">
                        • {rec}
                      </div>
                    ))}
                  </div>
                </li>
                
                <li>
                  <strong>Configure Facebook Webhook:</strong>
                  <div className="mt-1 ml-4 space-y-1">
                    <div className="text-xs text-gray-600">
                      • Go to <a 
                        href="https://developers.facebook.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center"
                      >
                        Facebook Developers <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                    <div className="text-xs text-gray-600">
                      • Select your app → Webhooks → Create Page Subscription
                    </div>
                    <div className="text-xs text-gray-600">
                      • Use the webhook URL above
                    </div>
                    <div className="text-xs text-gray-600">
                      • Subscribe to: messages, messaging_postbacks, message_deliveries, message_reads
                    </div>
                  </div>
                </li>

                <li>
                  <strong>For Local Development:</strong>
                  <div className="mt-1 ml-4 space-y-1">
                    <div className="text-xs text-gray-600">
                      • Use <a 
                        href="https://ngrok.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center"
                      >
                        ngrok <ExternalLink className="h-3 w-3 ml-1" />
                      </a> to expose your local server
                    </div>
                    <div className="text-xs text-gray-600">
                      • Run: <code className="bg-gray-100 px-1 rounded">ngrok http 3000</code>
                    </div>
                    <div className="text-xs text-gray-600">
                      • Use the HTTPS URL from ngrok
                    </div>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusItem({ label, status }: { label: string; status: boolean }) {
  return (
    <div className="flex items-center space-x-2">
      {status ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-orange-600" />
      )}
      <span className="text-sm">
        {label}
      </span>
      <Badge variant={status ? "default" : "secondary"}>
        {status ? "✓" : "Missing"}
      </Badge>
    </div>
  );
}
