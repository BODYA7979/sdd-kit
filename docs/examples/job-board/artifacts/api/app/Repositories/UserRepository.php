<?php

namespace App\Repositories;

use App\Contracts\UserRepositoryInterface;
use App\DTOs\LoginDTO;
use App\DTOs\RegisterUserDTO;
use App\DTOs\UserDTO;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class UserRepository implements UserRepositoryInterface
{
    private const TOKEN_NAME = 'web';

    private const TOKEN_LIFETIME_DAYS = 7;

    public function create(RegisterUserDTO $data): UserDTO
    {
        // The DTO's unique:users,email check is check-then-insert; a concurrent registration
        // with the same email lands here and must still answer 422 (BR-03), not 500.
        try {
            $user = User::query()->create([
                'name' => $data->name,
                'email' => $data->email,
                'password' => $data->password,
                'role' => $data->role,
            ]);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'email' => 'The email has already been taken.',
            ]);
        }

        return UserDTO::fromModel($user);
    }

    public function verifyCredentials(LoginDTO $data): ?UserDTO
    {
        $user = User::query()->where('email', $data->email)->first();

        if ($user === null || ! Hash::check($data->password, $user->password)) {
            return null;
        }

        return UserDTO::fromModel($user);
    }

    public function issueToken(int $userId): string
    {
        $user = User::query()->findOrFail($userId);

        return $user->createToken(
            self::TOKEN_NAME,
            ['*'],
            now()->addDays(self::TOKEN_LIFETIME_DAYS),
        )->plainTextToken;
    }

    public function revokeToken(string $plainTextToken): void
    {
        PersonalAccessToken::findToken($plainTextToken)?->delete();
    }
}
