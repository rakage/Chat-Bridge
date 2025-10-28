# Instagram Message Tags - 24-Hour Window Bypass

## Overview

Instagram enforces a **24-hour messaging window** - apps can only send messages to customers within 24 hours of receiving the customer's last message.

**Good News:** You can bypass this restriction using **Message Tags** for legitimate use cases!

---

## ✅ Implementation Status

**IMPLEMENTED:** The system now automatically uses the `HUMAN_AGENT` tag when sending messages outside the 24-hour window.

### What Happens Automatically:

1. **Within 24 hours**: Messages sent normally (no tag)
2. **After 24 hours**: Messages sent with `HUMAN_AGENT` tag automatically
3. **Error handling**: If tag fails, message is marked as failed in database

---

## 📋 Available Message Tags

### 1. **HUMAN_AGENT** ⭐ (Currently Used)
- **Purpose**: Customer support conversations
- **Use Case**: When your support team needs to follow up with customers
- **Best For**: Your CRM/customer service platform

### 2. **CONFIRMED_EVENT_UPDATE**
- **Purpose**: Event reminders and updates
- **Use Case**: Sending reminders about scheduled events
- **Example**: "Your appointment is tomorrow at 3 PM"

### 3. **POST_PURCHASE_UPDATE**
- **Purpose**: Order and shipping updates
- **Use Case**: E-commerce order status, tracking info
- **Example**: "Your order has shipped!"

### 4. **ACCOUNT_UPDATE**
- **Purpose**: Account-related notifications
- **Use Case**: Password changes, security alerts
- **Example**: "Your account settings were updated"

---

## ⚠️ Important Restrictions

### What You CAN Use Tags For:
✅ Customer support follow-ups  
✅ Responding to customer inquiries  
✅ Providing requested information  
✅ Transactional updates (orders, bookings)  
✅ Account security notifications  

### What You CANNOT Use Tags For:
❌ **Promotional content**  
❌ **Marketing messages**  
❌ **Unsolicited advertisements**  
❌ **Newsletters or broadcasts**  
❌ **Sales pitches**  

**Meta will review your usage and can revoke access if misused!**

---

## 🔧 How It Works

### Automatic Tag Detection

```typescript
// In src/lib/queue.ts

// Check last customer message time
const lastCustomerMessage = await db.message.findFirst({
  where: {
    conversationId: msg.conversationId,
    role: "USER",
  },
  orderBy: { createdAt: "desc" },
});

const hoursSinceLastMessage = 
  (Date.now() - lastCustomerMessage.createdAt.getTime()) / (1000 * 60 * 60);

// Automatically add tag if > 24 hours
const needsTag = hoursSinceLastMessage > 24;
const messageTag = needsTag ? 'HUMAN_AGENT' : undefined;
```

### Instagram API Request

