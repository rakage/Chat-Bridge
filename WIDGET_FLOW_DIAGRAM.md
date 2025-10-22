# Chat Widget Flow Diagram

## 🎯 Complete Widget Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DASHBOARD CONFIGURATION                      │
│                                                                   │
│  1. Admin goes to /dashboard/chat-widget                         │
│  2. Sets: Colors, Messages, Position, Behavior                   │
│  3. Clicks "Save Configuration" button                           │
│  4. Settings saved to database (WidgetConfig table)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     WIDGET LOADS ON WEBSITE                      │
│                                                                   │
│  1. <script src="http://localhost:3001/widget.js"></script>     │
│  2. new ChatWidget({ companyId: 'xxx', apiUrl: 'xxx' })         │
│  3. Widget constructor initializes                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FETCH CONFIGURATION                           │
│                                                                   │
│  API Call: GET /api/widget/config/public?companyId=xxx          │
│  Returns: {                                                      │
│    primaryColor: "#2563eb",                                      │
│    accentColor: "#1e40af",                                       │
│    welcomeMessage: "Hi! How can we help?",                       │
│    placeholderText: "Type your message...",                      │
│    position: "bottom-right",                                     │
│    autoOpen: false,                                              │
│    widgetName: "Chat Widget",                                    │
│    requireEmail: false                                           │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    WIDGET APPEARS ON PAGE                        │
│                                                                   │
│  [ 💬 ]  ← Floating button (bottom-right)                       │
│            Uses primaryColor from config                         │
│            Position from config                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓ User clicks
┌─────────────────────────────────────────────────────────────────┐
│                    INITIAL FORM APPEARS                          │
│                                                                   │
│  ┌──────────────────────────────────────┐                       │
│  │  Hi! How can we help?                │  ← welcomeMessage     │
│  │                                       │                       │
│  │  [Your Name            ]              │  ← required          │
│  │  [Your Email           ]              │  ← optional/required │
│  │  [How can we help you? ]              │  ← required          │
│  │                                       │                       │
│  │         [Start Chat]                  │  ← primaryColor      │
│  └──────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓ User fills and submits
┌─────────────────────────────────────────────────────────────────┐
│                    CREATE CONVERSATION                           │
│                                                                   │
│  API Call: POST /api/widget/init                                │
│  Body: {                                                         │
│    companyId: "xxx",                                             │
│    name: "John Doe",                                             │
│    email: "john@example.com",                                    │
│    message: "I have a question",                                 │
│    sessionId: "widget_123..."                                    │
│  }                                                               │
│  Returns: {                                                      │
│    success: true,                                                │
│    conversationId: "conv_abc123",                                │
│    messages: [...]                                               │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   CHAT INTERFACE APPEARS                         │
│                                                                   │
│  ┌──────────────────────────────────────┐                       │
│  │  Chat Widget                    [×]  │  ← Header            │
│  ├──────────────────────────────────────┤                       │
│  │                                       │                       │
│  │  [Bot] Hi! How can we help?          │  ← Welcome msg       │
│  │       10:30 AM                        │                       │
│  │                                       │                       │
│  │        [You] I have a question        │  ← User's initial   │
│  │                            10:30 AM   │     message          │
│  │                                       │                       │
│  │  [Bot] I'm here to help!             │  ← AI response       │
│  │       10:30 AM                        │                       │
│  │                                       │                       │
│  ├──────────────────────────────────────┤                       │
│  │ [Type your message...    ] [➤]       │  ← NOW ENABLED!      │
│  └──────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓ User types and sends
┌─────────────────────────────────────────────────────────────────┐
│                      SEND MESSAGE                                │
│                                                                   │
│  API Call: POST /api/widget/messages                            │
│  Body: {                                                         │
│    sessionId: "widget_123...",                                   │
│    companyId: "xxx",                                             │
│    message: "What are your hours?"                               │
│  }                                                               │
│  Returns: {                                                      │
│    success: true,                                                │
│    message: { id: "msg_xyz", text: "...", ... }                 │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    REAL-TIME UPDATES                             │
│                                                                   │
│  Socket.io Connection Established:                               │
│  - Joins conversation room                                       │
│  - Listens for new messages                                      │
│  - Updates UI in real-time                                       │
│                                                                   │
│  Events:                                                         │
│  - message:new → Display new bot/agent response                  │
│  - widget:config-updated → Refresh configuration                 │
│  - widget:online → Update presence status                        │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Configuration Update Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  ADMIN UPDATES SETTINGS IN DASHBOARD                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Clicks "Save Configuration"                                     │
│  PUT /api/widget/config → Database updated                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Socket.io emits: "widget:config-updated"                       │
│  To: companyId room (all widgets for this company)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  WIDGET RECEIVES EVENT                                           │
│  1. Fetches latest config from API                              │
│  2. Updates styles with new colors                              │
│  3. Updates text with new messages                              │
│  4. No page reload needed! ✨                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Key Takeaways

### ✅ Configuration IS Being Used
```
Dashboard Settings
       ↓
    Database
       ↓
   API Endpoint
       ↓
  Widget Fetches
       ↓
   Applied to UI
```

### 🔒 Why Initial Form is Required
```
Without Form: Can't create conversation → No place to store messages
With Form:    Create conversation → Store user info → Enable messaging
```

### 💬 Message Flow
```
Initial Form → Conversation Created → Input Enabled → Send Messages
     ↑                                                        ↓
     └────────────── REQUIRED FIRST STEP ──────────────────────┘
```

## 📱 Visual States

### State 1: Minimized
```
Website Content
...
...
              [ 💬 ]  ← Floating button
```

### State 2: Initial Form (First Time)
```
┌─────────────────────────┐
│ Chat Widget        [×]  │
├─────────────────────────┤
│ Welcome message         │
│                         │
│ [Name input]            │
│ [Email input]           │
│ [Message textarea]      │
│                         │
│    [Start Chat]         │
└─────────────────────────┘
              [ 💬 ]
```

### State 3: Chat Active
```
┌─────────────────────────┐
│ Chat Widget        [×]  │
├─────────────────────────┤
│ [Bot] Hello!            │
│ [You] Hi there          │
│ [Bot] How can I help?   │
│                         │
├─────────────────────────┤
│ [Type message...] [➤]   │
└─────────────────────────┘
              [ 💬 ]
```

## 🚀 Quick Start Commands

```bash
# 1. Start server
npm run dev

# 2. Open demo page
open chat-widget-demo.html

# 3. Click bubble → Fill form → Chat!
```

That's it! 🎉
