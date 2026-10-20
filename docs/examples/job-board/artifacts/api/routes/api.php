<?php

use Illuminate\Support\Facades\Route;

/*
 * Every feature registers its endpoints in its own file under routes/api/v1/,
 * so parallel feature branches never edit the same route file (INV-01).
 */
Route::prefix('v1')->group(function (): void {
    foreach (glob(__DIR__.'/api/v1/*.php') ?: [] as $routeFile) {
        require $routeFile;
    }
});
