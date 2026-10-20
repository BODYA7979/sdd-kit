<?php

declare(strict_types=1);

namespace App\Exceptions;

final class ReviewAlreadyModeratedException extends BusinessRuleException
{
    public function __construct()
    {
        parent::__construct('This review has already been moderated.');
    }

    public function status(): int
    {
        return 409;
    }

    public function errorCode(): string
    {
        return 'review_already_moderated';
    }
}
