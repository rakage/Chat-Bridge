# Template untuk Meta App Review Submission

## 📝 Copy-Paste Template untuk Submission Form

---

## 1️⃣ **Justifikasi Penggunaan Permission**

### For: `pages_messaging` and `instagram_manage_messages`

```
APPLICATION PURPOSE:

Our application is a customer service platform that enables businesses to manage customer conversations from Facebook Messenger, Instagram DMs, and other channels in a unified dashboard.

---

HOW WE USE THIS PERMISSION:

1. HYBRID AI + HUMAN SUPPORT SYSTEM
   - Our platform features an AI chatbot that provides instant automated responses
   - Human agents can take over conversations at any time
   - We use the HUMAN_AGENT message tag to enable agents to respond beyond the 24-hour messaging window

2. RESPONSE OUTSIDE 24-HOUR WINDOW
   - When customers send messages outside business hours (evenings, weekends)
   - When complex issues require >24 hours to investigate
   - When customers explicitly request to speak with a human agent
   - Our system automatically uses the HUMAN_AGENT tag when replying after 24 hours

3. SMART ESCALATION
   - System detects when conversations need human intervention
   - Automatically switches from bot to manual mode
   - Ensures customers who ask for human support get actual human responses

4. QUALITY ASSURANCE & COMPLIANCE
   - All HUMAN_AGENT tag usage is logged for audit
   - Tag is ONLY used for customer support conversations
   - NO promotional or marketing content
   - Strict compliance with Meta messaging policies

---

VALUE FOR USERS:

For Businesses (Our Customers):
✅ 24/7 AI coverage with guaranteed human follow-up capability
✅ Can operate on business hours while still serving weekend inquiries
✅ Complex issues can be resolved with proper investigation time
✅ No customer inquiry goes unanswered due to time limitations

For End-Users (Their Customers):
✅ Guaranteed human support when requested
✅ No need to re-initiate conversation to "reset" 24-hour window
✅ Better problem resolution for complex issues
✅ Transparent communication between bot and human agents

---

WHY THIS IS ESSENTIAL:

Our customer service platform cannot function properly without the ability to respond beyond 24 hours. Here are critical use cases:

SCENARIO 1: Weekend Support
- Customer messages: Saturday 8 PM
- Business closed until Monday 9 AM (37 hours later)
- Without HUMAN_AGENT tag: Cannot respond → Bad customer experience
- With HUMAN_AGENT tag: Can respond → Excellent customer service

SCENARIO 2: Complex Investigation
- Customer reports issue: Monday 2 PM
- Technical team needs 48 hours to investigate
- Without tag: Cannot send resolution update → Customer frustrated
- With tag: Can provide detailed follow-up → Customer satisfied

SCENARIO 3: Human Escalation
- Bot cannot resolve issue
- Customer explicitly asks for human help
- If >24h passed: Agent cannot take over without tag
- With tag: Seamless handoff to human support

---

COMPLIANCE COMMITMENT:

✅ Tag used ONLY for customer support
✅ NO promotional content
✅ NO marketing messages  
✅ NO unsolicited advertisements
✅ All usage logged and auditable
✅ Respects user privacy and Meta policies

Our platform serves as a legitimate customer service tool helping businesses provide better support to their customers.
```

---

## 2️⃣ **Test Credentials**

```
TEST FACEBOOK ACCOUNT:
Email: [YOUR_TEST_EMAIL]
Password: [YOUR_TEST_PASSWORD]

Note: This is a real Facebook account (not a test user) with:
- Complete profile with photo
- Added as Administrator in App Roles
- Connected test Facebook Page for messaging demonstrations

TEST FACEBOOK PAGE:
Page Name: [YOUR_TEST_PAGE_NAME]
Page ID: [YOUR_PAGE_ID]
Page URL: https://facebook.com/[YOUR_PAGE_USERNAME]

APPLICATION DASHBOARD:
URL: [YOUR_APP_URL]
Demo Account Email: [DEMO_EMAIL]
Demo Account Password: [DEMO_PASSWORD]

DETAILED INSTRUCTIONS:
We have prepared comprehensive testing instructions: [LINK_TO_PDF_OR_GOOGLE_DOC]

The document includes:
- Step-by-step testing scenarios
- Expected results for each test
- Screenshots and explanations
- Troubleshooting guide
```

---

## 3️⃣ **Video Demonstration**

