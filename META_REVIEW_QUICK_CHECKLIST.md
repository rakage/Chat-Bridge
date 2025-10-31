# Meta App Review - Quick Checklist ✅

Print this page and check off items as you complete them.

---

## 📅 Timeline: Plan for 7-10 Days Preparation

- [ ] **Day 1-2**: Setup test accounts and pages
- [ ] **Day 3-4**: Prepare demo environment and test scenarios
- [ ] **Day 5-6**: Record video demo and write documentation
- [ ] **Day 7**: Final testing and submission
- [ ] **Day 8-14**: Review period (respond quickly to any Meta requests)

---

## 🎯 Phase 1: Account Setup (Day 1-2)

### Create Test Facebook Account
- [ ] Email created: `metareview.[business]@gmail.com`
- [ ] Facebook account created with REAL email (NOT test user)
- [ ] Profile completed (photo, basic info)
- [ ] Email verified
- [ ] Phone number verified (recommended)
- [ ] Account looks professional (not fake)

### Create Test Facebook Page
- [ ] Page created with clear business name
- [ ] Category selected appropriately
- [ ] Page description added
- [ ] Profile photo uploaded
- [ ] Cover photo uploaded
- [ ] Page published (not draft)
- [ ] Page ID noted: `________________`
- [ ] Page URL noted: `________________`

### Setup Meta App Roles
- [ ] Test account added as Administrator in App Roles
- [ ] Invitation accepted from test account
- [ ] Verified test account can access App Dashboard

### Optional: Instagram
- [ ] Instagram Business Account created
- [ ] Linked to Facebook Page
- [ ] Credentials noted

---

## 🎯 Phase 2: Application Setup (Day 3-4)

