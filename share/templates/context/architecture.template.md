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
├── Application/Http/Controllers/     # Request handlers
├── Domain/
│   ├── Models/                       # ORM models
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

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

---

## DTO Pattern

### Entity DTO

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

### Create DTO

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

---

## Service Pattern

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

---

## Repository Pattern

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

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

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

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

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

---

## Testing Standards

### Feature Test Pattern

<!-- Code example in the project's language; the stack add-on's skill has samples. -->

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
