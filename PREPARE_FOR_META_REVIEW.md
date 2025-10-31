# Persiapan untuk Meta App Review - Panduan Lengkap

## 📋 Checklist Utama

- [ ] Buat akun Facebook ASLI untuk reviewer (bukan test user)
- [ ] Buat Facebook Page test
- [ ] Tambahkan akun sebagai Admin di App Roles
- [ ] Buat akun demo di aplikasi Anda
- [ ] Deploy aplikasi ke production/staging
- [ ] Setup test conversation dengan >24h window
- [ ] Buat video demo
- [ ] Siapkan dokumen instruksi untuk reviewer
- [ ] Test semua skenario
- [ ] Submit app review dengan semua credentials

---

## 🎯 Langkah 1: Buat Akun Test Facebook ASLI

### 1.1 Buat Email Baru
```
Email: metareview.[namabisnis]@gmail.com
Password: [Password kuat]

Contoh: metareview.salsationbot@gmail.com
```

### 1.2 Buat Akun Facebook Baru

1. Buka https://facebook.com/reg
2. Gunakan email yang baru dibuat
3. Nama: "Meta Reviewer - [Nama Bisnis Anda]"
4. Tanggal lahir: [Umur >18 tahun]
5. Gender: [Pilih salah satu]
6. **PENTING**: Verifikasi email dan nomor telepon

### 1.3 Lengkapi Profil
- Upload foto profil (bisa logo bisnis atau gambar professional)
- Tambahkan beberapa info dasar
- Jangan biarkan akun terlihat seperti fake account

---

## 🎯 Langkah 2: Buat Facebook Page Test

### 2.1 Buat Page Baru

1. Go to: https://www.facebook.com/pages/create
2. Pilih kategori: Business atau Service yang sesuai
3. Nama Page: "[Nama Bisnis] - Test Page"
   - Contoh: "Salsation Bot - Test Page"
4. Tambahkan deskripsi page
5. Upload foto profil dan cover
6. **PUBLIKASIKAN** page (jangan biarkan draft)

### 2.2 Catat Informasi Page

```
Page Name: [Copy nama page]
Page ID: [Lihat di Settings → About]
Page Username: [facebook.com/username]
```

---

## 🎯 Langkah 3: Tambahkan ke Meta App Roles

### 3.1 Buka Meta App Dashboard

1. Go to: https://developers.facebook.com/apps
2. Pilih aplikasi Anda
3. Go to: App Roles → Roles

### 3.2 Tambahkan Sebagai Administrator

1. Click "Add Administrators"
2. Search: email atau nama akun test Facebook
3. Add role: **Administrator**
4. Save changes

### 3.3 Terima Invitation

1. Login ke akun test Facebook
2. Cek notifications
3. Accept invitation sebagai Administrator

---

## 🎯 Langkah 4: Connect Test Page ke App

### 4.1 Di Aplikasi Dashboard Anda

1. Login ke: https://[your-app-url]/login
2. Pastikan Anda sudah punya akun OWNER/ADMIN
3. Go to: Dashboard → Integrations → Facebook

### 4.2 Connect Facebook Page

1. Click "Connect Facebook Page"
2. Login dengan akun test Facebook
3. Pilih "Test Page" yang baru dibuat
4. Grant permissions:
   - ✅ pages_messaging
   - ✅ pages_manage_metadata
   - ✅ pages_read_engagement
5. Verify connection berhasil

### 4.3 Subscribe Webhook

1. Di manage page, click "Subscribe to Webhook"
2. Verify status: **Connected** (hijau)
3. Test webhook dengan mengirim pesan test

---

## 🎯 Langkah 5: Buat Akun Demo untuk Reviewer

### 5.1 Buat User Baru di Database

Option 1: Via UI (jika ada registration page)
```
Email: metareview@[yourbusiness].com
Password: MetaReviewer2025!
Name: Meta Reviewer
Role: OWNER (agar bisa test semua fitur)
```

Option 2: Via Prisma Studio
```bash
npx prisma studio

# Buat user baru di tabel User
```

