<?php

namespace App\DTOs;

use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;

#[MapInputName(SnakeCaseMapper::class)]
final class AuthResultDTO extends Data
{
    /**
     * @param  string  $token  plain-text Sanctum token; only the Next.js server ever sees it (INV-05)
     */
    public function __construct(
        public readonly UserDTO $user,
        public readonly string $token,
    ) {}

    /**
     * @return array{user: array{id: int, name: string, email: string, role: string}, token: string}
     */
    public function toApiArray(): array
    {
        return [
            'user' => $this->user->toApiArray(),
            'token' => $this->token,
        ];
    }
}
