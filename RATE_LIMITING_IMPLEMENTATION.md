# 🛡️ Rate Limiting Implementation Guide

## 📋 Overview

Comprehensive rate limiting solution to protect against:
- 🔐 **Brute force attacks** on login endpoints
- 📨 **API spam/abuse** on message sending
- 🌊 **Webhook flooding**
- 💥 **DDoS attempts**

---

## 🎯 Features

### ✅ Multi-Tier Rate Limiting
- **Authentication endpoints**: 5 attempts per 15 minutes
- **API reads**: 100 requests per minute
- **API writes**: 30 requests per minute
- **Message sending**: 60 messages per minute
- **File uploads**: 10 uploads per hour
- **Webhooks**: 1000 webhooks per minute
- **Dashboard**: 50 requests per minute

### ✅ Smart Identification
- User-based limits (when authenticated)
- IP-based limits (when unauthenticated)
- Supports proxies and load balancers
- Handles X-Forwarded-For, X-Real-IP, CF-Connecting-IP

### ✅ Whitelist & Blacklist
- **Whitelist**: Bypass rate limits (for trusted IPs/users)
- **Blacklist**: Always block (for malicious IPs/users)
- **Auto-blacklist**: After 10 violations in 24 hours

### ✅ Monitoring & Logging
- Tracks violations with timestamps
- Stores last 1000 violations
- Real-time statistics dashboard
- Auto-escalation for repeated offenders

### ✅ Graceful Handling
- Fail-open if Redis is unavailable
- Proper HTTP 429 responses
- Retry-After headers
- Clear error messages

---

## 🚀 Installation

### Step 1: The rate limiting library is already created
✅ `src/lib/rate-limit.ts` - Complete implementation

### Step 2: No additional packages needed
✅ Uses existing `ioredis` and `redis` dependencies

---

## 💻 Usage Examples

### 1. Protect Login Endpoints

**File:** `src/app/api/auth/login/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Check rate limit BEFORE processing login
  const rateLimitResult = await withRateLimit(request, "AUTH_LOGIN");
  
  // If rate limited, return 429 response
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult;
  }
  
  try {
    // Your existing login logic here
    const { email, password } = await request.json();
    
    // ... authentication logic ...
    
    const user = { id: "123", email };
    
    // Return success with rate limit headers
    return createRateLimitResponse(
      { success: true, user },
      rateLimitResult
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Login failed" },
      { status: 401 }
    );
  }
}
```

### 2. Protect Message Send Endpoint

**File:** `src/app/api/messages/send/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Get session for user-based rate limiting
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Check rate limit with user ID (more accurate than IP)
  const rateLimitResult = await withRateLimit(
    request,
    "API_MESSAGE_SEND",
    session.user.id
  );
  
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult;
  }
  
  try {
    // Your existing message send logic
    const { conversationId, content } = await request.json();
    
    // ... send message logic ...
    
    return createRateLimitResponse(
      { success: true, messageId: "msg_123" },
      rateLimitResult
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
```

### 3. Protect Webhook Endpoints

**File:** `src/app/api/webhook/facebook/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Check rate limit for webhooks (high limit but still protected)
  const rateLimitResult = await withRateLimit(request, "WEBHOOK");
  
  if (rateLimitResult instanceof NextResponse) {
    console.warn("⚠️ Webhook rate limited - possible attack");
    return rateLimitResult;
  }
  
  try {
    // Verify webhook signature first (additional security)
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifySignature(signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    
    // Process webhook
    const payload = await request.json();
    
    // ... webhook processing logic ...
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
```

### 4. Protect File Upload

**File:** `src/app/api/settings/profile/photo/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Very strict rate limit for file uploads
  const rateLimitResult = await withRateLimit(
    request,
    "FILE_UPLOAD",
    session.user.id
  );
  
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult;
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File;
    
    // ... file upload logic ...
    
    return createRateLimitResponse(
      { success: true, url: "https://..." },
      rateLimitResult
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
```

### 5. Protect Dashboard Stats

**File:** `src/app/api/dashboard/stats/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Check rate limit
  const rateLimitResult = await withRateLimit(
    request,
    "DASHBOARD",
    session.user.id
  );
  
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult;
  }
  
  try {
    // ... fetch dashboard stats ...
    
    const stats = { /* ... */ };
    
    return createRateLimitResponse(stats, rateLimitResult);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
```

---

## 🔧 Admin Management API

Create admin endpoints to manage rate limiting:

**File:** `src/app/api/admin/rate-limit/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getRateLimitStats,
  resetRateLimit,
  addToWhitelist,
  removeFromWhitelist,
  addToBlacklist,
  removeFromBlacklist,
} from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Only OWNER can access
  if (session?.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  
  const stats = await getRateLimitStats();
  return NextResponse.json(stats);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  
  const { action, identifier, limitType } = await request.json();
  
  try {
    switch (action) {
      case "reset":
        await resetRateLimit(identifier, limitType);
        return NextResponse.json({ success: true, message: "Rate limit reset" });
        
      case "whitelist_add":
        await addToWhitelist(identifier);
        return NextResponse.json({ success: true, message: "Added to whitelist" });
        
      case "whitelist_remove":
        await removeFromWhitelist(identifier);
        return NextResponse.json({ success: true, message: "Removed from whitelist" });
        
      case "blacklist_add":
        await addToBlacklist(identifier);
        return NextResponse.json({ success: true, message: "Added to blacklist" });
        
      case "blacklist_remove":
        await removeFromBlacklist(identifier);
        return NextResponse.json({ success: true, message: "Removed from blacklist" });
        
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Operation failed" },
      { status: 500 }
    );
  }
}
```

---

## 📊 Rate Limit Configuration

All limits are defined in `src/lib/rate-limit.ts`:

