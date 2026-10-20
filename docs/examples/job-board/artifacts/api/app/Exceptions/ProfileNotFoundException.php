<?php

declare(strict_types=1);

namespace App\Exceptions;

final class ProfileNotFoundException extends BusinessRuleException
{
    public function __construct()
    {
        parent::__construct('Candidate profile not found.');
    }

    public function status(): int
    {
        return 404;
    }

    public function errorCode(): string
    {
        return 'profile_not_found';
    }
}
