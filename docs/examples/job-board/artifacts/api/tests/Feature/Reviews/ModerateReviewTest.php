<?php

declare(strict_types=1);

use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('approves a pending review', function () {
    $company = Company::factory()->create(['slug' => 'acme-robotics', 'name' => 'Acme Robotics']);
    $candidate = User::factory()->candidate()->create(['name' => 'Casey Candidate']);
    $review = CompanyReview::factory()->pending()->for($company)->create(['candidate_id' => $candidate->id]);
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->getJson('/api/v1/admin/reviews')
        ->assertOk()
        ->assertJsonPath('data.0.id', $review->id)
        ->assertJsonPath('data.0.status', 'pending')
        ->assertJsonPath('data.0.candidate_name', 'Casey Candidate')
        ->assertJsonPath('data.0.company.slug', 'acme-robotics');

    $this->postJson("/api/v1/admin/reviews/{$review->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');

    $review->refresh();
    expect($review->moderated_by)->toEqual($admin->id)
        ->and($review->moderated_at)->not->toBeNull();

    $this->getJson('/api/v1/companies/acme-robotics/reviews')
        ->assertJsonPath('data.0.id', $review->id);

    $this->getJson('/api/v1/admin/reviews')
        ->assertJsonCount(0, 'data');
});

it('rejects a pending review with a reason', function () {
    $company = Company::factory()->create(['slug' => 'acme-robotics']);
    $review = CompanyReview::factory()->pending()->for($company)->create();
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson("/api/v1/admin/reviews/{$review->id}/reject", ['reason' => 'No'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['reason']);

    $this->postJson("/api/v1/admin/reviews/{$review->id}/reject", ['reason' => 'Names an individual employee.'])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected');

    expect($review->refresh()->rejection_reason)->toBe('Names an individual employee.');

    $this->getJson('/api/v1/companies/acme-robotics/reviews')
        ->assertJsonCount(0, 'data');

    $this->postJson('/api/v1/admin/reviews/00000000-0000-0000-0000-000000000000/approve')
        ->assertNotFound()
        ->assertJsonPath('code', 'review_not_found');
});

it('refuses to moderate a review twice', function () {
    $approved = CompanyReview::factory()->approved()->create();
    $rejected = CompanyReview::factory()->rejected()->create();
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson("/api/v1/admin/reviews/{$approved->id}/reject", ['reason' => 'Changed my mind.'])
        ->assertStatus(409)
        ->assertJsonPath('code', 'review_already_moderated');

    $this->postJson("/api/v1/admin/reviews/{$rejected->id}/approve")
        ->assertStatus(409)
        ->assertJsonPath('code', 'review_already_moderated');

    expect($rejected->refresh()->rejection_reason)->toBe('Names an individual employee.');
});

it('forbids non-admins from moderating', function () {
    $review = CompanyReview::factory()->pending()->create();

    foreach ([User::factory()->candidate()->create(), User::factory()->employer()->create()] as $user) {
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/admin/reviews')->assertForbidden();
        $this->postJson("/api/v1/admin/reviews/{$review->id}/approve")
            ->assertForbidden()
            ->assertJsonPath('code', 'forbidden');
        $this->postJson("/api/v1/admin/reviews/{$review->id}/reject", ['reason' => 'Not allowed to do this.'])
            ->assertForbidden();
    }

    expect($review->refresh()->status->value)->toBe('pending');
});
