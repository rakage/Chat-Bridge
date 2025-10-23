"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InstagramLoginButton } from "@/components/InstagramLoginButton";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function InstagramSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Handle OAuth callbacks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const instagramSuccess = urlParams.get("instagram_success");
    const instagramDataParam = urlParams.get("instagram_data");
    const errorParam = urlParams.get("error");

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    } else if (instagramSuccess === "true" && instagramDataParam) {
      (async () => {
        try {
          const data = JSON.parse(decodeURIComponent(instagramDataParam));
          
          // Clean URL
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
          
          // Save Instagram connection data to backend
          await saveInstagramConnection(data);
          
          // Redirect to manage page with success message
          router.push(`/dashboard/integrations/instagram/manage?instagram_success=true&message=${encodeURIComponent(`Successfully connected Instagram account @${data.userProfile.username}!`)}`);
        } catch (parseError) {
          console.error("Failed to parse Instagram data:", parseError);
          setError("Failed to process Instagram login data");
        }
      })();
    }
  }, [router]);

  const saveInstagramConnection = async (instagramData: any) => {
    try {
      const response = await fetch('/api/instagram/save-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userProfile: instagramData.userProfile,
          accessToken: instagramData.accessToken,
          userId: instagramData.userId,
          mediaCount: instagramData.mediaCount,
          conversationsCount: instagramData.conversationsCount,
          messagingEnabled: instagramData.messagingEnabled
        })
      });
      
      if (!response.ok) {
        console.error('Failed to save Instagram connection:', await response.text());
      }
    } catch (error) {
      console.error('Error saving Instagram connection:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Connect Instagram</h1>
          <p className="text-gray-600 mt-1">
            Connect your Instagram Business account to manage messages
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
          <CardTitle>Setup Instagram Integration</CardTitle>
          <CardDescription>
            Connect your Instagram Business account to receive and respond to messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">What you&apos;ll need:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Instagram Business or Creator account</li>
              <li>Account connected to a Facebook Page</li>
              <li>Permission to manage messages</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Only Instagram Business and Creator accounts that are connected to a Facebook Page can use messaging features.
            </p>
          </div>

          <div className="pt-4">
            <InstagramLoginButton
              onLoading={setLoading}
              disabled={loading}
              className="w-full"
            />
          </div>

          <p className="text-xs text-gray-500 text-center">
            By connecting, you authorize us to manage messages on your behalf
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
