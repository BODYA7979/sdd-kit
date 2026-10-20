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

```php
// config/services.php
return [
    '{{service}}' => [
        'client_id' => env('{{SERVICE}}_CLIENT_ID'),
        'client_secret' => env('{{SERVICE}}_CLIENT_SECRET'),
        'redirect_uri' => env('{{SERVICE}}_REDIRECT_URI'),
        'auth_url' => env('{{SERVICE}}_AUTH_URL', 'https://auth.{{service}}.com'),
        'api_url' => env('{{SERVICE}}_API_URL', 'https://api.{{service}}.com'),
    ],
];
```

### Step 2: Generate Authorization URL

```php
<?php
declare(strict_types=1);

namespace App\Services;

class {{Service}}OAuthService
{
    public function getAuthorizationUrl(string $state, array $scopes = ['profile', 'email']): string
    {
        $params = [
            'response_type' => 'code',
            'client_id' => config('services.{{service}}.client_id'),
            'redirect_uri' => config('services.{{service}}.redirect_uri'),
            'scope' => implode(' ', $scopes),
            'state' => $state,
        ];

        return config('services.{{service}}.auth_url') . '/oauth/authorize?' . http_build_query($params);
    }

    public function generateState(): string
    {
        $state = bin2hex(random_bytes(32));
        session(['oauth_state' => $state]);
        return $state;
    }
}
```

### Step 3: Handle Callback

```php
<?php
declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Services\{{Service}}OAuthService;
use Illuminate\Http\Request;

class {{Service}}CallbackController extends Controller
{
    public function __construct(
        private readonly {{Service}}OAuthService $oauthService
    ) {}

    public function __invoke(Request $request)
    {
        // 1. Validate state
        if ($request->state !== session('oauth_state')) {
            abort(403, 'Invalid state parameter');
        }

        // 2. Check for errors
        if ($request->has('error')) {
            return redirect('/login')->with('error', $request->error_description);
        }

        // 3. Exchange code for tokens
        $tokens = $this->oauthService->exchangeCode($request->code);

        // 4. Get user info
        $userInfo = $this->oauthService->getUserInfo($tokens['access_token']);

        // 5. Find or create user
        $user = $this->findOrCreateUser($userInfo);

        // 6. Store tokens
        $user->update([
            'oauth_access_token' => encrypt($tokens['access_token']),
            'oauth_refresh_token' => encrypt($tokens['refresh_token']),
            'oauth_expires_at' => now()->addSeconds($tokens['expires_in']),
        ]);

        // 7. Login user
        auth()->login($user);

        return redirect('/dashboard');
    }
}
```

### Step 4: Exchange Code for Tokens

```php
public function exchangeCode(string $code): array
{
    $response = Http::asForm()->post(config('services.{{service}}.auth_url') . '/oauth/token', [
        'grant_type' => 'authorization_code',
        'code' => $code,
        'redirect_uri' => config('services.{{service}}.redirect_uri'),
        'client_id' => config('services.{{service}}.client_id'),
        'client_secret' => config('services.{{service}}.client_secret'),
    ]);

    if (!$response->successful()) {
        throw new OAuthException('Token exchange failed: ' . $response->body());
    }

    return $response->json();
}
```

### Step 5: Refresh Access Token

```php
public function refreshToken(string $refreshToken): array
{
    $response = Http::asForm()->post(config('services.{{service}}.auth_url') . '/oauth/token', [
        'grant_type' => 'refresh_token',
        'refresh_token' => $refreshToken,
        'client_id' => config('services.{{service}}.client_id'),
        'client_secret' => config('services.{{service}}.client_secret'),
    ]);

    if (!$response->successful()) {
        throw new OAuthException('Token refresh failed');
    }

    return $response->json();
}
```

### Step 6: Make Authenticated API Calls

