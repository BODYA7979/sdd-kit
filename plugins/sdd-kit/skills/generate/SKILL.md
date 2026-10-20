---
name: generate
description: Generate code scaffolding that follows project conventions — invokable controllers, services, DTOs, repositories, models, CRUD and API resource sets, Next.js pages, components, hooks and route handlers, and test stubs — from the laravel-12 and nextjs-15 template assets. Use when starting a new component or entity and you want boilerplate that already matches the service-repository and DTO-first patterns instead of writing it by hand.
argument-hint: "[type] [name] | --crud=[entity] | --api=[resource] | --nextjs [page|component|hook|route] [name]"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
metadata:
  version: 1.3
  subagents: "laravel-backend-dev, nextjs-frontend-dev"
  last_verified: "2026-10-19"
  next_review: "2027-01-19"
---

# /generate

Generate scaffolding that matches the project's patterns. The templates live in one place, the framework skills' assets; this skill picks the right one, fills the placeholders, and adapts it to what the project already does.

## Usage

```bash
# Laravel components
/generate controller CreateUser
/generate service User
/generate dto CreateUser
/generate repository User
/generate model User

# CRUD scaffolding (model, migration, factory, DTOs, repository, service, controllers, resource, policy, tests)
/generate --crud=Order

# API resource set (controllers, resource, DTOs, routes)
/generate --api=Product

# Next.js
/generate --nextjs page Dashboard
/generate --nextjs component ProductCard
/generate --nextjs hook Orders
/generate --nextjs route Orders

# Test stub
/generate test UserService
```

## Template sources

| Artifact | Template | Namespace / path |
|----------|----------|------------------|
| Invokable controller | `laravel-12/assets/templates/controller.php` | `App\Http\Controllers\{Module}` |
| Service | `laravel-12/assets/templates/service.php` | `App\Services` |
| DTOs (entity, create, update, filter) | `laravel-12/assets/templates/dto.php` | `App\DTOs` |
| Repository interface, Eloquent implementation, binding | `laravel-12/assets/templates/repository.php` | `App\Contracts`, `App\Repositories`, `App\Providers\RepositoryServiceProvider` |
| Pest test | `laravel-12/assets/templates/test.php` | `tests/Feature`, `tests/Unit` |
| Page (App Router) | `nextjs-15/assets/templates/page.tsx` | `app/<route>/page.tsx` |
| Components and types | `nextjs-15/assets/templates/component.tsx` | `components/`, `types/` |
| Data hooks | `nextjs-15/assets/templates/hook.ts` | `hooks/` |
| Route handlers (BFF to the Laravel API) | `nextjs-15/assets/templates/api-route.ts` | `app/api/<resource>/route.ts` |

Paths are relative to the kit's skills directory (`.claude/skills/` in file-copy installs, `skills/` in the plugin). Module layouts (`app/Modules/<Module>/...`) are in `laravel-12/references/module-scaffolding.md`.

## How to generate

1. **Read the project first.** Grep for an existing service, DTO, and controller. If the project already uses different namespaces (for example `App\Data` for DTOs, or `app/Modules/<Module>`), follow the project, not the template. The project's `.claude/rules/services-dtos.md` and `api-controllers.md`, when present, win over both.
2. **Read the template**, replace the placeholders (`{{Entity}}`, `{{entity}}`, `{{entities}}`, `{{Module}}`, `{{Action}}`), and delete the sections that do not apply.
3. **Use artisan where it adds wiring**: `php artisan make:model Order -mf` (model, migration, factory), `php artisan make:policy OrderPolicy --model=Order`, `php artisan make:resource OrderResource`. Then replace the generated bodies with the template's.
4. **Wire it**: bind the repository interface in a service provider, register routes in `routes/api.php` under the API version prefix, add the policy check in each controller.
5. **Schema first**: for a new table, write `docs/schemas/{table}.md` (the `schema-first` skill) before the migration; `/design-schema` helps.
6. **Run the gates** (`verification-gates`): Pint, PHPStan, and the generated tests for Laravel; ESLint and `tsc --noEmit` for Next.js.

## CRUD set (`--crud=Order`)

```
Laravel
  app/Models/Order.php                                   (make:model -mf)
  database/migrations/xxxx_create_orders_table.php
  database/factories/OrderFactory.php
  app/DTOs/OrderDTO.php, CreateOrderDTO.php, UpdateOrderDTO.php, OrderFilterDTO.php
  app/Contracts/OrderRepositoryInterface.php
  app/Repositories/EloquentOrderRepository.php
  app/Services/OrderService.php
  app/Http/Controllers/Order/{List,Show,Create,Update,Delete}OrderController.php
  app/Http/Resources/OrderResource.php
  app/Policies/OrderPolicy.php
  tests/Feature/Order/*Test.php

Next.js (with --nextjs, or when a frontend repo is present)
  types/order.ts
  lib/api/orders.ts (or the project's API client)
  app/orders/page.tsx, app/orders/[id]/page.tsx
  components/orders/OrderCard.tsx
```

A full CRUD set is several layers and usually more than three files: for anything beyond scaffolding (business rules, authorization per role), plan it with `/write-spec` first.

## Output

```
Generated: CRUD scaffolding for Order

Created
  app/Models/Order.php
  app/DTOs/OrderDTO.php, CreateOrderDTO.php, UpdateOrderDTO.php
  app/Services/OrderService.php
  ...
Wired
  RepositoryServiceProvider: OrderRepositoryInterface -> EloquentOrderRepository
  routes/api.php: 5 routes under /api/v1/orders
Gates
  [PASS] Pint  [PASS] PHPStan  [PASS] Pest (5 stubs, marked todo)

Next
  1. Fill the schema doc and migration columns
  2. Add the business rules to OrderService and CreateOrderDTO validation
  3. Run /run-tests --filter=Order
```

**Source Verification**: Follow the `source-verification` skill.
