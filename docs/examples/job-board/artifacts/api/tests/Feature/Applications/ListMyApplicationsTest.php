<?php

use App\Models\JobApplication;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;

it('lists the candidate applications newest first', function () {
    $candidate = User::factory()->candidate()->create();
    $older = JobApplication::factory()->create([
        'candidate_id' => $candidate->id,
        'created_at' => now()->subDays(2),
    ]);
    $newer = JobApplication::factory()->create([
        'candidate_id' => $candidate->id,
        'created_at' => now()->subHour(),
    ]);
    JobApplication::factory()->create();

    Sanctum::actingAs($candidate);

    $response = getJson('/api/v1/me/applications')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $newer->id)
        ->assertJsonPath('data.1.id', $older->id)
        ->assertJsonPath('meta', [
            'current_page' => 1,
            'per_page' => 20,
            'total' => 2,
            'last_page' => 1,
        ]);

    expect(array_keys($response->json('data.0')))->toEqualCanonicalizing([
        'id', 'job', 'cover_letter', 'submitted_at',
    ]);
    expect(array_keys($response->json('data.0.job.company')))->toEqualCanonicalizing(['slug', 'name']);

    getJson('/api/v1/me/applications?per_page=500')
        ->assertOk()
        ->assertJsonPath('meta.per_page', 50);

    Sanctum::actingAs(User::factory()->employer()->create());

    getJson('/api/v1/me/applications')->assertForbidden();
});

it('requires authentication', function () {
    getJson('/api/v1/me/applications')
        ->assertUnauthorized()
        ->assertJsonPath('code', 'unauthenticated');
});
