# 💬 Embeddable Chat Widget - README

## Overview
A complete embeddable chat widget system for your website. Visitors submit their name, email, and message through the widget, creating real-time conversations with your support agents in the dashboard.

## 🚀 Quick Start

### 1. Database Setup ✅
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
```
**Status**: ✅ Already completed

### 2. Start Server
```bash
npm run dev:realtime  # Starts server with Socket.io on port 3001
```

### 3. Configure Widget
1. Open dashboard: http://localhost:3001
2. Login with your credentials
3. Navigate to **Chat Widget** in sidebar
4. Customize colors, messages, behavior
5. Click **Save Configuration**

### 4. Get Company ID
Open browser console on widget config page:
```javascript
fetch('/api/widget/config')
  .then(r => r.json())
  .then(d => console.log('Company ID:', d.companyId))
```

### 5. Test with Demo
1. Open: http://localhost:3001/widget-demo.html
2. Edit `widget-demo.html` and replace `YOUR_COMPANY_ID_HERE` with actual ID
3. Refresh page and test the widget

### 6. Embed on Website
```html
<!-- Add before </body> tag -->
<script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
<script src="http://localhost:3001/widget.js"></script>
<script>
  window.chatWidgetConfig = {
    apiUrl: 'http://localhost:3001',
    companyId: 'YOUR_COMPANY_ID_HERE'
  };
  new ChatWidget(window.chatWidgetConfig);
</script>
```

## 📁 Project Structure

```
├── public/
│   ├── widget.js              # Embeddable widget (17KB)
│   └── widget-demo.html       # Demo page
│
├── src/app/
│   ├── api/widget/
│   │   ├── init/route.ts      # Initialize conversation
│   │   ├── messages/route.ts  # Get/send messages
│   │   └── config/route.ts    # Widget configuration
│   │
│   └── dashboard/
│       └── chat-widget/
│           └── page.tsx       # Config UI
│
├── prisma/
│   └── schema.prisma          # Database schema
│
└── Documentation/
    ├── WIDGET_QUICK_START.md           # 3-step quick start
    ├── CHAT_WIDGET_SETUP.md            # Complete setup guide
    ├── WIDGET_IMPLEMENTATION_SUMMARY.md # Technical details
    └── WIDGET_README.md                 # This file
```

## 🎯 Features

✅ **Embeddable** - Works on any website, single script tag  
✅ **Real-Time** - Socket.io for instant messaging  
✅ **Customizable** - Colors, position, branding  
✅ **Responsive** - Works on desktop and mobile  
✅ **Persistent** - Conversations stored in database  
✅ **Secure** - Domain whitelist, session management  
✅ **Integrated** - Appears in dashboard conversations list  

## 🔧 Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| Widget Name | "Chat Widget" | Displayed in header |
| Primary Color | #2563eb | Button & header color |
| Accent Color | #1e40af | Hover states |
| Position | bottom-right | Widget position |
| Auto Open | false | Open automatically |
| Collect Email | true | Show email field |
| Require Email | true | Make email mandatory |
| Enabled | true | Global enable/disable |

## 📊 How It Works

```
User Website → Widget.js → API → Database → Dashboard → Agent Reply → Socket.io → Widget
```

1. User opens widget on your website
2. Submits name, email, message
3. Backend creates conversation
4. Appears in dashboard conversations
5. Agent replies from dashboard
6. Reply sent via Socket.io
7. Widget shows reply instantly

## 🔒 Security

- **Domain Whitelist**: Restrict which domains can use widget
- **Session Management**: Unique IDs prevent conversation mixing
- **Company Validation**: All APIs verify company exists
- **Agent Auth**: Only authenticated agents can configure/reply

## 🧪 Testing

1. **Demo Page**: http://localhost:3001/widget-demo.html
2. **Real-Time**: Send message → Reply from dashboard → See instantly
3. **Mobile**: Test on phone/tablet browsers
4. **Multiple Tabs**: Open widget in 2 tabs, verify sync

## 📚 Documentation

| File | Purpose | Lines |
|------|---------|-------|
| WIDGET_QUICK_START.md | Get started in 3 steps | 200+ |
| CHAT_WIDGET_SETUP.md | Complete setup & API docs | 300+ |
| WIDGET_IMPLEMENTATION_SUMMARY.md | Technical architecture | 500+ |
| WIDGET_README.md | This quick reference | 150+ |

## 🐛 Troubleshooting

**Widget not appearing?**
- Check company ID is correct
- Verify widget enabled in dashboard
- Look for console errors

**Real-time not working?**
- Ensure Socket.io CDN loaded
- Check server running with `npm run dev:realtime`
- Verify WebSocket connection in Network tab

**Messages not sending?**
- Check company ID matches database
- Review server logs for errors
- Test with demo page first

## 📈 Next Steps

### Development
- [x] Database schema updated
- [x] Widget created
- [x] Dashboard page built
- [ ] Test with demo page
- [ ] Get company ID
- [ ] Update embed code
- [ ] Test real-time messaging

### Production
- [ ] Update apiUrl to production domain
- [ ] Configure domain whitelist
- [ ] Customize branding
- [ ] Train agents
- [ ] Monitor conversations
- [ ] Set up analytics

## 💡 Pro Tips

1. **Test Locally First**: Use demo page before embedding
2. **Get Company ID Early**: You'll need it for everything
3. **Enable Real-Time**: Use `npm run dev:realtime` not `npm run dev`
4. **Domain Whitelist**: Add in production for security
5. **Monitor Logs**: Check server console for errors

## 📞 Support

1. Check browser console for errors
2. Review server logs
3. Test with demo page
4. Read `CHAT_WIDGET_SETUP.md` for detailed help
5. Check `WIDGET_IMPLEMENTATION_SUMMARY.md` for architecture

## ✨ Commands Reference

```bash
# Database
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database

# Development
npm run dev           # Regular dev server (port 3000)
npm run dev:realtime  # Dev server with Socket.io (port 3001) ✅ Use this

# Production
npm run build         # Build for production
npm run start:realtime # Production with Socket.io
```

## 🎉 You're Ready!

The embeddable chat widget is fully implemented and ready to use. Start with the demo page, then embed on your website!

**Need Help?** → Read `WIDGET_QUICK_START.md`  
**Want Details?** → Read `CHAT_WIDGET_SETUP.md`  
**Deep Dive?** → Read `WIDGET_IMPLEMENTATION_SUMMARY.md`
