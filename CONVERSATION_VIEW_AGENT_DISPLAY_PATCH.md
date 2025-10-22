# ConversationView Agent Display Patch

## Changes Required

Replace the message rendering section in `src/components/realtime/ConversationView.tsx` around line 810.

### Find this code:

```typescript
              {messages.map((message) => {
                const isCustomer = message.role === "USER";
                
                return (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      isCustomer ? "justify-start" : "justify-end"
                    }`}
                  >
                    {/* Icon on left for customer */}
                    {isCustomer && (
                      <div className="flex-shrink-0 mt-1">
                        {getMessageIcon(message.role, message.meta)}
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <div className={`flex flex-col max-w-xs lg:max-w-md ${!isCustomer ? "items-end" : ""}`}>
                      <div
                        className={`p-3 rounded-lg ${getMessageBgColor(
                          message.role
                        )}`}
                      >
                        <p className="text-sm">{message.text}</p>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatTime(message.createdAt)}
                        </span>
                        {message.meta?.sent && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                        {message.role === "BOT" && message.meta?.model && (
                          <span className="text-xs text-gray-400">
                            {message.meta.model}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Icon on right for agent/bot */}
                    {!isCustomer && (
                      <div className="flex-shrink-0 mt-1">
                        {getMessageIcon(message.role, message.meta)}
                      </div>
                    )}
                  </div>
                );
              })}
```

### Replace with this code:

```typescript
              {messages.map((message) => {
                const isCustomer = message.role === "USER";
                const isAgent = message.role === "AGENT";
                const agentName = message.meta?.agentName;
                const agentPhoto = message.meta?.agentPhoto;
                
                return (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      isCustomer ? "justify-start" : "justify-end"
                    }`}
                  >
                    {/* Icon on left for customer */}
                    {isCustomer && (
                      <div className="flex-shrink-0 mt-1">
                        {getMessageIcon(message.role, message.meta)}
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <div className={`flex flex-col max-w-xs lg:max-w-md ${!isCustomer ? "items-end" : ""}`}>
                      {/* Agent name above message bubble (right side) */}
                      {isAgent && agentName && (
                        <span className="text-xs text-gray-600 mb-1 mr-1">
                          {agentName}
                        </span>
                      )}
                      
                      <div
                        className={`p-3 rounded-lg ${getMessageBgColor(
                          message.role
                        )}`}
                      >
                        <p className="text-sm">{message.text}</p>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatTime(message.createdAt)}
                        </span>
                        {message.meta?.sent && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                        {message.role === "BOT" && message.meta?.model && (
                          <span className="text-xs text-gray-400">
                            {message.meta.model}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Avatar on right for agent/bot */}
                    {!isCustomer && (
                      <div className="flex-shrink-0 mt-1">
                        {isAgent && agentPhoto ? (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={agentPhoto} alt={agentName || "Agent"} />
                            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                              {agentName?.charAt(0).toUpperCase() || "A"}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            {getMessageIcon(message.role, message.meta)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
```

## Summary of Changes:

1. **Added variables** to extract agent info:
   - `const isAgent = message.role === "AGENT";`
   - `const agentName = message.meta?.agentName;`
   - `const agentPhoto = message.meta?.agentPhoto;`

2. **Added agent name display** above the message bubble (for agent messages only)

3. **Replaced icon with avatar** for agent messages:
   - Shows agent photo if available
   - Fallback to agent initials if no photo
   - Fallback to icon for bot messages

## Files Already Modified:

✅ `src/app/api/messages/send/route.ts` - Added `agentPhoto` to message meta
✅ `src/components/realtime/ConversationView.tsx` - Added Avatar import

## Apply the Patch:

Manually edit the file at the location specified above, or use your IDE's find-and-replace with the code blocks provided.
