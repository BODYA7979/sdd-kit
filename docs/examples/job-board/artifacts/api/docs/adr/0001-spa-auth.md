# ADR-0001: SPA auth between the Next.js frontend and the Laravel API

- **Status:** Accepted
- **Date:** 2026-10-20
- **Deciders:** Maya Chen (product owner), Alex Rivera (developer)
- **Ticket:** HIRE-2
- **Recorded as:** INV-05 in the workspace `CLAUDE.md`, `api/CLAUDE.md` and `web/CLAUDE.md`

## Context

Hireboard is a Laravel 12 JSON API (`api/`, served on `http://localhost:8000` in development) and a
Next.js 15 App Router frontend (`web/`, `http://localhost:3000`). They are separate repositories and
will be deployed as separate services. The first slice (HIRE-1) is public and unauthenticated. HIRE-3
adds candidate and employer accounts, and every later feature (reviews, profiles, applications,
moderation) depends on knowing who the caller is and which role they have.

Constraints from the existing code:

- `php artisan install:api` already installed Laravel Sanctum 4 and the `personal_access_tokens`
  migration. No other auth package is present.
- The frontend already sends every backend call from the server through `lib/api/client.ts`, which
  imports `server-only` and reads `API_BASE_URL` (not a `NEXT_PUBLIC_` variable). The browser never
  calls the API directly.
- Pages are Server Components. Mutations are Server Actions.
- Feature tests use Pest 3. The team wants to authenticate in tests with `Sanctum::actingAs()` and no
  browser.
- The team is two people. Production hostnames are not chosen yet.

## Decision Drivers

| # | Criterion | Weight |
|---|-----------|--------|
| C1 | No token readable by browser JavaScript | must |
| C2 | Works with web on :3000 and api on :8000 locally, and on separate hosts in production | must |
| C3 | Fewest moving parts for a two-person team | should |
| C4 | Testable in Pest without a browser (`Sanctum::actingAs`) | should |
| C5 | Reusable later by a mobile client | nice |

## Options Considered

### A. Sanctum SPA cookie auth (stateful session, CSRF cookie) — score 71

The browser calls the API directly. It first requests `/sanctum/csrf-cookie`, then logs in, and Laravel
keeps a session cookie for the API domain.

- **Pros:** the session cookie is HttpOnly (C1 met); built into Sanctum; `Sanctum::actingAs` works (C4).
- **Cons:** the SPA and API must share the same top-level domain, so "separate hosts" only works as
  subdomains of one domain (C2 partly met); needs `SANCTUM_STATEFUL_DOMAINS`, CORS with
  `supports_credentials`, and the CSRF cookie round trip (C3); Server Components run on the Next.js
  server and do not receive the browser's API-domain cookie, so authenticated server rendering would
  need cookie forwarding, which works against the existing `lib/api/client.ts`.
- **Fit:** Sanctum is installed. Conflicts with the server-only API client from HIRE-1.

### B. Sanctum personal access tokens held by the Next.js server in an HttpOnly cookie (BFF) — score 88

Login and registration run in Server Actions. The Next.js server receives a Sanctum personal access
token from the API and stores it in an HttpOnly cookie on the web origin. Every API call is made by the
Next.js server with `Authorization: Bearer <token>`.

- **Pros:** the token never reaches browser JavaScript (C1); the browser only talks to the web origin, so
  any API hostname works and no CORS is needed (C2); one package that is already installed, no CSRF
  cookie flow (C3); `Sanctum::actingAs` works unchanged (C4); the same token type serves a mobile
  client (C5).
- **Cons:** the Next.js server is in the path of every authenticated call; the app has to handle a
  revoked or expired token whose cookie still exists; token expiry has to be configured, because
  Sanctum tokens do not expire by default.
- **Fit:** matches the existing `lib/api/client.ts` (server-only, `API_BASE_URL`). Server Actions can set
  and delete cookies through `cookies()`.

### C. Laravel Passport OAuth2 with PKCE — score 44

- **Pros:** full OAuth2 server; the right tool if third parties ever need delegated access (C5).
- **Cons:** a browser PKCE client holds the access token in JavaScript, which fails C1 unless the
  frontend becomes a confidential client on its own server; replaces the Sanctum setup from
  `install:api`; adds clients, keys, scopes and an authorization flow the product does not need (C3).
