---
name: error-handling-patterns
description: Robust error handling with typed exceptions, Result types, and graceful degradation. Use when designing error flows or improving resilience.
user-invocable: false
allowed-tools: Read, Grep, Glob
---

# Error Handling Patterns

Implement robust error handling with typed exceptions, Result types, and graceful degradation for Laravel + Next.js applications.

## When to Use This Skill

- Designing error handling strategies for new features
- Implementing API error responses
- Handling edge cases and boundary conditions
- Building resilient integrations with external services

## When to Load References

| Task | Load |
|------|------|
| Result type (no exceptions) | `references/result-type.md` |
| Retry with backoff | `references/retry-and-resilience.md` |
| Next.js error handling | `references/frontend-error-handling.md` |

---

## Core Concepts

### Error Categories

| Category | HTTP Status | Recovery | Example |
|----------|-------------|----------|---------|
| **Validation** | 422 | User fixes input | Missing required field |
| **Business Rule** | 409/422 | User changes action | Insufficient funds |
| **Not Found** | 404 | Check input | Resource doesn't exist |
| **Authorization** | 401/403 | Re-authenticate | Invalid token |
| **External Service** | 502/503 | Retry or fallback | Payment gateway down |
| **Internal** | 500 | Developer fixes bug | Null pointer |

### Fail Fast vs Graceful Degradation

**Fail Fast**: Stop immediately when something is wrong
- Use for: Data integrity, security violations

**Graceful Degradation**: Continue with reduced functionality
- Use for: Non-critical features, optional enhancements

---

## Patterns

### Pattern 1: Domain Exception Hierarchy

**Use when**: Modeling business rule violations

```php
namespace App\Exceptions\Domain;

abstract class DomainException extends \Exception
{
    abstract public function errorCode(): string;

    public function context(): array
    {
        return [];
    }
}

// Specific domain exception
final class InsufficientFundsException extends DomainException
{
    public function __construct(
        private readonly string $accountId,
        private readonly int $required,
        private readonly int $available,
    ) {
        parent::__construct("Insufficient funds in account {$accountId}");
    }

    public function errorCode(): string
    {
        return 'PAYMENT.INSUFFICIENT_FUNDS';
    }

    public function context(): array
    {
        return [
            'account_id' => $this->accountId,
            'required_cents' => $this->required,
            'available_cents' => $this->available,
            'shortfall_cents' => $this->required - $this->available,
        ];
    }
}
```

### Pattern 2: Exception Handler with Consistent Responses

**Use when**: All API errors need consistent format

```php
namespace App\Exceptions;

use App\Exceptions\Domain\DomainException;

class Handler extends ExceptionHandler
{
    public function render($request, \Throwable $e)
    {
        if ($request->expectsJson()) {
            return $this->renderJsonError($e);
        }
        return parent::render($request, $e);
    }

    private function renderJsonError(\Throwable $e): JsonResponse
    {
        return match (true) {
            $e instanceof ValidationException => $this->validationError($e),
            $e instanceof DomainException => $this->domainError($e),
            $e instanceof AuthenticationException => $this->authError($e),
            $e instanceof ModelNotFoundException => $this->notFoundError($e),
            default => $this->internalError($e),
        };
    }

    private function domainError(DomainException $e): JsonResponse
    {
        $status = match (true) {
            str_contains($e->errorCode(), 'NOT_FOUND') => 404,
            str_contains($e->errorCode(), 'ALREADY_') => 409,
            str_contains($e->errorCode(), 'UNAUTHORIZED') => 401,
            default => 422,
        };

        return response()->json([
            'success' => false,
            'status' => $status,
            'error_code' => $e->errorCode(),
            'message' => $e->getMessage(),
            'context' => $e->context(),
        ], $status);
    }

    private function internalError(\Throwable $e): JsonResponse
    {
        Log::error('Internal error', [
            'exception' => get_class($e),
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        $response = [
            'success' => false,
            'status' => 500,
            'error_code' => 'INTERNAL_ERROR',
            'message' => 'An unexpected error occurred.',
        ];

        if (config('app.debug')) {
            $response['debug'] = [
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ];
        }

        return response()->json($response, 500);
    }
}
```

---

## Best Practices

### Exception Design
1. **One exception per error case**: Don't reuse generic exceptions
2. **Include context**: Add relevant data for debugging
3. **Use error codes**: Machine-readable identifiers for client handling
4. **Hierarchical exceptions**: Allow catching at different granularities

### API Error Responses
1. **Consistent format**: Same structure for all errors
2. **Actionable messages**: Tell users what they can do
3. **Field-level validation**: Map errors to specific fields
4. **Safe in production**: Never expose stack traces or internal details

---

## Common Pitfalls

- **Catching too broadly**: `catch (Exception $e)` hides bugs → Catch specific exceptions
- **Swallowing errors**: Empty catch blocks → At minimum, log the error
- **Exposing internals**: Stack traces in production → Return safe messages only
- **Missing context**: "Error occurred" → Include what, where, why
- **Retry everything**: Retrying non-idempotent operations → Only retry safe operations

---

## Quick Reference

| Scenario | Pattern |
|----------|---------|
| Business rule violation | Domain exception |
| Expected failure case | Result type |
| Input validation | Laravel validation + 422 |
| External service failure | Retry with backoff |
| Internal bug | 500 + log + alert |

---

## Related Skills

- **api-design**: Error response design
- **architecture-patterns**: Exception hierarchy design
- **dto-first**: Error DTOs for consistent responses

---