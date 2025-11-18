# Production Widget Setup - chatbridge.raka.my.id

## Quick Start

### Embed Code for Your Customers

Your customers should use this code on their websites:

```html
<!-- Load Chat Widget -->
<script src="https://chatbridge.raka.my.id/widget.js"></script>
<script>
  window.chatWidgetConfig = {
    companyId: 'their-company-id'  // You'll provide this to each customer
  };
  new ChatWidget(window.chatWidgetConfig);
</script>
```

That's it! The widget automatically connects to `https://chatbridge.raka.my.id` as the API.

---

## How It Works

### Auto-Detection
1. Widget loads from `https://chatbridge.raka.my.id/widget.js`
2. Widget detects its source URL: `https://chatbridge.raka.my.id`
3. Widget uses that as the API endpoint automatically
4. All API calls go to `https://chatbridge.raka.my.id/api/widget/*`

### WebSocket Connection
- **HTTP**: `https://chatbridge.raka.my.id`
- **WebSocket**: `wss://chatbridge.raka.my.id`
- Both auto-detected and configured

---

## Server Requirements

### 1. Serve widget.js
Make sure `https://chatbridge.raka.my.id/widget.js` is accessible:

```bash
# Test it
curl https://chatbridge.raka.my.id/widget.js
# Should return the JavaScript code
```

### 2. Enable CORS
Your server needs to allow cross-origin requests:

**Next.js (next.config.js):**
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/widget.js',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Or specific domains
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600', // Cache for 1 hour
          },
        ],
      },
    ];
  },
};
```

**Or add CORS middleware for API routes:**
```javascript
// In your API routes
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

### 3. Enable WebSocket (Socket.io)
Make sure Socket.io server is running and accessible:

```javascript
// server.js or similar
const io = require('socket.io')(server, {
  cors: {
    origin: '*', // Or specific domains
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

---

## Security Configuration

### Recommended: Content Security Policy

Tell your customers to add this to their `<head>`:

```html
<meta http-equiv="Content-Security-Policy" content="
  script-src 'self' https://chatbridge.raka.my.id https://cdn.socket.io 'unsafe-inline';
  connect-src 'self' https://chatbridge.raka.my.id wss://chatbridge.raka.my.id;
  img-src 'self' https: data:;
  style-src 'self' 'unsafe-inline';
">
```

### SSL/TLS Certificate
- ✅ Your domain has HTTPS: `https://chatbridge.raka.my.id`
- ✅ Make sure certificate is valid (not self-signed)
- ✅ WebSocket will use `wss://` (secure)

---

## Performance Optimization

### 1. Enable Compression

**Nginx:**
```nginx
location /widget.js {
  gzip on;
  gzip_types text/javascript application/javascript;
  gzip_min_length 1000;
  
  # Cache for 1 hour
  expires 1h;
  add_header Cache-Control "public";
}
```

**Vercel/Next.js:** (Auto-enabled)

### 2. Minify widget.js (Optional)

```bash
# Install terser
npm install -g terser

# Minify
terser public/widget.js -o public/widget.min.js -c -m

# Then serve widget.min.js instead
```

Size comparison:
- `widget.js`: ~52KB
- `widget.min.js`: ~18KB (65% smaller!)
- `widget.min.js.gz`: ~6KB (88% smaller!)

### 3. CDN (Optional but Recommended)

Use Cloudflare or similar CDN in front of your domain:
- **Cloudflare**: Free plan works great
- **Caching**: Automatically caches static files
- **DDoS Protection**: Built-in
- **Global CDN**: Faster loading worldwide

---

## Testing

### 1. Test Widget Load

Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Widget Test</title>
</head>
<body>
  <h1>Chat Widget Test</h1>
  
  <!-- Widget Embed -->
  <script src="https://chatbridge.raka.my.id/widget.js"></script>
  <script>
    window.chatWidgetConfig = {
      companyId: 'test-company-123'  // Use a test company ID
    };
    new ChatWidget(window.chatWidgetConfig);
  </script>
</body>
</html>
```

Open in browser and check:
- [ ] Widget button appears in bottom-right
- [ ] No console errors
- [ ] Click button opens chat window
- [ ] Can send messages
- [ ] Real-time messages work (Socket.io)

### 2. Test from Different Domain

Host the test HTML on a different domain to verify CORS:
- [ ] Widget loads from cross-origin
- [ ] API calls succeed
- [ ] WebSocket connects

### 3. Test Performance

```javascript
// In browser console
performance.mark('widget-start');
// Widget loads...
performance.mark('widget-end');
performance.measure('widget-load', 'widget-start', 'widget-end');
console.log(performance.getEntriesByName('widget-load')[0].duration);
// Should be < 500ms
```

---

## Monitoring

### Key Metrics to Track

1. **Widget Load Time**
   - Target: < 500ms
   - Monitor: Browser performance API

2. **API Response Time**
   - Target: < 200ms
   - Monitor: Server logs

3. **WebSocket Connection Rate**
   - Target: > 95% success
   - Monitor: Socket.io logs

4. **Error Rate**
   - Target: < 0.1%
   - Monitor: Server error logs + client console

### Setup Monitoring

**Server-side (Express/Next.js):**
```javascript
// Log widget loads
app.get('/widget.js', (req, res) => {
  console.log('Widget loaded from:', req.get('origin'));
  // Your analytics here
});

