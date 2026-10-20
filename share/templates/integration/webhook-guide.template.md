# {{Service Name}} Webhook Integration Guide

> **🔒 SECURITY CRITICAL: Real-time event notifications with HMAC signature verification**

Webhooks provide server-to-server notifications when events occur (payments, status changes, etc.). Unlike polling, webhooks deliver updates instantly.

**Estimated Time**: 1-2 hours | **Difficulty**: Intermediate | **Security**: Critical

---

## Why Webhooks Are Critical

### Without Webhooks ❌
- Poll status every N seconds → API rate limits
- Delayed processing → poor user experience
- Missed events → no retry mechanism
- Cannot detect user-initiated actions

### With Webhooks ✅
- Real-time notifications (<200ms typically)
- Immediate action on events
- Automatic retry with exponential backoff
- Complete event history

**⚠️ Production Requirement**: Webhooks are **MANDATORY** for production. Never rely solely on redirect URLs.

---

## Quick Start

### 1. Create Webhook Endpoint

```php
// routes/api.php (Laravel)
Route::post('/webhooks/{{service}}', [WebhookController::class, 'handle']);
```

### 2. Verify Signature (CRITICAL)

```php
$signature = $request->header('X-{{Service}}-Signature');
$payload = $request->getContent();
$secret = config('services.{{service}}.webhook_secret');

if (!hash_equals(hash_hmac('sha256', $payload, $secret), $signature)) {
    return response('Invalid signature', 401);
}
```

### 3. Handle Events

```php
$event = json_decode($payload, true);

switch ($event['type']) {
    case '{{event_type}}.succeeded':
        // Handle success
        break;
    case '{{event_type}}.failed':
        // Handle failure
        break;
}

return response('OK', 200); // ALWAYS return 200
```

---

## Webhook Events Reference

### {{Domain 1}} Events

| Event Type | Description | When Triggered |
|------------|-------------|----------------|
| `{{event}}.created` | {{Entity}} created | API call to create |
| `{{event}}.succeeded` | Operation completed | Successful completion |
| `{{event}}.failed` | Operation failed | Error during processing |
| `{{event}}.canceled` | Operation canceled | User or system cancels |

### {{Domain 2}} Events

| Event Type | Description | When Triggered |
|------------|-------------|----------------|
| `{{event}}.completed` | {{Action}} completed | Successful {{action}} |
| `{{event}}.failed` | {{Action}} failed | Error during {{action}} |

---

## Webhook Payload Structure

### Standard Envelope

```json
{
  "id": "evt_{{uuid}}",
  "type": "{{event_type}}.succeeded",
  "created_at": "2025-01-15T10:30:00Z",
  "data": {
    // Event-specific data
  },
  "api_version": "2025-01",
  "livemode": false
}
```

### Example: {{Event Type}} Succeeded

```json
{
  "id": "evt_abc123xyz",
  "type": "{{event_type}}.succeeded",
  "created_at": "2025-01-15T10:30:15Z",
  "data": {
    "id": "{{prefix}}_abc123...",
    "amount": 10000,
    "status": "succeeded",
    "description": "{{Description}}",
    "metadata": {
      "order_id": "1234",
      "customer_email": "user@example.com"
    },
    "created_at": "2025-01-15T10:29:00Z",
    "completed_at": "2025-01-15T10:30:15Z"
  },
  "api_version": "2025-01",
  "livemode": false
}
```

---

## Implementation Guide

### Step 1: Create Webhook Controller

```php
<?php
declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use Illuminate\Http\Request;
use Illuminate\Http\Response;

class {{Service}}WebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        // 1. Verify signature
        if (!$this->verifySignature($request)) {
            return response('Invalid signature', 401);
        }

        // 2. Parse event
        $event = json_decode($request->getContent(), true);

        // 3. Check idempotency (prevent duplicate processing)
        if ($this->isEventProcessed($event['id'])) {
            return response('Already processed', 200);
        }

        // 4. Dispatch to handler
        $this->dispatchEvent($event);

        // 5. Mark as processed
        $this->markEventProcessed($event['id']);

        return response('OK', 200);
    }

    private function verifySignature(Request $request): bool
    {
        $signature = $request->header('X-{{Service}}-Signature');
        $payload = $request->getContent();
        $secret = config('services.{{service}}.webhook_secret');

        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        return hash_equals($expectedSignature, $signature);
    }

    private function dispatchEvent(array $event): void
    {
        match($event['type']) {
            '{{event}}.succeeded' => dispatch(new Handle{{Event}}Succeeded($event['data'])),
            '{{event}}.failed' => dispatch(new Handle{{Event}}Failed($event['data'])),
            default => logger()->info('Unhandled webhook event', ['type' => $event['type']]),
        };
    }
}
```

