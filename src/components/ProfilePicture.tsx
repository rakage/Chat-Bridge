"use client";

import { useState } from "react";
import { Facebook, Instagram, MessageCircle, Send, User } from "lucide-react";

interface ProfilePictureProps {
  src?: string | null;
  alt: string;
  platform: string;
  size?: "sm" | "md" | "lg";
}

export function ProfilePicture({ src, alt, platform, size = "md" }: ProfilePictureProps) {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };
  
  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
  };
  
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return Facebook;
      case 'instagram':
        return Instagram;
      case 'whatsapp':
        return MessageCircle;
      case 'telegram':
        return Send;
      case 'widget':
        return User;
      default:
        return User;
    }
  };
  
  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return 'bg-blue-600';
      case 'instagram':
        return 'bg-gradient-to-r from-pink-500 to-purple-600';
      case 'whatsapp':
        return 'bg-green-600';
      case 'telegram':
        return 'bg-blue-500';
      case 'widget':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const IconComponent = getPlatformIcon(platform);
  const hasValidSrc = src && src.length > 0 && !imageError;
  
  if (hasValidSrc) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg overflow-hidden bg-gray-100`}>
        <img 
          src={src} 
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }
  
  return (
    <div className={`${sizeClasses[size]} ${getPlatformColor(platform)} rounded-lg flex items-center justify-center`}>
      <IconComponent className={`${iconSizeClasses[size]} text-white`} />
    </div>
  );
}