<?php

declare(strict_types=1);

namespace App\DTOs;

use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;

/**
 * Full replacement of a candidate profile (PUT semantics): every field is sent on each save.
 */
#[MapInputName(SnakeCaseMapper::class)]
class UpsertCandidateProfileDTO extends Data
{
    /**
     * @param  list<string>  $skills
     */
    public function __construct(
        public readonly string $headline,
        public readonly ?string $location,
        public readonly ?string $bio,
        public readonly array $skills,
        public readonly int $yearsExperience,
        public readonly bool $openToWork,
    ) {}

    /**
     * Keys use the snake_case input names. Skills are compared case-insensitively,
     * so "PHP" and "php" count as the same skill and the duplicate is rejected.
     *
     * @return array<string, array<int, string>>
     */
    public static function rules(): array
    {
        return [
            'headline' => ['required', 'string', 'min:3', 'max:120'],
            'location' => ['nullable', 'string', 'max:120'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'skills' => ['present', 'list', 'max:20'],
            'skills.*' => ['required', 'string', 'max:40', 'distinct:ignore_case'],
            'years_experience' => ['required', 'integer', 'between:0,60'],
            'open_to_work' => ['required', 'boolean'],
        ];
    }
}
