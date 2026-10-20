---
name: api-security
description: API security best practices. Use for auth, CORS, rate limiting, validation, and OWASP compliance.
user-invocable: false
allowed-tools: Read, Grep, Glob
---

# API Security Best Practices

Knowledge module for securing Laravel API applications.

## When to Load References

| Task | Load |
|------|------|
| Implementing auth middleware, policies, CSRF | `references/authentication-patterns.md` |
| Configuring CORS, rate limiting, validation | `references/request-protection.md` |
| Preventing SQL injection, XSS, adding security headers | `references/attack-prevention.md` |

---

## Quick Reference

### Authentication & Authorization

- Protect routes with `auth:api` middleware
- Use scope-based middleware for granular access: `scope:orders`
- Implement Policy classes for resource-level authorization
- For stateless APIs, CSRF protection is handled by tokens
- For SPAs with cookies, use Sanctum CSRF cookie endpoint

### CORS Configuration

- Configure `config/cors.php` with explicit allowed origins
- Use environment variables for origin configuration: `explode(',', env('CORS_ALLOWED_ORIGINS'))`
- Set `supports_credentials: true` for cookie-based auth
- Expose rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### Rate Limiting

- Default API limit: `Limit::perMinute(60)` keyed by user ID or IP
- Auth endpoints need stricter limits: `perMinute(5)` + `perDay(100)` by IP
- Apply via route middleware: `throttle:api`, `throttle:auth`
- Use per-endpoint limits for expensive operations (exports, reports)

### Input Validation

- Always use Form Request classes with typed rules
- Password rules: `Password::min(8)->letters()->mixedCase()->numbers()->symbols()->uncompromised()`
- Validate email with `email:rfc,dns`
- Sanitize HTML with `Purify::clean()`, strip tags for plain text fields
- Cast inputs to expected types explicitly

---

## SQL Injection Prevention

- Always use Eloquent or Query Builder (parameterized by default)
- Never interpolate user input into raw SQL strings
- For raw queries, use bindings: `DB::select('...WHERE email = ?', [$email])`
- Escape LIKE wildcards: `str_replace(['%', '_'], ['\%', '\_'], $search)`

## XSS Protection

- Blade `{{ }}` auto-escapes output; only use `{!! !!}` for trusted content
- JSON responses are auto-escaped by Laravel
- Add Content-Security-Policy header via middleware
- Set `default-src 'self'` as CSP baseline

## Security Headers

Required middleware headers for all API responses:

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (production only) |

## Sensitive Data Protection

- Set `$hidden` on models: `password`, `remember_token`, `api_secret`
- API Resources must explicitly whitelist returned fields
- Mask sensitive data in logs (card numbers, passwords, tokens)
- Never commit secrets to git; use `.env` locally, env vars in production

---

## OWASP Top 10 Checklist

| Vulnerability | Laravel Protection |
|--------------|-------------------|
| **Injection** | Eloquent ORM, parameterized queries |
| **Broken Auth** | Passport, rate limiting on auth |
| **Sensitive Data** | HTTPS, encrypted at rest, hidden fields |
| **XXE** | Disable external entities in XML parsing |
| **Broken Access Control** | Policies, gates, middleware |
| **Security Misconfig** | Debug off in production, security headers |
| **XSS** | Blade auto-escaping, CSP headers |
| **Insecure Deserialization** | Avoid unserialize() on user input |
| **Vulnerable Components** | Regular `composer audit` |
| **Insufficient Logging** | Laravel logging, failed auth tracking |

---

## Security Testing

### Automated Checks
```bash
composer audit                    # Dependency vulnerabilities
./vendor/bin/phpstan analyse      # Static analysis security rules
git secrets --scan                # Exposed credentials
```

### Manual Testing Points
- [ ] Authentication bypass attempts
- [ ] Authorization boundary testing
- [ ] Rate limit verification
- [ ] Input validation edge cases
- [ ] SQL injection probing
- [ ] XSS payload testing
- [ ] CORS misconfiguration
- [ ] Token expiration/refresh

---
