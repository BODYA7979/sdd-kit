<?php

namespace Database\Factories;

use App\Enums\EmploymentType;
use App\Enums\JobPostingStatus;
use App\Models\Company;
use App\Models\JobPosting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Defaults to an open posting. Use closed() or draft() for the non-public states.
 *
 * @extends Factory<JobPosting>
 */
class JobPostingFactory extends Factory
{
    protected $model = JobPosting::class;

    public function definition(): array
    {
        $salaryMin = fake()->numberBetween(30, 90) * 1000;

        return [
            'company_id' => Company::factory(),
            'title' => fake()->jobTitle(),
            'description' => fake()->paragraphs(3, true),
            'location' => fake()->city(),
            'remote' => fake()->boolean(),
            'employment_type' => fake()->randomElement(EmploymentType::cases()),
            'salary_min' => $salaryMin,
            'salary_max' => $salaryMin + fake()->numberBetween(5, 30) * 1000,
            'salary_currency' => 'EUR',
            'status' => JobPostingStatus::Open,
            'published_at' => fake()->dateTimeBetween('-30 days', '-1 hour'),
        ];
    }

    public function open(): static
    {
        return $this->state(fn () => [
            'status' => JobPostingStatus::Open,
            'published_at' => fake()->dateTimeBetween('-30 days', '-1 hour'),
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn () => [
            'status' => JobPostingStatus::Closed,
            'published_at' => fake()->dateTimeBetween('-90 days', '-31 days'),
        ]);
    }

    public function draft(): static
    {
        return $this->state(fn () => [
            'status' => JobPostingStatus::Draft,
            'published_at' => null,
        ]);
    }

    public function withoutSalary(): static
    {
        return $this->state(fn () => [
            'salary_min' => null,
            'salary_max' => null,
        ]);
    }
}
