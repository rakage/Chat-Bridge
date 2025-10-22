"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Facebook, Building2 } from "lucide-react";

interface FacebookLoginButtonProps {
  onLoading?: (loading: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  businessLogin?: boolean; // Enable Facebook Login for Business
  configId?: string; // Business Login configuration ID
}

export function FacebookLoginButton({ 
  onLoading, 
  disabled = false, 
  className = "",
  size = "default",
  variant = "default",
  businessLogin = false,
  configId
}: FacebookLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFacebookLogin = async () => {
    try {
      setIsLoading(true);
      onLoading?.(true);

      // Prepare API endpoint and parameters
      const apiUrl = businessLogin && configId 
        ? `/api/auth/facebook/business-login-url?config_id=${encodeURIComponent(configId)}`
        : "/api/auth/facebook/login-url";

      // Get the Facebook OAuth URL from our API
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || "Failed to get Facebook login URL");
      }

      const { loginUrl } = await response.json();
      
      // Redirect to Facebook OAuth
      window.location.href = loginUrl;
      
    } catch (error) {
      console.error("Facebook login error:", error);
      setIsLoading(false);
      onLoading?.(false);
      
      // Show error message to user
      alert(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Button
      onClick={handleFacebookLogin}
      disabled={disabled || isLoading}
      className={className}
      size={size}
      variant={variant}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          {businessLogin ? "Connecting to Facebook Business..." : "Connecting to Facebook..."}
        </>
      ) : (
        <>
          {businessLogin ? (
            <Building2 className="h-4 w-4 mr-2" />
          ) : (
            <Facebook className="h-4 w-4 mr-2" />
          )}
          {businessLogin ? "Connect Business Account" : "Connect with Facebook"}
        </>
      )}
    </Button>
  );
}
