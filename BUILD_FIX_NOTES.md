# Build Fix Notes

## Issue: Redis SET Command Syntax Error

### Problem
```typescript
// ❌ WRONG: TypeScript didn't like this parameter order
const acquired = await redis.set(lockKey, lockValue, "NX", "EX", lockTimeout);
```

**Error:**
```
Type error: No overload matches this call.
  Argument of type '"NX"' is not assignable to parameter of type '"KEEPTTL"'.
```

### Root Cause
The `ioredis` library has specific parameter order requirements for the `SET` command with options.

### Solution
```typescript
// ✅ CORRECT: ioredis expects this order
const acquired = await redis.set(lockKey, lockValue, 'EX', lockTimeout, 'NX');
```

**Redis Command Equivalent:**
```
SET key value EX seconds NX
```

### ioredis SET Command Syntax

**Correct order:**
1. `key` - The key name
2. `value` - The value to set
3. `'EX'` - Expiration flag
4. `seconds` - Number of seconds
5. `'NX'` - Only set if not exists

**What it does:**
- `EX seconds` - Set expiration time in seconds
- `NX` - Only set if key doesn't exist (mutex lock behavior)

### Verification
```bash
npx tsc --noEmit
# ✅ Process exited with code 0
```

---

## Build Status

✅ **TypeScript Compilation:** Successful  
✅ **Type Checking:** Passed  
✅ **No Errors:** Confirmed  

---

## Redis Mutex Lock Pattern (Corrected)

```typescript
// Acquire lock
const lockKey = `mutex:facebook:${senderId}:${recipientId}`;
const lockValue = Date.now().toString();
const lockTimeout = 30; // 30 seconds

// ✅ Correct ioredis syntax
const acquired = await redis.set(lockKey, lockValue, 'EX', lockTimeout, 'NX');

if (acquired === 'OK') {
  try {
    // Do work
  } finally {
    // Release lock only if we still hold it
    const currentValue = await redis.get(lockKey);
    if (currentValue === lockValue) {
      await redis.del(lockKey);
    }
  }
}
```

---

## Alternative Approaches (Reference)

### Using SETNX + EXPIRE (separate commands)
```typescript
const acquired = await redis.setnx(lockKey, lockValue);
if (acquired === 1) {
  await redis.expire(lockKey, lockTimeout);
  // ... do work
}
```

**Issue:** Not atomic - race condition between SETNX and EXPIRE

### Using SET with all options (preferred)
```typescript
const acquired = await redis.set(lockKey, lockValue, 'EX', lockTimeout, 'NX');
```

**✅ Atomic operation** - Lock acquisition and expiration set in one command

---

## Chatwoot Comparison

**Chatwoot (Ruby with redis-rb):**
```ruby
redis.set(lock_key, lock_value, nx: true, ex: 30)
```

**Your Implementation (TypeScript with ioredis):**
```typescript
redis.set(lockKey, lockValue, 'EX', 30, 'NX')
```

**Same behavior, different syntax!**

---

**Fixed:** 2025-11-04  
**Status:** ✅ Ready to Build
