# {{Project Name}} Architecture - Quick Reference

*Essential technical patterns for development*

---

## Foundational Principles

### {{Principle 1}}
**CRITICAL**: {{Description of principle}}
- ✅ **ALWAYS** {{what to do}}
- ❌ **NEVER** {{what not to do}}

### {{Principle 2}}
**CRITICAL**: {{Description of principle}}
- ✅ **ALWAYS** {{what to do}}
- ❌ **NEVER** {{what not to do}}

---

## Module Structure

```
Modules/{{Domain}}/{{SubModule}}/
├── Application/Http/Controllers/     # Controllers (invokable)
├── Domain/
│   ├── Models/                       # Eloquent models
│   ├── Services/                     # Business logic
│   ├── Repositories/                 # Data access
│   ├── DataTransferObjects/          # DTOs
│   ├── Enums/                        # Type-safe enums
│   └── Policies/                     # Authorization
├── Infrastructure/
│   ├── Database/Migrations/          # Database changes
│   ├── Repositories/                 # Repository implementations
│   └── Routes/                       # Route definitions
└── Tests/                            # Feature & Unit tests
```

---

## Controller Pattern

### Invokable Controllers (MANDATORY)

```php
<?php
declare(strict_types=1);

final class Create{{Entity}}Controller extends ApiBaseController
{
    public function __construct(
        private readonly {{Entity}}Service $service
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        // 1. Authorization
        $this->authorize('create', {{Entity}}::class);

        // 2. DTO validation
        $dto = Create{{Entity}}DTO::validateAndCreate($request->all());

        // 3. Service call
        $result = $this->service->create($dto);

        // 4. Response
        return $this->resource(
            new {{Entity}}Resource($result),
            '{{Entity}} created successfully',
            Response::HTTP_CREATED
        );
    }
}
```

---

## DTO Pattern

### Entity DTO

```php
class {{Entity}}DTO extends Data
{
    public function __construct(
        #[Required, Uuid]
        public readonly string $id,

        #[Required]
        public readonly string $name,

        public readonly ?string $description,

        public readonly Carbon $created_at,
        public readonly Carbon $updated_at,
    ) {}

    public static function from({{Entity}} $model): self
    {
        return new self(
            id: $model->id,
            name: $model->name,
            description: $model->description,
            created_at: $model->created_at,
            updated_at: $model->updated_at,
        );
    }
}
```

### Create DTO

```php
class Create{{Entity}}DTO extends Data
{
    public function __construct(
        #[Required, StringType, Max(255)]
        public readonly string $name,

        #[StringType, Max(1000)]
        public readonly ?string $description = null,
    ) {}

    public function toModelArray(): array
    {
        return [
            'name' => $this->name,
            'description' => $this->description,
        ];
    }
}
```

---

## Service Pattern

```php
class {{Entity}}Service
{
    public function __construct(
        private readonly {{Entity}}RepositoryInterface $repository
    ) {}

    public function create(Create{{Entity}}DTO $dto): {{Entity}}DTO
    {
        // Business logic validation
        $this->validateBusinessRules($dto);

        // Repository call
        $entityDTO = $this->repository->createFromDTO($dto);

        // Domain events (use DTOs, not models)
        event(new {{Entity}}CreatedEvent($entityDTO, auth()->id()));

        return $entityDTO;
    }
}
```

---

## Repository Pattern

```php
interface {{Entity}}RepositoryInterface
{
    public function findByIdAsDTO(string $id): ?{{Entity}}DTO;
    public function createFromDTO(Create{{Entity}}DTO $dto): {{Entity}}DTO;
    public function updateFromDTO(string $id, Update{{Entity}}DTO $dto): {{Entity}}DTO;
    public function findModelById(string $id): ?{{Entity}};
}

class Eloquent{{Entity}}Repository implements {{Entity}}RepositoryInterface
{
    public function createFromDTO(Create{{Entity}}DTO $dto): {{Entity}}DTO
    {
        $model = {{Entity}}::create($dto->toModelArray());
        return {{Entity}}DTO::from($model);
    }
}
```

---

## API Response Format

### Standard Response

```json
{
    "success": true,
    "status": 200,
    "message": "Operation completed successfully",
    "data": {}
}
```

### Response Methods

```php
// Single resource
return $this->resource($resource, 'Message', Response::HTTP_OK);

// Collection
return $this->resourceCollection($collection, 'Message', Response::HTTP_OK);

// Simple success
return $this->success($data, 'Message', Response::HTTP_OK);

// Error
return $this->error('Error message', Response::HTTP_BAD_REQUEST);
```

---

## Database Standards

### Naming Conventions

| Object | Convention | Example |
|--------|------------|---------|
| Tables | snake_case, plural | `users`, `payment_intents` |
| Columns | snake_case | `user_id`, `created_at` |
| Primary Keys | `id` (UUID) | `uuid` type |
| Foreign Keys | `{table}_id` | `user_id`, `merchant_id` |

### Model Standard

```php
class {{Entity}} extends Model
{
    use HasUuids, SoftDeletes, HasFactory;

    protected $table = '{{table_name}}';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name',
        'description',
        'status',
    ];

    protected $casts = [
        'status' => {{Entity}}StatusEnum::class,
        'metadata' => 'array',
    ];
}
```

---

## Testing Standards

### Feature Test Pattern

```php
describe('{{Entity}} API', function () {
    it('creates {{entity}} successfully', function () {
        $user = User::factory()->create();

        $dto = new Create{{Entity}}DTO(
            name: 'Test Name',
            description: 'Test Description'
        );

        $response = $this->actingAs($user, 'api')
            ->postJson('/api/v1/{{entities}}', $dto->toArray());

        $response->assertStatus(Response::HTTP_CREATED)
            ->assertJsonStructure([
                'success',
                'status',
                'message',
                'data' => ['id', 'name', 'created_at']
            ]);

        expect({{Entity}}::count())->toBe(1);
    });

    it('requires authentication', function () {
        $response = $this->postJson('/api/v1/{{entities}}', []);
        $response->assertStatus(Response::HTTP_UNAUTHORIZED);
    });
});
```

---

## Daily Checklist

### Before Starting
- [ ] Load Golden Triangle context
- [ ] Review relevant schema docs

### During Development
- [ ] Use DTOs for all data handling
- [ ] Follow service-repository pattern
- [ ] Add authorization policies
- [ ] Write tests first (TDD)

### Before Commit
- [ ] Run code style check
- [ ] Run static analysis
- [ ] Run tests
- [ ] Update documentation

---

**⚡ Remember**: Every violation of these patterns is a blocking issue that must be fixed before merge!

---

*Last Updated: {{Date}}*
*Version: 1.0*
