<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\ShowCurrentUserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->name('auth.')->group(function (): void {
    Route::middleware('throttle:6,1')->group(function (): void {
        Route::post('/register', RegisterController::class)->name('register');
        Route::post('/login', LoginController::class)->name('login');
    });

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/logout', LogoutController::class)->name('logout');
        Route::get('/me', ShowCurrentUserController::class)->name('me');
    });
});
