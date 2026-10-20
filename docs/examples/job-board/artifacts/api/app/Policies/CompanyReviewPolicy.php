<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class CompanyReviewPolicy
{
    /**
     * Only candidates write reviews (BR-40), so only they can have one to read back.
     */
    public function create(User $user): bool
    {
        return $user->isCandidate();
    }

    /**
     * Admins are seeded, never self-registered (BR-01), and are the only moderators (BR-41).
     */
    public function moderate(User $user): bool
    {
        return $user->isAdmin();
    }
}
