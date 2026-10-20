<?php

declare(strict_types=1);

use App\Http\Controllers\Reviews\ApproveReviewController;
use App\Http\Controllers\Reviews\ListCompanyReviewsController;
use App\Http\Controllers\Reviews\ListPendingReviewsController;
use App\Http\Controllers\Reviews\RejectReviewController;
use App\Http\Controllers\Reviews\ShowMyCompanyReviewController;
use App\Http\Controllers\Reviews\SubmitCompanyReviewController;
use Illuminate\Support\Facades\Route;

Route::get('companies/{slug}/reviews', ListCompanyReviewsController::class)->name('reviews.index');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('companies/{slug}/reviews', SubmitCompanyReviewController::class)->name('reviews.store');
    Route::get('companies/{slug}/reviews/mine', ShowMyCompanyReviewController::class)->name('reviews.mine');

    Route::get('admin/reviews', ListPendingReviewsController::class)->name('reviews.pending');
    Route::post('admin/reviews/{id}/approve', ApproveReviewController::class)->name('reviews.approve');
    Route::post('admin/reviews/{id}/reject', RejectReviewController::class)->name('reviews.reject');
});
