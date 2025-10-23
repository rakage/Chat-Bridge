# Facebook Login for Business & Messenger Integration Guide

This guide covers the enhanced Facebook Login for Business and comprehensive Messenger platform integration implemented in the Facebook Bot Dashboard.

## Table of Contents

1. [Overview](#overview)
2. [Facebook Login for Business](#facebook-login-for-business)
3. [Enhanced Messenger Integration](#enhanced-messenger-integration)
4. [Environment Configuration](#environment-configuration)
5. [API Endpoints](#api-endpoints)
6. [Component Usage](#component-usage)
7. [Webhook Events](#webhook-events)
8. [Error Handling](#error-handling)
9. [Security Features](#security-features)
10. [Troubleshooting](#troubleshooting)

## Overview

The enhanced integration provides:

- **Facebook Login for Business** support with configuration-based authentication
- **Comprehensive Messenger Platform** features including:
  - Advanced message types (templates, quick replies, attachments)
  - Complete webhook event handling
  - Enhanced security with SHA256 signature verification
  - Business Integration System User access tokens
  - Comprehensive error handling and monitoring

## Facebook Login for Business

### Features

- **Configuration-based Authentication**: Use pre-configured business login configurations
- **Business Integration System User Tokens**: Long-lived tokens for automated operations
- **Granular Permissions**: Fine-grained access control for business assets
- **Enhanced Security**: SHA256 signature verification and App Secret Proof

### Supported Permissions

The system supports all Facebook Login for Business permissions:

#### Core Permissions
- `ads_management` - Manage advertising accounts
- `ads_read` - Read advertising data

- `pages_messaging` - Send messages on behalf of pages
- `pages_manage_posts` - Create and manage posts
- `instagram_basic` - Access Instagram account info
- `instagram_manage_messages` - Manage Instagram direct messages

### Configuration Setup

1. **Create Facebook App** (Business type)
2. **Add Facebook Login for Business** product
3. **Create Configuration** in the Facebook App Dashboard:
   ```json
   {
     "config_id": "your-config-id",
     "name": "Your Business Integration",
     "token_type": "business_system_user",
     "permissions": [
       "pages_messaging",
       "pages_manage_posts"
     ],
     "assets": ["page-id-1", "page-id-2"]
   }
   ```

## Enhanced Messenger Integration

### Message Types Supported

#### 1. Text Messages
```typescript
await facebookAPI.sendMessage(pageAccessToken, {
  recipient: { id: recipientId },
  message: { text: "Hello, world!" },
  messaging_type: "RESPONSE"
});
```

#### 2. Quick Replies
```typescript
await facebookAPI.sendTextWithQuickReplies(
  pageAccessToken,
  recipientId,
  "Choose an option:",
  [
    {
      content_type: "text",
      title: "Option 1",
      payload: "OPTION_1"
    },
    {
      content_type: "text", 
      title: "Option 2",
      payload: "OPTION_2"
    }
  ]
);
```

#### 3. Generic Templates (Carousels)
```typescript
await facebookAPI.sendGenericTemplate(
  pageAccessToken,
  recipientId,
  [
    {
      title: "Product 1",
      subtitle: "Description of product 1",
      image_url: "https://example.com/image1.jpg",
      buttons: [
        {
          type: "web_url",
          title: "View Product",
          url: "https://example.com/product1"
        }
      ]
    }
  ]
);
```

#### 4. Button Templates
```typescript
await facebookAPI.sendButtonTemplate(
  pageAccessToken,
  recipientId,
  "Choose an action:",
  [
    {
      type: "postback",
      title: "Get Started",
      payload: "GET_STARTED"
    },
    {
      type: "web_url",
      title: "Visit Website",
      url: "https://example.com"
    }
  ]
);
```

#### 5. File Attachments
```typescript
// Upload and send attachment
const { attachment_id } = await facebookAPI.uploadAttachment(
  pageAccessToken,
  "image",
  "https://example.com/image.jpg",
  true // reusable
);

await facebookAPI.sendAttachmentById(
  pageAccessToken,
  recipientId,
  "image",
  attachment_id
);

// Or send directly
await facebookAPI.sendAttachmentByUrl(
  pageAccessToken,
  recipientId,
  "image",
  "https://example.com/image.jpg"
);
```

#### 6. Typing Indicators
```typescript
// Show typing indicator
await facebookAPI.sendTypingIndicator(
  pageAccessToken,
  recipientId,
  "typing_on"
);

// Hide typing indicator
await facebookAPI.sendTypingIndicator(
  pageAccessToken,
  recipientId,
  "typing_off"
);

// Mark message as seen
await facebookAPI.sendTypingIndicator(
  pageAccessToken,
  recipientId,
  "mark_seen"
);
```

### Message Tags

For messages sent outside the 24-hour window:

- `ACCOUNT_UPDATE` - Account notifications
- `CONFIRMED_EVENT_UPDATE` - Event reminders
- `CUSTOMER_FEEDBACK` - Feedback surveys
- `HUMAN_AGENT` - Human agent support
- `POST_PURCHASE_UPDATE` - Order updates

## Environment Configuration

Add these environment variables to your `.env.local`:

```env
# Facebook App Configuration
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_API_VERSION=v23.0
FACEBOOK_REDIRECT_URI=https://yourdomain.com/api/auth/facebook/callback

# Webhook Configuration  
WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
SKIP_WEBHOOK_SIGNATURE=false  # Set to true for development only

# Business Login Configuration (optional)
FACEBOOK_BUSINESS_CONFIG_ID=your_business_config_id
```

## API Endpoints

### Authentication Endpoints

#### Standard Login
```
GET /api/auth/facebook/login-url
```
Returns Facebook OAuth URL for standard login.

#### Business Login  
```
GET /api/auth/facebook/business-login-url?config_id=YOUR_CONFIG_ID
```
Returns Facebook Login for Business URL.

#### OAuth Callback
```
GET /api/auth/facebook/callback
```
Handles OAuth callback and exchanges code for tokens.

### Webhook Endpoint

```
GET/POST /api/webhook/facebook
```
- `GET`: Webhook verification
- `POST`: Webhook events processing

## Component Usage

### FacebookLoginButton Component

#### Standard Login
```tsx
<FacebookLoginButton
  onLoading={(loading) => setLoading(loading)}
  disabled={false}
  className="custom-class"
  size="default"
  variant="default"
/>
```

#### Business Login
```tsx
<FacebookLoginButton
  businessLogin={true}
  configId="your-config-id"
  onLoading={(loading) => setLoading(loading)}
  disabled={false}
  className="custom-class" 
  size="default"
  variant="default"
/>
```

## Webhook Events

The system handles all Messenger Platform webhook events:

### Message Events
- **Text Messages** - Regular text from users
- **Quick Replies** - User selections from quick reply buttons
- **Attachments** - Images, videos, files, audio
- **Message Echo** - Messages sent by your page
- **Message Edits** - When users edit sent messages
- **Message Reactions** - Emoji reactions to messages

### Engagement Events  
- **Postbacks** - Button clicks, persistent menu, Get Started
- **Delivery Confirmations** - Message delivery status
- **Read Receipts** - When users read messages

### Advanced Events
- **Account Linking** - Link/unlink user accounts
- **Optins** - Checkbox plugin, Send-to-Messenger
- **Referrals** - m.me links, ad referrals  
- **Policy Enforcement** - Compliance notifications
- **Handovers** - Conversation handoffs between apps

### Event Processing Example

```typescript
// In your webhook handler
for (const messagingEvent of entry.messaging) {
  if (facebookAPI.isMessageEvent(messagingEvent)) {
    if (facebookAPI.hasQuickReply(messagingEvent)) {
      const payload = facebookAPI.getQuickReplyPayload(messagingEvent);
      // Handle quick reply
    } else if (facebookAPI.hasAttachments(messagingEvent)) {
      const type = facebookAPI.getAttachmentType(messagingEvent);
      // Handle attachment
    } else {
      // Handle regular text message
    }
  } else if (facebookAPI.isPostbackEvent(messagingEvent)) {
    const payload = facebookAPI.getPostbackPayload(messagingEvent);
    // Handle postback
  } else if (facebookAPI.isReactionEvent(messagingEvent)) {
    // Handle message reaction
  }
  // ... other event types
}
```

## Error Handling

The enhanced error handling system provides:

### Features
- **Structured Error Parsing** - Parse Facebook API errors
- **Severity Classification** - Critical, High, Medium, Low
- **User-Friendly Messages** - Readable error descriptions
- **Retry Logic** - Identify retryable errors
- **Monitoring Integration** - Ready for Sentry, LogRocket, etc.

### Usage Example

```typescript
import { facebookErrorHandler } from '@/lib/facebook-error-handler';

try {
  await facebookAPI.sendMessage(pageAccessToken, request);
} catch (error) {
  // Automatically handle and return appropriate response
  return facebookErrorHandler.handleApiError(error, {
    userId: session.user.id,
    pageId: pageId,
    operation: 'send_message'
  });
}
```

### Error Codes

Common Facebook error codes and their meanings:

- **100** - Invalid parameter
- **190** - Access token expired  
- **200** - Permission denied
- **400** - Application limit reached
- **506** - Duplicate post
- **613** - Rate limit exceeded

## Security Features

### Webhook Signature Verification

```typescript
// Automatic signature verification in webhook handler
const validation = facebookErrorHandler.validateWebhookSignature(
  payload,
  signature,
  appSecret
);

if (!validation.valid) {
  console.error('Invalid signature:', validation.error);
  return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
}
```

### App Secret Proof

For secure API calls:

```typescript
// Automatically generated for Business Integration System User tokens
const appsecretProof = facebookOAuth.generateAppSecretProof(accessToken);
```

### Supported Signature Methods
- **SHA256** (recommended) - `x-hub-signature-256` header
- **SHA1** (legacy) - `x-hub-signature` header

## Troubleshooting

### Common Issues

#### 1. Invalid Webhook Signature
- **Cause**: Wrong app secret or signature format
- **Solution**: Verify `FACEBOOK_APP_SECRET` and check signature headers

#### 2. Permission Denied (Code 200)
- **Cause**: Missing required permissions
- **Solution**: Add permissions in Facebook App Dashboard and re-authorize

#### 3. Access Token Expired (Code 190)  
- **Cause**: Token expired or invalidated
- **Solution**: Refresh or re-generate access token

#### 4. Rate Limited (Code 613)
- **Cause**: Too many API calls
- **Solution**: Implement backoff strategy and respect rate limits

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
DEBUG=facebook:*
```

### Health Check

Check your integration status:

```bash
curl -X GET "https://graph.facebook.com/v23.0/me?access_token=YOUR_TOKEN"
```

### Webhook Testing

Test webhook endpoint:

```bash
curl -X GET "https://yourdomain.com/api/webhook/facebook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=YOUR_VERIFY_TOKEN"
```

## Best Practices

### 1. Token Management
- Use long-lived tokens for automated operations
- Store tokens securely (encrypted)
- Monitor token expiration
- Implement token refresh logic

### 2. Error Handling
- Always handle Facebook API errors gracefully
- Implement retry logic for transient errors
- Log errors with context for debugging
- Provide user-friendly error messages

### 3. Webhook Processing
- Always return 200 OK for valid webhooks
- Process events asynchronously when possible
- Handle duplicate events (dedupe by message ID)
- Implement proper error recovery

### 4. Security
- Always verify webhook signatures in production
- Use HTTPS for all webhook endpoints
- Validate all user input
- Implement rate limiting

### 5. Performance
- Use message queuing for high-volume webhooks
- Batch API calls when possible
- Cache frequently accessed data
- Monitor API usage and optimize

## Support

For additional support:

1. Check Facebook Developer Documentation
2. Review error logs and monitoring data
3. Test with Facebook's Graph API Explorer
4. Verify webhook subscriptions in Facebook App Dashboard

---

This integration provides enterprise-grade Facebook Login for Business and Messenger platform capabilities with comprehensive error handling, security features, and monitoring support.