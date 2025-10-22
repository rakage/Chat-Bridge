# Chat Widget Integration Guide

## 🎯 How the Chat Widget Works

The chat widget system has two main parts:
1. **Configuration in Dashboard** - Set up widget appearance and behavior
2. **Embedded Widget Script** - Loads on your website and fetches the configuration

## 📋 Step-by-Step Setup Guide

### 1. Configure Your Widget in the Dashboard

1. Navigate to `/dashboard/integrations` (or directly to `/dashboard/chat-widget`)
2. Configure the widget settings:
   - **General Settings**
     - Widget Name
     - Welcome Message
     - Placeholder Text
     - Enable/Disable Widget
   
   - **Appearance**
     - Primary Color (buttons, header)
     - Accent Color (hover states)
     - Position (bottom-right, bottom-left, etc.)
   
   - **Behavior**
     - Auto Open (automatically opens the widget)
     - Auto Open Delay (milliseconds before opening)
   
   - **Data Collection**
     - Collect Name
     - Collect Email
     - Require Email

3. Click **Save Configuration**

### 2. Embed the Widget on Your Website

#### Get Your Company ID
Your company ID can be found in the embed code section on the chat widget page. It looks like:
```
companyId: 'cmfl07q6p0000v1xsfmtdtxgd'
```

#### Add the Embed Code
Copy this code and paste it **before the closing `</body>` tag** on your website:

```html
<!-- Chat Widget -->
<script src="http://localhost:3001/widget.js"></script>
<script>
  window.chatWidgetConfig = {
    apiUrl: 'http://localhost:3001',
    companyId: 'YOUR_COMPANY_ID_HERE'
  };
  new ChatWidget(window.chatWidgetConfig);
</script>
```

**For Production:**
Replace `http://localhost:3001` with your actual domain.

## 🚀 How to Test the Widget

### Using the Demo Page
1. Open `chat-widget-demo.html` in your browser
2. Make sure your Next.js server is running on port 3001:
   ```bash
   npm run dev
   ```

### Testing Flow
1. **Click the Chat Bubble** - Click the floating chat icon in the bottom right corner
2. **Fill Initial Form** - The widget will show a form asking for:
   - Your Name (required)
   - Your Email (required if you enabled "Require Email" in settings)
   - Initial Message (required)
3. **Click "Start Chat"** - This creates a new conversation
4. **Send Messages** - Now you can send and receive messages!

## 🔧 How Configuration Works

### Configuration Loading Process

1. **Widget Loads** - The `widget.js` script loads on your page
2. **Fetch Config** - Widget makes a request to:
   ```
   GET /api/widget/config/public?companyId=YOUR_COMPANY_ID
   ```
3. **Apply Settings** - Widget applies:
   - Colors
   - Welcome message
   - Placeholder text
   - Position
   - Auto-open behavior
   - Email requirements

### Real-Time Updates
If you update the widget configuration in the dashboard:
- The widget automatically refreshes configuration
- Socket.io emits `widget:config-updated` event
- Widget fetches latest settings and updates UI

## 📡 API Endpoints Used by Widget

### 1. Get Public Configuration
```
GET /api/widget/config/public?companyId={companyId}
```
Returns public widget settings (colors, messages, etc.)

### 2. Initialize Conversation
```
POST /api/widget/init
Body: {
  companyId: string,
  name: string,
  email: string,
  message: string,
  sessionId: string
}
```
Creates a new conversation and returns conversation ID

### 3. Send Message
```
POST /api/widget/messages
Body: {
  sessionId: string,
  companyId: string,
  message: string
}
```
Sends a message in the conversation

### 4. Real-Time Updates (Socket.io)
- Connects to Socket.io server
- Joins conversation room
- Receives new messages in real-time
- Listens for config updates

## ❓ Common Issues & Solutions

### Issue: Widget doesn't appear
**Solution:**
1. Check browser console for errors
2. Verify the widget.js script is loading correctly
3. Make sure your company ID is correct
4. Ensure widget is enabled in dashboard settings

### Issue: Can't send messages
**Solution:**
1. Make sure you filled out the initial form first
2. Check that the footer (message input) is visible after form submission
3. Verify API server is running
4. Check browser console for API errors

### Issue: Configuration not updating
**Solution:**
1. Clear browser cache
2. Refresh the page
3. Check that you clicked "Save Configuration" in dashboard
4. Verify widget is enabled

### Issue: Widget colors not changing
**Solution:**
1. Save configuration in dashboard
2. Widget should auto-refresh (Socket.io event)
3. If not, reload the demo page
4. Check console for configuration fetch success

## 🎨 Customization Tips

### Change Widget Position
In dashboard, set position to:
- `bottom-right` (default)
- `bottom-left`
- `top-right`
- `top-left`

### Match Your Brand Colors
1. Use your brand's primary color for the main theme
2. Use a slightly darker shade for accent color
3. Test readability of white text on your chosen colors

### Welcome Message Examples
- "👋 Hi there! How can we help you today?"
- "Welcome! Ask us anything."
- "Need help? We're here for you!"
- "Hello! Our team is ready to assist you."

## 🔒 Security Notes

1. **Company ID is Public** - It's safe to include in client-side code
2. **No Sensitive Data** - Public config endpoint only returns safe data
3. **Session Management** - Widget uses localStorage for session tracking
4. **CORS Configuration** - Ensure your API allows requests from your domain

## 📱 Mobile Responsiveness

The widget is fully responsive:
- Desktop: Fixed width (400px)
- Mobile: Full width minus 40px padding
- Adapts position based on screen size
- Touch-friendly buttons and inputs

## 🎯 Next Steps

1. ✅ Configure your widget in the dashboard
2. ✅ Test it on the demo page
3. ✅ Embed it on your website
4. ✅ Monitor conversations in the dashboard
5. ✅ Use AI to respond automatically or manually take over

## 📞 Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Verify all API endpoints are accessible
3. Ensure Socket.io is properly configured
4. Check that your widget configuration is saved

---

**Pro Tip:** Use the preview in the chat widget settings page to see changes in real-time before deploying to your website!
