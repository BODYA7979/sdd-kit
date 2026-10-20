<?php

use App\Models\Company;
use App\Models\JobPosting;

use function Pest\Laravel\getJson;

it('lists only open postings newest first', function () {
    $company = Company::factory()->create();
    $older = JobPosting::factory()->open()->for($company)->create(['published_at' => now()->subDays(5)]);
    $newest = JobPosting::factory()->open()->for($company)->create(['published_at' => now()->subHour()]);
    $middle = JobPosting::factory()->open()->for($company)->create(['published_at' => now()->subDays(2)]);
    JobPosting::factory()->closed()->for($company)->create();
    JobPosting::factory()->draft()->for($company)->create();

    getJson('/api/v1/jobs')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('status', 200)
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.id', $newest->id)
        ->assertJsonPath('data.1.id', $middle->id)
        ->assertJsonPath('data.2.id', $older->id)
        ->assertJsonStructure(['data' => [[
            'id', 'title', 'description', 'location', 'remote', 'employment_type',
            'salary', 'status', 'published_at', 'company' => ['id', 'slug', 'name', 'location'],
        ]]]);
});

it('filters by keyword, location, remote, employment type and company', function () {
    $acme = Company::factory()->create(['slug' => 'acme-robotics', 'name' => 'Acme Robotics']);
    $northwind = Company::factory()->create(['slug' => 'northwind-health', 'name' => 'Northwind Health']);

    $match = JobPosting::factory()->open()->for($acme)->create([
        'title' => 'Senior Laravel Engineer',
        'location' => 'Berlin',
        'remote' => true,
        'employment_type' => 'full_time',
    ]);
    JobPosting::factory()->open()->for($acme)->create([
        'title' => 'Senior Laravel Engineer',
        'location' => 'Berlin',
        'remote' => false,
        'employment_type' => 'full_time',
    ]);
    JobPosting::factory()->open()->for($acme)->create([
        'title' => 'Laravel Contractor',
        'location' => 'Berlin',
        'remote' => true,
        'employment_type' => 'contract',
    ]);
    JobPosting::factory()->open()->for($northwind)->create([
        'title' => 'Senior Laravel Engineer',
        'location' => 'Berlin',
        'remote' => true,
        'employment_type' => 'full_time',
    ]);
    JobPosting::factory()->open()->for($acme)->create([
        'title' => 'Senior Laravel Engineer',
        'location' => 'Lisbon',
        'remote' => true,
        'employment_type' => 'full_time',
    ]);

    getJson('/api/v1/jobs?q=laravel&location=berlin&remote=1&employment_type=full_time&company=acme-robotics')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $match->id);

    getJson('/api/v1/jobs?remote=0&company=acme-robotics')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    getJson('/api/v1/jobs?employment_type=permanent')
        ->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonValidationErrors(['employment_type']);
});

it('caps per_page at 50', function () {
    JobPosting::factory()->count(55)->for(Company::factory())->open()->create();

    getJson('/api/v1/jobs?per_page=100')
        ->assertOk()
        ->assertJsonCount(50, 'data')
        ->assertJsonPath('meta.per_page', 50);

    getJson('/api/v1/jobs?per_page=0')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['per_page']);
});

it('returns the pagination meta', function () {
    JobPosting::factory()->count(5)->for(Company::factory())->open()->create();

    getJson('/api/v1/jobs?per_page=2&page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta', [
            'current_page' => 2,
            'per_page' => 2,
            'total' => 5,
            'last_page' => 3,
        ]);
});