// Log API calls
app.post('/api/widget/messages', (req, res) => {
  const startTime = Date.now();
  // ... handle request
  const duration = Date.now() - startTime;
  console.log('API call took:', duration, 'ms');
});
```

**Client-side (in widget.js - already included):**
- Console logs for key events
- Automatic error logging
- Performance tracking

---

## Customer Onboarding

### What to Give Each Customer

1. **Company ID**
   - Generate in your dashboard
   - Example: `comp_abc123xyz`

2. **Embed Code**
   ```html
   <script src="https://chatbridge.raka.my.id/widget.js"></script>
   <script>
     window.chatWidgetConfig = {
       companyId: 'THEIR_COMPANY_ID'
     };
     new ChatWidget(window.chatWidgetConfig);
   </script>
   ```

3. **Instructions**
   - "Add this code just before `</body>` on every page"
   - "That's it! The chat widget will appear automatically"

### Optional Configuration (for advanced customers)

```javascript
window.chatWidgetConfig = {
  companyId: 'THEIR_COMPANY_ID',
  
  // Optional overrides
  apiUrl: 'https://chatbridge.raka.my.id',  // Usually not needed
  primaryColor: '#2563eb',
  accentColor: '#1e40af',
  position: 'bottom-right',
  autoOpen: false,
  autoOpenDelay: 3000,
  widgetName: 'Chat Support',
  welcomeMessage: 'Hi! How can we help?',
  requireEmail: true,
};
```

---

## Troubleshooting

### Widget Not Loading

**Check 1: CORS Error?**
```
Access to script at 'https://chatbridge.raka.my.id/widget.js' 
from origin 'https://customer-site.com' has been blocked by CORS policy
```
**Fix**: Enable CORS headers on your server

**Check 2: 404 Error?**
```
GET https://chatbridge.raka.my.id/widget.js 404 (Not Found)
```
**Fix**: Ensure widget.js is in `public/` folder and accessible

**Check 3: Invalid API URL?**
```
Invalid API URL. Widget must be loaded from your server...
```
**Fix**: Verify widget is loaded from `https://chatbridge.raka.my.id`

### WebSocket Not Connecting

**Check 1: Port accessible?**
```javascript
// Test WebSocket
const socket = io('https://chatbridge.raka.my.id');
socket.on('connect', () => console.log('Connected!'));
socket.on('connect_error', (err) => console.error('Error:', err));
```

**Check 2: CORS for Socket.io?**
```javascript
// In your server
io(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
```

### Messages Not Sending

**Check 1: Rate limited?**
```
⚠️ Please wait a moment before sending another message.
```
**Fix**: User sending too fast. Max 10 messages/min.

**Check 2: API error?**
```
Failed to send message. Please try again.
```
**Fix**: Check server logs for API errors

---

## Deployment Checklist

Before going live:

- [ ] SSL certificate valid for `chatbridge.raka.my.id`
- [ ] CORS enabled for widget.js
- [ ] CORS enabled for API routes
- [ ] Socket.io CORS configured
- [ ] Compression enabled (gzip)
- [ ] Cache headers set
- [ ] Test widget from external domain
- [ ] Test message sending
- [ ] Test real-time features (Socket.io)
- [ ] Monitor error logs
- [ ] Set up analytics/monitoring

---

## Quick Reference

**Production URL:** `https://chatbridge.raka.my.id`

**Widget Script:** `https://chatbridge.raka.my.id/widget.js`

**API Endpoints:**
- `/api/widget/config/public` - Get widget config
- `/api/widget/init` - Initialize conversation
- `/api/widget/messages` - Send/receive messages

**WebSocket:** `wss://chatbridge.raka.my.id`

**Widget Version:** 2.0.0

**Support:** Check your dashboard at `/dashboard/chat-widget`

---

## Updates

### How to Update Widget

1. Update `public/widget.js` in your codebase
2. Deploy to production
3. Clear CDN cache (if using CDN)
4. Customer widgets auto-update on next page load (due to cache headers)

**Note:** Customers don't need to change their embed code for widget updates!

---

## Summary

Your widget is live at: **`https://chatbridge.raka.my.id/widget.js`**

Customers just need:
```html
<script src="https://chatbridge.raka.my.id/widget.js"></script>
<script>
  window.chatWidgetConfig = {
    companyId: 'THEIR_ID'
  };
  new ChatWidget(window.chatWidgetConfig);
</script>
```

Everything else is automatic! ✅
