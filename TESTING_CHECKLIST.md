# Widget Dynamic Appearance - Testing Checklist

## Pre-requisites
- Server must be running: `npm run dev` or `node server.js`
- Database must be set up and accessible
- You need a valid company ID in the database

## Test Steps

### 1. Start the Server
```bash
npm run dev
# or
node server.js
```

**Expected Output:**
```
✅ Socket.IO initialized with enhanced room management
📡 Server running with real-time support
> Ready on http://localhost:3001
```

### 2. Open the Widget Demo Page
- Open your browser to: `http://localhost:3001/widget-demo.html`
- Open browser DevTools Console (F12)

**Expected Console Output:**
```
Widget configuration loaded: {...}
Widget socket connected
✅ User ${socket.id} joined company:${companyId} room
Joined conversation room: ...
```

### 3. Open Dashboard in Another Tab/Window
- Navigate to: `http://localhost:3001/dashboard/chat-widget`
- Log in if needed

### 4. Make Appearance Changes
Try changing the following settings:

#### Test 1: Primary Color
- Change Primary Color to a bright color (e.g., #ff0000 for red)
- Click "Save Configuration"
- Switch to demo page tab
- **Expected Result:** Widget button color changes immediately to red

#### Test 2: Widget Name
- Change Widget Name to "Support Chat"
- Click "Save Configuration"
- Switch to demo page tab
- Open the widget if not already open
- **Expected Result:** Header title shows "Support Chat" immediately

#### Test 3: Welcome Message
- Change Welcome Message to "Hello! Need help?"
- Click "Save Configuration"
- Switch to demo page tab
- Refresh the demo page (to reset widget)
- Open widget
- **Expected Result:** New welcome message appears

#### Test 4: Position
- Change Position to "bottom-left"
- Click "Save Configuration"
- Switch to demo page tab
- **Expected Result:** Widget moves to bottom-left corner immediately

#### Test 5: Accent Color
- Change Accent Color to #00ff00 (green)
- Click "Save Configuration"
- Switch to demo page tab
- Hover over widget button or send button
- **Expected Result:** Hover color changes to green

### 5. Check Console Messages

**In Demo Page Console:**
```
🔄 Widget configuration updated, refreshing...
Widget configuration loaded: {...}
✅ Widget configuration refreshed successfully
```

**In Server Console:**
```
✅ Emitted widget:config-updated event to company ${companyId}
```

### 6. Test Multiple Widgets
- Open the demo page in multiple browser tabs/windows
- Make configuration changes in dashboard
- **Expected Result:** ALL open widget instances update simultaneously

## Troubleshooting

### Widget doesn't update
1. **Check Socket Connection:**
   - Console should show: `Widget socket connected`
   - If not, check if Socket.io is running

2. **Check Company Room:**
   - Server console should show: `✅ User ${socket.id} joined company:${companyId} room`
   - Verify companyId matches in widget-demo.html

3. **Check Event Emission:**
   - Server console should show config-updated event when saving
   - If not, verify global.socketIO is available

4. **Refresh Configuration Manually:**
   - In console, run: `window.chatWidgetInstance.refreshConfiguration()`
   - Should see updated config

### Changes persist but don't appear immediately
- Check if widget.js is cached
- Hard refresh the demo page (Ctrl+Shift+R)
- Clear browser cache

### Socket.io not connecting
- Verify server is running on correct port
- Check CORS settings in server.js
- Ensure Socket.io client library is loaded in widget-demo.html

## Success Criteria

✅ Widget appearance changes immediately after saving in dashboard
✅ No page refresh required on demo page
✅ Multiple widgets update simultaneously
✅ Console shows proper event flow
✅ All appearance properties update in real-time:
   - Colors (primary, accent)
   - Text (widget name, welcome message, placeholder)
   - Position (bottom-right, bottom-left, etc.)
   - Behavior settings (auto-open, delays)

## Additional Testing

### Performance Test
- Open 10+ demo page tabs
- Make configuration change
- **Expected:** All update within 1-2 seconds

### Network Interruption Test
- Disconnect internet while widget is open
- Reconnect
- Make configuration change
- **Expected:** Widget reconnects and receives update

### Browser Compatibility
Test in:
- Chrome/Edge
- Firefox
- Safari
- Mobile browsers

## Notes
- Changes are stored in database, so they persist across server restarts
- Socket.io handles reconnection automatically
- Widget uses both websocket and polling for reliability
