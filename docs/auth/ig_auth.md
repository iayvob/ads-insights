# Instagram Authentication Documentation

## Overview

This document describes the Instagram authentication flow using Facebook's Graph API. Instagram Business accounts are managed through Facebook's OAuth system, requiring Facebook app permissions to access Instagram business features.

## Authentication Flow

### 1. Prerequisites

- **Facebook Developer Account**: Required with approved app
- **Facebook App**: Registered with Instagram permissions
- **Instagram Business Account**: Connected to a Facebook Page
- **Environment Variables**: Configured in `.env` file

### 2. Environment Variables

```env
# Facebook/Instagram OAuth Configuration
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
APP_URL=https://your-domain.com
```

### 3. OAuth 2.0 Flow (Facebook-based)

#### Step 1: Initiate Authentication

**Endpoint**: `POST /api/auth/instagram/login`

Instagram authentication uses Facebook's OAuth system:

```typescript
// Request Parameters
{
  returnTo?: string // Optional redirect URL after successful auth
}

// Response
{
  success: true,
  data: {
    authUrl: string // Facebook authorization URL with Instagram scopes
  }
}
```

**Required Scopes (via Facebook)**:

- `ads_management` - Manage advertising campaigns
- `ads_read` - Read advertising data
- `business_management` - Manage business assets
- `pages_read_engagement` - Read page engagement data
- `pages_manage_ads` - Manage page advertisements
- `pages_manage_posts` - Create and manage posts
- `read_insights` - Access analytics data
- `instagram_basic` - Basic Instagram account access
- `instagram_content_publish` - Publish content to Instagram

#### Step 2: User Authorization

User is redirected to Facebook's authorization server where they:

1. Login to their Facebook account (if not already logged in)
2. Grant permissions for the connected Instagram Business account
3. Review Instagram-specific permissions
4. Approve or deny access

#### Step 3: Authorization Callback

**Endpoint**: `GET /api/auth/instagram/callback`

Facebook redirects back with authorization results:

```typescript
// URL Parameters
{
  code: string,      // Authorization code (on success)
  state: string,     // State parameter for CSRF protection
  error?: string,    // Error code (on failure)
  error_reason?: string,
  error_description?: string
}
```

#### Step 4: Token Exchange

Exchange authorization code for Facebook access token:

```typescript
// Token Response
{
  access_token: string,
  token_type: "Bearer",
  expires_in: number
}
```

#### Step 5: Instagram Business Account Discovery

Use Facebook token to find connected Instagram business accounts:

```typescript
// Get Facebook Pages
GET https://graph.facebook.com/v19.0/me/accounts?access_token={token}

// Get Instagram Business Accounts
GET https://graph.facebook.com/v19.0/{page-id}?fields=instagram_business_account&access_token={token}
```

## Business Account Requirements

### Instagram Business Account Setup

1. **Convert Personal to Business**: Instagram account must be a Business account
2. **Connect to Facebook Page**: Business account must be connected to a Facebook Page
3. **Page Admin Rights**: User must have admin rights on the connected Facebook Page

### Verification Process

```typescript
// Verify Instagram Business Account
const businessAccountId = await getInstagramBusinessAccount(
  pageId,
  accessToken
);

if (!businessAccountId) {
  throw new Error('No Instagram Business account found for this page');
}
```

## Security Features

### State Parameter

- **Purpose**: CSRF protection
- **Generation**: Cryptographically secure random string
- **Validation**: Verified during callback

### Token Security

- **Encryption**: Access tokens encrypted before database storage
- **Scope Validation**: Verify granted scopes match requested scopes
- **Expiration**: Monitor and handle token expiration

## Error Handling

### Common Error Scenarios

1. **User Denial**: `error=access_denied`
   - User declined permissions
   - Redirect: `/profile?tab=connections&error=instagram_auth_denied`

2. **No Business Account**:
   - Instagram account not converted to Business
   - No Facebook Page connection
   - Redirect: `/profile?tab=connections&error=no_business_account`

3. **Insufficient Permissions**:
   - Missing required scopes
   - Facebook Page admin rights required
   - Redirect: `/profile?tab=connections&error=insufficient_permissions`

4. **Invalid Callback**: Missing required parameters
   - Redirect: `/profile?tab=connections&error=invalid_callback`

### Error Response Format

```typescript
{
  success: false,
  error: string,
  message?: string,
  requirements?: {
    businessAccount: boolean,
    facebookPage: boolean,
    adminRights: boolean
  }
}
```

## API Integration

### Instagram Graph API Endpoints

#### User Information

```typescript
// Get Instagram Business Account Info
GET https://graph.facebook.com/v19.0/{instagram-user-id}
  ?fields=account_type,username,name,profile_picture_url,followers_count,media_count
  &access_token={access-token}
```

#### Media Management

