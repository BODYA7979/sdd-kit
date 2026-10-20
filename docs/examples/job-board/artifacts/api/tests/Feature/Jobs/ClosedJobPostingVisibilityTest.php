<?php

use App\Models\CandidateProfile;
use App\Models\Company;
use App\Models\JobApplication;
use App\Models\JobPosting;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

function closedVisibilityCompany(?User $owner = null): Company
{
    return Company::factory()->create([
        'owner_id' => $owner?->id,
        'slug' => 'acme-robotics',
        'name' => 'Acme Robotics',
        'location' => 'Berlin',
    ]);
}

it('returns 404 job_not_found for a closed posting', function () {
    $closed = JobPosting::factory()
        ->closed()
        ->for(closedVisibilityCompany())
        ->create(['title' => 'Legacy PHP Maintainer']);

    getJson("/api/v1/jobs/{$closed->id}")
        ->assertNotFound()
        ->assertJson([
            'success' => false,
            'status' => 404,
            'code' => 'job_not_found',
        ])
        ->assertJsonMissingPath('data');
});

it('returns 404 job_not_found for a draft posting', function () {
    $draft = JobPosting::factory()
        ->draft()
        ->for(closedVisibilityCompany())
        ->create();

    getJson("/api/v1/jobs/{$draft->id}")
        ->assertNotFound()
        ->assertJsonPath('code', 'job_not_found')
        ->assertJsonMissingPath('data');
});

it('still shows open postings with the same shape', function () {
    $posting = JobPosting::factory()
        ->open()
        ->for(closedVisibilityCompany())
        ->create([
            'title' => 'Senior Laravel Engineer',
            'location' => 'Berlin',
            'remote' => true,
            'employment_type' => 'full_time',
            'salary_min' => 60000,
            'salary_max' => 80000,
            'salary_currency' => 'EUR',
        ]);

    $response = getJson("/api/v1/jobs/{$posting->id}")
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.id', $posting->id)
        ->assertJsonPath('data.title', 'Senior Laravel Engineer')
        ->assertJsonPath('data.remote', true)
        ->assertJsonPath('data.employment_type', 'full_time')
        ->assertJsonPath('data.status', 'open')
        ->assertJsonPath('data.salary', ['min' => 60000, 'max' => 80000, 'currency' => 'EUR'])
        ->assertJsonPath('data.company.slug', 'acme-robotics')
        ->assertJsonPath('data.company.name', 'Acme Robotics');

    expect(array_keys($response->json('data')))->toEqualCanonicalizing([
        'id', 'title', 'description', 'location', 'remote', 'employment_type',
        'salary', 'status', 'published_at', 'company',
    ]);
    expect(array_keys($response->json('data.company')))->toEqualCanonicalizing([
        'id', 'slug', 'name', 'location',
    ]);
});

it('still lists the same open postings', function () {
    $company = closedVisibilityCompany();
    $older = JobPosting::factory()->open()->for($company)->create(['published_at' => now()->subDays(3)]);
    $newer = JobPosting::factory()->open()->for($company)->create(['published_at' => now()->subDay()]);
    JobPosting::factory()->closed()->for($company)->create(['title' => 'Legacy PHP Maintainer']);
    JobPosting::factory()->draft()->for($company)->create();

    getJson('/api/v1/jobs')
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
});

it('still refuses applications to closed jobs', function () {
    $candidate = User::factory()->candidate()->create();
    CandidateProfile::factory()->create(['user_id' => $candidate->id]);
    $closed = JobPosting::factory()
        ->closed()
        ->for(closedVisibilityCompany())
        ->create(['title' => 'Legacy PHP Maintainer']);

    Sanctum::actingAs($candidate);

    postJson("/api/v1/jobs/{$closed->id}/applications", ['cover_letter' => 'I have maintained PHP 5 code for years.'])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'job_not_open');

    expect(JobApplication::query()->count())->toBe(0);
});

it('still shows closed-job applications to the owning employer', function () {
    $employer = User::factory()->employer()->create();
    $closed = JobPosting::factory()
        ->closed()
        ->for(closedVisibilityCompany($employer))
        ->create(['title' => 'Legacy PHP Maintainer']);

    $candidate = User::factory()->candidate()->create();
    CandidateProfile::factory()->create(['user_id' => $candidate->id]);
    $application = JobApplication::factory()->create([
        'job_posting_id' => $closed->id,
        'candidate_id' => $candidate->id,
    ]);

    Sanctum::actingAs($employer);

    getJson('/api/v1/employer/applications')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $application->id)
        ->assertJsonPath('data.0.job.id', $closed->id)
        ->assertJsonPath('data.0.job.status', 'closed');
});
