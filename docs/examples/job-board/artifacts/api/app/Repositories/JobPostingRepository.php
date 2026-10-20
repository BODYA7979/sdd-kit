<?php

namespace App\Repositories;

use App\Contracts\JobPostingRepositoryInterface;
use App\DTOs\JobPostingDTO;
use App\DTOs\JobSearchDTO;
use App\Enums\JobPostingStatus;
use App\Models\JobPosting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class JobPostingRepository implements JobPostingRepositoryInterface
{
    public function searchOpen(JobSearchDTO $filters, int $perPage): LengthAwarePaginator
    {
        $paginator = JobPosting::query()
            ->with('company')
            ->where('status', JobPostingStatus::Open)
            ->when($filters->q, function (Builder $query, string $term): void {
                $query->where(function (Builder $inner) use ($term): void {
                    $pattern = $this->likePattern($term);

                    $inner->whereRaw("title like ? escape '!'", [$pattern])
                        ->orWhereRaw("description like ? escape '!'", [$pattern]);
                });
            })
            ->when($filters->location, fn (Builder $query, string $location) => $query->whereRaw("location like ? escape '!'", [$this->likePattern($location)]))
            ->when($filters->remote !== null, fn (Builder $query) => $query->where('remote', $filters->remote))
            ->when($filters->employmentType, fn (Builder $query) => $query->where('employment_type', $filters->employmentType))
            ->when($filters->company, fn (Builder $query, string $slug) => $query->whereHas('company', fn (Builder $company) => $company->where('slug', $slug)))
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->paginate(perPage: $perPage, page: $filters->page);

        $paginator->through(fn (JobPosting $posting) => JobPostingDTO::fromModel($posting));

        /** @var LengthAwarePaginator<int, JobPostingDTO> $paginator */
        return $paginator;
    }

    public function findById(string $id): ?JobPostingDTO
    {
        $posting = JobPosting::query()->with('company')->whereKey($id)->first();

        return $posting ? JobPostingDTO::fromModel($posting) : null;
    }

    public function findOpenById(string $id): ?JobPostingDTO
    {
        $posting = JobPosting::query()
            ->with('company')
            ->whereKey($id)
            ->where('status', JobPostingStatus::Open)
            ->first();

        return $posting ? JobPostingDTO::fromModel($posting) : null;
    }

    /**
     * Builds a contains pattern with LIKE wildcards in user input escaped,
     * so "%" and "_" match literally. "!" is the escape character because
     * it needs no extra quoting on SQLite, MySQL or PostgreSQL.
     */
    private function likePattern(string $term): string
    {
        return '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
    }
}
