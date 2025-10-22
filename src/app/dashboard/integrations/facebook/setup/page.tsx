"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FacebookLoginButton } from "@/components/FacebookLoginButton";
import { FacebookPageSelector, FacebookPageData, FacebookUserProfile } from "@/components/FacebookPageSelector";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FacebookSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [facebookUserProfile, setFacebookUserProfile] = useState<FacebookUserProfile | null>(null);
  const [facebookPages, setFacebookPages] = useState<FacebookPageData[]>([]);

  // Handle OAuth callbacks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const facebookSuccess = urlParams.get("facebook_success");
    const pagesData = urlParams.get("pages_data");
    const errorParam = urlParams.get("error");

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    } else if (facebookSuccess === "true" && pagesData) {
      try {
        const data = JSON.parse(decodeURIComponent(pagesData));
        setFacebookUserProfile(data.userProfile);
        setFacebookPages(data.pages);
        setShowPageSelector(true);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      } catch (parseError) {
        console.error("Failed to parse Facebook pages data:", parseError);
        setError("Failed to process Facebook login data");
      }
    }
  }, []);

  const handleFacebookPagesSelected = async (selectedPages: FacebookPageData[]) => {
    try {
      const response = await fetch("/api/settings/page/connect-oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pages: selectedPages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to connect pages");
        return;
      }

      const result = await response.json();
      if (result.errors && result.errors.length > 0) {
        setError(`Connected ${result.connectedPages.length} pages, but ${result.errors.length} failed. Check console for details.`);
        console.error("Some pages failed to connect:", result.errors);
      } else {
        setSuccess(`Successfully connected ${result.connectedPages.length} Facebook page${result.connectedPages.length !== 1 ? 's' : ''}!`);
      }
      
      // Redirect to manage page after successful connection
      setTimeout(() => {
        router.push("/dashboard/integrations/facebook/manage");
      }, 2000);
    } catch (error) {
      setError("Failed to connect Facebook pages");
      console.error("Facebook pages connect error:", error);
    }
  };

  const handleCancelPageSelection = () => {
    setShowPageSelector(false);
    setFacebookUserProfile(null);
    setFacebookPages([]);
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

  if (showPageSelector && facebookUserProfile && facebookPages.length >= 0) {
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
            <h1 className="text-3xl font-bold text-gray-900">Select Facebook Pages</h1>
            <p className="text-gray-600 mt-1">
              Choose which pages you want to connect
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
        
        <FacebookPageSelector
          userProfile={facebookUserProfile}
          pages={facebookPages}
          onPagesSelected={handleFacebookPagesSelected}
          onCancel={handleCancelPageSelection}
        />
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Connect Facebook Messenger</h1>
          <p className="text-gray-600 mt-1">
            Connect your Facebook Pages to manage conversations
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
          <CardTitle>Setup Facebook Integration</CardTitle>
          <CardDescription>
            Connect your Facebook account and select pages you want to manage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">What you'll need:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Facebook account with page admin access</li>
              <li>Pages you want to connect</li>
              <li>Permission to manage messages on those pages</li>
            </ul>
          </div>

          <div className="pt-4">
            <FacebookLoginButton
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
