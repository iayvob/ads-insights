# Twitter/X Authentication Documentation

## Overview

This document describes the OAuth 2.0 authentication flow for Twitter/X integration in the ads-insights application. The authentication follows Twitter's OAuth 2.0 with PKCE (Proof Key for Code Exchange) for enhanced security.

## Authentication Flow

### 1. Prerequisites

- **Twitter Developer Account**: Required with approved app
- **App Registration**: Twitter app registered with appropriate permissions
- **Environment Variables**: Configured in `.env` file

### 2. Environment Variables

```env
# Twitter/X OAuth Configuration
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
APP_URL=https://your-domain.com
```

### 3. OAuth 2.0 Flow with PKCE

#### Step 1: Initiate Authentication

**Endpoint**: `POST /api/auth/twitter/login`

The authentication process begins when a user initiates Twitter connection:

```typescript
// Request Parameters
{
  returnTo?: string // Optional redirect URL after successful auth
}

// Response
{
  success: true,
  data: {
    authUrl: string,    // Twitter authorization URL
    state: string,      // Truncated state for security
    scopes: string[]    // Requested permissions
  }
}
```

**Authentication Scopes**:

- `tweet.read` - Read tweets and user timeline
- `tweet.write` - Create and publish tweets
- `users.read` - Access user profile information
- `offline.access` - Refresh token for long-term access

#### Step 2: User Authorization

User is redirected to Twitter's authorization server where they:

1. Login to their Twitter account (if not already logged in)
2. Review the requested permissions
3. Grant or deny access to the application

#### Step 3: Authorization Callback

**Endpoint**: `GET /api/auth/twitter/callback`

Twitter redirects back to the application with authorization results:

```typescript
// URL Parameters
{
  code: string,      // Authorization code (on success)
  state: string,     // State parameter for CSRF protection
  error?: string     // Error code (on failure)
}
```

#### Step 4: Token Exchange

The application exchanges the authorization code for access tokens:

```typescript
// Token Response
{
  access_token: string,
  refresh_token?: string,
  expires_in: number,
  token_type: "Bearer",
  scope: string
}
```

## Security Features

### PKCE (Proof Key for Code Exchange)

- **Code Verifier**: Cryptographically random string (43-128 characters)
- **Code Challenge**: Base64URL-encoded SHA256 hash of code verifier
- **Challenge Method**: S256 (SHA256)

```typescript
// PKCE Generation
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');
```

### State Parameter

- **Purpose**: CSRF protection
- **Generation**: 32-byte random hex string
- **Validation**: Verified during callback to prevent request forgery

## Error Handling

### Common Error Scenarios

1. **User Denial**: `error=access_denied`
   - Redirect: `/profile?tab=connections&error=twitter_auth_denied`

2. **Invalid Callback**: Missing code or state
   - Redirect: `/profile?tab=connections&error=invalid_callback`

3. **State Mismatch**: CSRF protection triggered
   - Redirect: `/profile?tab=connections&error=invalid_state`

4. **Token Exchange Failure**: API communication error
   - Redirect: `/profile?tab=connections&error=token_exchange_failed`

### Error Response Format

```typescript
{
  success: false,
  error: string,
  message?: string,
  loginUrl?: string  // For authentication required errors
}
```

## Token Management

### Access Token

- **Lifetime**: 2 hours (7200 seconds)
- **Usage**: API requests to Twitter endpoints
- **Storage**: Encrypted in database

### Refresh Token

- **Availability**: When `offline.access` scope is granted
- **Lifetime**: 60 days (extendable)
- **Usage**: Automatic token refresh

### Token Refresh Process

```typescript
// Automatic refresh when access token expires
const refreshedTokens = await OAuthService.refreshTwitterToken(refreshToken);
```

## Database Schema

### AuthProvider Table

```sql
CREATE TABLE AuthProvider (
  id VARCHAR PRIMARY KEY,
  userId VARCHAR NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'twitter'
  accessToken TEXT,               -- Encrypted access token
  refreshToken TEXT,              -- Encrypted refresh token
  expiresAt TIMESTAMP,           -- Token expiration
  scopes TEXT,                   -- Granted permissions
  providerUserId VARCHAR,        -- Twitter user ID
  providerUsername VARCHAR,      -- Twitter username
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## API Integration

### User Data Retrieval

```typescript
// Get Twitter user information
const userData = await OAuthService.getTwitterUserData(accessToken)

// Response Structure
{
  id: string,           // Twitter user ID
  username: string,     // Twitter handle
  name: string,         // Display name
  profile_image_url: string,
  public_metrics: {
    followers_count: number,
    following_count: number,
    tweet_count: number,
    listed_count: number
  }
}
```

### Rate Limiting

- **Authentication**: 300 requests per 15-minute window
- **API Calls**: Varies by endpoint (standard rate limits apply)
- **Best Practice**: Implement exponential backoff for rate limit errors

## Testing

### Development Setup

1. Create Twitter Developer App in sandbox/development mode
2. Configure callback URL: `http://localhost:3000/api/auth/twitter/callback`
3. Test with development environment variables

### Production Deployment

1. Update callback URL to production domain
2. Verify SSL certificate for HTTPS callbacks
3. Monitor authentication success rates

## Troubleshooting

### Common Issues

1. **Invalid Client ID**: Verify `TWITTER_CLIENT_ID` in environment
2. **Redirect URI Mismatch**: Ensure callback URL matches Twitter app settings
3. **Scope Permissions**: Verify app has requested permissions approved
4. **Token Expiration**: Implement automatic refresh logic

### Debug Logging

```typescript
// Enable detailed logging
logger.info('Twitter OAuth flow initiated', {
  userId: existingSession.userId,
  redirectUri,
  scopes: scopes.split(' '),
  state: state.substring(0, 8) + '...',
});
```

### Monitoring

- Track authentication success/failure rates
- Monitor token refresh frequency
- Alert on unusual authentication patterns

## Related Documentation

- [Twitter API Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [OAuth 2.0 with PKCE Specification](https://tools.ietf.org/html/rfc7636)
- [Twitter Posting Documentation](../posting/twitter_posting.md)
