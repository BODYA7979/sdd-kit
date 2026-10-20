<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reviews;

use App\Http\Controllers\Controller;
use App\Models\CompanyReview;
use App\Services\CompanyReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShowMyCompanyReviewController extends Controller
{
    public function __construct(
        private readonly CompanyReviewService $reviews,
    ) {}

    public function __invoke(Request $request, string $slug): JsonResponse
    {
        $this->authorize('create', CompanyReview::class);

        $review = $this->reviews->findMine($slug, (int) $request->user()->id);

        return $this->resource($review->toOwnerArray());
    }
}
