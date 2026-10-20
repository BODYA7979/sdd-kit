<?php

use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\PersonalAccessToken;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

// An empty range body means the password is not in the breach corpus; keeps the suite offline.
beforeEach(fn () => Http::fake(['api.pwnedpasswords.com/*' => Http::response('')]));

function registrationPayload(array $overrides = []): array
{
    return [
        'name' => 'Casey Candidate',
        'email' => 'casey@hireboard.test',
        'password' => 'correct-horse',
        'password_confirmation' => 'correct-horse',
        'role' => 'candidate',
        ...$overrides,
    ];
}

it('registers a candidate and returns a token', function () {
    $response = postJson('/api/v1/auth/register', registrationPayload())
        ->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('status', 201)
        ->assertJsonPath('data.user.name', 'Casey Candidate')
        ->assertJsonPath('data.user.email', 'casey@hireboard.test')
        ->assertJsonPath('data.user.role', 'candidate');

    $token = $response->json('data.token');
    expect($token)->toBeString()->not->toBeEmpty();

    $issued = PersonalAccessToken::findToken($token);
    expect($issued)->not->toBeNull()
        ->and($issued->name)->toBe('web')
        ->and($issued->expires_at->between(now()->addDays(7)->subMinute(), now()->addDays(7)->addMinute()))->toBeTrue();

    expect(Company::query()->count())->toBe(0);

    getJson('/api/v1/auth/me', ['Authorization' => "Bearer {$token}"])
        ->assertOk()
        ->assertJsonPath('data.email', 'casey@hireboard.test');
});

it('registers an employer together with a new company', function () {
    postJson('/api/v1/auth/register', registrationPayload([
        'email' => 'erin@acme.test',
        'role' => 'employer',
    ]))
        ->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonValidationErrors(['company_name']);

    Company::factory()->create(['slug' => 'acme-robotics', 'name' => 'Acme Robotics']);

    $response = postJson('/api/v1/auth/register', registrationPayload([
        'name' => 'Erin Employer',
        'email' => 'erin@acme.test',
        'role' => 'employer',
        'company_name' => 'Acme Robotics',
    ]))
        ->assertCreated()
        ->assertJsonPath('data.user.role', 'employer');

    $company = Company::query()->where('slug', 'acme-robotics-2')->first();

    expect($company)->not->toBeNull()
        ->and($company->name)->toBe('Acme Robotics')
        ->and($company->owner_id)->toBe($response->json('data.user.id'));
});

it('refuses admin self-registration', function () {
    postJson('/api/v1/auth/register', registrationPayload(['role' => 'admin']))
        ->assertUnprocessable()
        ->assertJsonPath('success', false)
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonValidationErrors(['role']);

    expect(User::query()->count())->toBe(0);
});

it('rejects a duplicate email regardless of case', function () {
    User::factory()->create(['email' => 'casey@hireboard.test']);

    postJson('/api/v1/auth/register', registrationPayload(['email' => 'Casey@Hireboard.TEST']))
        ->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonValidationErrors(['email']);

    expect(User::query()->count())->toBe(1);
});
