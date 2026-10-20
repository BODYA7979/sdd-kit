<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo accounts for local development, all with the password "password".
 * Admins exist only through seeding (BR-01). Runs after JobBoardSeeder so the
 * Acme Robotics company can be handed to its employer.
 *
 * The accounts use a published password, so the seeder does nothing outside the
 * local and testing environments (for example `db:seed --force` on a deploy).
 */
class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        User::query()->updateOrCreate(
            ['email' => 'candidate@hireboard.test'],
            ['name' => 'Casey Candidate', 'password' => 'password', 'role' => UserRole::Candidate],
        );

        $employer = User::query()->updateOrCreate(
            ['email' => 'employer@acme.test'],
            ['name' => 'Erin Employer', 'password' => 'password', 'role' => UserRole::Employer],
        );

        User::query()->updateOrCreate(
            ['email' => 'admin@hireboard.test'],
            ['name' => 'Ari Admin', 'password' => 'password', 'role' => UserRole::Admin],
        );

        Company::query()
            ->where('slug', 'acme-robotics')
            ->update(['owner_id' => $employer->id]);
    }
}
