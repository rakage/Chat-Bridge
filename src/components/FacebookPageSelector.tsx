"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Facebook, CheckCircle, AlertCircle, Users } from "lucide-react";
import { ProfilePicture } from "@/components/ProfilePicture";

export interface FacebookPageData {
  id: string;
  name: string;
  category: string;
  access_token: string;
  picture?: string | null;
  followers_count?: number;
}

export interface FacebookUserProfile {
  id: string;
  name: string;
  email?: string;
}

interface FacebookPageSelectorProps {
  userProfile: FacebookUserProfile;
  pages: FacebookPageData[];
  onPagesSelected: (selectedPages: FacebookPageData[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function FacebookPageSelector({
  userProfile,
  pages,
  onPagesSelected,
  onCancel,
  isLoading = false,
}: FacebookPageSelectorProps) {
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(
    new Set()
  );
  const [connectingPages, setConnectingPages] = useState(false);

  const handlePageToggle = (pageId: string) => {
    const newSelection = new Set(selectedPageIds);
    if (newSelection.has(pageId)) {
      newSelection.delete(pageId);
    } else {
      newSelection.add(pageId);
    }
    setSelectedPageIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedPageIds.size === pages.length) {
      setSelectedPageIds(new Set());
    } else {
      setSelectedPageIds(new Set(pages.map((page) => page.id)));
    }
  };

  const handleConnect = async () => {
    if (selectedPageIds.size === 0) {
      return;
    }

    const selectedPages = pages.filter((page) => selectedPageIds.has(page.id));
    setConnectingPages(true);

    try {
      await onPagesSelected(selectedPages);
    } finally {
      setConnectingPages(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Connected as <strong>{userProfile.name}</strong> • Found{" "}
            {pages.length} manageable page{pages.length !== 1 ? "s" : ""}
          </p>
          {pages.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={isLoading || connectingPages}
            >
              {selectedPageIds.size === pages.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pages.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Manageable Pages Found
            </h3>
            <p className="text-gray-600 mb-4">
              You don&apos;t have management permissions for any Facebook pages,
              or you haven&apos;t created any pages yet.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>To connect a page, you need to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Be an admin or editor of a Facebook page</li>
                <li>Grant the required permissions during login</li>
                <li>Ensure your page is published and active</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                    selectedPageIds.has(page.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handlePageToggle(page.id)}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedPageIds.has(page.id)}
                      onChange={() => handlePageToggle(page.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start space-x-3">
                        <ProfilePicture
                          src={page.picture || undefined}
                          alt={`${page.name} profile`}
                          platform="facebook"
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {page.name}
                          </h3>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {page.category}
                          </Badge>
                          {page.followers_count !== undefined && page.followers_count > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-600">
                              <Users className="h-4 w-4" />
                              <span className="font-medium">{page.followers_count.toLocaleString()}</span>
                              <span className="text-gray-500">followers</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedPageIds.has(page.id) && (
                      <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {pages.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-gray-600">
                  {selectedPageIds.size} of {pages.length} page
                  {pages.length !== 1 ? "s" : ""} selected
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading || connectingPages}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConnect}
                    disabled={
                      selectedPageIds.size === 0 || isLoading || connectingPages
                    }
                  >
                    {connectingPages ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Connecting {selectedPageIds.size} page
                        {selectedPageIds.size !== 1 ? "s" : ""}...
                      </>
                    ) : (
                      <>
                        Connect {selectedPageIds.size} page
                        {selectedPageIds.size !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
