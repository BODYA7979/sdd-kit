<?php

namespace App\Contracts;

use App\DTOs\JobPostingDTO;
use App\DTOs\JobSearchDTO;
use Illuminate\Pagination\LengthAwarePaginator;

interface JobPostingRepositoryInterface
{
    /**
     * Open postings matching the filters, newest published first (BR-10, BR-11).
     *
     * @return LengthAwarePaginator<int, JobPostingDTO>
     */
    public function searchOpen(JobSearchDTO $filters, int $perPage): LengthAwarePaginator;

    /**
     * Any status. For internal callers that must tell "unknown" from "not open",
     * such as applications (BR-31). Never use it for public reads.
     */
    public function findById(string $id): ?JobPostingDTO;

    /**
     * Only an open posting, or null. The public detail endpoint uses this (BR-10).
     */
    public function findOpenById(string $id): ?JobPostingDTO;
}
