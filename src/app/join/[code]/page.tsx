"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Loader2, CheckCircle2, XCircle, Clock, Users, Key } from "lucide-react";

interface InvitationDetails {
  companyName: string;
  memberCount: number;
  invitedBy: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  remainingUses: number;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus, update } = useSession();
  
  const code = params.code as string;
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  // Validate invitation when component mounts and user is authenticated
  useEffect(() => {
    if (sessionStatus === "loading") {
      return;
    }

    if (sessionStatus === "unauthenticated") {
      // User not authenticated, but don't redirect automatically
      // Let them see the login option on the page
      return;
    }

    // User is authenticated, validate invitation
    validateInvitation();
  }, [sessionStatus, code]);

  const validateInvitation = async () => {
    setIsValidating(true);
    setError("");

    try {
      const response = await fetch("/api/companies/invitations/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to validate invitation");
      }

      setInvitation(data.invitation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate invitation");
    } finally {
      setIsValidating(false);
    }
  };

  const handleAcceptInvitation = async () => {
    setIsAccepting(true);
    setError("");

    try {
      const response = await fetch("/api/companies/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join company");
      }

      // Update session to reflect new company
      await update();

      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join company");
    } finally {
      setIsAccepting(false);
    }
  };

  // Loading state while checking authentication
  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600 mb-4" />
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Unauthenticated user - show login/register options
  if (sessionStatus === "unauthenticated") {
    const callbackUrl = encodeURIComponent(`/join/${code}`);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Key className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Sign in Required</CardTitle>
                <CardDescription>Please sign in to accept this invitation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              You need to be signed in to join a company using an invitation code.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Link href={`/auth/login?callbackUrl=${callbackUrl}`} className="w-full">
              <Button className="w-full bg-black hover:bg-gray-800">
                Sign In
              </Button>
            </Link>
            <div className="text-sm text-center text-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                href={`/auth/register?callbackUrl=${callbackUrl}`}
                className="text-blue-600 hover:underline font-medium"
              >
                Register here
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Loading state while validating invitation
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Welcome aboard!
            </h2>
            <p className="text-gray-600 text-center mb-4">
              You&apos;ve successfully joined {invitation?.companyName}
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Invalid Invitation</CardTitle>
                <CardDescription>This invitation link is not valid</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="flex-1"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={validateInvitation}
              className="flex-1"
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Display invitation details
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Company Invitation</CardTitle>
              <CardDescription>You&apos;ve been invited to join a company</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Company Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="font-semibold text-gray-900">{invitation?.companyName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Team Size</p>
                <p className="font-semibold text-gray-900">{invitation?.memberCount} members</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Key className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Invited by</p>
                <p className="font-semibold text-gray-900">{invitation?.invitedBy || "Company Admin"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Expires</p>
                <p className="font-semibold text-gray-900">
                  {invitation?.expiresAt
                    ? new Date(invitation.expiresAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
            </div>

            {invitation && invitation.maxUses > 1 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Invitation uses: <span className="font-semibold">{invitation.usedCount}/{invitation.maxUses}</span>
                </p>
              </div>
            )}
          </div>

          {/* User info */}
          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p>
              You&apos;re joining as <span className="font-semibold text-gray-900">{session?.user?.email}</span>
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            disabled={isAccepting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAcceptInvitation}
            disabled={isAccepting}
            className="flex-1 bg-black hover:bg-gray-800"
          >
            {isAccepting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Company"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
