# Chat Widget Troubleshooting Checklist

## ✅ Pre-Flight Checklist

Before testing the widget, ensure:

### 1. Server is Running
```bash
npm run dev
```
Should start on http://localhost:3001

### 2. Widget Configuration is Saved
- Go to `/dashboard/chat-widget`
- Configure your settings
- Click **"Save Configuration"**
- Ensure "Widget Enabled" switch is **ON**

### 3. Widget Script is Accessible
Open in browser:
```
http://localhost:3001/widget.js
```
Should show JavaScript code (not 404)

### 4. Company ID is Correct
Check your embed code has the correct company ID:
```javascript
companyId: 'cmfl07q6p0000v1xsfmtdtxgd' // Your actual ID
```

## 🐛 Common Issues

### Issue 1: Widget doesn't appear on page

**Check:**
- [ ] Is the embed code before `</body>` tag?
- [ ] Is widget.js loading? (Check Network tab in DevTools)
- [ ] Is widget enabled in dashboard?
- [ ] Any JavaScript errors in console?

**Fix:**
```html
<!-- Make sure this is correct -->
<script src="http://localhost:3001/widget.js"></script>
<script>
  window.chatWidgetConfig = {
    apiUrl: 'http://localhost:3001',
    companyId: 'YOUR_COMPANY_ID'
  };
  new ChatWidget(window.chatWidgetConfig);
</script>
```

### Issue 2: Can't send messages

**This is expected!** You must:
1. Click the chat bubble
2. **Fill out the initial form** (Name, Email, Message)
3. Click "Start Chat"
4. **NOW** you can send messages

The message input only appears **after** form submission!

**Check in Console:**
- Look for "Joined conversation room" message
- Check for any API errors

### Issue 3: Configuration not loading

**Check Browser Console:**
Should see:
```
Widget configuration loaded: {primaryColor: "#2563eb", ...}
```

**If you see "Failed to fetch widget configuration":**
- [ ] Is API server running?
- [ ] Is company ID correct?
- [ ] Check: `http://localhost:3001/api/widget/config/public?companyId=YOUR_ID`

### Issue 4: Colors not applying

**Check:**
1. Did you save configuration in dashboard?
2. Clear browser cache and reload
3. Check console for "Widget configuration loaded" message

### Issue 5: Initial form not appearing

**Check:**
- [ ] Did you click the chat bubble?
- [ ] Check browser console for errors
- [ ] Verify widget.js loaded successfully

## 🧪 Testing Steps

### Complete Test Flow

1. **Start Server**
   ```bash
   npm run dev
   ```

2. **Configure Widget**
   - Go to: http://localhost:3001/dashboard/chat-widget
   - Set widget name, colors, messages
   - **Save Configuration**
   - Make sure "Widget Enabled" is ON

3. **Open Demo Page**
   - Open: `chat-widget-demo.html` in browser
   - Or create your own test page

4. **Test Widget**
   ```
   Step 1: Click chat bubble (bottom right)
   Step 2: Fill form (Name, Email, Message)
   Step 3: Click "Start Chat"
   Step 4: Send a message
   Step 5: Wait for AI response
   ```

5. **Check Dashboard**
   - Go to: http://localhost:3001/dashboard/conversations
   - You should see your new conversation

## 🔍 Debug Mode

### Enable Detailed Logging

Open browser console (F12) and check for:
- ✅ "Widget configuration loaded"
- ✅ "Widget socket connected"
- ✅ "Joined conversation room"
- ❌ Any red error messages

### Test API Endpoints Manually

**1. Check Widget Config:**
```
http://localhost:3001/api/widget/config/public?companyId=YOUR_COMPANY_ID
```
Should return JSON with widget settings.

**2. Test with Postman/curl:**
```bash
# Get Config
curl http://localhost:3001/api/widget/config/public?companyId=YOUR_ID

# Init Conversation
curl -X POST http://localhost:3001/api/widget/init \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "YOUR_ID",
    "name": "Test User",
    "email": "test@example.com",
    "message": "Test message",
    "sessionId": "test123"
  }'
```

## 🎯 Quick Fix Commands

### If Nothing Works

1. **Restart Everything:**
   ```bash
   # Stop server (Ctrl+C)
   # Clear Next.js cache
   rm -rf .next
   # Reinstall dependencies
   npm install
   # Start fresh
   npm run dev
   ```

2. **Clear Browser Data:**
   - Open DevTools (F12)
   - Go to Application tab
   - Clear Storage
   - Reload page

3. **Check Database:**
   ```bash
   # Make sure widget config exists in database
   npx prisma studio
   # Check WidgetConfig table
   ```

## ✨ Success Indicators

When everything works, you should see:

**In Browser Console:**
```
✅ Widget configuration loaded: {...}
✅ Widget socket connected
✅ Joined conversation room: conv_xxx
```

**In Widget UI:**
1. Chat bubble appears (bottom right)
2. Clicking shows initial form
3. After form: message input appears
4. Can send and receive messages
5. Messages show in real-time

**In Dashboard:**
- New conversation appears in `/dashboard/conversations`
- Messages show with correct timestamps
- Can reply from dashboard

## 📞 Still Having Issues?

If you've tried everything above:

1. **Check these files exist:**
   - `public/widget.js`
   - `src/app/api/widget/init/route.ts`
   - `src/app/api/widget/messages/route.ts`
   - `src/app/api/widget/config/public/route.ts`

2. **Verify environment variables:**
   - Check `.env` or `.env.local`
   - Ensure DATABASE_URL is set
   - Ensure NEXTAUTH_SECRET is set

3. **Check ports:**
   - Default is 3001 (or 3000)
   - Make sure nothing else is using that port
   - Update apiUrl in embed code to match

## 🎓 Understanding the Flow

```
User clicks bubble
    ↓
Initial form appears
    ↓
User fills form → POST /api/widget/init
    ↓
Conversation created
    ↓
Message input appears
    ↓
Socket.io connects
    ↓
User can send messages → POST /api/widget/messages
    ↓
Real-time updates via Socket.io
```

---

**Remember:** The widget is designed to collect user info FIRST, then allow chatting. This is intentional to capture leads!
