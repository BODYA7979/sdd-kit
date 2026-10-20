<?php

namespace App\Http\Controllers\Applications;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\User;
use App\Services\JobApplicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ListMyApplicationsController extends Controller
{
    public function __construct(private readonly JobApplicationService $applications) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('viewAny', JobApplication::class);

        /** @var User $candidate */
        $candidate = $request->user();
        $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $perPage = min($request->integer('per_page', 20), 50);

        return $this->paginated($this->applications->listForCandidate($candidate->id, $perPage));
    }
}
