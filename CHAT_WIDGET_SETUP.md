# Chat Widget Setup Guide

## Overview

The embeddable chat widget allows you to add live chat functionality to any website. Users can submit their name, email, and message through the widget, which creates a conversation in your backoffice dashboard where agents can reply in real-time.

## Features

- ✅ Embeddable on any website with a simple script tag
- ✅ Customizable colors, branding, and positioning
- ✅ Real-time messaging via Socket.io
- ✅ Collects user name, email, and message
- ✅ Persistent conversations stored in database
- ✅ Agent replies appear instantly in widget
- ✅ Fully responsive (works on desktop and mobile)
- ✅ No framework dependencies (vanilla JavaScript)

## Database Setup

### 1. Update Prisma Schema

The Prisma schema has been updated with:
- New `WidgetConfig` model for widget configuration
- `WIDGET` platform enum value
- `customerName` field in `Conversation` model
- Widget-related relations

### 2. Generate Prisma Client and Push Schema

```bash
npm run db:generate
npm run db:push
```

This will create the `widget_configs` table and update the `conversations` table with widget support.

## Installation

### 1. Configure Widget in Dashboard

1. Log in to your dashboard
2. Navigate to **Chat Widget** in the sidebar
3. Configure your widget settings:
   - Widget Name
   - Welcome Message
   - Primary and Accent Colors
   - Position (bottom-right, bottom-left, etc.)
   - Auto-open behavior
   - Data collection preferences (name, email, phone)
4. Click **Save Configuration**
5. Copy the embed code from the right panel

### 2. Add Widget to Your Website

Paste the embed code before the closing `</body>` tag on your website:

```html
<!-- Socket.io Client Library (required for real-time) -->
<script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>

<!-- Chat Widget -->
<script src="https://your-domain.com/widget.js"></script>
<script>
  window.chatWidgetConfig = {
    apiUrl: 'https://your-domain.com',
    companyId: 'your-company-id-here'
  };
  new ChatWidget(window.chatWidgetConfig);
</script>
```

**Important:** Replace `your-domain.com` with your actual dashboard URL and `your-company-id-here` with your company ID from the database.

### 3. Get Your Company ID

To find your company ID:

1. Log in to your dashboard
2. Open browser console (F12)
3. Run: `fetch('/api/widget/config').then(r => r.json()).then(d => console.log('Company ID:', d.companyId))`
4. Copy the company ID shown in the console

## Usage

### For Website Visitors

1. Click the chat button (appears in bottom-right by default)
2. Enter name, email, and initial message
3. Click "Start Chat"
4. Continue conversation in the widget
5. Messages from agents appear instantly

### For Agents/Dashboard Users

1. New widget conversations appear in the **Conversations** list
2. Widget conversations are marked with platform "WIDGET"
3. Customer name and email are displayed
4. Reply to messages directly from the conversation view
5. Replies are instantly delivered to the widget via Socket.io

## Configuration Options

All configuration is done through the dashboard's Chat Widget page:

### Appearance
- **Primary Color**: Main widget color (button, header)
- **Accent Color**: Hover states and accents
- **Position**: Where the widget appears on the page
  - `bottom-right` (default)
  - `bottom-left`
  - `top-right`
  - `top-left`

### Behavior
- **Auto Open**: Open widget automatically after delay
- **Auto Open Delay**: Milliseconds before auto-opening (default: 3000)
- **Enabled**: Enable/disable the widget globally

### Data Collection
- **Collect Name**: Show name field (default: true)
- **Collect Email**: Show email field (default: true)
- **Require Email**: Make email required (default: true)
- **Collect Phone**: Show phone field (default: false)

### Advanced
- **Allowed Domains**: Whitelist domains (empty = all domains allowed)
- **Custom CSS**: Additional CSS for advanced customization

## API Endpoints

### Widget APIs (Public - No Auth Required)

#### Initialize Conversation
```
POST /api/widget/init
Body: { companyId, name, email, message, sessionId }
Returns: { sessionId, conversationId, messages, config }
```

#### Get Messages
```
GET /api/widget/messages?sessionId=xxx&companyId=xxx
Returns: { messages, conversationId }
```

