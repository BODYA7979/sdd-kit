<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTOs\CompanyReviewDTO;
use App\DTOs\SubmitCompanyReviewDTO;
use App\Enums\ReviewStatus;
use App\Exceptions\ReviewAlreadyExistsException;
use Illuminate\Pagination\LengthAwarePaginator;

interface CompanyReviewRepositoryInterface
{
    public function existsForCandidate(string $companyId, int $candidateId): bool;

    /**
     * Stores a pending review.
     *
     * @throws ReviewAlreadyExistsException when the unique index rejects a concurrent duplicate
     */
    public function create(string $companyId, int $candidateId, SubmitCompanyReviewDTO $data): CompanyReviewDTO;

    public function findForCandidate(string $companyId, int $candidateId): ?CompanyReviewDTO;

    public function findById(string $id): ?CompanyReviewDTO;

    /**
     * Approved reviews of one company, newest first.
     *
     * @return LengthAwarePaginator<int, CompanyReviewDTO>
     */
    public function paginateApproved(string $companyId, int $perPage): LengthAwarePaginator;

    /**
     * Count and sum of approved ratings, so the caller can round without float drift.
     *
     * @return array{count: int, sum: int}
     */
    public function approvedRatingTotals(string $companyId): array;

    /**
     * Pending reviews across all companies, oldest first.
     *
     * @return LengthAwarePaginator<int, CompanyReviewDTO>
     */
    public function paginatePending(int $perPage): LengthAwarePaginator;

    /**
     * Records a moderation decision on a review that is still pending.
     * Returns null when the review was no longer pending, so two admins
     * deciding at the same time cannot both win.
     */
    public function moderate(string $id, ReviewStatus $decision, int $moderatorId, ?string $reason = null): ?CompanyReviewDTO;
}
