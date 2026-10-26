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

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### 2. Verify Signature (CRITICAL)

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### 3. Handle Events

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

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

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### Step 2: Create Event Handler Job

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

---

## Security Best Practices

### 1. Always Verify Signatures

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### 2. Use HTTPS Only

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### 3. Implement Idempotency

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### 4. Validate Payload

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### 5. Return 200 Quickly

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

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

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

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
