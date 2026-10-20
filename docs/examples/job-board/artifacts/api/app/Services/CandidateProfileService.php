<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\CandidateProfileRepositoryInterface;
use App\DTOs\CandidateProfileDTO;
use App\DTOs\UpsertCandidateProfileDTO;
use App\Exceptions\ProfileNotFoundException;

class CandidateProfileService
{
    public function __construct(
        private readonly CandidateProfileRepositoryInterface $profiles,
    ) {}

    /**
     * @throws ProfileNotFoundException
     */
    public function findForUser(int $userId): CandidateProfileDTO
    {
        return $this->profiles->findByUserId($userId)
            ?? throw new ProfileNotFoundException;
    }

    public function upsert(int $userId, UpsertCandidateProfileDTO $data): CandidateProfileDTO
    {
        return $this->profiles->upsertForUser($userId, $data);
    }
}
