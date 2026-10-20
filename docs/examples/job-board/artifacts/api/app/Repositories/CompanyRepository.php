<?php

namespace App\Repositories;

use App\Contracts\CompanyRepositoryInterface;
use App\DTOs\CompanyDTO;
use App\Enums\JobPostingStatus;
use App\Models\Company;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class CompanyRepository implements CompanyRepositoryInterface
{
    public function findBySlug(string $slug): ?CompanyDTO
    {
        $company = Company::query()
            ->withCount(['jobPostings as open_jobs_count' => fn (Builder $query) => $query->where('status', JobPostingStatus::Open)])
            ->where('slug', $slug)
            ->first();

        return $company ? CompanyDTO::fromModel($company) : null;
    }

    public function createForOwner(int $ownerId, string $name): CompanyDTO
    {
        $company = Company::query()->create([
            'owner_id' => $ownerId,
            'name' => $name,
            'slug' => $this->uniqueSlug($name),
        ]);

        return CompanyDTO::fromModel($company);
    }

    public function findByOwnerId(int $ownerId): ?CompanyDTO
    {
        $company = Company::query()->where('owner_id', $ownerId)->first();

        return $company ? CompanyDTO::fromModel($company) : null;
    }

    /**
     * BR-02: "Acme Robotics" -> acme-robotics, then acme-robotics-2, -3 ...
     * The unique index on companies.slug is the final guard against a race.
     */
    private function uniqueSlug(string $name): string
    {
        $base = Str::limit(Str::slug($name), 70, '') ?: 'company';
        $slug = $base;
        $suffix = 2;

        while (Company::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
