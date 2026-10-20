<?php

namespace App\DTOs;

use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;

/**
 * Request body of POST /api/v1/jobs/{id}/applications. The posting id comes from the
 * route and the candidate from the token, so neither is accepted from the body.
 */
#[MapInputName(SnakeCaseMapper::class)]
final class SubmitApplicationDTO extends Data
{
    public function __construct(
        #[Max(2000)]
        public readonly ?string $coverLetter = null,
    ) {}
}
