import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import SessionProvider from "@/components/providers/SessionProvider";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://chatbridge.ai"),
  title:
    "ChatBridge - Omnichannel Chatbot for WhatsApp, Instagram, Facebook Messanger, Telegram & Web Chat",
  description:
    "Automate customer support across WhatsApp, Instagram, Facebook, Telegram & Web Chat. AI-powered routing, real-time inbox, and human handoff. Start free trial today.",
  keywords: [
    "omnichannel chatbot",
    "whatsapp automation",
    "instagram dm api",
    "customer support inbox",
    "ai routing",
    "facebook messenger bot",
    "live chat software",
    "chatbot platform",
    "customer service automation",
    "multi-channel support",
  ],
  authors: [{ name: "ChatBridge" }],
  creator: "ChatBridge",
  publisher: "ChatBridge",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://chatbridge.ai",
    siteName: "ChatBridge",
    title: "ChatBridge - Omnichannel Chatbot Platform",
    description:
      "Unify WhatsApp, Instagram, Facebook, Web & Telegram support in one AI-powered inbox. Start your free trial today.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ChatBridge Omnichannel Platform - Unified Customer Support Inbox",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatBridge - Omnichannel Chatbot Platform",
    description:
      "Automate customer conversations across all channels with AI routing and real-time analytics.",
    images: ["/twitter-image.png"],
    creator: "@chatbridge",
  },
  alternates: {
    canonical: "https://chatbridge.ai",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  verification: {
    google: "your-google-site-verification-code",
    yandex: "your-yandex-verification-code",
  },
};

const schemaData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://chatbridge.ai/#website",
      url: "https://chatbridge.ai",
      name: "ChatBridge",
      description:
        "Omnichannel chatbot platform for customer support automation across WhatsApp, Instagram, Facebook, Web Chat, and Telegram",
      publisher: {
        "@id": "https://chatbridge.ai/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://chatbridge.ai/search?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://chatbridge.ai/#organization",
      name: "ChatBridge",
      url: "https://chatbridge.ai",
      logo: {
        "@type": "ImageObject",
        url: "https://chatbridge.ai/logo.png",
        width: 512,
        height: 512,
      },
      sameAs: [
        "https://twitter.com/chatbridge",
        "https://linkedin.com/company/chatbridge",
        "https://github.com/chatbridge",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "Customer Support",
        email: "support@chatbridge.ai",
        availableLanguage: ["English"],
      },
    },
    {
      "@type": "SoftwareApplication",
      name: "ChatBridge",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Customer Support Software",
      operatingSystem: "Web",
      offers: [
        {
          "@type": "Offer",
          name: "Free Plan",
          price: "0",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            priceCurrency: "USD",
            price: "0",
          },
        },
        {
          "@type": "Offer",
          name: "Pro Plan",
          price: "49",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            priceCurrency: "USD",
            price: "49",
            billingDuration: "P1M",
            billingIncrement: 1,
            unitText: "per agent per month",
          },
        },
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "127",
        bestRating: "5",
        worstRating: "1",
      },
      featureList: [
        "Omnichannel inbox (WhatsApp, Instagram, Facebook, Web, Telegram)",
        "AI-powered routing and automation",
        "Human handoff to agents",
        "Real-time analytics and CSAT tracking",
        "SLA monitoring",
        "Multi-language support",
      ],
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Preload critical assets for better LCP */}
        <link rel="dns-prefetch" href="https://chatbridge.ai" />
      </head>
      <body className={inter.className}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
