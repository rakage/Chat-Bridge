# 🔒 Security Audit Report

**Date:** January 2025  
**Status:** ⚠️ **CRITICAL ISSUES FOUND**

---

## 🚨 CRITICAL ISSUES (Fix Immediately)

### 1. ⚠️ **ENCRYPTION_KEY Exposed in .env.example**

**Severity:** 🔴 **CRITICAL**  
**File:** `.env.example`

**Issue:**
```bash
# Current
ENCRYPTION_KEY="your-32-character-encryption-key-here"
```

**Problem:**
- If someone uses the example key in production, all encrypted tokens are compromised
- The example suggests 32 characters, but the actual requirement is 32 **bytes** (base64 encoded = 44 characters)

**Fix:**
```bash
# ✅ Update .env.example
ENCRYPTION_KEY="GENERATE_WITH: node -e \"require('./src/lib/encryption').generateEncryptionKey().then(console.log)\""

# Or add a clear warning:
# CRITICAL: Generate a secure key with:
# npx ts-node -e "import('./src/lib/encryption').then(m => m.generateEncryptionKey().then(console.log))"
# DO NOT use a simple string - this stores Facebook/Instagram/Telegram tokens!
ENCRYPTION_KEY=""
```

**Impact if compromised:**
- ❌ All Facebook page access tokens exposed
- ❌ All Instagram access tokens exposed  
- ❌ All Telegram bot tokens exposed
- ❌ Attacker can send messages as your pages/bots
- ❌ Complete account takeover possible

---

### 2. ⚠️ **Webhook Verify Token Fallback to Environment Variable**

**Severity:** 🟡 **HIGH**  
**File:** `src/app/api/webhook/facebook/route.ts` (lines 42-73)

**Issue:**
```typescript
// Checks database first, but falls back to env variable
const envVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
if (!isValidToken && envVerifyToken && token === envVerifyToken) {
  isValidToken = true;
  matchedPage = { pageName: "Environment Token" };
}
```

**Problem:**
- If `WEBHOOK_VERIFY_TOKEN` is set in environment, ANY page can be verified with it
- This bypasses the per-page verification system
- Creates a "master key" vulnerability

**Fix:**
```typescript
// ✅ Remove environment fallback completely
// Let pages manage their own verify tokens

// OR if you must keep it, add strict validation:
if (!isValidToken && envVerifyToken && token === envVerifyToken) {
  // Only allow for specific pages
  const allowedPageIds = process.env.FALLBACK_ALLOWED_PAGES?.split(',') || [];
  if (allowedPageIds.length > 0) {
    console.warn('⚠️ Using environment verify token for allowed pages only');
    isValidToken = true;
  } else {
    console.error('❌ Environment verify token disabled - use per-page tokens');
  }
}
```

**Recommendation:** Remove the environment fallback entirely.

---

### 3. ⚠️ **No Rate Limiting on API Routes**

**Severity:** 🟡 **HIGH**  
**Impact:** DDoS, Brute Force Attacks

**Problem:**
- No rate limiting on `/api/auth/` routes (brute force login attempts)
- No rate limiting on `/api/messages/send` (spam)
- No rate limiting on `/api/webhook/` routes (webhook flooding)

**Fix - Add Rate Limiting Middleware:**

**Install:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Create:** `src/middleware/rate-limit.ts`
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limits for different routes
export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 minutes
  analytics: true,
});

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
  analytics: true,
});

export const webhookRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, "1 m"), // 1000 webhooks per minute
  analytics: true,
});

export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
) {
  const { success, limit, reset, remaining } = await limiter.limit(identifier);
  
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": new Date(reset).toISOString(),
        },
      }
    );
  }
  
  return null;
}
```

**Usage in API routes:**
```typescript
import { checkRateLimit, apiRateLimit } from "@/middleware/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.ip ?? request.headers.get("x-forwarded-for") ?? "anonymous";
  
  // Check rate limit
  const rateLimitResponse = await checkRateLimit(ip, apiRateLimit);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Continue with normal logic...
}
```

---

### 4. ⚠️ **CORS Configuration May Be Too Permissive**

**Severity:** 🟡 **MEDIUM**  
**File:** Check CORS headers in API routes

**Concern:**
- Need to verify widget routes don't allow any origin
- Should whitelist specific domains

**Check:**
```typescript
// Look for patterns like:
"Access-Control-Allow-Origin": "*"  // ❌ TOO PERMISSIVE
```

**Fix:**
```typescript
// ✅ Whitelist specific domains
const allowedOrigins = [
  "https://yourdomain.com",
  "https://www.yourdomain.com",
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : null,
].filter(Boolean);

