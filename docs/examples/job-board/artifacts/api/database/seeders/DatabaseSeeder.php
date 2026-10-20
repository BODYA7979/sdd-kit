<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Local demo data only. Run with `php artisan migrate:fresh --seed`,
     * never against a shared database. Outside the local and testing
     * environments nothing is seeded, so `db:seed --force` on a deploy cannot
     * publish fake companies and postings or take real company slugs.
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        $this->call([
            JobBoardSeeder::class,
            DemoUserSeeder::class,
        ]);
    }
}
