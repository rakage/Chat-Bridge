# Competitor Analysis: Chatbase Widget

## Overview
Analysis of Chatbase's chat widget implementation to understand their architecture and features, particularly the **domain whitelist** functionality.

---

## 1. Setup Architecture

### Their Embed Code Pattern
```html
<script>
(function(){
  // Create queue pattern
  if(!window.chatbase || window.chatbase("getState")!=="initialized"){
    window.chatbase = (...arguments) => {
      if(!window.chatbase.q) { window.chatbase.q = [] }
      window.chatbase.q.push(arguments)
    };
    
    // Proxy pattern for method calls
    window.chatbase = new Proxy(window.chatbase, {
      get(target, prop) {
        if(prop === "q") { return target.q }
        return (...args) => target(prop, ...args)
      }
    });
  }
  
  // Load actual widget script
  const onLoad = function() {
    const script = document.createElement("script");
    script.src = "https://www.chatbase.co/embed.min.js";
    script.id = "svMj3iRirLmVZM-yPXb6F"; // chatbot ID
    script.domain = "www.chatbase.co";
    document.body.appendChild(script);
  };
  
  // Defer until page loads
  if(document.readyState === "complete") {
    onLoad();
  } else {
    window.addEventListener("load", onLoad);
  }
})();
</script>
```

**Key Pattern: Command Queue**
- Widget stub loads immediately (tiny)
- Actual widget deferred until `window.load`
- API calls queued before widget loads
- Similar to Google Analytics pattern

---

## 2. Domain Whitelist Feature ("Allowed Domains")

### How It Works (Deobfuscated)

#### Server-Side Configuration
```javascript
// Widget fetches config from server
const response = await fetch(
  apiUrl + "/api/get-chatbot-styles/" + chatbotId,
  { method: "GET" }
);

const { styles, initialMessages } = await response.json();

// Config includes:
// - styles.hidden_paths: Array of path patterns
// - styles.align_chat_button: left/right
// - styles.theme: dark/light
// - styles.button_color: hex color
// - styles.chat_icon: custom icon URL
```

#### Client-Side Validation
```javascript
// Check if widget should be visible on current page
if (styles.hidden_paths?.length > 0) {
  
  const checkVisibility = () => {
    const currentUrl = window.location.href;
    
    // Filter paths that match current URL
    const matchedPaths = styles.hidden_paths.filter(pathConfig => {
      try {
        // Test regex pattern against current URL
        return new RegExp(pathConfig.path).test(currentUrl);
      } catch (e) {
        // Fallback to exact match if regex invalid
        return currentUrl === pathConfig.path;
      }
    });
    
    // Check if all matches are mobile-only
    const allMobileOnly = matchedPaths.every(p => p.isMobileOnly);
    
    if (matchedPaths.length === 0) {
      // No match = HIDE widget
      chatButton.style.display = "none";
      chatWindow.style.display = "none";
      bubbleMessages.style.display = "none";
    } else if (allMobileOnly) {
      // Show only on mobile
      if (window.innerWidth < 1024) {
        showWidget();
      } else {
        hideWidget();
      }
    } else {
      // Show widget
      showWidget();
    }
  };
  
  // Check on page load
  checkVisibility();
  
  // Re-check on URL changes (SPA support)
  window.addEventListener("changeUrl", checkVisibility);
}
```

#### SPA (Single Page App) Support
```javascript
// Intercept history API to detect URL changes
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  window.dispatchEvent(new CustomEvent("changeUrl"));
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  window.dispatchEvent(new CustomEvent("changeUrl"));
};

// Also listen for back/forward buttons
window.addEventListener("popstate", () => {
  window.dispatchEvent(new CustomEvent("changeUrl"));
});
```

