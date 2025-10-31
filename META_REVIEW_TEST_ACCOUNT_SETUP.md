# Instructions for Meta App Reviewers

## 🎯 Application Overview

**Application Name**: [Your App Name]
**Purpose**: Multi-channel customer service dashboard with AI chatbot and human agent support

---

## 🔐 Test Credentials

### Facebook/Instagram Test Account

**Facebook Account**:
- Email: `metareview.yourbusiness@gmail.com`
- Password: `[PASSWORD]`

**Test Facebook Page**:
- Page Name: [Your Business] - Test Page
- Page ID: [PAGE_ID]
- URL: https://facebook.com/[page-username]

**Instagram Business Account** (if applicable):
- Username: @yourbusiness_test
- Password: [Same as Facebook]

### Application Dashboard Access

**Demo Account**:
- URL: https://your-app.vercel.app/login
- Email: `metareview@yourbusiness.com`
- Password: `MetaReviewer2025!`

---

## 🧪 Testing Scenarios

### Scenario 1: Basic Message Flow (Within 24 Hours)

**Purpose**: Test standard messaging functionality

1. **Send Message as Customer**:
   - Go to: https://facebook.com/[your-test-page]
   - Click "Send Message" button
   - Send: "Hello, I need help"

2. **Verify AI Auto-Response**:
   - AI bot should respond automatically within seconds
   - Check dashboard: https://your-app.vercel.app/dashboard
   - Message should appear in conversation list

3. **Send Human Reply**:
   - Click on the conversation in dashboard
   - Type a reply in the composer
   - Send message
   - Verify it arrives in Messenger

**Expected Result**: ✅ Messages flow bidirectionally in real-time

---

### Scenario 2: Human Agent Tag (Outside 24-Hour Window)

**Purpose**: Test `human_agent` tag for messages outside 24-hour window

**Setup**:
We have pre-created a test conversation with last customer message >24 hours ago.

**Steps**:
1. Login to dashboard
2. Find conversation: "Test - 24h Window"
3. Try sending a reply
4. System should automatically use `HUMAN_AGENT` tag

**Expected Result**: ✅ Message delivered successfully with tag

**Alternative Manual Test**:
1. Send message as customer from Facebook account
2. Wait 25+ hours (or ask us to simulate via API)
3. Reply from dashboard
4. Check browser console: Should log "Using HUMAN_AGENT tag"

---

### Scenario 3: AI Bot Toggle

**Purpose**: Test enabling/disabling AI auto-responses

1. **Go to Integrations**:
   - Dashboard → Integrations → Facebook → Manage

2. **Toggle AI Auto-Response**:
   - Find "AI Auto-Response" toggle
   - Turn OFF
   - Save changes

3. **Test Manual Mode**:
   - Send message from Facebook: "Is the bot disabled?"
   - Bot should NOT respond
   - Only human agent can reply from dashboard

4. **Re-enable Bot**:
   - Turn toggle back ON
   - Send new message: "Is bot enabled now?"
   - Bot should respond automatically

**Expected Result**: ✅ AI responses toggle correctly

---

### Scenario 4: Human Agent Escalation

**Purpose**: Demonstrate when customer requests human agent

1. **Trigger Escalation**:
   - Send from Facebook: "I want to talk to a human"
   - Bot should recognize and disable auto-mode for this conversation

2. **Human Takes Over**:
   - Check dashboard - conversation should show "Manual Mode"
   - Agent can now reply manually
   - AI bot will not interfere

**Expected Result**: ✅ Smooth handoff from bot to human

---

### Scenario 5: Instagram Messaging (If Applicable)

**Purpose**: Test Instagram DM integration with human_agent tag

1. **Send Instagram DM**:
   - Open Instagram app
   - Go to @yourbusiness_test
   - Send message: "Hello from Instagram"

2. **Verify in Dashboard**:
   - Should appear in conversations list
   - Instagram icon should be visible

3. **Reply from Dashboard**:
   - Send reply
   - Should deliver to Instagram DM
   - If >24h, should use `HUMAN_AGENT` tag

**Expected Result**: ✅ Instagram messages work like Facebook

---

## 🎥 Video Demo

We have prepared a video demonstration showing:
1. Customer sends message on weekend
2. AI bot responds immediately
3. Customer asks for human agent
4. Bot escalates to manual mode
5. Human agent replies on Monday (>48h later) using `human_agent` tag
6. Message delivers successfully

**Video URL**: [Your video link]

---

## 🛠️ Technical Details

### Webhook Verification

**Webhook URL**: https://your-app.vercel.app/api/webhook/facebook
**Verify Token**: [Your verify token from .env]

To verify webhook is working:
```bash
curl "https://your-app.vercel.app/api/webhook/facebook?hub.mode=subscribe&hub.verify_token=[TOKEN]&hub.challenge=test"
```

Should return: `test`

### API Endpoints Used

- **Facebook**: Graph API v21.0
  - `/me/messages` - Send messages
  - `/me/subscribed_apps` - Webhook subscriptions

- **Instagram**: Graph API v21.0
  - `/{ig-user-id}/messages` - Send messages with tags
  - Message tags: `HUMAN_AGENT`

### Database Schema

Conversations and messages are stored in PostgreSQL with:
- Conversation metadata (autoBot status, last message time)
- Message metadata (role: USER/AGENT/BOT, timestamps)
- Tag usage logging for audit

---

## ❓ Troubleshooting

### Issue: "Cannot send message"

**Check**:
1. Is the test Facebook account added as Admin in App Roles?
2. Is the page connected in the dashboard?
3. Is the webhook subscribed? (Check: Dashboard → Integrations → Status)

### Issue: "AI bot not responding"

**Check**:
1. Is "AI Auto-Response" toggle ON?
2. Is LLM provider configured? (Dashboard → Settings → Provider)
3. Check browser console for errors

### Issue: "24-hour window error"

**This is expected!**
- This is what `human_agent` tag solves
- Check that tag is being used: Browser console should show "Using HUMAN_AGENT tag"
- If still fails: Permission might not be granted yet

---

## 📞 Contact

If you encounter any issues during testing:

**Developer Contact**:
- Email: developer@yourbusiness.com
- Phone: [Your phone]
- Available: Monday-Friday, 9 AM - 5 PM [Timezone]

**Immediate Support**:
- We monitor the test environment 24/7 during review period
- Response time: <2 hours

---

## ✅ Expected Outcomes

After testing, you should see:

1. ✅ Messages flow bidirectionally between Facebook/Instagram and dashboard
2. ✅ AI bot responds automatically when enabled
3. ✅ Human agents can reply manually when AI is disabled
4. ✅ `human_agent` tag allows messaging beyond 24 hours
5. ✅ Smooth escalation from bot to human
6. ✅ Real-time updates in dashboard
7. ✅ Conversation history preserved

---

**Thank you for reviewing our application!**

We are committed to providing a legitimate customer service tool that enhances communication between businesses and their customers while respecting Meta's policies and user privacy.
