<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\CompanyReviewRepositoryInterface;
use App\DTOs\CompanyReviewDTO;
use App\DTOs\SubmitCompanyReviewDTO;
use App\Enums\ReviewStatus;
use App\Exceptions\ReviewAlreadyExistsException;
use App\Models\CompanyReview;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Pagination\LengthAwarePaginator;

class CompanyReviewRepository implements CompanyReviewRepositoryInterface
{
    public function existsForCandidate(string $companyId, int $candidateId): bool
    {
        return CompanyReview::query()
            ->where('company_id', $companyId)
            ->where('candidate_id', $candidateId)
            ->exists();
    }

    public function create(string $companyId, int $candidateId, SubmitCompanyReviewDTO $data): CompanyReviewDTO
    {
        try {
            $review = CompanyReview::query()->create([
                'company_id' => $companyId,
                'candidate_id' => $candidateId,
                'rating' => $data->rating,
                'title' => $data->title,
                'body' => $data->body,
                'status' => ReviewStatus::Pending,
            ]);
        } catch (UniqueConstraintViolationException) {
            throw new ReviewAlreadyExistsException;
        }

        return CompanyReviewDTO::fromModel($review->load(['company:id,slug,name', 'candidate:id,name']));
    }

    public function findForCandidate(string $companyId, int $candidateId): ?CompanyReviewDTO
    {
        $review = $this->withRelations()
            ->where('company_id', $companyId)
            ->where('candidate_id', $candidateId)
            ->first();

        return $review === null ? null : CompanyReviewDTO::fromModel($review);
    }

    public function findById(string $id): ?CompanyReviewDTO
    {
        $review = $this->withRelations()->find($id);

        return $review === null ? null : CompanyReviewDTO::fromModel($review);
    }

    public function paginateApproved(string $companyId, int $perPage): LengthAwarePaginator
    {
        $paginator = $this->withRelations()
            ->where('company_id', $companyId)
            ->where('status', ReviewStatus::Approved->value)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->toDtos($paginator);
    }

    public function approvedRatingTotals(string $companyId): array
    {
        $totals = CompanyReview::query()
            ->where('company_id', $companyId)
            ->where('status', ReviewStatus::Approved->value)
            ->toBase()
            ->selectRaw('count(*) as review_count, coalesce(sum(rating), 0) as rating_sum')
            ->first();

        return [
            'count' => (int) ($totals->review_count ?? 0),
            'sum' => (int) ($totals->rating_sum ?? 0),
        ];
    }

    public function paginatePending(int $perPage): LengthAwarePaginator
    {
        $paginator = $this->withRelations()
            ->where('status', ReviewStatus::Pending->value)
            ->orderBy('created_at')
            ->paginate($perPage);

        return $this->toDtos($paginator);
    }

    public function moderate(string $id, ReviewStatus $decision, int $moderatorId, ?string $reason = null): ?CompanyReviewDTO
    {
        // The status condition makes the decision atomic: a review that was
        // moderated in the meantime matches no row and nothing is overwritten.
        $updated = CompanyReview::query()
            ->whereKey($id)
            ->where('status', ReviewStatus::Pending->value)
            ->update([
                'status' => $decision->value,
                'moderated_by' => $moderatorId,
                'moderated_at' => now(),
                'rejection_reason' => $reason,
            ]);

        return $updated === 0 ? null : $this->findById($id);
    }

    /**
     * @param  LengthAwarePaginator<int, CompanyReview>  $paginator
     * @return LengthAwarePaginator<int, CompanyReviewDTO>
     */
    private function toDtos(LengthAwarePaginator $paginator): LengthAwarePaginator
    {
        $paginator->through(fn (CompanyReview $review) => CompanyReviewDTO::fromModel($review));

        /** @var LengthAwarePaginator<int, CompanyReviewDTO> $paginator */
        return $paginator;
    }

    /**
     * @return Builder<CompanyReview>
     */
    private function withRelations(): Builder
    {
        return CompanyReview::query()->with(['company:id,slug,name', 'candidate:id,name']);
    }
}
