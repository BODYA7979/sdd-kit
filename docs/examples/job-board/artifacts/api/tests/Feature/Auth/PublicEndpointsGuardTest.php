<?php

use App\Models\Company;
use App\Models\JobPosting;

use function Pest\Laravel\getJson;

it('keeps job search, job detail and company profile public', function () {
    $company = Company::factory()->create(['slug' => 'acme-robotics']);
    $posting = JobPosting::factory()->open()->for($company)->create();

    $jobShape = [
        'id', 'title', 'description', 'location', 'remote', 'employment_type',
        'salary' => ['min', 'max', 'currency'], 'status', 'published_at',
        'company' => ['id', 'slug', 'name', 'location'],
    ];

    getJson('/api/v1/jobs')
        ->assertOk()
        ->assertJsonStructure(['data' => ['*' => $jobShape], 'meta' => ['current_page', 'per_page', 'total', 'last_page']]);

    getJson("/api/v1/jobs/{$posting->id}")
        ->assertOk()
        ->assertJsonStructure(['data' => $jobShape]);

    $profile = getJson('/api/v1/companies/acme-robotics')
        ->assertOk()
        ->json('data');

    expect(array_keys($profile))
        ->toBe(['id', 'slug', 'name', 'website', 'location', 'description', 'open_jobs_count']);
});
