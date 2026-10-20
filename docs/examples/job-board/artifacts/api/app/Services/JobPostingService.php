<?php

namespace App\Services;

use App\Contracts\JobPostingRepositoryInterface;
use App\DTOs\JobPostingDTO;
use App\DTOs\JobSearchDTO;
use App\Exceptions\JobPostingNotFoundException;
use Illuminate\Pagination\LengthAwarePaginator;

class JobPostingService
{
    private const MAX_PER_PAGE = 50;

    public function __construct(private readonly JobPostingRepositoryInterface $postings) {}

    /**
     * @return LengthAwarePaginator<int, JobPostingDTO>
     */
    public function search(JobSearchDTO $filters): LengthAwarePaginator
    {
        return $this->postings->searchOpen($filters, min($filters->perPage, self::MAX_PER_PAGE));
    }

    /**
     * @throws JobPostingNotFoundException when the id is unknown or the posting is not open (BR-10)
     */
    public function findOpen(string $id): JobPostingDTO
    {
        $posting = $this->postings->findOpenById($id);

        if ($posting === null) {
            throw new JobPostingNotFoundException;
        }

        return $posting;
    }
}
