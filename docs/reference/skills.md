# Skill Index

Start with `/sdd-kit:sdd` in Claude plugin mode, `/sdd` in Claude file-copy mode, or `$sdd` in Codex. Skills share their source under `plugins/*/skills/`; the native Codex build packages first-party add-ons together and adds `sdd-runtime` for native workflow orchestration.

The Claude column uses file-copy shorthand. Plugin skills are namespaced by their source package, for example `/sdd-kit:write-spec`, `/sdd-kit-laravel:migrate-db` and `/sdd-kit-ops:deploy`. Codex uses the installed skill name, for example `$write-spec`, `$migrate-db` and `$deploy`.

**Invocation controls differ.** “Manual only” comes from Claude's `disable-model-invocation: true`; the Codex build maps it to `agents/openai.yaml` with `policy.allow_implicit_invocation: false`. “Auto only” describes Claude's `user-invocable: false`, which is not retained as a native Codex visibility restriction. The Codex column therefore lists the installed skill name for explicit use. A listed skill does not grant permission for its side effects; preserve its approval steps.

Workflow names such as `ship-feature` and `fix-bug` are not separate packaged Codex skills. Use `$sdd` or ask `$sdd-runtime` to run a named workflow with explicit arguments. Never mechanically turn every slash command into a dollar command: `/hooks`, `/workflows`, `/plugin` and `/clear` are host commands.

Source: [Codex packaging](../../adapters/codex/build.mjs), [native provider mapping](../../adapters/codex/skill-overlays/sdd-runtime/SKILL.md).