### Step 2: Create Event Handler Job

```php
<?php
declare(strict_types=1);

namespace App\Jobs\Webhooks;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class Handle{{Event}}Succeeded implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        private array $eventData
    ) {}

    public function handle(): void
    {
        // Process the event
        $entity = {{Entity}}::find($this->eventData['id']);

        if (!$entity) {
            logger()->error('Entity not found for webhook', $this->eventData);
            return;
        }

        // Update status
        $entity->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        // Trigger any follow-up actions
        event(new {{Entity}}Completed($entity));
    }

    public function failed(\Throwable $exception): void
    {
        logger()->error('Webhook processing failed', [
            'event_data' => $this->eventData,
            'error' => $exception->getMessage(),
        ]);
    }
}
```

---

## Security Best Practices

### 1. Always Verify Signatures

```php
// Use timing-safe comparison
hash_equals($expected, $provided);

// Never use regular comparison
// $expected === $provided // WRONG - timing attack vulnerable
```

### 2. Use HTTPS Only

```php
// Verify request is HTTPS in production
if (app()->isProduction() && !$request->secure()) {
    return response('HTTPS required', 426);
}
```

### 3. Implement Idempotency

```php
// Store processed event IDs
Schema::create('processed_webhooks', function (Blueprint $table) {
    $table->string('event_id')->primary();
    $table->timestamp('processed_at');
    $table->index('processed_at'); // For cleanup
});
```

### 4. Validate Payload

```php
// Validate expected structure
$validator = Validator::make($event, [
    'id' => 'required|string',
    'type' => 'required|string',
    'data' => 'required|array',
]);

if ($validator->fails()) {
    return response('Invalid payload', 400);
}
```

### 5. Return 200 Quickly

```php
// Process asynchronously to respond quickly
dispatch(new ProcessWebhook($event));

return response('OK', 200);
```

---

## Retry Strategy

### Webhook Delivery Retry Schedule

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 5 minutes |
| 3 | 30 minutes |
| 4 | 2 hours |
| 5 | 24 hours |

### Your Endpoint Should

1. Return 200-299 for success
2. Return 4xx for permanent failures (no retry)
3. Return 5xx for temporary failures (will retry)

---

## Testing Webhooks

### Local Development

```bash
# Use ngrok to expose local endpoint
ngrok http 8000

# Configure webhook URL
https://abc123.ngrok.io/webhooks/{{service}}
```

### Test Payload

```bash
curl -X POST https://your-domain.com/webhooks/{{service}} \
  -H "Content-Type: application/json" \
  -H "X-{{Service}}-Signature: $(echo -n '{"test":true}' | openssl dgst -sha256 -hmac 'your_secret')" \
  -d '{"id":"evt_test","type":"{{event}}.succeeded","data":{}}'
```

### Automated Tests

```php
it('processes webhook successfully', function () {
    $payload = ['id' => 'evt_123', 'type' => '{{event}}.succeeded', 'data' => []];
    $signature = hash_hmac('sha256', json_encode($payload), config('services.{{service}}.webhook_secret'));

    $response = $this->postJson('/webhooks/{{service}}', $payload, [
        'X-{{Service}}-Signature' => $signature,
    ]);

    $response->assertStatus(200);
});

it('rejects invalid signature', function () {
    $response = $this->postJson('/webhooks/{{service}}', [], [
        'X-{{Service}}-Signature' => 'invalid',
    ]);

    $response->assertStatus(401);
});
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 errors | Invalid signature | Verify secret matches |
| Missed events | Endpoint down | Implement retry handling |
| Duplicate processing | No idempotency | Store processed event IDs |
| Timeout | Slow processing | Use background jobs |

### Debug Checklist

- [ ] Signature verification uses correct secret
- [ ] Endpoint accessible from public internet
- [ ] Response returns within 5 seconds
- [ ] Event IDs stored to prevent duplicates
- [ ] Error logging enabled

---

## Monitoring

### Key Metrics

```
Webhook Metrics to Track:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Delivery success rate: Target >99%
- Processing time: Target <5s P95
- Signature failures: Alert if >0 in production
- Retry rate: Alert if >5%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

*Last Updated: {{Date}}*
*Version: 1.0*
