<?php

declare(strict_types=1);

use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\User;

it('lists only approved reviews newest first without author identity', function () {
    $company = Company::factory()->create(['slug' => 'acme-robotics']);
    $candidate = User::factory()->candidate()->create(['name' => 'Casey Candidate']);

    $older = CompanyReview::factory()->approved()->for($company)->create([
        'candidate_id' => $candidate->id,
        'created_at' => now()->subDays(3),
    ]);
    $newer = CompanyReview::factory()->approved()->for($company)->create(['created_at' => now()->subDay()]);
    CompanyReview::factory()->pending()->for($company)->create();
    CompanyReview::factory()->rejected()->for($company)->create();

    $response = $this->getJson('/api/v1/companies/acme-robotics/reviews')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $newer->id)
        ->assertJsonPath('data.1.id', $older->id)
        ->assertJsonPath('data.1.author', 'Verified candidate')
        ->assertJsonPath('meta.total', 2);

    expect(array_keys($response->json('data.1')))
        ->toEqualCanonicalizing(['id', 'rating', 'title', 'body', 'author', 'created_at']);
    expect($response->getContent())->not->toContain('Casey Candidate');
});

it('reports the average of approved ratings only', function () {
    $company = Company::factory()->create(['slug' => 'acme-robotics']);
    foreach ([4, 4, 4, 5] as $rating) {
        CompanyReview::factory()->approved()->for($company)->create(['rating' => $rating]);
    }
    CompanyReview::factory()->pending()->for($company)->create(['rating' => 1]);
    CompanyReview::factory()->rejected()->for($company)->create(['rating' => 1]);

    // 17 / 4 = 4.25, rounded half-up (BR-43).
    $this->getJson('/api/v1/companies/acme-robotics/reviews')
        ->assertOk()
        ->assertJsonPath('meta.average_rating', 4.3)
        ->assertJsonPath('meta.total', 4);

    $quiet = Company::factory()->create(['slug' => 'quiet-co']);
    CompanyReview::factory()->pending()->for($quiet)->create();

    $this->getJson('/api/v1/companies/quiet-co/reviews')
        ->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.average_rating', null);

    $this->getJson('/api/v1/companies/unknown-co/reviews')
        ->assertNotFound()
        ->assertJsonPath('code', 'company_not_found');
});

it('leaves the company profile response unchanged', function () {
    $company = Company::factory()->create(['slug' => 'acme-robotics']);
    CompanyReview::factory()->approved()->for($company)->create(['rating' => 5]);

    $response = $this->getJson('/api/v1/companies/acme-robotics')->assertOk();

    expect(array_keys($response->json('data')))
        ->toEqualCanonicalizing(['id', 'slug', 'name', 'website', 'location', 'description', 'open_jobs_count']);
});
