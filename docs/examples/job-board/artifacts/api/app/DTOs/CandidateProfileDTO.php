<?php

declare(strict_types=1);

namespace App\DTOs;

use App\Models\CandidateProfile;
use Spatie\LaravelData\Data;

class CandidateProfileDTO extends Data
{
    /**
     * @param  list<string>  $skills
     */
    public function __construct(
        public readonly string $id,
        public readonly int $userId,
        public readonly string $headline,
        public readonly ?string $location,
        public readonly ?string $bio,
        public readonly array $skills,
        public readonly int $yearsExperience,
        public readonly bool $openToWork,
        public readonly ?string $updatedAt,
    ) {}

    public static function fromModel(CandidateProfile $profile): self
    {
        return new self(
            id: $profile->id,
            userId: $profile->user_id,
            headline: $profile->headline,
            location: $profile->location,
            bio: $profile->bio,
            skills: $profile->skills,
            yearsExperience: $profile->years_experience,
            openToWork: $profile->open_to_work,
            updatedAt: $profile->updated_at?->toIso8601ZuluString(),
        );
    }

    /**
     * Owner-only representation (BR-21). user_id is never exposed.
     *
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'headline' => $this->headline,
            'location' => $this->location,
            'bio' => $this->bio,
            'skills' => $this->skills,
            'years_experience' => $this->yearsExperience,
            'open_to_work' => $this->openToWork,
            'updated_at' => $this->updatedAt,
        ];
    }
}
