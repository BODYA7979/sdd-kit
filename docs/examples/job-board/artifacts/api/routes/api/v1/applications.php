<?php

use App\Http\Controllers\Applications\ListEmployerApplicationsController;
use App\Http\Controllers\Applications\ListMyApplicationsController;
use App\Http\Controllers\Applications\SubmitApplicationController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('jobs/{id}/applications', SubmitApplicationController::class);
    Route::get('me/applications', ListMyApplicationsController::class);
    Route::get('employer/applications', ListEmployerApplicationsController::class);
});
