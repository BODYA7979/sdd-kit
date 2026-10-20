<?php

declare(strict_types=1);

namespace App\DTOs;

use App\Enums\ReviewStatus;
use App\Models\CompanyReview;
use Spatie\LaravelData\Data;

/**
 * One review with three audiences. Pick the serializer by who is asking:
 * toApiArray() for the public, toOwnerArray() for the candidate who wrote it,
 * toModerationArray() for admins. Only the moderation view names the candidate (BR-42).
 */
class CompanyReviewDTO extends Data
{
    public const PUBLIC_AUTHOR = 'Verified candidate';

    public function __construct(
        public readonly string $id,
        public readonly string $companySlug,
        public readonly string $companyName,
        public readonly string $candidateName,
        public readonly int $rating,
        public readonly string $title,
        public readonly string $body,
        public readonly ReviewStatus $status,
        public readonly ?string $rejectionReason,
        public readonly ?string $createdAt,
    ) {}

    /**
     * Expects the company and candidate relations to be loaded; the repository eager-loads them.
     */
    public static function fromModel(CompanyReview $review): self
    {
        return new self(
            id: $review->id,
            companySlug: $review->company->slug,
            companyName: $review->company->name,
            candidateName: $review->candidate->name,
            rating: (int) $review->rating,
            title: $review->title,
            body: $review->body,
            status: $review->status,
            rejectionReason: $review->rejection_reason,
            createdAt: $review->created_at?->toIso8601ZuluString(),
        );
    }

    /**
     * Public shape (BR-42): never the candidate's id or name.
     *
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'rating' => $this->rating,
            'title' => $this->title,
            'body' => $this->body,
            'author' => self::PUBLIC_AUTHOR,
            'created_at' => $this->createdAt,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toOwnerArray(): array
    {
        return [
            ...$this->toApiArray(),
            'status' => $this->status->value,
            'rejection_reason' => $this->rejectionReason,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toModerationArray(): array
    {
        return [
            ...$this->toApiArray(),
            'status' => $this->status->value,
            'company' => [
                'slug' => $this->companySlug,
                'name' => $this->companyName,
            ],
            'candidate_name' => $this->candidateName,
        ];
    }
}
