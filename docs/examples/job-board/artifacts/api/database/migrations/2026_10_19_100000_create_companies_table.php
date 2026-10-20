<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Seeded companies may have no owner; an employer owns exactly one (BR-02).
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('slug', 80)->unique();
            $table->string('name', 120);
            $table->string('website')->nullable();
            $table->string('location', 120)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
