<?php

declare(strict_types=1);

namespace App\DTOs;

use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;

#[MapInputName(SnakeCaseMapper::class)]
class SubmitCompanyReviewDTO extends Data
{
    public function __construct(
        public readonly int $rating,
        public readonly string $title,
        public readonly string $body,
    ) {}

    /**
     * @return array<string, array<int, string>>
     */
    public static function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['required', 'string', 'min:5', 'max:120'],
            'body' => ['required', 'string', 'min:20', 'max:2000'],
        ];
    }
}