### Database Schema (Inferred)
```sql
-- Each chatbot has allowed paths configuration
CREATE TABLE chatbot_allowed_paths (
  id UUID PRIMARY KEY,
  chatbot_id UUID REFERENCES chatbots(id),
  path_pattern TEXT,        -- Regex pattern: "^/pricing.*", "^/product/.*"
  is_mobile_only BOOLEAN,   -- Show only on mobile?
  created_at TIMESTAMP
);

-- Or stored as JSON in chatbot settings
-- chatbots.settings = {
--   "hidden_paths": [
--     { "path": "^/admin.*", "isMobileOnly": false },
--     { "path": "^/checkout.*", "isMobileOnly": false }
--   ]
-- }
```

---

## 3. Other Notable Features

### Anonymous User Tracking
```javascript
// Generate anonymous ID
const generateAnonId = () => {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
};

// Store in cookie
document.cookie = `chatbase_anon_id=${generateAnonId()}; domain=${domain}; path=/; SameSite=Lax`;
```

### Rate Limiting
- Not visible in minified code (likely server-side)

### Lazy Loading
```javascript
// Socket.io loaded lazily (similar to our approach)
const loadSocketIO = async () => {
  if (!socketIOLoaded) {
    const script = document.createElement("script");
    script.src = "https://cdn.socket.io/socket.io.js";
    document.body.appendChild(script);
    socketIOLoaded = true;
  }
};
```

### Event System
```javascript
// They have an event listener system
const eventManager = new class {
  constructor() {
    this.listeners = new Map();
  }
  
  addEventListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
  }
  
  removeEventListener(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback);
    }
  }
  
  dispatchEvent(event) {
    if (this.listeners.has(event.type)) {
      this.listeners.get(event.type).forEach(callback => {
        callback(event);
      });
    }
    return true;
  }
};

// Events: "message", "assistant-message", "user-message", "tool-call", "tool-result"
window.chatbase("addEventListener", "message", (event) => {
  console.log("New message:", event);
});
```

### Form Schema & Tools
```javascript
// Register custom tools that chatbot can call
window.chatbase("registerTools", {
  searchProducts: async (args, user) => {
    // Custom function
    return { results: [...] };
  },
  bookAppointment: async (args, user) => {
    // Custom function
    return { success: true };
  }
});

// Register form schemas for data collection
window.chatbase("registerFormSchema", {
  contactForm: async (args, user) => {
    return {
      fields: [
        { name: "email", type: "email", label: "Email", required: true },
        { name: "phone", type: "phone", label: "Phone" }
      ],
      submitButtonText: "Submit",
      successMessage: "Thank you!"
    };
  }
});
```

---

## 4. Comparison with Our Implementation

| Feature | Chatbase | Our Widget | Notes |
|---------|----------|------------|-------|
| **Embed Pattern** | Queue + Proxy | Direct init | Theirs is more complex but handles pre-load calls |
| **Lazy Loading** | ✅ Yes | ✅ Yes | Both defer heavy libraries |
| **Domain Whitelist** | ✅ Yes | ❌ No | **Their key feature** |
| **SPA Support** | ✅ Yes | ⚠️ Partial | They intercept history API |
| **Auto-detect API** | ❌ No | ✅ Yes | **Our advantage** |
| **Anonymous Tracking** | ✅ Yes | ⚠️ Session only | They use persistent cookies |
| **Custom Tools** | ✅ Yes | ❌ No | Advanced feature |
| **Form Schemas** | ✅ Yes | ❌ No | Advanced feature |
| **Event System** | ✅ Yes | ⚠️ Socket only | They have full event bus |
| **Mobile Detection** | ✅ Yes | ✅ Yes | Both support |
| **Rate Limiting** | ✅ Server-side | ✅ Client-side | Different approaches |
| **Security** | ⚠️ Unknown | ✅ Strong | Our XSS protection is explicit |

---

## 5. Domain Whitelist Implementation

### How Theirs Works:

1. **Dashboard UI** (in their "Embed" settings):
   ```
   [X] Enable Allowed Domains
   
   Allowed Paths:
   + Add Path
   
   [Path Pattern: ^/pricing.*     ] [Mobile Only: ☐] [Delete]
   [Path Pattern: ^/contact.*     ] [Mobile Only: ☑] [Delete]
   [Path Pattern: ^/product/.*    ] [Mobile Only: ☐] [Delete]
   ```

