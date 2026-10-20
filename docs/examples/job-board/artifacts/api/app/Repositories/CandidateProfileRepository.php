<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\CandidateProfileRepositoryInterface;
use App\DTOs\CandidateProfileDTO;
use App\DTOs\UpsertCandidateProfileDTO;
use App\Models\CandidateProfile;

class CandidateProfileRepository implements CandidateProfileRepositoryInterface
{
    public function findByUserId(int $userId): ?CandidateProfileDTO
    {
        $profile = CandidateProfile::query()->where('user_id', $userId)->first();

        return $profile === null ? null : CandidateProfileDTO::fromModel($profile);
    }

    public function upsertForUser(int $userId, UpsertCandidateProfileDTO $data): CandidateProfileDTO
    {
        // user_id is unique, so this is the one-profile-per-candidate rule (BR-20) at the storage level.
        $profile = CandidateProfile::query()->updateOrCreate(
            ['user_id' => $userId],
            [
                'headline' => $data->headline,
                'location' => $data->location,
                'bio' => $data->bio,
                'skills' => $data->skills,
                'years_experience' => $data->yearsExperience,
                'open_to_work' => $data->openToWork,
            ],
        );

        return CandidateProfileDTO::fromModel($profile);
    }
}
