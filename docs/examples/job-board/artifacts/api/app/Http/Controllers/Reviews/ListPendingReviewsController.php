<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reviews;

use App\DTOs\CompanyReviewDTO;
use App\Http\Controllers\Controller;
use App\Models\CompanyReview;
use App\Services\CompanyReviewService;
use Illuminate\Http\JsonResponse;

class ListPendingReviewsController extends Controller
{
    public function __construct(
        private readonly CompanyReviewService $reviews,
    ) {}

    public function __invoke(): JsonResponse
    {
        $this->authorize('moderate', CompanyReview::class);

        $page = $this->reviews->listPending()
            ->through(fn (CompanyReviewDTO $review) => $review->toModerationArray());

        return $this->paginated($page);
    }
}
