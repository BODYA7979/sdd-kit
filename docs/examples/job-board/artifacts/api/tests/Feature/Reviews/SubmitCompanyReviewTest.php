<?php

declare(strict_types=1);

use App\Enums\ReviewStatus;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function reviewPayload(array $overrides = []): array
{
    return array_merge([
        'rating' => 4,
        'title' => 'Clear goals, kind team',
        'body' => 'Interviews were well organised and the feedback arrived within a week.',
    ], $overrides);
}

it('stores a pending review for a candidate', function () {
    $company = Company::factory()->create(['slug' => 'acme-robotics']);
    $candidate = User::factory()->candidate()->create();
    Sanctum::actingAs($candidate);

    $this->postJson('/api/v1/companies/acme-robotics/reviews', reviewPayload())
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.rating', 4)
        ->assertJsonPath('data.author', 'Verified candidate')
        ->assertJsonPath('data.rejection_reason', null);

    $this->assertDatabaseHas('company_reviews', [
        'company_id' => $company->id,
        'candidate_id' => $candidate->id,
        'status' => ReviewStatus::Pending->value,
        'moderated_by' => null,
    ]);
});

it('rejects a second review from the same candidate', function () {
    $company = Company::factory()->create(['slug' => 'acme-robotics']);
    $candidate = User::factory()->candidate()->create();
    CompanyReview::factory()->rejected()->for($company)->create(['candidate_id' => $candidate->id]);
    Sanctum::actingAs($candidate);

    $this->postJson('/api/v1/companies/acme-robotics/reviews', reviewPayload())
        ->assertStatus(409)
        ->assertJsonPath('success', false)
        ->assertJsonPath('code', 'review_already_exists');

    expect(CompanyReview::query()->count())->toBe(1);
});

it('forbids employers and admins from reviewing', function () {
    Company::factory()->create(['slug' => 'acme-robotics']);

    foreach ([User::factory()->employer()->create(), User::factory()->admin()->create()] as $user) {
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/companies/acme-robotics/reviews', reviewPayload())
            ->assertForbidden()
            ->assertJsonPath('code', 'forbidden');
    }

    expect(CompanyReview::query()->count())->toBe(0);
});

it('validates rating, title and body', function () {
    Company::factory()->create(['slug' => 'acme-robotics']);
    Sanctum::actingAs(User::factory()->candidate()->create());

    $this->postJson('/api/v1/companies/acme-robotics/reviews', [
        'rating' => 6,
        'title' => 'Meh',
        'body' => 'Too short.',
    ])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonValidationErrors(['rating', 'title', 'body']);

    $this->postJson('/api/v1/companies/acme-robotics/reviews', reviewPayload([
        'rating' => 0,
        'title' => str_repeat('a', 121),
        'body' => str_repeat('b', 2001),
    ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['rating', 'title', 'body']);

    expect(CompanyReview::query()->count())->toBe(0);
});

it('requires authentication', function () {
    Company::factory()->create(['slug' => 'acme-robotics']);

    $this->postJson('/api/v1/companies/acme-robotics/reviews', reviewPayload())
        ->assertUnauthorized()
        ->assertJsonPath('code', 'unauthenticated');

    $this->getJson('/api/v1/companies/acme-robotics/reviews/mine')
        ->assertUnauthorized();
});

it('shows the candidate their own review status', function () {
    $company = Company::factory()->create(['slug' => 'acme-robotics']);
    $candidate = User::factory()->candidate()->create();
    Sanctum::actingAs($candidate);

    $this->getJson('/api/v1/companies/acme-robotics/reviews/mine')
        ->assertNotFound()
        ->assertJsonPath('code', 'review_not_found');

    CompanyReview::factory()->rejected()->for($company)->create([
        'candidate_id' => $candidate->id,
        'rejection_reason' => 'Names an individual employee.',
    ]);

    $this->getJson('/api/v1/companies/acme-robotics/reviews/mine')
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.rejection_reason', 'Names an individual employee.');

    $this->getJson('/api/v1/companies/unknown-co/reviews/mine')
        ->assertNotFound()
        ->assertJsonPath('code', 'company_not_found');
});
