<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class CandidateProfilePolicy
{
    /**
     * Only candidates have profiles (BR-20), and a profile is reachable only by its owner (BR-21):
     * the /me/profile endpoints always resolve the profile from the authenticated user.
     */
    public function manage(User $user): bool
    {
        return $user->isCandidate();
    }
}
