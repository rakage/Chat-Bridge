# Domain Whitelist Feature - Complete Guide

## Overview
The Domain Whitelist feature allows you to control where your chat widget appears by specifying which domains are allowed to display it. This gives you granular control over widget visibility and prevents unauthorized usage.

---

## ✨ Key Features

### 1. **Flexible Domain Matching**
- ✅ Exact domain match: `https://example.com`
- ✅ Protocol-independent: `example.com` (works with http and https)
- ✅ Wildcard subdomains: `*.example.com`
- ✅ Localhost support: `localhost` for development
- ✅ Multiple domains: Add as many as needed

### 2. **SPA Support** (Single Page Applications)
- ✅ Detects URL changes in React, Vue, Angular apps
- ✅ Re-validates on navigation
- ✅ Works with hash-based routing
- ✅ Supports back/forward browser buttons

### 3. **Security**
- ✅ Server-side configuration (users can't bypass)
- ✅ Client-side validation for performance
- ✅ Clear error messages in console
- ✅ Automatic widget hiding on unauthorized domains

---

## 🎯 Use Cases

### 1. **Prevent Checkout Distraction**
Don't show the widget during payment:
```
Allowed Domains:
- https://example.com (show everywhere)

But widget can be programmatically hidden on specific pages
```

### 2. **Multi-Domain Setup**
Use widget across multiple sites:
```
Allowed Domains:
- https://example.com
- https://shop.example.com
- https://support.example.com
```

### 3. **Development & Production**
Support different environments:
```
Allowed Domains:
- localhost (development)
- https://staging.example.com (staging)
- https://example.com (production)
```

### 4. **Subdomain Wildcards**
Allow all subdomains:
```
Allowed Domains:
- *.example.com (matches: shop.example.com, blog.example.com, etc.)
```

### 5. **Restrict to Specific Sites**
Only show on certain domains:
```
Allowed Domains:
- https://example.com
- https://anotherdomain.com

Widget won't appear on any other domains
```

---

## 📋 How to Use

### Step 1: Navigate to Chat Widget Settings
1. Go to Dashboard
2. Click **"Integrations"**
3. Click **"Chat Widget"**

### Step 2: Configure Allowed Domains
1. Scroll to **"Allowed Domains"** section
2. Click **"Add Domain"** button
3. Enter your domain (see examples below)
4. Repeat for additional domains
5. Click **"Save Configuration"**

### Step 3: Test
1. Copy the embed code
2. Install on your website
3. Open browser console (F12)
4. Look for success/error messages

---

## 📝 Domain Format Examples

### ✅ Correct Formats

| Input | Matches | Notes |
|-------|---------|-------|
| `https://example.com` | Only `https://example.com` | Exact match with protocol |
| `example.com` | `http://example.com`<br>`https://example.com` | Protocol-independent |
| `*.example.com` | `shop.example.com`<br>`blog.example.com`<br>`any.example.com` | All subdomains |
| `localhost` | `http://localhost:3000`<br>`http://127.0.0.1:3000` | Local development |

### ❌ Invalid Formats

| Input | Issue | Fix |
|-------|-------|-----|
| `www.example.com/path` | Paths not supported | Use `www.example.com` |
| `example.com:3000` | Port specific | Use `example.com` |
| `192.168.1.1` | IP addresses need localhost | Use `localhost` |

---

## 🔍 How It Works

### Architecture

```
Customer Website (example.com)
    ↓ Loads widget
Widget.js
    ↓ Fetches config
API: /api/widget/config/public
    ↓ Returns config with allowedDomains
Widget checks current domain
    ↓ Matches allowed domains?
    ├─ YES → Show widget ✅
    └─ NO  → Hide widget ❌
```

### Domain Matching Logic

```javascript
// 1. No domains configured = Allow all
if (allowedDomains.length === 0) {
  showWidget();
}

// 2. Check each allowed domain
allowedDomains.forEach(domain => {
  // Exact origin match
  if (domain === 'https://example.com') { ... }
  
  // Hostname match (protocol-independent)
  if (domain === 'example.com') { ... }
  
  // Wildcard subdomain
  if (domain === '*.example.com') { ... }
  
  // Localhost
  if (domain === 'localhost') { ... }
});

// 3. Show or hide widget
if (matched) {
  showWidget();
} else {
  hideWidget();
  console.warn('Domain not allowed');
}
```

### SPA Detection

```javascript
// Intercept navigation
history.pushState = (original) => {
  original();
  checkDomainWhitelist(); // Re-validate
};

// Listen to URL changes
window.addEventListener('popstate', checkDomainWhitelist);
window.addEventListener('hashchange', checkDomainWhitelist);
```

---

## 🚨 Troubleshooting

### Issue: Widget Not Appearing

**Problem:** Widget doesn't show on your website

**Check:**
1. Open browser console (F12)
2. Look for this message:
   ```
   [ChatWidget] Domain not allowed. Current domain: https://yoursite.com
   [ChatWidget] Allowed domains: ["example.com"]
   ```

**Solution:**
- Go to Dashboard → Chat Widget → Allowed Domains
- Add your actual domain (`yoursite.com`)
- Save configuration
- Refresh your website

### Issue: Widget Shows on Wrong Domain

**Problem:** Widget appears on a domain you don't own

**Solution:**
- Add domains to whitelist
- Widget will only show on those domains
- Remove from embed code on unauthorized sites

### Issue: Wildcard Not Working

**Problem:** `*.example.com` doesn't match `shop.example.com`

**Check:**
- Make sure format is exact: `*.example.com` (with asterisk and dot)
- Not `*example.com` or `*.*.example.com`

**Solution:**
```
✅ Correct: *.example.com
❌ Wrong: *example.com
❌ Wrong: **.example.com
```

### Issue: Localhost Not Working

**Problem:** Widget doesn't show in development

**Solution:**
```
Add to allowed domains:
- localhost

This will match:
- http://localhost:3000
- http://localhost:8080
- http://127.0.0.1:3000
```

---

## 🎨 Dashboard UI

### Empty State
```
╔═══════════════════════════════════════╗
║ Allowed Domains                       ║
║                                       ║
║ Restrict where the widget can be      ║
║ displayed. Leave empty to allow all   ║
║ domains.                              ║
║                                       ║
║ ┌───────────────────────────────────┐ ║
║ │ No restrictions - widget will     │ ║
║ │ work on any domain                │ ║
║ └───────────────────────────────────┘ ║
║                                       ║
║ [ + Add Domain ]                      ║
╚═══════════════════════════════════════╝
```

### With Domains
```
╔═══════════════════════════════════════╗
║ Allowed Domains                       ║
║                                       ║
║ ┌────────────────────────────┬─────┐ ║
║ │ https://example.com        │ [X] │ ║
║ └────────────────────────────┴─────┘ ║
║                                       ║
║ ┌────────────────────────────┬─────┐ ║
║ │ *.example.com              │ [X] │ ║
║ └────────────────────────────┴─────┘ ║
║                                       ║
║ ┌────────────────────────────┬─────┐ ║
║ │ localhost                  │ [X] │ ║
║ └────────────────────────────┴─────┘ ║
║                                       ║
║ [ + Add Domain ]                      ║
║                                       ║
║ ┌─────────────────────────────────┐  ║
║ │ Examples:                        │  ║
║ │ • https://example.com            │  ║
║ │ • example.com                    │  ║
║ │ • *.example.com                  │  ║
║ │ • localhost                      │  ║
║ └─────────────────────────────────┘  ║
╚═══════════════════════════════════════╝
```

---

## 🔧 Technical Implementation

### Database Schema
```prisma
model WidgetConfig {
  id                String         @id @default(cuid())
  companyId         String         @unique
  allowedDomains    String[]       @default([])  // ← Domain whitelist
  // ... other fields
}
```

### API Response
```json
// GET /api/widget/config/public?companyId=abc123
{
  "config": {
    "primaryColor": "#2563eb",
    "welcomeMessage": "Hi! How can we help?",
    "allowedDomains": [
      "https://example.com",
      "*.example.com",
      "localhost"
    ]
  }
}
```

### Widget Logic
```javascript
class ChatWidget {
  checkDomainWhitelist() {
    const allowedDomains = this.config.allowedDomains || [];
    
    // No restrictions
    if (allowedDomains.length === 0) {
      this.showWidget();
      return;
    }
    
    const currentOrigin = window.location.origin;
    const currentHostname = window.location.hostname;
    
    const isAllowed = allowedDomains.some(domain => {
      // Exact match
      if (domain === currentOrigin) return true;
      
      // Hostname match
      if (domain === currentHostname) return true;
      
      // Wildcard
      if (domain.startsWith('*.')) {
        const baseDomain = domain.slice(2);
        if (currentHostname.endsWith(baseDomain)) return true;
      }
      
      // Localhost
      if (domain === 'localhost' && 
          (currentHostname === 'localhost' || 
           currentHostname === '127.0.0.1')) {
        return true;
      }
      
      return false;
    });
    
    if (isAllowed) {
      this.showWidget();
    } else {
      this.hideWidget();
      console.warn('[ChatWidget] Domain not allowed');
    }
  }
}
```

---

## 📊 Comparison with Chatbase

| Feature | Our Implementation | Chatbase |
|---------|-------------------|----------|
| Domain Matching | ✅ Full support | ✅ Full support |
| Wildcard Subdomains | ✅ Yes | ❓ Unknown |
| SPA Support | ✅ Yes | ✅ Yes |
| Path-based Rules | ❌ Not yet | ✅ Yes (regex) |
| Mobile-only Rules | ❌ Not yet | ✅ Yes |
| UI Simplicity | ✅ Very simple | ⚠️ Complex |

### What We Have
- ✅ Domain-level control
- ✅ Subdomain wildcards
- ✅ SPA detection
- ✅ Clear error messages
- ✅ Simple UI

### What We Could Add (Future)
- ⏭️ Path-based rules (regex patterns)
- ⏭️ Mobile-only visibility
- ⏭️ Time-based visibility
- ⏭️ Geo-based rules

---

## 🚀 Best Practices

### 1. **Start with No Restrictions**
```
Initial setup:
- Leave allowed domains empty
- Test widget on your site
- Once working, add restrictions
```

### 2. **Always Include Localhost**
```
For developers:
- Add "localhost" to allowed domains
- Enables local testing
- Production domains work separately
```

### 3. **Use Wildcards for Multi-Subdomain**
```
Instead of:
- shop.example.com
- blog.example.com
- support.example.com

Use:
- *.example.com
```

### 4. **Test on Staging First**
```
1. Add staging domain
2. Test widget visibility
3. Test navigation (SPA)
4. Add production domain
```

### 5. **Monitor Console Logs**
```javascript
// Check browser console for:
[ChatWidget] Domain not allowed. Current domain: https://...
[ChatWidget] Allowed domains: [...]

// Or success:
[ChatWidget] Domain allowed ✅
```

---

## 🎯 Migration from Chatbase

If migrating from Chatbase:

1. **Map Their Path Rules to Domains**
   - Chatbase: Regex path patterns
   - Ours: Domain-level control
   - Solution: Configure per-domain instead

2. **No Mobile-Only Yet**
   - Chatbase: Has mobile-only rules
   - Ours: Not yet implemented
   - Workaround: Use CSS media queries

3. **Simpler Configuration**
   - Less complex than Chatbase
   - More straightforward for users
   - Better error messages

---

## 📈 Future Enhancements

### Phase 2 (Potential)
```json
{
  "allowedPaths": [
    {
      "domain": "example.com",
      "paths": ["^/support.*", "^/pricing.*"],
      "mobileOnly": false
    }
  ]
}
```

### Phase 3 (Potential)
```json
{
  "visibilityRules": [
    {
      "domain": "example.com",
      "paths": ["^/support.*"],
      "timeRange": ["09:00", "17:00"],
      "geoRestrict": ["US", "CA"]
    }
  ]
}
```

---

## ✅ Summary

**Domain Whitelist feature gives you:**
- ✅ Control over widget visibility
- ✅ Security against unauthorized usage
- ✅ Flexibility for multi-domain setups
- ✅ SPA support for modern apps
- ✅ Simple, user-friendly configuration

**Compatible with Chatbase's approach:**
- ✅ Similar domain checking logic
- ✅ SPA navigation detection
- ✅ Server-side configuration
- ➕ Cleaner, simpler UI

**Ready for production:**
- ✅ Database column exists
- ✅ API endpoint updated
- ✅ Dashboard UI complete
- ✅ Widget logic implemented
- ✅ SPA support added
- ✅ Documentation complete

---

## 🆘 Support

**If widget doesn't appear:**
1. Check browser console (F12)
2. Look for domain error messages
3. Verify domain in settings matches current URL
4. Try empty allowed domains (allows all)

**If issues persist:**
1. Check CORS configuration
2. Verify widget.js is loading
3. Check network tab for API errors
4. Contact support with console logs

---

**Need help?** Check the troubleshooting section or contact support with:
- Current domain where widget should appear
- Configured allowed domains
- Browser console logs (F12)
