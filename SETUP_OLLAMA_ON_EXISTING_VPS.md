# Setup Ollama on Your Existing VPS

## Your VPS Specs ✅

```
CPU: 2 vCPU cores
RAM: 4GB
Status: ✅ Perfect for Ollama + nomic-embed-text!
```

**Expected Performance:**
- Embedding speed: 1-1.5 seconds per document
- Memory usage: ~1.5GB (37% of 4GB)
- Concurrent users: 5-10
- Perfect for production use!

---

## Quick Setup (15 minutes)

### Step 1: SSH into Your VPS

```bash
ssh root@your-vps-ip
# Or: ssh user@your-vps-ip
```

### Step 2: Run Installation Script

**Option A: Automatic Setup (Recommended)**

```bash
# Download setup script
wget https://raw.githubusercontent.com/your-repo/setup-ollama-vps.sh

# Or use the local script
# Upload setup-ollama-vps.sh to your VPS

# Make it executable
chmod +x setup-ollama-vps.sh

# Run it
sudo bash setup-ollama-vps.sh
```

**Option B: Manual Setup**

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 3. Start service
sudo systemctl start ollama
sudo systemctl enable ollama

# 4. Pull model
ollama pull nomic-embed-text

# 5. Test it
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "Test document"
}'
```

### Step 3: Configure for External Access (if app is on different server)

If your Next.js app runs on a different server than Ollama:

```bash
# Create systemd override
sudo mkdir -p /etc/systemd/system/ollama.service.d

# Create override file
sudo tee /etc/systemd/system/ollama.service.d/override.conf << EOF
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
EOF

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart ollama

# Configure firewall (if using UFW)
sudo ufw allow 11434/tcp
```

**Security Warning:** Only expose Ollama externally if needed. Use internal networking or VPN if possible.

---

## Integration with Your App

### If App is on Same VPS ✅ Best Option

Your app and Ollama run on the same server:

**1. Create embeddings library:**

```bash
# Create file: src/lib/embeddings-ollama.ts
```

```typescript
const OLLAMA_BASE_URL = 'http://localhost:11434';

interface OllamaEmbeddingResponse {
  embedding: number[];
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data: OllamaEmbeddingResponse = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    throw error;
  }
}

export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return embeddings;
}
```

**2. Update imports:**

Replace in these files:
- `src/lib/document-processor.ts`
- `src/lib/rag-chatbot.ts`
- `src/app/api/training/train/route.ts`

```typescript
// Change from:
import { generateEmbedding } from '@/lib/embeddings';

// To:
import { generateEmbedding } from '@/lib/embeddings-ollama';
```

**3. No environment variables needed!** (using localhost)

---

### If App is on Different Server

Your app runs elsewhere, but Ollama is on VPS:

**1. Get your VPS IP:**

```bash
curl ifconfig.me
# Example output: 123.45.67.89
```

**2. Update .env in your app:**

```env
OLLAMA_URL=http://123.45.67.89:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

**3. Update embeddings library:**

```typescript
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
```

---

## Migration: Switch from Current Embeddings

### Step 1: Backup Current Data

```bash
# Backup your database
pg_dump your_database > backup_before_migration.sql
```

### Step 2: Run Migration Script

```bash
# In your project directory
npx tsx scripts/migrate-to-ollama.ts
```

Migration script (create `scripts/migrate-to-ollama.ts`):

```typescript
import { db } from '../src/lib/db';
import { generateEmbedding } from '../src/lib/embeddings-ollama';

async function migrateToOllama() {
  console.log('🔄 Migrating embeddings to Ollama...\n');
  
  const chunks = await db.documentChunk.findMany({
    select: { id: true, content: true },
    orderBy: { id: 'asc' },
  });

  console.log(`📊 Found ${chunks.length} chunks\n`);

  let processed = 0;
  const startTime = Date.now();

  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk.content);
      
      await db.documentChunk.update({
        where: { id: chunk.id },
        data: { embedding },
      });
      
      processed++;
      
      if (processed % 10 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (processed / (Date.now() - startTime) * 1000).toFixed(1);
        console.log(`✅ ${processed}/${chunks.length} | ${elapsed}s | ${rate}/s`);
      }
      
    } catch (error) {
      console.error(`❌ Chunk ${chunk.id} failed:`, error);
    }
  }

  console.log(`\n✨ Complete! Processed ${processed} chunks`);
}

migrateToOllama();
```

### Step 3: Test the Migration

```bash
# Test embedding generation
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "Test after migration"
}'

# Test your app's RAG
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test query", "limit": 5}'
```

---

## Monitoring & Maintenance

### Check Resource Usage

```bash
# Overall system status
htop

# Memory usage
free -h

# Disk usage
df -h

# Ollama logs
journalctl -u ollama -f

# Check running models
ollama list
```

