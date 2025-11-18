"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfilePicture } from "@/components/ProfilePicture";
import { 
  Users, 
  Search, 
  MessageSquare, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Filter,
  ArrowUpDown,
  Facebook,
  Instagram,
  Send,
  Globe
} from "lucide-react";

type Contact = {
  id: string;
  psid: string;
  platform: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  profilePicture?: string;
  lastMessageAt: string;
  createdAt: string;
  messageCount: number;
  conversationId: string;
  platformName: string;
  unreadCount: number;
};

export default function ContactsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [total, setTotal] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timer);
  }, [search]);

  // Load contacts when debounced search or platform filter changes
  useEffect(() => {
    loadContacts();
  }, [debouncedSearch, platformFilter]);

  const loadContacts = async () => {
    try {
      // Use searchLoading for subsequent searches to avoid full page reload
      if (contacts.length > 0) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (platformFilter !== "ALL") params.set("platform", platformFilter);
      params.set("limit", "50");

      const response = await fetch(`/api/contacts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to load contacts:", error);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "FACEBOOK":
        return <Facebook className="h-4 w-4 text-blue-600" />;
      case "INSTAGRAM":
        return <Instagram className="h-4 w-4 text-pink-600" />;
      case "TELEGRAM":
        return <Send className="h-4 w-4 text-sky-600" />;
      case "WIDGET":
        return <Globe className="h-4 w-4 text-purple-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPlatformTooltip = (platform: string) => {
    switch (platform) {
      case "FACEBOOK":
        return "Facebook Messenger";
      case "INSTAGRAM":
        return "Instagram DM";
      case "TELEGRAM":
        return "Telegram";
      case "WIDGET":
        return "Website Chat";
      default:
        return "Unknown";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (seconds < 60) return "Just now";
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
      if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
      return `${Math.floor(seconds / 2592000)}mo ago`;
    } catch {
      return "Unknown";
    }
  };

  const handleContactClick = (conversationId: string) => {
    router.push(`/dashboard/conversations?id=${conversationId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">
            Manage customers who have messaged you ({total} total)
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Platform Filter */}
            <div className="sm:w-48">
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="ALL">All Platforms</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="TELEGRAM">Telegram</option>
                <option value="WIDGET">Website</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      {searchLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : contacts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {search ? "No contacts found" : "No contacts yet"}
            </h3>
            <p className="text-gray-500 mb-6">
              {search 
                ? `No contacts match "${search}"` 
                : "Contacts will appear here when customers message you"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => handleContactClick(contact.conversationId)}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {/* Profile Picture */}
                  <div className="flex-shrink-0">
                    <ProfilePicture
                      src={contact.profilePicture}
                      alt={contact.customerName}
                      platform={contact.platform.toLowerCase() as any}
                      size="md"
                    />
                  </div>

                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {contact.customerName}
                      </h3>
                      <div className="flex items-center" title={getPlatformTooltip(contact.platform)}>
                        {getPlatformIcon(contact.platform)}
                      </div>
                      {contact.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white text-xs">
                          {contact.unreadCount} new
                        </Badge>
                      )}
                    </div>

                    {/* Contact Details */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {contact.customerEmail && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{contact.customerEmail}</span>
                        </div>
                      )}
                      {contact.customerPhone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{contact.customerPhone}</span>
                        </div>
                      )}
                      {contact.customerAddress && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{contact.customerAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{contact.messageCount} messages</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>Last: {formatTimeAgo(contact.lastMessageAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Load More */}
      {contacts.length > 0 && contacts.length < total && (
        <div className="text-center">
          <Button variant="outline" onClick={loadContacts}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
