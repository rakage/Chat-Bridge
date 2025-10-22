/**
 * Verify Redis Setup for Socket.IO Adapter
 * 
 * Quick script to verify all dependencies are installed correctly
 */

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifySetup() {
  log("\n🔍 Verifying Redis Adapter Setup\n", "cyan");
  log("═".repeat(60), "cyan");

  let allPassed = true;

  // Check 1: redis package
  try {
    require("redis");
    log("✅ redis package installed", "green");
  } catch (error) {
    log("❌ redis package NOT installed", "red");
    log("   Run: npm install redis", "yellow");
    allPassed = false;
  }

  // Check 2: @socket.io/redis-adapter package
  try {
    require("@socket.io/redis-adapter");
    log("✅ @socket.io/redis-adapter package installed", "green");
  } catch (error) {
    log("❌ @socket.io/redis-adapter package NOT installed", "red");
    log("   Run: npm install @socket.io/redis-adapter", "yellow");
    allPassed = false;
  }

  // Check 3: socket.io package
  try {
    require("socket.io");
    log("✅ socket.io package installed", "green");
  } catch (error) {
    log("❌ socket.io package NOT installed", "red");
    log("   Run: npm install socket.io", "yellow");
    allPassed = false;
  }

  // Check 4: ioredis package (for BullMQ)
  try {
    require("ioredis");
    log("✅ ioredis package installed", "green");
  } catch (error) {
    log("❌ ioredis package NOT installed", "red");
    log("   Run: npm install ioredis", "yellow");
    allPassed = false;
  }

  // Check 5: Environment variable
  log("\n" + "─".repeat(60), "cyan");
  log("Environment Variables:", "cyan");
  if (process.env.REDIS_URL) {
    log(`✅ REDIS_URL is set: ${process.env.REDIS_URL}`, "green");
  } else {
    log("⚠️  REDIS_URL not set (will use default: redis://localhost:6379)", "yellow");
  }

  // Check 6: Test Redis connection
  log("\n" + "─".repeat(60), "cyan");
  log("Testing Redis Connection...", "cyan");

  try {
    const { createClient } = require("redis");
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const client = createClient({ url: redisUrl });

    client.on("error", (err) => {
      log(`❌ Redis connection error: ${err.message}`, "red");
    });

    await client.connect();
    const pong = await client.ping();

    if (pong === "PONG") {
      log("✅ Redis connection successful!", "green");
      log(`   Connected to: ${redisUrl}`, "cyan");
    }

    await client.quit();
  } catch (error) {
    log(`❌ Redis connection failed: ${error.message}`, "red");
    log("\n   Possible solutions:", "yellow");
    log("   1. Start Redis: redis-server", "yellow");
    log("   2. Check REDIS_URL in .env file", "yellow");
    log("   3. Ensure Redis is running on the correct port", "yellow");
    allPassed = false;
  }

  // Summary
  log("\n" + "═".repeat(60), "cyan");
  if (allPassed) {
    log("\n🎉 All checks passed! Redis adapter is ready to use.", "green");
    log("\nYou can now run:", "cyan");
    log("   npm run dev:realtime", "green");
    log("\nFor multi-server testing:", "cyan");
    log("   Terminal 1: PORT=3001 node server.js", "yellow");
    log("   Terminal 2: PORT=3002 node server.js", "yellow");
    log("   Terminal 3: node test-socketio-redis.js", "yellow");
  } else {
    log("\n⚠️  Some checks failed. Please fix the issues above.", "yellow");
  }

  log("");
}

// Run verification
verifySetup()
  .then(() => process.exit(0))
  .catch((error) => {
    log(`\n❌ Verification error: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  });
