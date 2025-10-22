# Widget Duplicate Message Fix

## Issue
Customers using the chat widget were receiving duplicate messages from agents. Each message from an agent appeared twice in the widget interface.

## Root Cause Analysis

### The Problem
The widget was joining TWO socket rooms:
1. **Conversation room**: `conversation:${conversationId}`
2. **Company room**: `company:${companyId}`

When an agent sent a message via `/api/messages/send`, the server emitted `message:new` events to:
1. The **conversation room** (for active viewers in that specific conversation)
2. The **company room** (for the conversations list and company-wide updates)

Since the widget was a member of BOTH rooms, it received the same `message:new` event twice:
- Once from the conversation room broadcast
- Once from the company room broadcast

### Why This Happened
The widget client code in `public/widget.js` was doing:
```javascript
this.socket.emit('join:conversation', this.conversationId);
this.socket.emit('join:company', this.config.companyId);  // ← This caused duplicates
```

The company room is intended for:
- Agent dashboards to see conversations list updates
- Cross-conversation notifications
- Company-wide events

The widget (customer-facing) should only be in the conversation room to receive messages for that specific conversation.

## The Fix

### Changes Made to `public/widget.js`

**Removed the widget from joining the company room:**
```javascript
this.socket.on('connect', () => {
  console.log('Widget socket connected');
  this.socket.emit('join:conversation', this.conversationId);
  
  // Note: Widget should NOT join company room to avoid duplicate messages
  // Agent messages are emitted to both conversation AND company rooms
  // Widget only needs conversation room to receive messages
  
  // Emit online status when connected
  this.socket.emit('widget:online', {
    conversationId: this.conversationId,
    sessionId: this.sessionId,
  });
});
```

### Additional Cleanup
Also removed unnecessary `.off()` calls and improved socket cleanup:
- Removed redundant `.off()` before `.on()` calls (Socket.io doesn't duplicate listeners)
- Added proper `disconnectSocket()` method for cleanup
- Stored `heartbeatInterval` reference for proper cleanup

## How the Fix Works

### Before (Duplicate Messages)
```
Agent sends message
    ↓
Server emits to conversation room → Widget receives (1st message)
    ↓
Server emits to company room → Widget receives (2nd message) ← DUPLICATE
```

### After (Single Message)
```
Agent sends message
    ↓
Server emits to conversation room → Widget receives (only message) ✓
    ↓
Server emits to company room → Widget NOT in this room ✓
```

## Testing
1. Open the widget as a customer
2. Start a conversation
3. Have an agent send messages from the dashboard
4. Verify each message appears only ONCE in the widget

## Files Modified
- `public/widget.js` - Removed company room join, cleaned up socket listeners

## Architecture Notes

### Socket Room Structure
- **Conversation rooms** (`conversation:${id}`): For participants of a specific conversation
  - Agents viewing the conversation
  - Customers in the widget
  
- **Company rooms** (`company:${id}`): For company-wide updates
  - Agents viewing conversation lists
  - Dashboard real-time updates
  - Should NOT include customer widgets

### Event Flow
When an agent sends a message:
1. Message saved to database
2. `message:new` emitted to conversation room (widget receives here)
3. `message:new` emitted to company room (for conversation list updates)
4. `conversation:view-update` emitted for UI updates
5. `conversation:updated` emitted for statistics

The widget only needs step 2 to display the message.
