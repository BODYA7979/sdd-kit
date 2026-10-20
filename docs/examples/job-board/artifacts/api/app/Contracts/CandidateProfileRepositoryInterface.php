<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTOs\CandidateProfileDTO;
use App\DTOs\UpsertCandidateProfileDTO;

interface CandidateProfileRepositoryInterface
{
    public function findByUserId(int $userId): ?CandidateProfileDTO;

    public function upsertForUser(int $userId, UpsertCandidateProfileDTO $data): CandidateProfileDTO;
}
