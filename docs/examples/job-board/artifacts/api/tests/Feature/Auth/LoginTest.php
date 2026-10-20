<?php

use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

it('logs in with valid credentials', function () {
    $user = User::factory()->employer()->create(['email' => 'erin@acme.test']);

    $response = postJson('/api/v1/auth/login', [
        'email' => 'Erin@Acme.test',
        'password' => 'password',
    ])
        ->assertOk()
        ->assertJsonPath('data.user.id', $user->id)
        ->assertJsonPath('data.user.role', 'employer');

    $token = PersonalAccessToken::findToken($response->json('data.token'));

    expect($token)->not->toBeNull()
        ->and($token->tokenable_id)->toBe($user->id)
        ->and($token->expires_at->between(now()->addDays(7)->subMinute(), now()->addDays(7)->addMinute()))->toBeTrue();
});

it('rejects invalid credentials', function () {
    User::factory()->create(['email' => 'casey@hireboard.test']);

    $expected = [
        'success' => false,
        'status' => 422,
        'message' => 'These credentials do not match our records.',
        'code' => 'invalid_credentials',
    ];

    postJson('/api/v1/auth/login', ['email' => 'casey@hireboard.test', 'password' => 'wrong-password'])
        ->assertUnprocessable()
        ->assertExactJson($expected);

    postJson('/api/v1/auth/login', ['email' => 'nobody@hireboard.test', 'password' => 'password'])
        ->assertUnprocessable()
        ->assertExactJson($expected);

    expect(PersonalAccessToken::query()->count())->toBe(0);
});

it('returns the current user', function () {
    $user = User::factory()->candidate()->create([
        'name' => 'Casey Candidate',
        'email' => 'casey@hireboard.test',
    ]);

    Sanctum::actingAs($user);

    getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertExactJson([
            'success' => true,
            'status' => 200,
            'message' => 'OK',
            'data' => [
                'id' => $user->id,
                'name' => 'Casey Candidate',
                'email' => 'casey@hireboard.test',
                'role' => 'candidate',
            ],
        ]);
});

it('throttles repeated login attempts', function () {
    $credentials = ['email' => 'casey@hireboard.test', 'password' => 'wrong-password'];

    foreach (range(1, 6) as $attempt) {
        postJson('/api/v1/auth/login', $credentials)->assertUnprocessable();
    }

    postJson('/api/v1/auth/login', $credentials)
        ->assertTooManyRequests()
        ->assertJsonPath('code', 'too_many_requests')
        ->assertHeader('Retry-After');
});
