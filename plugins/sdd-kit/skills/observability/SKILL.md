---
name: observability
description: Observability for Laravel API + Next.js — structured logging, error tracking (Sentry), metrics, and OpenTelemetry tracing. Use when adding logging/monitoring, instrumenting requests, debugging production issues, or wiring alerting.
license: Apache-2.0
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Observability

Three pillars: **logs** (what happened), **metrics** (how much/how often), **traces** (where time went across services). For a Laravel API + Next.js front end, instrument the request path end-to-end with a shared correlation id.

## Structured logging (Laravel)

```php
// config/logging.php — JSON to stdout in production (container-friendly)
'stderr' => [
    'driver' => 'monolog',
    'handler' => StreamHandler::class,
    'formatter' => Monolog\Formatter\JsonFormatter::class,
    'with' => ['stream' => 'php://stderr'],
],
```

- Log events, not strings: `Log::info('order.placed', ['order_id' => $id, 'total' => $total])`.
- Never log secrets/PII (tokens, passwords, full card numbers). Redact in a Monolog processor.
- Attach a request id to every line: middleware sets `Log::withContext(['request_id' => $id])`.

## Error tracking (Sentry)

```bash
composer require sentry/sentry-laravel      # API
npm i @sentry/nextjs                         # frontend
```

- Set `traces_sample_rate` low in prod (e.g. 0.1–0.2) to control cost.
- Propagate the `sentry-trace` / `traceparent` header from Next.js → Laravel so a frontend error links to the backend span.
- Scrub PII: enable `send_default_pii => false`, add `before_send` filters.

## Tracing (OpenTelemetry)

- Backend: `open-telemetry/opentelemetry-php` auto-instruments HTTP, DB, queue. Export OTLP to a collector (Tempo/Jaeger/Honeycomb).
- Frontend: `@vercel/otel` (Next.js) — register in `instrumentation.ts`.
- The correlation id (W3C `traceparent`) is what stitches a click in the browser to a query in MySQL. Without it, traces fragment.

## Metrics & SLOs

- Expose `/metrics` (Prometheus) or push to a hosted backend. Key signals (RED): **R**ate, **E**rrors, **D**uration per endpoint.
- Define SLOs (e.g. p95 latency < 300ms, error rate < 1%) and alert on burn rate, not raw spikes.

## Cost discipline

Telemetry volume = bill. Sample traces, drop healthy-path debug logs in prod, set retention. Log at `info`+ in prod, `debug` only behind a flag.

## When to load references

| Task | Load |
|------|------|
| Request-id propagation Next.js → Laravel → jobs, Sentry in both apps, health endpoint, failed-job alerts | `references/request-correlation.md` |
| OTel collector config | vendor docs (Tempo/Jaeger/Honeycomb) |
| Sentry release/source-map upload | `@sentry/nextjs` + sentry-laravel docs |
