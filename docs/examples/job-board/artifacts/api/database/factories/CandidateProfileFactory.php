<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\CandidateProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CandidateProfile>
 */
class CandidateProfileFactory extends Factory
{
    protected $model = CandidateProfile::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->candidate(),
            'headline' => fake()->jobTitle(),
            'location' => fake()->city(),
            'bio' => fake()->paragraph(),
            'skills' => fake()->randomElements(['PHP', 'Laravel', 'TypeScript', 'React', 'SQL', 'Docker', 'Testing'], 3),
            'years_experience' => fake()->numberBetween(0, 15),
            'open_to_work' => true,
        ];
    }
}
