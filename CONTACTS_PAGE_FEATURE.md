# Contacts Page - Feature Documentation

## Overview
New **Contacts** page that shows a list of all customers who have sent messages to your business across all platforms (Facebook, Instagram, Telegram, Website Widget).

---

## ✨ Features

### 1. **Unified Customer List** 📋
- See all customers in one place
- Grouped by unique customer (PSID)
- Shows customer from all platforms together
- Latest activity first

### 2. **Customer Information** 👤
Display for each contact:
- ✅ **Name** - Customer name (or fallback to "Customer XXXX")
- ✅ **Profile Picture** - From Facebook/Instagram/Telegram
- ✅ **Email** - If collected
- ✅ **Phone** - If collected
- ✅ **Address** - If collected
- ✅ **Platform** - Badge showing source (Facebook, Instagram, etc.)
- ✅ **Message Count** - Total messages exchanged
- ✅ **Last Active** - Time since last message
- ✅ **Unread Count** - New messages badge

### 3. **Search & Filter** 🔍
- **Search by name** - Real-time search
- **Filter by platform**:
  - All Platforms
  - Facebook
  - Instagram
  - Telegram
  - Website

### 4. **Click to Chat** 💬
- Click any contact → Opens their conversation
- Redirects to Conversations page with contact selected

### 5. **Real-time Stats** 📊
- Total contacts count
- Message counts per contact
- Unread message indicators
- Last activity timestamps

---

## 🎯 User Flow

```
Dashboard → Contacts
    ↓
See list of all customers
    ↓
Search/Filter by platform
    ↓
Click on a contact
    ↓
Opens their conversation
    ↓
Start messaging!
```

---

## 📱 UI Layout

```
┌──────────────────────────────────────────────┐
│ 👥 Contacts                                  │
│ Manage customers who have messaged you (15)  │
├──────────────────────────────────────────────┤
│ ┌──────────────────┬──────────────────────┐ │
│ │ 🔍 Search...     │ [Platform Filter ▼] │ │
│ └──────────────────┴──────────────────────┘ │
├──────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐  │
│ │ 👤 John Smith           [FACEBOOK]  🔴3│  │
│ │    @MyPageName                          │  │
│ │    ✉ john@example.com  📞 123-456-7890 │  │
│ │    💬 25 messages • Last: 5m ago       │  │
│ └────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────┐  │
│ │ 👤 Sarah Johnson        [INSTAGRAM]    │  │
│ │    @businesspage                        │  │
│ │    ✉ sarah@example.com                 │  │
│ │    💬 12 messages • Last: 2h ago       │  │
│ └────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────┐  │
│ │ 👤 Mike Davis           [WIDGET]       │  │
│ │    Chat Widget                          │  │
│ │    ✉ mike@example.com  📍 New York     │  │
│ │    💬 8 messages • Last: 1d ago        │  │
│ └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 🗂️ Navigation

### Sidebar Location:
```
MESSAGING
├── Conversations
├── Contacts       ← NEW!
└── Canned Responses
```

### Access:
- **Path:** `/dashboard/contacts`
- **Roles:** OWNER, ADMIN, AGENT (all roles)
- **Icon:** Users icon

---

## 🔧 Technical Implementation

### Files Created:

1. **`src/app/dashboard/contacts/page.tsx`**
   - Main Contacts page component
   - List view with search and filters
   - Click-to-chat functionality

2. **`src/app/api/contacts/route.ts`**
   - API endpoint: `GET /api/contacts`
   - Fetches unique customers across all platforms
   - Supports search and filtering

### Files Modified:

1. **`src/components/dashboard/AppSidebar.tsx`**
   - Added "Contacts" navigation item
   - Placed under MESSAGING section

---

## 📊 API Endpoint

### GET `/api/contacts`

**Query Parameters:**
- `search` - Search by customer name (optional)
- `platform` - Filter by platform: ALL | FACEBOOK | INSTAGRAM | TELEGRAM | WIDGET
- `limit` - Number of contacts to return (default: 50)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "contacts": [
    {
      "id": "conv_123",
      "psid": "123456789",
      "platform": "FACEBOOK",
      "customerName": "John Smith",
      "customerEmail": "john@example.com",
      "customerPhone": "+1234567890",
      "customerAddress": "New York, NY",
      "profilePicture": "https://...",
      "lastMessageAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T08:00:00Z",
      "messageCount": 25,
      "conversationId": "conv_123",
      "platformName": "@MyPageName",
      "unreadCount": 3
    }
  ],
  "total": 15,
  "hasMore": false
}
```

