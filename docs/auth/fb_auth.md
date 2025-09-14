# Facebook Authentication Documentation

## Overview

This document describes the Facebook OAuth 2.0 authentication flow for the ads-insights application. Facebook authentication provides access to Facebook Pages, advertising data, and content management capabilities through the Facebook Graph API.

## Authentication Flow

### 1. Prerequisites

- **Facebook Developer Account**: Required with approved app
- **Facebook App**: Registered with appropriate permissions
- **Business Verification**: Required for advanced permissions
- **Environment Variables**: Configured in `.env` file

### 2. Environment Variables

```env
# Facebook OAuth Configuration
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
APP_URL=https://your-domain.com
```

### 3. OAuth 2.0 Flow

#### Step 1: Initiate Authentication

**Endpoint**: `POST /api/auth/facebook/login`

The authentication process begins when a user initiates Facebook connection:

```typescript
// Request Parameters
{
  returnTo?: string // Optional redirect URL after successful auth
}

// Response
{
  success: true,
  data: {
    authUrl: string // Facebook authorization URL
  }
}
```

**Required Permissions**:

- `ads_management` - Create and manage advertising campaigns
- `ads_read` - Read advertising performance data
- `business_management` - Manage business assets and settings
- `pages_read_engagement` - Read page engagement metrics
- `pages_manage_ads` - Manage page advertisements
- `pages_manage_posts` - Create and manage page posts
- `read_insights` - Access detailed analytics and insights
- `instagram_basic` - Basic Instagram account access (if connected)
- `instagram_content_publish` - Publish content to Instagram (if connected)

#### Step 2: User Authorization

User is redirected to Facebook's authorization server:

```
https://www.facebook.com/v19.0/dialog/oauth?
  client_id={app-id}&
  redirect_uri={redirect-uri}&
  response_type=code&
  scope={permissions}&
  state={state}
```

User experience:

1. Login to Facebook account (if not already logged in)
2. Review requested permissions for Pages and advertising
3. Select which Facebook Pages to grant access to
4. Grant or deny access to the application

#### Step 3: Authorization Callback

**Endpoint**: `GET /api/auth/facebook/callback`

Facebook redirects back to the application with results:

```typescript
// URL Parameters (Success)
{
  code: string,      // Authorization code
  state: string,     // State parameter for CSRF protection
}

// URL Parameters (Error)
{
  error: string,             // Error code
  error_reason?: string,     // Additional error context
  error_description?: string // Human-readable error description
}
```

#### Step 4: Token Exchange

Exchange authorization code for access token:

```typescript
// Token Request
POST https://graph.facebook.com/v19.0/oauth/access_token
{
  client_id: FACEBOOK_APP_ID,
  client_secret: FACEBOOK_APP_SECRET,
  redirect_uri: callback_url,
  code: authorization_code
}

// Token Response
{
  access_token: string,
  token_type: "bearer",
  expires_in: number    // Default: 3600 seconds (1 hour)
}
```

#### Step 5: Long-Lived Token Exchange

Convert short-lived token to long-lived token:

```typescript
// Long-lived Token Request
GET https://graph.facebook.com/v19.0/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id={app-id}&
  client_secret={app-secret}&
  fb_exchange_token={short-lived-token}

// Response
{
  access_token: string,
  token_type: "bearer",
  expires_in: number    // Typically 5184000 (60 days)
}
```

## Security Features

### State Parameter

- **Purpose**: CSRF protection and session management
- **Generation**: Cryptographically secure random string
- **Validation**: Verified during callback to prevent request forgery

```typescript
// State generation
const state = generateState(); // Generates secure random string

// State validation in callback
if (session?.state !== receivedState) {
  throw new Error('Invalid state parameter - possible CSRF attack');
}
```

### Token Security

- **Encryption**: All access tokens encrypted before database storage
- **Scope Validation**: Verify granted permissions match requirements
- **Expiration Handling**: Automatic token refresh before expiration

## Page Management

### Facebook Pages Access

After authentication, enumerate accessible Facebook Pages:

