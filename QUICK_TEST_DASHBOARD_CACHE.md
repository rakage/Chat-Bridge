# 🚀 Quick Test: Dashboard Stats Caching

## ⚡ How to Test (2 minutes)

### Step 1: Restart Server
```bash
npm run dev
```

### Step 2: Test Cache Miss (First Load)

1. Open dashboard
2. Open browser DevTools (F12) → Network tab
3. Look for `/api/dashboard/stats` request
4. Check response time: **2-8 seconds** (normal)
5. Check response body:
```json
{
  "cached": false,           ← Not cached yet
  "generatedAt": "2025-..."  ← Fresh from DB
}
```

6. Check server terminal logs:
```
📊 Dashboard stats cache MISS for company: xxx
💾 Dashboard stats cached for company: xxx (TTL: 300s)
```

### Step 3: Test Cache Hit (Immediate Refresh)

1. **Immediately** refresh dashboard (F5)
2. Check `/api/dashboard/stats` request
3. Check response time: **10-50ms** ⚡ (95% faster!)
4. Check response body:
```json
{
  "cached": true,           ← From cache!
  "cachedAt": "2025-..."    ← Cached timestamp
}
```

5. Check server logs:
```
📊 Dashboard stats cache HIT for company: xxx
```

### Step 4: Test Cache Invalidation

1. Open a conversation
2. Send a message as agent
3. Check server logs:
```
🗑️  Invalidated dashboard stats cache for company: xxx
```

4. Refresh dashboard
5. Should see `cached: false` (fresh data)

---

## ✅ Success Indicators

✅ First load: 2-8 seconds (cache miss)  
✅ Second load: 10-50ms (cache hit) ⚡  
✅ **95-99% faster on cache hit**  
✅ Logs show HIT/MISS correctly  
✅ Cache invalidates on new message  

---

## 📊 Quick Performance Test

**In browser console:**
```javascript
// Test cache miss
console.time('first-load');
await fetch('/api/dashboard/stats');
console.timeEnd('first-load');
// Expected: 2000-8000ms

// Test cache hit
console.time('second-load');
await fetch('/api/dashboard/stats');
console.timeEnd('second-load');
// Expected: 10-50ms ⚡

// That's 95-99% faster!
```

---

## 🐛 Quick Debug

**Redis not working?**
```bash
# Check Redis
redis-cli ping
# Should return: PONG

# If not installed:
# Windows: https://redis.io/download
# Mac: brew install redis
# Linux: sudo apt-get install redis
```

**Still slow?**
```bash
# Check cache keys exist
redis-cli KEYS "dashboard:stats:*"

# Clear cache manually
redis-cli FLUSHDB
```

---

**That's it! Dashboard should now load 95% faster!** 🎉
