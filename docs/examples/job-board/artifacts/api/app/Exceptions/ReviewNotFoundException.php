<?php

declare(strict_types=1);

namespace App\Exceptions;

final class ReviewNotFoundException extends BusinessRuleException
{
    public function __construct()
    {
        parent::__construct('Review not found.');
    }

    public function status(): int
    {
        return 404;
    }

    public function errorCode(): string
    {
        return 'review_not_found';
    }
}
