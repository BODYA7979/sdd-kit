<?php

use App\Models\Company;
use App\Models\JobPosting;

use function Pest\Laravel\getJson;

it('shows a company with its open job count', function () {
    $company = Company::factory()->create([
        'slug' => 'acme-robotics',
        'name' => 'Acme Robotics',
        'website' => 'https://acme-robotics.example',
        'location' => 'Berlin',
        'description' => 'Warehouse robots.',
    ]);
    JobPosting::factory()->count(2)->open()->for($company)->create();
    JobPosting::factory()->closed()->for($company)->create();
    JobPosting::factory()->draft()->for($company)->create();

    getJson('/api/v1/companies/acme-robotics')
        ->assertOk()
        ->assertExactJson([
            'success' => true,
            'status' => 200,
            'message' => 'OK',
            'data' => [
                'id' => $company->id,
                'slug' => 'acme-robotics',
                'name' => 'Acme Robotics',
                'website' => 'https://acme-robotics.example',
                'location' => 'Berlin',
                'description' => 'Warehouse robots.',
                'open_jobs_count' => 2,
            ],
        ]);
});

it('returns 404 company_not_found for an unknown slug', function () {
    getJson('/api/v1/companies/no-such-company')
        ->assertNotFound()
        ->assertJsonPath('success', false)
        ->assertJsonPath('code', 'company_not_found');
});