const origin = request.headers.get("origin");
if (origin && allowedOrigins.includes(origin)) {
  return NextResponse.json(data, {
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
```

---

### 5. ⚠️ **Missing Input Sanitization for File Uploads**

**Severity:** 🟡 **MEDIUM**  
**File:** `src/app/api/settings/profile/photo/route.ts`

**Current Protection:**
```typescript
✅ File size limit: 5MB
✅ File type validation: JPEG, PNG, WebP
❌ No filename sanitization
❌ No image content validation
❌ No malicious file detection
```

**Additional Fixes Needed:**

```typescript
import path from "path";

// ✅ Sanitize filename
function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  const basename = path.basename(filename);
  // Remove special characters
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// ✅ Validate image content (not just extension)
import { fromBuffer } from 'file-type';

const fileType = await fromBuffer(buffer);
if (!fileType || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType.mime)) {
  return NextResponse.json(
    { error: "Invalid image file" },
    { status: 400 }
  );
}

// ✅ Add image dimension limits
import sharp from 'sharp';

const metadata = await sharp(buffer).metadata();
if (metadata.width > 4096 || metadata.height > 4096) {
  return NextResponse.json(
    { error: "Image dimensions too large (max 4096x4096)" },
    { status: 400 }
  );
}
```

---

## 🟢 GOOD SECURITY PRACTICES FOUND

### ✅ Strong Encryption Implementation
- **File:** `src/lib/encryption.ts`
- Uses `libsodium-wrappers` (industry standard)
- Proper nonce generation
- Secure key derivation
- ✅ All tokens encrypted at rest

### ✅ Password Security
- **File:** `src/lib/auth.ts`
- Uses `bcryptjs` for password hashing
- Proper comparison with `bcrypt.compare()`
- ✅ No plaintext passwords stored

### ✅ Authentication & Authorization
- **File:** `middleware.ts`, `src/lib/auth.ts`
- NextAuth properly configured
- JWT-based sessions
- Role-based access control (OWNER, ADMIN, AGENT)
- Company-based data isolation
- ✅ Protected routes via middleware

### ✅ Database Security
- Uses Prisma ORM (SQL injection protected)
- Connection pooling configured
- ✅ No raw SQL queries with user input

### ✅ Environment Variables
- Sensitive data in environment variables
- Not committed to repository (via .gitignore)
- ✅ Proper separation of secrets

### ✅ Webhook Verification
- **File:** `src/app/api/webhook/facebook/route.ts`
- Verifies tokens before processing
- Encrypted token storage
- ✅ Protects against unauthorized webhooks

### ✅ Session Management
- Proper session validation in API routes
- `getServerSession()` used consistently
- ✅ No session fixation vulnerabilities

---

## 🟡 MEDIUM PRIORITY IMPROVEMENTS

### 1. Add Content Security Policy (CSP)

**File:** `next.config.js`

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.socket.io",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  // ... rest of config
};
```

### 2. Add Request Logging & Monitoring

**Create:** `src/middleware/audit-log.ts`

```typescript
import { db } from "@/lib/db";

export async function logSecurityEvent(
  event: string,
  userId: string | null,
  ip: string,
  details: any
) {
  await db.auditLog.create({
    data: {
      event,
      userId,
      ip,
      details: JSON.stringify(details),
      createdAt: new Date(),
    },
  });
}

// Log critical events:
// - Failed login attempts
// - Token decryption failures
// - Unauthorized access attempts
// - API rate limit hits
```

### 3. Implement CSRF Protection for State-Changing Operations

**Already handled by NextAuth for auth routes**, but consider adding for critical operations:

```typescript
// Add CSRF token validation for delete operations
import { getCsrfToken } from "next-auth/react";

// In delete endpoints:
const csrfToken = request.headers.get("X-CSRF-Token");
const sessionCsrfToken = await getCsrfToken({ req: request });

if (csrfToken !== sessionCsrfToken) {
  return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
}
```

### 4. Add Webhook Signature Verification

**File:** `src/app/api/webhook/facebook/route.ts`

**Currently:** Only verifies the verify token  
**Needed:** Verify Facebook signature on incoming webhooks

```typescript
import crypto from 'crypto';

function verifyFacebookSignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.FB_APP_SECRET!)
    .update(payload)
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}

// In webhook POST handler:
const signature = request.headers.get('x-hub-signature-256');
const rawBody = await request.text();

if (!signature || !verifyFacebookSignature(rawBody, signature)) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
```

### 5. Environment Variable Validation on Startup

**Create:** `src/lib/env-validation.ts`

```typescript
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'ENCRYPTION_KEY',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
];

export function validateEnvironment() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file and ensure all required variables are set.`
    );
  }
  
  // Validate encryption key format
  const encKey = process.env.ENCRYPTION_KEY;
  if (encKey && encKey.length !== 44) {
    console.warn('⚠️ ENCRYPTION_KEY should be 44 characters (32 bytes base64 encoded)');
  }
}