Option 3: Via SQL
```sql
INSERT INTO "User" (id, email, name, role, "companyId", "createdAt")
VALUES (
  'meta-reviewer-001',
  'metareview@yourbusiness.com',
  'Meta Reviewer',
  'OWNER',
  '[your-company-id]',
  NOW()
);

-- Set password via NextAuth
-- (Atau gunakan password reset flow)
```

### 5.2 Verify Login

1. Go to: https://[your-app-url]/login
2. Login dengan credentials demo
3. Verify semua page accessible
4. Verify test page sudah connected

---

## 🎯 Langkah 6: Setup Test Conversation dengan >24h Window

### 6.1 Buat Conversation Lama

Option 1: Manual (tunggu 25+ jam)
```
1. Kirim message dari Facebook page sebagai customer
2. Tunggu 25+ jam
3. Coba reply dari dashboard
```

Option 2: Via Database (instant)
```sql
-- Buat conversation lama
INSERT INTO "Conversation" (
  id, 
  "pageId", 
  psid, 
  status, 
  "autoBot", 
  "lastMessageAt", 
  "createdAt"
)
VALUES (
  'test-24h-window-conv',
  '[your-page-id]',
  'test-psid-12345',
  'OPEN',
  false,
  NOW() - INTERVAL '30 hours',  -- 30 jam yang lalu
  NOW() - INTERVAL '30 hours'
);

-- Buat message terakhir dari customer
INSERT INTO "Message" (
  id,
  "conversationId",
  role,
  text,
  "createdAt"
)
VALUES (
  'test-message-001',
  'test-24h-window-conv',
  'USER',
  'This is a test message from 30 hours ago',
  NOW() - INTERVAL '30 hours'
);
```

### 6.2 Verify Test Conversation

1. Login ke dashboard
2. Find conversation: "test-psid-12345"
3. Try sending reply
4. Check console: Should show "Using HUMAN_AGENT tag"
5. Message should send successfully

---

## 🎯 Langkah 7: Buat Video Demo

### 7.1 Tools yang Dibutuhkan

- Screen recorder: OBS Studio, Loom, atau ScreenRec
- Facebook Messenger app atau web
- Browser untuk dashboard

### 7.2 Scenario untuk Video (5-7 menit)

**Scene 1: Setup (30 sec)**
```
- Show dashboard login screen
- Show connected Facebook page
- Show AI Auto-Response is ON
```

**Scene 2: Normal Flow - Within 24h (1 min)**
```
- Open Facebook Messenger
- Send message: "Hello, I need help"
- Show AI bot responds instantly
- Switch to dashboard
- Show message appears in real-time
- Send manual reply
- Show it arrives in Messenger
```

**Scene 3: Human Agent Request (1 min)**
```
- Send in Messenger: "I want to talk to a human"
- Show bot recognizes request
- Show dashboard: conversation switches to manual mode
- Agent sends reply
- Show seamless handoff
```

**Scene 4: 24h Window Test (2 min)**
```
- Show test conversation with last message >24h ago
- Show timestamp: "Last message 30 hours ago"
- Agent types reply in dashboard
- Show browser console: "Using HUMAN_AGENT tag"
- Send message
- Show success notification
- Show message delivered
```

**Scene 5: Toggle AI Bot (1 min)**
```
- Go to Integrations → Facebook → Manage
- Toggle "AI Auto-Response" OFF
- Send message from Messenger
- Show bot doesn't respond
- Toggle back ON
- Send message
- Show bot responds
```

**Ending (30 sec)**
```
- Show conversation list with multiple conversations
- Show analytics/stats dashboard
- Show settings page
- "Thank you for reviewing our app"
```

### 7.3 Narration Script

```
"Hello, this is a demonstration of [Your App Name], 
a customer service platform that uses AI chatbots 
with human agent support.

[Show each scenario with voiceover explaining what's happening]

As you can see, the HUMAN_AGENT tag allows our users 
to provide quality customer support beyond the 24-hour 
messaging window, ensuring no customer inquiry goes 
unanswered.

This is essential for businesses that operate on 
regular business hours but need to respond to 
weekend or after-hours customer messages.

Thank you for reviewing our application."
```

