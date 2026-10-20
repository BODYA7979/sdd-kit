<?php

use App\Http\Controllers\Companies\ShowCompanyController;
use App\Http\Controllers\Jobs\SearchJobPostingsController;
use App\Http\Controllers\Jobs\ShowJobPostingController;
use Illuminate\Support\Facades\Route;

Route::get('/jobs', SearchJobPostingsController::class)->name('jobs.search');
Route::get('/jobs/{id}', ShowJobPostingController::class)->name('jobs.show');
Route::get('/companies/{slug}', ShowCompanyController::class)->name('companies.show');
