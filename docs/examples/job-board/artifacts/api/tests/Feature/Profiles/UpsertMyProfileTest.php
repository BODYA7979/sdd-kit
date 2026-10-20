<?php

declare(strict_types=1);

use App\Models\CandidateProfile;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function validProfilePayload(array $overrides = []): array
{
    return array_merge([
        'headline' => 'Full-stack developer',
        'location' => 'Berlin',
        'bio' => 'Eight years of PHP, the last three on Laravel and Next.js.',
        'skills' => ['PHP', 'Laravel', 'TypeScript'],
        'years_experience' => 8,
        'open_to_work' => true,
    ], $overrides);
}

it('creates the profile on first save', function () {
    $candidate = User::factory()->candidate()->create();
    Sanctum::actingAs($candidate);

    $this->putJson('/api/v1/me/profile', validProfilePayload())
        ->assertOk()
        ->assertJsonPath('message', 'Profile saved')
        ->assertJsonPath('data.headline', 'Full-stack developer')
        ->assertJsonPath('data.skills', ['PHP', 'Laravel', 'TypeScript']);

    expect(CandidateProfile::query()->where('user_id', $candidate->id)->count())->toBe(1);

    $this->getJson('/api/v1/me/profile')
        ->assertOk()
        ->assertJsonPath('data.years_experience', 8);
});

it('updates the existing profile', function () {
    $candidate = User::factory()->candidate()->create();
    $profile = CandidateProfile::factory()->for($candidate)->create(['headline' => 'Junior developer']);
    Sanctum::actingAs($candidate);

    $this->putJson('/api/v1/me/profile', validProfilePayload([
        'headline' => 'Mid-level developer',
        'location' => null,
        'skills' => [],
        'open_to_work' => false,
    ]))
        ->assertOk()
        ->assertJsonPath('data.id', $profile->id)
        ->assertJsonPath('data.headline', 'Mid-level developer')
        ->assertJsonPath('data.location', null)
        ->assertJsonPath('data.skills', [])
        ->assertJsonPath('data.open_to_work', false);

    expect(CandidateProfile::query()->count())->toBe(1);
});

it('validates headline, skills and years of experience', function () {
    Sanctum::actingAs(User::factory()->candidate()->create());

    $this->putJson('/api/v1/me/profile', validProfilePayload([
        'headline' => 'ab',
        'skills' => ['PHP', 'php', str_repeat('x', 41)],
        'years_experience' => 61,
    ]))
        ->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonValidationErrors(['headline', 'skills.1', 'skills.2', 'years_experience']);

    $this->putJson('/api/v1/me/profile', validProfilePayload([
        'skills' => array_map(fn (int $i) => "Skill {$i}", range(1, 21)),
    ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['skills']);

    expect(CandidateProfile::query()->count())->toBe(0);
});

it('forbids employers', function () {
    Sanctum::actingAs(User::factory()->employer()->create());

    $this->getJson('/api/v1/me/profile')
        ->assertForbidden()
        ->assertJsonPath('code', 'forbidden');

    $this->putJson('/api/v1/me/profile', validProfilePayload())
        ->assertForbidden()
        ->assertJsonPath('code', 'forbidden');

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->putJson('/api/v1/me/profile', validProfilePayload())->assertForbidden();

    expect(CandidateProfile::query()->count())->toBe(0);
});

it('requires authentication', function () {
    $this->getJson('/api/v1/me/profile')
        ->assertUnauthorized()
        ->assertJsonPath('code', 'unauthenticated');

    $this->putJson('/api/v1/me/profile', validProfilePayload())
        ->assertUnauthorized()
        ->assertJsonPath('code', 'unauthenticated');
});
