"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle,
} from "lucide-react";

// Custom Social Media Icons
const FacebookMessengerIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    fillRule="evenodd"
    clipRule="evenodd"
  >
    <path d="M12 0c-6.627 0-12 4.975-12 11.111 0 3.497 1.745 6.616 4.472 8.652v4.237l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111 0-6.136-5.373-11.111-12-11.111zm1.193 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    xmlSpace="preserve"
    style={{
      fillRule: "evenodd",
      clipRule: "evenodd",
      strokeLinejoin: "round",
      strokeMiterlimit: "1.41421",
    }}
  >
    <path
      id="telegram-1"
      d="M18.384,22.779c0.322,0.228 0.737,0.285 1.107,0.145c0.37,-0.141 0.642,-0.457 0.724,-0.84c0.869,-4.084 2.977,-14.421 3.768,-18.136c0.06,-0.28 -0.04,-0.571 -0.26,-0.758c-0.22,-0.187 -0.525,-0.241 -0.797,-0.14c-4.193,1.552 -17.106,6.397 -22.384,8.35c-0.335,0.124 -0.553,0.446 -0.542,0.799c0.012,0.354 0.25,0.661 0.593,0.764c2.367,0.708 5.474,1.693 5.474,1.693c0,0 1.452,4.385 2.209,6.615c0.095,0.28 0.314,0.5 0.603,0.576c0.288,0.075 0.596,-0.004 0.811,-0.207c1.216,-1.148 3.096,-2.923 3.096,-2.923c0,0 3.572,2.619 5.598,4.062Zm-11.01,-8.677l1.679,5.538l0.373,-3.507c0,0 6.487,-5.851 10.185,-9.186c0.108,-0.098 0.123,-0.262 0.033,-0.377c-0.089,-0.115 -0.253,-0.142 -0.376,-0.064c-4.286,2.737 -11.894,7.596 -11.894,7.596Z"
    />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

interface IntegrationCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  connected: boolean;
  connectionCount?: number;
  comingSoon?: boolean;
  setupUrl?: string;
  manageUrl?: string;
}

function IntegrationCard({
  name,
  description,
  icon: Icon,
  color,
  connected,
  connectionCount = 0,
  comingSoon = false,
  setupUrl,
  manageUrl,
}: IntegrationCardProps) {
  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-gray-300">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl ${color} flex items-center justify-center`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
          {comingSoon && (
            <Badge variant="secondary" className="text-xs">
              Coming Soon
            </Badge>
          )}
          {connected && (
            <Badge className="text-xs bg-green-100 text-green-700">
              {connectionCount} Connected
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl mt-4">{name}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {comingSoon ? (
          <Button variant="outline" className="w-full" disabled>
            Coming Soon
          </Button>
        ) : connected ? (
          <Link href={manageUrl || "#"}>
            <Button variant="default" className="w-full">
              Manage
            </Button>
          </Link>
        ) : (
          <Link href={setupUrl || "#"}>
            <Button variant="default" className="w-full">
              Setup
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default function IntegrationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  
  // Connection counts
  const [widgetConnected, setWidgetConnected] = useState(false);
  const [facebookCount, setFacebookCount] = useState(0);
  const [instagramCount, setInstagramCount] = useState(0);
  const [telegramCount, setTelegramCount] = useState(0);
  
  // Check if user has permission to access this page
  useEffect(() => {
    if (
      session?.user?.role &&
      !["OWNER", "ADMIN"].includes(session.user.role)
    ) {
      router.push("/dashboard");
    }

    if (session?.user) {
      loadIntegrationStatus();
    }
  }, [session, router]);

  const loadIntegrationStatus = async () => {
    try {
      // Load Widget status
      const widgetRes = await fetch("/api/widget/config");
      if (widgetRes.ok) {
        const widgetData = await widgetRes.json();
        setWidgetConnected(!!widgetData?.id);
      }

      // Load Facebook pages
      const facebookRes = await fetch("/api/settings/page");
      if (facebookRes.ok) {
        const facebookData = await facebookRes.json();
        setFacebookCount(facebookData.pageConnections?.length || 0);
      }

      // Load Instagram connections
      const instagramRes = await fetch("/api/instagram/connections");
      if (instagramRes.ok) {
        const instagramData = await instagramRes.json();
        setInstagramCount(instagramData.connections?.length || 0);
      }

      // Load Telegram connections
      const telegramRes = await fetch("/api/telegram/connections");
      if (telegramRes.ok) {
        const telegramData = await telegramRes.json();
        setTelegramCount(telegramData.connections?.length || 0);
      }
    } catch (error) {
      console.error("Failed to load integration status:", error);
    } finally {
      setLoading(false);
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

  // Integration configurations
  const integrations: IntegrationCardProps[] = [
    {
      id: "chat-widget",
      name: "Chat Widget",
      description: "Embed live chat widget on your website",
      icon: ({ className }) => (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
        </svg>
      ),
      color: "bg-purple-600",
      connected: widgetConnected,
      connectionCount: widgetConnected ? 1 : 0,
      setupUrl: "/dashboard/chat-widget",
      manageUrl: "/dashboard/chat-widget",
    },
    {
      id: "facebook",
      name: "Facebook Messenger",
      description: "Connect Facebook Pages for automated messaging",
      icon: FacebookMessengerIcon,
      color: "bg-blue-600",
      connected: facebookCount > 0,
      connectionCount: facebookCount,
      setupUrl: "/dashboard/integrations/facebook/setup",
      manageUrl: "/dashboard/integrations/facebook/manage",
    },
    {
      id: "instagram",
      name: "Instagram",
      description: "Connect Instagram Business accounts for messaging",
      icon: InstagramIcon,
      color: "bg-gradient-to-r from-pink-500 to-purple-600",
      connected: instagramCount > 0,
      connectionCount: instagramCount,
      setupUrl: "/dashboard/integrations/instagram/setup",
      manageUrl: "/dashboard/integrations/instagram/manage",
    },
    {
      id: "telegram",
      name: "Telegram",
      description: "Connect Telegram bots for automated responses",
      icon: TelegramIcon,
      color: "bg-blue-500",
      connected: telegramCount > 0,
      connectionCount: telegramCount,
      setupUrl: "/dashboard/integrations/telegram/setup",
      manageUrl: "/dashboard/integrations/telegram/manage",
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      description: "Connect WhatsApp Business API (Coming Soon)",
      icon: WhatsAppIcon,
      color: "bg-green-600",
      connected: false,
      connectionCount: 0,
      comingSoon: true,
    },
  ];

  // Show loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-4">
                <Skeleton className="h-14 w-14 rounded-xl mb-4" />
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="pt-0">
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600 mt-1">
          Connect and manage your messaging platforms
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center p-4 mb-4 text-green-700 bg-green-100 rounded-lg">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} {...integration} />
        ))}
      </div>
    </div>
  );
}
