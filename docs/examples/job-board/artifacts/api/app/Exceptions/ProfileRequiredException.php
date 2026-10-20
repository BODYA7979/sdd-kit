<?php

namespace App\Exceptions;

final class ProfileRequiredException extends BusinessRuleException
{
    public function __construct()
    {
        parent::__construct('Create your candidate profile before applying.');
    }

    public function status(): int
    {
        return 422;
    }

    public function errorCode(): string
    {
        return 'profile_required';
    }
}
