<?php

declare(strict_types=1);

namespace App\DTOs;

use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;

#[MapInputName(SnakeCaseMapper::class)]
class RejectReviewDTO extends Data
{
    public function __construct(
        public readonly string $reason,
    ) {}

    /**
     * The reason is shown to the candidate on /reviews/mine (BR-41).
     *
     * @return array<string, array<int, string>>
     */
    public static function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:5', 'max:255'],
        ];
    }
}
