<?php

declare(strict_types=1);

namespace App\Exceptions;

final class ReviewAlreadyExistsException extends BusinessRuleException
{
    public function __construct()
    {
        parent::__construct('You have already reviewed this company.');
    }

    public function status(): int
    {
        return 409;
    }

    public function errorCode(): string
    {
        return 'review_already_exists';
    }
}
