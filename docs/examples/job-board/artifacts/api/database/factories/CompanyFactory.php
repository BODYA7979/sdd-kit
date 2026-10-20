<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    protected $model = Company::class;

    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'owner_id' => null,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(100, 99999),
            'name' => Str::limit($name, 120, ''),
            'website' => fake()->url(),
            'location' => fake()->city(),
            'description' => fake()->paragraph(),
        ];
    }
}
