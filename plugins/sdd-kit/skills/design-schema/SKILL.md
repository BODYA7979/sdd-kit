---
name: design-schema
description: Design a database schema - entities, columns and types, relationships, indexes, naming, and migration strategy - and write it as docs/schemas/{table}.md in the schema-first format. Use when modelling new entities or relationships before writing migrations, planning a schema change, or reviewing an existing schema.
argument-hint: "[entity-name] | --entity=[name] | --migration"
allowed-tools: Read, Write, Edit, Grep, Glob
metadata:
  mcp-tools: context7
  version: 1.2
  subagents: "database-designer"
  last_verified: "2026-10-19"
  next_review: "2027-01-19"
---

# /design-schema

Design database schemas, relationships, and migration strategies. The output is one `docs/schemas/{table}.md` per table in the `schema-first` format, which the migration then implements. Delegate the design work to the `database-designer` agent for anything beyond a single table; implementation goes through `/migrate-db`.

## Usage

```bash
# Design schema for entity
/design-schema Order

# Design with relationships
/design-schema --entity=Order --relations

# Plan migration strategy
/design-schema --migration Order

# Review existing schema
/design-schema --review users
```

## Design Process

### Step 1: Entity Analysis
Identify attributes and data types:
```
Entity: Order
Attributes:
  - id (UUID, PK)
  - user_id (UUID, FK)
  - status (enum)
  - total_amount (integer, cents)
  - currency (string, 3 chars)
  - metadata (json, nullable)
  - created_at (timestamp)
  - updated_at (timestamp)
```

### Step 2: Relationship Mapping
```
Order
  ├── belongs_to User (user_id)
  ├── has_many OrderItems
  ├── has_one Payment
  └── morphMany AuditLogs
```

### Step 3: Migration Strategy
Decide how the change reaches the database, not the migration code: new table vs alter, the order of foreign keys, whether a NOT NULL column on an existing table needs a split backfill, and whether the change must be zero-downtime. The `laravel-migration-coordinator` skill has the rules; `/migrate-db` writes and runs the migration from the schema doc.

### Step 4: Model Design
```php
class Order extends Model
{
    use HasUuids, SoftDeletes, HasFactory;

    protected $fillable = [
        'user_id',
        'total_amount',
        'currency',
        'status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'status' => OrderStatusEnum::class,
            'metadata' => 'array',
            'total_amount' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
```

## Naming Conventions

| Object | Convention | Example |
|--------|------------|---------|
| Tables | snake_case, plural | `orders`, `order_items` |
| Columns | snake_case | `user_id`, `created_at` |
| Primary Keys | `id` (UUID) | `uuid` |
| Foreign Keys | `{table}_id` | `user_id`, `order_id` |
| Indexes | `idx_{table}_{cols}` | `idx_orders_user_status` |

## Data Types

| Use Case | MySQL | Laravel | Cast |
|----------|-------|---------|------|
| Primary Key | CHAR(36) | `uuid()->primary()` | string |
| Foreign Key | CHAR(36) | `foreignUuid()` | string |
| Money | BIGINT | `unsignedBigInteger()` | integer |
| Email | VARCHAR(255) | `string('email')` | string |
| Status | ENUM | `enum()` | Enum::class |
| JSON | JSON | `json()` | array |
| Timestamps | TIMESTAMP | `timestamps()` | datetime |

## Output: `docs/schemas/{table}.md`

Write one file per table at `docs/schemas/{table}.md`, using the `schema-first` structure exactly: **Purpose, Fields, Relationships, Indexes, Constraints, Enums, Notes**.

````markdown
# Schema: orders

## Purpose
Customer orders and their lifecycle from checkout to delivery.

## Fields

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | auto | Primary key |
| user_id | uuid | No | - | Customer who placed the order |
| total_amount | unsignedBigInteger | No | - | Order total in minor units (cents) |
| currency | char(3) | No | - | ISO 4217 code |
| status | enum | No | pending | See Enums |
| metadata | json | Yes | null | Extra data |
| created_at | timestamp | No | now() | Record creation time |
| updated_at | timestamp | No | now() | Record update time |
| deleted_at | timestamp | Yes | null | Soft delete timestamp |

## Relationships
- belongs_to: users (foreign_key: user_id, on delete: cascade)
- has_many: order_items (foreign_key: order_id)

## Indexes
- PRIMARY: id
- INDEX: (user_id, status, created_at) (purpose: a customer's orders by status, newest first)
- INDEX: (status, created_at) (purpose: back-office queue)

## Constraints
- total_amount: >= 0
- currency: ISO 4217, uppercase

## Enums
```php
enum OrderStatus: string {
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
}
```

## Notes
- Money is stored as integer minor units plus a currency column (schema-first money rule).
````

Then hand off: `/migrate-db --create=orders` writes and runs the migration from this file.

**Source verification**: follow the `source-verification` skill.

