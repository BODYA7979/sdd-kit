<?php

namespace App\Http\Controllers\Jobs;

use App\DTOs\JobSearchDTO;
use App\Http\Controllers\Controller;
use App\Services\JobPostingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SearchJobPostingsController extends Controller
{
    public function __construct(private readonly JobPostingService $jobs) {}

    public function __invoke(Request $request): JsonResponse
    {
        $filters = JobSearchDTO::validateAndCreate([
            ...$request->only(['q', 'location', 'employment_type', 'company', 'page', 'per_page']),
            'remote' => $request->filled('remote') ? $request->boolean('remote') : null,
        ]);

        return $this->paginated($this->jobs->search($filters));
    }
}
