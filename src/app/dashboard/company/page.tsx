"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCompanySwitch } from "@/contexts/CompanyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  Key,
  Copy,
  Check,
  Plus,
  Loader2,
  Mail,
  Calendar,
  Shield,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  photoUrl: string | null;
}

interface Invitation {
  id: string;
  code: string;
  email: string | null;
  status: string;
  isActive: boolean;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    name: string | null;
    email: string;
  };
  acceptedBy: {
    name: string | null;
    email: string;
  } | null;
}

interface Company {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
}

export default function CompanyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isSwitching } = useCompanySwitch();
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingInvitation, setIsCreatingInvitation] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState("");
  const [invitationDays, setInvitationDays] = useState(7);
  const [invitationMaxUses, setInvitationMaxUses] = useState(1);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [togglingInvitationId, setTogglingInvitationId] = useState<string | null>(null);

  // Check authentication and permissions
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (session && !session.user.companyId) {
      router.push("/setup/company");
      return;
    }

    if (session && session.user.role === "AGENT") {
      router.push("/dashboard");
      return;
    }
  }, [status, session, router]);

  // Load company data when component mounts or company switches
  useEffect(() => {
    if (session?.user?.companyId && !isSwitching) {
      loadCompanyData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.companyId, isSwitching]);

  const loadCompanyData = async () => {
    console.log("🔄 Loading company data...");
    setIsLoading(true);
    setError("");

    try {
      const [companyRes, membersRes, invitationsRes] = await Promise.all([
        fetch("/api/companies/details"),
        fetch("/api/companies/members"),
        fetch("/api/companies/invitations"),
      ]);

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        console.log("✅ Company data loaded:", companyData);
        setCompany(companyData.company);
      } else {
        console.error("❌ Failed to load company details:", companyRes.status);
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        console.log("✅ Members loaded:", membersData.members?.length || 0);
        setMembers(membersData.members || []);
      } else {
        console.error("❌ Failed to load members:", membersRes.status);
      }

      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json();
        console.log("✅ Invitations loaded:", invitationsData.invitations?.length || 0);
        setInvitations(invitationsData.invitations || []);
      } else {
        // Don't show error for invitations if table doesn't exist yet
        console.warn("⚠️ Invitations not available - may need to run database migration");
        setInvitations([]);
      }
    } catch (error) {
      console.error("❌ Failed to load company data:", error);
      setError("Failed to load company information");
    } finally {
      setIsLoading(false);
      console.log("✅ Loading complete");
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingInvitation(true);
    setError("");

    try {
      const response = await fetch("/api/companies/invitations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: invitationEmail || undefined,
          expiresInDays: invitationDays,
          maxUses: invitationMaxUses,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Failed to create invitation";
        
        // Check if it's a database migration issue
        if (errorMessage.includes("does not exist") || errorMessage.includes("CompanyInvitation")) {
          throw new Error("Database migration required. Please run: npx prisma db push");
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Reload invitations
      await loadCompanyData();
      
      // Reset form
      setInvitationEmail("");
      setInvitationDays(7);
      setInvitationMaxUses(1);
      
      // Auto-copy the invitation link
      const link = result.invitation.link;
      await navigator.clipboard.writeText(link);
      setCopiedCode(result.invitation.code);
      setTimeout(() => setCopiedCode(null), 3000);
    } catch (error) {
      console.error("Create invitation error:", error);
      setError(error instanceof Error ? error.message : "Failed to create invitation");
    } finally {
      setIsCreatingInvitation(false);
    }
  };

  const handleCopyInvitationLink = async (code: string) => {
    const link = `${window.location.origin}/join/${code}`;
    await navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(`/api/companies/members/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove member");
      }

      await loadCompanyData();
      setDeleteUserId(null);
    } catch (error) {
      console.error("Remove member error:", error);
      setError("Failed to remove team member");
    }
  };

  const handleToggleInvitation = async (invitationId: string) => {
    try {
      setTogglingInvitationId(invitationId);
      const response = await fetch(`/api/companies/invitations/${invitationId}/toggle`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle invitation");
      }

      const result = await response.json();
      
      // Update only the specific invitation in state (no page reload)
      setInvitations(prevInvitations =>
        prevInvitations.map(inv =>
          inv.id === invitationId
            ? { ...inv, isActive: result.isActive }
            : inv
        )
      );
    } catch (error) {
      console.error("Toggle invitation error:", error);
      setError("Failed to toggle invitation status");
    } finally {
      setTogglingInvitationId(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-purple-100 text-purple-800";
      case "ADMIN":
        return "bg-blue-100 text-blue-800";
      case "AGENT":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "ACCEPTED":
        return "bg-green-100 text-green-800";
      case "EXPIRED":
        return "bg-red-100 text-red-800";
      case "REVOKED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!session || session.user.role === "AGENT") {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your company information, team members, and invitations.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Company Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic information about your company</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div>
                <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 w-48 bg-gray-200 rounded"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 w-12 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 w-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ) : company ? (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Company Name</Label>
                <p className="text-lg font-semibold mt-1">{company.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Total Members</Label>
                  <p className="text-lg font-semibold mt-1">{company.memberCount}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Created</Label>
                  <p className="text-lg font-semibold mt-1">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage your team members and their roles
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
              // Skeleton loading for team members
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg animate-pulse"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-3 w-48 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : members.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No team members found</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.name || member.email}
                      </p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getRoleBadgeColor(member.role)}>
                      {member.role}
                    </Badge>
                    {member.role !== "OWNER" && session?.user?.role === "OWNER" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteUserId(member.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Invitation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <CardTitle>Create Invitation</CardTitle>
              <CardDescription>
                Generate invitation codes to add new team members
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateInvitation} className="space-y-4">
            <div>
              <Label htmlFor="invitation-email">
                Email Address <span className="text-gray-400">(Optional)</span>
              </Label>
              <Input
                id="invitation-email"
                type="email"
                value={invitationEmail}
                onChange={(e) => setInvitationEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={isCreatingInvitation}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for a general invitation code
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invitation-max-uses">Maximum Uses</Label>
                <Input
                  id="invitation-max-uses"
                  type="number"
                  min="1"
                  max="100"
                  value={invitationMaxUses}
                  onChange={(e) => setInvitationMaxUses(parseInt(e.target.value))}
                  disabled={isCreatingInvitation}
                  className="mt-1.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How many people can use this code (Max: 100)
                </p>
              </div>
              <div>
                <Label htmlFor="invitation-days">Expires In (Days)</Label>
                <Input
                  id="invitation-days"
                  type="number"
                  min="1"
                  max="30"
                  value={invitationDays}
                  onChange={(e) => setInvitationDays(parseInt(e.target.value))}
                  disabled={isCreatingInvitation}
                  className="mt-1.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default: 7 days, Max: 30 days
                </p>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isCreatingInvitation}
              className="bg-black hover:bg-gray-800"
            >
              {isCreatingInvitation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Create Invitation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Invitations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Key className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <CardTitle>Invitations</CardTitle>
              <CardDescription>
                View and manage invitation codes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
              // Skeleton loading for invitations
              Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 border border-gray-200 rounded-lg animate-pulse"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-48 bg-gray-200 rounded"></div>
                        <div className="h-5 w-16 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-4 w-40 bg-gray-200 rounded"></div>
                      <div className="h-4 w-36 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="h-3 w-full bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : invitations.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No invitations yet. Create one to invite team members.
              </p>
            ) : (
              invitations.map((invitation) => {
                // Check if invitation has expired
                const isExpired = new Date(invitation.expiresAt) < new Date();
                const isFullyAccepted = invitation.status === "ACCEPTED";
                const canInteract = invitation.status === "PENDING" && !isExpired;

                return (
                  <div
                    key={invitation.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      isExpired && !isFullyAccepted
                        ? 'border-red-200 bg-red-50/50 opacity-75' 
                        : !invitation.isActive 
                        ? 'border-gray-200 opacity-60 hover:bg-gray-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {invitation.code}
                          </code>
                          {invitation.status !== "PENDING" && (
                            <Badge className={getStatusBadgeColor(invitation.status)}>
                              {invitation.status}
                            </Badge>
                          )}
                          {isExpired && invitation.status === "PENDING" && (
                            <Badge className="bg-red-100 text-red-800 border-red-300">
                              EXPIRED
                            </Badge>
                          )}
                          {!invitation.isActive && !isExpired && (
                            <Badge className="bg-gray-300 text-gray-800">
                              PAUSED
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {invitation.usedCount}/{invitation.maxUses} uses
                          </Badge>
                        </div>
                        {invitation.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Mail className="h-3 w-3" />
                            <span>{invitation.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canInteract && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleInvitation(invitation.id)}
                              disabled={togglingInvitationId === invitation.id}
                              className="flex items-center gap-2"
                            >
                              {togglingInvitationId === invitation.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </>
                              ) : invitation.isActive ? (
                                <>Pause</>
                              ) : (
                                <>Start</>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyInvitationLink(invitation.code)}
                              className="flex items-center gap-2"
                            >
                              {copiedCode === invitation.code ? (
                                <>
                                  <Check className="h-4 w-4 text-green-600" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  Copy Link
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 pt-3 border-t border-gray-200">
                      Created by {invitation.invitedBy.name || invitation.invitedBy.email}
                      {invitation.acceptedBy && (
                        <span className="ml-2">
                          • Accepted by {invitation.acceptedBy.name || invitation.acceptedBy.email}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Member Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this team member? They will lose access to
              the company and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && handleRemoveMember(deleteUserId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
