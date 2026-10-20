<?php

namespace App\Contracts;

use App\DTOs\JobApplicationDTO;
use App\Exceptions\AlreadyAppliedException;
use Illuminate\Pagination\LengthAwarePaginator;

interface JobApplicationRepositoryInterface
{
    public function exists(string $jobPostingId, int $candidateId): bool;

    public function hasCandidateProfile(int $candidateId): bool;

    /**
     * @throws AlreadyAppliedException when the (job_posting_id, candidate_id) pair already exists
     */
    public function create(string $jobPostingId, int $candidateId, ?string $coverLetter): JobApplicationDTO;

    /**
     * @return LengthAwarePaginator<int, JobApplicationDTO>
     */
    public function paginateForCandidate(int $candidateId, int $perPage): LengthAwarePaginator;

    /**
     * Applications to any posting (open, closed or draft) of the company the employer owns.
     *
     * @return LengthAwarePaginator<int, JobApplicationDTO>
     */
    public function paginateForCompanyOwner(int $ownerId, int $perPage): LengthAwarePaginator;
}
