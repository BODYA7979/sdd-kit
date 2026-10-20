<?php

namespace App\Exceptions;

final class JobPostingNotFoundException extends BusinessRuleException
{
    public function __construct()
    {
        parent::__construct('Job posting not found.');
    }

    public function status(): int
    {
        return 404;
    }

    public function errorCode(): string
    {
        return 'job_not_found';
    }
}
