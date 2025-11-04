# Twitter OAuth Token Issue - Root Cause Analysis & Fix

## 🔍 Problem Summary

Twitter API v2 analytics calls were returning 403 "Authentication failed" errors despite successful OAuth flow completion.

## 🐛 Root Cause

The **unified OAuth flow** (OAuth 2.0 → OAuth 1.0a) was **overwriting the OAuth 2.0 Bearer token** with the OAuth 1.0a token in the `accessToken` field.

### Token Requirements

**Twitter API v2 (Analytics):**

- Requires: OAuth 2.0 Bearer token (100+ characters)
- Used for: `GET https://api.x.com/2/users/me`, analytics endpoints
- Authorization header: `Bearer <oauth2_access_token>`

**Twitter API v1.1 (Media Upload):**

- Requires: OAuth 1.0a credentials (app key + secret + user token + token secret)
- Used for: `POST https://upload.twitter.com/1.1/media/upload.json`
- Authorization: OAuth 1.0a signature

### What Was Happening

1. ✅ User initiates Twitter OAuth → OAuth 2.0 flow starts
2. ✅ OAuth 2.0 callback stores Bearer token in `accessToken` field
3. ✅ Analytics work at this point (Bearer token is valid)
4. ❌ Unified flow redirects to OAuth 1.0a for media upload support
5. ❌ OAuth 1.0a callback **OVERWRITES** `accessToken` with OAuth 1.0a token (50 chars)
6. ❌ Analytics break because API v2 endpoint receives OAuth 1.0a token instead of Bearer token

### Database Evidence

```
Before OAuth 1.0a callback:
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." (OAuth 2.0 Bearer - 150+ chars)
  accessTokenSecret: null
  refreshToken: "refresh_token_here"
  expiresAt: 2024-11-04T...

After OAuth 1.0a callback:
  accessToken: "118128662-itNMzG1Qsz..." (OAuth 1.0a - 50 chars) ❌ WRONG!
  accessTokenSecret: "8j8E1WYIlfAaEHZvaUql..." (OAuth 1.0a secret)
  refreshToken: "refresh_token_here" (still present but useless)
  expiresAt: null (cleared by OAuth 1.0a)
```

## 🔧 Solution

Add a separate field `oauth1AccessToken` to store OAuth 1.0a tokens without overwriting OAuth 2.0 Bearer token.

### Schema Changes

```prisma
model AuthProvider {
  // OAuth tokens
  accessToken           String?   // OAuth 2.0 Bearer token (for Twitter API v2 analytics)
  oauth1AccessToken     String?   // OAuth 1.0a access token (for Twitter media uploads) <- NEW
  accessTokenSecret     String?   // OAuth 1.0a access token secret
  refreshToken          String?   // OAuth 2.0 refresh token
  expiresAt             DateTime? // OAuth 2.0 token expiration
  scopes                String?   // OAuth granted scopes
}
```

### Code Changes

#### 1. UserService.updateAuthProviderOAuth1Tokens()

**File:** `src/services/user.ts`

**Before:**

```typescript
data: {
  accessToken: data.accessToken, // ❌ Overwrites OAuth 2.0 Bearer token
  accessTokenSecret: data.accessTokenSecret,
  expiresAt: null, // ❌ Clears OAuth 2.0 expiration
}
```

**After:**

```typescript
data: {
  oauth1AccessToken: data.accessToken, // ✅ Stores in separate field
  accessTokenSecret: data.accessTokenSecret,
  // ✅ Preserves accessToken (OAuth 2.0) and expiresAt
}
```

#### 2. Twitter Posting Service

**File:** `src/app/api/posting/platforms/twitter/helpers.ts`

Update `getTwitterConnection()` to read `oauth1AccessToken` instead of `accessToken` for OAuth 1.0a operations.

**Before:**

```typescript
if (authProvider.accessTokenSecret) {
  authType = 'oauth1';
  accessToken = authProvider.accessToken; // ❌ OAuth 1.0a token
}
```

**After:**

```typescript
if (authProvider.accessTokenSecret && authProvider.oauth1AccessToken) {
  authType = 'oauth1';
  oauth1AccessToken = authProvider.oauth1AccessToken; // ✅ Correct OAuth 1.0a token
  oauth2AccessToken = authProvider.accessToken; // ✅ Preserve OAuth 2.0 for API v2
}
```

#### 3. Platform Posting Connection Setup

**File:** `src/services/platform-posting.ts`

Update connection setup to use `oauth1AccessToken` for media uploads.

## 📊 Expected Behavior After Fix

### Unified OAuth Flow (OAuth 2.0 + OAuth 1.0a)

```
Database after both flows complete:
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." ✅ OAuth 2.0 Bearer (preserved)
  oauth1AccessToken: "118128662-itNMzG1Qsz..." ✅ OAuth 1.0a token (new field)
  accessTokenSecret: "8j8E1WYIlfAaEHZvaUql..." ✅ OAuth 1.0a secret
  refreshToken: "refresh_token_here" ✅ OAuth 2.0 refresh
  expiresAt: 2024-11-04T... ✅ OAuth 2.0 expiration (preserved)
```

### Token Usage

**For Analytics (API v2):**

```typescript
// Uses accessToken (OAuth 2.0 Bearer)
GET https://api.x.com/2/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**For Media Uploads (API v1.1):**

```typescript
// Uses oauth1AccessToken + accessTokenSecret
const client = new TwitterApi({
  appKey: TWITTER_API_KEY,
  appSecret: TWITTER_API_SECRET,
  accessToken: provider.oauth1AccessToken, // OAuth 1.0a token
  accessSecret: provider.accessTokenSecret, // OAuth 1.0a secret
});
```

## ✅ Migration Steps

1. **Update Schema** - Add `oauth1AccessToken` field ✅
2. **Push to Database** - `npx prisma db push` ✅
3. **Generate Prisma Client** - `npx prisma generate`
4. **Update UserService** - Modify `updateAuthProviderOAuth1Tokens()` ✅
5. **Update Twitter Posting Helper** - Use `oauth1AccessToken` for OAuth 1.0a
6. **Update Platform Posting** - Update connection setup
7. **Test OAuth Flow** - User reconnects Twitter
8. **Verify Analytics** - Check API v2 calls work
9. **Verify Posting** - Check media uploads work

## 🧪 Testing Checklist

- [ ] User can reconnect Twitter account
- [ ] OAuth 2.0 callback stores Bearer token in `accessToken`
- [ ] OAuth 1.0a callback stores OAuth 1.0a token in `oauth1AccessToken`
- [ ] `accessToken` is NOT overwritten during unified flow
- [ ] Twitter analytics fetch succeeds (uses `accessToken`)
- [ ] Twitter posting with media succeeds (uses `oauth1AccessToken` + `accessTokenSecret`)
- [ ] Token refresh uses `refreshToken` correctly
- [ ] Both OAuth 2.0 and OAuth 1.0a tokens coexist in database

## 📝 Official Twitter Documentation References

- **Twitter API v2 Authentication:** https://developer.twitter.com/en/docs/authentication/oauth-2-0
- **OAuth 2.0 with PKCE:** https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code
- **Twitter API v1.1 OAuth 1.0a:** https://developer.twitter.com/en/docs/authentication/oauth-1-0a
- **Media Upload API:** https://developer.twitter.com/en/docs/twitter-api/v1/media/upload-media/overview