### Performance Monitoring Script

Create `monitor-ollama.sh`:

```bash
#!/bin/bash

echo "📊 Ollama Performance Monitor"
echo "=============================="
echo ""

# Service status
echo "🔹 Service Status:"
systemctl status ollama --no-pager | grep "Active:"

# Memory usage
echo ""
echo "🔹 Memory Usage:"
TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
USED_MEM=$(free -h | awk '/^Mem:/ {print $3}')
echo "   Total: $TOTAL_MEM"
echo "   Used: $USED_MEM"

# Disk usage
echo ""
echo "🔹 Disk Usage:"
df -h / | awk 'NR==2 {print "   Used: " $3 " / " $2 " (" $5 ")"}'

# CPU load
echo ""
echo "🔹 CPU Load:"
uptime | awk '{print "   " $(NF-2), $(NF-1), $NF}'

# Active connections
echo ""
echo "🔹 Active Connections:"
ss -tunap | grep 11434 | wc -l | awk '{print "   " $1 " connections"}'

# Test response time
echo ""
echo "🔹 Response Time Test:"
START=$(date +%s%N)
curl -s http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "Performance test"
}' > /dev/null
END=$(date +%s%N)
TIME_MS=$(( (END - START) / 1000000 ))
echo "   Embedding generated in: ${TIME_MS}ms"

echo ""
echo "✅ Monitoring complete"
```

Run it:
```bash
chmod +x monitor-ollama.sh
./monitor-ollama.sh
```

---

## Troubleshooting

### Issue: "Connection refused"

```bash
# Check if Ollama is running
systemctl status ollama

# If not running, start it
sudo systemctl start ollama

# Check logs
journalctl -u ollama -n 50
```

### Issue: "Model not found"

```bash
# List installed models
ollama list

# If nomic-embed-text is missing, pull it
ollama pull nomic-embed-text
```

### Issue: "Out of memory"

```bash
# Check memory usage
free -h

# If memory is full, restart Ollama
sudo systemctl restart ollama

# Consider upgrading VPS if consistently hitting limits
```

### Issue: Slow embeddings (>3 seconds)

```bash
# Check CPU usage
top

# If CPU is maxed, you may have other processes
# Consider stopping non-essential services

# Or upgrade to more CPU cores
```

---

## Optimization Tips

### 1. Use Batch Processing

```typescript
// Instead of:
for (const text of texts) {
  await generateEmbedding(text);
}

// Do:
await generateEmbeddingBatch(texts);
```

### 2. Add Caching

Cache embeddings in your database so you don't regenerate:

```typescript
// Check cache first
const cached = await db.embeddingCache.findUnique({
  where: { textHash: hash(text) }
});

if (cached) return cached.embedding;

// Generate and cache
const embedding = await generateEmbedding(text);
await db.embeddingCache.create({
  data: { textHash: hash(text), embedding }
});
```

### 3. Rate Limiting

Prevent overwhelming your VPS:

```typescript
import { Ratelimit } from "@upstash/ratelimit";

const limiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(60, "1m"), // 60 per minute
});
```

---

## Cost Analysis

**Your Setup:**
```
VPS (existing): $X/month (already paying)
Ollama: $0 (free)
nomic-embed-text: $0 (free)

Additional cost: $0! 🎉
```

**Comparison to APIs:**
- OpenAI: $0.02 per 1M tokens (~$0.15-2/year for your usage)
- Your VPS: Already paid for
- **Savings: Actually spending more on VPS, but you get:**
  - ✅ Complete privacy
  - ✅ Unlimited embeddings
  - ✅ No external dependencies
  - ✅ Can also run free LLMs

---

## Adding LLM Chat (Bonus)

Since you have Ollama running, you can also add free LLMs:

```bash
# Pull a chat model
ollama pull llama3.2    # 7B model, good quality
# or
ollama pull mistral     # Fast and efficient
# or
ollama pull phi3        # Smaller, faster

# Test it
ollama run llama3.2
>>> Hello! Tell me about yourself.
```

Then use it in your app for RAG responses instead of OpenAI!

---

## Summary

**Your VPS (4GB RAM, 2 vCPU) is perfect for:**
- ✅ nomic-embed-text embeddings
- ✅ 5-10 concurrent users
- ✅ Processing 1k-10k documents
- ✅ Production workloads
- ✅ Bonus: Can also run free LLMs

**Setup time:** 15 minutes  
**Additional cost:** $0 (using existing VPS)  
**Performance:** 1-1.5s per embedding  

**Next steps:**
1. Run `setup-ollama-vps.sh` on your VPS
2. Update your app to use `embeddings-ollama.ts`
3. Run migration script to re-embed documents
4. Test and enjoy free embeddings!

Need help with any step? Let me know!
