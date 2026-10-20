<?php

namespace App\Services;

use App\Contracts\CompanyRepositoryInterface;
use App\Contracts\UserRepositoryInterface;
use App\DTOs\AuthResultDTO;
use App\DTOs\LoginDTO;
use App\DTOs\RegisterUserDTO;
use App\Exceptions\InvalidCredentialsException;
use Illuminate\Support\Facades\DB;

class AuthService
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly CompanyRepositoryInterface $companies,
    ) {}

    /**
     * An employer and their company are created together or not at all (BR-02).
     */
    public function register(RegisterUserDTO $data): AuthResultDTO
    {
        return DB::transaction(function () use ($data): AuthResultDTO {
            $user = $this->users->create($data);

            if ($data->isEmployer() && $data->companyName !== null) {
                $this->companies->createForOwner($user->id, $data->companyName);
            }

            return new AuthResultDTO($user, $this->users->issueToken($user->id));
        });
    }

    /**
     * Unknown email and wrong password share one error message. This does not hide which
     * emails are registered: registration reports a taken email, and an unknown email skips
     * the password hash check, so it answers slightly faster. Email enumeration is an
     * accepted v1 risk; login and register are throttled to 6 requests per minute.
     *
     * @throws InvalidCredentialsException when the email is unknown or the password is wrong
     */
    public function login(LoginDTO $data): AuthResultDTO
    {
        $user = $this->users->verifyCredentials($data);

        if ($user === null) {
            throw new InvalidCredentialsException;
        }

        return new AuthResultDTO($user, $this->users->issueToken($user->id));
    }

    /**
     * Revokes only the token used for this request (BR-04); other sessions stay signed in.
     */
    public function logout(string $plainTextToken): void
    {
        $this->users->revokeToken($plainTextToken);
    }
}