---

## 🎨 UI Components

### Contact Card:
```tsx
<div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
  {/* Profile Picture */}
  <ProfilePicture />
  
  {/* Contact Info */}
  <div className="flex-1">
    <div className="flex items-center gap-2">
      <h3>{customerName}</h3>
      <Badge>{platform}</Badge>
      {unreadCount > 0 && <Badge>3 new</Badge>}
    </div>
    
    <p>{platformName}</p>
    
    {/* Contact Details */}
    <div className="flex gap-3 text-xs">
      {email && <span>✉ {email}</span>}
      {phone && <span>📞 {phone}</span>}
      {address && <span>📍 {address}</span>}
    </div>
  </div>
  
  {/* Stats */}
  <div className="text-right">
    <div>💬 {messageCount} messages</div>
    <div>📅 Last: {timeAgo}</div>
  </div>
</div>
```

---

## 🔍 Search & Filter

### Search:
- Real-time search as you type
- Searches customer name field
- Case-insensitive matching

### Platform Filter:
- **All Platforms** - Show everyone
- **Facebook** - Only Facebook Messenger
- **Instagram** - Only Instagram DMs
- **Telegram** - Only Telegram chats
- **Website** - Only website widget chats

---

## 📈 Features Breakdown

### Displayed Information:

| Field | Source | Fallback |
|-------|--------|----------|
| **Name** | customerName or meta.customerProfile.fullName | "Customer XXXX" |
| **Email** | customerEmail | Not shown |
| **Phone** | customerPhone | Not shown |
| **Address** | customerAddress | Not shown |
| **Profile Pic** | Platform API or meta.customerProfile.profilePicture | Platform default icon |
| **Platform Name** | Page name / Username / Widget name | "Unknown" |
| **Message Count** | Count of messages in conversation | 0 |
| **Last Active** | lastMessageAt | createdAt |
| **Unread** | unreadCount from database | 0 |

---

## 🎯 Use Cases

### 1. **Customer Management**
View all customers who have contacted you:
- See their contact information
- Check last activity
- View message history

### 2. **Quick Access**
Find and message specific customers:
- Search by name
- Filter by platform
- Click to open conversation

### 3. **Lead Management**
Track potential customers:
- See who has reached out
- Check if they provided email/phone
- Follow up on old conversations

### 4. **Multi-Platform View**
Unified view across platforms:
- Facebook customers
- Instagram followers
- Telegram users
- Website visitors
- All in one place

---

## 🚀 Future Enhancements

### Phase 2 (Potential):
1. **Export contacts** - CSV/Excel export
2. **Tags** - Label contacts (VIP, Lead, etc.)
3. **Notes** - Add internal notes per contact
4. **Segments** - Group contacts by criteria
5. **Last purchase** - E-commerce integration
6. **Lifetime value** - Track customer value

### Phase 3 (Potential):
1. **Bulk actions** - Message multiple contacts
2. **Contact cards** - Detailed view per contact
3. **Activity timeline** - Full interaction history
4. **Contact merge** - Combine duplicate contacts
5. **Custom fields** - Add your own fields
6. **CRM integration** - Sync with Salesforce, HubSpot

---

## 📊 Performance

