<?php

namespace App\Repositories;

use App\Contracts\JobApplicationRepositoryInterface;
use App\DTOs\JobApplicationDTO;
use App\Exceptions\AlreadyAppliedException;
use App\Models\CandidateProfile;
use App\Models\JobApplication;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Pagination\LengthAwarePaginator;

final class JobApplicationRepository implements JobApplicationRepositoryInterface
{
    private const RELATIONS = ['jobPosting.company', 'candidate', 'candidateProfile'];

    public function exists(string $jobPostingId, int $candidateId): bool
    {
        return JobApplication::query()
            ->where('job_posting_id', $jobPostingId)
            ->where('candidate_id', $candidateId)
            ->exists();
    }

    public function hasCandidateProfile(int $candidateId): bool
    {
        return CandidateProfile::query()->where('user_id', $candidateId)->exists();
    }

    public function create(string $jobPostingId, int $candidateId, ?string $coverLetter): JobApplicationDTO
    {
        // The service checks for a duplicate first, but two concurrent submits can both pass
        // that check. The unique index decides the race; the loser gets the same 409.
        try {
            $application = JobApplication::query()->create([
                'job_posting_id' => $jobPostingId,
                'candidate_id' => $candidateId,
                'cover_letter' => $coverLetter,
            ]);
        } catch (UniqueConstraintViolationException) {
            throw new AlreadyAppliedException;
        }

        return JobApplicationDTO::fromModel($application->load(self::RELATIONS));
    }

    public function paginateForCandidate(int $candidateId, int $perPage): LengthAwarePaginator
    {
        return $this->paginate(
            JobApplication::query()->where('candidate_id', $candidateId),
            $perPage,
        );
    }

    public function paginateForCompanyOwner(int $ownerId, int $perPage): LengthAwarePaginator
    {
        return $this->paginate(
            JobApplication::query()->whereHas(
                'jobPosting.company',
                fn (Builder $company) => $company->where('owner_id', $ownerId),
            ),
            $perPage,
        );
    }

    /**
     * @param  Builder<JobApplication>  $query
     * @return LengthAwarePaginator<int, JobApplicationDTO>
     */
    private function paginate(Builder $query, int $perPage): LengthAwarePaginator
    {
        /** @var LengthAwarePaginator<int, JobApplication> $page */
        $page = $query
            ->with(self::RELATIONS)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        return $page->through(fn (JobApplication $application): JobApplicationDTO => JobApplicationDTO::fromModel($application));
    }
}
