<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\CompanyRepositoryInterface;
use App\Contracts\CompanyReviewRepositoryInterface;
use App\DTOs\CompanyReviewDTO;
use App\DTOs\RejectReviewDTO;
use App\DTOs\SubmitCompanyReviewDTO;
use App\Enums\ReviewStatus;
use App\Exceptions\CompanyNotFoundException;
use App\Exceptions\ReviewAlreadyExistsException;
use App\Exceptions\ReviewAlreadyModeratedException;
use App\Exceptions\ReviewNotFoundException;
use Illuminate\Pagination\LengthAwarePaginator;

class CompanyReviewService
{
    /**
     * Company ids already resolved in this request, keyed by slug.
     *
     * @var array<string, string>
     */
    private array $companyIds = [];

    public function __construct(
        private readonly CompanyReviewRepositoryInterface $reviews,
        private readonly CompanyRepositoryInterface $companies,
    ) {}

    /**
     * The caller has already authorized the author as a candidate (BR-40).
     *
     * @throws CompanyNotFoundException
     * @throws ReviewAlreadyExistsException
     */
    public function submit(string $companySlug, int $candidateId, SubmitCompanyReviewDTO $data): CompanyReviewDTO
    {
        $companyId = $this->companyId($companySlug);

        // One review per candidate per company in any status, so a rejected
        // review cannot be replaced by a new submission (BR-40, BR-44).
        if ($this->reviews->existsForCandidate($companyId, $candidateId)) {
            throw new ReviewAlreadyExistsException;
        }

        return $this->reviews->create($companyId, $candidateId, $data);
    }

    /**
     * @return LengthAwarePaginator<int, CompanyReviewDTO>
     *
     * @throws CompanyNotFoundException
     */
    public function listApproved(string $companySlug, int $perPage = 20): LengthAwarePaginator
    {
        return $this->reviews->paginateApproved($this->companyId($companySlug), $perPage);
    }

    /**
     * Mean of approved ratings rounded half-up to one decimal, or null without
     * approved reviews (BR-43). Integer arithmetic keeps 4.25 at 4.3.
     *
     * @throws CompanyNotFoundException
     */
    public function averageRating(string $companySlug): ?float
    {
        ['count' => $count, 'sum' => $sum] = $this->reviews->approvedRatingTotals($this->companyId($companySlug));

        if ($count === 0) {
            return null;
        }

        $tenths = intdiv(20 * $sum + $count, 2 * $count);

        return $tenths / 10.0;
    }

    /**
     * @throws CompanyNotFoundException
     * @throws ReviewNotFoundException
     */
    public function findMine(string $companySlug, int $candidateId): CompanyReviewDTO
    {
        return $this->reviews->findForCandidate($this->companyId($companySlug), $candidateId)
            ?? throw new ReviewNotFoundException;
    }

    /**
     * @return LengthAwarePaginator<int, CompanyReviewDTO>
     */
    public function listPending(int $perPage = 20): LengthAwarePaginator
    {
        return $this->reviews->paginatePending($perPage);
    }

    /**
     * @throws ReviewNotFoundException
     * @throws ReviewAlreadyModeratedException
     */
    public function approve(string $reviewId, int $adminId): CompanyReviewDTO
    {
        return $this->decide($reviewId, ReviewStatus::Approved, $adminId);
    }

    /**
     * @throws ReviewNotFoundException
     * @throws ReviewAlreadyModeratedException
     */
    public function reject(string $reviewId, int $adminId, RejectReviewDTO $data): CompanyReviewDTO
    {
        return $this->decide($reviewId, ReviewStatus::Rejected, $adminId, $data->reason);
    }

    /**
     * Moderation is final (BR-44): only a pending review can be decided.
     */
    private function decide(string $reviewId, ReviewStatus $decision, int $adminId, ?string $reason = null): CompanyReviewDTO
    {
        $review = $this->reviews->findById($reviewId) ?? throw new ReviewNotFoundException;

        if ($review->status !== ReviewStatus::Pending) {
            throw new ReviewAlreadyModeratedException;
        }

        return $this->reviews->moderate($reviewId, $decision, $adminId, $reason)
            ?? throw new ReviewAlreadyModeratedException;
    }

    private function companyId(string $slug): string
    {
        return $this->companyIds[$slug] ??= ($this->companies->findBySlug($slug) ?? throw new CompanyNotFoundException)->id;
    }
}
