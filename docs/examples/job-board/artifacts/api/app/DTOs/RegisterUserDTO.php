<?php

namespace App\DTOs;

use App\Enums\UserRole;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;

#[MapInputName(SnakeCaseMapper::class)]
final class RegisterUserDTO extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $password,
        public readonly UserRole $role,
        public readonly ?string $companyName = null,
    ) {}

    /**
     * Emails are compared and stored lowercase (BR-03), so normalize before the
     * unique rule runs: "Casey@Hireboard.test" collides with casey@hireboard.test.
     *
     * @param  array<string, mixed>  $properties
     * @return array<string, mixed>
     */
    public static function prepareForPipeline(array $properties): array
    {
        if (isset($properties['email']) && is_string($properties['email'])) {
            $properties['email'] = Str::lower(trim($properties['email']));
        }

        if (isset($properties['company_name']) && is_string($properties['company_name'])) {
            $properties['company_name'] = trim($properties['company_name']);
        }

        return $properties;
    }

    /**
     * Keys use the snake_case input names. Only candidate and employer can be
     * chosen (BR-01); an employer must name the company they register (BR-02).
     *
     * @return array<string, array<int, mixed>>
     */
    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8)->uncompromised(), 'confirmed'],
            'role' => ['required', 'string', Rule::in(UserRole::selfRegistrable())],
            'company_name' => ['nullable', 'required_if:role,employer', 'string', 'min:2', 'max:120'],
        ];
    }

    public function isEmployer(): bool
    {
        return $this->role === UserRole::Employer;
    }
}
