<?php

use App\Models\Company;
use App\Models\JobPosting;
use Illuminate\Support\Str;

use function Pest\Laravel\getJson;

it('shows an open posting with its company', function () {
    $company = Company::factory()->create([
        'slug' => 'acme-robotics',
        'name' => 'Acme Robotics',
        'location' => 'Berlin',
    ]);
    $posting = JobPosting::factory()->open()->for($company)->create([
        'title' => 'Senior Laravel Engineer',
        'salary_min' => 65000,
        'salary_max' => 85000,
        'salary_currency' => 'EUR',
    ]);

    getJson("/api/v1/jobs/{$posting->id}")
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.id', $posting->id)
        ->assertJsonPath('data.title', 'Senior Laravel Engineer')
        ->assertJsonPath('data.status', 'open')
        ->assertJsonPath('data.salary', ['min' => 65000, 'max' => 85000, 'currency' => 'EUR'])
        ->assertJsonPath('data.company', [
            'id' => $company->id,
            'slug' => 'acme-robotics',
            'name' => 'Acme Robotics',
            'location' => 'Berlin',
        ]);
});

it('returns 404 job_not_found for an unknown id', function () {
    getJson('/api/v1/jobs/'.Str::uuid())
        ->assertNotFound()
        ->assertExactJson([
            'success' => false,
            'status' => 404,
            'message' => 'Job posting not found.',
            'code' => 'job_not_found',
        ]);
});
