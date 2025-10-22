# Day Separator Implementation Guide

## Changes Required in ConversationView.tsx

### 1. Add Helper Functions (after formatTime function around line 943)

```typescript
  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    // Otherwise show full date
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const shouldShowDateSeparator = (currentMessage: Message, previousMessage: Message | null) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.createdAt).toDateString();
    const previousDate = new Date(previousMessage.createdAt).toDateString();
    
    return currentDate !== previousDate;
  };
```

### 2. Update messages.map (around line 1203)

Change from:
```typescript
{messages.map((message) => {
```

To:
```typescript
{messages.map((message, index) => {
```

### 3. Add variables after agentPhoto (around line 1207)

Add these two lines after `const agentPhoto = message.meta?.agentPhoto;`:

```typescript
const previousMessage = index > 0 ? messages[index - 1] : null;
const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
```

### 4. Update the return statement (around line 1209-1215)

Change from:
```typescript
return (
  <div
    key={message.id}
    className={`flex items-start space-x-3 ${
      isCustomer ? "justify-start" : "justify-end"
    }`}
  >
```

To:
```typescript
return (
  <div key={message.id}>
    {/* Day separator */}
    {showDateSeparator && (
      <div className="flex items-center justify-center my-4">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="px-4 text-xs font-medium text-gray-500 bg-gray-50 rounded-full py-1">
          {formatDateSeparator(message.createdAt)}
        </span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>
    )}
    
    <div
      className={`flex items-start space-x-3 ${
        isCustomer ? "justify-start" : "justify-end"
      }`}
    >
```

### 5. Add closing div before the return closing (around line 1290)

Before the line `);` that closes the return statement, add:
```typescript
    </div>
  </div>
```

So it becomes:
```typescript
                  </div>
                )}
              </div>
            </div>
          </div>
        );
```

## Result

Messages will now show day separators like:
```
─────────────  Today  ─────────────
    Message 1
    Message 2
────────── Yesterday ──────────
    Message 3
──────── 29 October 2025 ────────
    Message 4
```

## Testing

1. Open a conversation with messages from different days
2. Verify separators appear between messages from different days
3. Verify "Today" and "Yesterday" labels work correctly
4. Verify older dates show full date format