```typescript
// Get User's Pages
GET https://graph.facebook.com/v19.0/me/accounts?access_token={token}

// Response
{
  data: [
    {
      id: "page_id",
      name: "Page Name",
      access_token: "page_access_token",
      category: "Business Category",
      tasks: ["ANALYZE", "ADVERTISE", "MODERATE", "CREATE_CONTENT"]
    }
  ]
}
```

### Page-Level Permissions

Each page may have different permission levels:

- **ANALYZE**: View page insights and analytics
- **ADVERTISE**: Create and manage advertisements
- **MODERATE**: Manage comments and messages
- **CREATE_CONTENT**: Post content to the page

## Error Handling

### Common Error Scenarios

1. **User Denial**: `error=access_denied`
   - User declined to grant permissions
   - Redirect: `/profile?tab=connections&error=facebook_auth_denied`

2. **Invalid App Configuration**
   - App not properly configured in Facebook Developer Console
   - Missing required permissions in app settings

3. **Business Verification Required**
   - Advanced permissions require business verification
   - Error: `error=permissions_error`

4. **Rate Limiting**
   - Too many authentication requests
   - Temporary throttling by Facebook

5. **Invalid Callback**: Missing or malformed parameters
   - Redirect: `/profile?tab=connections&error=invalid_callback`

### Error Response Format

```typescript
{
  success: false,
  error: string,
  message?: string,
  facebookError?: {
    code: number,
    message: string,
    type: string,
    error_subcode?: number
  }
}
```

## API Integration

### Facebook Graph API Endpoints

#### User Information

```typescript
// Get User Profile
GET https://graph.facebook.com/v19.0/me
  ?fields=id,name,email,picture
  &access_token={access-token}
```

#### Page Management

```typescript
// Get Page Details
GET https://graph.facebook.com/v19.0/{page-id}
  ?fields=id,name,category,about,picture,fan_count,website
  &access_token={page-access-token}

// Get Page Posts
GET https://graph.facebook.com/v19.0/{page-id}/posts
  ?fields=id,message,created_time,likes.summary(true),comments.summary(true)
  &access_token={page-access-token}
```

#### Content Publishing

```typescript
// Create Page Post
POST https://graph.facebook.com/v19.0/{page-id}/feed
  ?message={post-content}
  &access_token={page-access-token}

// Upload Photo
POST https://graph.facebook.com/v19.0/{page-id}/photos
  ?url={image-url}
  &caption={caption}
  &access_token={page-access-token}

// Upload Video
POST https://graph.facebook.com/v19.0/{page-id}/videos
  ?file_url={video-url}
  &description={description}
  &access_token={page-access-token}
```

#### Analytics & Insights

```typescript
// Page Insights
GET https://graph.facebook.com/v19.0/{page-id}/insights
  ?metric=page_impressions,page_engaged_users,page_fans
  &period=day
  &access_token={page-access-token}

// Post Insights
GET https://graph.facebook.com/v19.0/{post-id}/insights
  ?metric=post_impressions,post_engaged_users,post_clicks
  &access_token={page-access-token}
```

#### Advertising API

```typescript
// Get Ad Accounts
GET https://graph.facebook.com/v19.0/me/adaccounts
  ?fields=id,name,account_status,currency,timezone_name
  &access_token={access-token}

// Get Campaigns
GET https://graph.facebook.com/v19.0/{ad-account-id}/campaigns
  ?fields=id,name,status,objective,created_time
  &access_token={access-token}

// Campaign Insights
GET https://graph.facebook.com/v19.0/{campaign-id}/insights
  ?fields=impressions,clicks,spend,cpm,ctr,conversions
  &access_token={access-token}
```

## Database Schema

### AuthProvider Table

```sql
CREATE TABLE AuthProvider (
  id VARCHAR PRIMARY KEY,
  userId VARCHAR NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'facebook'
  accessToken TEXT,               -- Encrypted user access token
  pageAccessToken TEXT,           -- Encrypted page access token
  pageId VARCHAR,                 -- Primary Facebook Page ID
  pageName VARCHAR,               -- Page name for display
  providerUserId VARCHAR,         -- Facebook User ID
  scopes TEXT,                    -- Granted permissions
  expiresAt TIMESTAMP,           -- Token expiration
  pages JSON,                    -- Array of accessible pages
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Page Data Structure

```typescript
interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  tasks: string[]; // Available permissions
  picture?: {
    data: {
      url: string;
    };
  };
  fan_count?: number;
}
```

## Token Management

### Access Token Types

1. **User Access Token**
   - Lifetime: 1 hour (short-lived) or 60 days (long-lived)
   - Usage: User-level API calls
   - Scope: User permissions and page discovery

2. **Page Access Token**
   - Lifetime: Never expires (if user token is long-lived)
   - Usage: Page-specific API calls
   - Scope: Page management and content publishing

### Token Refresh Strategy

```typescript
// Check token expiration
if (isTokenNearExpiration(expiresAt)) {
  const newToken = await extendFacebookAccessToken(currentToken);
  await updateStoredToken(newToken);
}