```typescript
// Get Instagram Media
GET https://graph.facebook.com/v19.0/{instagram-user-id}/media
  ?fields=id,media_type,media_url,permalink,timestamp,caption
  &access_token={access-token}

// Create Instagram Media Container
POST https://graph.facebook.com/v19.0/{instagram-user-id}/media
  ?image_url={image-url}
  &caption={caption}
  &access_token={access-token}

// Publish Instagram Media
POST https://graph.facebook.com/v19.0/{instagram-user-id}/media_publish
  ?creation_id={creation-id}
  &access_token={access-token}
```

#### Analytics (Insights)

```typescript
// Get Account Insights
GET https://graph.facebook.com/v19.0/{instagram-user-id}/insights
  ?metric=impressions,reach,profile_views
  &period=day
  &access_token={access-token}

// Get Media Insights
GET https://graph.facebook.com/v19.0/{media-id}/insights
  ?metric=impressions,reach,engagement
  &access_token={access-token}
```

## Database Schema

### AuthProvider Table

```sql
CREATE TABLE AuthProvider (
  id VARCHAR PRIMARY KEY,
  userId VARCHAR NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'instagram'
  accessToken TEXT,               -- Encrypted Facebook access token
  providerUserId VARCHAR,         -- Instagram Business Account ID
  providerUsername VARCHAR,       -- Instagram username
  pageId VARCHAR,                 -- Connected Facebook Page ID
  scopes TEXT,                    -- Granted permissions
  expiresAt TIMESTAMP,           -- Token expiration (60 days)
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Additional Metadata

```sql
-- Store Instagram-specific data
{
  "accountType": "BUSINESS",
  "facebookPageId": "page_id",
  "instagramUserId": "business_account_id",
  "username": "business_handle",
  "followerCount": 1000,
  "mediaCount": 250
}
```

## Token Management

### Facebook Access Token

- **Lifetime**: 60 days (long-lived)
- **Extension**: Can be extended before expiration
- **Scope**: Covers both Facebook and Instagram permissions

### Token Refresh

```typescript
// Extend Facebook Access Token
const extendedToken = await extendFacebookAccessToken(accessToken);

// Token extension is automatic when near expiration
if (isTokenNearExpiration(expiresAt)) {
  await extendAccessToken(authProvider);
}
```

## Content Publishing

### Publishing Requirements

1. **Media Validation**: Images/videos must meet Instagram requirements
2. **Caption Limits**: 2,200 characters maximum
3. **Hashtag Limits**: 30 hashtags maximum
4. **Media Formats**: JPEG, PNG for images; MP4 for videos

### Publishing Flow

```typescript
// 1. Create Media Container
const container = await createInstagramMediaContainer({
  instagram_user_id: businessAccountId,
  image_url: mediaUrl,
  caption: postContent,
  access_token: accessToken,
});

// 2. Publish Media
const publishResult = await publishInstagramMedia({
  instagram_user_id: businessAccountId,
  creation_id: container.id,
  access_token: accessToken,
});
```

## Rate Limiting

### Instagram Graph API Limits

- **Standard**: 200 calls per hour per user
- **Business Verification**: Higher limits available
- **Batch Requests**: Group multiple requests to save quota

### Best Practices

- Implement request queuing for high-volume operations
- Cache user data to reduce API calls
- Use webhooks for real-time updates when possible

## Testing

### Development Setup

1. Create Facebook App with Instagram permissions
2. Add test Instagram Business accounts
3. Configure development callback URLs
4. Test with sandbox data

### Sandbox Testing

- Use Facebook's Graph API Explorer
- Test with development Instagram accounts
- Verify permission scopes

## Troubleshooting

### Common Issues

1. **Business Account Not Found**
   - Verify Instagram account is converted to Business
   - Check Facebook Page connection
   - Confirm user has Page admin rights

2. **Permission Errors**
   - Review granted vs. requested scopes
   - Check Facebook App review status
   - Verify Instagram-specific permissions

3. **API Rate Limits**
   - Implement proper rate limiting
   - Use batch requests for efficiency
   - Monitor usage in Facebook Developer Console

### Debug Information

```typescript
// Log authentication details
logger.info('Instagram auth initiated', {
  state,
  userId: existingSession.userId,
  redirectUri,
  scopes: OAUTH_SCOPES.FACEBOOK.split(','),
});
```

## Business Account Validation

### Required Checks

```typescript
// Validate business account setup
async function validateInstagramBusinessSetup(
  pageId: string,
  accessToken: string
) {
  // 1. Check if page has Instagram account
  const page = await getPageWithInstagram(pageId, accessToken);

  // 2. Verify account type is BUSINESS
  const accountInfo = await getInstagramAccountInfo(
    page.instagram_business_account.id,
    accessToken
  );

  // 3. Confirm publishing permissions
  const permissions = await checkPublishingPermissions(
    accountInfo.id,
    accessToken
  );

  return {
    hasBusinessAccount: !!page.instagram_business_account,
    isBusinessType: accountInfo.account_type === 'BUSINESS',
    canPublish: permissions.instagram_content_publish,
  };
}
```

## Related Documentation

- [Facebook Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Instagram Content Publishing](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Instagram Posting Documentation](../posting/instagram_posting.md)