2. **Server stores configuration**:
   ```json
   {
     "chatbot_id": "abc123",
     "settings": {
       "hidden_paths": [
         { "path": "^/pricing.*", "isMobileOnly": false },
         { "path": "^/contact.*", "isMobileOnly": true },
         { "path": "^/product/.*", "isMobileOnly": false }
       ]
     }
   }
   ```

3. **Widget fetches config and validates**:
   - On page load
   - On URL change (SPAs)
   - Hides widget if current URL doesn't match any pattern

4. **Result**:
   - Widget ONLY shows on specified pages
   - Control per-page visibility
   - Prevent widget on checkout, admin, etc.

### Why They Have This:

**Use Cases:**
1. **Hide on checkout pages** - Don't distract during payment
2. **Hide on admin pages** - Internal pages don't need support
3. **Hide on specific products** - Some products may have dedicated support
4. **Mobile-only pages** - Show widget only on mobile for certain pages
5. **A/B testing** - Show widget to specific page groups

**Business Value:**
- Granular control over widget visibility
- Reduce support load on non-relevant pages
- Better conversion optimization
- Professional appearance (widget where it makes sense)

---

## 6. Pros and Cons

### Chatbase Approach - Pros:
- ✅ **Domain whitelist** - Control where widget appears
- ✅ **SPA support** - Detects URL changes in single-page apps
- ✅ **Queue pattern** - Handles pre-load API calls gracefully
- ✅ **Custom tools & forms** - Advanced customization
- ✅ **Event system** - Rich integration capabilities
- ✅ **Anonymous tracking** - Persistent user identification
- ✅ **Mobile-specific rules** - Per-page mobile control

### Chatbase Approach - Cons:
- ❌ **Complex setup** - More code, more configuration
- ❌ **Server dependency** - Widget config must load from server
- ❌ **API URL hardcoded** - Customers can't change easily
- ❌ **Obfuscation** - Heavily minified, hard to debug
- ❌ **Larger initial load** - More setup code

### Our Approach - Pros:
- ✅ **Simple setup** - Just companyId needed
- ✅ **Auto-detect API** - No hardcoded URLs
- ✅ **Readable code** - Easy to debug and customize
- ✅ **Strong security** - Explicit XSS protection
- ✅ **Faster initial load** - Minimal setup code
- ✅ **Works everywhere** - No domain restrictions by default

### Our Approach - Cons:
- ❌ **No domain whitelist** - Widget appears everywhere
- ❌ **No custom tools** - Limited extensibility
- ❌ **No form schemas** - Can't collect structured data
- ❌ **Limited event system** - Only Socket.io events
- ❌ **Session-only tracking** - No persistent anonymous ID

---

## 7. Recommendations

### High Priority Features to Consider:

#### 1. **Domain Whitelist (Allowed Domains)** ⭐⭐⭐⭐⭐
**Impact: HIGH**

**Implementation:**
```javascript
// Add to widget config
window.chatWidgetConfig = {
  companyId: 'abc123',
  allowedPaths: [
    { pattern: '^/pricing.*', mobileOnly: false },
    { pattern: '^/support.*', mobileOnly: false }
  ]
};

// Or fetch from server
const config = await fetch(`${apiUrl}/api/widget/config/${companyId}`);
const { allowedPaths } = await config.json();
```

**Database Changes:**
```sql
-- Add to companies table
ALTER TABLE companies ADD COLUMN allowed_paths JSONB;

-- Or separate table
CREATE TABLE company_allowed_paths (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  path_pattern TEXT,
  is_mobile_only BOOLEAN,
  created_at TIMESTAMP
);
```

**Dashboard UI:**
```tsx
// In /dashboard/chat-widget
<div>
  <label>
    <input type="checkbox" checked={allowedPathsEnabled} />
    Enable Allowed Domains
  </label>
  
  {allowedPathsEnabled && (
    <div>
      {allowedPaths.map((path, i) => (
        <div key={i}>
          <input 
            value={path.pattern} 
            placeholder="^/pricing.*"
          />
          <label>
            <input type="checkbox" checked={path.mobileOnly} />
            Mobile Only
          </label>
          <button onClick={() => removePath(i)}>Delete</button>
        </div>
      ))}
      <button onClick={addPath}>+ Add Path</button>
    </div>
  )}
</div>
```