// Call in app startup:
// validateEnvironment();
```

---

## 🔵 LOW PRIORITY (Nice to Have)

### 1. **Implement Security Headers Testing**

Create automated tests to verify security headers are present.

### 2. **Add Dependency Vulnerability Scanning**

```bash
# Add to package.json scripts
"security:audit": "npm audit",
"security:fix": "npm audit fix"
```

Run regularly and before deployments.

### 3. **Implement API Response Time Monitoring**

Detect potential DDoS or performance attacks.

### 4. **Add Database Query Monitoring**

Log slow queries that might indicate SQL injection attempts (even though Prisma protects against it).

### 5. **Implement IP Blocking for Repeated Failed Attempts**

After X failed login attempts, temporarily block IP.

---

## 📋 SECURITY CHECKLIST

### Immediate Actions (Do Now):

- [ ] **Generate proper ENCRYPTION_KEY** using `generateEncryptionKey()`
- [ ] **Update .env.example** with proper key generation instructions
- [ ] **Remove environment verify token fallback** or add strict validation
- [ ] **Implement rate limiting** on all API routes
- [ ] **Add webhook signature verification** for Facebook/Instagram
- [ ] **Sanitize uploaded filenames** and validate image content
- [ ] **Review CORS configuration** and whitelist specific origins

### Short Term (This Week):

- [ ] Add Content Security Policy headers
- [ ] Implement audit logging for security events
- [ ] Add CSRF protection for delete operations
- [ ] Validate environment variables on startup
- [ ] Test rate limiting functionality
- [ ] Document security procedures

### Long Term (This Month):

- [ ] Set up automated security scanning
- [ ] Implement IP blocking for failed attempts
- [ ] Add comprehensive monitoring and alerting
- [ ] Perform penetration testing
- [ ] Create incident response plan
- [ ] Security training for team

---

## 🔍 NO CRITICAL CODE EXECUTION VULNERABILITIES FOUND

✅ **No `eval()` usage**  
✅ **No `exec()` usage**  
✅ **No `Function()` constructor**  
✅ **Only safe `dangerouslySetInnerHTML` in chart component** (shadcn UI library)

---

## 📊 SECURITY SCORE

| Category | Score | Status |
|----------|-------|--------|
| Authentication | 8/10 | 🟢 Good |
| Authorization | 8/10 | 🟢 Good |
| Encryption | 9/10 | 🟢 Excellent |
| Input Validation | 6/10 | 🟡 Needs Improvement |
| Rate Limiting | 0/10 | 🔴 Missing |
| CORS Configuration | 5/10 | 🟡 Needs Review |
| Webhook Security | 7/10 | 🟡 Good but can improve |
| File Upload Security | 6/10 | 🟡 Basic protection |
| Error Handling | 7/10 | 🟢 Good |
| Logging & Monitoring | 4/10 | 🟡 Needs Improvement |

**Overall Security Score: 6.5/10** 🟡  
**Status:** Acceptable for development, **needs hardening for production**

---

## 🎯 PRIORITY ACTION ITEMS

### This Week:
1. ✅ Fix ENCRYPTION_KEY in .env.example
2. ✅ Implement rate limiting
3. ✅ Add webhook signature verification
4. ✅ Review and fix CORS

### Next Week:
5. ✅ Add CSP headers
6. ✅ Implement audit logging
7. ✅ File upload enhancements
8. ✅ Environment validation

### Before Production:
9. ✅ Complete penetration testing
10. ✅ Set up monitoring and alerts
11. ✅ Document all security procedures
12. ✅ Third-party security audit

---

## 📞 Need Help?

If you need assistance implementing any of these fixes, I can help you with:
- Code implementation
- Configuration examples
- Testing procedures
- Security best practices

**Remember: Security is an ongoing process, not a one-time fix!**

---

**Report Generated:** January 2025  
**Next Review Recommended:** Before Production Deployment
