# ⚡ Quick Setup: Database Connection Pooling

## 🎯 Choose Your Setup

### Option A: Simple (Recommended for Most Users)
**For:** Small to medium scale (< 100 concurrent users)  
**Setup Time:** 2 minutes  
**Requires:** Nothing extra

### Option B: Advanced (Production High Scale)
**For:** Large scale (100+ concurrent users)  
**Setup Time:** 15 minutes  
**Requires:** PgBouncer installation

---

## 🚀 Option A: Simple Prisma Pooling (2 Minutes)

### Step 1: Update .env

```bash
# Find your current DATABASE_URL
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Add connection pool parameters
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=15&pool_timeout=20&connect_timeout=10"
```

**That's it for the .env change!**

### Step 2: Restart Server

```bash
npm run dev
# or for production
pm2 restart your-app
```

### Step 3: Verify

Check server logs:
```
🔌 Database connection pool initialized
📊 Check DATABASE_URL for connection pool settings
```

### ✅ Done!

Your app now has connection pooling configured.

**Expected Behavior:**
- ✅ Max 15 connections per app instance
- ✅ Requests wait if all connections busy
- ✅ No "too many clients" errors
- ✅ Predictable performance

---

## 🏗️ Option B: PgBouncer Setup (15 Minutes)

### Step 1: Install PgBouncer

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install pgbouncer -y
```

**macOS:**
```bash
brew install pgbouncer
```

**Docker:**
```bash
docker run -d --name pgbouncer \
  -p 6432:6432 \
  -v $(pwd)/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini \
  edoburu/pgbouncer
```

### Step 2: Configure PgBouncer

**Create `/etc/pgbouncer/pgbouncer.ini`:**
```ini
[databases]
facebook_bot_db = host=localhost port=5432 dbname=facebook_bot_db

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
default_pool_size = 20
max_client_conn = 1000
```

**Create `/etc/pgbouncer/userlist.txt`:**
```bash
# Generate password hash
echo -n "passwordYOUR_USERNAME" | md5sum

# Add to userlist.txt
"YOUR_USERNAME" "md5HASH_HERE"
```

### Step 3: Start PgBouncer

```bash
sudo systemctl start pgbouncer
sudo systemctl enable pgbouncer
sudo systemctl status pgbouncer
```

### Step 4: Update .env

```bash
# App connects via PgBouncer
DATABASE_URL="postgresql://user:pass@localhost:6432/db?connection_limit=10"

# Migrations use direct connection
DIRECT_URL="postgresql://user:pass@localhost:5432/db"
```

### Step 5: Test Connection

```bash
# Test PgBouncer
psql -h localhost -p 6432 -U your_user -d facebook_bot_db

# Should connect successfully
```

### Step 6: Restart App

```bash
pm2 restart your-app
```

### ✅ Done!

Your app now uses PgBouncer for connection pooling.

**Expected Behavior:**
- ✅ Apps connect to PgBouncer (fast)
- ✅ PgBouncer manages database connections
- ✅ Can handle 1000+ concurrent users
- ✅ Reduced connection overhead by 90%

---

## 📊 Quick Test

### Test Connection Pool Limits

```bash
# Check current connections
psql -h localhost -U postgres -d facebook_bot_db

# Run query
SELECT count(*) FROM pg_stat_activity WHERE datname = 'facebook_bot_db';

# Should see limited number (around 15-20)
```

### Test Under Load

```javascript
// In your app, create 100 concurrent requests
for (let i = 0; i < 100; i++) {
  fetch('/api/dashboard/stats').then(() => console.log(`Request ${i} done`));
}

// Before: Some fail with "too many clients"
// After: All succeed (some wait, but all complete)
```

---

## 🔍 Monitoring

### Check Prisma Connections

```bash
# Check app logs
# Look for: "Database connection pool initialized"
```

### Check PgBouncer (if using)

```bash
# Connect to admin
psql -h localhost -p 6432 -U postgres pgbouncer

# Show pool status
SHOW POOLS;

# Show active connections
SHOW CLIENTS;
```

---

## 📈 Recommended Settings

| Scale | Users | Setting |
|-------|-------|---------|
| Small | 1-50 | `connection_limit=10` |
| Medium | 50-100 | `connection_limit=15` |
| Large | 100-500 | `connection_limit=15` + PgBouncer |
| Very Large | 500+ | PgBouncer + Multiple instances |

---

## 🐛 Quick Troubleshooting

**Error: "too many clients"**
```bash
# Add connection limit
DATABASE_URL="...?connection_limit=15"
```

**Error: "timeout acquiring connection"**
```bash
# Increase timeout
DATABASE_URL="...?pool_timeout=30"
```

**Migrations fail with PgBouncer**
```bash
# Use DIRECT_URL
DIRECT_URL="postgresql://user:pass@postgres:5432/db"
```

---

## 🎉 Success Indicators

✅ Server logs show "Database connection pool initialized"  
✅ No "too many clients" errors under load  
✅ Connection count stays within limits  
✅ All requests complete (may wait, but don't fail)  
✅ Predictable performance under heavy traffic  

---

**That's it! Your database connections are now properly pooled!** 🚀

For detailed documentation, see: `DATABASE_CONNECTION_POOLING_COMPLETE.md`