#### 2. **SPA URL Change Detection** ⭐⭐⭐⭐
**Impact: MEDIUM**

Add to widget.js:
```javascript
// Intercept history API
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  checkWidgetVisibility();
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  checkWidgetVisibility();
};

window.addEventListener("popstate", checkWidgetVisibility);
```

#### 3. **Queue Pattern for Pre-load Calls** ⭐⭐⭐
**Impact: LOW-MEDIUM**

More graceful handling of API calls before widget loads:
```javascript
// Stub that queues calls
window.ChatWidget = (...args) => {
  window.ChatWidget.q = window.ChatWidget.q || [];
  window.ChatWidget.q.push(args);
};

// When actual widget loads, replay queue
window.ChatWidget.q.forEach(call => {
  actualChatWidget.apply(null, call);
});
```

#### 4. **Persistent Anonymous ID** ⭐⭐⭐
**Impact: MEDIUM**

Track returning visitors:
```javascript
const getOrCreateAnonId = () => {
  let anonId = getCookie('chatbase_anon_id');
  if (!anonId) {
    anonId = generateSecureId();
    setCookie('chatbase_anon_id', anonId, 365); // 1 year
  }
  return anonId;
};
```

#### 5. **Event System** ⭐⭐
**Impact: LOW**

Allow customers to hook into widget events:
```javascript
window.chatWidget.on('message', (event) => {
  console.log('New message:', event);
  // Custom analytics, etc.
});
```

---

## 8. What NOT to Copy

❌ **Heavy Obfuscation** - Makes debugging impossible
❌ **Complex Queue + Proxy Pattern** - Overkill for most use cases  
❌ **Hardcoded API URL** - Our auto-detect is better
❌ **Large Setup Script** - Their initial script is bigger

---

## 9. Summary

### Key Takeaway:
**Their killer feature is the "Allowed Domains" whitelist.**

This lets customers:
- Hide widget on checkout pages
- Hide widget on admin/internal pages  
- Show widget only on specific product pages
- Control mobile vs desktop visibility per page

### Implementation Priority:

1. **Domain Whitelist** (HIGH) - Adds significant value
2. **SPA Support** (MEDIUM) - Important for modern apps
3. **Persistent Tracking** (MEDIUM) - Better analytics
4. **Queue Pattern** (LOW) - Nice to have
5. **Event System** (LOW) - Advanced use cases

### What We Already Do Better:

✅ **Auto-detect API URL** - Simpler, more flexible
✅ **Clean code** - Easier to maintain and debug
✅ **Strong security** - Explicit XSS protection
✅ **Fast initial load** - Less setup code
✅ **Simple configuration** - Just companyId needed

---

## 10. Next Steps (If Implementing Domain Whitelist)

1. **Database Migration**
   ```sql
   ALTER TABLE companies ADD COLUMN allowed_paths JSONB DEFAULT '[]';
   ALTER TABLE companies ADD COLUMN allowed_paths_enabled BOOLEAN DEFAULT false;
   ```

2. **API Endpoint**
   ```
   GET /api/widget/config/public/:companyId
   Response: {
     allowedPaths: [...],
     allowedPathsEnabled: true/false,
     ...other config
   }
   ```

3. **Dashboard UI**
   - Add "Allowed Domains" section to `/dashboard/chat-widget`
   - Regex pattern input
   - Mobile-only checkbox
   - Add/Remove buttons
   - Enable/Disable toggle

4. **Widget Logic**
   - Fetch config on load
   - Check current URL against patterns
   - Hide widget if no match
   - Monitor URL changes for SPAs
   - Re-check visibility on change

5. **Testing**
   - Test regex patterns
   - Test mobile-only mode
   - Test SPA navigation
   - Test enable/disable toggle

---

**Would you like me to implement the Domain Whitelist feature for your widget?**
