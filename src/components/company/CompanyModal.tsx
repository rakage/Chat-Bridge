"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Building2, Key, Copy, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface CompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CompanyModal({ open, onOpenChange, onSuccess }: CompanyModalProps) {
  const { update } = useSession();
  const router = useRouter();

  // Create company state
  const [companyName, setCompanyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Join company state
  const [invitationCode, setInvitationCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");



  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      setCreateError("Company name is required");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      const response = await fetch("/api/companies/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: companyName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create company");
      }

      const result = await response.json();

      // Update session
      await update();

      console.log("✅ Company created:", result.company);

      // Close modal and callback
      onOpenChange(false);
      
      // Refresh without full reload
      router.refresh();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Create company error:", error);
      setCreateError(
        error instanceof Error ? error.message : "Failed to create company"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitationCode.trim()) {
      setJoinError("Please enter an invitation code");
      return;
    }

    setIsJoining(true);
    setJoinError("");

    try {
      const response = await fetch("/api/companies/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: invitationCode.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to join company");
      }

      const result = await response.json();

      // Update session
      await update();

      console.log("✅ Joined company:", result.company);

      // Close modal and callback
      onOpenChange(false);
      
      // Refresh without full reload
      router.refresh();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Join company error:", error);
      setJoinError(
        error instanceof Error ? error.message : "Failed to join company"
      );
    } finally {
      setIsJoining(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setCompanyName("");
      setInvitationCode("");
      setCreateError("");
      setJoinError("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold">
            Company Setup
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Create a new company or join using an invitation code.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create Company Section */}
          <div className="border-b border-gray-200 pb-6">
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-gray-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    Create a new company
                  </h3>
                  <p className="text-sm text-gray-600">
                    You&apos;ll be the owner and can invite team members later.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="create-company-name" className="text-sm font-medium">
                  Company Name
                </Label>
                <Input
                  id="create-company-name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Inc."
                  disabled={isCreating}
                  maxLength={100}
                  className="mt-1.5"
                />
              </div>

              {createError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || !companyName.trim()}
                  className="bg-black hover:bg-gray-800"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Company
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Join Company Section */}
          <div>
            <form onSubmit={handleJoinCompany} className="space-y-4">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Key className="w-6 h-6 text-gray-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    Join with invitation code
                  </h3>
                  <p className="text-sm text-gray-600">
                    Enter the invitation code provided by your company admin.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="invitation-code" className="text-sm font-medium">
                  Invitation Code
                </Label>
                <Input
                  id="invitation-code"
                  type="text"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  placeholder="Enter invitation code..."
                  disabled={isJoining}
                  className="mt-1.5 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Ask your company admin to generate an invitation link for you.
                </p>
              </div>

              {joinError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {joinError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isJoining}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isJoining || !invitationCode.trim()}
                  className="bg-black hover:bg-gray-800"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Join Company
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
