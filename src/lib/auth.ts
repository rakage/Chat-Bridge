import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { checkRateLimit, getIdentifier } from "./rate-limit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any, // Type assertion to bypass adapter compatibility issue
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        // ============================================
        // RATE LIMITING: AUTH_LOGIN
        // Max 5 attempts per 15 minutes, block for 30 minutes
        // ============================================
        if (req) {
          const identifier = `ip:${req.headers?.["x-forwarded-for"] || req.headers?.["x-real-ip"] || "unknown"}`;
          const rateLimitResult = await checkRateLimit(identifier, "AUTH_LOGIN");
          
          if (!rateLimitResult.success) {
            console.warn(`🚫 Login rate limit exceeded for ${identifier}`);
            throw new Error(`Too many login attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`);
          }
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { company: true },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.currentCompanyId || user.companyId, // Use currentCompanyId, fallback to legacy companyId
        };
      },
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user || trigger === "update") {
        // Fetch user with current company and role information
        // This runs on sign-in and when session.update() is called
        const dbUser = await db.user.findUnique({
          where: { id: token.sub || user?.id },
          include: {
            currentCompany: true, // Fetch based on currentCompanyId
          },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.companyId = dbUser.currentCompanyId || dbUser.companyId; // Use currentCompanyId, fallback to legacy companyId
          token.companyName = dbUser.currentCompany?.name;
          token.name = dbUser.name; // Add user name to token
          token.picture = dbUser.photoUrl; // Add photo URL to token
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.companyName = token.companyName;
        session.user.name = token.name as string | null; // Add user name to session
        session.user.image = token.picture as string | null; // Add photo URL to session
      }
      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Allow sign in for existing users or create new ones with AGENT role by default
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // New flow: Users start without a company and need to create one
      // All new users start as OWNER role so they can create their own company
      await db.user.update({
        where: { id: user.id },
        data: {
          role: Role.OWNER, // Give them OWNER role so they can create company
          companyId: null,  // No company assigned initially
        },
      });

      console.log(`🆕 New user created: ${user.email} (ID: ${user.id}) - needs to create company`);
    },
  },
};

// Helper functions for role checking
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy = {
    [Role.AGENT]: 1,
    [Role.ADMIN]: 2,
    [Role.OWNER]: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canAccessCompany(
  userRole: Role,
  userCompanyId: string | null,
  targetCompanyId: string
): boolean {
  console.log(`🔒 canAccessCompany check:`, {
    userRole,
    userCompanyId,
    targetCompanyId,
    match: userCompanyId === targetCompanyId,
  });

  // User must belong to a company
  if (!userCompanyId) {
    console.log(`❌ User has no company assigned`);
    return false;
  }

  // User must be accessing their own company's data
  if (userCompanyId !== targetCompanyId) {
    console.log(`❌ Company mismatch: user company ${userCompanyId} !== target company ${targetCompanyId}`);
    return false;
  }

  // All roles (OWNER, ADMIN, AGENT) can access their own company's data
  console.log(`✅ Access granted: user belongs to target company`);
  return true;
}

export function canManageSettings(userRole: Role): boolean {
  return hasRole(userRole, Role.ADMIN);
}

export function canManageUsers(userRole: Role): boolean {
  return hasRole(userRole, Role.ADMIN);
}
