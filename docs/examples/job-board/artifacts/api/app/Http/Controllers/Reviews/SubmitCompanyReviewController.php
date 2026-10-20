<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reviews;

use App\DTOs\SubmitCompanyReviewDTO;
use App\Http\Controllers\Controller;
use App\Models\CompanyReview;
use App\Services\CompanyReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubmitCompanyReviewController extends Controller
{
    public function __construct(
        private readonly CompanyReviewService $reviews,
    ) {}

    public function __invoke(Request $request, string $slug): JsonResponse
    {
        $this->authorize('create', CompanyReview::class);

        $data = SubmitCompanyReviewDTO::validateAndCreate($request->all());

        $review = $this->reviews->submit($slug, (int) $request->user()->id, $data);

        return $this->resource($review->toOwnerArray(), 'Review submitted for moderation', 201);
    }
}