// Page tokens inherit user token expiration
async function refreshPageTokens(userToken: string) {
  const pages = await getFacebookPages(userToken);

  for (const page of pages) {
    await updatePageToken(page.id, page.access_token);
  }
}
```

## Rate Limiting

### Facebook Graph API Limits

- **App-level**: 200 calls per hour per user per app
- **Page-level**: Higher limits for verified apps
- **Marketing API**: Separate limits for advertising endpoints

### Rate Limit Headers

```
X-App-Usage: {"call_count":25,"total_cputime":4,"total_time":3}
X-Page-Usage: {"call_count":15,"total_cputime":2,"total_time":2}
X-Ad-Account-Usage: {"acc_id_util_pct":15}
```

### Best Practices

- Implement exponential backoff for rate limit errors
- Use batch requests to reduce API call count
- Cache frequently accessed data
- Monitor usage through Facebook Analytics

## Business Verification

### Required for Advanced Permissions

- `ads_management`
- `pages_manage_ads`
- `business_management`

### Verification Process

1. Submit business documentation to Facebook
2. Provide business verification details
3. Wait for Facebook review (typically 1-7 days)
4. Address any feedback from Facebook
5. Receive verification approval

## Testing

### Development Setup

1. Create Facebook App in development mode
2. Add test users with appropriate permissions
3. Configure development callback URLs
4. Test with sandbox data

### App Review Process

1. Submit app for review with required permissions
2. Provide detailed use case documentation
3. Create demo video showing permission usage
4. Respond to Facebook reviewer feedback
5. Receive approval for production use

## Troubleshooting

### Common Issues

1. **Insufficient Permissions**
   - Review requested vs. granted scopes
   - Check if business verification is required
   - Verify app review status for advanced permissions

2. **Page Access Issues**
   - Confirm user is Page admin
   - Check if Page is eligible for API access
   - Verify Page has required permissions

3. **Token Expiration**
   - Implement automatic token refresh
   - Handle expired token errors gracefully
   - Prompt user to re-authenticate when necessary

4. **API Version Compatibility**
   - Use consistent API version (v19.0)
   - Monitor for deprecated features
   - Update API calls for new versions

### Debug Information

```typescript
// Log authentication flow
logger.info('Facebook auth initiated', {
  state,
  scopes: OAUTH_SCOPES.FACEBOOK.split(','),
  redirectUri,
  timestamp: new Date().toISOString(),
});

// Log token exchange
logger.info('Facebook token exchanged', {
  hasUserToken: !!userToken,
  tokenExpiresIn: expiresIn,
  grantedScopes: grantedScopes?.split(','),
});
```

### Error Monitoring

- Track authentication success/failure rates
- Monitor API error patterns
- Alert on unusual authentication behavior
- Log rate limit warnings

## Webhooks (Optional)

### Real-time Updates

Configure webhooks for real-time notifications:

```typescript
// Webhook subscription
POST https://graph.facebook.com/v19.0/{page-id}/subscribed_apps
  ?subscribed_fields=feed,mention,message_deliveries
  &access_token={page-access-token}
```

### Webhook Events

- `feed`: New posts on the page
- `mention`: Page mentioned in posts
- `message_deliveries`: Message delivery confirmations

## Related Documentation

- [Facebook Graph API Documentation](https://developers.facebook.com/docs/graph-api/)
- [Facebook Marketing API](https://developers.facebook.com/docs/marketing-apis/)
- [Facebook App Development](https://developers.facebook.com/docs/development/)
- [Facebook Posting Documentation](../posting/facebook_posting.md)
