# Chat Widget - Quick Start Guide

## ✅ What's Been Built

A complete embeddable chat widget system has been created with the following features:

### Core Features
- ✅ Embeddable widget (vanilla JS, no dependencies)
- ✅ Customer information collection (name, email, message)
- ✅ Real-time messaging via Socket.io
- ✅ Dashboard configuration page
- ✅ Agent reply interface
- ✅ Persistent conversations in database
- ✅ Fully responsive design

### Technical Implementation
- ✅ Database schema updated with `WidgetConfig` model
- ✅ API endpoints for widget initialization and messaging
- ✅ Widget configuration page in dashboard
- ✅ Widget conversations integrated into conversations list
- ✅ Socket.io real-time sync between widget and agents
- ✅ Customizable colors, branding, and behavior

## 🚀 Quick Start (3 Steps)

### Step 1: Access Widget Configuration
1. Start your development server: `npm run dev:realtime`
2. Log in to dashboard: `http://localhost:3001`
3. Navigate to **Chat Widget** in the sidebar

### Step 2: Configure Your Widget
1. Customize widget appearance:
   - Widget Name
   - Colors (primary, accent)
   - Welcome message
   - Position on page
2. Set data collection preferences:
   - Name, Email (recommended)
   - Phone (optional)
3. Click **Save Configuration**

### Step 3: Get Embed Code
1. Find your Company ID:
   ```javascript
   // Open browser console on widget config page and run:
   fetch('/api/widget/config')
     .then(r => r.json())
     .then(d => console.log('Company ID:', d.companyId))
   ```
2. Copy the embed code from the right panel
3. Update `companyId` in the code with your actual ID
4. Paste before `</body>` on your website

## 📋 Embed Code Template

```html
<!-- Socket.io Client (required for real-time) -->
<script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>

<!-- Chat Widget -->
<script src="http://localhost:3001/widget.js"></script>
<script>
  window.chatWidgetConfig = {
    apiUrl: 'http://localhost:3001',
    companyId: 'YOUR_COMPANY_ID_HERE' // Replace with actual ID
  };
  new ChatWidget(window.chatWidgetConfig);
</script>
```

## 🧪 Testing

### Test with Demo Page
1. Open `http://localhost:3001/widget-demo.html`
2. Update the `companyId` in the HTML file
3. Refresh and test the widget

### Test Real-Time Messaging
1. Open widget in browser
2. Submit name, email, message
3. Open dashboard → Conversations
4. Find the new widget conversation
5. Reply from dashboard
6. See reply appear instantly in widget

## 📁 Files Created

### Backend
- `/src/app/api/widget/init/route.ts` - Initialize conversation
- `/src/app/api/widget/messages/route.ts` - Get/send messages
- `/src/app/api/widget/config/route.ts` - Widget configuration

### Frontend
- `/src/app/dashboard/chat-widget/page.tsx` - Config page
- `/public/widget.js` - Embeddable widget script
- `/public/widget-demo.html` - Demo page

### Database
- Updated `/prisma/schema.prisma` with:
  - `WidgetConfig` model
  - `WIDGET` platform enum
  - `customerName` field
  - Widget relations

### Documentation
- `/CHAT_WIDGET_SETUP.md` - Complete setup guide
- `/WIDGET_QUICK_START.md` - This file

## 🔧 Configuration Options

### Appearance
- **Primary Color**: Button and header color
- **Accent Color**: Hover states
- **Position**: bottom-right, bottom-left, top-right, top-left

### Behavior
- **Auto Open**: Automatically open after delay
- **Auto Open Delay**: Milliseconds before opening
- **Enabled**: Global enable/disable switch

### Data Collection
- **Collect Name**: Show name field
- **Collect Email**: Show email field
- **Require Email**: Make email mandatory
- **Collect Phone**: Show phone field

## 🔒 Security

### Domain Whitelisting (Production)
Add allowed domains in configuration:
```javascript
allowedDomains: ['example.com', 'app.example.com']
```

Leave empty for development (allows all domains).

### CORS
Widget APIs validate the `Origin` header against allowed domains.

### Session Management
Unique session IDs stored in localStorage prevent conversation mixing.

## 📊 How It Works

```
1. User visits website with widget
   ↓
2. User clicks chat button
   ↓
3. Widget shows form (name, email, message)
   ↓
4. User submits → POST /api/widget/init
   ↓
5. Backend creates conversation in database
   ↓
6. Widget displays conversation + connects Socket.io
   ↓
7. Agent sees conversation in dashboard
   ↓
8. Agent replies → POST /api/messages/send
   ↓
9. Backend saves message + emits via Socket.io
   ↓
10. Widget receives message instantly
```

## 🐛 Troubleshooting

### Widget Not Appearing
- Check company ID is correct
- Verify widget is enabled in dashboard
- Open browser console for errors
- Check domain whitelist settings

### Real-Time Not Working
- Ensure Socket.io CDN script loads first
- Check server is running with Socket.io
- Verify WebSocket connection in Network tab
- Look for connection errors in console

### Messages Not Sending
- Verify company ID matches database
- Check API endpoint URLs
- Review server logs for errors
- Ensure conversation was initialized

## 📈 Next Steps

### For Development
1. Test widget on different pages
2. Test multiple concurrent conversations
3. Test mobile responsiveness
4. Configure auto-bot if desired
5. Set up LLM integration (optional)

### For Production
1. Update `apiUrl` to production domain
2. Configure domain whitelist
3. Update brand colors and messaging
4. Train agents on widget conversations
5. Monitor conversation volume
6. Set up analytics tracking

## 🎯 Key Features Explained

### Persistent Conversations
- Widget session stored in localStorage
- Returning users see previous messages
- Agents can view full conversation history

### Real-Time Sync
- Uses Socket.io for instant updates
- Agents and customers see messages immediately
- Works across multiple browser tabs

### Customization
- Colors, branding, positioning
- Custom CSS support
- Flexible data collection
- Auto-open behavior

## 💡 Tips

1. **Test locally first**: Use demo page before embedding
2. **Get Company ID early**: You'll need it for embed code
3. **Enable Socket.io**: Required for real-time features
4. **Train agents**: Widget conversations different from social media
5. **Monitor performance**: Check conversation response times

## 📚 Full Documentation

See `CHAT_WIDGET_SETUP.md` for:
- Detailed API documentation
- Advanced configuration
- Architecture overview
- Production checklist
- Complete troubleshooting guide

## ✨ Success Checklist

- [ ] Database schema updated (`npm run db:push` ✅)
- [ ] Widget configuration saved in dashboard
- [ ] Company ID retrieved
- [ ] Embed code updated with Company ID
- [ ] Widget tested on demo page
- [ ] Real-time messaging verified
- [ ] Agent replies tested from dashboard
- [ ] Mobile responsiveness checked

## 🎉 You're Done!

The embeddable chat widget is now ready to use. Start testing with the demo page, then embed it on your website!

For questions or issues, refer to `CHAT_WIDGET_SETUP.md` for detailed documentation.
