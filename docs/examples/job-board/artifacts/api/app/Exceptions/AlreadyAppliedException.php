<?php

namespace App\Exceptions;

final class AlreadyAppliedException extends BusinessRuleException
{
    public function __construct()
    {
        parent::__construct('You have already applied to this job.');
    }

    public function status(): int
    {
        return 409;
    }

    public function errorCode(): string
    {
        return 'already_applied';
    }
}
