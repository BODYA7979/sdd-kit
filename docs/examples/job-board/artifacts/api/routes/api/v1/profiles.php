<?php

declare(strict_types=1);

use App\Http\Controllers\Profiles\ShowMyProfileController;
use App\Http\Controllers\Profiles\UpsertMyProfileController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('me/profile', ShowMyProfileController::class)->name('profiles.show');
    Route::put('me/profile', UpsertMyProfileController::class)->name('profiles.upsert');
});
