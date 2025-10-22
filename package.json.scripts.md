# New NPM Scripts for Testing

Add these scripts to your `package.json` for easier testing:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:realtime": "node server.js",
    "dev:server1": "PORT=3001 node server.js",
    "dev:server2": "PORT=3002 node server.js",
    "build": "next build",
    "start": "next start",
    "start:realtime": "node server-production.js",
    "start:cluster": "pm2 start server-production.js -i 4 --name socketio-app",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "test:socketio": "node test-socketio-redis.js",
    "redis:start": "redis-server",
    "redis:cli": "redis-cli",
    "redis:monitor": "redis-cli MONITOR"
  }
}
```

## Usage Examples

```bash
# Start Redis
npm run redis:start

# Start two servers for testing
npm run dev:server1  # Terminal 1
npm run dev:server2  # Terminal 2

# Test Socket.IO Redis adapter
npm run test:socketio

# Monitor Redis pub/sub in real-time
npm run redis:monitor

# Production cluster mode (4 instances)
npm run start:cluster
```
