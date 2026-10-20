<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A domain rule refused the request. bootstrap/app.php renders every subclass
 * as the INV-01 error envelope using status() and errorCode(), so services
 * throw these instead of building HTTP responses.
 */
abstract class BusinessRuleException extends RuntimeException
{
    abstract public function status(): int;

    /**
     * Machine-readable code listed in docs/api/api-contracts.md. The web forms
     * map these codes to messages, so renaming one is a breaking change.
     */
    abstract public function errorCode(): string;
}
