<?php

namespace App\Exceptions;

final class InvalidCredentialsException extends BusinessRuleException
{
    public function __construct()
    {
        parent::__construct('These credentials do not match our records.');
    }

    public function status(): int
    {
        return 422;
    }

    public function errorCode(): string
    {
        return 'invalid_credentials';
    }
}
