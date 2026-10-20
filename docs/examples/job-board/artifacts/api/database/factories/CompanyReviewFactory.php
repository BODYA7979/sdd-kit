<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ReviewStatus;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyReview>
 */
class CompanyReviewFactory extends Factory
{
    protected $model = CompanyReview::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'candidate_id' => User::factory()->candidate(),
            'rating' => fake()->numberBetween(1, 5),
            'title' => fake()->sentence(4),
            'body' => fake()->paragraphs(2, true),
            'status' => ReviewStatus::Pending,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn () => [
            'status' => ReviewStatus::Pending,
            'moderated_by' => null,
            'moderated_at' => null,
            'rejection_reason' => null,
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn () => [
            'status' => ReviewStatus::Approved,
            'moderated_by' => User::factory()->admin(),
            'moderated_at' => now(),
            'rejection_reason' => null,
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status' => ReviewStatus::Rejected,
            'moderated_by' => User::factory()->admin(),
            'moderated_at' => now(),
            'rejection_reason' => 'Names an individual employee.',
        ]);
    }
}
