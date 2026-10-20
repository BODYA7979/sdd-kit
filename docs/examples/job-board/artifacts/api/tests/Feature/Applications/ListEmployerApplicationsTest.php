<?php

use App\Models\CandidateProfile;
use App\Models\Company;
use App\Models\JobApplication;
use App\Models\JobPosting;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;

it('lists applications for the employer company only', function () {
    $employer = User::factory()->employer()->create();
    $company = Company::factory()->create(['owner_id' => $employer->id]);
    $job = JobPosting::factory()->open()->create(['company_id' => $company->id]);

    $candidate = User::factory()->candidate()->create([
        'name' => 'Pat Applicant',
        'email' => 'pat@example.test',
    ]);
    CandidateProfile::factory()->create([
        'user_id' => $candidate->id,
        'headline' => 'Embedded C++ engineer',
    ]);
    $own = JobApplication::factory()->create([
        'job_posting_id' => $job->id,
        'candidate_id' => $candidate->id,
    ]);
    JobApplication::factory()->create();

    $otherEmployer = User::factory()->employer()->create();
    $otherCompany = Company::factory()->create(['owner_id' => $otherEmployer->id]);
    $otherJob = JobPosting::factory()->open()->create(['company_id' => $otherCompany->id]);
    $otherApplication = JobApplication::factory()->create(['job_posting_id' => $otherJob->id]);

    Sanctum::actingAs($otherEmployer);

    getJson('/api/v1/employer/applications')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $otherApplication->id)
        ->assertJsonPath('meta.total', 1);

    $this->app['auth']->forgetGuards();
    Sanctum::actingAs($employer);

    $response = getJson('/api/v1/employer/applications')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $own->id)
        ->assertJsonPath('data.0.job.id', $job->id)
        ->assertJsonPath('data.0.job.status', 'open')
        ->assertJsonPath('data.0.candidate', [
            'name' => 'Pat Applicant',
            'email' => 'pat@example.test',
            'headline' => 'Embedded C++ engineer',
        ])
        ->assertJsonPath('meta.total', 1);

    expect(array_keys($response->json('data.0')))->toEqualCanonicalizing([
        'id', 'job', 'candidate', 'cover_letter', 'submitted_at',
    ]);

    getJson('/api/v1/employer/applications?per_page=500')
        ->assertOk()
        ->assertJsonPath('meta.per_page', 50);

    Sanctum::actingAs($candidate);

    getJson('/api/v1/employer/applications')
        ->assertForbidden()
        ->assertJsonPath('code', 'forbidden');
});

it('includes applications to closed jobs', function () {
    $employer = User::factory()->employer()->create();
    $company = Company::factory()->create(['owner_id' => $employer->id]);
    $closed = JobPosting::factory()->closed()->create(['company_id' => $company->id]);
    $application = JobApplication::factory()->create(['job_posting_id' => $closed->id]);

    Sanctum::actingAs($employer);

    getJson('/api/v1/employer/applications')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $application->id)
        ->assertJsonPath('data.0.job.status', 'closed');
});
