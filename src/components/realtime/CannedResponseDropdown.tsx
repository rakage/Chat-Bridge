"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Zap, Globe, User, Search } from "lucide-react";

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  category: string | null;
  scope: "PERSONAL" | "COMPANY";
}

interface CannedResponseDropdownProps {
  searchQuery: string;
  onSelect: (response: CannedResponse) => void;
  onClose: () => void;
  position?: { top: number; left: number };
  onSearchChange?: (query: string) => void;
}

export default function CannedResponseDropdown({
  searchQuery,
  onSelect,
  onClose,
  position,
  onSearchChange,
}: CannedResponseDropdownProps) {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [internalSearchQuery, setInternalSearchQuery] = useState(searchQuery);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync internal search with prop when it changes from outside
  useEffect(() => {
    setInternalSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    fetchResponses();
  }, [internalSearchQuery]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys if dropdown is not shown
      if (!responses.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, responses.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (responses[selectedIndex]) {
          onSelect(responses[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [responses, selectedIndex, onSelect, onClose]);

  const fetchResponses = async () => {
    try {
      const params = new URLSearchParams();
      if (internalSearchQuery) {
        params.append("search", internalSearchQuery);
      }

      const res = await fetch(`/api/canned-responses?${params}`);
      const data = await res.json();

      if (res.ok) {
        // Filter and sort by relevance for partial matching
        let filtered = data.responses;

        if (internalSearchQuery) {
          const query = internalSearchQuery.toLowerCase();
          
          // Filter for partial matches in shortcut, title, or content
          filtered = filtered.filter((r: CannedResponse) => {
            const shortcutMatch = r.shortcut?.toLowerCase().includes(query);
            const titleMatch = r.title.toLowerCase().includes(query);
            const contentMatch = r.content.toLowerCase().includes(query);
            return shortcutMatch || titleMatch || contentMatch;
          });

          // Sort by relevance: exact shortcut > starts with > contains
          filtered.sort((a: CannedResponse, b: CannedResponse) => {
            const aShortcut = a.shortcut?.toLowerCase() || "";
            const bShortcut = b.shortcut?.toLowerCase() || "";
            
            const aExact = aShortcut === query;
            const bExact = bShortcut === query;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            const aStarts = aShortcut.startsWith(query);
            const bStarts = bShortcut.startsWith(query);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            
            return 0; // Keep original order (by usage count)
          });
        }
        
        setResponses(filtered.slice(0, 10)); // Limit to 10 results
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error("Error fetching canned responses:", error);
    }
  };

  const handleSearchChange = (value: string) => {
    setInternalSearchQuery(value);
    onSearchChange?.(value);
  };

  const renderEmptyState = () => (
    <div className="text-center text-gray-500 text-sm p-4">
      <p>No canned responses found</p>
      <p className="text-xs mt-1">
        {internalSearchQuery ? `No match for "${internalSearchQuery}"` : "Type to search"}
      </p>
    </div>
  );

  const handleResponseClick = (e: React.MouseEvent, response: CannedResponse) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(response);
  };

  return (
    <div
      ref={dropdownRef}
      className="bg-white border rounded-lg shadow-lg z-50 w-full max-w-md mx-auto"
      style={position ? { top: position.top, left: position.left } : {}}
    >
      <div className="rounded-lg border-none">
        {/* Search Input */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search canned responses..."
              value={internalSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-3"
              onKeyDown={(e) => {
                // Prevent these keys from bubbling up
                e.stopPropagation();
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            Search by title, shortcut, or content
          </p>
        </div>

        {/* Results */}
        {responses.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="max-h-60 sm:max-h-80 overflow-y-auto">
            <div className="p-2">
              <p className="px-2 py-1.5 text-xs font-medium text-gray-500">
                {responses.length} Response{responses.length !== 1 ? 's' : ''} Found
              </p>
            {responses.map((response, index) => (
              <div
                key={response.id}
                onClick={(e) => handleResponseClick(e, response)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleResponseClick(e, response);
                }}
                className={`cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-colors rounded-sm px-2 py-1.5 select-none ${
                  index === selectedIndex ? "bg-gray-100" : ""
                }`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{response.title}</span>
                    {response.scope === "COMPANY" ? (
                      <Globe className="w-3 h-3 text-blue-600 flex-shrink-0" />
                    ) : (
                      <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                  {response.shortcut && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="outline" className="text-xs pointer-events-none">
                        <Zap className="w-2 h-2 mr-1" />/{response.shortcut}
                      </Badge>
                      {response.category && (
                        <Badge variant="secondary" className="text-xs pointer-events-none">
                          {response.category}
                        </Badge>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {response.content}
                  </p>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t bg-gray-50 text-xs text-gray-500 hidden sm:block">
        <p>
          ↑↓ Navigate • Enter Select • Esc Close
        </p>
      </div>
    </div>
  );
}
