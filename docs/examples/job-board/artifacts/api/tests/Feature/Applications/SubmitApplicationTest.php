<?php

use App\Contracts\JobApplicationRepositoryInterface;
use App\Exceptions\AlreadyAppliedException;
use App\Models\CandidateProfile;
use App\Models\JobApplication;
use App\Models\JobPosting;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\assertDatabaseCount;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\postJson;

function applicantWithProfile(): User
{
    $candidate = User::factory()->candidate()->create();
    CandidateProfile::factory()->create(['user_id' => $candidate->id]);

    return $candidate;
}

it('submits an application to an open job', function () {
    $candidate = applicantWithProfile();
    $job = JobPosting::factory()->open()->create(['title' => 'Robotics Software Engineer']);

    Sanctum::actingAs($candidate);

    $response = postJson("/api/v1/jobs/{$job->id}/applications", [
        'cover_letter' => 'I built ROS 2 drivers for warehouse robots for three years.',
    ])
        ->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('status', 201)
        ->assertJsonPath('data.job.id', $job->id)
        ->assertJsonPath('data.job.title', 'Robotics Software Engineer')
        ->assertJsonPath('data.job.company.slug', $job->company->slug)
        ->assertJsonPath('data.cover_letter', 'I built ROS 2 drivers for warehouse robots for three years.');

    expect(array_keys($response->json('data')))->toEqualCanonicalizing([
        'id', 'job', 'cover_letter', 'submitted_at',
    ]);
    expect($response->json('data.submitted_at'))->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/');

    assertDatabaseHas('job_applications', [
        'job_posting_id' => $job->id,
        'candidate_id' => $candidate->id,
    ]);
});

it('requires a candidate profile', function () {
    $job = JobPosting::factory()->open()->create();

    Sanctum::actingAs(User::factory()->candidate()->create());

    postJson("/api/v1/jobs/{$job->id}/applications")
        ->assertUnprocessable()
        ->assertJsonPath('success', false)
        ->assertJsonPath('code', 'profile_required');

    assertDatabaseCount('job_applications', 0);
});

it('refuses closed jobs', function (string $state) {
    $job = JobPosting::factory()->{$state}()->create();

    Sanctum::actingAs(applicantWithProfile());

    postJson("/api/v1/jobs/{$job->id}/applications")
        ->assertUnprocessable()
        ->assertJsonPath('code', 'job_not_open');

    assertDatabaseCount('job_applications', 0);
})->with(['closed', 'draft']);

it('refuses a duplicate application', function () {
    $candidate = applicantWithProfile();
    $job = JobPosting::factory()->open()->create();
    JobApplication::factory()->create([
        'job_posting_id' => $job->id,
        'candidate_id' => $candidate->id,
    ]);

    Sanctum::actingAs($candidate);

    postJson("/api/v1/jobs/{$job->id}/applications")
        ->assertStatus(409)
        ->assertJsonPath('code', 'already_applied');

    assertDatabaseCount('job_applications', 1);
});

it('maps a concurrent duplicate insert to already_applied', function () {
    // Calling the repository twice skips the service's exists() pre-check, which is
    // exactly what happens when two requests pass that check at the same time.
    $candidate = applicantWithProfile();
    $job = JobPosting::factory()->open()->create();
    $repository = app(JobApplicationRepositoryInterface::class);

    $repository->create($job->id, $candidate->id, null);

    expect(fn () => $repository->create($job->id, $candidate->id, 'Second click.'))
        ->toThrow(AlreadyAppliedException::class);

    assertDatabaseCount('job_applications', 1);
});

it('forbids employers from applying', function () {
    $job = JobPosting::factory()->open()->create();

    Sanctum::actingAs(User::factory()->employer()->create());

    postJson("/api/v1/jobs/{$job->id}/applications")
        ->assertForbidden()
        ->assertJsonPath('code', 'forbidden');

    Sanctum::actingAs(applicantWithProfile());

    postJson('/api/v1/jobs/00000000-0000-0000-0000-000000000000/applications')
        ->assertNotFound()
        ->assertJsonPath('code', 'job_not_found');

    assertDatabaseCount('job_applications', 0);
});