### Deploy Application
- [ ] App deployed to production/staging
- [ ] URL is publicly accessible: `________________`
- [ ] SSL certificate valid (https://)
- [ ] No console errors on load
- [ ] All pages load correctly
- [ ] Mobile responsive

### Create Demo User Account
- [ ] Demo account created in your app
- [ ] Email: `________________`
- [ ] Password: `________________` (write it down!)
- [ ] Role: OWNER or ADMIN (full access)
- [ ] Login verified working

### Connect Test Page
- [ ] Login to app with demo account
- [ ] Go to Integrations → Facebook
- [ ] Connect test Facebook page
- [ ] Grant all required permissions
- [ ] Webhook subscribed successfully
- [ ] Status shows "Connected" (green)

### Verify Basic Flow
- [ ] Send message from Facebook Messenger to test page
- [ ] Message appears in dashboard
- [ ] Can reply from dashboard
- [ ] Reply arrives in Messenger
- [ ] Real-time updates working

---

## 🎯 Phase 3: Test Scenarios (Day 4-5)

### Test 1: Normal Messaging (Within 24h)
- [ ] Customer sends message
- [ ] AI bot responds automatically (if enabled)
- [ ] Message shows in dashboard
- [ ] Agent can reply manually
- [ ] All messages appear correctly

### Test 2: AI Bot Toggle
- [ ] Can toggle AI auto-response ON
- [ ] New messages get bot replies
- [ ] Can toggle AI auto-response OFF
- [ ] New messages don't get bot replies
- [ ] Toggle reflects in database

### Test 3: Human Agent Escalation
- [ ] Customer asks "talk to human"
- [ ] Bot recognizes and switches to manual mode
- [ ] Agent can take over
- [ ] Conversation shows manual mode indicator

### Test 4: 24-Hour Window (CRITICAL)
- [ ] Test conversation with last message >24h old created
- [ ] Agent tries to send reply
- [ ] Console logs show "Using HUMAN_AGENT tag"
- [ ] Message sends successfully
- [ ] No errors in UI or console

### Test 5: Error Handling
- [ ] Graceful error messages if API fails
- [ ] Loading states show properly
- [ ] No crashes or blank screens

---

## 🎯 Phase 4: Documentation (Day 5-6)

### Video Demo Recording
- [ ] Screen recorder ready (OBS, Loom, etc.)
- [ ] Script prepared
- [ ] Clear audio (use microphone)
- [ ] HD quality (1080p minimum)
- [ ] Length: 5-7 minutes

### Video Content Checklist
- [ ] **Scene 1**: Login and dashboard overview (30s)
- [ ] **Scene 2**: Normal message flow within 24h (1-2min)
- [ ] **Scene 3**: Human agent escalation (1-2min)
- [ ] **Scene 4**: HUMAN_AGENT tag demo >24h (2min)
- [ ] **Scene 5**: Toggle AI bot on/off (1min)
- [ ] **Ending**: Summary and thank you (30s)

### Video Upload
- [ ] Video edited (cut mistakes, add captions if needed)
- [ ] Uploaded to YouTube (Unlisted) or Loom
- [ ] URL accessible without login: `________________`
- [ ] Video tested on different devices

### Documentation Files

**Instructions for Reviewers:**
- [ ] `META_REVIEW_TEST_ACCOUNT_SETUP.md` customized
- [ ] All placeholders filled in:
  - [ ] Test Facebook email & password
  - [ ] Test page name, ID, URL
  - [ ] Dashboard URL
  - [ ] Demo account email & password
  - [ ] Video URL
- [ ] Converted to PDF (optional but recommended)
- [ ] Uploaded to Google Drive or similar
- [ ] Public link obtained: `________________`

**Submission Text:**
- [ ] `META_REVIEW_SUBMISSION_TEMPLATE.md` reviewed
- [ ] Justification text copied and customized
- [ ] Test credentials section filled
- [ ] Video URL added
- [ ] Privacy policy URL added
- [ ] Terms URL added

---

## 🎯 Phase 5: Final Testing (Day 7)

### Test from Reviewer Perspective
- [ ] Open instructions document
- [ ] Follow it step-by-step as if you're the reviewer
- [ ] Login to Facebook with test account: ✅ Works
- [ ] Login to dashboard with demo account: ✅ Works
- [ ] Send message from Messenger: ✅ Appears in dashboard
- [ ] Reply from dashboard: ✅ Arrives in Messenger
- [ ] Watch video: ✅ Clear and helpful
- [ ] All scenarios in video are reproducible: ✅ Yes

### Technical Verification
- [ ] Webhook responding: `curl [webhook-url]/health`
- [ ] Database connections stable
- [ ] No console errors
- [ ] No broken images or CSS
- [ ] All links working
- [ ] HTTPS valid

### Documentation Double-Check
- [ ] No typos in instructions
- [ ] All URLs are correct and accessible
- [ ] Video plays without issues
- [ ] PDF/document is formatted properly
- [ ] Passwords are correct (test them!)

---

## 🎯 Phase 6: Submission (Day 7)

### Meta App Dashboard
- [ ] Go to: App Dashboard → App Review
- [ ] Find: `pages_messaging` permission
- [ ] Click: "Request Advanced Access"

### Fill Submission Form

**Field 1: How will you use this permission?**
- [ ] Justification text pasted
- [ ] Customized for your app
- [ ] Clear and concise
- [ ] Emphasizes customer support use case
- [ ] Mentions HUMAN_AGENT tag usage

**Field 2: Provide test credentials**
- [ ] Facebook test account email
- [ ] Facebook test account password
- [ ] Dashboard URL
- [ ] Demo account email
- [ ] Demo account password
- [ ] Link to detailed instructions

**Field 3: Video demonstration**
- [ ] Video URL pasted
- [ ] Video is accessible (tested in incognito mode)
- [ ] Brief description of video content

**Field 4: Additional information**
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Data usage explanation
- [ ] Compliance commitment
- [ ] Business information

### Before Hitting Submit
- [ ] Read entire submission one more time
- [ ] All fields completed
- [ ] No placeholders like `[YOUR_URL]` remaining
- [ ] Credentials triple-checked
- [ ] Video plays correctly
- [ ] Instructions document accessible
- [ ] Deep breath taken 😊

### Submit
- [ ] **Submission submitted!** 🚀
- [ ] Submission ID noted: `________________`
- [ ] Confirmation email received
- [ ] Calendar reminder set to check status daily

---

## 🎯 Phase 7: During Review (1-2 Weeks)

### Daily Tasks
- [ ] Check App Review status in dashboard
- [ ] Monitor email for Meta messages
- [ ] Check test environment still working
- [ ] Credentials still valid

### If Meta Asks Questions
- [ ] Respond within 24 hours
- [ ] Be professional and helpful
- [ ] Provide additional info if requested
- [ ] Update documentation if needed

### If Rejected
- [ ] Read rejection reason carefully
- [ ] Identify specific issues
- [ ] Fix all mentioned problems
- [ ] Update video/docs if needed
- [ ] Re-submit with explanation of changes

### If Approved ✅
- [ ] **CELEBRATE!** 🎉
- [ ] Verify permission granted in dashboard
- [ ] Test in production
- [ ] Remove test/demo indicators
- [ ] Monitor for any issues
- [ ] Update user documentation

---

## 📞 Emergency Contacts

**Meta Support:**
- Developer Support: https://developers.facebook.com/support

**Your Team:**
- Technical Lead: `________________`
- Phone: `________________`
- Email: `________________`

**Hosting Provider:**
- Support URL: `________________`
- Account ID: `________________`

---

## 💡 Pro Tips

1. **Start Early**: Begin at least 7 days before you need approval
2. **Test Everything**: Assume nothing works until you test it
3. **Clear Communication**: Make it easy for reviewers to understand
4. **Professional Presentation**: First impressions matter
5. **Be Available**: During review, respond quickly to any requests
6. **Don't Panic if Rejected**: Many apps get approved on 2nd attempt
7. **Document Everything**: Keep notes of what you did
8. **Backup Plan**: Have alternative timeline if approval delayed

---

## 📊 Success Metrics

You're ready to submit when:
- ✅ All checklist items above are checked
- ✅ You can successfully complete all test scenarios
- ✅ Video clearly demonstrates functionality
- ✅ Instructions are clear and accurate
- ✅ Test credentials work 100% reliably
- ✅ No console errors or broken features

---

## 🎯 Common Mistakes to Avoid

- ❌ Using Test User instead of real Facebook account
- ❌ Incomplete profile on test account (looks fake)
- ❌ Video too long or unclear
- ❌ Credentials that don't work
- ❌ Broken links in documentation
- ❌ Justification text too vague
- ❌ Not testing from reviewer perspective
- ❌ Forgetting to publish Facebook Page
- ❌ Webhook not publicly accessible
- ❌ Not responding quickly to Meta questions

---

**Print this checklist and keep it handy during preparation!**

Good luck! 🍀
