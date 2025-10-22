"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Monitor, User, Bot, UserCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { InstagramIcon } from "@/components/ui/instagram-icon";
import { FacebookMessengerIcon } from "@/components/ui/facebook-icon";
import { TelegramIcon } from "@/components/ui/telegram-icon";

const channels = [
  { id: "whatsapp", label: "WhatsApp", icon: WhatsAppIcon, customIcon: true },
  { id: "instagram", label: "Instagram", icon: InstagramIcon, customIcon: true },
  { id: "facebook", label: "Messenger", icon: FacebookMessengerIcon, customIcon: true },
  { id: "telegram", label: "Telegram", icon: TelegramIcon, customIcon: true },
  { id: "webchat", label: "Web Chat", icon: Monitor, customIcon: false },
];

const mockMessages = {
  whatsapp: [
    { from: "User", text: "Do you ship to Bali?", timestamp: "2:34 PM" },
    { from: "Ava (AI)", text: "Yes—worldwide. Want the rates?", timestamp: "2:34 PM" },
    { from: "User", text: "Send rates + ETA 🙏", timestamp: "2:35 PM" },
    { from: "John (Agent)", text: "I'll send you a detailed quote right away!", timestamp: "2:36 PM" },
  ],
  instagram: [
    { from: "User", text: "Is this product available?", timestamp: "3:20 PM" },
    { from: "Ava (AI)", text: "Yes! In stock now. Which size?", timestamp: "3:20 PM" },
    { from: "User", text: "Medium please", timestamp: "3:21 PM" },
    { from: "John (Agent)", text: "Perfect! I can reserve that for you.", timestamp: "3:22 PM" },
  ],
  facebook: [
    { from: "User", text: "Can I get support?", timestamp: "1:15 PM" },
    { from: "Ava (AI)", text: "Of course! What do you need help with?", timestamp: "1:15 PM" },
    { from: "User", text: "My order hasn't arrived", timestamp: "1:16 PM" },
    { from: "John (Agent)", text: "Let me check the tracking for you.", timestamp: "1:17 PM" },
  ],
  telegram: [
    { from: "User", text: "Hi! Is this service available?", timestamp: "5:10 PM" },
    { from: "Ava (AI)", text: "Yes! How can I assist you today?", timestamp: "5:10 PM" },
    { from: "User", text: "I need pricing info", timestamp: "5:11 PM" },
    { from: "John (Agent)", text: "Let me send you our pricing details.", timestamp: "5:12 PM" },
  ],
  webchat: [
    { from: "User", text: "Hello, I need help with my order", timestamp: "4:05 PM" },
    { from: "Ava (AI)", text: "I'm here to help! What's your order number?", timestamp: "4:05 PM" },
    { from: "User", text: "#12345", timestamp: "4:06 PM" },
    { from: "John (Agent)", text: "Found it! Let me look into this for you.", timestamp: "4:07 PM" },
  ],
};

const suggestedReplies = [
  "Share shipping rates",
  "Ask for address",
  "Escalate to agent",
];

export function OmnichannelPreviewCard() {
  const [activeChannel, setActiveChannel] = useState("whatsapp");

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/20 to-transparent pointer-events-none" />
      
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Live Omni-Inbox Preview</h3>
            <p className="text-sm text-zinc-400 mt-1">All channels in one place</p>
          </div>
          <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            Live
          </Badge>
        </div>

        <Tabs value={activeChannel} onValueChange={setActiveChannel} className="w-full">
          <TabsList className="w-full bg-zinc-900/60 backdrop-blur p-1 gap-2 h-auto grid grid-cols-5">
            {channels.map((channel) => {
              const IconComponent = channel.icon;
              return (
                <TabsTrigger
                  key={channel.id}
                  value={channel.id}
                  className="channel-tab flex items-center justify-center w-full py-2.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-black transition-all hover:scale-105"
                  aria-label={`Switch to ${channel.label} channel`}
                >
                  {channel.customIcon ? (
                    <IconComponent size={16} aria-hidden="true" />
                  ) : (
                    <IconComponent className="h-4 w-4" aria-hidden="true" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(mockMessages).map(([channel, messages]) => (
            <TabsContent key={channel} value={channel} className="mt-6">
              <ScrollArea className="h-[360px] rounded-lg bg-zinc-950/40 p-4 backdrop-blur">
                <div className="space-y-4">
                  {messages.map((message, idx) => {
                    const isUser = message.from === "User";
                    const isAgent = message.from.includes("(Agent)");
                    const isAI = message.from.includes("(AI)");
                    
                    return (
                      <div
                        key={idx}
                        className={`flex gap-3 ${
                          isUser ? "flex-row" : "flex-row-reverse"
                        }`}
                      >
                        <Avatar className="h-8 w-8 border border-zinc-700 flex-shrink-0">
                          <div className="flex items-center justify-center w-full h-full bg-zinc-800 text-zinc-400">
                            {isUser ? <User className="h-4 w-4" /> : isAgent ? <UserCircle className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>
                        </Avatar>
                        <div
                          className={`max-w-[75%] ${
                            isUser ? "" : "flex flex-col items-end"
                          }`}
                        >
                          <div className="mb-1">
                            <span className="text-xs font-medium text-zinc-300">
                              {message.from}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg px-4 py-2 inline-block ${
                              isUser
                                ? "bg-zinc-800 text-white"
                                : isAgent
                                ? "bg-blue-500 text-white"
                                : "bg-white text-black"
                            }`}
                          >
                            <p className="text-sm mb-1">{message.text}</p>
                            <p className={`text-xs ${isUser ? "text-zinc-400" : isAgent ? "text-blue-100" : "text-zinc-600"}`}>{message.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="mt-4 space-y-3">
                {/* Suggested Replies */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-400">Suggested replies</p>
                  <div className="flex gap-2 flex-wrap">
                    {suggestedReplies.map((reply, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors"
                      >
                        {reply}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Input Box */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a reply…"
                    className="flex-1 bg-zinc-900/60 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-600"
                  />
                  <Button size="icon" className="bg-white text-black hover:bg-zinc-200">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Card>
  );
}
