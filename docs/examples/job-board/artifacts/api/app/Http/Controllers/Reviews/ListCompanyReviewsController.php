<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reviews;

use App\Http\Controllers\Controller;
use App\Services\CompanyReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ListCompanyReviewsController extends Controller
{
    public function __construct(
        private readonly CompanyReviewService $reviews,
    ) {}

    public function __invoke(Request $request, string $slug): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 20), 1), 50);
        $page = $this->reviews->listApproved($slug, $perPage);

        return $this->paginated($page, 'OK', [
            'average_rating' => $this->reviews->averageRating($slug),
        ]);
    }
}
