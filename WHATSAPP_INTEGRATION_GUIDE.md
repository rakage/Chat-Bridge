# WhatsApp Business API Integration Guide

## Overview

Integrating WhatsApp into your chatbot platform requires using Meta's **WhatsApp Business Platform** (formerly WhatsApp Business API). This is different from the WhatsApp Business App and provides programmatic access to send and receive messages.

## Meta API Features/Permissions Required

### 1. **WhatsApp Business Management** ⭐ CRITICAL
- **Permission:** `whatsapp_business_management`
- **Purpose:** Manage WhatsApp Business accounts, phone numbers, and message templates
- **Required For:**
  - Register phone numbers
  - Create and manage message templates
  - Configure business profile
  - Manage phone number settings

### 2. **WhatsApp Business Messaging** ⭐ CRITICAL
- **Permission:** `whatsapp_business_messaging`
- **Purpose:** Send and receive messages via WhatsApp
- **Required For:**
  - Send messages to customers
  - Receive incoming messages via webhooks
  - Send media (images, documents, videos)
  - Send template messages
  - Read message status (delivered, read)

### 3. **Business Management** (Optional but Recommended)
- **Permission:** `business_management`
- **Purpose:** Access WhatsApp Business Accounts (WABA) owned by Business Manager
- **Required For:**
  - Multi-account management
  - Enterprise clients with multiple WABAs
  - Agency use cases

## WhatsApp Business API vs WhatsApp Business App

| Feature | WhatsApp Business App | WhatsApp Business API |
|---------|----------------------|----------------------|
| **Target** | Small businesses | Medium to large businesses |
| **Integration** | Mobile app only | Programmatic API access |
| **Multiple Users** | No | Yes (multi-agent support) |
| **Automation** | Limited | Full automation with bots |
| **Cost** | Free | Conversation-based pricing |
| **Setup** | Simple (app download) | Complex (Meta approval required) |
| **Phone Number** | 1 per app | Multiple numbers per account |
| **API Access** | No | Yes |

**For your platform:** You need **WhatsApp Business API** (not the app).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Platform                             │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │───▶│   Backend    │───▶│   Database   │  │
│  │  Dashboard   │    │   API Routes │    │  (Postgres)  │  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘  │
│                              │                                │
└──────────────────────────────┼────────────────────────────────┘
                               │
                               │ HTTPS API Calls
                               │
                    ┌──────────▼─────────────┐
                    │   Meta Cloud API       │
                    │  (WhatsApp Business)   │
                    └──────────┬─────────────┘
                               │
                               │ Webhooks (incoming messages)
                               │
                    ┌──────────▼─────────────┐
                    │    Your Webhook        │
                    │  /api/webhook/whatsapp │
                    └────────────────────────┘
```

## Step-by-Step Implementation Approach

### Phase 1: Setup & Prerequisites

#### 1.1 Create Facebook App
```bash
# Go to: https://developers.facebook.com/apps/
1. Click "Create App"
2. Choose "Business" as app type
3. Fill in app details
4. Add "WhatsApp" product to your app
```

#### 1.2 Create WhatsApp Business Account (WABA)
```bash
# In Facebook App Dashboard > WhatsApp > Getting Started
1. Link or create a Meta Business Account
2. Create a WhatsApp Business Account (WABA)
3. Add a phone number for testing (provided by Meta)
4. Verify your business (required for production)
```

#### 1.3 Get API Credentials
```bash
# You'll need:
- Phone Number ID (identifies your WhatsApp number)
- WhatsApp Business Account ID (WABA ID)
- Access Token (from your app)
- App Secret (for webhook verification)
```

### Phase 2: Database Schema

```prisma
model WhatsAppConnection {
  id                    String         @id @default(cuid())
  companyId             String
  phoneNumberId         String         @unique  // WhatsApp phone number ID
  phoneNumber           String                  // Display phone number (e.g., +1234567890)
  displayName           String                  // Business display name
  businessAccountId     String                  // WABA ID
  accessTokenEnc        String                  // Encrypted access token
  webhookVerifyTokenEnc String                  // Encrypted webhook verify token
  isActive              Boolean        @default(true)
  autoBot               Boolean        @default(false)
  profilePictureUrl     String?
  businessProfile       Json?                   // Business profile data
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt
  company               Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  conversations         Conversation[]

  @@index([companyId])
  @@index([companyId, isActive])
  @@index([phoneNumberId])
  @@map("whatsapp_connections")
}

