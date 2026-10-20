---
name: api-design
description: RESTful API design patterns. Use for endpoints, response formats, pagination, and error handling.
user-invocable: false
allowed-tools: Read, Grep, Glob, Edit, Write
---

# RESTful API Design Patterns

Patterns for designing consistent, developer-friendly REST APIs in Laravel + Next.js applications.

## When to Use This Skill

- Designing new REST APIs or endpoints
- Establishing API design standards
- Reviewing API specifications before implementation
- Creating developer-friendly API documentation
- Optimizing APIs for frontend consumption

## Quick Reference

| Task | Pattern |
|------|---------|
| List resources | `GET /resources` with pagination |
| Get single resource | `GET /resources/{id}` |
| Create resource | `POST /resources` with body |
| Update resource | `PATCH /resources/{id}` partial |
| Replace resource | `PUT /resources/{id}` full |
| Delete resource | `DELETE /resources/{id}` |
| Nested resources | `GET /users/{id}/orders` |
| Filter resources | `GET /resources?status=active` |

## When to Load References

| Task | Load |
|------|------|
| API documentation (OpenAPI/Scribe) | `references/api-documentation.md` |
| Cursor-based pagination | `references/advanced-patterns.md` |
| TypeScript API client | `references/typescript-client.md` |

---

## URL Structure

### Resource Naming
```
# Collection resources (plural nouns)
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/{id}
PUT    /api/v1/users/{id}
PATCH  /api/v1/users/{id}
DELETE /api/v1/users/{id}

# Nested resources
GET    /api/v1/users/{user_id}/orders
POST   /api/v1/users/{user_id}/orders

# Actions (when CRUD doesn't fit)
POST   /api/v1/orders/{id}/cancel
POST   /api/v1/users/{id}/verify-email
```

### Versioning
```
# URL path versioning (recommended)
/api/v1/users
/api/v2/users
```

---

## HTTP Methods

| Method | Purpose | Idempotent | Safe | Request Body |
|--------|---------|------------|------|--------------|
| GET | Retrieve resource(s) | Yes | Yes | No |
| POST | Create resource | No | No | Yes |
| PUT | Replace resource | Yes | No | Yes |
| PATCH | Partial update | Yes | No | Yes |
| DELETE | Remove resource | Yes | No | Optional |

### Laravel Routes
```php
Route::prefix('v1')->group(function () {
    Route::get('/users', ListUsersController::class);
    Route::post('/users', CreateUserController::class);
    Route::get('/users/{user}', ShowUserController::class);
    Route::patch('/users/{user}', UpdateUserController::class);
    Route::delete('/users/{user}', DeleteUserController::class);

    Route::get('/users/{user}/orders', ListUserOrdersController::class);
});
```

---

## Response Format

### Standard Response Structure
```json
{
  "success": true,
  "status": 200,
  "message": "Users retrieved successfully",
  "data": {}
}
```

### JsonResponseTrait
```php
trait JsonResponseTrait
{
    protected function success(mixed $data, string $message = 'Success', int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'status' => $status,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    protected function error(string $message, int $status = 400, ?array $errors = null): JsonResponse
    {
        $response = [
            'success' => false,
            'status' => $status,
            'message' => $message,
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $status);
    }

    protected function paginated(LengthAwarePaginator $paginator, string $message = 'Success'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'status' => 200,
            'message' => $message,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
        ]);
    }
}
```

### Error Response
```json
{
  "success": false,
  "status": 422,
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

---

## Status Codes

### Success Codes
| Code | Name | Use Case |
|------|------|----------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST (include Location header) |
| 204 | No Content | Successful DELETE with no body |

### Client Error Codes
| Code | Name | Use Case |
|------|------|----------|
| 400 | Bad Request | Malformed request syntax |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Business rule violation |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |

---

## Filtering & Sorting

### Query Parameters
```
GET /api/v1/users?status=active
GET /api/v1/users?sort=-created_at
GET /api/v1/users?page=2&per_page=25
GET /api/v1/users?include=profile,orders
GET /api/v1/users?search=john
```

### Laravel Implementation
```php
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;

class UserIndexController
{
    public function __invoke(Request $request): JsonResponse
    {
        $users = QueryBuilder::for(User::class)
            ->allowedFilters([
                'status',
                'role',
                AllowedFilter::scope('search'),
                AllowedFilter::exact('email'),
            ])
            ->allowedSorts(['name', 'email', 'created_at'])
            ->allowedIncludes(['profile', 'orders'])
            ->defaultSort('-created_at')
            ->paginate($request->get('per_page', 15));

        return $this->paginated($users, 'Users retrieved successfully');
    }
}
```

---

## Rate Limiting

```php
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});

RateLimiter::for('auth', function (Request $request) {
    return [
        Limit::perMinute(5)->by($request->ip()),
        Limit::perDay(100)->by($request->ip()),
    ];
});
```

---

## Best Practices

### Do's
- Use plural nouns for resources (`/users`, not `/user`)
- Use kebab-case for multi-word (`/user-profiles`)
- Version your API from day one
- Use consistent response structures (JsonResponseTrait)
- Include timestamps in ISO 8601 format
- Use UUIDs, not auto-increment IDs in URLs

### Don'ts
- Don't use verbs in URLs (`/getUsers` → `GET /users`)
- Don't return arrays at root level
- Don't ignore rate limiting
- Don't return stack traces in production
- Don't use POST for everything
- Don't break changes without versioning

## Common Pitfalls

- **Inconsistent plurality**: Mixing `/user` and `/orders` → Pick one convention
- **Ignoring HTTP status**: Returning 200 for errors → Use appropriate status codes
- **No pagination**: Returning all records → Always paginate collections
- **Missing validation errors**: Generic "Bad request" → Return field-level errors
- **Exposing internal IDs**: Sequential IDs leak info → Use UUIDs

---

## Related Skills

- **dto-first**: Data transfer objects for API payloads
- **error-handling-patterns**: Structured error responses
- **oauth2-passport**: OAuth2 API authentication

---