<?php

namespace App\DTOs;

use App\Enums\EmploymentType;
use App\Enums\JobPostingStatus;
use App\Models\JobPosting;
use Carbon\CarbonInterface;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;

#[MapInputName(SnakeCaseMapper::class)]
final class JobPostingDTO extends Data
{
    public function __construct(
        public readonly string $id,
        public readonly string $title,
        public readonly string $description,
        public readonly string $location,
        public readonly bool $remote,
        public readonly EmploymentType $employmentType,
        public readonly ?int $salaryMin,
        public readonly ?int $salaryMax,
        public readonly string $salaryCurrency,
        public readonly JobPostingStatus $status,
        public readonly ?CarbonInterface $publishedAt,
        public readonly CompanyDTO $company,
    ) {}

    /**
     * Expects the company relation to be loaded; repositories eager-load it.
     */
    public static function fromModel(JobPosting $posting): self
    {
        return new self(
            id: $posting->id,
            title: $posting->title,
            description: $posting->description,
            location: $posting->location,
            remote: $posting->remote,
            employmentType: $posting->employment_type,
            salaryMin: $posting->salary_min,
            salaryMax: $posting->salary_max,
            salaryCurrency: $posting->salary_currency,
            status: $posting->status,
            publishedAt: $posting->published_at,
            company: CompanyDTO::fromModel($posting->company),
        );
    }

    public function isOpen(): bool
    {
        return $this->status === JobPostingStatus::Open;
    }

    /**
     * Public JobPosting shape. Salary is null when neither bound is set (BR-12, INV-07).
     *
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        $hasSalary = $this->salaryMin !== null || $this->salaryMax !== null;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'location' => $this->location,
            'remote' => $this->remote,
            'employment_type' => $this->employmentType->value,
            'salary' => $hasSalary ? [
                'min' => $this->salaryMin,
                'max' => $this->salaryMax,
                'currency' => $this->salaryCurrency,
            ] : null,
            'status' => $this->status->value,
            'published_at' => $this->publishedAt?->toIso8601String(),
            'company' => $this->company->toSummaryArray(),
        ];
    }
}
