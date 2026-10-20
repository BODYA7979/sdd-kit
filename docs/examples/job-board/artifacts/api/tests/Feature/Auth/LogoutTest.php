<?php

use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

it('revokes the current token', function () {
    $user = User::factory()->create();
    $current = $user->createToken('web', ['*'], now()->addDays(7))->plainTextToken;
    $other = $user->createToken('web', ['*'], now()->addDays(7))->plainTextToken;

    postJson('/api/v1/auth/logout', [], ['Authorization' => "Bearer {$current}"])
        ->assertNoContent();

    // The auth manager caches the resolved user between requests in one test.
    $this->app['auth']->forgetGuards();

    getJson('/api/v1/auth/me', ['Authorization' => "Bearer {$current}"])
        ->assertUnauthorized()
        ->assertJsonPath('code', 'unauthenticated');

    expect(PersonalAccessToken::findToken($current))->toBeNull()
        ->and(PersonalAccessToken::findToken($other))->not->toBeNull();
});