#### Send Message
```
POST /api/widget/messages
Body: { sessionId, companyId, message }
Returns: { success, message }
```

### Configuration API (Authenticated - Dashboard Only)

#### Get Widget Config
```
GET /api/widget/config
Returns: WidgetConfig object
```

#### Update Widget Config
```
PUT /api/widget/config
Body: { ...config fields }
Returns: Updated WidgetConfig
```

## Real-Time Communication

The widget uses Socket.io for real-time messaging:

### Widget Side
- Connects when conversation is initialized
- Joins conversation room: `conversation:{conversationId}`
- Listens for `message:new` events
- Displays agent/bot messages instantly

### Dashboard Side
- Messages API emits to conversation room
- All connected clients receive updates
- Conversations list updates in real-time

## Security

### Domain Whitelisting
Configure allowed domains in the widget settings to prevent unauthorized use:

```javascript
allowedDomains: ['example.com', 'app.example.com']
```

Leave empty to allow all domains (not recommended for production).

### CORS
The widget APIs check the `Origin` header against allowed domains.

### Session Management
Each widget instance gets a unique session ID stored in localStorage, preventing conversation mixing.

## Testing

### 1. Test with Demo Page

Open the demo page in your browser:
```
http://localhost:3000/widget-demo.html
```

Update the `companyId` in the demo page HTML with your actual company ID.

### 2. Test Real-Time Messaging

1. Open widget in browser
2. Start a conversation
3. Open dashboard conversations page
4. Reply from dashboard
5. Verify reply appears instantly in widget

### 3. Test Multiple Clients

1. Open widget in 2 browser tabs/windows
2. Use same email to continue conversation
3. Send messages from dashboard
4. Verify both widgets receive messages

## Troubleshooting

### Widget Not Appearing
- Check browser console for errors
- Verify company ID is correct
- Ensure widget is enabled in dashboard
- Check if domain is allowed (if whitelist configured)

### Real-Time Not Working
- Verify Socket.io CDN script is loaded
- Check browser console for connection errors
- Ensure server is running with Socket.io support
- Check firewall/proxy settings for WebSocket connections

### Messages Not Sending
- Check API endpoint URLs are correct
- Verify company ID matches database
- Check browser network tab for API errors
- Ensure conversation was initialized properly

## Customization

### Custom Styling

Add custom CSS in the dashboard configuration:

```css
.chat-widget-button {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

### Custom Position

The widget respects the `position` setting from configuration. For more control, override with custom CSS.

### Custom Messages

Update welcome message and placeholder text in dashboard configuration.

## Production Checklist

- [ ] Update `apiUrl` to production domain
- [ ] Set up domain whitelist
- [ ] Configure company branding (colors, name)
- [ ] Test real-time messaging in production
- [ ] Monitor widget conversations in dashboard
- [ ] Set up agent training for widget responses
- [ ] Configure email notifications for new conversations
- [ ] Test mobile responsiveness

## Architecture

```
User's Website
    ↓
Chat Widget (widget.js)
    ↓
API Endpoints (/api/widget/*)
    ↓
PostgreSQL Database
    ↓
Dashboard Conversations View
    ↓
Agent Replies
    ↓
Socket.io Real-Time Sync
    ↓
Chat Widget (instant update)
```

## Files Structure

```
/public/widget.js                          - Embeddable widget script
/public/widget-demo.html                   - Demo page
/src/app/api/widget/init/route.ts         - Initialize conversation
/src/app/api/widget/messages/route.ts     - Get/send messages
/src/app/api/widget/config/route.ts       - Widget configuration
/src/app/dashboard/chat-widget/page.tsx   - Dashboard config page
/prisma/schema.prisma                      - Database schema
```

## Support

For issues or questions:
1. Check browser console for errors
2. Review this documentation
3. Check server logs for API errors
4. Test with demo page first
5. Contact support team

## Next Steps

After setup:
1. Test widget on staging environment
2. Train agents on widget conversations
3. Monitor conversation volume
4. Adjust auto-bot settings if desired
5. Configure LLM for automated responses (optional)
6. Set up analytics tracking
