import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/auth/");

    // Redirect authenticated users away from auth pages to dashboard
    if (token && isAuthPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without token
        if (req.nextUrl.pathname.startsWith("/auth/")) {
          return true;
        }

        // Allow access to API auth routes
        if (req.nextUrl.pathname.startsWith("/api/auth/")) {
          return true;
        }

        // Allow access to webhook routes (they have their own auth)
        if (req.nextUrl.pathname.startsWith("/api/webhook/")) {
          return true;
        }

        // Allow access to home page
        if (req.nextUrl.pathname === "/") {
          return true;
        }

        // Allow access to Terms of Service page
        if (req.nextUrl.pathname === "/tos") {
          return true;
        }

        // Allow access to join invitation pages (requires auth but handled by the page itself)
        if (req.nextUrl.pathname.startsWith("/join/")) {
          return true;
        }

        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
