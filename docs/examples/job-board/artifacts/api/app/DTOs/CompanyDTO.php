<?php

namespace App\DTOs;

use App\Models\Company;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;

#[MapInputName(SnakeCaseMapper::class)]
final class CompanyDTO extends Data
{
    public function __construct(
        public readonly string $id,
        public readonly string $slug,
        public readonly string $name,
        public readonly ?string $website,
        public readonly ?string $location,
        public readonly ?string $description,
        public readonly ?int $ownerId,
        public readonly int $openJobsCount = 0,
    ) {}

    /**
     * open_jobs_count is read from a withCount() alias when the query loaded it.
     */
    public static function fromModel(Company $company): self
    {
        return new self(
            id: $company->id,
            slug: $company->slug,
            name: $company->name,
            website: $company->website,
            location: $company->location,
            description: $company->description,
            ownerId: $company->owner_id,
            openJobsCount: (int) ($company->getAttribute('open_jobs_count') ?? 0),
        );
    }

    /**
     * Public Company shape (docs/api/api-contracts.md). owner_id stays internal.
     *
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'website' => $this->website,
            'location' => $this->location,
            'description' => $this->description,
            'open_jobs_count' => $this->openJobsCount,
        ];
    }

    /**
     * The company block embedded in a JobPosting.
     *
     * @return array<string, mixed>
     */
    public function toSummaryArray(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'location' => $this->location,
        ];
    }
}
