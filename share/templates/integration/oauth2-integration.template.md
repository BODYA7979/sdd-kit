# OAuth2 Integration Guide

*Implementing secure authentication using OAuth 2.0 Authorization Code flow*

---

## Overview

OAuth 2.0 enables secure, delegated access without exposing user credentials. This guide covers the Authorization Code flow with PKCE, suitable for both server-side and mobile applications.

**Supported Flows:**
- Authorization Code (recommended)
- Authorization Code + PKCE (required for mobile/SPA)
- Client Credentials (machine-to-machine)
- Refresh Token

---

## Quick Start

### 1. Register OAuth Client

```bash
# Via API (if available)
POST /api/v1/oauth/clients
{
  "name": "My Application",
  "redirect_uris": ["https://myapp.com/callback"],
  "scopes": ["profile", "email"]
}

# Response
{
  "client_id": "{{client_id}}",
  "client_secret": "{{client_secret}}",
  "redirect_uris": ["https://myapp.com/callback"]
}
```

### 2. Redirect User to Authorization

```
GET {{auth_url}}/oauth/authorize?
    response_type=code&
    client_id={{client_id}}&
    redirect_uri=https://myapp.com/callback&
    scope=profile email&
    state={{random_state}}
```

### 3. Exchange Code for Token

```bash
POST {{auth_url}}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code={{authorization_code}}&
redirect_uri=https://myapp.com/callback&
client_id={{client_id}}&
client_secret={{client_secret}}
```

### 4. Use Access Token

```bash
GET /api/v1/me
Authorization: Bearer {{access_token}}
```

---

## Authorization Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │     │   App    │     │  Auth    │     │   API    │
│          │     │          │     │  Server  │     │  Server  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Login       │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 2. Redirect to │                │
     │                │    /authorize  │                │
     │<───────────────────────────────>│                │
     │                │                │                │
     │ 3. Authenticate & Consent       │                │
     │────────────────────────────────>│                │
     │                │                │                │
     │ 4. Redirect with code           │                │
     │<────────────────────────────────│                │
     │                │                │                │
     │ 5. Code        │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 6. Exchange    │                │
     │                │    code        │                │
     │                │───────────────>│                │
     │                │                │                │
     │                │ 7. Access Token│                │
     │                │<───────────────│                │
     │                │                │                │
     │                │ 8. API Request │                │
     │                │────────────────────────────────>│
     │                │                │                │
     │                │ 9. Response    │                │
     │                │<────────────────────────────────│
     │                │                │                │
     │ 10. Data       │                │                │
     │<───────────────│                │                │
```

---

## Implementation

### Step 1: Store OAuth Configuration

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### Step 2: Generate Authorization URL

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### Step 3: Handle Callback

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### Step 4: Exchange Code for Tokens

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### Step 5: Refresh Access Token

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### Step 6: Make Authenticated API Calls

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

---

## PKCE Extension (For Mobile/SPA)

### Generate Code Verifier and Challenge

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### Modified Authorization URL

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### Modified Token Exchange

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

---

## Scopes Reference

| Scope | Description | Access |
|-------|-------------|--------|
| `profile` | Basic user profile | Read |
| `email` | User email address | Read |
| `{{scope1}}` | {{Description}} | Read/Write |
| `{{scope2}}` | {{Description}} | Read |

---

## Security Best Practices

### 1. Always Use HTTPS
<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### 2. Validate State Parameter
<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### 3. Store Tokens Securely
<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### 4. Implement Token Rotation
<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### 5. Handle Token Revocation
<!-- Code example in the project's language; the stack add-on's skill has samples. -->

---

## Error Handling

### Common OAuth Errors

| Error | Description | Solution |
|-------|-------------|----------|
| `invalid_client` | Client credentials invalid | Check client_id/secret |
| `invalid_grant` | Code expired or already used | Get new authorization code |
| `invalid_scope` | Requested scope not allowed | Check available scopes |
| `access_denied` | User denied authorization | Handle gracefully |

### Error Response Format

```json
{
  "error": "invalid_grant",
  "error_description": "The authorization code has expired"
}
```

---

## Testing

### Unit Test

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### Feature Test

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

---

## Troubleshooting

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| "Invalid state" | Session lost | Check session configuration |
| "Invalid grant" | Code expired | Authorize again |
| "Invalid redirect" | URI mismatch | Check registered URIs |
| Token refresh fails | Token revoked | Re-authorize user |

---

*Last Updated: {{Date}}*
*Version: 1.0*
