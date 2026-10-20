<?php

namespace App\Exceptions;

final class CompanyNotFoundException extends BusinessRuleException
{
    public function __construct()
    {
        parent::__construct('Company not found.');
    }

    public function status(): int
    {
        return 404;
    }

    public function errorCode(): string
    {
        return 'company_not_found';
    }
}
