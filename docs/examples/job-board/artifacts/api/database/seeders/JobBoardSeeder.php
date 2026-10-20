<?php

namespace Database\Seeders;

use App\Enums\EmploymentType;
use App\Enums\JobPostingStatus;
use App\Models\Company;
use Illuminate\Database\Seeder;

/**
 * Demo companies and postings for the public browse journey. Companies are
 * created without an owner; DemoUserSeeder attaches employer@acme.test to Acme.
 *
 * The data is fictional, so the seeder does nothing outside the local and testing
 * environments (for example `db:seed --force` on a deploy). It is idempotent, so
 * `php artisan db:seed` can be repeated without `migrate:fresh`.
 */
class JobBoardSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        $acme = Company::query()->updateOrCreate(['slug' => 'acme-robotics'], [
            'name' => 'Acme Robotics',
            'website' => 'https://acme-robotics.example',
            'location' => 'Berlin',
            'description' => "Acme Robotics builds warehouse robots and the software fleet that runs them.\nSmall teams, real hardware, weekly releases.",
        ]);

        $northwind = Company::query()->updateOrCreate(['slug' => 'northwind-health'], [
            'name' => 'Northwind Health',
            'website' => 'https://northwind-health.example',
            'location' => 'Amsterdam',
            'description' => 'Northwind Health makes scheduling and patient-intake software for independent clinics.',
        ]);

        $blueFern = Company::query()->updateOrCreate(['slug' => 'blue-fern-studio'], [
            'name' => 'Blue Fern Studio',
            'website' => 'https://bluefern.example',
            'location' => 'Lisbon',
            'description' => 'Blue Fern Studio is a product design and engineering studio working with early-stage startups.',
        ]);

        $open = [
            [$acme, 'Senior Laravel Engineer', 'Berlin', true, EmploymentType::FullTime, 65000, 85000, 1],
            [$acme, 'Robotics Software Intern', 'Berlin', false, EmploymentType::Internship, null, null, 3],
            [$acme, 'DevOps Engineer', 'Berlin', true, EmploymentType::FullTime, 60000, 80000, 6],
            [$northwind, 'Frontend Engineer (Next.js)', 'Amsterdam', true, EmploymentType::FullTime, 55000, 72000, 2],
            [$northwind, 'Product Designer', 'Amsterdam', false, EmploymentType::PartTime, 30000, 38000, 5],
            [$northwind, 'QA Engineer', 'Amsterdam', false, EmploymentType::Contract, null, 60000, 9],
            [$blueFern, 'Full-Stack Developer', 'Lisbon', true, EmploymentType::Contract, 45000, 60000, 4],
            [$blueFern, 'UX Researcher', 'Lisbon', false, EmploymentType::FullTime, 38000, 48000, 8],
        ];

        foreach ($open as [$company, $title, $location, $remote, $type, $min, $max, $daysAgo]) {
            $company->jobPostings()->updateOrCreate(['title' => $title], [
                'description' => "{$company->name} is hiring a {$title}. You will work in a small team, own features end to end and ship every week.",
                'location' => $location,
                'remote' => $remote,
                'employment_type' => $type,
                'salary_min' => $min,
                'salary_max' => $max,
                'salary_currency' => 'EUR',
                'status' => JobPostingStatus::Open,
                'published_at' => now()->subDays($daysAgo),
            ]);
        }

        $acme->jobPostings()->updateOrCreate(['title' => 'Legacy PHP Maintainer'], [
            'description' => 'Keep our PHP 5 order system alive until the migration finishes. This position is filled.',
            'location' => 'Berlin',
            'remote' => false,
            'employment_type' => EmploymentType::Contract,
            'salary_min' => 50000,
            'salary_max' => 60000,
            'salary_currency' => 'EUR',
            'status' => JobPostingStatus::Closed,
            'published_at' => now()->subDays(60),
        ]);

        $blueFern->jobPostings()->updateOrCreate(['title' => 'Head of Engineering'], [
            'description' => 'Draft posting, not yet published.',
            'location' => 'Lisbon',
            'remote' => true,
            'employment_type' => EmploymentType::FullTime,
            'salary_min' => null,
            'salary_max' => null,
            'salary_currency' => 'EUR',
            'status' => JobPostingStatus::Draft,
            'published_at' => null,
        ]);
    }
}
