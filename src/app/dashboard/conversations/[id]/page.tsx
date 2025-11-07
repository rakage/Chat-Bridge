"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import ConversationsList from "@/components/realtime/ConversationsList";
import ConversationView from "@/components/realtime/ConversationView";
import { useCompanySwitch } from "@/contexts/CompanyContext";

interface ConversationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ConversationPage({ params }: ConversationPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { isSwitching } = useCompanySwitch();
  const [selectedConversationId, setSelectedConversationId] = useState(id);

  // Redirect to conversations list when company switches
  useEffect(() => {
    if (isSwitching) {
      router.push("/dashboard/conversations");
    }
  }, [isSwitching, router]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <ConversationsList
            onSelectConversation={setSelectedConversationId}
            selectedConversationId={selectedConversationId}
          />
        </div>

        {/* Conversation View */}
        <div className="lg:col-span-2 relative">
          {selectedConversationId ? (
            <ConversationView conversationId={selectedConversationId} />
          ) : (
            <div className="h-[600px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-600">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
