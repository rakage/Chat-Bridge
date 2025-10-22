# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

A production-ready Facebook Messenger chatbot dashboard with AI integration, real-time conversations, and comprehensive bot management. Built with Next.js 15, TypeScript, PostgreSQL, Redis, and Socket.IO for real-time features.

## Key Development Commands

### Database Operations
- `npm run db:generate` - Generate Prisma client after schema changes
- `npm run db:push` - Push schema changes to database (dev)
- `npm run db:seed` - Seed the database with demo data

### Development Servers
- `npm run dev` - Standard Next.js development server
- `npm run dev:realtime` - Run with Socket.IO real-time server (recommended)
- `npm run start:realtime` - Production server with real-time features

### Testing & Linting
- `npm run lint` - Run ESLint
- `npm run build` - Build for production
- `npm run start` - Start production build

### Critical Services
Always start Redis before running the application:
```bash
# Docker (recommended)
docker run -d --name redis -p 6379:6379 redis:alpine

# Test Redis connection
redis-cli ping
```

## Architecture Overview

### Core Infrastructure
- **Frontend**: Next.js 15 (App Router) with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes with BullMQ workers for message processing
- **Database**: PostgreSQL with Prisma ORM for data persistence
- **Real-time**: Socket.IO for live conversation updates
- **Queue System**: Redis + BullMQ for asynchronous message processing
- **Security**: libsodium encryption for API keys and sensitive data

### Key Domain Models
- **Company** - Multi-tenant organization with users and Facebook pages
- **PageConnection** - Facebook Page integration with encrypted tokens
- **ProviderConfig** - LLM provider settings (OpenAI/Gemini/OpenRouter)
- **Conversation** - Facebook Messenger conversations with auto-bot settings
- **Message** - Individual messages with role (USER/AGENT/BOT)

### Critical Components

#### LLM Integration (`src/lib/llm/`)
Multi-provider LLM service supporting OpenAI, Gemini, and OpenRouter:
- **service.ts** - Main LLM service with provider abstraction
- **providers/** - Individual provider implementations
- Safety checks for content filtering and message limits

#### Facebook Integration (`src/lib/facebook.ts`)
Complete Facebook Messenger API wrapper:
- Webhook verification and signature validation
- Send/receive message handling
- User profile fetching
- Page subscription management

#### Queue System (`src/lib/queue.ts`)
BullMQ-based async processing:
- **incoming-message** - Process Facebook webhook messages
- **bot-reply** - Generate AI responses
- **outgoing-message** - Send messages to Facebook with retry logic

#### RAG Chatbot (`src/lib/rag-chatbot.ts`)
Advanced AI chatbot with memory and document search:
- Conversation memory management with summarization
- Vector embedding search through Supabase
- Multi-provider LLM support with fallbacks

### Real-time Architecture
- **server.js/server-production.js** - Custom Next.js server with Socket.IO
- Room-based messaging (company and conversation rooms)
- Live conversation updates and typing indicators

### Security Features
- Field-level encryption for API keys using libsodium
- Webhook signature verification for Facebook
- Role-based access control (OWNER/ADMIN/AGENT)
- Safe content filtering in LLM responses

## Development Workflow

### Setting Up New Features
1. Update Prisma schema if database changes needed
2. Run `npm run db:generate && npm run db:push`
3. Add API routes in `src/app/api/`
4. Update Socket.IO events in server files if real-time needed
5. Add UI components in `src/components/`

### Facebook Integration Testing
Use the webhook test endpoint for development:
- `POST /api/webhook/facebook` - Production webhook
- Built-in webhook verification and signature validation
- Comprehensive error handling and logging

### Queue Job Testing
- Jobs auto-initialize when first queue is accessed
- Use `/api/realtime/init` to manually initialize workers
- Check Redis connection: `redis-cli ping`

### Common Patterns

#### API Route Structure
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Input validation with Zod
    // Business logic
    // Return JSON response
  } catch (error) {
    return NextResponse.json({ error: "Message" }, { status: 500 });
  }
}
```

#### Socket.IO Event Handling
```typescript
// Emit to specific conversation
global.socketIO?.to(`conversation:${conversationId}`).emit("message:new", data);

// Emit to company (all users)
global.socketIO?.to(`company:${companyId}`).emit("conversation:updated", data);
```

#### LLM Provider Usage
```typescript
const response = await llmService.generateResponse({
  provider: "OPENAI",
  apiKey: decryptedKey,
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 1000,
  systemPrompt: "You are a helpful assistant"
}, messages);
```

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `ENCRYPTION_KEY` - 32-byte base64 encryption key
- `FB_APP_SECRET` - Facebook app secret for webhook verification

### Optional (can be configured in UI)
- `FB_APP_ID` - Facebook app ID
- `OPENAI_API_KEY` - OpenAI API key
- `GEMINI_API_KEY` - Google Gemini API key
- `OPENROUTER_API_KEY` - OpenRouter API key

## Troubleshooting

### Redis Connection Issues
Check Redis status and restart if needed:
```bash
redis-cli ping
docker restart redis
```

### Socket.IO Not Working
Use the real-time server: `npm run dev:realtime`
Check browser console for WebSocket errors

### Facebook Webhook Issues
- Verify webhook URL is publicly accessible
- Check signature validation in logs
- Use ngrok for local development: `ngrok http 3000`

### Database Issues
Reset and reseed database:
```bash
npm run db:push --force-reset
npm run db:seed
```

## Testing Access
Demo users available after seeding:
- `owner@example.com` - Full system access
- `admin@example.com` - Manage settings and conversations  
- `agent@example.com` - Handle conversations only

Authentication uses magic links - check console logs for sign-in links during development.