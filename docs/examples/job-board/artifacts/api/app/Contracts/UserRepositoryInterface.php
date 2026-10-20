<?php

namespace App\Contracts;

use App\DTOs\LoginDTO;
use App\DTOs\RegisterUserDTO;
use App\DTOs\UserDTO;

interface UserRepositoryInterface
{
    public function create(RegisterUserDTO $data): UserDTO;

    /**
     * Returns the user when the email exists and the password matches, otherwise null.
     */
    public function verifyCredentials(LoginDTO $data): ?UserDTO;

    /**
     * Issues a Sanctum personal access token named "web" that expires after
     * 7 days (BR-04) and returns its plain-text value.
     */
    public function issueToken(int $userId): string;

    /**
     * Deletes the token behind a plain-text bearer value. Unknown tokens are ignored.
     */
    public function revokeToken(string $plainTextToken): void;
}
