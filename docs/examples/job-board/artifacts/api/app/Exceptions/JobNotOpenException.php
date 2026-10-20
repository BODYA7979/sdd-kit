<?php

namespace App\Exceptions;

final class JobNotOpenException extends BusinessRuleException
{
    public function __construct()
    {
        parent::__construct('This job is no longer accepting applications.');
    }

    public function status(): int
    {
        return 422;
    }

    public function errorCode(): string
    {
        return 'job_not_open';
    }
}
