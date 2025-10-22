# Facebook App: Switch from Sandbox to Live Mode

## 🎯 Problem
Your Facebook app is in **Sandbox/Development Mode**, which only allows 1 page to receive webhooks at a time. This explains why only the last connected page receives messages.

## 🚀 Solution: Switch to Live Mode

### Step 1: Facebook App Dashboard
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Navigate to your app: **Facebook Bot Dashboard ODL**
3. Click on your app to open the dashboard

### Step 2: App Review Section
1. In the left sidebar, click **App Review**
2. Look for **App Mode** or **Make App Live** section
3. You should see current status: **"In Development"**

### Step 3: Switch to Live
1. Click **"Make Public"** or **"Switch to Live"** button
2. Review the permissions your app uses:
   - `pages_show_list`
   - `pages_manage_metadata`
   - `pages_messaging`
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_manage_engagement`
   - `pages_read_user_content`

### Step 4: App Review (if required)
Some permissions might require Facebook review:
- **Basic permissions**: Usually auto-approved
- **Advanced permissions**: May need review process
- **Standard Access**: Most likely what you need

### Step 5: Verification
After switching to live:
1. Your app status should show **"Live"**
2. All connected Facebook pages should receive webhooks
3. No more "only last page works" limitation

## 🔄 Alternative: Request Standard Access

If your app requires review:

### For `pages_messaging` (required for webhooks):
1. Go to **App Review > Permissions and Features**
2. Find **pages_messaging**
3. Click **"Request"** or **"Get Advanced Access"**
4. Provide:
   - **Use case description**: "Multi-page customer support chatbot"
   - **Screenshots**: Your integrations page showing multiple pages
   - **Privacy Policy**: Your app's privacy policy URL
   - **Terms of Service**: Your app's terms URL

### Review Timeline:
- **Standard permissions**: Usually instant
- **Advanced permissions**: 7-14 business days
- **Some permissions**: May be instant if use case is clear

## 🧪 After Going Live: Test Multiple Pages

1. Keep all your pages connected
2. Send messages to **all pages**:
   - Dian Aul
   - Big Chonky Cats
   - Demo Company Page
3. All should receive webhooks! ✅

## 📋 Checklist

- [ ] Access Facebook App Dashboard
- [ ] Navigate to App Review
- [ ] Switch from Development to Live mode
- [ ] Verify app status shows "Live"
- [ ] Test messages to all connected pages
- [ ] Confirm all pages receive webhooks

## 🎉 Expected Result

After switching to live mode:
- ✅ All Facebook pages receive webhooks simultaneously
- ✅ No more "last connected page only" limitation
- ✅ Full multi-page support
- ✅ Your chatbot works as expected

---

**This was an excellent catch!** The sandbox limitation was exactly why only one page worked. 🎯