| Skill | Shared source package | Claude invocation | Codex invocation | Purpose |
|---|---|---|---|---|
| `accessibility` | core | `/accessibility` | `$accessibility` | Web accessibility (a11y) for component-based frontends. Use when building UI components, forms, navigation, or auditing pages against WCAG… |
| `api-design` | core | auto only | `$api-design` | RESTful API design patterns. Use for endpoints, response formats, pagination, and error handling. |
| `api-security` | core | auto only | `$api-security` | API security best practices. Use for auth, CORS, rate limiting, validation, and OWASP compliance. |
| `architecture-patterns` | core | auto only | `$architecture-patterns` | Implement Clean Architecture, Hexagonal Architecture, and DDD patterns. Use when designing new modules or refactoring for maintainability. |
| `changelog` | core | `/changelog` (manual only) | `$changelog` | Generate a changelog from git history by parsing conventional commits and grouping them into Keep a Changelog sections, optionally… |
| `ci-cd` | core | `/ci-cd` | `$ci-cd` | GitHub Actions CI/CD pipelines. Use for testing, deployment, and release automation workflows. |
| `deep-review` | core | `/deep-review` | `$deep-review` | Review finished code and return a blocking verdict (APPROVED / CHANGES_REQUIRED / BLOCKED). Three depths - adversarial (default; skeptical… |
| `design-api` | core | `/design-api` | `$design-api` | Design RESTful API architecture: resources, endpoints, request/response contracts, error format, and optional OpenAPI output, producing an… |
| `design-schema` | core | `/design-schema` | `$design-schema` | Design a database schema - entities, columns and types, relationships, indexes, naming, and migration strategy - and write it as… |
| `error-handling-patterns` | core | auto only | `$error-handling-patterns` | Robust error handling with typed exceptions, Result types, and graceful degradation. Use when designing error flows or improving resilience. |
| `execute-task` | core | `/execute-task` | `$execute-task` | Execute an approved spec's tasks one at a time with TDD, verification gates, AC-to-test traceability, and session state for cross-session… |
| `fix-ci` | core | `/fix-ci` | `$fix-ci` | Get a red CI run or a broken local build back to green without weakening any gate. Reads the failing job (gh pr checks / gh run view… |
| `framework-doctor` | core | `/framework-doctor` (manual only) | `$framework-doctor` | Diagnose a framework installation and report PASS / WARN / FAIL per check - directory layout, flat skill discovery, agents, manifest drift… |
| `generate` | core | `/generate` | `$generate` | Generate code scaffolding that follows project conventions - controllers, services, data objects, repositories, models, CRUD and API… |
| `grade` | core | `/grade` | `$grade` | Grade a target artifact against a domain rubric using the outcomes-grader subagent. Returns PASS / CHANGES_REQUIRED / BLOCKED with… |
| `investigate` | core | `/investigate` | `$investigate` | Research a technical problem or evaluate a technology inline — searches the codebase and framework docs, compares options in a pros/cons… |
| `learn` | core | `/learn` (manual only) | `$learn` | Fix the system, not the instance - turn one mistake into the cheapest durable guard so the whole class cannot recur. States the mistake… |
| `lint` | core | `/lint` | `$lint` | Run the code quality suite - the format, lint and type-check gates of the detected stack (taken from the stack manifest) - in check or… |
| `new-stack` | core | `/new-stack` (manual only) | `$new-stack` | Scaffold a new stack add-on (manifest, agent, conventions skill, lint hook) from the kit template, or stage a project-local stack. Use… |
| `observability` | core | `/observability` | `$observability` | Observability for web applications - structured logging, error tracking, metrics, and OpenTelemetry tracing. Use when adding… |
| `open-pr` | core | `/open-pr` (manual only) | `$open-pr` | Open spec-traced pull requests once a feature or fix is approved — one PR per changed repo, backend first, cross-linked. Checks the… |
| `product-brief` | core | `/product-brief` | `$product-brief` | Turn an idea, or a pile of "what if" / "users say" input, into a product brief (problem, users and roles, MVP scope, non-goals, numbered… |
| `progress` | core | `/progress` | `$progress` | Where-was-I dashboard over .ai/specs - per-spec task completion from tasks.md, status and priority from spec-lite frontmatter, the… |
| `run-tests` | core | `/run-tests` | `$run-tests` | Run the test suites of the detected stack - the test gates from the stack manifest, with filtering by name or module, coverage and… |
| `schema-first` | core | auto only | `$schema-first` | Document schemas before migrations. Use when designing databases or planning data models. |
| `sdd` | core | `/sdd` | `$sdd` | The single front door for spec-driven work. Classifies a ticket or request (bug / feature / decision / shipped code / new project /… |
| `security-scan` | core | `/security-scan` | `$security-scan` | Run security checks — dependency vulnerability audits (the manifest's audit commands), code scans for SQL injection, XSS, CSRF gaps,… |
| `simple-task` | core | `/simple-task` | `$simple-task` | Execute a small-to-medium task (bug fix, small feature, refactor, safe symbol rename, or research-only question) in a single context… |
| `source-verification` | core | auto only | `$source-verification` | Rules for verifying claims against the actual code before stating or changing anything — read referenced files, cite file:line, never… |
| `spec-board` | core | `/spec-board` | `$spec-board` | Visual Kanban board of the specs under .ai/specs - columns by status (draft, approved, in-progress, done) plus a Backlog column of… |
| `stack-trust` | core | `/stack-trust` (manual only) | `$stack-trust` | Review and approve overlay stack manifests (project .claude/stacks, user stacks directory, third-party plugin stack.json) before their… |
| `sync-obsidian` | core | `/sync-obsidian` (manual only) | `$sync-obsidian` | Sync human-verified project knowledge - specs, review output, a spec-board status note, and architecture/context docs - into an Obsidian… |
| `upgrade-deps` | core | `/upgrade-deps` (manual only) | `$upgrade-deps` | Audit and upgrade dependencies (any package manager the stack uses) safely — report outdated/vulnerable packages, bump in tiers (patch →… |
| `verification-gates` | core | auto only | `$verification-gates` | Standard post-implementation quality gates (format, lint, types, tests, coverage, build, browser journeys, accessibility, contract sync)… |
| `write-docs` | core | `/write-docs` | `$write-docs` | Generate documentation from code (business rules, API contracts, architecture overview), import external docs into the context paths… |
| `write-spec` | core | `/write-spec` | `$write-spec` | Turn a ticket or request into a right-sized, execution-ready spec under .ai/specs/ — sizes the work first (XS gets no spec), investigates… |
| `design-ui` | design plugin | `/design-ui` | `$design-ui` | Design UI/UX for a feature: user flows, component hierarchy, state management, data fetching, and accessibility, producing a UI design… |
| `ddev` | devenv plugin | `/ddev` | `$ddev` | DDEV local development environment. Use for container management, debugging, and Laravel/Next.js development. |
| `docker` | devenv plugin | `/docker` | `$docker` | Docker for Laravel + Next.js. Use for Dockerfiles, compose setup, and container configuration. |
| `drupal-11` | drupal plugin | `/drupal-11` | `$drupal-11` | Drupal 11 module development patterns. Use for entities, services, plugins, hooks, and backend architecture decisions. |
| `ios-native` | ios plugin | `/ios-native` | `$ios-native` | Native iOS development with Swift 6 and SwiftUI. Use for views, @Observable view models, structured concurrency, URLSession networking,… |
| `swift-testing` | ios plugin | `/swift-testing` | `$swift-testing` | Testing iOS/Swift code with the Swift Testing framework (@Test / #expect) and XCTest. Use when writing unit tests for view models,… |
| `dto-first` | laravel plugin | auto only | `$dto-first` | DTO patterns with Spatie Laravel Data. Use for request/response data handling and layer boundaries. |
| `event-driven` | laravel plugin | auto only | `$event-driven` | Event-driven architecture in Laravel. Use for events, listeners, and async processing patterns. |
| `laravel-12` | laravel plugin | `/laravel-12` | `$laravel-12` | Laravel 12 API patterns. Use for services, models, controllers, and backend architecture decisions. |
| `laravel-migration-coordinator` | laravel plugin | `/laravel-migration-coordinator` | `$laravel-migration-coordinator` | Plan, write, and verify safe Laravel migrations. Use when adding/altering DB schema, splitting NOT-NULL backfills, fixing foreign-key… |
| `migrate-db` | laravel plugin | `/migrate-db` (manual only) | `$migrate-db` | Create, modify, roll back, and inspect Laravel database migrations schema-first — update the schema doc in docs/schemas/ before generating… |
| `oauth2-passport` | laravel plugin | auto only | `$oauth2-passport` | Laravel Passport OAuth2 patterns. Use for token auth, scopes, PKCE, and API authentication. |
| `pest-3` | laravel plugin | auto only | `$pest-3` | Pest PHP 3.x testing patterns. Use for writing tests, expectations, and test architecture. |
| `service-repository` | laravel plugin | auto only | `$service-repository` | Service-Repository architecture pattern. Use for business logic, layer separation, and data access. |
| `nextjs-15` | nextjs plugin | `/nextjs-15` | `$nextjs-15` | Next.js 15 App Router patterns. Use for pages, components, server actions, and frontend architecture. |
| `nextjs-auth` | nextjs plugin | auto only | `$nextjs-auth` | Next.js auth patterns for a separate API backend (token proxy, HttpOnly cookies). Use for token flow, middleware, and protected routes. |
| `nextjs-performance-profiler` | nextjs plugin | `/nextjs-performance-profiler` | `$nextjs-performance-profiler` | Profile and optimize Next.js 15 App Router apps for Core Web Vitals (LCP/INP/CLS), bundle size, server-component balance, and image/font… |
| `nextjs-testing` | nextjs plugin | auto only | `$nextjs-testing` | Testing patterns for the Next.js 15 frontend of an API-backed app - Vitest with React Testing Library component tests, MSW mocks built… |
| `tailwind-4` | nextjs plugin | auto only | `$tailwind-4` | Tailwind CSS v4 patterns. Use for styling, layouts, responsive design, and dark mode. |
| `typescript` | nextjs plugin | auto only | `$typescript` | TypeScript patterns for full-stack apps. Use for type definitions, API clients, and Zod validation. |
| `deploy` | ops plugin | `/deploy` (manual only) | `$deploy` | Deploy the application to staging or production with pre-deploy gates (tests, lint, build), confirmation for production, and post-deploy… |
| `feature-flag` | ops plugin | `/feature-flag` (manual only) | `$feature-flag` | Create, list, enable, disable, roll out, and clean up feature flags (boolean, percentage, user-targeted) with config, env, and… |
| `health-check` | ops plugin | `/health-check` | `$health-check` | Verify system health across the app, database, cache, queues, disk, and external services, and report a pass/warn/fail summary. Use when… |
| `incident` | ops plugin | `/incident` | `$incident` | Run an incident response workflow: open an incident record, triage by severity, investigate logs and recent deploys, mitigate, resolve,… |
| `rollback` | ops plugin | `/rollback` (manual only) | `$rollback` | Roll back a deployment safely: capture current state, identify the known-good target, revert code and migrations under maintenance mode,… |

Codex-only runtime entry: `$sdd-runtime` drives the six shared workflows, stack discovery and native delegation. See [Codex installation and recovery](../hosts/codex.md).
