# Instagram Image Format Validation

## Problem
Instagram API doesn't support WebP image format, causing errors when agents try to send .webp images:
```
Error: This attachment format is not supported.
Instagram API error code: 100, subcode: 2534080
```

## Instagram API Image Support
According to [Instagram API documentation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/send-messages):

| Media Type | Supported Formats | Max Size |
|------------|------------------|----------|
| Image      | PNG, JPEG, GIF   | 8MB      |

**Note:** WebP is NOT supported by Instagram (but is supported by Facebook Messenger, Telegram, and Widget)

## Solution Implemented

### 1. Frontend Validation (`ConversationView.tsx`)

**Platform-specific file type filtering:**
```typescript
const isInstagram = platform === "INSTAGRAM";
const allowedTypes = isInstagram 
  ? ["image/jpeg", "image/jpg", "image/png", "image/gif"]  // No WebP
  : ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
```

**Platform-specific file size limits:**
```typescript
const maxSize = isInstagram ? 8 * 1024 * 1024 : 10 * 1024 * 1024;
```

**User-friendly error messages:**
- If WebP uploaded for Instagram: `"Instagram doesn't support WebP images. Please use JPEG, PNG, or GIF format."`
- File too large: `"File too large. Maximum size is 8MB for Instagram"` or `"10MB"` for others

**Dynamic file input accept attribute:**
```tsx
<input
  type="file"
  accept={conversation?.platform === "INSTAGRAM" 
    ? "image/jpeg,image/jpg,image/png,image/gif"
    : "image/jpeg,image/jpg,image/png,image/webp,image/gif"}
/>
```

### 2. Backend Validation (`src/app/api/messages/send/route.ts`)

**Early platform detection:**
```typescript
const tempConversation = await db.conversation.findUnique({
  where: { id: conversationId },
  select: { platform: true }
});

const isInstagram = tempConversation?.platform === "INSTAGRAM";
```

**Platform-specific validation:**
```typescript
const allowedTypes = isInstagram
  ? ["image/jpeg", "image/jpg", "image/png", "image/gif"]
  : ALLOWED_IMAGE_TYPES;

const maxSize = isInstagram ? 8 * 1024 * 1024 : MAX_FILE_SIZE;
```

**Clear error responses:**
```json
{
  "error": "Instagram doesn't support WebP images. Please use JPEG, PNG, or GIF format."
}
```

## Files Changed
1. `src/components/realtime/ConversationView.tsx` - Frontend validation
2. `src/app/api/messages/send/route.ts` - Backend validation

## Testing

### Instagram Conversations
- ✅ JPEG/PNG/GIF accepted (max 8MB)
- ✅ WebP rejected with clear error message
- ✅ File picker only shows supported formats

### Other Platforms (Facebook, Telegram, Widget)
- ✅ JPEG/PNG/GIF/WebP accepted (max 10MB)
- ✅ No change in behavior

## User Experience

**Before:**
1. Agent uploads WebP image to Instagram conversation
2. Image appears to send successfully
3. Queue worker fails silently or shows cryptic error
4. Customer never receives image

**After:**
1. Agent tries to upload WebP to Instagram conversation
2. **Clean popup modal appears:**
   - Title: "Invalid Image Format"
   - Message: "Instagram doesn't support WebP images. Please use JPEG, PNG, or GIF format."
   - Button: "OK"
3. Upload prevented - no wasted time
4. Agent can convert and re-upload in supported format

**UI Implementation:**
- Uses `AlertDialog` component for clean, centered modal
- Non-intrusive - doesn't cover entire conversation view
- Clear, actionable error message
- Single "OK" button to dismiss

## Platform Comparison

| Platform  | JPEG | PNG | GIF | WebP | Max Size |
|-----------|------|-----|-----|------|----------|
| Instagram | ✅   | ✅  | ✅  | ❌   | 8MB      |
| Facebook  | ✅   | ✅  | ✅  | ✅   | 10MB     |
| Telegram  | ✅   | ✅  | ✅  | ✅   | 10MB     |
| Widget    | ✅   | ✅  | ✅  | ✅   | 10MB     |
