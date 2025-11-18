# Domain Whitelist - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Open Dashboard (30 seconds)
```
1. Go to your dashboard
2. Click "Integrations"
3. Click "Chat Widget"
4. Scroll to "Allowed Domains" section
```

### Step 2: Add Your Domains (2 minutes)
```
Click "+ Add Domain" and enter:

For production:
✅ https://yourdomain.com
   or
✅ yourdomain.com

For development:
✅ localhost

For subdomains:
✅ *.yourdomain.com
```

### Step 3: Save & Test (2 minutes)
```
1. Click "Save Configuration"
2. Go to your website
3. Widget should appear ✅
4. If not, check console (F12)
```

---

## 📝 Common Configurations

### Single Domain (Production Only)
```
Allowed Domains:
- https://example.com
```
**Result:** Widget only works on example.com

---

### Multi-Environment
```
Allowed Domains:
- localhost
- https://staging.example.com
- https://example.com
```
**Result:** Works on dev, staging, and production

---

### All Subdomains
```
Allowed Domains:
- *.example.com
```
**Result:** Works on shop.example.com, blog.example.com, etc.

---

### Multiple Separate Domains
```
Allowed Domains:
- https://example.com
- https://anotherdomain.com
- https://thirddomain.com
```
**Result:** Works on all three domains

---

### No Restrictions (Default)
```
Allowed Domains:
(empty - no domains added)
```
**Result:** Widget works everywhere

---

## 🐛 Quick Troubleshooting

### Widget Not Showing?
1. **Open Browser Console** (Press F12)
2. **Look for error:**
   ```
   [ChatWidget] Domain not allowed. Current domain: https://yoursite.com
   [ChatWidget] Allowed domains: ["example.com"]
   ```
3. **Fix:** Add `yoursite.com` to allowed domains
4. **Save and refresh page**

---

### Wrong Domain in List?
1. **Check spelling** - `example.com` vs `exampl.com`
2. **Check protocol** - Use `example.com` not `https://example.com` for flexibility
3. **Remove and re-add** if needed

---

### Wildcard Not Working?
**Make sure format is correct:**
- ✅ Correct: `*.example.com`
- ❌ Wrong: `*example.com`
- ❌ Wrong: `**.example.com`

---

## 📋 Domain Format Cheat Sheet

| What You Want | What To Enter | Example |
|---------------|---------------|---------|
| Exact domain | `https://domain.com` | `https://example.com` |
| Flexible (http/https) | `domain.com` | `example.com` |
| All subdomains | `*.domain.com` | `*.example.com` |
| Local dev | `localhost` | `localhost` |
| Subdomain | `sub.domain.com` | `shop.example.com` |

---

## ✅ Best Practice

**Recommended Setup:**
```
1. Start with NO domains (allows all)
2. Test widget works
3. Add specific domains
4. Test again
5. Done! ✅
```

---

## 🎯 Examples for Different Scenarios

### E-Commerce Site
```
Allowed Domains:
- example.com (main site)
- shop.example.com (store)
- checkout.example.com (checkout)
- localhost (testing)
```

### SaaS Platform
```
Allowed Domains:
- *.example.com (all customer subdomains)
- localhost (development)
```

### Marketing Site
```
Allowed Domains:
- example.com (main)
- www.example.com (with www)
- localhost (dev)
```

### Multi-Brand Company
```
Allowed Domains:
- brand1.com
- brand2.com
- brand3.com
- localhost
```

---

## 🔍 Testing Checklist

- [ ] Widget shows on allowed domain
- [ ] Widget hidden on non-allowed domain
- [ ] Console shows correct messages
- [ ] Navigation works (SPA apps)
- [ ] Mobile devices work
- [ ] Localhost works for development

---

## 💡 Pro Tips

1. **Always include `localhost`** for easy development
2. **Use wildcards** for multiple subdomains
3. **Test in incognito** to avoid cache issues
4. **Check console** for helpful error messages
5. **Start permissive** (no restrictions), then tighten

---

## 🆘 Still Having Issues?

1. **Check CORS** - Server must allow widget.js
2. **Check embed code** - Is it correctly placed?
3. **Clear cache** - Hard refresh (Ctrl+Shift+R)
4. **Try empty list** - Remove all domains to test
5. **Browser console** - Always check for errors (F12)

---

## 📱 Contact Support

If you need help:
1. Open browser console (F12)
2. Copy any [ChatWidget] error messages
3. Note your current domain
4. Note configured allowed domains
5. Contact support with this info

---

**That's it!** You now have domain whitelisting set up. 🎉

For detailed documentation, see `DOMAIN_WHITELIST_FEATURE.md`
