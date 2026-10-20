<?php

namespace App\Policies;

use App\Models\User;

class JobApplicationPolicy
{
    public function create(User $user): bool
    {
        return $user->isCandidate();
    }

    /**
     * A candidate listing their own applications.
     */
    public function viewAny(User $user): bool
    {
        return $user->isCandidate();
    }

    /**
     * The query itself is scoped to the employer's company (BR-33); this only gates the role.
     */
    public function viewEmployerApplications(User $user): bool
    {
        return $user->isEmployer();
    }
}
