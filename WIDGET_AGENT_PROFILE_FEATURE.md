# Widget Agent Profile Feature

## Summary
Added agent name and profile photo display to the chat widget for agent and bot messages with an improved layout.

## Changes Made

### 1. Widget JavaScript (`public/widget.js`)
Modified the `addMessageToUI` method to display agent information with new layout:
- **Agent Avatar**: Shows the agent's profile photo at the bottom left of the message bubble
- **Avatar Fallback**: Displays the first letter of the agent's name in a gray circle if no photo exists
- **Agent Name**: Shows the agent's name at the bottom of the message bubble, aligned with the bubble's margin (gray color, subtle appearance)
- **Improved Layout**: Messages are wrapped in a container with flexbox for proper alignment
- **Conditional Display**: Only shows agent info for AGENT and BOT role messages

### 2. Implementation Details

#### Agent Message Structure
Agent messages already include metadata with agent information:
```javascript
{
  id: "message-id",
  text: "Message text",
  role: "AGENT", // or "BOT"
  createdAt: "2025-01-15T10:30:00Z",
  meta: {
    agentId: "agent-user-id",
    agentName: "John Doe",
    agentPhoto: "https://example.com/photos/agent.jpg"
  }
}
```

#### Widget Rendering
The widget now renders agent messages with:
- Message wrapper container (`.chat-widget-message-wrapper`)
- Avatar and message content side by side (`.chat-widget-message-with-avatar`)
- Agent avatar image (`.chat-widget-agent-avatar`) or fallback (`.chat-widget-agent-avatar-fallback`)
- Message content container (`.chat-widget-message-content`) - holds bubble and name
- Agent name at bottom (`.chat-widget-agent-name`) - aligned with bubble margin

### 3. CSS Styling Updates
Updated CSS classes in the widget styles:
- `.chat-widget-message-wrapper` - Container for entire message with proper alignment
- `.chat-widget-message-with-avatar` - Flexbox container for avatar and content (aligned at bottom)
- `.chat-widget-message-content` - Flexbox column container for message bubble and agent name
- `.chat-widget-agent-name` - Agent name label in subtle gray color (11px, font-weight 500, margin-top 4px)
- `.chat-widget-agent-avatar` - Circular avatar image (28x28px, no border)
- `.chat-widget-agent-avatar-fallback` - Circular gray background with initials (28x28px, no border)

### 4. Fixed ESLint Issue
Fixed an ESLint error in `src/app/dashboard/chat-widget/page.tsx`:
- Changed apostrophe in "website's" to proper React escape sequence `&apos;`

## How It Works

1. **Agent sends message**: When an agent sends a message through the dashboard, the message includes their name and photo in the metadata
2. **Widget receives message**: The widget receives the message via Socket.IO or when loading conversation history
3. **Conditional rendering**: The widget checks if the message is from AGENT or BOT role
4. **Display agent info**: If agent information is available in `message.meta`, it displays:
   - Avatar at the bottom left, aligned with the message bubble
   - Message bubble positioned to the right of the avatar
   - Agent name below the message bubble, aligned with the bubble's left margin

## Testing

To test the feature:
1. Start the development server: `npm run dev`
2. Open the dashboard and send an agent message to a widget conversation
3. Open the website with the embedded widget
4. The agent's name and profile photo should appear above their messages

## Browser Compatibility

The implementation uses standard HTML/CSS/JavaScript and is compatible with all modern browsers that support:
- ES6 syntax (const, arrow functions, template literals)
- Optional chaining (`?.`)
- CSS Flexbox

## Visual Layout

The agent message layout follows this structure:
```
[Avatar] [Message Bubble]
         [Timestamp]
         [Agent Name]
```

Example:
```
[J] Hello! How can I help you today?
    2:30 PM
    John Doe
```

Where:
- Avatar (photo or initial) is positioned at the bottom left
- Message bubble is aligned with the avatar at the bottom
- Timestamp appears inside the message bubble
- Agent name appears in gray text below the message bubble, aligned with the bubble's left margin

## Future Enhancements

Potential improvements:
- Show agent online status indicator on avatar
- Display agent typing indicator with name
- Add agent role/title below the name
- Show multiple agents if the conversation is being handled by a team
- Add agent presence/availability status
- Animate avatar appearance for new agent messages