### 7.4 Upload Video

- Upload to YouTube (Unlisted)
- Or Loom
- Or Google Drive (with public link)
- Add link ke submission form

---

## 🎯 Langkah 8: Siapkan Dokumen untuk Reviewer

### 8.1 File yang Sudah Dibuat

✅ `META_REVIEW_TEST_ACCOUNT_SETUP.md` - Instructions untuk reviewer

### 8.2 Customize File

Edit file dan isi:
```markdown
**Facebook Account**:
- Email: [ISI EMAIL TEST]
- Password: [ISI PASSWORD]

**Test Facebook Page**:
- Page Name: [ISI NAMA PAGE]
- Page ID: [ISI PAGE ID]
- URL: [ISI URL PAGE]

**Application Dashboard Access**:
- URL: [ISI URL APP]
- Email: [ISI EMAIL DEMO]
- Password: [ISI PASSWORD DEMO]

**Video URL**: [ISI LINK VIDEO]
```

### 8.3 Convert ke PDF (Opsional)

Untuk tampilan lebih professional:
```bash
# Install pandoc
npm install -g pandoc

# Convert to PDF
pandoc META_REVIEW_TEST_ACCOUNT_SETUP.md -o instructions-for-meta-reviewers.pdf
```

---

## 🎯 Langkah 9: Test Semua Skenario

### 9.1 Pre-Submission Testing Checklist

Test dari perspektif reviewer:

**Basic Flow:**
- [ ] Login ke dashboard dengan credentials demo
- [ ] Lihat connected Facebook page
- [ ] Send message dari Facebook Messenger
- [ ] Verify message muncul di dashboard real-time
- [ ] Reply dari dashboard
- [ ] Verify reply sampai di Messenger

**AI Bot:**
- [ ] AI auto-response works when enabled
- [ ] Can toggle AI on/off per integration
- [ ] Can toggle AI on/off per conversation
- [ ] Bot recognizes "talk to human" requests

**Human Agent Tag:**
- [ ] Can send message to conversation >24h old
- [ ] Console logs show "HUMAN_AGENT tag" being used
- [ ] Message delivers successfully
- [ ] No errors in dashboard or console

**Error Handling:**
- [ ] Graceful error messages if something fails
- [ ] Webhook failures are logged
- [ ] UI shows loading states

**UI/UX:**
- [ ] Dashboard is responsive (desktop & mobile)
- [ ] All buttons work
- [ ] No broken images or styles
- [ ] Fast load times (<3 seconds)

---

## 🎯 Langkah 10: Submit App Review

### 10.1 Go to Meta App Review

1. Meta App Dashboard → App Review → Permissions and Features
2. Click "Request" pada:
   - ✅ `pages_messaging`
   - ✅ `pages_manage_metadata` (if needed)
   - ✅ `pages_read_engagement` (if needed)

### 10.2 Fill Review Form

**Step 1: Tell us how you'll use this permission**

Paste justifikasi yang sudah dibuat sebelumnya.

**Step 2: Provide test credentials**

```
Please use the following test account to review our app:

Facebook Account:
- Email: metareview.salsationbot@gmail.com
- Password: [Your password]

This account has been added as an Administrator in App Roles 
and has a connected test Facebook page.

Application Dashboard:
- URL: https://your-app.vercel.app/login
- Email: metareview@yourbusiness.com
- Password: MetaReviewer2025!

Detailed testing instructions: [Attach PDF atau link to Google Doc]
```

**Step 3: Provide video demonstration**

```
Video URL: https://www.youtube.com/watch?v=[your-video-id]

The video demonstrates:
1. Standard messaging within 24 hours
2. AI bot auto-responses
3. Human agent escalation
4. Human agent tag usage for messages beyond 24-hour window
5. Toggle AI auto-responses on/off

Duration: 5-7 minutes
```

**Step 4: Provide additional information**

