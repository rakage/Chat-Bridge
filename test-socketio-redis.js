/**
 * Socket.IO Redis Adapter Test Script
 * 
 * Tests that multiple Socket.IO server instances can communicate
 * through Redis adapter for horizontal scaling.
 * 
 * Usage:
 *   1. Start Redis: redis-server
 *   2. Start Server 1: PORT=3001 node server.js
 *   3. Start Server 2: PORT=3002 node server.js
 *   4. Run this test: node test-socketio-redis.js
 */

const io = require("socket.io-client");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testSocketIORedisAdapter() {
  log("\n🧪 Socket.IO Redis Adapter Test\n", "cyan");
  log("═".repeat(60), "blue");

  const server1Port = process.env.SERVER1_PORT || "3001";
  const server2Port = process.env.SERVER2_PORT || "3002";

  const server1Url = `http://localhost:${server1Port}`;
  const server2Url = `http://localhost:${server2Port}`;

  log(`\n📡 Connecting to Server 1: ${server1Url}`, "yellow");
  log(`📡 Connecting to Server 2: ${server2Url}`, "yellow");

  // Connect to both servers
  const socket1 = io(server1Url, {
    transports: ["websocket"],
    reconnection: true,
  });

  const socket2 = io(server2Url, {
    transports: ["websocket"],
    reconnection: true,
  });

  const testCompanyId = `test-company-${Date.now()}`;
  const testConversationId = `test-conversation-${Date.now()}`;

  let socket1Connected = false;
  let socket2Connected = false;
  let socket1ReceivedMessage = false;
  let socket2ReceivedMessage = false;
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Connection
  await new Promise((resolve) => {
    socket1.on("connect", () => {
      socket1Connected = true;
      log(`✅ Socket 1 connected (ID: ${socket1.id})`, "green");
      if (socket2Connected) resolve();
    });

    socket2.on("connect", () => {
      socket2Connected = true;
      log(`✅ Socket 2 connected (ID: ${socket2.id})`, "green");
      if (socket1Connected) resolve();
    });

    socket1.on("connect_error", (error) => {
      log(`❌ Socket 1 connection error: ${error.message}`, "red");
      testsFailed++;
    });

    socket2.on("connect_error", (error) => {
      log(`❌ Socket 2 connection error: ${error.message}`, "red");
      testsFailed++;
    });

    setTimeout(() => {
      if (!socket1Connected || !socket2Connected) {
        log("\n❌ Test 1 Failed: Connection timeout", "red");
        testsFailed++;
        resolve();
      }
    }, 5000);
  });

  if (socket1Connected && socket2Connected) {
    log("\n✅ Test 1 Passed: Both sockets connected", "green");
    testsPassed++;
  }

  log("\n" + "─".repeat(60), "blue");

  // Test 2: Join Company Room
  log("\n🧪 Test 2: Joining company rooms...", "cyan");

  await new Promise((resolve) => {
    let socket1Joined = false;
    let socket2Joined = false;

    socket1.on("joined:company", (data) => {
      if (data.companyId === testCompanyId) {
        socket1Joined = true;
        log(
          `✅ Socket 1 joined company room: ${data.companyId}`,
          "green"
        );
        if (socket2Joined) resolve();
      }
    });

    socket2.on("joined:company", (data) => {
      if (data.companyId === testCompanyId) {
        socket2Joined = true;
        log(
          `✅ Socket 2 joined company room: ${data.companyId}`,
          "green"
        );
        if (socket1Joined) resolve();
      }
    });

    socket1.emit("join:company", testCompanyId);
    socket2.emit("join:company", testCompanyId);

    setTimeout(() => {
      if (!socket1Joined || !socket2Joined) {
        log("❌ Test 2 Failed: Room join timeout", "red");
        testsFailed++;
      } else {
        log("\n✅ Test 2 Passed: Both sockets joined company room", "green");
        testsPassed++;
      }
      resolve();
    }, 2000);
  });

  log("\n" + "─".repeat(60), "blue");

  // Test 3: Cross-Server Message Broadcasting
  log("\n🧪 Test 3: Testing cross-server message broadcasting...", "cyan");

  await new Promise((resolve) => {
    // Socket 1 listens for message from Socket 2
    socket1.on("test:message", (data) => {
      socket1ReceivedMessage = true;
      log(
        `✅ Socket 1 (Server ${server1Port}) received message from Socket 2 (Server ${server2Port})`,
        "green"
      );
      log(`   Message: "${data.text}"`, "cyan");
    });

    // Socket 2 listens for message from Socket 1
    socket2.on("test:message", (data) => {
      socket2ReceivedMessage = true;
      log(
        `✅ Socket 2 (Server ${server2Port}) received message from Socket 1 (Server ${server1Port})`,
        "green"
      );
      log(`   Message: "${data.text}"`, "cyan");
    });

    // Setup custom event handler for cross-server test
    socket1.on("conversation:view-update", (data) => {
      if (data.testId === "cross-server-test") {
        socket1ReceivedMessage = true;
        log(
          `✅ Socket 1 received conversation update from Socket 2`,
          "green"
        );
      }
    });

    socket2.on("conversation:view-update", (data) => {
      if (data.testId === "cross-server-test") {
        socket2ReceivedMessage = true;
        log(
          `✅ Socket 2 received conversation update from Socket 1`,
          "green"
        );
      }
    });

    // Send test messages after joining conversation room
    setTimeout(() => {
      log("\n📤 Socket 2 emitting test message...", "yellow");
      socket2.emit("conversation:view-update", {
        conversationId: testConversationId,
        companyId: testCompanyId,
        type: "test",
        testId: "cross-server-test",
        message: "Hello from Server 2!",
      });
    }, 500);

    setTimeout(() => {
      log("📤 Socket 1 emitting test message...", "yellow");
      socket1.emit("conversation:view-update", {
        conversationId: testConversationId,
        companyId: testCompanyId,
        type: "test",
        testId: "cross-server-test",
        message: "Hello from Server 1!",
      });
    }, 1000);

    setTimeout(() => {
      if (socket1ReceivedMessage && socket2ReceivedMessage) {
        log(
          "\n✅ Test 3 Passed: Cross-server broadcasting works!",
          "green"
        );
        testsPassed++;
      } else {
        log("\n❌ Test 3 Failed: Cross-server broadcasting not working", "red");
        log(
          `   Socket 1 received: ${socket1ReceivedMessage}`,
          "yellow"
        );
        log(
          `   Socket 2 received: ${socket2ReceivedMessage}`,
          "yellow"
        );
        testsFailed++;
      }
      resolve();
    }, 3000);
  });

  log("\n" + "─".repeat(60), "blue");

  // Test 4: Conversation Room
  log("\n🧪 Test 4: Testing conversation rooms...", "cyan");

  await new Promise((resolve) => {
    let socket1JoinedConv = false;
    let socket2JoinedConv = false;

    socket1.on("joined:conversation", (data) => {
      if (data.conversationId === testConversationId) {
        socket1JoinedConv = true;
        log(
          `✅ Socket 1 joined conversation: ${data.conversationId}`,
          "green"
        );
      }
    });

    socket2.on("joined:conversation", (data) => {
      if (data.conversationId === testConversationId) {
        socket2JoinedConv = true;
        log(
          `✅ Socket 2 joined conversation: ${data.conversationId}`,
          "green"
        );
      }
    });

    socket1.emit("join:conversation", testConversationId);
    socket2.emit("join:conversation", testConversationId);

    setTimeout(() => {
      if (socket1JoinedConv && socket2JoinedConv) {
        log(
          "\n✅ Test 4 Passed: Conversation rooms working",
          "green"
        );
        testsPassed++;
      } else {
        log("\n❌ Test 4 Failed: Conversation rooms not working", "red");
        testsFailed++;
      }
      resolve();
    }, 2000);
  });

  log("\n" + "═".repeat(60), "blue");

  // Summary
  log("\n📊 Test Summary", "cyan");
  log("─".repeat(60), "blue");
  log(`✅ Tests Passed: ${testsPassed}`, "green");
  log(`❌ Tests Failed: ${testsFailed}`, testsFailed > 0 ? "red" : "green");
  log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`, "cyan");

  if (testsPassed === 4 && testsFailed === 0) {
    log(
      "\n🎉 ALL TESTS PASSED! Socket.IO Redis adapter is working correctly!",
      "green"
    );
    log("✅ Your app is ready for horizontal scaling!", "green");
  } else {
    log(
      "\n⚠️  Some tests failed. Check your Redis connection and server setup.",
      "yellow"
    );
    log("\nTroubleshooting:", "cyan");
    log("1. Ensure Redis is running: redis-cli ping", "yellow");
    log("2. Check REDIS_URL in .env matches Redis server", "yellow");
    log("3. Verify both servers are using Redis adapter", "yellow");
    log("4. Check server logs for Redis connection errors", "yellow");
  }

  // Cleanup
  log("\n🧹 Cleaning up...", "yellow");
  socket1.disconnect();
  socket2.disconnect();

  log("✅ Test completed!\n", "green");
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
testSocketIORedisAdapter().catch((error) => {
  log(`\n❌ Test error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});
