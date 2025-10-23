# Meta App Verification Checklist

**App Name:** ChatBridge  
**App Type:** Customer Messaging CRM Platform  
**Date Prepared:** 2025-01-20

---

## ✅ Permissions Requested (Final Clean List)

### Facebook Messenger (4 permissions):
1. ✅ **pages_show_list** - List Facebook Pages user manages
2. ✅ **pages_manage_metadata** - Subscribe/unsubscribe webhooks
3. ✅ **pages_messaging** - Send/receive messages (CORE)
4. ✅ **public_profile** - Basic user profile

### Instagram Direct Messages (3 permissions):
1. ✅ **instagram_business_basic** - Basic Instagram Business Account info (DEPENDENT)
2. ✅ **instagram_business_manage_messages** - Send/receive Instagram DMs (CORE)
3. ✅ **pages_show_list** - List Pages with Instagram accounts

**Total:** 7 permissions (optimized from 16+)

---

## 📝 Permission Justifications

### pages_show_list
**Use:** Display list of Facebook Pages user manages for connection selection  
**Required:** Yes - Core onboarding flow

### pages_manage_metadata
**Use:** Subscribe to webhooks to receive customer messages  
**Required:** CRITICAL - Without this, cannot receive messages

### pages_messaging
**Use:** Send replies to customers, receive customer messages  
**Required:** CRITICAL - Core functionality of the app

### instagram_business_basic
**Use:** Get Instagram Business Account ID, username, profile picture  
**Required:** Yes - Dependent permission for instagram_business_manage_messages  
**Clarification:** Required by Meta as prerequisite for messaging permission

### instagram_business_manage_messages
**Use:** Send/receive Instagram Direct Messages for customer support  
**Required:** CRITICAL - Core Instagram functionality

---

## 🗑️ Permissions Removed (Not Used)

❌ business_management - Not managing ads/business assets  
❌ pages_read_engagement - Not reading likes/shares  
❌ pages_manage_posts - Not creating posts  
❌ pages_manage_engagement - Not managing post comments  
❌ pages_read_user_content - Not reading user-generated content  
❌ pages_utility_messaging - Not sending message tags (may add later)  
❌ instagram_manage_comments - Not managing post comments  
❌ instagram_content_publish - Not publishing posts/stories  

---

## 📊 Data Handling

### Data Processors (All GDPR-Compliant):

1. **Supabase (PostgreSQL)**
   - Purpose: Database storage
   - Data: Conversations, user accounts, encrypted tokens
   - Location: Singapore/US (configurable)
   - DPA: ✅ Available

2. **OpenAI / Google Gemini**
   - Purpose: AI-powered auto-responses
   - Data: Message text ONLY (no IDs/tokens)
   - Training: ❌ NOT used for training
   - DPA: ✅ API tier zero retention

3. **Cloudflare R2**
   - Purpose: File storage (attachments)
   - Data: Images, files from conversations
   - Security: ✅ Encrypted
   - DPA: ✅ Available

4. **Upstash Redis**
   - Purpose: Message queues, caching
   - Data: Temporary only
   - Retention: Auto-deleted after processing
   - DPA: ✅ GDPR-compliant

### Data We DON'T Share:
- ❌ NO selling data to third parties
- ❌ NO sharing for advertising
- ❌ NO using customer messages for AI training
- ❌ NO sharing with marketing platforms

---

## 🔒 Security Measures

### Technical:
- ✅ Access tokens encrypted (AES-256)
- ✅ HTTPS/TLS for all communications
- ✅ Database encryption at rest
- ✅ Role-based access control
- ✅ Multi-tenant isolation

### Organizational:
- ✅ Legal review process for data requests
- ✅ Data minimization policy
- ✅ Request documentation
- ✅ Security incident response plan

---

## 🌍 Legal Compliance

### National Security Requests:
**Status:** ✅ NO requests received (answer: "No")

### Data Request Policies:
- ✅ Legal review required before disclosure
- ✅ Data minimization (minimum disclosure)
- ✅ Documentation of all requests
- ⚠️ Legal challenge provisions (if resources permit)

### GDPR Compliance:
- ✅ User rights: Access, Delete, Export, Rectify
- ✅ Data Processing Agreements with all processors
- ✅ Privacy Policy published
- ✅ Contact: privacy@chatbridge.raka.my.id
- ✅ DPO: dpo@chatbridge.raka.my.id

---

## 🔗 Important URLs

### Production:
- **App URL:** https://chatbridge.raka.my.id
- **Privacy Policy:** https://chatbridge.raka.my.id/privacy
- **Terms of Service:** https://chatbridge.raka.my.id/tos
- **Support:** support@chatbridge.raka.my.id

