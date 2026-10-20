<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reviews;

use App\DTOs\RejectReviewDTO;
use App\Http\Controllers\Controller;
use App\Models\CompanyReview;
use App\Services\CompanyReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RejectReviewController extends Controller
{
    public function __construct(
        private readonly CompanyReviewService $reviews,
    ) {}

    public function __invoke(Request $request, string $id): JsonResponse
    {
        $this->authorize('moderate', CompanyReview::class);

        $data = RejectReviewDTO::validateAndCreate($request->all());

        $review = $this->reviews->reject($id, (int) $request->user()->id, $data);

        return $this->resource($review->toModerationArray(), 'Review rejected');
    }
}