```php
public function makeApiRequest(string $method, string $endpoint, array $data = []): array
{
    $user = auth()->user();

    // Check if token needs refresh
    if ($user->oauth_expires_at->isPast()) {
        $tokens = $this->refreshToken(decrypt($user->oauth_refresh_token));
        $user->update([
            'oauth_access_token' => encrypt($tokens['access_token']),
            'oauth_refresh_token' => encrypt($tokens['refresh_token']),
            'oauth_expires_at' => now()->addSeconds($tokens['expires_in']),
        ]);
    }

    $response = Http::withToken(decrypt($user->oauth_access_token))
        ->{$method}(config('services.{{service}}.api_url') . $endpoint, $data);

    return $response->json();
}
```

---

## PKCE Extension (For Mobile/SPA)

### Generate Code Verifier and Challenge

```php
public function generatePkce(): array
{
    // Generate random verifier (43-128 characters)
    $verifier = bin2hex(random_bytes(32));

    // Create challenge using S256 method
    $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

    session(['pkce_verifier' => $verifier]);

    return [
        'code_verifier' => $verifier,
        'code_challenge' => $challenge,
        'code_challenge_method' => 'S256',
    ];
}
```

### Modified Authorization URL

```php
public function getAuthorizationUrlWithPkce(string $state, array $scopes = ['profile']): string
{
    $pkce = $this->generatePkce();

    $params = [
        'response_type' => 'code',
        'client_id' => config('services.{{service}}.client_id'),
        'redirect_uri' => config('services.{{service}}.redirect_uri'),
        'scope' => implode(' ', $scopes),
        'state' => $state,
        'code_challenge' => $pkce['code_challenge'],
        'code_challenge_method' => 'S256',
    ];

    return config('services.{{service}}.auth_url') . '/oauth/authorize?' . http_build_query($params);
}
```

### Modified Token Exchange

```php
public function exchangeCodeWithPkce(string $code): array
{
    $verifier = session('pkce_verifier');

    $response = Http::asForm()->post(config('services.{{service}}.auth_url') . '/oauth/token', [
        'grant_type' => 'authorization_code',
        'code' => $code,
        'redirect_uri' => config('services.{{service}}.redirect_uri'),
        'client_id' => config('services.{{service}}.client_id'),
        'code_verifier' => $verifier,
    ]);

    return $response->json();
}
```

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
```php
// Middleware to enforce HTTPS for OAuth routes
if (app()->isProduction() && !$request->secure()) {
    return redirect()->secure($request->getRequestUri());
}
```

### 2. Validate State Parameter
```php
if ($request->state !== session('oauth_state')) {
    abort(403, 'State mismatch - possible CSRF attack');
}
```

### 3. Store Tokens Securely
```php
// Encrypt tokens before storage
$user->oauth_access_token = encrypt($tokens['access_token']);
$user->oauth_refresh_token = encrypt($tokens['refresh_token']);
```

### 4. Implement Token Rotation
```php
// Always use new refresh token when refreshing
$user->oauth_refresh_token = encrypt($newTokens['refresh_token']);
```

### 5. Handle Token Revocation
```php
public function revokeToken(string $token): void
{
    Http::asForm()->post(config('services.{{service}}.auth_url') . '/oauth/revoke', [
        'token' => $token,
        'client_id' => config('services.{{service}}.client_id'),
        'client_secret' => config('services.{{service}}.client_secret'),
    ]);
}
```

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

```php
it('generates valid authorization URL', function () {
    $service = new {{Service}}OAuthService();
    $url = $service->getAuthorizationUrl('test_state');

    expect($url)
        ->toContain('response_type=code')
        ->toContain('client_id=')
        ->toContain('state=test_state');
});
```

### Feature Test

```php
it('handles OAuth callback successfully', function () {
    session(['oauth_state' => 'test_state']);

    Http::fake([
        '*/oauth/token' => Http::response([
            'access_token' => 'test_access_token',
            'refresh_token' => 'test_refresh_token',
            'expires_in' => 3600,
        ]),
        '*/api/me' => Http::response([
            'id' => 'user_123',
            'email' => 'test@example.com',
        ]),
    ]);

    $response = $this->get('/callback?code=test_code&state=test_state');

    $response->assertRedirect('/dashboard');
    expect(auth()->check())->toBeTrue();
});
```

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