```
VIDEO DEMONSTRATION:
URL: [YOUR_YOUTUBE_OR_LOOM_VIDEO_URL]

Duration: 5-7 minutes

The video demonstrates:

1. Standard Messaging (0:00-1:30)
   - Customer sends message via Facebook Messenger
   - AI bot provides instant automated response
   - Message appears in dashboard in real-time
   - Human agent sends manual reply

2. Human Agent Escalation (1:30-3:00)
   - Customer requests to speak with human
   - Bot recognizes request and switches to manual mode
   - Human agent takes over conversation seamlessly

3. HUMAN_AGENT Tag Usage (3:00-5:00)
   - Demonstration of conversation >24 hours old
   - Agent sends reply from dashboard
   - System automatically uses HUMAN_AGENT tag
   - Message delivers successfully
   - Browser console shows tag being applied

4. AI Toggle Feature (5:00-6:30)
   - Toggle AI auto-responses on/off
   - Demonstration of manual-only mode
   - Re-enabling AI bot

5. Dashboard Overview (6:30-7:00)
   - Conversation management interface
   - Real-time updates
   - Settings and configuration

The video clearly shows how HUMAN_AGENT tag enables quality customer support beyond the 24-hour messaging window for legitimate customer service purposes.
```

---

## 4️⃣ **Additional Information**

```
PRIVACY POLICY:
URL: [YOUR_PRIVACY_POLICY_URL]

TERMS OF SERVICE:
URL: [YOUR_TERMS_URL]

---

DATA USAGE & PRIVACY:

Data We Collect:
- Message content (to display in dashboard and generate AI responses)
- Sender IDs (Facebook PSID / Instagram IGID)
- Timestamps and conversation metadata
- User preferences (AI on/off settings)

Data Security:
✅ All data encrypted at rest in PostgreSQL database
✅ API keys and tokens stored with encryption
✅ HTTPS/TLS for all communications
✅ Regular security audits

Data Retention:
- Messages retained for customer service history
- Users can delete conversations anytime
- Automated cleanup of old conversations (90 days after closure)

Third-Party Sharing:
❌ We do NOT sell user data
❌ We do NOT share data with advertisers
❌ We do NOT use data for marketing purposes
✅ Data only used for customer service operations

User Rights:
✅ Users can request data export
✅ Users can request data deletion
✅ Users can disable AI bot anytime
✅ Transparent about data usage

---

MESSAGE TAG COMPLIANCE:

HUMAN_AGENT Tag Usage:
✅ Used exclusively for customer support responses
✅ Applied automatically when >24h window detected
✅ All usage logged with timestamps and reasons
✅ Regular compliance audits

Tag Usage Monitoring:
- Automated logging system
- Dashboard for compliance review
- Alerts for unusual patterns
- Monthly usage reports

Policy Enforcement:
- No promotional content allowed in bot responses
- System prompts configured to prevent marketing language
- Agent training on policy compliance
- Regular review of message content

---

TECHNICAL DETAILS:

Platform Architecture:
- Frontend: Next.js 14 with TypeScript
- Backend: Next.js API Routes
- Database: PostgreSQL with Prisma ORM
- Real-time: Socket.IO
- Hosting: [Your hosting provider]

Facebook/Instagram Integration:
- Graph API v21.0
- Webhooks for real-time message delivery
- Proper error handling and retries
- Rate limiting implementation

Security Measures:
- NextAuth authentication
- Role-based access control (OWNER/ADMIN/AGENT)
- CSRF protection
- Input validation with Zod
- SQL injection prevention
- XSS protection

---

SUPPORT & AVAILABILITY:

Developer Contact:
Email: [YOUR_EMAIL]
Phone: [YOUR_PHONE]
Availability: Monday-Friday, 9 AM - 5 PM [TIMEZONE]

During Review Period:
✅ 24/7 monitoring of test environment
✅ Response time: <2 hours
✅ Immediate bug fixes if issues found

Documentation:
- Complete API documentation available
- User guides and tutorials
- Video tutorials for end-users
- Developer documentation

---

BUSINESS INFORMATION:

Company Name: [YOUR_COMPANY_NAME]
Website: [YOUR_WEBSITE]
Business Type: [SaaS / Customer Service Software]
Target Users: Small to medium businesses needing customer support tools

Use Cases:
- E-commerce customer support
- Service booking inquiries
- Product information requests
- Order tracking and updates
- Technical support
- General customer inquiries

Geographic Focus: [Your target markets]
Languages Supported: [Your supported languages]
```

---

## 5️⃣ **Justifikasi Khusus untuk HUMAN_AGENT Tag**

