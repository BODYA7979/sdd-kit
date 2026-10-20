<?php

namespace App\Http\Controllers\Jobs;

use App\Http\Controllers\Controller;
use App\Services\JobPostingService;
use Illuminate\Http\JsonResponse;

final class ShowJobPostingController extends Controller
{
    public function __construct(private readonly JobPostingService $jobs) {}

    public function __invoke(string $id): JsonResponse
    {
        return $this->resource($this->jobs->findOpen($id)->toApiArray());
    }
}
