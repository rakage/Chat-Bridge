"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";

interface InstagramLoginButtonProps {
  onLoading?: (loading: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function InstagramLoginButton({ 
  onLoading, 
  disabled = false, 
  className = "",
  size = "default",
  variant = "default"
}: InstagramLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleInstagramLogin = async () => {
    try {
      setIsLoading(true);
      onLoading?.(true);

      // Get the Instagram OAuth URL from our API
      const response = await fetch("/api/auth/instagram/login-url");
      if (!response.ok) {
        throw new Error("Failed to get Instagram login URL");
      }

      const { loginUrl } = await response.json();
      
      // Redirect to Instagram OAuth
      window.location.href = loginUrl;
      
    } catch (error) {
      console.error("Instagram login error:", error);
      setIsLoading(false);
      onLoading?.(false);
      // You might want to show an error toast here
    }
  };

  return (
    <Button
      onClick={handleInstagramLogin}
      disabled={disabled || isLoading}
      className={className}
      size={size}
      variant={variant}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Connecting to Instagram...
        </>
      ) : (
        <>
          <Instagram className="h-4 w-4 mr-2" />
          Connect with Instagram
        </>
      )}
    </Button>
  );
}