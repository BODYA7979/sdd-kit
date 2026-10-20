<?php

namespace App\DTOs;

use App\Enums\EmploymentType;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;

/**
 * Filters for GET /api/v1/jobs. Every filter is optional; an absent filter
 * does not narrow the search. perPage above 50 is capped by the service (BR-11).
 */
#[MapInputName(SnakeCaseMapper::class)]
final class JobSearchDTO extends Data
{
    public function __construct(
        #[Max(120)]
        public readonly ?string $q = null,
        #[Max(120)]
        public readonly ?string $location = null,
        public readonly ?bool $remote = null,
        public readonly ?EmploymentType $employmentType = null,
        #[Max(80)]
        public readonly ?string $company = null,
        #[Min(1)]
        public readonly int $page = 1,
        #[Min(1)]
        public readonly int $perPage = 20,
    ) {}
}