// Update Conversation model to support WhatsApp
model Conversation {
  // ... existing fields
  platform              Platform  // Add WHATSAPP to enum
  whatsAppConnectionId  String?
  whatsAppConnection    WhatsAppConnection? @relation(fields: [whatsAppConnectionId], references: [id])
}

enum Platform {
  FACEBOOK
  INSTAGRAM
  TELEGRAM
  WHATSAPP  // NEW
  WIDGET
}
```

### Phase 3: Backend Implementation

#### 3.1 WhatsApp API Library

```typescript
// src/lib/whatsapp.ts

export class WhatsAppAPI {
  private apiVersion = 'v21.0';
  private baseUrl = 'https://graph.facebook.com';

  /**
   * Send text message
   */
  async sendTextMessage(
    phoneNumberId: string,
    accessToken: string,
    recipientPhone: string,
    text: string
  ): Promise<{ message_id: string }> {
    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'text',
          text: { body: text },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Send media message (image, document, video)
   */
  async sendMediaMessage(
    phoneNumberId: string,
    accessToken: string,
    recipientPhone: string,
    mediaType: 'image' | 'document' | 'video' | 'audio',
    mediaUrl: string,
    caption?: string
  ): Promise<{ message_id: string }> {
    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: mediaType,
          [mediaType]: {
            link: mediaUrl,
            caption: caption,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Send template message (pre-approved messages)
   */
  async sendTemplateMessage(
    phoneNumberId: string,
    accessToken: string,
    recipientPhone: string,
    templateName: string,
    languageCode: string = 'en',
    components?: any[]
  ): Promise<{ message_id: string }> {
    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components || [],
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Mark message as read
   */
  async markAsRead(
    phoneNumberId: string,
    accessToken: string,
    messageId: string
  ): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Get business profile
   */
  async getBusinessProfile(
    phoneNumberId: string,
    accessToken: string
  ): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, appSecret: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }
}

export const whatsappAPI = new WhatsAppAPI();
```

#### 3.2 Webhook Handler

```typescript
// src/app/api/webhook/whatsapp/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { whatsappAPI } from '@/lib/whatsapp';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

// Webhook verification (GET request)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify the webhook
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// Webhook events (POST request)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256') || '';
    
    // Verify signature
    if (!whatsappAPI.verifyWebhookSignature(body, signature, process.env.WHATSAPP_APP_SECRET!)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const data = JSON.parse(body);
    
    // Process webhook events
    if (data.object === 'whatsapp_business_account') {
      for (const entry of data.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await handleIncomingMessage(change.value);
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('❌ WhatsApp webhook error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handleIncomingMessage(value: any) {
  const messages = value.messages || [];
  
  for (const message of messages) {
    const phoneNumberId = value.metadata.phone_number_id;
    const senderPhone = message.from;
    const messageType = message.type;
    
    // Find WhatsApp connection
    const connection = await db.whatsAppConnection.findUnique({
      where: { phoneNumberId },
      include: { company: true },
    });

    if (!connection) {
      console.error(`❌ No connection found for phone number: ${phoneNumberId}`);
      continue;
    }

    // Find or create conversation
    let conversation = await db.conversation.findFirst({
      where: {
        psid: senderPhone,
        platform: 'WHATSAPP',
        whatsAppConnectionId: connection.id,
      },
    });

    if (!conversation) {
      // Get contact info
      const contactName = value.contacts?.[0]?.profile?.name || senderPhone;
      
      conversation = await db.conversation.create({
        data: {
          psid: senderPhone,
          platform: 'WHATSAPP',
          whatsAppConnectionId: connection.id,
          customerName: contactName,
          status: 'OPEN',
          autoBot: connection.autoBot,
          lastMessageAt: new Date(),
          unreadCount: 1,
        },
      });
    }

    // Save message to database
    let messageText = '';
    let attachments = null;

    switch (messageType) {
      case 'text':
        messageText = message.text.body;
        break;
      case 'image':
        messageText = message.image.caption || '[Image]';
        attachments = { type: 'image', url: message.image.id };
        break;
      case 'document':
        messageText = message.document.caption || '[Document]';
        attachments = { type: 'document', url: message.document.id };
        break;
      case 'video':
        messageText = message.video.caption || '[Video]';
        attachments = { type: 'video', url: message.video.id };
        break;
      case 'audio':
        messageText = '[Audio]';
        attachments = { type: 'audio', url: message.audio.id };
        break;
      default:
        messageText = `[${messageType}]`;
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        platform: 'WHATSAPP',
        messageId: message.id,
        fromUser: true,
        text: messageText,
        attachments: attachments,
        timestamp: new Date(message.timestamp * 1000),
      },
    });

    // Update conversation
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
    });

    // Emit real-time event via Socket.IO
    // ... (similar to existing Facebook/Instagram implementation)
    
    // Auto-bot response if enabled
    if (connection.autoBot) {
      // Trigger AI response
      // ... (similar to existing auto-bot logic)
    }

    // Mark as read
    const accessToken = await decrypt(connection.accessTokenEnc);
    await whatsappAPI.markAsRead(phoneNumberId, accessToken, message.id);
  }
}
```

#### 3.3 API Routes for Sending Messages

```typescript
// src/app/api/whatsapp/send/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { whatsappAPI } from '@/lib/whatsapp';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, text, mediaUrl, mediaType } = await request.json();

    // Get conversation and connection
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { whatsAppConnection: true },
    });

    if (!conversation || !conversation.whatsAppConnection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const connection = conversation.whatsAppConnection;
    const accessToken = await decrypt(connection.accessTokenEnc);
    const recipientPhone = conversation.psid;

    // Send message
    let result;
    if (mediaUrl && mediaType) {
      result = await whatsappAPI.sendMediaMessage(
        connection.phoneNumberId,
        accessToken,
        recipientPhone,
        mediaType,
        mediaUrl,
        text
      );
    } else {
      result = await whatsappAPI.sendTextMessage(
        connection.phoneNumberId,
        accessToken,
        recipientPhone,
        text
      );
    }

    // Save to database
    const message = await db.message.create({
      data: {
        conversationId: conversation.id,
        platform: 'WHATSAPP',
        messageId: result.message_id,
        fromUser: false,
        text: text || '',
        attachments: mediaUrl ? { type: mediaType, url: mediaUrl } : null,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
```

### Phase 4: Frontend Integration

```typescript
// Similar to existing Facebook/Instagram/Telegram integration UI
// Add WhatsApp connection page at:
// src/app/dashboard/integrations/whatsapp/setup/page.tsx
// src/app/dashboard/integrations/whatsapp/manage/page.tsx
```

## Important Considerations

### 1. Message Templates
WhatsApp requires **pre-approved message templates** for business-initiated conversations:
- Templates must be submitted and approved by Meta
- Used for notifications, marketing, authentication
- Required for conversations older than 24 hours
- Cannot be used for real-time chat responses

### 2. Conversation Windows
- **24-Hour Window:** Free-form messaging allowed within 24 hours of customer's last message
- **After 24 Hours:** Must use approved templates only
- **Pricing:** Based on conversation categories (utility, authentication, marketing, service)

### 3. Rate Limits
- Messaging Tier 1: 1,000 conversations/day (default for new accounts)
- Messaging Tier 2: 10,000 conversations/day (after building reputation)
- Messaging Tier 3: 100,000 conversations/day
- Unlimited tier available for established businesses

### 4. Phone Number Requirements
- Must have a dedicated phone number (cannot use personal WhatsApp number)
- Number cannot be used with WhatsApp app simultaneously
- Requires phone verification
- One phone number per WABA (can have multiple numbers per business)

### 5. Business Verification
- Required for production use
- Meta Business Verification process
- Requires legal business documents
- Can take 1-2 weeks

## Pricing Structure

WhatsApp uses **conversation-based pricing**:

| Conversation Type | Description | Price (varies by country) |
|------------------|-------------|---------------------------|
| **User-Initiated** | Customer messages first | Free |
| **Business-Initiated (Utility)** | Account updates, order status | ~$0.005-0.03 |
| **Business-Initiated (Authentication)** | OTP, verification codes | ~$0.005-0.03 |
| **Business-Initiated (Marketing)** | Promotions, offers | ~$0.01-0.06 |
| **Business-Initiated (Service)** | Support, assistance | ~$0.005-0.03 |

**Free Tier:** 1,000 user-initiated conversations per month (per phone number)

## Meta App Review Requirements

### Required Permissions
1. **whatsapp_business_management**
   - Description: "Manage WhatsApp Business phone numbers and send messages"
   
2. **whatsapp_business_messaging**
   - Description: "Send and receive WhatsApp messages for customer support"

### Review Submission
```
App Use Case:
We operate a customer conversation management platform that helps 
businesses manage customer inquiries across multiple channels. Our 
WhatsApp integration allows businesses to:

1. Connect their WhatsApp Business phone number to our platform
2. Receive customer messages in a unified inbox
3. Respond to customer inquiries from our dashboard
4. Use AI-powered chatbot for automated responses
5. Manage multiple agents handling WhatsApp conversations

The whatsapp_business_management permission is needed to register 
and configure phone numbers.

The whatsapp_business_messaging permission is needed to send and 
receive messages on behalf of connected businesses.

All messages are sent only in response to customer inquiries or with 
explicit customer consent using approved message templates.
```

## Testing & Development

### 1. Test Phone Numbers
Meta provides test phone numbers for development:
- Use for testing without real phone numbers
- Limited to 5 test numbers
- No charges during testing

### 2. Webhook Testing
```bash
# Use ngrok for local webhook testing
ngrok http 3000

# Update webhook URL in Meta App Dashboard
https://your-ngrok-url.ngrok.io/api/webhook/whatsapp
```

### 3. Message Templates Testing
- Create templates in development mode
- No approval needed for testing
- Test all template variations

## Migration Path

### Phase 1: Infrastructure (Week 1-2)
- [ ] Create Facebook App with WhatsApp product
- [ ] Set up WhatsApp Business Account (WABA)
- [ ] Get test phone number from Meta
- [ ] Configure webhooks and verify
- [ ] Add database schema for WhatsApp

### Phase 2: Backend (Week 2-3)
- [ ] Implement WhatsApp API library
- [ ] Create webhook handler for incoming messages
- [ ] Implement send message API routes
- [ ] Add message template management
- [ ] Integrate with existing conversation system

### Phase 3: Frontend (Week 3-4)
- [ ] Create WhatsApp connection setup page
- [ ] Create WhatsApp manage page
- [ ] Update conversation list to show WhatsApp chats
- [ ] Update message UI for WhatsApp-specific features
- [ ] Add template message composer

### Phase 4: Testing & Optimization (Week 4-5)
- [ ] Test with real WhatsApp numbers
- [ ] Implement rate limiting
- [ ] Add error handling and retry logic
- [ ] Performance optimization
- [ ] Create message templates and submit for approval

### Phase 5: Production (Week 5-6)
- [ ] Complete business verification
- [ ] Submit app for Meta review
- [ ] Set up production webhooks
- [ ] Launch to beta users
- [ ] Monitor and iterate

## Summary

### Required Meta Features
✅ **whatsapp_business_management** - Register and manage phone numbers  
✅ **whatsapp_business_messaging** - Send and receive messages  
✅ **business_management** - (Optional) Multi-account management  

### Key Differences from Facebook/Instagram
- ❗ Requires dedicated phone number
- ❗ Conversation-based pricing (not free)
- ❗ 24-hour messaging window
- ❗ Template approval required for business-initiated messages
- ❗ Stricter business verification
- ❗ Rate limits based on messaging tiers

### Architecture Similarities
- ✅ Webhook-based message reception (like Facebook/Instagram)
- ✅ Similar database schema structure
- ✅ Same conversation management approach
- ✅ Compatible with existing Socket.IO real-time system
- ✅ Works with existing AI auto-bot logic

### Estimated Costs
- **Setup:** Free (Meta provides test numbers)
- **Messaging:** $0.005-0.06 per conversation (after 1,000 free)
- **Development:** 4-6 weeks of development time
- **Phone Numbers:** Cost varies by provider ($5-50/month)

**Recommendation:** Start with test phone numbers and migrate to production after proving the integration works with your existing architecture.