### For Instagram: `instagram_manage_messages` with message tag permission

```
WHY WE NEED HUMAN_AGENT MESSAGE TAG:

Our application is designed to provide high-quality customer support through a hybrid approach of AI automation and human agents. The HUMAN_AGENT message tag is critical to our core functionality.

---

SPECIFIC USE CASES:

1. AFTER-HOURS SUPPORT
Problem: Customer messages received outside business hours
Solution: AI provides initial response; human follows up next business day
Requirement: HUMAN_AGENT tag to deliver follow-up >24h later
Example: Weekend inquiry resolved on Monday morning

2. COMPLEX ISSUE RESOLUTION  
Problem: Issues requiring investigation, coordination with other teams
Solution: Agent acknowledges immediately; provides resolution after investigation
Requirement: HUMAN_AGENT tag if resolution takes >24 hours
Example: Technical troubleshooting, inventory checks, custom requests

3. ESCALATION REQUESTS
Problem: Customer explicitly asks for human agent
Solution: Bot transfers conversation to human agent queue
Requirement: HUMAN_AGENT tag if agent becomes available >24h later
Example: First-level bot support → escalated to senior agent

4. FOLLOW-UP & SATISFACTION
Problem: Need to follow up on resolved issues to ensure customer satisfaction
Solution: Agent checks back after 48-72 hours
Requirement: HUMAN_AGENT tag for follow-up messages
Example: "Did our solution work for you?"

---

WHY THIS ADDS VALUE:

For Businesses:
✅ Can provide quality support without requiring 24/7 staffing
✅ Complex issues get proper investigation time
✅ Customers receive follow-ups instead of being abandoned
✅ Better customer satisfaction and retention

For End-Users:
✅ Get real human support when needed
✅ No frustration from 24-hour window limitations
✅ Issues actually get resolved, not just acknowledged
✅ Professional, high-quality service experience

---

COMPLIANCE & PROPER USAGE:

What We DO:
✅ Use tag for customer support responses
✅ Respond to customer-initiated conversations
✅ Follow up on specific customer issues
✅ Log all tag usage for transparency

What We DON'T Do:
❌ Send promotional content
❌ Send marketing messages
❌ Initiate unsolicited conversations
❌ Use for newsletters or announcements
❌ Broadcast messages to users

---

MONITORING & ENFORCEMENT:

Technical Safeguards:
- Automatic tag detection based on message timing
- Logging of all tag usage with conversation context
- System alerts for unusual patterns
- Regular compliance audits

Business Processes:
- Agent training on proper tag usage
- Clear policies against promotional content
- Regular review of message content
- Dedicated compliance officer

Reporting:
- Monthly usage reports
- Compliance dashboard
- Audit logs available for Meta review
- Transparent about tag usage statistics

---

We are committed to using the HUMAN_AGENT tag exclusively for its intended purpose: enabling human customer service agents to provide quality support beyond the 24-hour messaging window, in full compliance with Meta's policies.
```

---

## 📋 Checklist Sebelum Submit

- [ ] Semua `[PLACEHOLDER]` sudah diisi dengan informasi sebenarnya
- [ ] Test credentials sudah diverifikasi working
- [ ] Video sudah diupload dan link accessible
- [ ] PDF instructions sudah prepared
- [ ] Privacy policy URL valid dan accessible
- [ ] Terms of service URL valid dan accessible
- [ ] Test account adalah akun ASLI (bukan test user)
- [ ] Test account sudah di-add sebagai Admin di App Roles
- [ ] Aplikasi sudah deployed dan accessible secara public
- [ ] Webhook sudah diverifikasi working
- [ ] Semua test scenarios sudah dicoba dan working

---

## 🎯 Tips untuk Approval

1. **Be Detailed but Clear**
   - Jelaskan use case spesifik dengan contoh nyata
   - Tapi jangan terlalu panjang sampai reviewer overwhelmed

2. **Show, Don't Just Tell**
   - Video demo sangat penting
   - Screenshots membantu
   - Step-by-step instructions lebih baik dari deskripsi umum

3. **Emphasize Compliance**
   - Tunjukkan Anda paham policies
   - Jelaskan safeguards yang sudah diimplementasi
   - Commitment terhadap proper usage

4. **Professional Presentation**
   - Proper grammar and spelling
   - Organized documentation
   - Working test credentials
   - Quality video (HD, clear audio)

5. **Responsive During Review**
   - Check status daily
   - Respond quickly to any questions
   - Be cooperative and professional

---

**Good luck! 🚀**