- **Fit:** poor. Hireboard is a first-party app with no third-party clients.

### D. Auth.js credentials provider wrapping Sanctum tokens — score 62

- **Pros:** encrypted HttpOnly session cookie (C1); no CORS (C2); Sanctum tokens remain usable by a
  mobile client (C5).
- **Cons:** the credentials provider works only with JWT sessions, so the Sanctum token lives inside the
  Auth.js session and two lifetimes have to be kept in step; one more dependency and its configuration
  for a team of two (C3); it is option B plus a library.
- **Fit:** compatible, but adds a layer over what `lib/api/client.ts` already does.

## Decision

**Option B.** The Next.js server holds a Sanctum personal access token in the HttpOnly cookie
`hireboard_session`. The browser never sees the token and never calls the API directly.

It is the only option that meets both must criteria without conditions, and it reuses what HIRE-1
already put in place: Sanctum from `install:api` on the API side and the server-only API client on the
web side. Option A is the runner-up. It loses on C2 (shared top-level domain), on C3 (stateful domains,
credentialed CORS, CSRF round trip), and because authenticated Server Components would need cookie
forwarding.

## Consequences

**Positive**

- Tokens are named `web` and expire 7 days after they are issued. The expiry is set per token when it
  is created, and the cookie `maxAge` is also 7 days, so both end together.
- Logout deletes the current token on the API (`currentAccessToken()->delete()`) and clears the cookie
  on the web side.
- No CORS configuration in `api/`, because the browser only talks to the web origin.
- Every backend call goes through `web/lib/api/client.ts`, which adds the bearer token when one is
  present. No component calls `fetch` against the API directly.
- `Sanctum::actingAs()` covers authenticated Pest tests, and a mobile client can later use the same
  token endpoints.

**Negative**

- Every authenticated request is an extra hop through the Next.js server.
- HttpOnly prevents token theft through XSS. It does not stop injected script from acting through the
  user's session, so output escaping and input validation still matter.
- `middleware.ts` only checks that the cookie exists. A revoked or expired token still has a cookie, so
  pages must call `requireUser()`, which treats a 401 from `/api/v1/auth/me` as signed out and
  redirects to `/login`. The next login overwrites the stale cookie.
- Expired tokens stay in `personal_access_tokens` until pruned. Schedule
  `php artisan sanctum:prune-expired --hours=24` once the app has a scheduler.
- CSRF protection for mutations relies on Server Actions accepting only same-origin requests, plus
  `SameSite=Lax` on the cookie.

**Runner-up and why not:** Sanctum SPA cookie auth. Revisit it if the frontend ever needs to call the
API directly from client components and both services sit under one parent domain.

## Open Questions

- [x] Token lifetime and logout behavior: 7 days, logout revokes the current token only (Maya Chen,
  2026-10-20; recorded as BR-04).
- [ ] Refresh or sliding expiry is deferred. Users sign in again after 7 days. Revisit if support
  requests show it is a problem.
- [ ] Production hostnames are not chosen yet. The decision does not depend on them, but they set the
  `Secure` cookie domain.

## Sources

- Laravel 12 Sanctum, API token authentication and token expiration:
  https://laravel.com/docs/12.x/sanctum#api-token-authentication,
  https://laravel.com/docs/12.x/sanctum#token-expiration
- Laravel 12 Sanctum, SPA authentication (same top-level domain, stateful domains, CSRF cookie, CORS
  credentials): https://laravel.com/docs/12.x/sanctum#spa-authentication
- Laravel 12 Sanctum, testing with `Sanctum::actingAs`: https://laravel.com/docs/12.x/sanctum#testing
- Laravel 12 Passport (when to choose Passport over Sanctum): https://laravel.com/docs/12.x/passport
- Next.js `cookies()` (set and delete only in Server Actions or Route Handlers):
  https://nextjs.org/docs/app/api-reference/functions/cookies
- Next.js authentication guide (session management, cookie options):
  https://nextjs.org/docs/app/guides/authentication
- Next.js security of Server Actions (origin check):
  https://nextjs.org/blog/security-nextjs-server-components-actions
- Auth.js credentials provider (JWT sessions only):
  https://authjs.dev/getting-started/authentication/credentials
- OWASP HTML5 Security Cheat Sheet, local storage:
  https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage
- OWASP Session Management Cheat Sheet, cookie attributes:
  https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#cookies