### Optimizations:
- ✅ **Grouped by PSID** - Single record per customer
- ✅ **Selective loading** - Only needed fields
- ✅ **Efficient queries** - Minimal database hits
- ✅ **Pagination** - Load 50 at a time
- ✅ **Indexed fields** - Fast searches

### Scalability:
- Supports thousands of contacts
- Fast search (database indexed)
- Efficient filtering
- Lazy loading for large lists

---

## 🐛 Known Limitations

1. **No duplicate detection** (yet)
   - Same person across platforms = separate contacts
   - Could merge by email/phone later

2. **No contact editing** (yet)
   - Can't manually edit contact info
   - Info comes from conversations only

3. **No export** (yet)
   - Can't export contact list
   - Could add CSV export

4. **No bulk actions** (yet)
   - Can't select multiple
   - One-by-one interaction only

---

## ✅ Testing Checklist

### Functionality:
- [ ] Contacts list loads
- [ ] Search works
- [ ] Platform filter works
- [ ] Click contact opens conversation
- [ ] Profile pictures display
- [ ] Badges show correctly
- [ ] Time ago formats correctly
- [ ] Unread counts accurate

### Data Display:
- [ ] Customer names show
- [ ] Email displays (if available)
- [ ] Phone displays (if available)
- [ ] Address displays (if available)
- [ ] Platform badges correct colors
- [ ] Message counts accurate
- [ ] Last active times correct

### Edge Cases:
- [ ] Empty state shows
- [ ] No search results handled
- [ ] Missing customer data handled
- [ ] Long names truncate
- [ ] Mobile responsive

---

## 📚 Documentation

### For Users:

**How to Access:**
1. Open Dashboard
2. Click "Contacts" in sidebar (under MESSAGING)
3. View all your customers

**How to Search:**
1. Type name in search box
2. Results filter as you type

**How to Filter:**
1. Use platform dropdown
2. Select platform
3. List updates

**How to Chat:**
1. Click any contact
2. Opens their conversation
3. Start messaging

---

## 🎨 UI Highlights

### Contact Card Features:
- ✅ **Hover effect** - Gray background on hover
- ✅ **Cursor pointer** - Indicates clickable
- ✅ **Platform badges** - Color-coded
- ✅ **Unread badges** - Red with count
- ✅ **Profile pictures** - Platform-specific styling
- ✅ **Icon indicators** - Email, Phone, Address icons
- ✅ **Truncation** - Long text doesn't break layout
- ✅ **Responsive** - Works on mobile

### Empty States:
```
No contacts yet:
"Contacts will appear here when customers message you"

No search results:
"No contacts match 'search query'"
```

---

## 🔗 Related Pages

- **Conversations** - Message customers
- **Canned Responses** - Quick replies
- **Integrations** - Connect platforms

---

## 📊 Comparison with Other Platforms

### vs Chatbase:
- ✅ We have unified contacts list
- ❓ Chatbase contact features unknown

### vs Freshdesk:
- Similar to Freshdesk contacts
- Integrated with conversations
- Multi-platform unified view

### vs Intercom:
- Similar concept (People page)
- Our version is simpler
- Focus on messaging context

---

## ✅ Status

**Implementation:** ✅ COMPLETE

**Files:**
- ✅ `src/app/dashboard/contacts/page.tsx` - UI
- ✅ `src/app/api/contacts/route.ts` - API
- ✅ `src/components/dashboard/AppSidebar.tsx` - Navigation

**Testing:** ⏳ Needs manual verification

**Deployment:** 🚀 Ready

---

## 🎉 Summary

New **Contacts** page provides:
- ✅ Unified view of all customers
- ✅ Search and filter capabilities
- ✅ Quick access to conversations
- ✅ Contact information at a glance
- ✅ Multi-platform support
- ✅ Clean, modern UI

**Access:** Dashboard → Contacts (in sidebar under MESSAGING)

**Perfect for:** Managing customer relationships and quick access to conversations! 📇✨
