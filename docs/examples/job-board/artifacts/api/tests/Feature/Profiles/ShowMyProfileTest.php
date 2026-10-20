<?php

declare(strict_types=1);

use App\Models\CandidateProfile;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('returns 404 profile_not_found before the profile exists', function () {
    Sanctum::actingAs(User::factory()->candidate()->create());

    $this->getJson('/api/v1/me/profile')
        ->assertNotFound()
        ->assertJson([
            'success' => false,
            'status' => 404,
            'code' => 'profile_not_found',
        ]);
});

it('returns the candidate profile', function () {
    $candidate = User::factory()->candidate()->create();
    CandidateProfile::factory()->for($candidate)->create([
        'headline' => 'Senior Laravel Developer',
        'skills' => ['PHP', 'Laravel', 'Pest'],
        'years_experience' => 7,
        'open_to_work' => false,
    ]);
    CandidateProfile::factory()->create(['headline' => 'Someone else']);

    Sanctum::actingAs($candidate);

    $this->getJson('/api/v1/me/profile')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.headline', 'Senior Laravel Developer')
        ->assertJsonPath('data.skills', ['PHP', 'Laravel', 'Pest'])
        ->assertJsonPath('data.years_experience', 7)
        ->assertJsonPath('data.open_to_work', false)
        ->assertJsonStructure([
            'data' => ['id', 'headline', 'location', 'bio', 'skills', 'years_experience', 'open_to_work', 'updated_at'],
        ])
        ->assertJsonMissingPath('data.user_id');
});