```typescript
const payload = {
  recipient: { id: recipientId },
  message: { text: messageText },
  tag: 'HUMAN_AGENT' // Added when outside 24-hour window
};

await fetch(`https://graph.instagram.com/v24.0/${instagramUserId}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload),
});
```

---

## 🔍 Logging & Monitoring

### Console Logs

**Within 24 hours:**
```
🚀 Sending Instagram text message to 123456789 via IG user 987654321
```

**Outside 24 hours:**
```
⏰ Message outside 24-hour window (36h ago), using HUMAN_AGENT tag
🚀 Sending Instagram text message to 123456789 via IG user 987654321 with HUMAN_AGENT tag
```

**If tag fails:**
```
❌ Instagram 24-hour window error for message abc-123: Message sent outside allowed window
💡 Tip: Instagram only allows sending messages within 24 hours after customer's last message
```

---

## 📊 Message Metadata

Failed messages are tracked in the database:

```json
{
  "meta": {
    "failed": true,
    "failedAt": "2025-10-28T10:30:00.000Z",
    "failureReason": "24-hour messaging window expired",
    "errorCode": 2534022
  }
}
```

---

## 🚀 Testing

### Test Scenario 1: Message Within 24 Hours
1. Customer sends message to your Instagram
2. Agent replies within 24 hours
3. ✅ Message sent normally (no tag)

### Test Scenario 2: Message After 24 Hours
1. Customer sent message 30 hours ago
2. Agent tries to reply
3. ✅ Message sent with `HUMAN_AGENT` tag
4. Check console for: `⏰ Message outside 24-hour window (30h ago), using HUMAN_AGENT tag`

### Test Scenario 3: Tag Rejected by Instagram
1. If Instagram rejects the tag (e.g., permission not granted)
2. ❌ Error code 2534022 returned
3. Message marked as failed in database
4. Console shows helpful error message

---

## 📝 Meta App Review Requirements

### Permissions Needed

When submitting for Meta review, you need:

1. **`instagram_business_basic`** - Get Instagram account info
2. **`instagram_business_manage_messages`** - Send/receive messages

### Message Tag Justification

**For App Review, explain:**

> "Our customer service platform uses the HUMAN_AGENT tag to allow support teams to respond to customer inquiries beyond the 24-hour window. This is essential for providing quality customer support when agents are not available 24/7 or when customers follow up on previous conversations."

### Demo Video Should Show:
1. Customer sends message
2. Wait > 24 hours (or simulate)
3. Agent sends reply with tag
4. Message delivered successfully

---

## 🔐 Compliance & Best Practices

### 1. Use Tags Appropriately
- Only for customer support conversations
- Not for promotional content
- Respond to customer-initiated conversations

### 2. Monitor Usage
- Track tag usage in logs
- Review failed messages regularly
- Ensure compliance with Meta policies

### 3. Transparent Communication
- Inform customers about response times
- Set clear expectations in welcome messages
- Use tags only when necessary

### 4. Rate Limiting
- Don't abuse tag permissions
- Respect Instagram API rate limits
- Avoid bulk messaging with tags

---

## ⚙️ Configuration (Future Enhancement)

Currently, `HUMAN_AGENT` is hardcoded. You can make it configurable:

```typescript
// .env
INSTAGRAM_MESSAGE_TAG=HUMAN_AGENT

// In code
const messageTag = needsTag ? process.env.INSTAGRAM_MESSAGE_TAG : undefined;
```

Or allow per-conversation tag selection in the UI:

```typescript
// UI dropdown when sending message outside window
<Select>
  <option value="HUMAN_AGENT">Customer Support</option>
  <option value="POST_PURCHASE_UPDATE">Order Update</option>
  <option value="CONFIRMED_EVENT_UPDATE">Event Reminder</option>
</Select>
```

---

## 🐛 Troubleshooting

### Error: "Message sent outside of allowed window"

**Possible causes:**
1. ❌ Message tag permission not granted by Meta
2. ❌ Tag misused (e.g., for promotional content)
3. ❌ Account flagged for policy violations

**Solutions:**
1. ✅ Submit app for review with proper justification
2. ✅ Ensure tag usage follows Meta policies
3. ✅ Check Meta App Dashboard for warnings
4. ✅ Review business verification status

### Tag Works But Messages Not Delivering

**Check:**
1. Instagram Business Account status
2. Message quality score
3. Customer hasn't blocked your account
4. Rate limiting not exceeded

---

## 📚 References

- [Instagram Messaging API](https://developers.facebook.com/docs/instagram-api/guides/messaging)
- [Message Tags Policy](https://developers.facebook.com/docs/messenger-platform/policy/policy-overview/#message_tags)
- [App Review Guide](https://developers.facebook.com/docs/app-review)

---

## ✅ Summary

**You CAN now send messages outside the 24-hour window!**

✅ Automatically uses `HUMAN_AGENT` tag  
✅ Works for customer support conversations  
✅ Handles errors gracefully  
✅ Complies with Meta policies  

**Just make sure:**
- Meta app review approves your permissions
- You use tags only for legitimate customer support
- You don't send promotional content with tags

---

**Status**: ✅ IMPLEMENTED  
**Date**: 2025-10-28  
**Tag Used**: `HUMAN_AGENT` (automatic)