```typescript
export const RATE_LIMITS = {
  AUTH_LOGIN: {
    points: 5,           // Max 5 attempts
    duration: 900,       // Per 15 minutes
    blockDuration: 1800, // Block for 30 minutes
  },
  // ... other limits
};
```

**To adjust limits:**
1. Edit `RATE_LIMITS` object
2. Restart application
3. No Redis flush needed (new limits apply immediately)

---

## 🎛️ Admin Dashboard Component

**File:** `src/app/dashboard/admin/rate-limit/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RateLimitAdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [identifier, setIdentifier] = useState("");
  
  useEffect(() => {
    fetchStats();
  }, []);
  
  const fetchStats = async () => {
    const response = await fetch("/api/admin/rate-limit");
    const data = await response.json();
    setStats(data);
  };
  
  const handleAction = async (action: string) => {
    await fetch("/api/admin/rate-limit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, identifier }),
    });
    
    setIdentifier("");
    fetchStats();
  };
  
  if (!stats) return <div>Loading...</div>;
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Rate Limit Management</h1>
      
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.violationCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Whitelisted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.whitelistCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Blacklisted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats.blacklistCount}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Identifier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter IP or user:123"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          
          <div className="flex gap-2">
            <Button onClick={() => handleAction("reset")}>
              Reset Limits
            </Button>
            <Button onClick={() => handleAction("whitelist_add")}>
              Add to Whitelist
            </Button>
            <Button onClick={() => handleAction("blacklist_add")} variant="destructive">
              Add to Blacklist
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Violations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Violations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.recentViolations.slice(0, 10).map((v: any, i: number) => (
              <div key={i} className="p-2 border rounded">
                <div className="font-mono text-sm">{v.identifier}</div>
                <div className="text-xs text-gray-500">
                  {v.limitType} - {v.attempts} attempts - {v.timestamp}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Blacklist */}
      {stats.blacklist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Blacklisted Identifiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.blacklist.map((id: string) => (
                <div key={id} className="flex justify-between items-center p-2 border rounded">
                  <span className="font-mono text-sm">{id}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await fetch("/api/admin/rate-limit", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "blacklist_remove", identifier: id }),
                      });
                      fetchStats();
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## 🧪 Testing

### Test Rate Limiting

**Create:** `scripts/test-rate-limit.js`

```javascript
const axios = require('axios');

async function testRateLimit() {
  const endpoint = 'http://localhost:3000/api/dashboard/stats';
  
  console.log('Testing rate limit on', endpoint);
  console.log('Limit: 50 requests per minute\n');
  
  for (let i = 1; i <= 60; i++) {
    try {
      const response = await axios.get(endpoint);
      const remaining = response.headers['x-ratelimit-remaining'];
      const limit = response.headers['x-ratelimit-limit'];
      
      console.log(`Request ${i}: ✅ Success (${remaining}/${limit} remaining)`);
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        console.log(`Request ${i}: ⛔ Rate Limited (retry after ${retryAfter}s)`);
        console.log('Rate limiting is working! 🎉');
        break;
      } else {
        console.error(`Request ${i}: ❌ Error`, error.message);
      }
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

testRateLimit();
```

**Run:**
```bash
node scripts/test-rate-limit.js
```

---

## 📈 Monitoring Alerts

Set up alerts for suspicious activity:

```typescript
// Add to rate-limit.ts
async function checkForAttack(identifier: string, violationCount: number) {
  if (violationCount >= 5) {
    // Send alert to admins
    console.error(`🚨 POTENTIAL ATTACK: ${identifier} - ${violationCount} violations`);
    
    // Could integrate with:
    // - Email notifications
    // - Slack webhooks
    // - PagerDuty
    // - Datadog
  }
}
```

---

## 🎯 Best Practices

### ✅ DO:
- ✅ Use user ID for authenticated requests (more accurate)
- ✅ Return proper 429 status codes
- ✅ Include Retry-After headers
- ✅ Log violations for security monitoring
- ✅ Whitelist known good IPs (office, servers)
- ✅ Test rate limits in staging first

### ❌ DON'T:
- ❌ Don't rate limit health check endpoints
- ❌ Don't rate limit static assets
- ❌ Don't block internal service-to-service calls
- ❌ Don't make limits too restrictive (test first)
- ❌ Don't forget to monitor Redis performance

---

## 🚀 Deployment Checklist

- [ ] Redis is running and accessible
- [ ] Environment variables configured
- [ ] Rate limits tested in staging
- [ ] Admin dashboard accessible
- [ ] Monitoring/alerts configured
- [ ] Whitelist configured for trusted IPs
- [ ] Documentation updated
- [ ] Team trained on admin tools

---

## 📞 Troubleshooting

**Redis Connection Issues:**
```typescript
// Check Redis status
await redis.ping(); // Should return "PONG"
```

**Rate Limit Not Working:**
```typescript
// Check if Redis keys are being created
await redis.keys("ratelimit:*");
```

**Too Many False Positives:**
- Increase limits in `RATE_LIMITS` configuration
- Add legitimate IPs to whitelist
- Check for misconfigured proxies

---

## 🎉 Summary

**Implemented:**
✅ Multi-tier rate limiting  
✅ User and IP-based identification  
✅ Whitelist & blacklist  
✅ Auto-blacklisting  
✅ Violation logging  
✅ Admin management API  
✅ Graceful failure handling  

**Protected Endpoints:**
✅ Login (5/15min)  
✅ API reads (100/min)  
✅ API writes (30/min)  
✅ Message send (60/min)  
✅ File upload (10/hour)  
✅ Webhooks (1000/min)  
✅ Dashboard (50/min)  

**Your application is now protected against brute force, spam, and DDoS attacks!** 🛡️