```
Privacy Policy URL: https://your-app.vercel.app/privacy
Terms of Service URL: https://your-app.vercel.app/terms

Data Usage:
- We only store message content, timestamps, and sender IDs
- No data is sold to third parties
- Users can delete their data anytime
- All data is encrypted at rest

Compliance:
- HUMAN_AGENT tag is only used for customer support
- No promotional or marketing content
- All usage is logged for audit
- We respect Meta's messaging policies
```

---

## 🎯 Langkah 11: Monitor Review Progress

### 11.1 Check Status Daily

- Meta App Dashboard → App Review
- Check for any feedback or requests

### 11.2 Respond Quickly

- If Meta asks questions: respond within 24 hours
- If they need additional info: provide immediately
- Be professional and cooperative

### 11.3 Common Review Delays

**Akun test terlihat fake**
→ Make sure profile is complete with photo

**Webhook tidak bisa diakses**
→ Verify URL is publicly accessible
→ Check SSL certificate valid

**Video tidak jelas**
→ Re-record with higher quality
→ Add voiceover explanation

**Credentials tidak work**
→ Double-check login credentials
→ Make sure account has proper permissions

---

## ✅ Final Checklist Sebelum Submit

### Credentials
- [ ] Facebook test account email & password
- [ ] Facebook test page ID & URL
- [ ] Dashboard demo account email & password
- [ ] All passwords are STRONG (min 12 chars, mixed case, numbers, symbols)

### Documentation
- [ ] Instructions PDF/Doc prepared
- [ ] Justification text written
- [ ] Privacy policy URL ready
- [ ] Terms of service URL ready

### Technical
- [ ] App deployed to production
- [ ] Webhook publicly accessible
- [ ] SSL certificate valid
- [ ] No console errors
- [ ] Database connections stable

### Testing
- [ ] All test scenarios verified working
- [ ] Video demo recorded and uploaded
- [ ] Test account can login to both Facebook and dashboard
- [ ] Test page connected in dashboard

### Compliance
- [ ] No promotional content in bot responses
- [ ] HUMAN_AGENT tag usage is legitimate
- [ ] Data handling is secure
- [ ] Privacy policy is clear

---

## 📞 Jika Ditolak (Rejection)

### Jangan Panik!

Meta sering menolak pertama kali. Ini normal.

### Review Feedback

1. Baca rejection reason dengan seksama
2. Identifikasi masalah spesifik
3. Fix sesuai feedback

### Common Rejection Reasons

**"Insufficient information"**
→ Tambahkan detail lebih banyak di justification
→ Buat video lebih jelas
→ Provide step-by-step instructions

**"Test account issues"**
→ Pastikan akun adalah akun ASLI (bukan test user)
→ Verify akun sudah di-add sebagai Admin
→ Make sure akun bisa receive messages

**"Functionality not clear"**
→ Improve video demo
→ Add voiceover explanation
→ Show clear use cases

**"Policy violation concern"**
→ Emphasize customer support purpose
→ Show you're NOT using for marketing
→ Add compliance documentation

### Re-submit

1. Fix semua issues
2. Update dokumentasi
3. Re-submit dengan referensi ke submission sebelumnya
4. Explain perubahan yang sudah dilakukan

---

## 🎉 Jika Disetujui

### 1. Verify Permissions

- Check App Dashboard → Permissions
- Verify `pages_messaging` is approved

### 2. Update Production

- Remove test/demo indicators
- Update to use approved permissions
- Monitor for any issues

### 3. Monitor Usage

- Track HUMAN_AGENT tag usage
- Ensure compliance with policies
- Watch for any violations warnings

---

## 📚 Resources

- [Meta App Review Guide](https://developers.facebook.com/docs/app-review)
- [Messenger Platform Policy](https://developers.facebook.com/docs/messenger-platform/policy)
- [Message Tags Documentation](https://developers.facebook.com/docs/messenger-platform/policy/policy-overview/#message_tags)

---

**Good luck with your app review! 🚀**

Jika ada pertanyaan atau butuh bantuan lebih lanjut, jangan ragu untuk bertanya.