### Test Credentials (For Meta Reviewer):
**Will provide:**
- Test account email & password
- Connected Facebook Page for testing
- Connected Instagram Business Account
- Step-by-step testing instructions

---

## 🎥 Screencast Requirements

### Video 1: Facebook Messenger Integration (3 mins)
1. Connect Facebook Page
2. Receive message from customer
3. View in dashboard
4. Send reply
5. AI auto-response demo

### Video 2: Instagram Integration (3 mins)
1. Connect Instagram Business Account
2. Show profile info (username, picture)
3. Receive Instagram DM
4. View in dashboard
5. Send reply

### Videos will show:
- ✅ OAuth flow
- ✅ Profile information display
- ✅ Message receiving
- ✅ Message sending
- ✅ Dashboard features
- ✅ CRM capabilities

---

## 📋 Review Submission Checklist

### App Information:
- [x] App name: ChatBridge
- [x] Category: Business Tools / CRM
- [x] Description: Clear explanation of customer messaging use case
- [x] Privacy Policy URL: https://chatbridge.raka.my.id/privacy
- [x] Terms of Service URL: https://chatbridge.raka.my.id/tos

### Permissions:
- [x] Each permission has detailed justification
- [x] Use cases clearly explained
- [x] Code implementation documented
- [x] Screenshots/videos prepared

### Data Handling:
- [x] All data processors listed
- [x] Purpose for each processor explained
- [x] Security measures documented
- [x] No data selling confirmed
- [x] GDPR compliance confirmed

### Testing:
- [x] Test account credentials prepared
- [x] Testing instructions written
- [x] Connected test pages/accounts ready
- [x] Screencast videos recorded

### Legal:
- [x] Privacy policy comprehensive
- [x] Data request policies defined
- [x] National security disclosure answered
- [x] Contact information provided

---

## 📞 Support Contacts

**For Meta Reviewer:**
- **Technical Questions:** support@chatbridge.raka.my.id
- **Privacy Questions:** privacy@chatbridge.raka.my.id
- **Data Protection:** dpo@chatbridge.raka.my.id

**Response Time:** Within 48 hours

---

## ✅ Pre-Submission Verification

Before submitting to Meta, verify:

1. **Permissions**
   - [ ] Only request what you actually use
   - [ ] Clear justification for each
   - [ ] Dependent permissions noted

2. **Privacy Policy**
   - [ ] Comprehensive and accurate
   - [ ] Lists all data processors
   - [ ] Explains data usage clearly
   - [ ] Provides contact information

3. **Test Environment**
   - [ ] Test account works
   - [ ] Facebook Page connected
   - [ ] Instagram connected
   - [ ] Can receive messages
   - [ ] Can send replies

4. **Documentation**
   - [ ] Detailed use case explanations
   - [ ] Code implementation referenced
   - [ ] Screenshots prepared
   - [ ] Videos recorded

5. **Legal Compliance**
   - [ ] GDPR-compliant
   - [ ] DPAs with processors
   - [ ] Data request policies
   - [ ] Security measures documented

---

## 🚀 Expected Review Timeline

- **Standard Review:** 3-5 business days
- **With Issues:** 7-14 days (requires fixes)
- **Appeal Process:** 2-4 weeks

**Tips for Faster Approval:**
1. ✅ Only request needed permissions
2. ✅ Provide detailed justifications
3. ✅ Have working test account
4. ✅ Clear, professional documentation
5. ✅ Quick response to reviewer questions

---

## 📝 Common Rejection Reasons (Avoided)

### ❌ Requesting unnecessary permissions
**Our Status:** ✅ Cleaned from 16+ to 7 permissions

### ❌ Unclear use case
**Our Status:** ✅ Clear: Customer messaging CRM

### ❌ Missing privacy policy
**Our Status:** ✅ Comprehensive policy at /privacy

### ❌ No test credentials
**Our Status:** ✅ Will provide working test account

### ❌ Can't reproduce functionality
**Our Status:** ✅ Detailed instructions + videos

---

## 🎯 Success Criteria

**Approval Indicators:**
- ✅ All requested permissions granted
- ✅ No restrictions on app
- ✅ Can access production API
- ✅ Status shows "Live" in App Dashboard

**Post-Approval Actions:**
1. Monitor webhook health
2. Check message delivery rates
3. Verify all integrations working
4. Update documentation if needed
5. Announce to users

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-20  
**Prepared By:** Development Team  
**Status:** Ready for Submission ✅
