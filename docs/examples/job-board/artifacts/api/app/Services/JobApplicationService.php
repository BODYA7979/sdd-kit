<?php

namespace App\Services;

use App\Contracts\JobApplicationRepositoryInterface;
use App\Contracts\JobPostingRepositoryInterface;
use App\DTOs\JobApplicationDTO;
use App\DTOs\SubmitApplicationDTO;
use App\Exceptions\AlreadyAppliedException;
use App\Exceptions\JobNotOpenException;
use App\Exceptions\JobPostingNotFoundException;
use App\Exceptions\ProfileRequiredException;
use Illuminate\Pagination\LengthAwarePaginator;

final class JobApplicationService
{
    public function __construct(
        private readonly JobApplicationRepositoryInterface $applications,
        private readonly JobPostingRepositoryInterface $jobPostings,
    ) {}

    /**
     * Rules are checked in this order so a candidate is never asked to create a profile
     * for a job that cannot be applied to anyway.
     *
     * @throws JobPostingNotFoundException unknown posting id (404 job_not_found)
     * @throws JobNotOpenException posting is draft or closed (422 job_not_open, BR-31)
     * @throws ProfileRequiredException candidate has no profile yet (BR-30)
     * @throws AlreadyAppliedException duplicate application (BR-32)
     */
    public function submit(string $jobPostingId, int $candidateId, SubmitApplicationDTO $data): JobApplicationDTO
    {
        // findById() deliberately has no status filter: draft and closed postings must be found
        // here so the candidate gets job_not_open rather than a 404 (BR-31).
        $job = $this->jobPostings->findById($jobPostingId);

        if ($job === null) {
            throw new JobPostingNotFoundException;
        }

        if (! $job->isOpen()) {
            throw new JobNotOpenException;
        }

        if (! $this->applications->hasCandidateProfile($candidateId)) {
            throw new ProfileRequiredException;
        }

        if ($this->applications->exists($jobPostingId, $candidateId)) {
            throw new AlreadyAppliedException;
        }

        return $this->applications->create($jobPostingId, $candidateId, $data->coverLetter);
    }

    /**
     * @return LengthAwarePaginator<int, JobApplicationDTO>
     */
    public function listForCandidate(int $candidateId, int $perPage): LengthAwarePaginator
    {
        return $this->applications->paginateForCandidate($candidateId, $perPage);
    }

    /**
     * BR-33: only applications to the employer's own company, including closed postings.
     *
     * @return LengthAwarePaginator<int, JobApplicationDTO>
     */
    public function listForEmployer(int $employerId, int $perPage): LengthAwarePaginator
    {
        return $this->applications->paginateForCompanyOwner($employerId, $perPage);
    }
}
